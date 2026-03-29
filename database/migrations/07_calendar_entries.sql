-- 07_calendar_entries.sql
-- Calendar metadata linked to calendar-type nodes.

-- Calendar status enum
do $$ begin
  create type public.calendar_status as enum ('draft', 'scheduled', 'published', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.calendar_entries (
  id            uuid primary key default gen_random_uuid(),
  node_id       uuid not null references public.nodes (id) on delete cascade,
  business_id   uuid not null references public.businesses (id) on delete cascade,
  publish_date  date,
  platform      text,              -- e.g. 'twitter', 'linkedin', 'instagram'
  status        public.calendar_status not null default 'draft',
  notes         text,
  assigned_to   uuid references public.users (id) on delete set null,
  created_at    timestamp with time zone default now() not null,
  updated_at    timestamp with time zone default now() not null
);

-- Indexes
create index if not exists idx_calendar_entries_business_id  on public.calendar_entries (business_id);
create index if not exists idx_calendar_entries_node_id      on public.calendar_entries (node_id);
create index if not exists idx_calendar_entries_publish_date on public.calendar_entries (publish_date);
create index if not exists idx_calendar_entries_status       on public.calendar_entries (status);

-- Row Level Security
alter table public.calendar_entries enable row level security;

-- Business members can view calendar entries.
create policy "Business members can view calendar entries"
  on public.calendar_entries for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
    )
  );

-- EDITORs and ADMINs can create calendar entries.
create policy "Editors and admins can create calendar entries"
  on public.calendar_entries for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- EDITORs and ADMINs can update calendar entries.
create policy "Editors and admins can update calendar entries"
  on public.calendar_entries for update
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- Auto-update updated_at
create or replace trigger calendar_entries_updated_at
  before update on public.calendar_entries
  for each row execute procedure public.handle_updated_at();
