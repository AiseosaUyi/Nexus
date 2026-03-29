-- 02_businesses.sql
-- Workspaces / organizations that own content.

create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  owner_id    uuid not null references public.users (id) on delete restrict,
  created_at  timestamp with time zone default now() not null,
  updated_at  timestamp with time zone default now() not null
);

-- Indexes
create index if not exists idx_businesses_owner_id on public.businesses (owner_id);
create index if not exists idx_businesses_slug     on public.businesses (slug);

-- Row Level Security
alter table public.businesses enable row level security;

-- Anyone who is a member of the business can view it.
create policy "Members can view their business"
  on public.businesses for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = id
        and bm.user_id = auth.uid()
    )
  );

-- Only the owner can update the business.
create policy "Owner can update business"
  on public.businesses for update
  using (owner_id = auth.uid());

-- Any authenticated user can create a business.
create policy "Users can create businesses"
  on public.businesses for insert
  with check (owner_id = auth.uid());

-- Auto-update the updated_at field.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger businesses_updated_at
  before update on public.businesses
  for each row execute procedure public.handle_updated_at();
