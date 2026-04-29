-- 21_fix_comments_rls.sql
-- Fix comment RLS policies that allowed any authenticated user to read/write
-- comments on any node, regardless of workspace membership.

-- Drop the broken policies on comment_threads
drop policy if exists "Users can view threads on accessible nodes" on public.comment_threads;
drop policy if exists "Users can create threads on accessible nodes" on public.comment_threads;
drop policy if exists "Users can resolve their own threads or if they are admin" on public.comment_threads;

-- Drop the broken policies on comments
drop policy if exists "Users can view comments on accessible threads" on public.comments;
drop policy if exists "Users can post comments on accessible threads" on public.comments;

-- Recreate with proper business membership checks

-- Threads: only workspace members can view
create policy "Workspace members can view comment threads"
  on public.comment_threads for select
  using (
    exists (
      select 1 from public.nodes n
      join public.business_members bm
        on bm.business_id = n.business_id
      where n.id = node_id
        and bm.user_id = auth.uid()
    )
  );

-- Threads: only editors/admins can create
create policy "Editors and admins can create comment threads"
  on public.comment_threads for insert
  with check (
    exists (
      select 1 from public.nodes n
      join public.business_members bm
        on bm.business_id = n.business_id
      where n.id = node_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- Threads: only editors/admins can update (resolve)
create policy "Editors and admins can update comment threads"
  on public.comment_threads for update
  using (
    exists (
      select 1 from public.nodes n
      join public.business_members bm
        on bm.business_id = n.business_id
      where n.id = node_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- Comments: workspace members can view
create policy "Workspace members can view comments"
  on public.comments for select
  using (
    exists (
      select 1 from public.comment_threads ct
      join public.nodes n on n.id = ct.node_id
      join public.business_members bm
        on bm.business_id = n.business_id
      where ct.id = thread_id
        and bm.user_id = auth.uid()
    )
  );

-- Comments: editors/admins can post
create policy "Editors and admins can post comments"
  on public.comments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.comment_threads ct
      join public.nodes n on n.id = ct.node_id
      join public.business_members bm
        on bm.business_id = n.business_id
      where ct.id = thread_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );
