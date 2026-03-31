-- 11_fix_nodes_rls.sql
-- Clarifying RLS policies for the nodes table to avoid column name ambiguity.

-- 1. Drop existing policies
drop policy if exists "Business members can view nodes" on public.nodes;
drop policy if exists "Editors and admins can create nodes" on public.nodes;
drop policy if exists "Editors and admins can update nodes" on public.nodes;
drop policy if exists "Admins can delete nodes" on public.nodes;

-- 2. Re-create SELECT policy with explicit alias
create policy "Business members can view nodes"
  on public.nodes for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = nodes.business_id
        and bm.user_id = auth.uid()
    )
  );

-- 3. Re-create INSERT policy with explicit alias
-- 'nodes.business_id' in a WITH CHECK refers to the column of the new row.
create policy "Editors and admins can create nodes"
  on public.nodes for insert
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = nodes.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- 4. Re-create UPDATE policy with explicit alias
create policy "Editors and admins can update nodes"
  on public.nodes for update
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = nodes.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- 5. Re-create DELETE policy with explicit alias
create policy "Admins can delete nodes"
  on public.nodes for delete
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = nodes.business_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );
