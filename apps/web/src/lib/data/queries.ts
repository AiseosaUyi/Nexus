import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUserBusinesses } from '@/app/(auth)/actions';
import { getUserNodes, getTeamspaces } from '@/app/(dashboard)/w/[workspace_slug]/actions';

/**
 * Request-scoped (React `cache`) read helpers for Server Components.
 * The workspace layout and the page inside it render in the same request,
 * so wrapping these dedupes the identical Supabase round trips they used to
 * make twice (businesses, nodes, teamspaces, auth user).
 *
 * Server Components only — not Server Actions (cache() is a no-op there).
 */

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getUserBusinessesCached = cache(getUserBusinesses);
export const getTreeNodesCached = cache(getUserNodes);
export const getTeamspacesCached = cache(getTeamspaces);

export const getMemberRole = cache(
  async (businessId: string, userId: string): Promise<'ADMIN' | 'EDITOR' | 'VIEWER'> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .maybeSingle();
    const role = data?.role;
    return role === 'ADMIN' || role === 'EDITOR' ? role : 'VIEWER';
  },
);
