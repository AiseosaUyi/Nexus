-- 05_blocks.sql
-- Ordered content blocks within a document node.

-- Block type enum
do $$ begin
  create type public.block_type as enum (
    'paragraph',
    'heading',
    'list',
    'image',
    'video',
    'file',
    'embed',
    'divider',
    'code',
    'quote',
    'callout',
    'table'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.blocks (
  id          uuid primary key default gen_random_uuid(),
  node_id     uuid not null references public.nodes (id) on delete cascade,
  type        public.block_type not null default 'paragraph',
  content     jsonb not null default '{}',
  position    int not null default 0,
  created_at  timestamp with time zone default now() not null,
  updated_at  timestamp with time zone default now() not null
);

-- Indexes for fast document content loading
create index if not exists idx_blocks_node_id  on public.blocks (node_id);
create index if not exists idx_blocks_position on public.blocks (node_id, position);

-- GIN index for full-text search inside block content
create index if not exists idx_blocks_content_gin on public.blocks using gin (content);

-- Row Level Security
alter table public.blocks enable row level security;

-- Members of a business can view blocks (via the node's business).
create policy "Business members can view blocks"
  on public.blocks for select
  using (
    exists (
      select 1 from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = node_id
        and bm.user_id = auth.uid()
    )
  );

-- EDITORs and ADMINs can create blocks.
create policy "Editors and admins can create blocks"
  on public.blocks for insert
  with check (
    exists (
      select 1 from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = node_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- EDITORs and ADMINs can update blocks.
create policy "Editors and admins can update blocks"
  on public.blocks for update
  using (
    exists (
      select 1 from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = node_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- EDITORs and ADMINs can delete blocks.
create policy "Editors and admins can delete blocks"
  on public.blocks for delete
  using (
    exists (
      select 1 from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = node_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- Auto-update updated_at
create or replace trigger blocks_updated_at
  before update on public.blocks
  for each row execute procedure public.handle_updated_at();
