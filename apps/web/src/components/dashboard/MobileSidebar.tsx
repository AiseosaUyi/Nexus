'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import SidebarTree from './SidebarTree';
import { Node, Teamspace } from '@nexus/api/schema';

interface MobileSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialNodes: Node[];
  initialTeamspaces: Teamspace[];
  businessId: string;
  businessName: string;
  workspaceSlug: string;
  currentUserRole: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export default function MobileSidebar({
  isOpen,
  onOpenChange,
  initialNodes,
  initialTeamspaces,
  businessId,
  businessName,
  workspaceSlug,
  currentUserRole
}: MobileSidebarProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />
        <Dialog.Content 
          className="fixed top-0 left-0 bottom-0 w-[280px] bg-sidebar z-[101] shadow-2xl focus:outline-none animate-slide-in-left mobile-safe-bottom"
        >
          <div className="flex flex-col h-full relative">
            <div className="absolute top-4 right-4 z-50">
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-hover rounded-full transition-colors cursor-pointer text-muted focus:outline-none" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            
            <div className="flex-1 overflow-hidden pt-12">
              <SidebarTree
                initialNodes={initialNodes}
                initialTeamspaces={initialTeamspaces}
                businessId={businessId}
                businessName={businessName}
                workspaceSlug={workspaceSlug}
                currentUserRole={currentUserRole}
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
