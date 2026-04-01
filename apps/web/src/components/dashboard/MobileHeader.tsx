'use client';

import React from 'react';
import { Menu, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface MobileHeaderProps {
  onMenuClick: () => void;
  workspaceName: string;
  workspaceSlug: string;
}

export default function MobileHeader({ onMenuClick, workspaceName, workspaceSlug }: MobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/10 z-40 mobile-safe-top">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-lg hover:bg-hover transition-all cursor-pointer text-foreground/80 focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2 overflow-hidden">
          <Link href={`/w/${workspaceSlug}/dashboard`} className="text-sm font-bold text-foreground/90 truncate max-w-[120px]">
            {workspaceName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
          <span className="text-xs text-muted font-medium truncate">Home</span>
        </div>
      </div>
      
      {/* Optional Right Action (e.g. Search or Profile) */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-sidebar/50 border border-border/20 flex items-center justify-center text-[10px] font-bold text-muted">
          {workspaceName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
