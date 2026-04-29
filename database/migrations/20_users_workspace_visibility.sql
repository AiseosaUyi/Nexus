-- 20_users_workspace_visibility.sql
-- Allow workspace members to view each other's profiles.
-- Without this, the join on users() from business_members returns null
-- for everyone except the current user, causing blank member lists.

create policy "Workspace members can view each other"
  on public.users for select
  using (
    auth.uid() = id
    OR exists (
      select 1
      from public.business_members bm1
      join public.business_members bm2
        on bm1.business_id = bm2.business_id
      where bm1.user_id = auth.uid()
        and bm2.user_id = users.id
    )
  );

-- Drop the old restrictive policy that only allowed self-view
drop policy if exists "Users can view own profile" on public.users;
