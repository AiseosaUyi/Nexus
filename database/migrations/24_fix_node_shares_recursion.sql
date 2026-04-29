-- 24_fix_node_shares_recursion.sql
-- Break infinite RLS recursion between nodes <-> node_shares.
--
-- Migration 17 added "Shared users can view nodes" on nodes, which queried
-- node_shares. node_shares' SELECT policy in turn queries nodes (to verify
-- workspace membership), and Postgres applies RLS to that inner query too.
-- Result: every `select from nodes` errors with 42P17 "infinite recursion
-- detected in policy for relation 'nodes'", which silently empties the
-- dashboard for everyone.
--
-- Fix: route the share-membership check through a SECURITY DEFINER helper.
-- SECURITY DEFINER bypasses RLS inside the function body, so the cycle
-- breaks. Same pattern migration 23 used for business_members.

create or replace function public.has_node_share(p_node_id uuid)
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
      and lower(ns.email) = lower(
        coalesce((select email from auth.users where id = auth.uid()), '')
      )
  );
$$;

revoke all on function public.has_node_share(uuid) from public;
grant execute on function public.has_node_share(uuid) to authenticated;

-- Replace the recursive policy with one that calls the helper.
drop policy if exists "Shared users can view nodes" on public.nodes;
create policy "Shared users can view nodes"
  on public.nodes for select
  using (public.has_node_share(id));
