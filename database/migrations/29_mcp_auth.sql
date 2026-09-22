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

create policy "Members can view workspace api tokens"
  on public.workspace_api_tokens for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()));

create policy "Admins can insert workspace api tokens"
  on public.workspace_api_tokens for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

create policy "Admins can revoke workspace api tokens"
  on public.workspace_api_tokens for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()
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
