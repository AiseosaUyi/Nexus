"use client";

import { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronsUpDown, Check, Plus, Settings, Building2 } from "lucide-react";
import { Business } from "@nexus/api";
import CreateBusinessModal from "./CreateBusinessModal";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface BusinessSwitcherProps {
  initialBusinesses: Business[];
}

export default function BusinessSwitcher({ initialBusinesses }: BusinessSwitcherProps) {
  const params = useParams();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  
  // Find the active business based on the URL slug
  const activeBusiness = businesses.find(b => b.slug === params.workspace_slug) || businesses[0];

  const onBusinessSelect = (business: Business) => {
    router.push(`/w/${business.slug}/dashboard`);
  };

  return (
    <div className="px-2 py-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center justify-between w-full gap-2 p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer group outline-none">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-5 h-5 bg-foreground/10 rounded-sm flex items-center justify-center text-[10px] font-bold uppercase tracking-widest shrink-0 text-foreground/60">
                {activeBusiness?.name?.[0] || <Building2 className="w-3 h-3" />}
              </div>
              <span className="text-[14px] font-semibold truncate text-foreground/90 group-hover:text-foreground">
                {activeBusiness?.name || "Select Workspace"}
              </span>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-muted group-hover:text-foreground/60 shrink-0" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content 
            className="w-64 bg-background rounded-lg shadow-popover border border-border p-1 z-50 animate-in fade-in zoom-in-95" 
            align="start" 
            sideOffset={4}
          >
            <div className="px-2 py-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Workspaces
              </span>
            </div>

            <div className="space-y-0.5">
              {businesses.map((business) => (
                <DropdownMenu.Item
                  key={business.id}
                  onSelect={() => onBusinessSelect(business)}
                  className="flex items-center justify-between px-2 py-1.5 text-[13px] rounded-md cursor-pointer hover:bg-hover outline-none group"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-5 h-5 bg-foreground/10 rounded-sm flex items-center justify-center text-[8px] font-bold uppercase tracking-widest shrink-0 text-foreground/60">
                      {business.name[0]}
                    </div>
                    <span className="truncate text-foreground/80 group-hover:text-foreground">{business.name}</span>
                  </div>
                  {activeBusiness?.id === business.id && (
                    <Check className="w-3.5 h-3.5 text-accent" />
                  )}
                </DropdownMenu.Item>
              ))}
            </div>

            <DropdownMenu.Separator className="h-px bg-border my-1" />

            <CreateBusinessModal 
              trigger={
                <DropdownMenu.Item 
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md cursor-pointer hover:bg-hover outline-none text-muted hover:text-foreground"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  Add another workspace
                </DropdownMenu.Item>
              }
            />
            
            <DropdownMenu.Item className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md cursor-pointer hover:bg-hover outline-none text-muted hover:text-foreground">
              <Settings className="w-3.5 h-3.5" strokeWidth={2} />
              Settings
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
