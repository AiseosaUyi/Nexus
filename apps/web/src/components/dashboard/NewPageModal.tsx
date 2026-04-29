'use client';

import React, { useState, useTransition } from 'react';
import { Lock, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createNode, createTeamspace } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useRouter } from 'next/navigation';
import { Teamspace } from '@nexus/api/schema';

interface NewPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  workspaceSlug: string;
  teamspaces: Teamspace[];
}

export default function NewPageModal({
  isOpen,
  onClose,
  businessId,
  workspaceSlug,
  teamspaces,
}: NewPageModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [isCreatingTeamspace, setIsCreatingTeamspace] = useState(false);
  const [newTeamspaceName, setNewTeamspaceName] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!selected) return;
    startTransition(async () => {
      const teamspace_id = selected === 'private' ? null : selected;
      const result = await createNode({
        business_id: businessId,
        type: 'document',
        title: 'Untitled',
        teamspace_id,
      });
      if (result.data) {
        window.dispatchEvent(new CustomEvent('nexus:node-created', { detail: { node: result.data } }));
        onClose();
        router.push(`/w/${workspaceSlug}/n/${result.data.id}`);
      }
    });
  };

  const handleCreateTeamspace = async () => {
    if (!newTeamspaceName.trim()) return;
    const result = await createTeamspace({
      business_id: businessId,
      name: newTeamspaceName.trim(),
    });
    if (result.data) {
      setSelected(result.data.id);
      setIsCreatingTeamspace(false);
      setNewTeamspaceName('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">New page</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-hover text-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[13px] text-muted mb-4">
          Where do you want to create this page?
        </p>

        <div className="space-y-1.5">
          {/* Private */}
          <button
            onClick={() => setSelected('private')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer text-left',
              selected === 'private'
                ? 'border-cta/40 bg-cta/5 text-foreground'
                : 'border-border hover:bg-hover text-foreground/80'
            )}
          >
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                selected === 'private' ? 'bg-cta/15' : 'bg-foreground/[0.06]'
              )}
            >
              <Lock
                className={cn(
                  'w-3.5 h-3.5',
                  selected === 'private' ? 'text-cta' : 'text-muted'
                )}
              />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold">Private</div>
              <div className="text-[11px] text-muted">Only visible to you</div>
            </div>
            {selected === 'private' && (
              <div className="w-2 h-2 rounded-full bg-cta" />
            )}
          </button>

          {/* Teamspaces */}
          {teamspaces.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 px-1 mb-1.5">
                Teamspaces
              </p>
              {teamspaces.map((ts) => (
                <button
                  key={ts.id}
                  onClick={() => setSelected(ts.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border mb-1 transition-all cursor-pointer text-left',
                    selected === ts.id
                      ? 'border-cta/40 bg-cta/5 text-foreground'
                      : 'border-border hover:bg-hover text-foreground/80'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      selected === ts.id ? 'bg-cta/15' : 'bg-foreground/[0.06]'
                    )}
                  >
                    {ts.icon ? (
                      <span className="text-sm">{ts.icon}</span>
                    ) : (
                      <span
                        className={cn(
                          'text-[10px] font-black',
                          selected === ts.id ? 'text-cta' : 'text-muted'
                        )}
                      >
                        {ts.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] font-semibold flex-1">
                    {ts.name}
                  </span>
                  {selected === ts.id && (
                    <div className="w-2 h-2 rounded-full bg-cta" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* New teamspace inline form */}
          {isCreatingTeamspace ? (
            <div className="flex gap-2 pt-1">
              <input
                autoFocus
                type="text"
                value={newTeamspaceName}
                onChange={(e) => setNewTeamspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTeamspace();
                  if (e.key === 'Escape') setIsCreatingTeamspace(false);
                }}
                placeholder="Teamspace name..."
                className="flex-1 bg-sidebar border border-border rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-muted outline-none focus:border-cta/50 transition-colors"
              />
              <button
                onClick={handleCreateTeamspace}
                className="px-3 py-2 bg-cta text-cta-foreground rounded-lg text-[13px] font-semibold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Create
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingTeamspace(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New teamspace
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-border/50">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-border text-[13px] font-semibold text-muted hover:bg-hover hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selected || isPending}
            className={cn(
              'flex-1 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2',
              selected && !isPending
                ? 'bg-cta text-cta-foreground hover:opacity-90 cursor-pointer'
                : 'bg-foreground/10 text-foreground/30 cursor-not-allowed'
            )}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create page
          </button>
        </div>
      </div>
    </div>
  );
}
