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
