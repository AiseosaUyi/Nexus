-- 03_business_members.sql
-- Links users to a business with a role for permission scoping.

-- Role enum type
do $$ begin
  create type public.member_role as enum ('ADMIN', 'EDITOR', 'VIEWER');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.business_members (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  role         public.member_role not null default 'VIEWER',
  joined_at    timestamp with time zone default now() not null,

  unique (business_id, user_id)
);

-- Indexes
create index if not exists idx_business_members_business_id on public.business_members (business_id);
create index if not exists idx_business_members_user_id     on public.business_members (user_id);

-- Row Level Security
alter table public.business_members enable row level security;

-- Members can view all members of businesses they belong to.
create policy "Members can view business membership"
  on public.business_members for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
    )
  );

-- Only ADMINs of a business can insert new members.
create policy "Admins can insert business members"
  on public.business_members for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- Only ADMINs can update roles.
create policy "Admins can update member roles"
  on public.business_members for update
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- Only ADMINs can remove members.
create policy "Admins can remove members"
  on public.business_members for delete
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- Automatically add the business creator as an ADMIN member.
create or replace function public.handle_new_business()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.business_members (business_id, user_id, role)
  values (new.id, new.owner_id, 'ADMIN');
  return new;
end;
$$;

create or replace trigger on_business_created
  after insert on public.businesses
  for each row execute procedure public.handle_new_business();
