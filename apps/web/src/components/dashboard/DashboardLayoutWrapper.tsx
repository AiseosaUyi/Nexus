'use client';

import React, { useState } from 'react';
import MobileHeader from './MobileHeader';
import MobileSidebar from './MobileSidebar';
import BusinessSwitcher from '@/components/business/BusinessSwitcher';
import SidebarTree from './SidebarTree';
import NavigationProgress from './NavigationProgress';
import { Node, Teamspace } from '@nexus/api/schema';

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
  initialNodes: Node[];
  initialTeamspaces: Teamspace[];
  initialBusinesses: any[];
  activeBusiness: any;
  workspaceSlug: string;
  currentUserRole: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export default function DashboardLayoutWrapper({
  children,
  initialNodes,
  initialTeamspaces,
  initialBusinesses,
  activeBusiness,
  workspaceSlug,
  currentUserRole
}: DashboardLayoutWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background text-foreground font-sans selection:bg-accent/30 overflow-hidden">
      <NavigationProgress />
      
      {/* Mobile-only Header */}
      <MobileHeader 
        onMenuClick={() => setIsMobileMenuOpen(true)}
        workspaceName={activeBusiness?.name || "Workspace"}
        workspaceSlug={workspaceSlug}
      />

      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside className="hidden md:flex w-64 h-full bg-sidebar flex-col border-r border-border group/sidebar shrink-0">
        <BusinessSwitcher initialBusinesses={initialBusinesses} />
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
          <SidebarTree
            initialNodes={initialNodes}
            initialTeamspaces={initialTeamspaces}
            businessId={activeBusiness?.id}
            businessName={activeBusiness?.name || "Workspace"}
            workspaceSlug={workspaceSlug}
            currentUserRole={currentUserRole}
          />
        </div>
      </aside>

      {/* Mobile-only Sidebar Drawer */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
        initialNodes={initialNodes}
        initialTeamspaces={initialTeamspaces}
        businessId={activeBusiness?.id}
        businessName={activeBusiness?.name || "Workspace"}
        workspaceSlug={workspaceSlug}
        currentUserRole={currentUserRole}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-background flex flex-col w-full h-full">
        {children}
      </main>
    </div>
  );
}
