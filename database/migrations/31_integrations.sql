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
