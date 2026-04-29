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
  Lock,
  UserPlus,
  Eye,
  Pencil,
  ChevronDown,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import AvatarStack from '@/components/editor/AvatarStack';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedCallback } from 'use-debounce';
import { useRouter, useParams } from 'next/navigation';
import { updateNode, toggleNodePublic, createCommentThread, duplicateNode, deleteNode, getNodeShares, inviteToNode, removeNodeShare } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useCommentCount } from './CommentCountsContext';
import type { NodeShare } from '@nexus/api/schema';

type EnrichedShare = NodeShare & {
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_member: boolean;
  is_registered: boolean;
};

interface PageHeaderProps {
  title: string;
  icon?: string | null;
  coverUrl?: string | null;
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

// ─── Cover Gallery ──────────────────────────────────────────────────────────
const COVER_GALLERY = [
  // Gradients
  { url: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', label: 'Purple Haze' },
  { url: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', label: 'Pink Sunset' },
  { url: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', label: 'Ocean Blue' },
  { url: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', label: 'Mint Fresh' },
  { url: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', label: 'Warm Glow' },
  { url: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', label: 'Lavender' },
  { url: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', label: 'Peach' },
  { url: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)', label: 'Twilight' },
  { url: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)', label: 'Deep Sea' },
  { url: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', label: 'Midnight' },
  // Unsplash (free to use, no API key needed for hotlinking)
  { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80', label: 'Mountains' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80', label: 'Beach' },
  { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80', label: 'Forest' },
  { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80', label: 'Space' },
  { url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80', label: 'Abstract' },
  { url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1200&q=80', label: 'Marble' },
  { url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&q=80', label: 'Dark Sky' },
  { url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&q=80', label: 'Minimal Dark' },
];

// Header-level Comments button. Lives on every page, shows a count pill
// alongside the icon when there are unresolved threads so users see open
// discussions without opening the side panel first.
function CommentsButton({
  nodeId,
  onOpenComments,
}: {
  nodeId: string;
  onOpenComments?: () => void;
}) {
  const count = useCommentCount(nodeId);
  return (
    <button
      onClick={() => onOpenComments?.()}
      className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-hover text-foreground transition-colors cursor-pointer"
      title={count > 0 ? `Show ${count} unresolved ${count === 1 ? 'comment' : 'comments'}` : 'Show comments'}
    >
      <MessageSquare className="w-3.5 h-3.5 opacity-60" />
      <span className="hidden md:inline">Comments</span>
      {count > 0 && (
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-cta/15 text-cta text-[10px] font-bold tabular-nums"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

export default function PageHeader({ title: initialTitle, icon: initialIcon, coverUrl: initialCoverUrl, nodeId, isNameCustom = false, isPublic: initialIsPublic = false, onOpenComments, onImport, teamspace, workspaceSlug, isCalendarEntry }: PageHeaderProps) {
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
  const [shares, setShares] = useState<EnrichedShare[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'view' | 'edit'>('view');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string | null; avatar: string | null } | null>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl ?? null);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
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

  // Load shares and current user when menu opens
  useEffect(() => {
    if (isShareMenuOpen) {
      getNodeShares(nodeId).then((result) => {
        if (result.data) setShares(result.data as EnrichedShare[]);
      });
      if (!currentUser) {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            setCurrentUser({
              email: user.email ?? '',
              name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
              avatar: user.user_metadata?.avatar_url ?? null,
            });
          }
        });
      }
    }
  }, [isShareMenuOpen, nodeId, currentUser]);

  // Close share menu on outside click. Radix portals its dropdown contents
  // to <body>, so a click on the access-type dropdown lives OUTSIDE
  // shareMenuRef and would otherwise close the share menu beneath it. We
  // explicitly allow clicks inside any Radix portal (data-radix-popper-
  // content-wrapper) so picking an access type leaves the share menu open.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!shareMenuRef.current) return;
      if (shareMenuRef.current.contains(target as Node)) return;
      if (target?.closest('[data-radix-popper-content-wrapper]')) return;
      setIsShareMenuOpen(false);
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

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    setInviteError(null);
    if (!email || !email.includes('@')) {
      setInviteError('Enter a valid email address.');
      return;
    }
    setIsInviting(true);
    const result = await inviteToNode(nodeId, email, invitePermission);
    if (result.data) {
      // Refetch so the new row is enriched (member/guest, name, avatar) for
      // the list — the insert response only carries the raw node_shares row.
      const refreshed = await getNodeShares(nodeId);
      if (refreshed.data) setShares(refreshed.data as EnrichedShare[]);
      setInviteEmail('');
    } else if (result.error) {
      // Surface the actual error so the user doesn't watch a silent spinner.
      // Translates a few known Postgres/PostgREST codes into plain English.
      const raw = String(result.error);
      if (raw.includes('node_shares') && raw.includes('schema cache')) {
        setInviteError(
          'Sharing isn’t set up on this database yet. Apply database migrations 17–23 in Supabase, then try again.'
        );
      } else {
        setInviteError(raw);
      }
    }
    setIsInviting(false);
  };

  const handleRemoveShare = async (email: string) => {
    await removeNodeShare(nodeId, email);
    setShares((prev) => prev.filter((s) => s.email !== email));
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

  const setCover = async (url: string | null) => {
    setCoverUrl(url);
    setIsCoverPickerOpen(false);
    await updateNode(nodeId, { cover_url: url });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const supabase = createClient();

    // Upload to Supabase Storage (covers bucket)
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${nodeId}/cover-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      // Bucket may not exist — fall back to object URL for preview + log error
      console.error('[Cover] Upload failed:', uploadError.message);
      // Fallback: compress and use data URL
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = async () => {
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        setCover(compressed);
      };
      img.src = URL.createObjectURL(file);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('covers')
      .getPublicUrl(filePath);

    setCover(publicUrl);
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
           {coverUrl.startsWith('linear-gradient') ? (
             <div className="w-full h-full" style={{ background: coverUrl }} />
           ) : (
             <img src={coverUrl} alt="" className="w-full h-full object-cover" />
           )}
           <div className="absolute bottom-4 right-[calc(50%-480px)] flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsCoverPickerOpen(true)}
                className="px-3 py-1.5 bg-background/80 hover:bg-background text-foreground/70 hover:text-foreground text-xs font-bold rounded-md border border-border/10 backdrop-blur-md transition-all cursor-pointer"
              >
                Change cover
              </button>
              <button
                onClick={() => setCover(null)}
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
            {/* Header button only opens the sidebar; new threads always come
                from inline text-selection so every thread has an anchor. */}
            <CommentsButton nodeId={nodeId} onOpenComments={onOpenComments} />
            <div className="relative" ref={shareMenuRef}>
              <button
                onClick={() => setIsShareMenuOpen(prev => !prev)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-hover text-foreground transition-colors cursor-pointer",
                  isPublic && "text-blue-500"
                )}
              >
                <Share2 className="w-3.5 h-3.5 opacity-80" />
                <span>Share</span>
              </button>

              {isShareMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-[360px] bg-background border border-border rounded-xl shadow-popover z-50 animate-in zoom-in-95 duration-150 ring-1 ring-black/5">
                  {/* Invite row */}
                  <div className="p-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                        className="flex-1 px-3 py-1.5 text-[13px] bg-foreground/[0.04] border border-border rounded-lg text-foreground placeholder:text-muted/50 outline-none focus:border-accent/40"
                      />
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            title={invitePermission === 'edit' ? 'Full access — can edit this page' : 'View only — can read but not edit'}
                            className="flex items-center gap-1 px-2 py-1.5 text-[12px] font-medium bg-foreground/[0.04] hover:bg-foreground/[0.08] border border-border rounded-lg text-foreground/80 transition-colors cursor-pointer shrink-0"
                          >
                            {invitePermission === 'edit' ? (
                              <Pencil className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            <span>{invitePermission === 'edit' ? 'Edit' : 'View'}</span>
                            <ChevronDown className="w-3 h-3 opacity-60" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            sideOffset={6}
                            // Radix portals this content to <body>. The
                            // share menu's outside-click handler runs on
                            // document `mousedown` and would close the
                            // share menu before Radix's `onSelect` even
                            // fires. We stop both events at this boundary
                            // so the share menu never sees a click that
                            // landed on the dropdown.
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="z-[100] min-w-[260px] bg-sidebar border border-border/40 rounded-xl shadow-popover p-1 ring-1 ring-black/20 animate-in zoom-in-95 fade-in duration-150"
                          >
                            <DropdownMenu.Item
                              onSelect={() => setInvitePermission('view')}
                              className={cn(
                                'flex items-start gap-2 px-2 py-2 rounded-lg text-[13px] cursor-pointer outline-none transition-colors',
                                invitePermission === 'view'
                                  ? 'bg-cta/10 text-foreground'
                                  : 'text-foreground hover:bg-hover'
                              )}
                            >
                              <Eye className={cn('w-4 h-4 mt-0.5 shrink-0', invitePermission === 'view' ? 'text-cta' : 'text-muted-foreground')} />
                              <div className="flex-1">
                                <p className="font-bold leading-tight">View only</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">Can read the page. Can’t edit or change settings.</p>
                              </div>
                              {invitePermission === 'view' && <Check className="w-4 h-4 mt-0.5 text-cta shrink-0" strokeWidth={3} />}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              onSelect={() => setInvitePermission('edit')}
                              className={cn(
                                'flex items-start gap-2 px-2 py-2 rounded-lg text-[13px] cursor-pointer outline-none transition-colors',
                                invitePermission === 'edit'
                                  ? 'bg-cta/10 text-foreground'
                                  : 'text-foreground hover:bg-hover'
                              )}
                            >
                              <Pencil className={cn('w-4 h-4 mt-0.5 shrink-0', invitePermission === 'edit' ? 'text-cta' : 'text-muted-foreground')} />
                              <div className="flex-1">
                                <p className="font-bold leading-tight">Full access</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">Can edit, comment, and invite other people.</p>
                              </div>
                              {invitePermission === 'edit' && <Check className="w-4 h-4 mt-0.5 text-cta shrink-0" strokeWidth={3} />}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                      <button
                        onClick={handleInvite}
                        disabled={isInviting || !inviteEmail.trim()}
                        className="px-3 py-1.5 text-[13px] font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                      >
                        {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Invite'}
                      </button>
                    </div>
                    {inviteError && (
                      <p className="mt-2 text-[11px] text-red-400/90 leading-snug">{inviteError}</p>
                    )}
                  </div>

                  {/* People with access */}
                  <div className="p-3 border-b border-border/40 max-h-[220px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                      {currentUser && (
                        <div className="flex items-center gap-2.5">
                          {currentUser.avatar ? (
                            <img src={currentUser.avatar} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[11px] font-bold text-accent shrink-0 uppercase">
                              {(currentUser.name || currentUser.email)[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-foreground truncate">
                              {currentUser.name || currentUser.email.split('@')[0]} <span className="text-muted">(You)</span>
                            </p>
                            <p className="text-[11px] text-muted truncate">{currentUser.email}</p>
                          </div>
                          <span className="text-[11px] text-muted shrink-0">Full access</span>
                        </div>
                      )}
                      {shares.map((share) => {
                        const displayName = share.full_name?.trim() || share.email.split('@')[0];
                        const initial = (share.full_name?.trim() || share.email)[0]?.toUpperCase() || '?';
                        // Member = registered user inside this workspace.
                        // Guest = either external email with no Nexus account
                        // or a registered user from a different workspace.
                        const subline = share.is_member
                          ? share.email
                          : share.is_registered
                          ? `${share.email} · Guest`
                          : `${share.email} · Email invite`;
                        return (
                          <div key={share.id} className="flex items-center gap-2.5">
                            {share.avatar_url ? (
                              <img src={share.avatar_url} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                            ) : (
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 uppercase",
                                share.is_member
                                  ? "bg-cta/10 text-cta"
                                  : "bg-foreground/10 text-foreground/60"
                              )}>
                                {initial}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[13px] text-foreground truncate">{displayName}</p>
                                <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                                  share.is_member
                                    ? "bg-cta/10 text-cta"
                                    : "bg-amber-500/10 text-amber-400"
                                )}>
                                  {share.is_member ? 'Member' : 'Guest'}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted truncate">{subline}</p>
                            </div>
                            <span
                              title={share.permission === 'edit' || share.permission === 'full' ? 'Full access' : 'View only'}
                              className="flex items-center gap-1 text-[11px] text-muted shrink-0"
                            >
                              {share.permission === 'edit' || share.permission === 'full' ? (
                                <><Pencil className="w-3 h-3" /> Edit</>
                              ) : (
                                <><Eye className="w-3 h-3" /> View</>
                              )}
                            </span>
                            <button
                              onClick={() => handleRemoveShare(share.email)}
                              className="p-0.5 rounded hover:bg-hover text-muted hover:text-red-400 transition-colors cursor-pointer shrink-0"
                              aria-label={`Remove ${displayName}`}
                              title="Remove access"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                      {shares.length === 0 && (
                        <p className="text-[12px] text-muted/70 italic px-1">
                          No one’s been invited yet. Add an email above to share this page.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* General access */}
                  <div className="p-3 border-b border-border/40">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">General access</p>
                    <button
                      onClick={handleTogglePublic}
                      disabled={isTogglingPublic}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-foreground/[0.03] transition-colors cursor-pointer"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        isPublic ? "bg-green-500/10 text-green-500" : "bg-foreground/[0.06] text-muted"
                      )}>
                        {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[13px] font-medium text-foreground">
                          {isPublic ? 'Anyone with the link' : 'Only invited people'}
                        </p>
                        <p className="text-[11px] text-muted">
                          {isPublic ? 'Anyone on the internet with the link can view' : 'Only people you invite can access this page'}
                        </p>
                      </div>
                      {isTogglingPublic && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted shrink-0" />}
                    </button>
                  </div>

                  {/* Copy link */}
                  <div className="p-3 flex items-center justify-end">
                    <button
                      onClick={handleCopyLink}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
                        isCopied
                          ? "bg-green-500/10 text-green-500"
                          : "bg-foreground/[0.06] text-foreground/70 hover:bg-foreground/[0.1]"
                      )}
                    >
                      {isCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><LinkIcon className="w-3.5 h-3.5" /> Copy link</>}
                    </button>
                  </div>
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

      <div className="w-full max-w-full md:max-w-4xl mx-auto px-6 flex flex-col relative">
        {/* Buttons appearing on hover — show Add icon if no icon, show Add cover if no cover */}
        {(!icon || !coverUrl) && (
          <div className="flex items-center gap-3 opacity-0 group-hover/header:opacity-100 transition-opacity mb-4 -ml-1">
            {!icon && (
              <button
                onClick={() => setIsIconPickerOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 text-muted hover:bg-hover rounded transition-all text-[14px] font-medium cursor-pointer"
              >
                <Smile className="w-4 h-4 opacity-50" /> Add icon
              </button>
            )}
            {!coverUrl && (
              <button
                onClick={() => setIsCoverPickerOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 text-muted hover:bg-hover rounded transition-all text-[14px] font-medium cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 opacity-50" /> Add cover
              </button>
            )}
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

        {/* Cover Picker */}
        {isCoverPickerOpen && (
          <div className="absolute z-50 top-0 left-0 right-0 bg-background border border-border rounded-xl shadow-popover p-4 animate-in zoom-in-95 duration-150 ring-1 ring-black/5 max-w-lg mx-auto mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">Choose a cover</h3>
              <button onClick={() => setIsCoverPickerOpen(false)} className="p-1 hover:bg-hover rounded transition-colors cursor-pointer text-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload button */}
            <button
              onClick={() => coverFileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-lg border border-dashed border-border text-sm text-muted hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload from device
            </button>
            <input
              ref={coverFileRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />

            {/* Gallery */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-2">Gallery</p>
            <div className="grid grid-cols-4 gap-1.5 max-h-[240px] overflow-y-auto custom-scrollbar">
              {COVER_GALLERY.map((cover) => (
                <button
                  key={cover.label}
                  onClick={() => setCover(cover.url)}
                  className="relative aspect-[16/9] rounded-lg overflow-hidden border border-border/30 hover:border-accent/50 transition-all cursor-pointer group/thumb"
                  title={cover.label}
                >
                  {cover.url.startsWith('linear-gradient') ? (
                    <div className="w-full h-full" style={{ background: cover.url }} />
                  ) : (
                    <img src={cover.url} alt={cover.label} className="w-full h-full object-cover" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors flex items-end p-1">
                    <span className="text-[9px] text-white font-medium opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow-sm">{cover.label}</span>
                  </div>
                </button>
              ))}
            </div>
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
