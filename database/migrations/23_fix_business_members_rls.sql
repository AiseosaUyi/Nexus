-- 23_fix_business_members_rls.sql
-- Fix recursive RLS on business_members.
--
-- Migration 03 wrote policies that EXIST-query business_members from policies
-- ON business_members. Postgres applies RLS to that inner query too, which
-- creates a recursive evaluation cycle and the policy resolves to false. In
-- practice this means "delete member" silently affects 0 rows and the UI
-- stays unchanged.
--
-- Fix: move the membership check into a SECURITY DEFINER function. SECURITY
-- DEFINER bypasses RLS inside the function body, so the recursion breaks.

-- ── Helper function ────────────────────────────────────────────────────────

create or replace function public.is_business_admin(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = p_business_id
      and user_id = auth.uid()
      and role = 'ADMIN'
  );
$$;

revoke all on function public.is_business_admin(uuid) from public;
grant execute on function public.is_business_admin(uuid) to authenticated;

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = p_business_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;

-- ── Replace recursive policies on business_members ─────────────────────────

drop policy if exists "Members can view business membership" on public.business_members;
drop policy if exists "Admins can insert business members"   on public.business_members;
drop policy if exists "Admins can update member roles"       on public.business_members;
drop policy if exists "Admins can remove members"            on public.business_members;

create policy "Members can view business membership"
  on public.business_members for select
  using (public.is_business_member(business_id));

create policy "Admins can insert business members"
  on public.business_members for insert
  with check (public.is_business_admin(business_id));

create policy "Admins can update member roles"
  on public.business_members for update
  using (public.is_business_admin(business_id));

create policy "Admins can remove members"
  on public.business_members for delete
  using (public.is_business_admin(business_id));
