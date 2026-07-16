-- 26_command_center.sql
-- Freelance Command Center: private per-business hub that tracks inbound gigs and
-- outbound content across freelance/marketing platforms. Business-scoped and
-- RLS-isolated exactly like calendar_entries, so it only exists inside the owner's
-- workspace (e.g. "Aise's Space") and is invisible to members of other businesses.
--
-- Content posts intentionally reuse the existing `calendar_entries` table.
-- This migration adds only the two concepts Nexus doesn't already have
-- (inbound opportunities, platform health) plus a lightweight action log.

-- ── Enums ──────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.opportunity_status as enum
    ('new', 'drafted', 'approved', 'sent', 'rejected', 'quarantined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.opportunity_type as enum
    ('message', 'comment', 'job', 'invite');
exception when duplicate_object then null; end $$;

-- ── opportunities (inbound) ─────────────────────────────────────────────────────
create table if not exists public.opportunities (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  platform     text not null,                              -- Behance, Dribbble, Upwork, ...
  type         public.opportunity_type not null default 'message',
  status       public.opportunity_status not null default 'new',
  contact      text,
  source_url   text,
  message      text,                                       -- raw text as seen on platform
  draft_reply  text,                                       -- proposed reply, awaiting approval
  fit_score    int not null default 0,                     -- priority 0-100
  scam_score   int not null default 0,                     -- 0-100; >=60 auto-quarantined
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  decided_at   timestamptz
);

create index if not exists idx_opportunities_business_id on public.opportunities (business_id);
create index if not exists idx_opportunities_status      on public.opportunities (status);
create index if not exists idx_opportunities_platform    on public.opportunities (platform);

-- ── platform_health ─────────────────────────────────────────────────────────────
create table if not exists public.platform_health (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  platform      text not null,
  kind          text not null default 'both',             -- inbound | content | both
  handle        text,
  health_score  int not null default 0,                    -- 0-100
  top_fix       text,                                       -- single most-impactful next action
  last_checked  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, platform)
);

create index if not exists idx_platform_health_business_id on public.platform_health (business_id);

-- ── action_log (audit trail for the daily briefing) ──────────────────────────────
create table if not exists public.command_action_log (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  platform     text,
  kind         text not null,                              -- checked|drafted|sent|posted|scored|error
  ref_id       uuid,
  detail       text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_command_action_log_business_id on public.command_action_log (business_id);

-- ── updated_at triggers (reuse existing handle_updated_at) ────────────────────────
create or replace trigger opportunities_updated_at
  before update on public.opportunities
  for each row execute procedure public.handle_updated_at();

create or replace trigger platform_health_updated_at
  before update on public.platform_health
  for each row execute procedure public.handle_updated_at();

-- ── Row Level Security (same pattern as calendar_entries) ─────────────────────────
alter table public.opportunities        enable row level security;
alter table public.platform_health      enable row level security;
alter table public.command_action_log   enable row level security;

-- Helper predicates are inlined per policy to match the codebase style.

-- opportunities
create policy "Members can view opportunities"
  on public.opportunities for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can create opportunities"
  on public.opportunities for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Editors and admins can update opportunities"
  on public.opportunities for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Admins can delete opportunities"
  on public.opportunities for delete
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

-- platform_health
create policy "Members can view platform health"
  on public.platform_health for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can upsert platform health (insert)"
  on public.platform_health for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Editors and admins can upsert platform health (update)"
  on public.platform_health for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

-- command_action_log
create policy "Members can view action log"
  on public.command_action_log for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can write action log"
  on public.command_action_log for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));
