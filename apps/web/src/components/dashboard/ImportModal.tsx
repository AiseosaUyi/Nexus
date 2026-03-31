'use client';

import React, { useState, useCallback, useRef, useTransition } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Lock,
  Users,
  Plus,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createNode,
  updateYjsSnapshot,
  importFromURL,
  createTeamspace,
} from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { markdownToTiptap, extractMarkdownTitle } from '@/lib/markdownToTiptap';
import { htmlToTiptap } from '@/lib/htmlToTiptap';
import { generateYjsSnapshot } from '@/lib/generateYjsSnapshot';
import { Teamspace } from '@nexus/api/schema';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'file' | 'url';

interface QueuedFile {
  id: string;
  name: string;
  title: string;
  tiptapJson: { type: string; content?: unknown[] };
  status: 'pending' | 'importing' | 'done' | 'error';
  statusLabel?: string;
  progress?: number;
  nodeId?: string;
  error?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  workspaceSlug: string;
  teamspaces: Teamspace[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

function extractFirstH1(html: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]*>/g, '').trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportModal({
  isOpen,
  onClose,
  businessId,
  workspaceSlug,
  teamspaces: initialTeamspaces,
}: Props) {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('file');
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isFetching, startFetch] = useTransition();
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlPreview, setUrlPreview] = useState<{ title: string; html: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Destination (teamspace) selection
  const [teamspaces, setTeamspaces] = useState<Teamspace[]>(initialTeamspaces);
  const [destination, setDestination] = useState<'private' | string>('private'); // 'private' or teamspace id
  const [isCreatingTeamspace, setIsCreatingTeamspace] = useState(false);
  const [newTeamspaceName, setNewTeamspaceName] = useState('');
  const [isCreatingTs, startCreateTs] = useTransition();

  // ── File processing ──────────────────────────────────────────────────────

  const processMarkdownFile = useCallback(
    async (filename: string, content: string): Promise<QueuedFile> => {
      const title = extractMarkdownTitle(content) || filename.replace(/\.md$/i, '');
      const tiptapJson = markdownToTiptap(content);
      return { id: uid(), name: filename, title, tiptapJson, status: 'pending' };
    },
    []
  );

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const newItems: QueuedFile[] = [];

      for (const file of fileArr) {
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'md') {
          const text = await file.text();
          newItems.push(await processMarkdownFile(file.name, text));
        } else if (ext === 'zip') {
          try {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(file);
            for (const [path, zipEntry] of Object.entries(zip.files)) {
              if (zipEntry.dir || !path.endsWith('.md')) continue;
              const text = await zipEntry.async('string');
              const basename = path.split('/').pop() ?? path;
              newItems.push(await processMarkdownFile(basename, text));
            }
          } catch {
            newItems.push({
              id: uid(), name: file.name, title: file.name,
              tiptapJson: { type: 'doc', content: [] },
              status: 'error', error: 'Failed to read ZIP file',
            });
          }
        }
      }

      if (newItems.length > 0) setQueue((prev) => [...prev, ...newItems]);
    },
    [processMarkdownFile]
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(e.target.files);
      e.target.value = '';
    },
    [processFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  // ── URL fetch ────────────────────────────────────────────────────────────

  const handleFetchURL = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlError(null);
    setUrlPreview(null);
    startFetch(async () => {
      const result = await importFromURL(url);
      if (result.error) { setUrlError(result.error); return; }
      setUrlPreview({ title: result.title, html: result.html });
    });
  }, [urlInput]);

  const handleAddURL = useCallback(() => {
    if (!urlPreview) return;
    const pageTitle = extractFirstH1(urlPreview.html) || urlPreview.title || 'Imported Page';
    const tiptapJson = htmlToTiptap(urlPreview.html);
    setQueue((prev) => [
      ...prev,
      { id: uid(), name: urlInput.trim(), title: pageTitle, tiptapJson, status: 'pending' },
    ]);
    setUrlInput(''); setUrlPreview(null); setUrlError(null);
    setTab('file');
  }, [urlPreview, urlInput]);

  // ── Teamspace creation ───────────────────────────────────────────────────

  const handleCreateTeamspace = useCallback(() => {
    const name = newTeamspaceName.trim();
    if (!name) return;
    startCreateTs(async () => {
      const result = await createTeamspace({ business_id: businessId, name });
      if (result.data) {
        setTeamspaces((prev) => [...prev, result.data]);
        setDestination(result.data.id);
      }
      setIsCreatingTeamspace(false);
      setNewTeamspaceName('');
    });
  }, [newTeamspaceName, businessId]);

  // ── Close ────────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    setQueue([]); setUrlInput(''); setUrlPreview(null); setUrlError(null);
    setIsCreatingTeamspace(false); setNewTeamspaceName('');
    onClose();
  }, [onClose]);

  // ── Import ───────────────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    const pending = queue.filter((f) => f.status === 'pending');
    if (!pending.length) return;
    setIsImporting(true);

    let allSucceeded = true;

    for (const item of pending) {
      // Step 1: Initialize
      setQueue((prev) => prev.map((f) => f.id === item.id ? {
        ...f, status: 'importing', statusLabel: 'Importing...', progress: 30
      } : f));

      try {
        // Step 2: Create Node
        const nodeResult = await createNode({
          business_id: businessId,
          type: 'document',
          title: item.title,
          teamspace_id: destination === 'private' ? null : destination,
        });

        if (!nodeResult.data) throw new Error(nodeResult.error ?? 'Failed to create node');

        // Step 3: Generating Snapshot
        setQueue((prev) => prev.map((f) => f.id === item.id ? {
          ...f, statusLabel: 'Syncing content...', progress: 70
        } : f));

        const snapshot = generateYjsSnapshot(item.tiptapJson as Record<string, unknown>);
        await updateYjsSnapshot(nodeResult.data.id, snapshot);

        // Step 4: Done
        window.dispatchEvent(new CustomEvent('nexus:node-created', { detail: { node: nodeResult.data } }));
        setQueue((prev) => prev.map((f) => f.id === item.id ? {
          ...f, status: 'done', statusLabel: 'Complete', progress: 100, nodeId: nodeResult.data!.id
        } : f));
      } catch (err: unknown) {
        allSucceeded = false;
        const message = err instanceof Error ? err.message : String(err);
        setQueue((prev) => prev.map((f) => f.id === item.id ? {
          ...f, status: 'error', error: message, statusLabel: 'Failed', progress: 0
        } : f));
      }
    }

    setIsImporting(false);
    router.refresh();

    if (allSucceeded) {
      handleClose();
    }
  }, [queue, businessId, destination, router, handleClose]);

  const pendingCount = queue.filter((f) => f.status === 'pending').length;
  const doneItems = queue.filter((f) => f.status === 'done');
  const allDone = queue.length > 0 && queue.every((f) => f.status === 'done' || f.status === 'error');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg mx-4 bg-sidebar border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Import</h2>
            <p className="text-[12px] text-muted mt-0.5">Bring content from Notion or any web page</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border shrink-0">
          {(['file', 'url'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 text-[13px] font-medium transition-colors cursor-pointer',
                tab === t ? 'text-foreground border-b-2 border-cta -mb-px' : 'text-muted hover:text-foreground/70'
              )}
            >
              {t === 'file' ? 'File Upload' : 'Web URL'}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {tab === 'file' && (
            <div className="p-5 space-y-4">
              {/* Drop zone */}
              <div
                data-testid="import-dropzone"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                  isDragging ? 'border-cta/60 bg-cta/[0.05]' : 'border-border hover:border-border/80 hover:bg-foreground/[0.02]'
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] flex items-center justify-center">
                  <Upload className="w-5 h-5 text-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-medium text-foreground/70">
                    Drop files here or <span className="text-cta">browse</span>
                  </p>
                  <p className="text-[11px] text-muted mt-1">Supports .md files and Notion export .zip</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                data-testid="import-file-input"
                type="file"
                accept=".md,.zip"
                multiple
                className="hidden"
                onChange={onFileInputChange}
              />

              {/* Queue */}
              {queue.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted px-0.5">
                    {queue.length} page{queue.length !== 1 ? 's' : ''} queued
                  </p>
                  <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-foreground/[0.03] border border-border/50"
                      >
                        <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-medium text-foreground truncate">{item.title}</p>
                            {item.status === 'importing' && (
                              <span className="text-[10px] font-bold text-cta uppercase tracking-widest">{item.statusLabel}</span>
                            )}
                          </div>
                          
                          {/* Progress bar for importing items */}
                          {item.status === 'importing' && (
                            <div className="mt-1.5 h-1 w-full bg-foreground/[0.05] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-cta transition-all duration-300"
                                style={{ width: `${item.progress ?? 0}%` }}
                              />
                            </div>
                          )}
                          {!item.statusLabel && (
                             <p className="text-[11px] text-muted truncate">{item.name}</p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => setQueue((prev) => prev.filter((f) => f.id !== item.id))}
                              className="w-5 h-5 rounded flex items-center justify-center text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          {item.status === 'importing' && <Loader2 className="w-4 h-4 text-cta animate-spin" />}
                          {item.status === 'done' && (
                            <a href={`/w/${workspaceSlug}/n/${item.nodeId}`} onClick={handleClose} className="text-green-400">
                              <CheckCircle2 className="w-4 h-4" />
                            </a>
                          )}
                          {item.status === 'error' && (
                            <span title={item.error}><AlertCircle className="w-4 h-4 text-red-400" /></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {doneItems.length > 0 && (
                <div className="space-y-1">
                  {doneItems.map((item) => (
                    <a key={item.id} href={`/w/${workspaceSlug}/n/${item.nodeId}`} onClick={handleClose}
                      className="flex items-center gap-2 text-[12px] text-cta hover:underline">
                      <ExternalLink className="w-3 h-3" />
                      Open &ldquo;{item.title}&rdquo;
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'url' && (
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground/60">Page URL</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/[0.04] border border-border focus-within:border-cta/40 transition-colors">
                    <LinkIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                    <input
                      data-testid="import-url-input"
                      type="url"
                      placeholder="https://example.com/article"
                      value={urlInput}
                      onChange={(e) => { setUrlInput(e.target.value); setUrlPreview(null); setUrlError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleFetchURL(); }}
                      className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted/50 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleFetchURL}
                    disabled={!urlInput.trim() || isFetching}
                    className="px-3 py-2 text-[13px] font-medium rounded-lg bg-foreground/[0.06] hover:bg-hover text-foreground/70 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
                  </button>
                </div>
                {urlError && (
                  <p className="text-[12px] text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{urlError}
                  </p>
                )}
              </div>

              {urlPreview && (
                <div className="rounded-xl border border-border/60 bg-foreground/[0.02] overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/40">
                    <p className="text-[13px] font-semibold text-foreground truncate">
                      {extractFirstH1(urlPreview.html) || urlPreview.title}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5 truncate">{urlInput}</p>
                  </div>
                  <div className="px-4 py-3">
                    <button
                      onClick={handleAddURL}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />Add to import queue
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted/60 leading-relaxed">
                Nexus fetches the page server-side and converts it to a Nexus document.
                Best results with articles and blog posts.
              </p>
            </div>
          )}

          {/* ── Destination picker ── */}
          <div className="px-5 pb-5 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Destination</p>

            {/* Private */}
            <button
              data-testid="destination-private"
              onClick={() => setDestination('private')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer text-left',
                destination === 'private'
                  ? 'border-cta/40 bg-cta/[0.06] text-foreground'
                  : 'border-border/50 bg-transparent hover:bg-foreground/[0.03] text-foreground/70'
              )}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[13px] font-medium flex-1">Private</span>
              {destination === 'private' && <Check className="w-3.5 h-3.5 text-cta shrink-0" />}
            </button>

            {/* Teamspaces */}
            {teamspaces.map((ts) => (
              <button
                key={ts.id}
                data-testid={`destination-ts-${ts.id}`}
                onClick={() => setDestination(ts.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer text-left',
                  destination === ts.id
                    ? 'border-cta/40 bg-cta/[0.06] text-foreground'
                    : 'border-border/50 bg-transparent hover:bg-foreground/[0.03] text-foreground/70'
                )}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[13px] font-medium flex-1">{ts.icon ? `${ts.icon} ` : ''}{ts.name}</span>
                {destination === ts.id && <Check className="w-3.5 h-3.5 text-cta shrink-0" />}
              </button>
            ))}

            {/* Create new teamspace */}
            {isCreatingTeamspace ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cta/30 bg-cta/[0.04]">
                <Users className="w-3.5 h-3.5 text-muted shrink-0" />
                <input
                  autoFocus
                  data-testid="new-teamspace-input"
                  type="text"
                  placeholder="Teamspace name…"
                  value={newTeamspaceName}
                  onChange={(e) => setNewTeamspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTeamspace();
                    if (e.key === 'Escape') { setIsCreatingTeamspace(false); setNewTeamspaceName(''); }
                  }}
                  className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted/50 outline-none"
                />
                {isCreatingTs
                  ? <Loader2 className="w-3.5 h-3.5 text-cta animate-spin shrink-0" />
                  : (
                    <button onClick={handleCreateTeamspace}
                      className="text-[11px] font-bold text-cta hover:text-cta/70 cursor-pointer shrink-0">
                      Create
                    </button>
                  )}
              </div>
            ) : (
              <button
                data-testid="create-teamspace-btn"
                onClick={() => setIsCreatingTeamspace(true)}
                className="flex items-center gap-2 text-[12px] text-muted hover:text-foreground transition-colors cursor-pointer w-full px-1"
              >
                <Plus className="w-3.5 h-3.5" />
                New teamspace
              </button>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border shrink-0 bg-sidebar">
          <button onClick={handleClose} className="px-3 py-1.5 text-[13px] text-muted hover:text-foreground transition-colors cursor-pointer">
            {allDone ? 'Close' : 'Cancel'}
          </button>

          {!allDone && (
            <button
              data-testid="import-submit-btn"
              onClick={handleImport}
              disabled={pendingCount === 0 || isImporting}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer',
                pendingCount > 0 && !isImporting
                  ? 'bg-cta text-white hover:bg-cta/90'
                  : 'bg-foreground/[0.06] text-foreground/30 cursor-not-allowed'
              )}
            >
              {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isImporting ? 'Importing…' : pendingCount > 0
                ? `Import ${pendingCount} page${pendingCount !== 1 ? 's' : ''}`
                : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
