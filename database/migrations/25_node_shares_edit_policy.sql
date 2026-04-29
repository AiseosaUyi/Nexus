-- 25_node_shares_edit_policy.sql
-- Allow Guests with permission='edit' or 'full' on a node to UPDATE its row.
--
-- Without this, an external invitee with Full Access can open a page but
-- can't actually save changes — `save_yjs_snapshot` runs as `security
-- invoker`, so the underlying nodes UPDATE goes through RLS and the only
-- existing UPDATE policies are workspace-membership-based.
--
-- We reuse the SECURITY DEFINER helper pattern from migrations 23 and 24
-- so the new policy can't trigger node_shares RLS recursion.

create or replace function public.has_node_edit_share(p_node_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.node_shares ns
    where ns.node_id = p_node_id
      and ns.permission in ('edit', 'full')
      and lower(ns.email) = lower(
        coalesce((select email from auth.users where id = auth.uid()), '')
      )
  );
$$;

revoke all on function public.has_node_edit_share(uuid) from public;
grant execute on function public.has_node_edit_share(uuid) to authenticated;

drop policy if exists "Shared editors can update nodes" on public.nodes;
create policy "Shared editors can update nodes"
  on public.nodes for update
  using (public.has_node_edit_share(id))
  with check (public.has_node_edit_share(id));
