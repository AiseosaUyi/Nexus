'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import SidebarItem from './SidebarItem';
import SidebarTeamspace from './SidebarTeamspace';
import SearchModal from './SearchModal';
import ImportModal from './ImportModal';
import TeamSettingsModal from '@/components/business/TeamSettingsModal';
import { Node, Teamspace } from '@nexus/api/schema';
import { buildTree } from '@/lib/tree';
import { Plus, Search, Clock, Home, Upload, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createNode, updateNode, createTeamspace } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useRouter } from 'next/navigation';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { useDialog } from '@/components/providers/DialogProvider';

interface SidebarTreeProps {
  initialNodes: Node[];
  initialTeamspaces: Teamspace[];
  businessId: string;
  businessName: string;
  workspaceSlug: string;
  currentUserRole: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export default function SidebarTree({ 
  initialNodes, 
  initialTeamspaces,
  businessId, 
  businessName,
  workspaceSlug,
  currentUserRole
}: SidebarTreeProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [teamspaces, setTeamspaces] = useState<Teamspace[]>(initialTeamspaces);

  // Sync state when the server re-renders with fresh data (e.g. after router.refresh())
  useEffect(() => { setNodes(initialNodes); }, [initialNodes]);
  useEffect(() => { setTeamspaces(initialTeamspaces); }, [initialTeamspaces]);

  // Comment counts are loaded by CommentCountsLoader at the layout level so
  // both the tree AND the page header can read them.

  // Optimistically add newly created nodes (from teamspace/item/modal creation handlers)
  useEffect(() => {
    const handleNodeCreated = (e: CustomEvent<{ node: Node }>) => {
      setNodes(prev => [...prev, e.detail.node]);
    };
    window.addEventListener('nexus:node-created', handleNodeCreated as EventListener);
    return () => window.removeEventListener('nexus:node-created', handleNodeCreated as EventListener);
  }, []);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPrivateCollapsed, setIsPrivateCollapsed] = useState(false);
  const router = useRouter();
  const dialog = useDialog();

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  const handleCreateNode = async (type: 'folder' | 'document', parent_id: string | null = null, teamspace_id: string | null = null) => {
    const result = await createNode({
      business_id: businessId,
      type: type,
      parent_id: parent_id,
      teamspace_id: teamspace_id,
      title: type === 'folder' ? 'New Folder' : 'Untitled',
    });

    if (result.data) {
      setNodes([...nodes, result.data]);
      router.push(`/w/${workspaceSlug}/n/${result.data.id}`);
    } else {
      console.error('Failed to create node:', result.error);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Requires 3px of movement before drag starts (allows snappier clicks)
      },
    })
  );

  // Global Search Shortcut (CMD+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const draggedNodeId = active.id as string;
      const targetNodeId = over.id as string;
      
      const targetNode = nodes.find(n => n.id === targetNodeId);
      
      // Prevent circular nesting (dragging a node into its own descendant)
      let currentParent = targetNode?.parent_id;
      let isCircular = false;
      while (currentParent) {
        if (currentParent === draggedNodeId) {
          isCircular = true;
          break;
        }
        const nextParentNode = nodes.find(n => n.id === currentParent);
        currentParent = nextParentNode?.parent_id;
      }

      if (isCircular) {
        console.warn("Circular nesting prevented.");
        return;
      }
      
      if (targetNode && targetNode.type === 'folder') {
        // Optimistic update
        setNodes((prev) => 
          prev.map(n => n.id === draggedNodeId ? { ...n, parent_id: targetNodeId, teamspace_id: targetNode.teamspace_id } : n)
        );
        
        // Persist
        await updateNode(draggedNodeId, { parent_id: targetNodeId, teamspace_id: targetNode.teamspace_id });
      } else if (over.id.toString().startsWith('teamspace-')) {
         // Moving node to a teamspace root
         const targetTeamspaceId = over.id.toString().replace('teamspace-', '');
         setNodes((prev) => 
           prev.map(n => n.id === draggedNodeId ? { ...n, parent_id: null, teamspace_id: targetTeamspaceId } : n)
         );
         await updateNode(draggedNodeId, { parent_id: null, teamspace_id: targetTeamspaceId });
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col w-full h-full bg-sidebar py-3">
        
        {/* Unified Top Navigation */}
        <div className="px-3 mb-2 space-y-0.5">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-[14px] group"
          >
            <Search className="w-4 h-4 text-foreground/40 group-hover:text-foreground shrink-0" strokeWidth={2} />
            <span className="text-foreground/70 group-hover:text-foreground font-medium">Search</span>
            <kbd className="ml-auto text-[10px] text-foreground/30 group-hover:text-foreground/60 font-mono tracking-widest leading-none">⌘K</kbd>
          </button>
          
          <Link href={`/w/${workspaceSlug}/dashboard`} className="block">
            <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-[14px] group">
              <Home className="w-4 h-4 text-foreground/40 group-hover:text-foreground shrink-0" strokeWidth={2} />
              <span className="text-foreground/70 group-hover:text-foreground font-medium">Home</span>
            </button>
          </Link>

          <Link href={`/w/${workspaceSlug}/updates`} className="block">
            <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-[14px] group">
              <Clock className="w-4 h-4 text-foreground/40 group-hover:text-foreground shrink-0" strokeWidth={2} />
              <span className="text-foreground/70 group-hover:text-foreground font-medium">Updates</span>
            </button>
          </Link>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-[14px] group"
          >
            <Upload className="w-4 h-4 text-foreground/40 group-hover:text-foreground shrink-0" strokeWidth={2} />
            <span className="text-foreground/70 group-hover:text-foreground font-medium">Import</span>
          </button>

        </div>

      {/* Teamspaces Section Header */}
      <div className="flex items-center justify-between px-4 mb-2 group/section mt-6">
          <h4 className="px-2 text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/45 flex items-center gap-1.5 grayscale opacity-60">
            Teamspaces
          </h4>
        <button
          data-testid="add-teamspace-btn"
          onClick={async () => {
            const name = await dialog.prompt({
              title: 'New teamspace',
              description:
                'A teamspace groups related pages — like Marketing or Engineering — so the right people see the right work.',
              placeholder: 'Marketing, Engineering, Ops…',
              confirmLabel: 'Create teamspace',
            });
            if (name) {
              const result = await createTeamspace({ business_id: businessId, name });
              if (result.data) setTeamspaces(prev => [...prev, result.data]);
            }
          }}
          className="opacity-0 group-hover/section:opacity-60 hover:opacity-100 p-0.5 rounded-sm hover:bg-hover transition-all cursor-pointer text-muted"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* Render Teamspaces and their Nodes */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {teamspaces.map((ts) => (
          <SidebarTeamspace 
            key={ts.id} 
            teamspace={ts} 
            workspaceSlug={workspaceSlug}
            nodes={tree.filter(n => n.teamspace_id === ts.id && n.parent_id === null)}
          />
        ))}

        {/* Private / Untracked Nodes */}
        {tree.filter(n => !n.teamspace_id && n.parent_id === null).length > 0 && (
          <div className="mt-8 mb-4">
             <div className="flex items-center justify-between px-6 mb-2 group/private">
                <button
                  onClick={() => setIsPrivateCollapsed(prev => !prev)}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30 hover:text-foreground/50 transition-colors cursor-pointer"
                >
                  Private
                  <ChevronRight
                    className={cn(
                      "w-3 h-3 transition-all duration-200 opacity-0 group-hover/private:opacity-100",
                      !isPrivateCollapsed && "rotate-90"
                    )}
                    strokeWidth={2.5}
                  />
                </button>
                <button
                  onClick={() => handleCreateNode('document')}
                  className="opacity-0 group-hover/private:opacity-60 hover:opacity-100 p-0.5 rounded-sm hover:bg-hover transition-all cursor-pointer text-muted"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
             </div>
             {!isPrivateCollapsed && tree.filter(n => !n.teamspace_id && n.parent_id === null).map((node) => (
                <SidebarItem key={node.id} node={node} />
             ))}
          </div>
        )}

        {teamspaces.length === 0 && tree.length === 0 && (
          <div className="px-4 py-2 text-xs opacity-30 italic select-none">
            No pages yet. Create one to get started.
          </div>
        )}
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        nodes={nodes}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        businessId={businessId}
        workspaceSlug={workspaceSlug}
        teamspaces={teamspaces}
      />
    </div>
    </DndContext>
  );
}
