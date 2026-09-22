-- ============================================================================
-- MERGED MIGRATION: 29_mcp_auth.sql + 30_memory.sql + 31_integrations.sql
--                   + 32_fix_businesses_select_rls.sql
--                   + 33_fix_business_scoped_rls_policies.sql
--
-- Convenience concatenation for pasting into the Supabase SQL editor in one
-- shot. This file is NOT a new numbered migration — it does not replace the
-- five individual files, which remain the source of truth and are what
-- packages/api/schema.ts and CLAUDE.md's migration list refer to. Generated
-- 2026-09-22T15:29:29Z.
--
-- Order matters and is preserved below. 32 and 33 are both RLS security
-- fixes (a broken businesses SELECT policy, and a systemic cross-tenant
-- leak across assets/calendar_entries/opportunities/platform_health/
-- command_action_log) found and verified live against a local Supabase
-- instance while building/verifying this MCP feature — see each file's own
-- header comment for the full explanation and proof. All five statements
-- are additive/idempotent (create-or-replace, drop-policy-if-exists) and
-- were verified together, in this order, against a local instance.
-- ============================================================================

-- ── begin 29_mcp_auth.sql ────────────────────────────────────────────────────────────
-- 29_mcp_auth.sql
-- Auth foundation for the Nexus Brain MCP server: static per-workspace API
-- tokens and an OAuth 2.1 authorization server (RFC 7591 DCR, PKCE-only
-- public clients) so remote MCP clients (Cowork, Claude desktop, Claude
-- Code) can connect to /api/mcp by URL alone, no shared secret in the URL.
--
-- Shape copied from Pulse's 092_oauth_authorization_server.sql with one
-- deliberate change: user_id/business references point at this codebase's
-- own public.users/public.businesses tables (every other FK in this schema
-- does the same), not directly at auth.users like Pulse's does.

-- ── workspace_api_tokens (static nexus_key_ tokens) ──────────────────────────
create table if not exists public.workspace_api_tokens (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  name          text not null,
  token_prefix  text not null,            -- "nexus_key_" + first 8 hex chars, for display
  token_hash    text not null unique,     -- sha256 of the full raw token
  scopes        text not null,            -- comma-separated, validated against the catalog
  created_by    uuid references public.users(id) on delete set null,
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_workspace_api_tokens_business_id on public.workspace_api_tokens (business_id);

alter table public.workspace_api_tokens enable row level security;

-- NOTE: `business_id` below must be qualified as
-- `workspace_api_tokens.business_id`. Written bare, it binds to `bm.business_id`
-- (business_members' own column — the only match in the subquery's FROM
-- scope, not an ambiguity error, just a silent wrong bind), collapsing the
-- policy to "is auth.uid() a member/admin of ANY business at all" — any
-- signed-up user could view another tenant's token metadata, or forge a
-- brand-new nexus_key_ token (self-chosen plaintext, self-computed
-- token_hash) scoped to ANY OTHER business_id via a direct PostgREST
-- insert, then use it as a Bearer token against the MCP server for full
-- read/write access to that tenant's memories/docs/calendar/Gruve data.
-- Found and fixed before this migration was ever applied to production.
create policy "Members can view workspace api tokens"
  on public.workspace_api_tokens for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = workspace_api_tokens.business_id and bm.user_id = auth.uid()));

create policy "Admins can insert workspace api tokens"
  on public.workspace_api_tokens for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = workspace_api_tokens.business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

create policy "Admins can revoke workspace api tokens"
  on public.workspace_api_tokens for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = workspace_api_tokens.business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

-- ── OAuth 2.1 authorization server ────────────────────────────────────────────
-- Access tokens are self-contained signed JWTs (lib/oauth/tokens.ts) — NOT
-- stored here; only authorization codes and refresh tokens need DB rows,
-- since both must be revocable/one-time-use. Service-role only; RLS is
-- enabled with no policies (same posture as Pulse's 092 migration).

create table if not exists public.oauth_clients (
  id                         text primary key,
  client_name                text,
  redirect_uris              text[] not null,
  grant_types                text[] not null default '{authorization_code,refresh_token}',
  token_endpoint_auth_method text not null default 'none',
  created_at                 timestamptz not null default now()
);

create table if not exists public.oauth_authorization_codes (
  id                    uuid primary key default gen_random_uuid(),
  code_hash             text not null unique,
  client_id             text not null references public.oauth_clients(id) on delete cascade,
  user_id               uuid not null references public.users(id) on delete cascade,
  business_id           uuid not null references public.businesses(id) on delete cascade,
  scopes                text not null,
  redirect_uri          text not null,
  code_challenge        text not null,
  code_challenge_method text not null default 'S256',
  expires_at            timestamptz not null,
  used_at               timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists idx_oauth_auth_codes_client on public.oauth_authorization_codes (client_id);
create index if not exists idx_oauth_auth_codes_user on public.oauth_authorization_codes (user_id);

create table if not exists public.oauth_refresh_tokens (
  id            uuid primary key default gen_random_uuid(),
  token_hash    text not null unique,
  client_id     text not null references public.oauth_clients(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  business_id   uuid not null references public.businesses(id) on delete cascade,
  scopes        text not null,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  rotated_from  uuid references public.oauth_refresh_tokens(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_oauth_refresh_tokens_client on public.oauth_refresh_tokens (client_id);
create index if not exists idx_oauth_refresh_tokens_user on public.oauth_refresh_tokens (user_id);
create index if not exists idx_oauth_refresh_tokens_business on public.oauth_refresh_tokens (business_id);

alter table public.oauth_clients enable row level security;
alter table public.oauth_authorization_codes enable row level security;
alter table public.oauth_refresh_tokens enable row level security;

-- ── end 29_mcp_auth.sql ──────────────────────────────────────────────────────────────

-- ── begin 30_memory.sql ────────────────────────────────────────────────────────────
-- 30_memory.sql
-- The Nexus Brain MCP's memory model: durable facts/decisions/preferences/
-- open loops scoped to one workspace, agent sessions that bookend a run,
-- and an audit log for every tool call. This is the piece that makes
-- nexus_brief able to hand an operator agent back what it knew last time.

-- ── memories ──────────────────────────────────────────────────────────────────
do $$ begin
  create type public.memory_kind as enum
    ('fact','decision','preference','open_loop','person','project','event','insight','session_summary');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.memory_status as enum ('active','resolved','archived','superseded');
exception when duplicate_object then null; end $$;

-- Postgres's to_tsvector(regconfig, text) IS marked immutable in pg_proc,
-- but resolving a bare string literal like 'english' to regconfig happens
-- through that type's text-input function, not a pg_cast entry — and the
-- planner won't trust a GENERATED ALWAYS AS / expression-index expression
-- built on that path, failing with "generation expression is not
-- immutable" (verified against a live Postgres instance while building
-- this migration, not assumed from memory). Standard, well-documented fix:
-- wrap it in a SQL function explicitly marked immutable.
create or replace function public.immutable_to_tsvector(config regconfig, content text)
returns tsvector
language sql
immutable
parallel safe
as $$ select to_tsvector(config, coalesce(content, '')); $$;

-- array_to_string(anyarray, text) is a SEPARATE immutability problem from
-- the one above — it's genuinely marked STABLE in pg_proc (polymorphic
-- array functions commonly are), not immutable, confirmed the same way:
-- built a minimal repro table against a live instance rather than guessing
-- from the first fix looking similar. Same wrapper trick, different function.
create or replace function public.immutable_array_to_string(arr text[], sep text)
returns text
language sql
immutable
parallel safe
as $$ select array_to_string(arr, sep); $$;

create table if not exists public.memories (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  kind             public.memory_kind not null,
  subject          text not null,
  content          text not null,
  tags             text[] not null default '{}',
  source           text not null,                     -- 'cowork' | 'pulse' | 'gruve' | 'manual' | 'session'
  source_ref       text,
  confidence       smallint not null default 80 check (confidence between 0 and 100),
  status           public.memory_status not null default 'active',
  supersedes_id    uuid references public.memories(id) on delete set null,
  due_at           timestamptz,                        -- open_loop only
  node_id          uuid references public.nodes(id) on delete set null,
  dedupe_key       text not null,                       -- sha256(lower(kind || '|' || subject)), computed app-side
  recall_count     int not null default 0,
  last_recalled_at timestamptz,
  created_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  search           tsvector generated always as
                   (setweight(public.immutable_to_tsvector('english', subject),'A') ||
                    setweight(public.immutable_to_tsvector('english', content),'B') ||
                    setweight(public.immutable_to_tsvector('simple', public.immutable_array_to_string(tags,' ')),'C')) stored
);

-- Backs nexus_remember's atomic upsert: INSERT ... ON CONFLICT (business_id,
-- dedupe_key) WHERE status = 'active' DO UPDATE — Postgres supports ON
-- CONFLICT against a partial unique index directly as long as the
-- predicate matches. This is what closes the two-concurrent-callers race a
-- select-then-write implementation would have.
create unique index if not exists memories_dedupe on public.memories(business_id, dedupe_key) where status = 'active';
create index if not exists memories_search on public.memories using gin(search);
create index if not exists memories_business_kind_status on public.memories(business_id, kind, status);
create index if not exists memories_due on public.memories(business_id, due_at) where kind = 'open_loop' and status = 'active';

create or replace trigger memories_updated_at
  before update on public.memories
  for each row execute procedure public.handle_updated_at();

alter table public.memories enable row level security;

-- NOTE: `business_id` below must be qualified as `memories.business_id`.
-- Written bare, it binds to `bm.business_id` (business_members' own
-- column — the only match in the subquery's FROM scope), collapsing the
-- policy to "is auth.uid() a member/admin of ANY business at all" and
-- granting cross-tenant read/write of every workspace's remembered
-- facts/decisions. Found and fixed before this migration was ever applied
-- to production.
create policy "Members can view memories"
  on public.memories for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = memories.business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can create memories"
  on public.memories for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = memories.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Editors and admins can update memories"
  on public.memories for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = memories.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Admins can delete memories"
  on public.memories for delete
  using (exists (select 1 from public.business_members bm
    where bm.business_id = memories.business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

-- nexus_remember's atomic upsert. PostgREST/supabase-js's built-in
-- .upsert() only generates `ON CONFLICT (cols) DO UPDATE` with no WHERE
-- clause, but memories_dedupe is a PARTIAL unique index (`where status =
-- 'active'`) — Postgres requires the ON CONFLICT target's predicate to
-- match a partial index exactly for it to be usable as a conflict arbiter,
-- which the generic REST upsert API has no way to express. Hence this RPC:
-- it's the only way to get the single-atomic-statement upsert the eng
-- review requires (closing the two-concurrent-new-subject race a
-- select-then-write implementation would have), same reasoning as
-- save_yjs_snapshot's existing RPC for a different PostgREST limitation.
create or replace function public.remember_memory(
  p_business_id uuid,
  p_kind        public.memory_kind,
  p_subject     text,
  p_content     text,
  p_tags        text[],
  p_source      text,
  p_source_ref  text,
  p_confidence  smallint,
  p_due_at      timestamptz,
  p_node_id     uuid,
  p_dedupe_key  text,
  p_created_by  uuid
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_result jsonb;
begin
  with upserted as (
    insert into public.memories (
      business_id, kind, subject, content, tags, source, source_ref,
      confidence, due_at, node_id, dedupe_key, created_by
    ) values (
      p_business_id, p_kind, p_subject, p_content, p_tags, p_source, p_source_ref,
      p_confidence, p_due_at, p_node_id, p_dedupe_key, p_created_by
    )
    on conflict (business_id, dedupe_key) where status = 'active'
    do update set
      content    = excluded.content,
      tags       = excluded.tags,
      source     = excluded.source,
      source_ref = excluded.source_ref,
      confidence = excluded.confidence,
      updated_at = now()
    returning memories.*, (xmax = 0) as was_insert
  )
  select to_jsonb(upserted.*) into v_result from upserted;
  return v_result;
end;
$$;

grant execute on function public.remember_memory(
  uuid, public.memory_kind, text, text, text[], text, text, smallint, timestamptz, uuid, text, uuid
) to authenticated, service_role;

-- nexus_recall's ranking. Same PostgREST limitation as remember_memory
-- above: ts_rank_cd() needs to run inside Postgres against the tsvector
-- column, and "every recall bumps recall_count/last_recalled_at in a
-- single UPDATE for the returned ids" needs the select-then-bump to be one
-- atomic statement, not a select from the client followed by a second
-- round-trip update (which would race a delete/status-change in between,
-- however unlikely for one operator). Ranking formula per spec: ts_rank_cd
-- * recency multiplier (1 / (1 + age_days / 30)) * (confidence / 100),
-- plus a flat +1 for overdue open loops so they surface. Empty query
-- falls through to updated_at desc via the NULL rank + "nulls last".
create or replace function public.recall_memories(
  p_business_id uuid,
  p_query       text,
  p_kinds       public.memory_kind[],
  p_tags        text[],
  p_status      text,     -- 'active' | 'all'
  p_limit       int
)
returns setof public.memories
language plpgsql
as $$
begin
  return query
  with ranked as (
    select m.id
    from public.memories m
    where m.business_id = p_business_id
      and (p_kinds is null or m.kind = any(p_kinds))
      and (p_tags is null or m.tags && p_tags)
      and (p_status = 'all' or m.status = 'active')
      and (p_query is null or p_query = '' or m.search @@ websearch_to_tsquery('english', p_query))
    order by
      case when p_query is null or p_query = '' then null
           else ts_rank_cd(m.search, websearch_to_tsquery('english', p_query))
                  * (1.0 / (1 + (extract(epoch from (now() - m.updated_at)) / 86400.0) / 30))
                  * (m.confidence / 100.0)
                  + case when m.kind = 'open_loop' and m.due_at is not null and m.due_at < now()
                         then 1 else 0 end
      end desc nulls last,
      m.updated_at desc
    limit p_limit
  ),
  bumped as (
    update public.memories m
    set recall_count = m.recall_count + 1, last_recalled_at = now()
    from ranked
    where m.id = ranked.id
    returning m.*
  )
  select b.*
  from bumped b
  order by array_position((select array_agg(id) from ranked), b.id);
end;
$$;

grant execute on function public.recall_memories(
  uuid, text, public.memory_kind[], text[], text, int
) to authenticated, service_role;

-- ── agent_sessions ───────────────────────────────────────────────────────────
create table if not exists public.agent_sessions (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  agent         text not null,
  client_id     text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  summary       text,
  stats         jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- Only one unfinished session per (business_id, agent) at a time — enforced
-- at the DB level, not just app logic, so two near-simultaneous
-- nexus_start_session calls (a scheduled run overlapping a manual one)
-- can't both leave a session open. Same fix shape as memories_dedupe above.
create unique index if not exists agent_sessions_one_open
  on public.agent_sessions(business_id, agent) where finished_at is null;

create index if not exists idx_agent_sessions_business on public.agent_sessions(business_id);

alter table public.agent_sessions enable row level security;

-- Same bare-`business_id` correlation bug as above, qualified here too.
create policy "Members can view agent sessions"
  on public.agent_sessions for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = agent_sessions.business_id and bm.user_id = auth.uid()));

-- ── mcp_audit_log ────────────────────────────────────────────────────────────
-- Service-role only — never store raw tool arguments here, only a digest.
create table if not exists public.mcp_audit_log (
  id           bigserial primary key,
  business_id  uuid references public.businesses(id) on delete cascade,
  token_id     text,
  tool         text not null,
  ok           boolean not null,
  duration_ms  int,
  args_digest  text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_mcp_audit_business_time on public.mcp_audit_log(business_id, created_at desc);

alter table public.mcp_audit_log enable row level security;

-- ── blocks full-text search seam for nexus_search_docs ───────────────────────
-- Extracts every "text" value at any depth of a block's Tiptap JSON, via
-- SQL/JSON path's recursive descent ($.**) — a paragraph's runs, a list
-- item's nested text, a table cell's content are all at different nesting
-- depths, so a single-level content->'content' walk would miss most of
-- them. Pulled into its own IMMUTABLE function rather than an inline
-- correlated subquery: Postgres flatly rejects "subquery in index
-- expression" for CREATE INDEX (a hard restriction, not just an
-- immutability one — verified against a live instance while building this
-- migration), and a plain function call is also what lets search_blocks()
-- below reuse the identical expression instead of duplicating the jsonb
-- path logic a second time.
create or replace function public.block_search_text(content jsonb)
returns text
language sql
immutable
parallel safe
as $$
  select coalesce(string_agg(t.value, ' '), '')
  from jsonb_array_elements_text(jsonb_path_query_array(content, '$.**.text'::jsonpath)) as t(value);
$$;

-- The only change touching an existing table's index set — no columns
-- added to blocks itself.
create index if not exists blocks_content_search
  on public.blocks
  using gin (public.immutable_to_tsvector('english', public.block_search_text(content)));

-- nexus_search_docs' content-match half (the title-ILIKE half is a plain
-- PostgREST .ilike() call, no RPC needed). PostgREST has no way to query
-- an EXPRESSION index directly — it only exposes real columns as
-- filterable "columns" — so this RPC repeats the identical expression
-- (via the same block_search_text()/immutable_to_tsvector() functions) for
-- Postgres to recognize it matches blocks_content_search above and use it
-- rather than a sequential scan.
create or replace function public.search_blocks(
  p_business_id uuid,
  p_query       text,
  p_limit       int
)
returns table(node_id uuid, title text, snippet text, updated_at timestamptz)
language sql
stable
as $$
  select distinct on (n.id)
    n.id as node_id,
    n.title,
    left(public.block_search_text(b.content), 200) as snippet,
    n.updated_at
  from public.blocks b
  join public.nodes n on n.id = b.node_id
  where n.business_id = p_business_id
    and n.is_archived = false
    and public.immutable_to_tsvector('english', public.block_search_text(b.content))
        @@ websearch_to_tsquery('english', p_query)
  order by n.id, n.updated_at desc
  limit p_limit;
$$;

grant execute on function public.search_blocks(uuid, text, int) to authenticated, service_role;

-- ── end 30_memory.sql ──────────────────────────────────────────────────────────────

-- ── begin 31_integrations.sql ────────────────────────────────────────────────────────────
-- 31_integrations.sql
-- Per-workspace integration config for the Nexus Brain MCP: the Gruve
-- partner API key (encrypted at rest) and the Pulse tenant slug (no
-- secret — Nexus never calls Pulse's API, just stores which tenant
-- matches this workspace for nexus_whoami to report).

do $$ begin
  create type public.integration_provider as enum ('gruve', 'pulse');
exception when duplicate_object then null; end $$;

create table if not exists public.business_integrations (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  provider      public.integration_provider not null,
  config        jsonb not null default '{}',    -- gruve: {baseUrl}; pulse: {tenantSlug, baseUrl}
  secret_enc    text,                             -- gruve: AES-256-GCM of the gruve_live_ key; pulse: null
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, provider)
);

create index if not exists idx_business_integrations_business on public.business_integrations(business_id);

create or replace trigger business_integrations_updated_at
  before update on public.business_integrations
  for each row execute procedure public.handle_updated_at();

alter table public.business_integrations enable row level security;

-- Members can see THAT an integration exists and its non-secret config
-- (base URL, tenant slug) for the Connections settings page — secret_enc
-- itself must never be selected by any tool or server action regardless
-- of this policy; that's an app-layer discipline (see lib/integrations/
-- gruve.ts), not something column-level RLS solves here.
--
-- NOTE: the unqualified `business_id` in each USING/WITH CHECK clause
-- below must be qualified as `business_integrations.business_id`. Written
-- bare, it binds to `bm.business_id` instead (the only matching column in
-- the subquery's own FROM list — business_members has its own
-- business_id column, so there's no ambiguity error, just silent
-- mis-binding). That turns `bm.business_id = business_id` into the
-- tautology `bm.business_id = bm.business_id`, which strips out the
-- correlation to the outer row entirely: the policy degrades to "is
-- auth.uid() a member (or admin) of ANY business at all", so any user who
-- is a member/admin of some unrelated workspace could read, overwrite, or
-- delete every OTHER workspace's Gruve/Pulse integration row, including
-- the encrypted secret. Verified live against a local instance before
-- this fix (SELECT and UPDATE both crossed tenants) — never applied to a
-- real database.
create policy "Members can view business integrations"
  on public.business_integrations for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_integrations.business_id and bm.user_id = auth.uid()));

create policy "Admins can create business integrations"
  on public.business_integrations for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = business_integrations.business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

create policy "Admins can update business integrations"
  on public.business_integrations for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_integrations.business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

create policy "Admins can remove business integrations"
  on public.business_integrations for delete
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_integrations.business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

-- ── end 31_integrations.sql ──────────────────────────────────────────────────────────────

-- ── begin 32_fix_businesses_select_rls.sql ────────────────────────────────────────────────────────────
-- 32_fix_businesses_select_rls.sql
-- Fixes a real, pre-existing bug in 02_businesses.sql's SELECT policy on
-- `businesses`, found while verifying the Nexus Brain MCP OAuth consent
-- screen against a local Supabase instance.
--
-- The original policy:
--
--   create policy "Members can view their business"
--     on public.businesses for select
--     using (
--       exists (
--         select 1 from public.business_members bm
--         where bm.business_id = id
--           and bm.user_id = auth.uid()
--       )
--     );
--
-- intends `id` to correlate to the outer `businesses.id` (the row being
-- tested). But `business_members` ALSO has its own `id` primary key column,
-- and it is the innermost FROM in the correlated subquery, so per SQL name
-- resolution the unqualified `id` binds to `bm.id`, not `businesses.id`.
-- The policy actually evaluates `bm.business_id = bm.id` — comparing a
-- membership row's own primary key to its business_id column, which is
-- essentially never true. Net effect: NO ONE (not even a business's owner)
-- can see a `businesses` row through this policy. Any code path using the
-- RLS-bound client (createClient(), not createServiceClient()) to read
-- `businesses` directly, or to embed `businesses(...)` through
-- `business_members`, silently gets nothing back — e.g.
-- `getUserBusinesses()` in `(auth)/actions.ts` and the OAuth consent page's
-- admin-workspace lookup.
--
-- Fix: qualify the correlation explicitly against the table the policy is
-- defined on.

drop policy if exists "Members can view their business" on public.businesses;

create policy "Members can view their business"
  on public.businesses for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = businesses.id
        and bm.user_id = auth.uid()
    )
  );

-- ── end 32_fix_businesses_select_rls.sql ──────────────────────────────────────────────────────────────

-- ── begin 33_fix_business_scoped_rls_policies.sql ────────────────────────────────────────────────────────────
-- 33_fix_business_scoped_rls_policies.sql
-- Same bug 11_fix_nodes_rls.sql already fixed once for `nodes`, found
-- again — unfixed — in assets, calendar_entries (both predate the nodes
-- fix), and opportunities/platform_health/command_action_log (added later
-- in 26_command_center.sql without picking up the lesson).
--
-- The bug: a policy written as
--
--   exists (
--     select 1 from public.business_members bm
--     where bm.business_id = business_id   -- unqualified
--       and bm.user_id = auth.uid()
--   )
--
-- intends the unqualified `business_id` to correlate to the outer table's
-- own business_id column. But business_members has its own business_id
-- column, and it's the only match in the subquery's FROM scope — so per
-- SQL name resolution the unqualified reference binds to `bm.business_id`
-- itself, not the outer row. There's no ambiguity error (only one
-- candidate column is in scope), just a silent wrong bind. The condition
-- degrades to the tautology `bm.business_id = bm.business_id`, which
-- strips the tenant correlation out entirely: the policy becomes "is
-- auth.uid() a member (or admin) of ANY business at all" — true for every
-- signed-up user, since creating a business auto-adds you as its ADMIN
-- (03_business_members.sql's handle_new_business trigger).
--
-- Confirmed live against a local Supabase instance (never applied to
-- production): an authenticated user who is ADMIN of an unrelated
-- workspace could SELECT another tenant's business_integrations row
-- (including the encrypted secret) and UPDATE it — proof is what
-- triggered this migration (fixed separately, in 31_integrations.sql
-- directly, since that migration has never been applied anywhere real).
-- The same shape of bug in the policies below means, for each table: any
-- signed-up user can read every OTHER tenant's rows via SELECT, and any
-- user who is EDITOR/ADMIN of ANY workspace can INSERT/UPDATE/DELETE rows
-- against ANY OTHER business_id via a direct PostgREST call
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY + any signed-up user's session JWT is
-- enough — RLS is the only defense here, independent of what the Next.js
-- app's own UI does).
--
-- business_members itself is DELIBERATELY EXCLUDED from this migration.
-- It has the same-looking bug in 03_business_members.sql, but it is NOT
-- live: 23_fix_business_members_rls.sql already replaced those policies
-- with a correct fix, and for a different reason than "just qualify the
-- column" — business_members' policies query business_members itself, so
-- a self-referential correlated subquery hits Postgres's own RLS
-- recursion guard. Confirmed directly: applying the naive
-- `business_members.business_id`-qualified fix (as this migration does
-- for every other table) against a live instance throws "infinite
-- recursion detected in policy for relation business_members" and breaks
-- every OTHER policy that subqueries business_members along with it. 23's
-- SECURITY DEFINER helper functions (is_business_member/is_business_admin)
-- are the only correct fix for a self-referential table and must not be
-- touched here.
--
-- Fix for the tables below, following 11_fix_nodes_rls.sql's own
-- precedent exactly: drop and recreate each policy with the correlation
-- explicitly qualified against the table the policy is defined on. None
-- of these are self-referential (the policy's own table is never
-- business_members), so this simple fix is safe and sufficient.

-- ── assets ────────────────────────────────────────────────────────────────────
drop policy if exists "Business members can view assets" on public.assets;
drop policy if exists "Editors and admins can upload assets" on public.assets;
drop policy if exists "Admins can delete assets" on public.assets;

create policy "Business members can view assets"
  on public.assets for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = assets.business_id
        and bm.user_id = auth.uid()
    )
  );

create policy "Editors and admins can upload assets"
  on public.assets for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = assets.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

create policy "Admins can delete assets"
  on public.assets for delete
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = assets.business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- ── calendar_entries ──────────────────────────────────────────────────────────
drop policy if exists "Business members can view calendar entries" on public.calendar_entries;
drop policy if exists "Editors and admins can create calendar entries" on public.calendar_entries;
drop policy if exists "Editors and admins can update calendar entries" on public.calendar_entries;

create policy "Business members can view calendar entries"
  on public.calendar_entries for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = calendar_entries.business_id
        and bm.user_id = auth.uid()
    )
  );

create policy "Editors and admins can create calendar entries"
  on public.calendar_entries for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = calendar_entries.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

create policy "Editors and admins can update calendar entries"
  on public.calendar_entries for update
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = calendar_entries.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- ── opportunities ─────────────────────────────────────────────────────────────
drop policy if exists "Members can view opportunities" on public.opportunities;
drop policy if exists "Editors and admins can create opportunities" on public.opportunities;
drop policy if exists "Editors and admins can update opportunities" on public.opportunities;
drop policy if exists "Admins can delete opportunities" on public.opportunities;

create policy "Members can view opportunities"
  on public.opportunities for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = opportunities.business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can create opportunities"
  on public.opportunities for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = opportunities.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Editors and admins can update opportunities"
  on public.opportunities for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = opportunities.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Admins can delete opportunities"
  on public.opportunities for delete
  using (exists (select 1 from public.business_members bm
    where bm.business_id = opportunities.business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

-- ── platform_health ───────────────────────────────────────────────────────────
drop policy if exists "Members can view platform health" on public.platform_health;
drop policy if exists "Editors and admins can upsert platform health (insert)" on public.platform_health;
drop policy if exists "Editors and admins can upsert platform health (update)" on public.platform_health;

create policy "Members can view platform health"
  on public.platform_health for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = platform_health.business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can upsert platform health (insert)"
  on public.platform_health for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = platform_health.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Editors and admins can upsert platform health (update)"
  on public.platform_health for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = platform_health.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

-- ── command_action_log ────────────────────────────────────────────────────────
drop policy if exists "Members can view action log" on public.command_action_log;
drop policy if exists "Editors and admins can write action log" on public.command_action_log;

create policy "Members can view action log"
  on public.command_action_log for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = command_action_log.business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can write action log"
  on public.command_action_log for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = command_action_log.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

-- ── end 33_fix_business_scoped_rls_policies.sql ──────────────────────────────────────────────────────────────

