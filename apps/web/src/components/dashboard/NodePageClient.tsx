'use client';

import React from 'react';
import PageHeader from './PageHeader';
import CommentSidebar from './CommentSidebar';
import PageImportModal from './PageImportModal';
import NexusEditor from '../editor/NexusEditor';
import type { Node } from '@nexus/api/schema';

interface NodePageClientProps {
  node: Node;
  initialContent: Record<string, unknown>;
  nodeId: string;
  userName: string;
  userColor: string;
  teamspace?: { id: string; name: string } | null;
  workspaceSlug?: string;
  isCalendarEntry?: boolean;
}

export default function NodePageClient({ node, initialContent, nodeId, userName, userColor, teamspace, workspaceSlug, isCalendarEntry }: NodePageClientProps) {
  const [isCommentSidebarOpen, setIsCommentSidebarOpen] = React.useState(false);
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpen = (e: CustomEvent<{ threadId: string }>) => {
      setActiveThreadId(e.detail.threadId);
      setIsCommentSidebarOpen(true);
    };
    window.addEventListener('nexus:open-comment', handleOpen as EventListener);
    return () => window.removeEventListener('nexus:open-comment', handleOpen as EventListener);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden selection:bg-accent/30 relative">
      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Page Header (Cover & Title & Props) */}
        <PageHeader
          title={node.title || "Untitled"}
          icon={node.icon}
          nodeId={nodeId}
          isNameCustom={node.is_name_custom}
          isPublic={node.is_public}
          onOpenComments={() => setIsCommentSidebarOpen(true)}
          onImport={() => setIsImportOpen(true)}
          teamspace={teamspace}
          workspaceSlug={workspaceSlug}
          isCalendarEntry={isCalendarEntry}
        />
        
        {/* Tiptap Editor */}
        <div className="w-full max-w-4xl mx-auto px-12 md:px-24">
          <NexusEditor 
            nodeId={nodeId}
            initialContent={initialContent}
            initialSnapshot={node.yjs_snapshot as any}
            userName={userName}
            userColor={userColor}
          />
        </div>
      </div>

      <CommentSidebar
        nodeId={nodeId}
        isOpen={isCommentSidebarOpen}
        onClose={() => setIsCommentSidebarOpen(false)}
        activeThreadId={activeThreadId}
        onSelectThread={setActiveThreadId}
      />

      <PageImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        nodeId={nodeId}
      />
    </div>
  );
}
