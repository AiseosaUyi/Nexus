-- 04_nodes.sql
-- Core hierarchical tree structure for folders, documents, and calendar items.

-- Node type enum
do $$ begin
  create type public.node_type as enum ('folder', 'document', 'calendar');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.nodes (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  parent_id    uuid references public.nodes (id) on delete cascade,
  type         public.node_type not null default 'document',
  title        text not null default 'Untitled',
  icon         text,           -- emoji or icon name
  cover_url    text,           -- banner image
  position     int not null default 0,  -- ordering among siblings
  is_archived  boolean not null default false,
  teamspace_id uuid references public.teamspaces (id) on delete set null,
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamp with time zone default now() not null,
  updated_at   timestamp with time zone default now() not null
);

-- Indexes for fast tree traversal
create index if not exists idx_nodes_business_id  on public.nodes (business_id);
create index if not exists idx_nodes_parent_id    on public.nodes (parent_id);
create index if not exists idx_nodes_type         on public.nodes (type);
create index if not exists idx_nodes_position     on public.nodes (business_id, parent_id, position);

-- Row Level Security
alter table public.nodes enable row level security;

-- Members of a business can view its nodes.
create policy "Business members can view nodes"
  on public.nodes for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
    )
  );

-- EDITORs and ADMINs can create nodes.
create policy "Editors and admins can create nodes"
  on public.nodes for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- EDITORs and ADMINs can update nodes.
create policy "Editors and admins can update nodes"
  on public.nodes for update
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- Only ADMINs can delete nodes.
create policy "Admins can delete nodes"
  on public.nodes for delete
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- Auto-update updated_at
create or replace trigger nodes_updated_at
  before update on public.nodes
  for each row execute procedure public.handle_updated_at();
