
-- ========================================
-- *.sql
-- ========================================
-- Node sharing: invite by email and access requests
-- Supports permission levels and general access control.

-- Shares: tracks who has been invited to a specific node
CREATE TABLE IF NOT EXISTS public.node_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  email text NOT NULL,
  permission text NOT NULL DEFAULT 'view',  -- 'view', 'comment', 'edit', 'full'
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_node_shares_node_email UNIQUE (node_id, email)
);

-- Access requests: tracks users who requested access to a restricted node
CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
  requester_email text NOT NULL,
  requester_name text,
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'denied'
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT uq_access_requests_node_email UNIQUE (node_id, requester_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_node_shares_node ON public.node_shares(node_id);
CREATE INDEX IF NOT EXISTS idx_node_shares_email ON public.node_shares(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_node ON public.access_requests(node_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status) WHERE status = 'pending';

-- RLS
ALTER TABLE public.node_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Node shares: workspace members can manage shares for their nodes
drop policy if exists "Workspace members can view node shares" on public.node_shares;
CREATE POLICY "Workspace members can view node shares"
  ON public.node_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = node_shares.node_id AND bm.user_id = auth.uid()
    )
  );

drop policy if exists "Workspace members can insert node shares" on public.node_shares;
CREATE POLICY "Workspace members can insert node shares"
  ON public.node_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = node_shares.node_id AND bm.user_id = auth.uid()
    )
  );

drop policy if exists "Workspace members can delete node shares" on public.node_shares;
CREATE POLICY "Workspace members can delete node shares"
  ON public.node_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = node_shares.node_id AND bm.user_id = auth.uid()
    )
  );

drop policy if exists "Workspace members can update node shares" on public.node_shares;
CREATE POLICY "Workspace members can update node shares"
  ON public.node_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = node_shares.node_id AND bm.user_id = auth.uid()
    )
  );

-- Access requests: anyone can create, workspace members can view/update
drop policy if exists "Anyone can request access" on public.access_requests;
CREATE POLICY "Anyone can request access"
  ON public.access_requests FOR INSERT
  WITH CHECK (true);

drop policy if exists "Workspace members can view access requests" on public.access_requests;
CREATE POLICY "Workspace members can view access requests"
  ON public.access_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = access_requests.node_id AND bm.user_id = auth.uid()
    )
  );

drop policy if exists "Workspace members can update access requests" on public.access_requests;
CREATE POLICY "Workspace members can update access requests"
  ON public.access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.nodes n
      JOIN public.business_members bm ON bm.business_id = n.business_id
      WHERE n.id = access_requests.node_id AND bm.user_id = auth.uid()
    )
  );

-- Shared users can view the node (extend existing node SELECT policy)
-- This allows invited users to read nodes even when is_public = false
drop policy if exists "Shared users can view nodes" on public.nodes;
CREATE POLICY "Shared users can view nodes"
  ON public.nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.node_shares ns
      WHERE ns.node_id = nodes.id
      AND ns.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ========================================
-- *.sql
-- ========================================
-- 18_get_invitation_details.sql
-- Function to securely fetch invitation details via token bypass for the landing page.

create or replace function public.get_invitation_by_token(p_token text)
returns table (
  id uuid,
  email text,
  role public.member_role,
  business_id uuid,
  accepted_at timestamp with time zone,
  expires_at timestamp with time zone,
  business_name text,
  business_slug text
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select 
    i.id, i.email, i.role, i.business_id, i.accepted_at, i.expires_at,
    b.name as business_name, b.slug as business_slug
  from public.invitations i
  join public.businesses b on b.id = i.business_id
  where i.token = p_token;
end;
$$;

-- ========================================
-- *.sql
-- ========================================
-- 19_check_user_exists.sql
-- Function to safely check if a user with a given email already has a Nexus account.
-- Used to toggle between Login and Signup modes in the invitation flow.

create or replace function public.check_user_exists(p_email text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  return exists (
    select 1 
    from public.users 
    where email = lower(p_email)
  );
end;
$$;

-- ========================================
-- *.sql
-- ========================================
-- 20_users_workspace_visibility.sql
-- Allow workspace members to view each other's profiles.
-- Without this, the join on users() from business_members returns null
-- for everyone except the current user, causing blank member lists.

drop policy if exists "Workspace members can view each other" on public.users;
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

-- ========================================
-- *.sql
-- ========================================
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
drop policy if exists "Workspace members can view comment threads" on public.comment_threads;
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
drop policy if exists "Editors and admins can create comment threads" on public.comment_threads;
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
drop policy if exists "Editors and admins can update comment threads" on public.comment_threads;
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
drop policy if exists "Workspace members can view comments" on public.comments;
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
drop policy if exists "Editors and admins can post comments" on public.comments;
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

-- ========================================
-- *.sql
-- ========================================
-- 22_comments_extensions.sql
-- Comment system extensions for resolve flow + edit tracking.
--
-- Adds:
--   comment_threads.created_by   (author — used for resolve permission)
--   comment_threads.resolved_by  (who resolved)
--   comment_threads.resolved_at  (when)
--   comments.is_edited           (edited flag for "edited" badge)
--   comments.edited_at           (when last edited)
--
-- Tightens resolve permission: only thread author OR workspace ADMIN can
-- resolve/unresolve. Plain editors lose the broad "any editor can resolve any
-- thread" power they had under migration 21.

-- ── Columns ────────────────────────────────────────────────────────────────

alter table public.comment_threads
  add column if not exists created_by  uuid references public.users (id) on delete set null,
  add column if not exists resolved_by uuid references public.users (id) on delete set null,
  add column if not exists resolved_at timestamp with time zone;

alter table public.comments
  add column if not exists is_edited boolean not null default false,
  add column if not exists edited_at timestamp with time zone;

-- ── Backfill created_by from earliest comment in each thread ───────────────

update public.comment_threads ct
set created_by = sub.user_id
from (
  select distinct on (thread_id) thread_id, user_id
  from public.comments
  order by thread_id, created_at asc
) sub
where sub.thread_id = ct.id
  and ct.created_by is null;

-- ── Indexes ────────────────────────────────────────────────────────────────

create index if not exists idx_comment_threads_created_by on public.comment_threads (created_by);
create index if not exists idx_comment_threads_resolved   on public.comment_threads (node_id, is_resolved);

-- ── Tighten resolve permission ─────────────────────────────────────────────
-- Replace the migration 21 update policy. Resolve/unresolve is allowed only
-- when the user is (a) the thread author, or (b) an ADMIN of the workspace.

drop policy if exists "Editors and admins can update comment threads" on public.comment_threads;

drop policy if exists "Author or admin can update comment threads" on public.comment_threads;
create policy "Author or admin can update comment threads"
  on public.comment_threads for update
  using (
    -- thread author can update their own thread
    auth.uid() = created_by
    or
    -- workspace admin can update any thread on a node in their workspace
    exists (
      select 1 from public.nodes n
      join public.business_members bm
        on bm.business_id = n.business_id
      where n.id = node_id
        and bm.user_id = auth.uid()
        and bm.role = 'ADMIN'
    )
  );

-- ── Set created_by on insert (default to auth.uid() if not provided) ───────
-- We can't use a column DEFAULT because auth.uid() requires a SQL function call
-- in RLS context. Instead, the server action sets it explicitly. The insert
-- policy is updated to require created_by = auth.uid() to prevent spoofing.

drop policy if exists "Editors and admins can create comment threads" on public.comment_threads;

drop policy if exists "Editors and admins can create comment threads" on public.comment_threads;
create policy "Editors and admins can create comment threads"
  on public.comment_threads for insert
  with check (
    -- created_by must match the inserter (or be null for backwards compat with
    -- already-deployed actions; new code always sets it)
    (created_by is null or created_by = auth.uid())
    and exists (
      select 1 from public.nodes n
      join public.business_members bm
        on bm.business_id = n.business_id
      where n.id = node_id
        and bm.user_id = auth.uid()
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

-- ========================================
-- *.sql
-- ========================================
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

drop policy if exists "Members can view business membership" on public.business_members;
create policy "Members can view business membership"
  on public.business_members for select
  using (public.is_business_member(business_id));

drop policy if exists "Admins can insert business members" on public.business_members;
create policy "Admins can insert business members"
  on public.business_members for insert
  with check (public.is_business_admin(business_id));

drop policy if exists "Admins can update member roles" on public.business_members;
create policy "Admins can update member roles"
  on public.business_members for update
  using (public.is_business_admin(business_id));

drop policy if exists "Admins can remove members" on public.business_members;
create policy "Admins can remove members"
  on public.business_members for delete
  using (public.is_business_admin(business_id));
