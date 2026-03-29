-- 06_assets.sql
-- Metadata for uploaded files (images, documents, videos, attachments).

create table if not exists public.assets (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  node_id       uuid references public.nodes (id) on delete set null,
  file_url      text not null,
  storage_path  text not null,   -- internal Supabase Storage path
  file_name     text not null,
  file_type     text not null,   -- MIME type e.g. image/png
  size          int not null,    -- bytes
  uploaded_by   uuid references public.users (id) on delete set null,
  created_at    timestamp with time zone default now() not null
);

-- Indexes
create index if not exists idx_assets_business_id on public.assets (business_id);
create index if not exists idx_assets_node_id     on public.assets (node_id);
create index if not exists idx_assets_file_type   on public.assets (file_type);

-- Row Level Security
alter table public.assets enable row level security;

-- Business members can view assets.
create policy "Business members can view assets"
  on public.assets for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
    )
  );

-- EDITORs and ADMINs can upload assets.
create policy "Editors and admins can upload assets"
  on public.assets for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- Only ADMINs can delete assets.
create policy "Admins can delete assets"
  on public.assets for delete
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );
