-- 01_users.sql
-- Extends Supabase auth.users with a public profile record.

create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  created_at  timestamp with time zone default now() not null
);

-- Index for email lookups.
create index if not exists idx_users_email on public.users (email);

-- Row Level Security
alter table public.users enable row level security;

-- Users can only read/update their own profile.
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Automatically create a user profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- Trigger to fire on new Supabase auth user creation.
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
