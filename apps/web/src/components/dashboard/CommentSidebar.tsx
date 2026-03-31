'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  Send,
  MoreHorizontal,
  User,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addComment, getCommentsForNode } from '@/app/(dashboard)/w/[workspace_slug]/actions';

interface CommentSidebarProps {
  nodeId: string;
  isOpen: boolean;
  onClose: () => void;
  activeThreadId?: string | null;
  onSelectThread?: (threadId: string) => void;
}

export default function CommentSidebar({
  nodeId,
  isOpen,
  onClose,
  activeThreadId,
  onSelectThread
}: CommentSidebarProps) {
  const [threads, setThreads] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    const { data } = await getCommentsForNode(nodeId);
    if (data) setThreads(data);
  };

  useEffect(() => {
    if (isOpen) fetchComments();
  }, [nodeId, isOpen]);

  // Poll for updates every 5s if open (simple real-time fallback)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(fetchComments, 5000);
    return () => clearInterval(interval);
  }, [isOpen, nodeId]);

  const handleSubmit = async (threadId: string) => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await addComment(threadId, { text: newComment });
    setNewComment('');
    setIsSubmitting(false);
    fetchComments();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[350px] bg-background border-l border-border shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cta" strokeWidth={2.5} />
          <h3 className="text-sm font-bold text-foreground">Comments</h3>
          <span className="bg-cta/10 text-cta text-[10px] px-1.5 py-0.5 rounded-full font-black">
            {threads.length}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-hover rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" ref={scrollRef}>
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
             <div className="w-12 h-12 bg-sidebar rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6" />
             </div>
             <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No comments yet</p>
             <p className="text-[11px] mt-1 font-medium leading-relaxed">Highlight text in the document and click "Add comment" to start a discussion.</p>
          </div>
        ) : (
          threads.map((thread) => (
            <div 
              key={thread.id} 
              onClick={() => onSelectThread?.(thread.id)}
              className={cn(
                "group relative flex flex-col bg-sidebar/30 rounded-xl border border-border/5 p-3 transition-all hover:border-border/20",
                activeThreadId === thread.id && "bg-sidebar border-cta/30 shadow-sm"
              )}
            >
              {/* Thread ID Label (Hidden/Subtle) */}
              <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cta/10 flex items-center justify-center text-[10px] font-bold text-cta">
                       {thread.comments[0]?.author?.full_name?.charAt(0) || <User className="w-3 h-3" />}
                    </div>
                    <span className="text-[12px] font-bold text-foreground/80">
                      {thread.comments[0]?.author?.full_name || 'Anonymous'}
                    </span>
                 </div>
                 <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded transition-all">
                    <MoreHorizontal className="w-3.5 h-3.5 text-muted" />
                 </button>
              </div>

              {/* Messages */}
              <div className="space-y-3 pl-8">
                 {thread.comments.map((comment: any) => (
                   <div key={comment.id} className="text-[13px] leading-relaxed text-foreground/70 font-medium">
                      {comment.content.text}
                      <div className="text-[10px] text-muted/40 mt-0.5 font-bold uppercase tracking-widest">
                         {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                   </div>
                 ))}
              </div>

              {/* Quick Reply */}
              <div className="mt-4 pt-3 border-t border-border/5">
                 <div className="relative">
                    <input 
                      type="text"
                      placeholder="Reply..."
                      value={activeThreadId === thread.id ? newComment : ''}
                      onChange={(e) => {
                        onSelectThread?.(thread.id);
                        setNewComment(e.target.value);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit(thread.id)}
                      className="w-full bg-background border border-border/10 rounded-lg pl-3 pr-10 py-1.5 text-[12px] focus:outline-none focus:border-cta/30 transition-all font-medium"
                    />
                    <button 
                      onClick={() => handleSubmit(thread.id)}
                      disabled={isSubmitting || !newComment.trim()}
                      className="absolute right-1 top-1 w-6 h-6 bg-cta rounded flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 bg-sidebar/5 border-t border-border flex items-center gap-2">
         <Sparkles className="w-3.5 h-3.5 text-purple-500 opacity-60" />
         <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Team Discussions enabled</p>
      </div>
    </div>
  );
}
