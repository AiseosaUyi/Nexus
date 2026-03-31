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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateYjsSnapshot, importFromURL } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { markdownToTiptap } from '@/lib/markdownToTiptap';
import { htmlToTiptap } from '@/lib/htmlToTiptap';
import { generateYjsSnapshot } from '@/lib/generateYjsSnapshot';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'file' | 'url';
type Status = 'idle' | 'processing' | 'done' | 'error';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PageImportModal({ isOpen, onClose, nodeId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isFetching, startFetch] = useTransition();
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlPreview, setUrlPreview] = useState<{ title: string; html: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importContent = useCallback(
    async (tiptapJson: Record<string, unknown>) => {
      setStatus('processing');
      setErrorMsg(null);
      try {
        const snapshot = generateYjsSnapshot(tiptapJson);
        await updateYjsSnapshot(nodeId, snapshot);
        setStatus('done');
        // Reload the page so NexusEditor picks up the new snapshot
        router.refresh();
        setTimeout(onClose, 800);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [nodeId, router, onClose]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setStatus('processing');
      setErrorMsg(null);
      try {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'md') {
          const text = await file.text();
          const tiptapJson = markdownToTiptap(text) as Record<string, unknown>;
          await importContent(tiptapJson);
        } else if (ext === 'zip') {
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(file);
          const mdFiles = Object.entries(zip.files).filter(([p, e]) => !e.dir && p.endsWith('.md'));
          if (mdFiles.length === 0) throw new Error('No Markdown files found in ZIP');
          // Use the first .md file found
          const [, entry] = mdFiles[0];
          const text = await entry.async('string');
          const tiptapJson = markdownToTiptap(text) as Record<string, unknown>;
          await importContent(tiptapJson);
        } else {
          throw new Error('Unsupported file type — use .md or .zip');
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [importContent]
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFetchURL = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlError(null); setUrlPreview(null);
    startFetch(async () => {
      const result = await importFromURL(url);
      if (result.error) { setUrlError(result.error); return; }
      setUrlPreview({ title: result.title, html: result.html });
    });
  }, [urlInput]);

  const handleImportURL = useCallback(async () => {
    if (!urlPreview) return;
    const tiptapJson = htmlToTiptap(urlPreview.html) as Record<string, unknown>;
    await importContent(tiptapJson);
  }, [urlPreview, importContent]);

  const handleClose = useCallback(() => {
    setTab('file'); setStatus('idle'); setErrorMsg(null);
    setUrlInput(''); setUrlPreview(null); setUrlError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md mx-4 bg-sidebar border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Import into page</h2>
            <p className="text-[12px] text-muted mt-0.5">Replace this page&apos;s content with imported content</p>
          </div>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-muted hover:text-foreground transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status overlay */}
        {status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-7 h-7 text-cta animate-spin" />
            <p className="text-[13px] text-muted">Importing content…</p>
          </div>
        )}
        {status === 'done' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle2 className="w-7 h-7 text-green-400" />
            <p className="text-[13px] text-foreground font-medium">Content imported successfully</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 px-6">
            <AlertCircle className="w-7 h-7 text-red-400" />
            <p className="text-[13px] text-red-400 text-center">{errorMsg}</p>
            <button onClick={() => setStatus('idle')} className="text-[12px] text-muted hover:text-foreground transition-colors cursor-pointer">
              Try again
            </button>
          </div>
        )}

        {status === 'idle' && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border">
              {(['file', 'url'] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 py-2.5 text-[13px] font-medium transition-colors cursor-pointer',
                    tab === t ? 'text-foreground border-b-2 border-cta -mb-px' : 'text-muted hover:text-foreground/70'
                  )}
                >
                  {t === 'file' ? 'File' : 'URL'}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {tab === 'file' && (
                <>
                  <div
                    data-testid="page-import-dropzone"
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
                        Drop a file or <span className="text-cta">browse</span>
                      </p>
                      <p className="text-[11px] text-muted mt-1">.md files and Notion .zip exports</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    data-testid="page-import-file-input"
                    type="file"
                    accept=".md,.zip"
                    className="hidden"
                    onChange={onFileInputChange}
                  />
                  <p className="text-[11px] text-muted/60 leading-relaxed text-center">
                    This will replace the current page content.
                  </p>
                </>
              )}

              {tab === 'url' && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/[0.04] border border-border focus-within:border-cta/40 transition-colors">
                        <LinkIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                        <input
                          data-testid="page-import-url-input"
                          type="url"
                          placeholder="https://example.com/article"
                          value={urlInput}
                          onChange={(e) => { setUrlInput(e.target.value); setUrlPreview(null); setUrlError(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleFetchURL(); }}
                          className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted/50 outline-none"
                        />
                      </div>
                      <button onClick={handleFetchURL} disabled={!urlInput.trim() || isFetching}
                        className="px-3 py-2 text-[13px] font-medium rounded-lg bg-foreground/[0.06] hover:bg-hover text-foreground/70 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5">
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
                        <p className="text-[13px] font-semibold text-foreground truncate">{urlPreview.title}</p>
                        <p className="text-[11px] text-muted mt-0.5 truncate">{urlInput}</p>
                      </div>
                      <div className="px-4 py-3">
                        <button onClick={handleImportURL}
                          className="flex items-center gap-2 text-[13px] font-medium text-cta hover:underline cursor-pointer">
                          Import this page
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
