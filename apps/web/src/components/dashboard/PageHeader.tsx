'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Smile,
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Clock,
  ChevronRight,
  Globe,
  Link as LinkIcon,
  Check,
  X,
  Upload,
  Download,
  Copy,
  Trash2,
  FolderInput,
  Loader2,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import AvatarStack from '@/components/editor/AvatarStack';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedCallback } from 'use-debounce';
import { useRouter, useParams } from 'next/navigation';
import { updateNode, toggleNodePublic, createCommentThread, duplicateNode, deleteNode } from '@/app/(dashboard)/w/[workspace_slug]/actions';

interface PageHeaderProps {
  title: string;
  icon?: string | null;
  nodeId: string;
  isNameCustom?: boolean;
  isPublic?: boolean;
  onOpenComments?: () => void;
  onImport?: () => void;
  teamspace?: { id: string; name: string } | null;
  workspaceSlug?: string;
  isCalendarEntry?: boolean;
}

const EMOJIS = ['📄', '📝', '📓', '📚', '💡', '🚀', '🎯', '🎨', '🧠', '🛠️', '📅', '✅', '⭐', '🔥', '🌍', '🏠'];

export default function PageHeader({ title: initialTitle, icon: initialIcon, nodeId, isNameCustom = false, isPublic: initialIsPublic = false, onOpenComments, onImport, teamspace, workspaceSlug, isCalendarEntry }: PageHeaderProps) {
  const router = useRouter();
  const params = useParams();
  const routeSlug = params?.workspace_slug as string;
  const resolvedSlug = workspaceSlug ?? routeSlug;

  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon || null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isCopied, setIsCopied] = useState(false);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [coverUrl, setCoverUrl] = useState<string | null>(null); // To be linked to database later
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleSaving = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus('saving');
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus('saved');
        saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1500);
    };
    window.addEventListener('nexus:saving', handleSaving);
    return () => {
      window.removeEventListener('nexus:saving', handleSaving);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Close share menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };
    if (isShareMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isShareMenuOpen]);

  const handleTogglePublic = async () => {
    setIsTogglingPublic(true);
    const next = !isPublic;
    setIsPublic(next); // optimistic
    const result = await toggleNodePublic(nodeId, next);
    if (result?.error) {
      setIsPublic(!next); // revert on error
    }
    setIsTogglingPublic(false);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/p/${nodeId}`;
    await navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Sync title and icon to database via Server Action
  const debouncedUpdate = useDebouncedCallback(async (newTitle: string, newIcon: string | null) => {
    const updates: any = { title: newTitle, icon: newIcon };
    
    // Only update the sidebar name if it hasn't been manually overridden
    if (!isNameCustom) {
      updates.name = newTitle;
    }
    
    await updateNode(nodeId, updates);
  }, 1000);

  const handleTitleChange = (e: React.FormEvent<HTMLHeadingElement>) => {
    const newTitle = e.currentTarget.innerText;
    setTitle(newTitle);
    debouncedUpdate(newTitle, icon);
  };

  const handleIconSelect = (emoji: string) => {
    setIcon(emoji);
    setIsIconPickerOpen(false);
    debouncedUpdate(title, emoji);
  };

  const removeIcon = () => {
    setIcon(null);
    debouncedUpdate(title, null);
  };

  const addCover = () => {
    setCoverUrl('linear-gradient(to right, #2383e220, #2383e205)');
  };

  const removeCover = () => {
    setCoverUrl(null);
  };

  const handleDuplicate = async () => {
    const result = await duplicateNode(nodeId);
    if (result.data) {
      router.push(`/w/${resolvedSlug}/n/${result.data.id}`);
      router.refresh();
    }
  };

  const handleMoveToTrash = async () => {
    await deleteNode(nodeId);
    router.push(`/w/${resolvedSlug}/dashboard`);
    router.refresh();
  };

  return (
    <div className="w-full flex flex-col group/header pb-2 animate-in fade-in duration-300">
      {/* Cover Image Area */}
      {coverUrl ? (
        <div className="relative w-full h-[30vh] min-h-[160px] group/cover overflow-hidden mb-8">
           <div className="w-full h-full bg-sidebar/50" style={{ background: coverUrl }} />
           <div className="absolute bottom-4 right-[calc(50%-480px)] opacity-0 group-hover/cover:opacity-100 transition-opacity">
              <button 
                onClick={removeCover}
                className="px-3 py-1.5 bg-background/80 hover:bg-background text-foreground/70 hover:text-foreground text-xs font-bold rounded-md border border-border/10 backdrop-blur-md transition-all cursor-pointer"
              >
                Remove cover
              </button>
           </div>
        </div>
      ) : (
        <div className="w-full h-12 flex items-center justify-between px-3 md:px-4 text-foreground/60 text-[11px] md:text-[13px] font-medium border-b border-border/5 mb-4 md:mb-8 bg-background/50 backdrop-blur-sm sticky top-0 z-30 md:relative md:bg-transparent md:backdrop-none">
          <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
            <Link
              href={`/w/${resolvedSlug}/dashboard`}
              className="hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-30" />
            
            {isCalendarEntry && (
              <>
                <Link
                  href={`/w/${resolvedSlug}/calendar`}
                  className="hover:text-foreground transition-colors"
                >
                  Calendar
                </Link>
                <ChevronRight className="w-3.5 h-3.5 opacity-30" />
              </>
            )}

            {teamspace && !isCalendarEntry && (
              <>
                <Link
                  href={`/w/${resolvedSlug}/t/${teamspace.id}`}
                  className="hover:text-foreground transition-colors truncate max-w-[160px]"
                >
                  {teamspace.name}
                </Link>
                <ChevronRight className="w-3.5 h-3.5 opacity-30" />
              </>
            )}
            
            <span className="text-foreground/90 font-bold truncate max-w-[100px] md:max-w-[200px]">{title || "Untitled"}</span>
            {saveStatus !== 'idle' && (
              <span className="flex items-center gap-1 text-[10px] md:text-[11px] text-foreground/40 font-normal ml-0.5 md:ml-1 shrink-0">
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-2.5 h-2.5 md:w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-2.5 h-2.5 md:w-3 h-3 text-green-500" />
                )}
                <span className="hidden xs:inline">{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors text-foreground/60 hidden sm:flex">
              <Clock className="w-3.5 h-3.5 opacity-60" />
              <span>Edited recently</span>
            </div>
            <button 
              onClick={async () => {
                 const { data } = await createCommentThread(nodeId);
                 if (data && onOpenComments) {
                    window.dispatchEvent(new CustomEvent('nexus:apply-comment', { detail: { threadId: data.id } }));
                    onOpenComments();
                 }
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-hover text-foreground transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 opacity-60" />
              <span className="hidden md:inline">Comment</span>
            </button>
            <div className="relative" ref={shareMenuRef}>
              <button
                onClick={() => setIsShareMenuOpen(prev => !prev)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded hover:bg-hover text-foreground transition-colors cursor-pointer",
                  isPublic && "text-blue-500"
                )}
              >
                {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5 opacity-80" />}
                <span className="hidden xs:inline">{isPublic ? "Published" : "Share"}</span>
              </button>

              {isShareMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-32px)] xs:w-72 bg-background border border-border rounded-xl shadow-popover p-3 z-50 animate-in zoom-in-95 duration-150 ring-1 ring-black/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-foreground">Share to web</span>
                    <button onClick={() => setIsShareMenuOpen(false)} className="p-1 rounded hover:bg-hover text-muted cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle row */}
                  <div className="flex items-center justify-between py-2 border-b border-border/30 mb-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">Publish page</span>
                      <span className="text-xs text-muted">Anyone with the link can view</span>
                    </div>
                    <button
                      onClick={handleTogglePublic}
                      disabled={isTogglingPublic}
                      className={cn(
                        "relative rounded-full transition-colors duration-200 cursor-pointer shrink-0",
                        isPublic ? "bg-blue-500" : "bg-foreground/20",
                        isTogglingPublic && "opacity-50 cursor-not-allowed"
                      )}
                      style={{ width: 40, height: 22, padding: 0 }}
                    >
                      <span
                        className="absolute bg-white rounded-full shadow-sm transition-all duration-200"
                        style={{
                          width: 16,
                          height: 16,
                          top: 3,
                          left: isPublic ? 21 : 3,
                        }}
                      />
                    </button>
                  </div>

                  {/* Link copy section (only shown when public) */}
                  {isPublic && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1.5 bg-sidebar/50 border border-border/40 rounded-lg px-2.5 py-1.5 overflow-hidden">
                        <LinkIcon className="w-3 h-3 text-muted shrink-0" />
                        <span className="text-xs text-muted truncate font-mono">
                          {typeof window !== 'undefined' ? `${window.location.origin}/p/${nodeId}` : `/p/${nodeId}`}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0",
                          isCopied
                            ? "bg-green-500/10 text-green-500 border border-green-500/30"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        )}
                      >
                        {isCopied ? <><Check className="w-3 h-3" /> Copied</> : "Copy link"}
                      </button>
                    </div>
                  )}

                  {!isPublic && (
                    <p className="text-xs text-muted text-center py-1">
                      Toggle publish to generate a shareable link.
                    </p>
                  )}
                </div>
              )}
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-1 hover:bg-hover rounded transition-all cursor-pointer text-foreground/80 outline-none">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[200px] bg-background border border-border rounded-lg shadow-popover p-1 z-50 animate-in fade-in zoom-in-95 duration-100 outline-none"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenu.Item
                    onSelect={onImport}
                    data-testid="page-header-import-btn"
                    className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded cursor-pointer hover:bg-hover outline-none text-foreground/80"
                  >
                    <Upload className="w-3.5 h-3.5" /> Import
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded cursor-pointer hover:bg-hover outline-none text-foreground/80">
                    <Download className="w-3.5 h-3.5" /> Export
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                  <DropdownMenu.Item onSelect={handleDuplicate} className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded cursor-pointer hover:bg-hover outline-none text-foreground/80">
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={handleCopyLink} className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded cursor-pointer hover:bg-hover outline-none text-foreground/80">
                    <LinkIcon className="w-3.5 h-3.5" /> Copy link
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded cursor-pointer hover:bg-hover outline-none text-foreground/80">
                    <FolderInput className="w-3.5 h-3.5" /> Move to
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                  <DropdownMenu.Item onSelect={handleMoveToTrash} className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded cursor-pointer hover:bg-red-500/10 outline-none text-red-500">
                    <Trash2 className="w-3.5 h-3.5" /> Move to trash
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto px-6 flex flex-col relative">
        {/* Buttons appearing on hover (or persistent if icon missing) */}
        {!icon && !coverUrl && (
          <div className="flex items-center gap-3 opacity-0 group-hover/header:opacity-100 transition-opacity mb-4 -ml-1">
            <button 
              onClick={() => setIsIconPickerOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-muted hover:bg-hover rounded transition-all text-[14px] font-medium cursor-pointer"
            >
              <Smile className="w-4 h-4 opacity-50" /> Add icon
            </button>
            <button 
              onClick={addCover}
              className="flex items-center gap-1.5 px-2 py-1 text-muted hover:bg-hover rounded transition-all text-[14px] font-medium cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 opacity-50" /> Add cover
            </button>
          </div>
        )}

        {/* Big Icon Area */}
        {icon && (
          <div className={cn(
            "relative w-fit group/icon -ml-3 mb-4 transition-all",
            coverUrl ? "-mt-16 z-20" : ""
          )}>
            <button 
              onClick={() => setIsIconPickerOpen(true)}
              className={cn(
                "hover:bg-hover/40 rounded-2xl p-2 transition-colors cursor-pointer outline-none",
                coverUrl ? "text-8xl p-4 bg-background border-4 border-background shadow-notion" : "text-7xl"
              )}
            >
              {icon}
            </button>
            <button 
              onClick={removeIcon}
              className="absolute -top-1 -right-1 bg-background border border-border rounded-full p-1 opacity-0 group-hover/icon:opacity-100 transition-opacity hover:text-red-500 shadow-sm cursor-pointer z-30"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Icon Picker Popover */}
        {isIconPickerOpen && (
          <div className="absolute z-50 top-12 left-24 bg-background border border-border rounded-xl shadow-popover p-2 animate-in zoom-in-95 duration-150 ring-1 ring-black/5">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map(e => (
                <button 
                  key={e}
                  onClick={() => handleIconSelect(e)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-hover rounded transition-colors text-2xl cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsIconPickerOpen(false)}
              className="mt-2 w-full p-1.5 text-xs font-bold text-muted border-t border-border/50 hover:text-foreground hover:bg-hover transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Editable Title */}
        <h1 
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleTitleChange}
          data-placeholder="Untitled"
          className="text-3xl md:text-5xl font-black font-display tracking-tight leading-tight text-foreground outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-foreground/25 empty:before:font-normal break-words mb-4"
        >
          {initialTitle === "Untitled" ? "" : initialTitle}
        </h1>

        {/* Page metadata can go here if needed later */}
      </div>
    </div>
  );
}
