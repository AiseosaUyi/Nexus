import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBlocks } from '../../actions';
import NodePageClient from '@/components/dashboard/NodePageClient';

/**
 * Reverse-maps normalized DB block types back to valid Tiptap node types.
 * The DB uses a simplified enum (list, quote, code, divider) while Tiptap
 * needs specific types (bulletList, orderedList, blockquote, codeBlock, etc.).
 */
function dbTypeToTiptapType(dbType: string, content: any): string {
  // If the block content stores the original Tiptap type, use it directly
  if (content?.tiptapType) return content.tiptapType;

  switch (dbType) {
    case 'list': {
      // Ordered lists have a start attribute
      if (content?.attrs?.start !== undefined) return 'orderedList';
      // Task lists have taskItem children
      if (content?.content?.[0]?.type === 'taskItem') return 'taskList';
      // Default to bullet list
      return 'bulletList';
    }
    case 'quote':
      return 'blockquote';
    case 'code':
      return 'codeBlock';
    case 'divider':
      return 'horizontalRule';
    default:
      return dbType;
  }
}

interface NodePageProps {
  params: Promise<{
    workspace_slug: string;
    node_id: string;
  }>;
}

export default async function NodePage({ params }: NodePageProps) {
  const { workspace_slug, node_id } = await params;
  const supabase = await createClient();

  // 1. Fetch Node metadata (including yjs_snapshot)
  const { data: node, error: nodeError } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', node_id)
    .single();

  if (nodeError || !node) {
    redirect(`/w/${workspace_slug}/dashboard`);
  }

  // 2. Fetch User Profile for Presence
  const { data: { user } } = await supabase.auth.getUser();
  // We hard-redirect unauthenticated users earlier in this file, so `user` is
  // guaranteed defined here. Falling back to email-username over an explicit
  // 'Anonymous' string — comments must always carry a real identity.
  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    user?.email ||
    'Workspace member';
  // Simple deterministic color based on user ID
  const userColor = `hsl(${parseInt((user?.id || '0').substring(0, 8), 16) % 360}, 70%, 50%)`;

  // 3. Fetch teamspace and calendar entry for breadcrumb
  let teamspace: { id: string; name: string } | null = null;
  const [teamspaceResult, calendarEntry] = await Promise.all([
    node.teamspace_id 
      ? supabase.from('teamspaces').select('id, name').eq('id', node.teamspace_id).single()
      : Promise.resolve({ data: null }),
    import('../../actions').then(m => m.getCalendarEntryByNodeId(node_id))
  ]);

  if (teamspaceResult.data) teamspace = teamspaceResult.data;

  // 4. Prepare initial content (Snapshots take precedence over blocks in collaboration)
  const blocks = await getBlocks(node_id);
  const initialContent = {
    type: 'doc',
    content: blocks.length > 0
      ? blocks.map(b => ({
          type: dbTypeToTiptapType(b.type, b.content),
          attrs: b.content.attrs || {},
          content: b.content.content || []
        }))
      : [{ type: 'paragraph' }]
  };

  return <NodePageClient
    node={node}
    initialContent={initialContent}
    nodeId={node_id}
    userName={userName}
    userColor={userColor}
    teamspace={teamspace}
    workspaceSlug={workspace_slug}
    isCalendarEntry={!!calendarEntry}
  />;
}
