'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, Settings, ChevronUp } from 'lucide-react';
import { signOut } from '@/app/(auth)/actions';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTransition } from 'react';

interface UserMenuProps {
  userName: string;
  userEmail: string;
  avatarColor: string;
}

export default function UserMenu({ userName, userEmail, avatarColor }: UserMenuProps) {
  const params = useParams();
  const workspaceSlug = params?.workspace_slug as string;
  const initial = userName.charAt(0).toUpperCase();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="px-2 pt-2 pb-1 border-t border-border">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer group outline-none">
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 select-none"
              style={{ backgroundColor: avatarColor }}
            >
              {initial}
            </div>

            {/* Name + email */}
            <div className="flex-1 overflow-hidden text-left">
              <p className="text-[13px] font-semibold text-foreground/90 group-hover:text-foreground truncate leading-none mb-0.5">
                {userName}
              </p>
              <p className="text-[11px] text-muted/70 truncate leading-none">
                {userEmail}
              </p>
            </div>

            <ChevronUp className="w-3.5 h-3.5 text-muted/60 group-hover:text-muted shrink-0 transition-colors" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="w-64 bg-background border border-border rounded-lg shadow-popover p-1 z-[200] animate-in fade-in zoom-in-95 duration-100"
            side="top"
            align="start"
            sideOffset={6}
          >
            {/* User info header */}
            <div className="px-2.5 py-2 mb-1">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black text-white shrink-0 select-none"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initial}
                </div>
                <div className="overflow-hidden">
                  <p className="text-[13px] font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-[11px] text-muted/70 truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            <DropdownMenu.Separator className="h-px bg-border mx-1 mb-1" />

            <Link href={`/w/${workspaceSlug}/settings`}>
              <DropdownMenu.Item className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer hover:bg-hover outline-none text-foreground/70 hover:text-foreground">
                <Settings className="w-3.5 h-3.5" strokeWidth={1.8} />
                Settings
              </DropdownMenu.Item>
            </Link>

            <DropdownMenu.Separator className="h-px bg-border mx-1 my-1" />

            {/* Sign Out */}
            <DropdownMenu.Item
              onSelect={() => startTransition(() => signOut())}
              disabled={isPending}
              className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-md cursor-pointer hover:bg-red-500/10 outline-none text-red-400 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
              {isPending ? 'Signing out…' : 'Sign out'}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
