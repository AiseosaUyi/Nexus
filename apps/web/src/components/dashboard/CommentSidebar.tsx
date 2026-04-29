'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  Send,
  MoreHorizontal,
  User as UserIcon,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addComment,
  getCommentsForNode,
  resolveThread,
  unresolveThread,
  editComment,
  deleteComment,
} from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { createClient } from '@/lib/supabase/client';

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
}

interface Comment {
  id: string;
  thread_id: string;
  user_id: string;
  content: { text?: string } & Record<string, unknown>;
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
  return a?.full_name || 'Unknown user';
}

function authorInitial(a: Author | null | undefined): string {
  const name = a?.full_name?.trim();
  return name ? name.charAt(0).toUpperCase() : '?';
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
  const [showResolved, setShowResolved] = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, nodeId, supabase]);

  useEffect(() => {
    if (isOpen) fetchComments();
  }, [isOpen, fetchComments]);

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

  // Close any open dropdown when clicking outside
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-comment-menu]')) setOpenMenu(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenu]);

  const handleSubmit = async (threadId: string) => {
    const text = (replyDraft[threadId] || '').trim();
    if (!text || busy) return;
    setBusy(true);
    await addComment(threadId, { text });
    setReplyDraft(prev => ({ ...prev, [threadId]: '' }));
    setBusy(false);
    fetchComments();
  };

  const handleResolve = async (threadId: string, isResolved: boolean) => {
    setBusy(true);
    const result = isResolved
      ? await unresolveThread(threadId)
      : await resolveThread(threadId);
    setBusy(false);
    if (result.error) {
      console.error('[CommentSidebar] resolve error:', result.error);
      // RLS will surface "Forbidden" for non-author non-admin
      return;
    }
    fetchComments();
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditDraft(comment.content?.text || '');
    setOpenMenu(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editDraft.trim()) return;
    setBusy(true);
    await editComment(editingId, { text: editDraft.trim() });
    setEditingId(null);
    setEditDraft('');
    setBusy(false);
    fetchComments();
  };

  const handleDelete = async (commentId: string) => {
    setBusy(true);
    await deleteComment(commentId);
    setOpenMenu(null);
    setBusy(false);
    fetchComments();
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
    return threads.filter(t => showResolved || !t.is_resolved);
  }, [threads, showResolved]);

  const activeCount = threads.filter(t => !t.is_resolved).length;
  const resolvedCount = threads.filter(t => t.is_resolved).length;

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
        <div className="flex items-center gap-1">
          {resolvedCount > 0 && (
            <button
              onClick={() => setShowResolved(v => !v)}
              className="flex items-center gap-1 px-2 py-1 hover:bg-hover rounded transition-colors text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              title={showResolved ? 'Hide resolved' : 'Show resolved'}
            >
              {showResolved ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {resolvedCount} resolved
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-hover rounded transition-colors"
            aria-label="Close comments"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>
      </div>

      {/* Threads */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
        {visibleThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
            <div className="w-12 h-12 bg-sidebar rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {threads.length === 0 ? 'No comments yet' : 'All resolved'}
            </p>
            <p className="text-[11px] mt-1 font-medium leading-relaxed text-muted-foreground">
              {threads.length === 0
                ? 'Highlight text in the document and click "Add comment" to start a discussion.'
                : 'Toggle "show resolved" above to see closed threads.'}
            </p>
          </div>
        ) : (
          visibleThreads.map(thread => {
            const isActive = activeThreadId === thread.id;
            const isOrphan = !presentThreadIds.has(thread.id);
            const canResolve = isAdmin || thread.created_by === currentUserId;
            const firstComment = thread.comments[0];
            const author = thread.creator || firstComment?.author;

            return (
              <div
                key={thread.id}
                onClick={() => handleSelectThread(thread)}
                className={cn(
                  'group relative flex flex-col rounded-xl border p-3 transition-all cursor-pointer',
                  thread.is_resolved
                    ? 'bg-sidebar/10 border-border/5 opacity-60 hover:opacity-100'
                    : 'bg-sidebar/30 border-border/5 hover:border-border/20',
                  isActive && 'bg-sidebar border-cta/30 shadow-sm opacity-100'
                )}
              >
                {/* Status row */}
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-cta/10 flex items-center justify-center text-[10px] font-bold text-cta shrink-0">
                      {author ? authorInitial(author) : <UserIcon className="w-3 h-3" />}
                    </div>
                    <span className="text-[12px] font-bold text-foreground/80 truncate">
                      {authorName(author)}
                    </span>
                    {thread.is_resolved && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Resolved
                      </span>
                    )}
                  </div>
                  {canResolve && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleResolve(thread.id, thread.is_resolved);
                      }}
                      disabled={busy}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 hover:bg-background rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                      title={thread.is_resolved ? 'Reopen' : 'Resolve'}
                    >
                      {thread.is_resolved ? (
                        <>
                          <RotateCcw className="w-3 h-3" /> Reopen
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Resolve
                        </>
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

                {/* Resolved-by badge */}
                {thread.is_resolved && thread.resolver && (
                  <div className="mb-3 text-[10px] font-medium text-muted-foreground">
                    Resolved by <span className="text-foreground/70">{authorName(thread.resolver)}</span>
                    {thread.resolved_at && <> · {formatTime(thread.resolved_at)}</>}
                  </div>
                )}

                {/* Messages */}
                <div className="space-y-3">
                  {thread.comments.map(comment => {
                    const isOwn = comment.user_id === currentUserId;
                    const isEditing = editingId === comment.id;

                    return (
                      <div key={comment.id} className="group/comment relative">
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-muted/30 flex items-center justify-center text-[9px] font-bold text-foreground/60 shrink-0 mt-0.5">
                            {authorInitial(comment.author)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[10px] mb-0.5">
                              <span className="font-bold text-foreground/70">
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
                              <div className="space-y-1.5">
                                <textarea
                                  value={editDraft}
                                  onChange={e => setEditDraft(e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full bg-background border border-border/30 rounded p-2 text-[13px] focus:outline-none focus:border-cta/50 transition-colors resize-y min-h-[60px]"
                                  autoFocus
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleSaveEdit();
                                    }}
                                    disabled={busy || !editDraft.trim()}
                                    className="px-2 py-1 bg-cta text-cta-foreground rounded text-[11px] font-bold disabled:opacity-30"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      setEditingId(null);
                                      setEditDraft('');
                                    }}
                                    className="px-2 py-1 hover:bg-hover rounded text-[11px] font-bold text-muted-foreground"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[13px] leading-relaxed text-foreground/80 break-words whitespace-pre-wrap">
                                {comment.content?.text || ''}
                              </p>
                            )}
                          </div>
                          {isOwn && !isEditing && (
                            <div className="relative" data-comment-menu>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setOpenMenu(openMenu === comment.id ? null : comment.id);
                                }}
                                className="opacity-0 group-hover/comment:opacity-100 p-1 hover:bg-background rounded transition-all"
                                aria-label="Comment actions"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5 text-muted" />
                              </button>
                              {openMenu === comment.id && (
                                <div
                                  className="absolute right-0 top-full mt-1 z-10 min-w-[120px] bg-popover border border-border rounded-lg shadow-popover py-1"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => handleStartEdit(comment)}
                                    className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-hover flex items-center gap-2"
                                  >
                                    <Pencil className="w-3 h-3" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(comment.id)}
                                    disabled={busy}
                                    className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-hover flex items-center gap-2 text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply input — hidden for resolved unless active */}
                {(!thread.is_resolved || isActive) && (
                  <div className="mt-3 pt-3 border-t border-border/5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={thread.is_resolved ? 'Reopen by replying…' : 'Reply…'}
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
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
