'use client';

import { useMemo } from 'react';
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
import * as Y from 'yjs';

interface ReadOnlyEditorProps {
  content?: any;
  snapshot?: string | null;
}

export default function ReadOnlyEditor({ content, snapshot }: ReadOnlyEditorProps) {
  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    if (snapshot) {
      try {
        const raw: unknown = snapshot;
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

        if (bytes && bytes.length > 0) {
          Y.applyUpdate(doc, bytes);
        }
      } catch (e) {
        console.error('[ReadOnlyEditor] Failed to decode snapshot:', e);
      }
    }
    return doc;
  }, [snapshot]);

  const hasSnapshot = !!snapshot;

  const extensions = useMemo(() => {
    const base = [
      StarterKit.configure({ history: hasSnapshot ? false : undefined } as any),
      Link.configure({ openOnClick: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TiptapTable.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      Typography,
      HorizontalRule,
      Youtube,
      Details,
      DetailsSummary,
      DetailsContent,
    ];

    if (hasSnapshot) {
      // @ts-ignore — Tiptap v2/v3 peer mismatch
      base.push(Collaboration.configure({ document: ydoc }));
    }

    return base;
  }, [hasSnapshot, ydoc]);

  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions,
    content: hasSnapshot ? undefined : content,
  });

  return (
    <EditorContent
      editor={editor}
      className="tiptap max-w-none focus:outline-none"
    />
  );
}
