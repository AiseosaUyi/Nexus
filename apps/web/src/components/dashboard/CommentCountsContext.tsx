'use client';

// Maps nodeId → unresolved comment count. Read by SidebarItem to render
// a small badge so users see at a glance which pages have open discussions.

import { createContext, useContext } from 'react';

const CommentCountsContext = createContext<Record<string, number>>({});

export function CommentCountsProvider({
  value,
  children,
}: {
  value: Record<string, number>;
  children: React.ReactNode;
}) {
  return (
    <CommentCountsContext.Provider value={value}>{children}</CommentCountsContext.Provider>
  );
}

export function useCommentCount(nodeId: string): number {
  const counts = useContext(CommentCountsContext);
  return counts[nodeId] ?? 0;
}
