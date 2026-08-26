-- 28_command_center_platforms.sql
-- Widen the Command Center's platform tracking from "how healthy is my profile"
-- to "which platform deserves my next hour".
--
-- platform_health previously stored only health_score + top_fix, which answers
-- "is this profile in good shape" but not "is this platform worth being on at
-- all". This migration adds the three dimensions that drive prioritisation
-- (region friendliness, difficulty, potential) plus an onboarding status, so a
-- platform you have not joined yet is a first-class row rather than an absence.
--
-- Ratings seeded below come from the operator's own platform research. Platforms
-- without researched ratings are left unrated (region_friendly = 0, difficulty
-- and potential null) rather than guessed at.

-- ── Enums ──────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.platform_difficulty as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.platform_potential as enum ('high', 'very_high', 'extremely_high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.platform_onboarding as enum
    ('not_started', 'profile_building', 'applied', 'screening', 'active', 'rejected', 'paused');
exception when duplicate_object then null; end $$;

-- ── Columns ────────────────────────────────────────────────────────────────────
alter table public.platform_health
  add column if not exists region_friendly   int not null default 0,
  add column if not exists difficulty        public.platform_difficulty,
  add column if not exists potential         public.platform_potential,
  add column if not exists onboarding_status public.platform_onboarding not null default 'not_started',
  add column if not exists profile_url       text,
  add column if not exists notes             text;

-- region_friendly is a 0-5 star rating; 0 means "not researched yet".
do $$ begin
  alter table public.platform_health
    add constraint platform_health_region_friendly_range
    check (region_friendly between 0 and 5);
exception when duplicate_object then null; end $$;

create index if not exists idx_platform_health_onboarding
  on public.platform_health (business_id, onboarding_status);

-- ── Canonical platform catalogue ───────────────────────────────────────────────
-- One place both enable_command_center() and the backfill read from, so the
-- seed list can never drift between "new workspace" and "existing workspace".
create or replace function public.command_center_default_platforms()
returns table (
  platform         text,
  kind             text,
  region_friendly  int,
  difficulty       public.platform_difficulty,
  potential        public.platform_potential
)
language sql
immutable
as $$
  select t.platform::text,
         t.kind::text,
         t.region_friendly::int,
         t.difficulty::public.platform_difficulty,
         t.potential::public.platform_potential
  from (values
    -- Freelance marketplaces (researched)
    ('Contra',     'both',    5, 'easy',   'very_high'),
    ('Upwork',     'inbound', 5, 'medium', 'very_high'),
    ('Toptal',     'inbound', 3, 'hard',   'extremely_high'),
    ('Braintrust', 'inbound', 4, 'medium', 'very_high'),
    ('Wellfound',  'inbound', 5, 'medium', 'very_high'),
    ('Arc',        'inbound', 4, 'medium', 'high'),
    ('Flexiple',   'inbound', 3, 'hard',   'high'),
    ('Fiverr',     'inbound', 5, 'medium', 'high'),
    ('LinkedIn',   'content', 5, 'medium', 'extremely_high'),
    -- Portfolio / audience surfaces (not yet researched, left unrated)
    ('Behance',    'both',    0, null,     null),
    ('Dribbble',   'both',    0, null,     null),
    ('Twitter',    'content', 0, null,     null)
  ) as t (platform, kind, region_friendly, difficulty, potential);
$$;

-- ── Enable: seed from the catalogue ────────────────────────────────────────────
create or replace function public.enable_command_center(p_business_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'
  ) then
    raise exception 'Only an ADMIN of this workspace can enable the Command Center';
  end if;

  update public.businesses
    set command_center_enabled = true
    where id = p_business_id;

  insert into public.platform_health
    (business_id, platform, kind, region_friendly, difficulty, potential)
  select p_business_id, d.platform, d.kind, d.region_friendly, d.difficulty, d.potential
  from public.command_center_default_platforms() d
  on conflict (business_id, platform) do nothing;
end;
$$;

-- ── Backfill: workspaces that enabled the Command Center before this migration ──
-- Inserts platforms they are missing, and fills in ratings on rows that already
-- exist. Deliberately does NOT touch health_score, top_fix, handle, profile_url,
-- notes or onboarding_status, so operator-entered state survives.
insert into public.platform_health
  (business_id, platform, kind, region_friendly, difficulty, potential)
select b.id, d.platform, d.kind, d.region_friendly, d.difficulty, d.potential
from public.businesses b
cross join public.command_center_default_platforms() d
where b.command_center_enabled
on conflict (business_id, platform) do nothing;

update public.platform_health ph
set region_friendly = d.region_friendly,
    difficulty      = d.difficulty,
    potential       = d.potential
from public.command_center_default_platforms() d
where ph.platform = d.platform
  and d.region_friendly > 0
  and ph.region_friendly = 0;

grant execute on function public.command_center_default_platforms() to authenticated;
grant execute on function public.enable_command_center(uuid) to authenticated;
