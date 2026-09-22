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
