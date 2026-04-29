'use client';

// Editable single-page surface for invited Guests with `permission` of
// 'edit' or 'full'. Shares ReadOnlyEditor's snapshot decoding + extension
// set, but flips `editable: true` and persists changes through the
// `save_yjs_snapshot` RPC. No sidebar, no comments, no nav — Guests stay
// on this one page and can't browse the rest of the workspace.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Typography } from '@tiptap/extension-typography';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Youtube } from '@tiptap/extension-youtube';
import { Details } from '@tiptap/extension-details';
import { DetailsContent } from '@tiptap/extension-details-content';
import { DetailsSummary } from '@tiptap/extension-details-summary';
import { useDebouncedCallback } from 'use-debounce';
import * as Y from 'yjs';
import { Loader2, Check } from 'lucide-react';

interface GuestEditorProps {
  nodeId: string;
  initialSnapshot?: string | null;
  userName: string;
}

export default function GuestEditor({ nodeId, initialSnapshot }: GuestEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    if (initialSnapshot) {
      try {
        const raw: unknown = initialSnapshot;
        let bytes: Uint8Array | null = null;
        if (typeof raw === 'string' && raw.length > 0) {
          const hexCandidate = raw.startsWith('\\x') ? raw.slice(2) : raw;
          if (hexCandidate.length > 0 && hexCandidate.length % 2 === 0 && /^[0-9a-f]+$/i.test(hexCandidate)) {
            bytes = new Uint8Array(hexCandidate.length / 2);
            for (let i = 0; i < bytes.length; i++) {
              bytes[i] = parseInt(hexCandidate.slice(i * 2, i * 2 + 2), 16);
            }
          } else {
            try {
              const binary = atob(raw);
              bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            } catch { /* not base64 */ }
          }
        }
        if (bytes && bytes.length > 0) Y.applyUpdate(doc, bytes);
      } catch (e) {
        console.error('[GuestEditor] Failed to decode snapshot:', e);
      }
    }
    return doc;
  }, [initialSnapshot]);

  const persist = useDebouncedCallback(async () => {
    setSaveStatus('saving');
    try {
      const update = Y.encodeStateAsUpdate(ydoc);
      const { updateYjsSnapshot } = await import('@/app/(dashboard)/w/[workspace_slug]/actions');
      const result = await updateYjsSnapshot(nodeId, Array.from(update));
      if ((result as { error?: string })?.error) {
        setSaveStatus('error');
        return;
      }
      setSaveStatus('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (err) {
      console.error('[GuestEditor] save failed:', err);
      setSaveStatus('error');
    }
  }, 1500);

  const editor = useEditor({
    editable: true,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ history: false } as any),
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TiptapTable.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: false, allowBase64: true }),
      Typography,
      HorizontalRule,
      Youtube,
      Details,
      DetailsSummary,
      DetailsContent,
      // @ts-ignore — Tiptap v2/v3 peer mismatch
      Collaboration.configure({ document: ydoc }),
    ],
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base lg:prose-lg focus:outline-none min-h-[400px] w-full max-w-none font-sans text-foreground selection:bg-accent/30',
      },
    },
    onUpdate: () => {
      persist();
    },
  }, [ydoc]);

  // Flush pending save on unmount so leaving the tab doesn't lose the last
  // few seconds of typing.
  useEffect(() => {
    return () => {
      persist.flush();
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, [persist]);

  return (
    <div className="relative">
      <div className="absolute right-0 -top-8 text-[11px] text-muted-foreground flex items-center gap-1.5 h-4">
        {saveStatus === 'saving' && (
          <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
        )}
        {saveStatus === 'saved' && (
          <><Check className="w-3 h-3 text-emerald-500" /> Saved</>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-400/90">Couldn’t save — check your connection.</span>
        )}
      </div>
      <EditorContent editor={editor} className="tiptap" />
    </div>
  );
}
