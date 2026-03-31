/**
 * Generates a Yjs binary snapshot from a Tiptap JSON document.
 * Uses a headless Tiptap Editor with the Collaboration extension to
 * convert ProseMirror content into the Y.Doc format NexusEditor reads.
 *
 * Client-side only — requires a browser environment.
 */

import * as Y from 'yjs';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';

export function generateYjsSnapshot(tiptapJson: Record<string, unknown>): number[] {
  const ydoc = new Y.Doc();

  // A detached element is enough — we never render to the page
  const el = document.createElement('div');

  const editor = new Editor({
    element: el,
    extensions: [
      StarterKit.configure({ history: false } as any),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Collaboration.configure({ document: ydoc }),
    ],
    content: tiptapJson as any,
    editable: false,
  });

  const snapshot = Array.from(Y.encodeStateAsUpdate(ydoc));
  editor.destroy();

  return snapshot;
}
