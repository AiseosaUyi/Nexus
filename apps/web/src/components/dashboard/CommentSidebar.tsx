'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  Send,
  Pencil,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addComment,
  getCommentsForNode,
  resolveThread,
  editComment,
} from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { createClient } from '@/lib/supabase/client';
import CommentBody from './CommentBody';
import CommentComposer, { type CommentComposerHandle } from '../editor/CommentComposer';

interface CommentSidebarProps {
  nodeId: string;
  isOpen: boolean;
  onClose: () => void;
  activeThreadId?: string | null;
  onSelectThread?: (threadId: string) => void;
}

interface Author {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface Comment {
  id: string;
  thread_id: string;
  user_id: string;
  content: unknown;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  author: Author | null;
}

interface Thread {
  id: string;
  node_id: string;
  is_resolved: boolean;
  created_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  comments: Comment[];
  creator: Author | null;
  resolver: Author | null;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function authorName(a: Author | null | undefined): string {
  if (!a) return 'Workspace member';
  if (a.full_name?.trim()) return a.full_name.trim();
  // Fall back to email username so users created before the metadata-sync
  // trigger still get a recognizable identity (e.g. "aise" from aise@x.com).
  if (a.email) return a.email.split('@')[0];
  return 'Workspace member';
}

function authorInitial(a: Author | null | undefined): string {
  const name = authorName(a);
  return name === 'Workspace member' ? '?' : name.charAt(0).toUpperCase();
}

export default function CommentSidebar({
  nodeId,
  isOpen,
  onClose,
  activeThreadId,
  onSelectThread,
}: CommentSidebarProps) {
  const supabase = useMemo(() => createClient(), []);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [presentThreadIds, setPresentThreadIds] = useState<Set<string>>(new Set());
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  // Per-thread resolve UX state. 'pending' = spinner; 'done' = green flash;
  // null/absent = idle. Drives the button label + the card transition.
  const [resolveStatus, setResolveStatus] = useState<Record<string, 'pending' | 'done'>>({});
  // id → {name, email} for the workspace members. Used to render mention
  // chips in legacy comments where the label wasn't saved.
  const [members, setMembers] = useState<Record<string, { name: string; email: string | null }>>({});
  const [membersReady, setMembersReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingInitial, setEditingInitial] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const editComposerRef = useRef<CommentComposerHandle>(null);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchComments = useCallback(async () => {
    const { data } = await getCommentsForNode(nodeId);
    if (data) setThreads(data as unknown as Thread[]);
  }, [nodeId]);

  // Identity + admin lookup. Admin status only used to gate the resolve UI;
  // server still enforces via RLS.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setCurrentUserId(user.id);

      const { data: node } = await supabase
        .from('nodes')
        .select('business_id')
        .eq('id', nodeId)
        .single();
      if (!node || cancelled) return;

      const { data: membership } = await supabase
        .from('business_members')
        .select('role')
        .eq('business_id', node.business_id)
        .eq('user_id', user.id)
        .single();

      if (!cancelled) setIsAdmin(membership?.role === 'ADMIN');

      // Pre-fetch members so mention chips can resolve their label even when
      // it wasn't persisted on the comment node.
      const { getTeamMembers } = await import(
        '@/app/(dashboard)/w/[workspace_slug]/actions'
      );
      const { data: memberList } = await getTeamMembers(node.business_id);
      if (cancelled) return;
      const lookup: Record<string, { name: string; email: string | null }> = {};
      for (const m of (memberList || []) as { id: string; name: string; email: string | null }[]) {
        lookup[m.id] = { name: m.name, email: m.email };
      }
      setMembers(lookup);
      setMembersReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, nodeId, supabase]);

  // Reset readiness when the sidebar closes so the next open re-fetches.
  useEffect(() => {
    if (!isOpen) setMembersReady(false);
  }, [isOpen]);

  // Comments only fetch after members are ready, so mention chips have a
  // members map to fall back to when a stored attrs.label is missing.
  useEffect(() => {
    if (isOpen && membersReady) fetchComments();
  }, [isOpen, membersReady, fetchComments]);

  // Realtime: subscribe to thread + comment changes for this node. Coalesce
  // bursts (e.g. INSERT thread + INSERT comment in same tick) into one refetch
  // 150ms later instead of double-fetching.
  useEffect(() => {
    if (!isOpen) return;

    const scheduleRefetch = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(fetchComments, 150);
    };

    const channel = supabase
      .channel(`comments:${nodeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_threads', filter: `node_id=eq.${nodeId}` },
        scheduleRefetch
      )
      .on(
        'postgres_changes',
        // Comments don't have node_id directly; filter client-side after refetch.
        // RLS already prevents leaking comments from other workspaces.
        { event: '*', schema: 'public', table: 'comments' },
        scheduleRefetch
      )
      .subscribe();

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(channel);
    };
  }, [isOpen, nodeId, supabase, fetchComments]);

  // Listen for the editor's broadcast of which threadIds currently exist as
  // marks in the document. Threads NOT in this set are orphans (their text
  // was deleted) and get rendered with a "[deleted text]" label.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ threadIds: string[] }>;
      setPresentThreadIds(new Set(ce.detail.threadIds));
    };
    window.addEventListener('nexus:thread-ids', handler);
    return () => window.removeEventListener('nexus:thread-ids', handler);
  }, []);

  const handleSubmit = async (threadId: string) => {
    const text = (replyDraft[threadId] || '').trim();
    if (!text || busy) return;
    setBusy(true);
    await addComment(threadId, { text });
    setReplyDraft(prev => ({ ...prev, [threadId]: '' }));
    setBusy(false);
    fetchComments();
  };

  const handleResolve = async (threadId: string) => {
    setResolveStatus(s => ({ ...s, [threadId]: 'pending' }));
    const result = await resolveThread(threadId);
    if (result.error) {
      console.error('[CommentSidebar] resolve error:', result.error);
      setResolveStatus(s => {
        const n = { ...s };
        delete n[threadId];
        return n;
      });
      return;
    }
    // Drop the yellow mark from the editor immediately.
    window.dispatchEvent(
      new CustomEvent('nexus:thread-resolved', { detail: { threadId } })
    );
    // Show the green "Resolved" state for ~700ms so the user actually sees
    // the action complete, then refetch (which removes the card via the
    // is_resolved=false filter).
    setResolveStatus(s => ({ ...s, [threadId]: 'done' }));
    setTimeout(() => {
      fetchComments();
      setResolveStatus(s => {
        const n = { ...s };
        delete n[threadId];
        return n;
      });
    }, 700);
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    const c = comment.content as { text?: string } | undefined;
    if (c && typeof c.text === 'string') {
      // Legacy comment with plain text — wrap into Tiptap doc shape.
      setEditingInitial({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: c.text }] }],
      });
    } else {
      setEditingInitial(comment.content);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editComposerRef.current) return;
    if (editComposerRef.current.isEmpty()) return;
    const json = editComposerRef.current.getJSON();
    setBusy(true);
    await editComment(editingId, json);
    setEditingId(null);
    setEditingInitial(null);
    setBusy(false);
    fetchComments();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingInitial(null);
  };

  const handleSelectThread = (thread: Thread) => {
    onSelectThread?.(thread.id);
    // Tell the editor to scroll + flash the corresponding mark.
    if (presentThreadIds.has(thread.id)) {
      window.dispatchEvent(
        new CustomEvent('nexus:scroll-to-thread', { detail: { threadId: thread.id } })
      );
    }
  };

  const visibleThreads = useMemo(() => {
    return threads
      // Hide zombies — threads with zero comments and no creator (created via
      // the old PageHeader Comment-button bug).
      .filter(t => (t.comments && t.comments.length > 0) || t.created_by)
      // Hide resolved threads, BUT keep them visible while the post-resolve
      // green-flash animation is playing so the user sees the transition.
      .filter(t => !t.is_resolved || resolveStatus[t.id] === 'done');
  }, [threads, resolveStatus]);

  const activeCount = visibleThreads.length;

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full md:w-[380px] bg-background border-l border-border shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cta" strokeWidth={2.5} />
          <h3 className="text-sm font-bold text-foreground">Comments</h3>
          <span className="bg-cta/10 text-cta text-[10px] px-1.5 py-0.5 rounded-full font-black">
            {activeCount}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-hover rounded transition-colors"
          aria-label="Close comments"
        >
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Threads */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
        {visibleThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
            <div className="w-12 h-12 bg-sidebar rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              No comments yet
            </p>
            <p className="text-[11px] mt-1 font-medium leading-relaxed text-muted-foreground">
              Highlight text in the document to start a discussion.
            </p>
          </div>
        ) : (
          visibleThreads.map(thread => {
            const isActive = activeThreadId === thread.id;
            const isOrphan = !presentThreadIds.has(thread.id);
            const canResolve = isAdmin || thread.created_by === currentUserId;
            const status = resolveStatus[thread.id];
            const isResolving = status === 'pending';
            const justResolved = status === 'done';
            const firstComment = thread.comments[0];
            const firstIsOwn = firstComment && firstComment.user_id === currentUserId;
            const showTopEdit = firstIsOwn && editingId !== firstComment?.id;

            return (
              <div
                key={thread.id}
                onClick={() => handleSelectThread(thread)}
                className={cn(
                  'group relative flex flex-col rounded-xl border p-3 transition-all cursor-pointer',
                  'bg-sidebar/30 border-border/5 hover:border-border/20',
                  isActive && !justResolved && 'bg-sidebar border-cta/30 shadow-sm',
                  // Green pulse + slight scale-down while the success state is
                  // visible. Card transitions out when fetchComments removes it.
                  justResolved &&
                    'bg-emerald-500/10 border-emerald-500/40 scale-[0.98] opacity-90'
                )}
              >
                {/* Top-right action group: Edit (first comment, if own) +
                    Resolve. Both icons sit on the same line so the user can
                    triage the thread without scrolling to a footer. Edit on
                    reply comments stays inline in their row below. */}
                <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                  {showTopEdit && firstComment && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleStartEdit(firstComment);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-muted hover:text-foreground hover:bg-background transition-all"
                      aria-label="Edit comment"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canResolve && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isResolving && !justResolved) handleResolve(thread.id);
                      }}
                      disabled={isResolving || justResolved}
                      className={cn(
                        'p-1.5 rounded-full transition-all flex items-center justify-center',
                        justResolved
                          ? 'bg-emerald-500/15 text-emerald-500 opacity-100'
                          : isResolving
                          ? 'bg-foreground/5 text-muted-foreground cursor-wait opacity-100'
                          : 'opacity-0 group-hover:opacity-100 text-muted hover:text-foreground hover:bg-background'
                      )}
                      title={
                        justResolved
                          ? 'Resolved'
                          : isResolving
                          ? 'Resolving…'
                          : 'Mark resolved'
                      }
                      aria-label={justResolved ? 'Resolved' : 'Resolve thread'}
                    >
                      {justResolved ? (
                        <Check className="w-4 h-4 nexus-resolve-check" strokeWidth={3} />
                      ) : isResolving ? (
                        <CheckCircle2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Orphan badge */}
                {isOrphan && (
                  <div className="mb-3 flex items-start gap-2 px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 leading-relaxed">
                      The text this comment was attached to was deleted.
                    </span>
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-3">
                  {thread.comments.map((comment, commentIndex) => {
                    const isOwn = comment.user_id === currentUserId;
                    const isEditing = editingId === comment.id;
                    // Inline edit only renders for replies (index > 0) — the
                    // first comment's edit button lives in the card's top-right
                    // group alongside Resolve, on the user's request.
                    const showInlineEdit = isOwn && commentIndex > 0 && !isEditing;

                    return (
                      <div key={comment.id} className="group/comment relative">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-cta/10 flex items-center justify-center text-[10px] font-bold text-cta shrink-0 mt-0.5">
                            {authorInitial(comment.author)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] mb-1">
                              <span className="font-bold text-foreground/85">
                                {authorName(comment.author)}
                              </span>
                              <span className="text-muted-foreground">
                                {formatTime(comment.created_at)}
                              </span>
                              {comment.is_edited && (
                                <span className="text-muted-foreground/70">(edited)</span>
                              )}
                            </div>
                            {isEditing ? (
                              <div
                                className="space-y-2 bg-background border border-border/30 rounded p-2"
                                onClick={e => e.stopPropagation()}
                              >
                                <CommentComposer
                                  ref={editComposerRef}
                                  initialContent={editingInitial}
                                  placeholder="Edit comment… (@ to mention)"
                                  onSubmit={handleSaveEdit}
                                  onCancel={handleCancelEdit}
                                  autoFocus
                                />
                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/30">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }}
                                    className="px-2 py-1 hover:bg-hover rounded text-[11px] font-bold text-muted-foreground"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleSaveEdit();
                                    }}
                                    disabled={busy}
                                    className="px-2 py-1 bg-cta text-cta-foreground rounded text-[11px] font-bold disabled:opacity-30"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <CommentBody content={comment.content} members={members} />
                            )}
                          </div>
                          {showInlineEdit && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleStartEdit(comment);
                              }}
                              className="opacity-0 group-hover/comment:opacity-100 p-1.5 hover:bg-background rounded transition-all text-muted hover:text-foreground"
                              aria-label="Edit comment"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer: reply input. Resolve action moved to the
                    card's top-right action group (alongside Edit). */}
                <div className="mt-3 pt-3 border-t border-border/5">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Reply…"
                      value={replyDraft[thread.id] || ''}
                      onClick={e => e.stopPropagation()}
                      onChange={e =>
                        setReplyDraft(prev => ({ ...prev, [thread.id]: e.target.value }))
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSubmit(thread.id);
                      }}
                      className="w-full bg-background border border-border/10 rounded-lg pl-3 pr-10 py-2 text-[12px] focus:outline-none focus:border-cta/30 transition-all font-medium"
                    />
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleSubmit(thread.id);
                      }}
                      disabled={busy || !(replyDraft[thread.id] || '').trim()}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-cta rounded flex items-center justify-center text-cta-foreground disabled:opacity-30 transition-opacity"
                      aria-label="Send reply"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
