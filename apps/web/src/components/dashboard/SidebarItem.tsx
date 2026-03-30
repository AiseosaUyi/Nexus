'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  ChevronRight, 
  Plus, 
  MoreHorizontal, 
  Folder, 
  Trash2, 
  Edit2,
  Calendar,
  Settings,
  Search,
  Clock
} from 'lucide-react';
import { Node } from '@nexus/api/schema';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { deleteNode, updateNode } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface SidebarItemProps {
  node: Node & { children?: Node[] };
  level?: number;
}

export default function SidebarItem({ node, level = 0 }: SidebarItemProps) {
  const params = useParams();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const workspace_slug = params?.workspace_slug as string;
  const active_id = params?.node_id as string;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: node.id,
  });

  const setRefs = (el: HTMLElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  const isFolder = node.type === 'folder';
  const isActive = active_id === node.id;
  const Icon = isFolder ? Folder : FileText;
  const nodeIcon = node.icon;

  const onToggle = () => {
    if (isFolder) {
      setIsExpanded(!isExpanded);
    }
  };

  const onRename = async (newTitle: string) => {
    setIsEditing(false);
    if (!newTitle || newTitle === node.title) return;
    await updateNode(node.id, { title: newTitle });
    router.refresh();
  };

  const onDelete = async () => {
    await deleteNode(node.id);
    router.refresh();
  };

  const handleAddChild = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // In a real app, this would call the creation action
    // For now, we'll just navigate to the parent
    router.push(`/w/${workspace_slug}/dashboard`);
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div 
          ref={setRefs}
          className={cn(
            "w-full outline-none transition-opacity",
            isDragging && "opacity-50",
            isOver && isFolder && "ring-1 ring-accent bg-accent/5 rounded-sm"
          )}
        >
          <div
            className={cn(
              "group flex items-center w-full min-h-[28px] py-[3px] pr-2 hover:bg-hover rounded-sm transition-colors cursor-pointer outline-none text-[14px] select-none",
              isActive && "bg-active font-medium text-foreground"
            )}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
          >
            {/* Expand/Collapse Chevron */}
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
              }}
              className="w-5 h-5 flex items-center justify-center hover:bg-foreground/5 rounded-sm transition-colors text-muted hover:text-foreground shrink-0"
            >
              {isFolder && (
                <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-200", isExpanded && "rotate-90")} strokeWidth={2.5} />
              )}
            </div>

            <div 
              {...listeners}
              {...attributes}
              className="w-5 h-5 flex items-center justify-center text-muted group-hover:text-foreground shrink-0 cursor-grab active:cursor-grabbing mr-1"
            >
              {nodeIcon ? (
                <span className="text-base leading-none translate-y-[-1px]">{nodeIcon}</span>
              ) : (
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              )}
            </div>

            {/* Page Title Link */}
            <Link
              href={`/w/${workspace_slug}/n/${node.id}`}
              onClick={(e) => isEditing && e.preventDefault()}
              className="flex-1 truncate text-foreground/80 group-hover:text-foreground outline-none"
            >
              {isEditing ? (
                <input
                  autoFocus
                  className="bg-transparent outline-none w-full"
                  defaultValue={node.title}
                  onBlur={(e) => onRename(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onRename(e.currentTarget.value)}
                />
              ) : (
                <span>{node.title || (isFolder ? 'Untitled Folder' : 'Untitled')}</span>
              )}
            </Link>

            {/* Hover Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={handleAddChild}
                className="w-5 h-5 flex items-center justify-center hover:bg-foreground/10 rounded-sm text-muted hover:text-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button className="w-5 h-5 flex items-center justify-center hover:bg-foreground/10 rounded-sm text-muted hover:text-foreground transition-colors">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recursive Children Rendering */}
          {isExpanded && node.children && (
            <div className="flex flex-col">
              {node.children.map((child) => (
                <SidebarItem key={child.id} node={child} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[160px] bg-background border border-border rounded-md shadow-popover p-1 z-[100] animate-in fade-in zoom-in-95 duration-100">
          <ContextMenu.Item 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-hover rounded-sm text-foreground/80"
          >
            <Edit2 className="w-3.5 h-3.5" /> Rename
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-px bg-border my-1" />
          <ContextMenu.Item 
            onClick={onDelete}
            className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-red-500/10 text-red-500 rounded-sm"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
