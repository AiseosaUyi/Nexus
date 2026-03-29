'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  MoreHorizontal, 
  FileText, 
  Folder, 
  Calendar,
  Trash2,
  Edit2,
  Copy,
  ExternalLink
} from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { NodeWithChildren } from '@nexus/api/schema';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { updateNode, deleteNode, createNode, duplicateNode } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface SidebarItemProps {
  node: NodeWithChildren;
  level?: number;
}

export default function SidebarItem({ node, level = 0 }: SidebarItemProps) {
  const params = useParams();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(node.title || "");
  const inputRef = useRef<HTMLInputElement>(null);
  
  const workspace_slug = params?.workspace_slug as string;
  const active_id = params?.node_id as string;
  
  const isActive = active_id === node.id;
  const isFolder = node.type === 'folder';
  const hasChildren = node.children && node.children.length > 0;

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: node.id,
    data: { node }
  });

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: node.id,
    data: { isFolder }
  });

  const setRefs = (element: HTMLElement | null) => {
    setDraggableRef(element);
    setDroppableRef(element);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleRename = async () => {
    if (title === node.title) {
      setIsEditing(false);
      return;
    }

    const { data, error } = await updateNode(node.id, { title });
    if (error) {
      setTitle(node.title || "");
      console.error("Failed to rename node:", error);
    }
    setIsEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setTitle(node.title || "");
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    const { success, error } = await deleteNode(node.id);
    if (success) {
      router.refresh(); // Or handle optimistically if SidebarTree manages state
    } else {
      console.error("Failed to delete node:", error);
    }
  };

  const handleDuplicate = async () => {
    const { data, error } = await duplicateNode(node.id);
    if (data) {
      router.push(`/w/${workspace_slug}/n/${data.id}`);
    } else {
      console.error("Failed to duplicate node:", error);
    }
  };

  const handleAddChild = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsExpanded(true);
    const { data, error } = await createNode({
      business_id: node.business_id,
      type: 'document',
      parent_id: node.id,
      title: 'Untitled',
    });

    if (data) {
      router.push(`/w/${workspace_slug}/n/${data.id}`);
    } else {
      console.error("Failed to add child node:", error);
    }
  };

  const Icon = node.type === 'folder' ? Folder : node.type === 'calendar' ? Calendar : FileText;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div 
          ref={setRefs}
          {...listeners}
          {...attributes}
          className={cn(
            "w-full outline-none",
            isDragging && "opacity-50",
            isOver && isFolder && "ring-1 ring-[#2383e2] bg-[#2383e2]/5 rounded-sm"
          )}
        >
          <Link
            href={`/w/${workspace_slug}/n/${node.id}`}
            onClick={(e) => isEditing && e.preventDefault()}
            className={cn(
              "group flex items-center w-full min-h-[27px] py-[3px] pr-2 hover:bg-foreground/5 rounded-sm transition-colors cursor-pointer outline-none text-[14px] select-none",
              isActive && "bg-foreground/5 font-medium text-[#37352f]"
            )}
            style={{ paddingLeft: `${level * 12 + 4}px` }}
          >
            {/* Expand/Collapse Chevron */}
            <div 
              onClick={toggleExpand}
              className={cn(
                "p-0.5 rounded-sm hover:bg-foreground/10 transition-colors mr-0.5",
                !isFolder && !hasChildren && "invisible"
              )}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 opacity-40 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
              )}
            </div>

            {/* Node Icon */}
            <div className="mr-2 shrink-0">
              {node.icon ? (
                <span className="text-base leading-none">{node.icon}</span>
              ) : (
                <Icon className={cn(
                  "w-4 h-4 opacity-40 shrink-0",
                  isActive && "opacity-100 text-[#2383e2]"
                )} />
              )}
            </div>

            {/* Node Title / Input */}
            {isEditing ? (
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={onKeyDown}
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 m-0 w-full"
              />
            ) : (
              <span className={cn(
                "truncate flex-1 opacity-70 group-hover:opacity-100",
                isActive && "opacity-100"
              )}>
                {node.title || "Untitled"}
              </span>
            )}

            {/* Action Buttons (Hover Only) */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-60 transition-opacity">
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="p-0.5 rounded-sm hover:bg-foreground/10 transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleAddChild}
                className="p-0.5 rounded-sm hover:bg-foreground/10 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </Link>

          {/* Recursive Children */}
          {isExpanded && node.children && (
            <div className="flex flex-col">
              {node.children.length === 0 ? (
                <div 
                  className="py-1 opacity-30 text-[12px] italic select-none"
                  style={{ paddingLeft: `${(level + 1) * 12 + 24}px` }}
                >
                  No pages inside
                </div>
              ) : (
                node.children.map((child) => (
                  <SidebarItem key={child.id} node={child} level={level + 1} />
                ))
              )}
            </div>
          )}
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[160px] bg-white rounded-md overflow-hidden p-1 shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] border border-[#37352f]/10 z-[100]">
          <ContextMenu.Item 
            onSelect={() => setIsEditing(true)}
            className="group text-[13px] leading-none text-[#37352f] rounded-[3px] flex items-center h-[28px] px-[8px] relative select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-[#2383e2] data-[highlighted]:text-white cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 mr-2 opacity-50 group-data-[highlighted]:opacity-100" />
            Rename
            <div className="ml-auto pl-[20px] text-[10px] opacity-40 group-data-[highlighted]:text-white">F2</div>
          </ContextMenu.Item>
          <ContextMenu.Item 
            onSelect={handleDuplicate}
            className="group text-[13px] leading-none text-[#37352f] rounded-[3px] flex items-center h-[28px] px-[8px] relative select-none outline-none data-[highlighted]:bg-[#2383e2] data-[highlighted]:text-white cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 mr-2 opacity-50 group-data-[highlighted]:opacity-100" />
            Duplicate
            <div className="ml-auto pl-[20px] text-[10px] opacity-40 group-data-[highlighted]:text-white">⌘D</div>
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-[1px] bg-[#37352f]/5 m-[5px]" />
          <ContextMenu.Item className="group text-[13px] leading-none text-[#37352f] rounded-[3px] flex items-center h-[28px] px-[8px] relative select-none outline-none data-[highlighted]:bg-[#2383e2] data-[highlighted]:text-white cursor-pointer">
            <ExternalLink className="w-3.5 h-3.5 mr-2 opacity-50 group-data-[highlighted]:opacity-100" />
            Copy Link
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-[1px] bg-[#37352f]/5 m-[5px]" />
          <ContextMenu.Item 
            onSelect={handleDelete}
            className="group text-[13px] leading-none text-red-600 rounded-[3px] flex items-center h-[28px] px-[8px] relative select-none outline-none data-[highlighted]:bg-red-600 data-[highlighted]:text-white cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2 opacity-50 group-data-[highlighted]:opacity-100" />
            Delete
            <div className="ml-auto pl-[20px] text-[10px] opacity-40 group-data-[highlighted]:text-white">⌫</div>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
