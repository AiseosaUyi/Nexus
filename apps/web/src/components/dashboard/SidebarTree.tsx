'use client';

import React, { useMemo, useState } from 'react';
import SidebarItem from './SidebarItem';
import { Node, NodeWithChildren } from '@nexus/api/schema';
import { buildTree } from '@/lib/tree';
import { Plus } from 'lucide-react';
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
        distance: 5, // Requires 5px of movement before drag starts (allows clicks)
      },
    })
  );

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
      <div className="flex flex-col w-full h-full">

      {/* Private Section Heading */}
      <div className="flex items-center justify-between px-2 mb-1 group/section">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#37352f]/40">Private</h4>
        <button 
          onClick={() => handleCreateNode('document')}
          className="opacity-0 group-hover/section:opacity-40 hover:opacity-100 p-0.5 rounded-sm hover:bg-foreground/5 transition-opacity cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
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
      <div className="px-2 py-2 mt-auto border-t border-[#37352f]/5">
        <button 
          onClick={() => handleCreateNode('document')}
          className="flex items-center gap-2 w-full p-1.5 hover:bg-foreground/5 rounded-md transition-colors cursor-pointer outline-none text-sm group"
        >
          <Plus className="w-4 h-4 opacity-40 shrink-0 group-hover:opacity-100 transition-opacity" />
          <span className="opacity-70 group-hover:opacity-100">New Page</span>
        </button>
      </div>
    </div>
    </DndContext>
  );
}
