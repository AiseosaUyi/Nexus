'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Zap,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Node, Teamspace } from '@nexus/api/schema';
import NewPageModal from './NewPageModal';
import ImportModal from './ImportModal';

interface Props {
  businessId: string;
  workspaceSlug: string;
  teamspaces: Teamspace[];
  recentNodes: Node[];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(dateString: string) {
  const ms = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WorkspaceDashboardClient({
  businessId,
  workspaceSlug,
  teamspaces,
  recentNodes,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isNewPageOpen, setIsNewPageOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const quickActions = [
    {
      icon: Plus,
      label: 'New Page',
      description: 'Start with a blank canvas',
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10 group-hover:bg-blue-500/20',
      onClick: () => setIsNewPageOpen(true),
    },
    {
      icon: Calendar,
      label: 'Calendar',
      description: 'Content calendar & scheduling',
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 group-hover:bg-amber-500/20',
      onClick: () => router.push(`/w/${workspaceSlug}/calendar`),
    },
    {
      icon: Zap,
      label: 'Import Page',
      description: 'Import from Notion or URL',
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
      onClick: () => setIsImportOpen(true),
    },
  ];

  return (
    <>
      <div className="h-full w-full overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-6 py-8 md:py-16 space-y-8 md:space-y-14">

          {/* Greeting */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.45s ease, transform 0.45s ease',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {mounted ? getGreeting() : 'Hello'} 👋
            </h1>
            <p className="text-foreground/50 text-base leading-relaxed mt-2 max-w-lg">
              Your workspace is ready. Pick up where you left off or start something new.
            </p>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.45s ease 0.08s, transform 0.45s ease 0.08s',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 mb-4">
              Quick Actions
            </p>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="group flex flex-col items-start gap-3 p-4 rounded-xl border border-border
                    bg-foreground/[0.02] hover:bg-foreground/[0.05] hover:border-foreground/15
                    transition-all duration-200 cursor-pointer text-left"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${action.iconBg}`}
                  >
                    <action.icon
                      className={`w-4 h-4 ${action.iconColor}`}
                      strokeWidth={1.8}
                    />
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-sm font-semibold text-foreground">
                      {action.label}
                    </div>
                    <div className="text-[11px] text-foreground/40 mt-0.5 leading-relaxed">
                      {action.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Recently Edited */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.45s ease 0.16s, transform 0.45s ease 0.16s',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 mb-4">
              Recently Edited
            </p>

            {recentNodes.length === 0 ? (
              <div className="py-10 text-center text-foreground/30 text-sm italic">
                No pages yet. Create one above to get started.
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentNodes.map((node, i) => (
                  <Link
                    key={node.id}
                    href={`/w/${workspaceSlug}/n/${node.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg
                      hover:bg-foreground/[0.05] transition-colors duration-150 group"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transition: `opacity 0.4s ease ${0.2 + i * 0.05}s`,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base leading-none select-none shrink-0">
                        {node.icon ?? '📄'}
                      </span>
                      <span className="text-sm font-medium text-foreground truncate">
                        {node.title || 'Untitled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-foreground/35 shrink-0 ml-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" strokeWidth={1.5} />
                        {formatRelativeTime(node.updated_at)}
                      </span>
                      <ArrowRight
                        className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        strokeWidth={1.5}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Tip */}
          <div
            className="relative overflow-hidden rounded-2xl border border-border bg-foreground/[0.02] p-5"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.45s ease 0.36s, transform 0.45s ease 0.36s',
            }}
          >
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-5xl opacity-[0.06] select-none pointer-events-none">
              ⚡
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Pro Tip</p>
            <p className="text-sm text-foreground/50 leading-relaxed">
              Press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/70 text-xs font-mono">
                ⌘K
              </kbd>{' '}
              anywhere to search across all your documents instantly.
            </p>
          </div>

        </div>
      </div>

      <NewPageModal
        isOpen={isNewPageOpen}
        onClose={() => setIsNewPageOpen(false)}
        businessId={businessId}
        workspaceSlug={workspaceSlug}
        teamspaces={teamspaces}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        businessId={businessId}
        workspaceSlug={workspaceSlug}
        teamspaces={teamspaces}
      />
    </>
  );
}
