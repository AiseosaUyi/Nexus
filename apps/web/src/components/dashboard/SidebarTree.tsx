'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import SidebarItem from './SidebarItem';
import SearchModal from './SearchModal';
import { Node, NodeWithChildren } from '@nexus/api/schema';
import { buildTree } from '@/lib/tree';
import { Plus, Search, Clock, Settings, Home, Sparkles } from 'lucide-react';
import { createNode, updateNode } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useRouter } from 'next/navigation';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';

interface SidebarTreeProps {
  initialNodes: Node[];
  businessId: string;
  workspaceSlug: string;
}

export default function SidebarTree({ 
  initialNodes, 
  businessId, 
  workspaceSlug 
}: SidebarTreeProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  const handleCreateNode = async (type: 'folder' | 'document', parent_id: string | null = null) => {
    const result = await createNode({
      business_id: businessId,
      type: type,
      parent_id: parent_id,
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
          prev.map(n => n.id === draggedNodeId ? { ...n, parent_id: targetNodeId } : n)
        );
        
        // Persist
        await updateNode(draggedNodeId, { parent_id: targetNodeId });
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col w-full h-full bg-sidebar py-3">
        
        {/* Top Navigation & Workspace Controls */}
        <div className="px-3 mb-6 space-y-0.5">
          <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-sm group">
            <div className="w-5 h-5 bg-cta/10 rounded-sm flex items-center justify-center text-cta font-bold text-[10px]">W</div>
            <span className="text-foreground font-bold truncate">Workspace</span>
          </button>
          
          <div className="h-2" />
          
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-sm group"
          >
            <Search className="w-4 h-4 text-muted group-hover:text-foreground" />
            <span className="text-muted group-hover:text-foreground transition-colors">Search</span>
            <kbd className="ml-auto text-[10px] bg-muted/10 px-1 rounded opacity-50">⌘K</kbd>
          </button>
          
          <Link href={`/w/${workspaceSlug}/dashboard`}>
            <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-sm group">
              <Home className="w-4 h-4 text-muted group-hover:text-foreground" />
              <span className="text-muted group-hover:text-foreground transition-colors">Home</span>
            </button>
          </Link>

          <Link href={`/w/${workspaceSlug}/updates`}>
            <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-sm group">
              <Clock className="w-4 h-4 text-muted group-hover:text-foreground" />
              <span className="text-muted group-hover:text-foreground transition-colors">Updates</span>
            </button>
          </Link>

          <Link href={`/w/${workspaceSlug}/settings`}>
            <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-sm group">
              <Settings className="w-4 h-4 text-muted group-hover:text-foreground" />
              <span className="text-muted group-hover:text-foreground transition-colors">Settings</span>
            </button>
          </Link>
          
          <button 
            onClick={() => handleCreateNode('document')}
            className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-sm group mt-4 border border-border/5 bg-background shadow-xs"
          >
            <Plus className="w-4 h-4 text-cta" strokeWidth={2.5} />
            <span className="text-foreground font-semibold">New Page</span>
          </button>
        </div>

      {/* Private Section Heading */}
      <div className="flex items-center justify-between px-4 mb-1 group/section mt-2">
          <h4 className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50 mb-2">Favorites</h4>
        <button 
          onClick={() => handleCreateNode('document')}
          className="opacity-0 group-hover/section:opacity-60 hover:opacity-100 p-0.5 rounded-sm hover:bg-hover transition-all cursor-pointer text-muted"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* List of active nodes */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tree.length === 0 ? (
          <div className="px-4 py-2 text-xs opacity-30 italic select-none">
            No pages yet. Create one to get started.
          </div>
        ) : (
          tree.map((node) => (
            <SidebarItem key={node.id} node={node} />
          ))
        )}
      </div>

      {/* Footer Shortcut to create a new page */}
      <div className="px-2 py-2 mt-auto border-t border-border">
        <button 
          onClick={() => handleCreateNode('document')}
          className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-sm group"
        >
          <Plus className="w-4 h-4 text-muted shrink-0 group-hover:text-foreground transition-all" strokeWidth={2} />
          <span className="text-foreground/70 group-hover:text-foreground">New Page</span>
        </button>
      </div>
      
      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        nodes={nodes} 
      />
    </div>
    </DndContext>
  );
}
