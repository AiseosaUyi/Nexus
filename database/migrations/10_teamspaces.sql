-- 10_teamspaces.sql
-- Top-level groups for organizing nodes within a business.

create table if not exists public.teamspaces (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null,
  icon         text,           -- emoji or icon name
  description  text,
  position     int not null default 0,
  is_private   boolean not null default false,
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamp with time zone default now() not null,
  updated_at   timestamp with time zone default now() not null
);

-- Index for ordering within a business
create index if not exists idx_teamspaces_business_id_position on public.teamspaces (business_id, position);

-- Update nodes to reference teamspaces
alter table public.nodes 
  add column if not exists teamspace_id uuid references public.teamspaces (id) on delete set null;

create index if not exists idx_nodes_teamspace_id on public.nodes (teamspace_id);

-- Row Level Security
alter table public.teamspaces enable row level security;

-- Members can view teamspaces in their business.
create policy "Business members can view teamspaces"
  on public.teamspaces for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = teamspaces.business_id
        and bm.user_id = auth.uid()
    )
  );

-- Only ADMINs and EDITORs can create/update teamspaces.
create policy "Editors and admins can manage teamspaces"
  on public.teamspaces for all
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = teamspaces.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- Auto-update updated_at
create or replace trigger teamspaces_updated_at
  before update on public.teamspaces
  for each row execute procedure public.handle_updated_at();
