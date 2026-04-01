/**
 * Generates a Yjs binary snapshot from a Tiptap JSON document.
 *
 * Uses getSchema to build a ProseMirror schema from extensions, then
 * Node.fromJSON to parse the Tiptap JSON into a PM doc — no DOM required.
 * prosemirrorToYDoc writes the doc into a Y.Doc at field 'default',
 * matching the Tiptap Collaboration extension's default fragment name.
 */

import * as Y from 'yjs';
import { getSchema } from '@tiptap/core';
import { Node as PMNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { prosemirrorToYDoc } from 'y-prosemirror';

const SNAPSHOT_EXTENSIONS = [
  StarterKit.configure({ history: false } as any),
  TaskList,
  TaskItem.configure({ nested: true }),
  Link.configure({ openOnClick: false }),
  TiptapTable,
  TableRow,
  TableHeader,
  TableCell,
];

const schema = getSchema(SNAPSHOT_EXTENSIONS);

export function generateYjsSnapshot(tiptapJson: Record<string, unknown>): number[] {
  const pmDoc = PMNode.fromJSON(schema, tiptapJson);
  const ydoc = prosemirrorToYDoc(pmDoc, 'default');
  return Array.from(Y.encodeStateAsUpdate(ydoc));
}
