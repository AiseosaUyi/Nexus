import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBlocks } from '../../actions';
import NexusEditor from '@/components/editor/NexusEditor';
import AvatarStack from '@/components/editor/AvatarStack';
import { BlockType } from '@nexus/api/schema';

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
    return notFound();
  }

  // 2. Fetch User Profile for Presence
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous';
  // Simple deterministic color based on user ID
  const userColor = `hsl(${parseInt((user?.id || '0').substring(0, 8), 16) % 360}, 70%, 50%)`;

  // 3. Prepare initial content (Snapshots take precedence over blocks in collaboration)
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

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Page Header (Cover & Title) */}
      <div className="w-full max-w-4xl mx-auto mt-20 px-12 md:px-24 flex justify-between items-end">
        <div className="flex flex-col gap-4 group">
          {node.icon && (
            <span className="text-4xl">{node.icon}</span>
          )}
          <h1 className="text-4xl font-bold text-[#37352f] outline-none border-none bg-transparent w-full">
            {node.title || "Untitled"}
          </h1>
        </div>
        
        {/* Realtime Presence (Avatar Stack) */}
        <div className="flex flex-col items-end gap-1 mb-2">
          <div className="text-[10px] font-semibold text-[#37352f]/30 uppercase tracking-[0.1em]">
            Collaborators
          </div>
          <AvatarStack nodeId={node_id} />
        </div>
      </div>

      {/* Tiptap Editor */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <NexusEditor 
          nodeId={node_id}
          initialContent={initialContent}
          initialSnapshot={node.yjs_snapshot as any}
          userName={userName}
          userColor={userColor}
        />
      </div>
    </div>
  );
}
