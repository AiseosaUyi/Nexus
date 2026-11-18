-- 35_restore_blocks_write_policies.sql
--
-- Production drift fix (found 2026-11-18). The live `blocks` table had only
-- two SELECT policies ("Business members can view blocks", via a
-- check_is_business_member() helper that isn't in this repo, and the public
-- one). The INSERT/UPDATE/DELETE policies from 05_blocks.sql were missing, so
-- with RLS on, every write from a signed-in user was refused:
--
--   [BACKEND] Error syncing blocks: 42501 new row violates row-level
--   security policy for table "blocks"
--
-- Impact: the editor's derived block copy (used by nexus_search_docs / the
-- blocks fallback) never updated from the app. The canonical Yjs snapshot was
-- unaffected, so no document content was lost. Service-role writes (MCP
-- append/create) bypass RLS and kept working.
--
-- Restores write access for workspace EDITOR/ADMIN members, with the
-- business_id correlation qualified explicitly (see the RLS note in
-- CLAUDE.md) and auth.uid() wrapped in a scalar subquery so it's evaluated
-- once per statement, not per row. Idempotent; deletes no data.

begin;

drop policy if exists "Editors and admins can create blocks" on public.blocks;
drop policy if exists "Editors and admins can update blocks" on public.blocks;
drop policy if exists "Editors and admins can delete blocks" on public.blocks;

create policy "Editors and admins can create blocks"
  on public.blocks for insert
  with check (
    exists (
      select 1
      from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = blocks.node_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

create policy "Editors and admins can update blocks"
  on public.blocks for update
  using (
    exists (
      select 1
      from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = blocks.node_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('ADMIN', 'EDITOR')
    )
  )
  with check (
    exists (
      select 1
      from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = blocks.node_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

create policy "Editors and admins can delete blocks"
  on public.blocks for delete
  using (
    exists (
      select 1
      from public.nodes n
      join public.business_members bm on bm.business_id = n.business_id
      where n.id = blocks.node_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('ADMIN', 'EDITOR')
    )
  );

commit;
