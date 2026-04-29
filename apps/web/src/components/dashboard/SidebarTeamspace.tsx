'use client';

import React, { useState } from 'react';
import { ChevronRight, Plus, MoreHorizontal, Edit2, Copy, Trash2 } from 'lucide-react';
import { Node, Teamspace } from '@nexus/api/schema';
import { cn } from '@/lib/utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import SidebarItem from './SidebarItem';
import { createNode, createTeamspace, updateTeamspace, deleteTeamspace } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/components/providers/DialogProvider';

interface SidebarTeamspaceProps {
  teamspace: Teamspace;
  nodes: Node[];
  workspaceSlug: string;
}

export default function SidebarTeamspace({
  teamspace,
  nodes,
  workspaceSlug
}: SidebarTeamspaceProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const router = useRouter();
  const dialog = useDialog();

  const handleCreatePage = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await createNode({
      business_id: teamspace.business_id,
      type: 'document',
      teamspace_id: teamspace.id,
      title: 'Untitled',
    });
    if (result.data) {
      window.dispatchEvent(new CustomEvent('nexus:node-created', { detail: { node: result.data } }));
      router.push(`/w/${workspaceSlug}/n/${result.data.id}`);
    }
  };

  const handleRename = async () => {
    const newName = await dialog.prompt({
      title: 'Rename teamspace',
      description: 'Pick a name your team will recognize at a glance.',
      placeholder: 'Marketing, Engineering, Ops…',
      defaultValue: teamspace.name,
      confirmLabel: 'Rename',
    });
    if (newName && newName !== teamspace.name) {
      await updateTeamspace(teamspace.id, { name: newName });
      router.refresh();
    }
  };

  const handleDuplicate = async () => {
    await createTeamspace({
      business_id: teamspace.business_id,
      name: `${teamspace.name} (Copy)`,
      icon: teamspace.icon ?? undefined,
    });
    router.refresh();
  };

  const handleDelete = async () => {
    const ok = await dialog.confirm({
      title: `Delete "${teamspace.name}"?`,
      description:
        'Every page in this teamspace will be removed for everyone. This can’t be undone.',
      confirmLabel: 'Delete teamspace',
      cancelLabel: 'Keep it',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteTeamspace(teamspace.id);
    router.refresh();
  };

  return (
    <div className="flex flex-col mb-1 group/section">
      {/* Teamspace Header */}
      <div className="flex items-center justify-between px-3 py-0.5 hover:bg-hover rounded-md transition-colors cursor-pointer group/header">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <div className="w-4 h-4 flex items-center justify-center rounded-sm transition-colors text-muted hover:text-foreground shrink-0">
            <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", isExpanded && "rotate-90")} strokeWidth={2.5} />
          </div>

          <div className="flex items-center gap-1.5 flex-1 truncate">
            {teamspace.icon ? (
              <span className="text-sm">{teamspace.icon}</span>
            ) : (
              <div className="w-4 h-4 bg-cta/10 rounded-sm flex items-center justify-center text-cta font-bold text-[9px]">
                {teamspace.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[11px] font-bold text-foreground/60 group-hover/header:text-foreground truncate tracking-[0.06em] uppercase">
              {teamspace.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="w-5 h-5 flex items-center justify-center hover:bg-foreground/10 rounded-sm text-muted hover:text-foreground transition-colors">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-[160px] bg-background border border-border rounded-lg shadow-popover p-1 z-[110] animate-in fade-in zoom-in-95 duration-100 outline-none">
                <DropdownMenu.Item
                  onSelect={handleRename}
                  className="flex items-center gap-2 px-2 py-1.5 text-[13px] outline-none cursor-pointer hover:bg-hover rounded text-foreground/80"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit name
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={handleDuplicate}
                  className="flex items-center gap-2 px-2 py-1.5 text-[13px] outline-none cursor-pointer hover:bg-hover rounded text-foreground/80"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-border my-1" />
                <DropdownMenu.Item
                  onSelect={handleDelete}
                  className="flex items-center gap-2 px-2 py-1.5 text-[13px] outline-none cursor-pointer hover:bg-red-500/10 rounded text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <button
            onClick={handleCreatePage}
            className="w-5 h-5 flex items-center justify-center hover:bg-foreground/10 rounded-sm text-muted hover:text-foreground transition-colors"
            title="New Page"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Nodes in this Teamspace */}
      {isExpanded && (
        <div className="flex flex-col">
          {nodes.length === 0 ? (
            <div className="px-9 py-1 text-[12px] opacity-40 italic select-none">
              No pages yet
            </div>
          ) : (
            nodes.map((node) => (
              <SidebarItem key={node.id} node={node} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
