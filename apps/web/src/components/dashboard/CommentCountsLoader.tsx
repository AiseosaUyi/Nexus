'use client';

// Wraps the dashboard layout in a CommentCountsProvider populated from
// `getUnresolvedCommentCounts` and kept in sync via a Postgres-Changes
// subscription on comment_threads. Hoisted above both the sidebar tree
// AND the main content area so PageHeader can read counts for the
// currently-open node, not just SidebarItem.

import React, { useEffect, useState } from 'react';
import { CommentCountsProvider } from './CommentCountsContext';
import { createClient } from '@/lib/supabase/client';
import { getUnresolvedCommentCounts } from '@/app/(dashboard)/w/[workspace_slug]/actions';

interface CommentCountsLoaderProps {
  businessId: string | undefined;
  children: React.ReactNode;
}

export default function CommentCountsLoader({ businessId, children }: CommentCountsLoaderProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    const refresh = async () => {
      const next = await getUnresolvedCommentCounts(businessId);
      if (!cancelled) setCounts(next);
    };
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`workspace-comments:${businessId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_threads' },
        () => refresh()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  return <CommentCountsProvider value={counts}>{children}</CommentCountsProvider>;
}
