import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBlocks } from '../../actions';
import NodePageClient from '@/components/dashboard/NodePageClient';

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
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous';
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
          type: b.type,
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
