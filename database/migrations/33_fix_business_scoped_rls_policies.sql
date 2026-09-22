-- 33_fix_business_scoped_rls_policies.sql
-- Same bug 11_fix_nodes_rls.sql already fixed once for `nodes`, found
-- again — unfixed — in assets, calendar_entries (both predate the nodes
-- fix), and opportunities/platform_health/command_action_log (added later
-- in 26_command_center.sql without picking up the lesson).
--
-- The bug: a policy written as
--
--   exists (
--     select 1 from public.business_members bm
--     where bm.business_id = business_id   -- unqualified
--       and bm.user_id = auth.uid()
--   )
--
-- intends the unqualified `business_id` to correlate to the outer table's
-- own business_id column. But business_members has its own business_id
-- column, and it's the only match in the subquery's FROM scope — so per
-- SQL name resolution the unqualified reference binds to `bm.business_id`
-- itself, not the outer row. There's no ambiguity error (only one
-- candidate column is in scope), just a silent wrong bind. The condition
-- degrades to the tautology `bm.business_id = bm.business_id`, which
-- strips the tenant correlation out entirely: the policy becomes "is
-- auth.uid() a member (or admin) of ANY business at all" — true for every
-- signed-up user, since creating a business auto-adds you as its ADMIN
-- (03_business_members.sql's handle_new_business trigger).
--
-- Confirmed live against a local Supabase instance (never applied to
-- production): an authenticated user who is ADMIN of an unrelated
-- workspace could SELECT another tenant's business_integrations row
-- (including the encrypted secret) and UPDATE it — proof is what
-- triggered this migration (fixed separately, in 31_integrations.sql
-- directly, since that migration has never been applied anywhere real).
-- The same shape of bug in the policies below means, for each table: any
-- signed-up user can read every OTHER tenant's rows via SELECT, and any
-- user who is EDITOR/ADMIN of ANY workspace can INSERT/UPDATE/DELETE rows
-- against ANY OTHER business_id via a direct PostgREST call
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY + any signed-up user's session JWT is
-- enough — RLS is the only defense here, independent of what the Next.js
-- app's own UI does).
--
-- business_members itself is DELIBERATELY EXCLUDED from this migration.
-- It has the same-looking bug in 03_business_members.sql, but it is NOT
-- live: 23_fix_business_members_rls.sql already replaced those policies
-- with a correct fix, and for a different reason than "just qualify the
-- column" — business_members' policies query business_members itself, so
-- a self-referential correlated subquery hits Postgres's own RLS
-- recursion guard. Confirmed directly: applying the naive
-- `business_members.business_id`-qualified fix (as this migration does
-- for every other table) against a live instance throws "infinite
-- recursion detected in policy for relation business_members" and breaks
-- every OTHER policy that subqueries business_members along with it. 23's
-- SECURITY DEFINER helper functions (is_business_member/is_business_admin)
-- are the only correct fix for a self-referential table and must not be
-- touched here.
--
-- Fix for the tables below, following 11_fix_nodes_rls.sql's own
-- precedent exactly: drop and recreate each policy with the correlation
-- explicitly qualified against the table the policy is defined on. None
-- of these are self-referential (the policy's own table is never
-- business_members), so this simple fix is safe and sufficient.

-- ── assets ────────────────────────────────────────────────────────────────────
drop policy if exists "Business members can view assets" on public.assets;
drop policy if exists "Editors and admins can upload assets" on public.assets;
drop policy if exists "Admins can delete assets" on public.assets;

create policy "Business members can view assets"
  on public.assets for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = assets.business_id
        and bm.user_id = auth.uid()
    )
  );

create policy "Editors and admins can upload assets"
  on public.assets for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = assets.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

create policy "Admins can delete assets"
  on public.assets for delete
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = assets.business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- ── calendar_entries ──────────────────────────────────────────────────────────
drop policy if exists "Business members can view calendar entries" on public.calendar_entries;
drop policy if exists "Editors and admins can create calendar entries" on public.calendar_entries;
drop policy if exists "Editors and admins can update calendar entries" on public.calendar_entries;

create policy "Business members can view calendar entries"
  on public.calendar_entries for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = calendar_entries.business_id
        and bm.user_id = auth.uid()
    )
  );

create policy "Editors and admins can create calendar entries"
  on public.calendar_entries for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = calendar_entries.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

create policy "Editors and admins can update calendar entries"
  on public.calendar_entries for update
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = calendar_entries.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- ── opportunities ─────────────────────────────────────────────────────────────
drop policy if exists "Members can view opportunities" on public.opportunities;
drop policy if exists "Editors and admins can create opportunities" on public.opportunities;
drop policy if exists "Editors and admins can update opportunities" on public.opportunities;
drop policy if exists "Admins can delete opportunities" on public.opportunities;

create policy "Members can view opportunities"
  on public.opportunities for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = opportunities.business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can create opportunities"
  on public.opportunities for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = opportunities.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Editors and admins can update opportunities"
  on public.opportunities for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = opportunities.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Admins can delete opportunities"
  on public.opportunities for delete
  using (exists (select 1 from public.business_members bm
    where bm.business_id = opportunities.business_id and bm.user_id = auth.uid()
      and bm.role = 'ADMIN'));

-- ── platform_health ───────────────────────────────────────────────────────────
drop policy if exists "Members can view platform health" on public.platform_health;
drop policy if exists "Editors and admins can upsert platform health (insert)" on public.platform_health;
drop policy if exists "Editors and admins can upsert platform health (update)" on public.platform_health;

create policy "Members can view platform health"
  on public.platform_health for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = platform_health.business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can upsert platform health (insert)"
  on public.platform_health for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = platform_health.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

create policy "Editors and admins can upsert platform health (update)"
  on public.platform_health for update
  using (exists (select 1 from public.business_members bm
    where bm.business_id = platform_health.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));

-- ── command_action_log ────────────────────────────────────────────────────────
drop policy if exists "Members can view action log" on public.command_action_log;
drop policy if exists "Editors and admins can write action log" on public.command_action_log;

create policy "Members can view action log"
  on public.command_action_log for select
  using (exists (select 1 from public.business_members bm
    where bm.business_id = command_action_log.business_id and bm.user_id = auth.uid()));

create policy "Editors and admins can write action log"
  on public.command_action_log for insert
  with check (exists (select 1 from public.business_members bm
    where bm.business_id = command_action_log.business_id and bm.user_id = auth.uid()
      and bm.role in ('ADMIN','EDITOR')));
