-- 32_fix_businesses_select_rls.sql
-- Fixes a real, pre-existing bug in 02_businesses.sql's SELECT policy on
-- `businesses`, found while verifying the Nexus Brain MCP OAuth consent
-- screen against a local Supabase instance.
--
-- The original policy:
--
--   create policy "Members can view their business"
--     on public.businesses for select
--     using (
--       exists (
--         select 1 from public.business_members bm
--         where bm.business_id = id
--           and bm.user_id = auth.uid()
--       )
--     );
--
-- intends `id` to correlate to the outer `businesses.id` (the row being
-- tested). But `business_members` ALSO has its own `id` primary key column,
-- and it is the innermost FROM in the correlated subquery, so per SQL name
-- resolution the unqualified `id` binds to `bm.id`, not `businesses.id`.
-- The policy actually evaluates `bm.business_id = bm.id` — comparing a
-- membership row's own primary key to its business_id column, which is
-- essentially never true. Net effect: NO ONE (not even a business's owner)
-- can see a `businesses` row through this policy. Any code path using the
-- RLS-bound client (createClient(), not createServiceClient()) to read
-- `businesses` directly, or to embed `businesses(...)` through
-- `business_members`, silently gets nothing back — e.g.
-- `getUserBusinesses()` in `(auth)/actions.ts` and the OAuth consent page's
-- admin-workspace lookup.
--
-- Fix: qualify the correlation explicitly against the table the policy is
-- defined on.

drop policy if exists "Members can view their business" on public.businesses;

create policy "Members can view their business"
  on public.businesses for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = businesses.id
        and bm.user_id = auth.uid()
    )
  );
