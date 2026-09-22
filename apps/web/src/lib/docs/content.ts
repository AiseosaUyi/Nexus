// Server-side document access for the Nexus Brain MCP — the piece Nexus
// has never had before. Pure functions with unit tests; the risky part
// (diffing markdown into an existing Yjs doc headlessly, with no browser
// and no live ProseMirror EditorView) is isolated into diffAppendIntoDoc()
// below and spiked/tested in content.diff.test.ts BEFORE the rest of this
// file's DB-touching functions were built on top of it, per the eng
// review's "restructure into a spike-then-build checkpoint" fix.

import * as Y from 'yjs';
import { getSchema } from '@tiptap/core';
import { Node as PMNode } from '@tiptap/pm/model';
import type { SupabaseClient } from '@supabase/supabase-js';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Details } from '@tiptap/extension-details';
import { DetailsContent } from '@tiptap/extension-details-content';
import { DetailsSummary } from '@tiptap/extension-details-summary';
import { prosemirrorToYXmlFragment, yDocToProsemirrorJSON } from 'y-prosemirror';
import { Callout } from '@/components/editor/extensions/Callout';
import { Audio } from '@/components/editor/extensions/Audio';
import { File as FileExtension } from '@/components/editor/extensions/File';
import { PageLink } from '@/components/editor/extensions/PageLink';
import { Comment } from '@/components/editor/extensions/Comment';
import { markdownToProseMirror, proseMirrorToMarkdown, type TiptapDoc, type TiptapJSONNode } from './markdown';

// Extends generateYjsSnapshot.ts's SNAPSHOT_EXTENSIONS with the custom node
// specs NexusEditor renders that import-time snapshot generation never
// needed to round-trip: Callout, Audio, File, PageLink, Details*, Comment.
// All confirmed DOM-free at schema-construction time (grepped every one —
// plain Node.create()/Mark.create() with only addAttributes/parseHTML/
// renderHTML, no addNodeView, no ReactNodeViewRenderer) before relying on
// this. Without these, snapshotToProseMirrorJSON would throw on a doc
// containing any of them, and PMNode.fromJSON would silently drop them on
// the way back in.
const SNAPSHOT_EXTENSIONS = [
  StarterKit.configure({ history: false } as any),
  TaskList,
  TaskItem.configure({ nested: true }),
  Link.configure({ openOnClick: false }),
  TiptapTable,
  TableRow,
  TableHeader,
  TableCell,
  Details,
  DetailsSummary,
  DetailsContent,
  Callout,
  Audio,
  FileExtension,
  PageLink,
  Comment,
];

const schema = getSchema(SNAPSHOT_EXTENSIONS);

const EMPTY_DOC: TiptapDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Handles every shape PostgREST/Supabase can hand back for a bytea
 * column: a "\x..." hex string, base64, a plain array of byte values, or
 * an actual Uint8Array. Mirrors NexusEditor.tsx's own decode branches. */
export function decodeSnapshot(raw: string | Uint8Array | number[] | null | undefined): Uint8Array | null {
  if (!raw) return null;
  if (raw instanceof Uint8Array) return raw.length > 0 ? raw : null;
  if (Array.isArray(raw)) return raw.length > 0 ? new Uint8Array(raw) : null;
  if (typeof raw === 'string' && raw.length > 0) {
    const hexCandidate = raw.startsWith('\\x') ? raw.slice(2) : raw;
    if (hexCandidate.length > 0 && hexCandidate.length % 2 === 0 && /^[0-9a-f]+$/i.test(hexCandidate)) {
      const bytes = new Uint8Array(hexCandidate.length / 2);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hexCandidate.slice(i * 2, i * 2 + 2), 16);
      return bytes.length > 0 ? bytes : null;
    }
    try {
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.length > 0 ? bytes : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function snapshotToProseMirrorJSON(bytes: Uint8Array): TiptapDoc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, bytes);
  return yDocToProsemirrorJSON(doc, 'default') as TiptapDoc;
}

function appendContent(current: TiptapDoc, toAppend: TiptapDoc, opts?: { heading?: string; timestamp?: boolean }): TiptapDoc {
  const prefix: TiptapJSONNode[] = [];
  if (opts?.heading) {
    prefix.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: opts.heading }] });
  }
  if (opts?.timestamp) {
    prefix.push({
      type: 'paragraph',
      content: [{ type: 'text', text: new Date().toISOString(), marks: [{ type: 'italic' }] }],
    });
  }
  const currentContent = current.content?.length ? current.content : [];
  // An empty doc is just a lone empty paragraph — drop it rather than
  // keeping a stray blank line above the appended content.
  const base =
    currentContent.length === 1 && currentContent[0].type === 'paragraph' && !currentContent[0].content?.length
      ? []
      : currentContent;
  return { type: 'doc', content: [...base, ...prefix, ...(toAppend.content ?? [])] };
}

export interface DiffAppendResult {
  /** Full updated state, hex-ready for save_yjs_snapshot. */
  snapshot: Uint8Array;
  /** Just the incremental change, for the Realtime broadcast — lets an
   * open editor merge this like any other peer's update instead of
   * re-syncing its whole document. */
  delta: Uint8Array;
}

/**
 * THE SPIKED PART. Diffs `nextJSON` into an existing Y.Doc (or a fresh one
 * when `existingSnapshot` is null) via prosemirrorToYXmlFragment, which
 * calls the same incremental sync-plugin machinery a live editor uses
 * (confirmed by reading y-prosemirror's compiled source, not assumed from
 * the .d.ts alone) — it diffs into the given Y.XmlFragment rather than
 * clobbering it, so existing CRDT history survives. See
 * content.diff.test.ts for the round-trip + delta-non-emptiness proof this
 * was checkpointed against before anything else in this file was built.
 */
export function diffAppendIntoDoc(existingSnapshot: Uint8Array | null, nextJSON: TiptapDoc): DiffAppendResult {
  const ydoc = new Y.Doc();
  if (existingSnapshot) Y.applyUpdate(ydoc, existingSnapshot);

  const before = Y.encodeStateVector(ydoc);
  const pmDoc = PMNode.fromJSON(schema, nextJSON);
  prosemirrorToYXmlFragment(pmDoc, ydoc.getXmlFragment('default'));
  const delta = Y.encodeStateAsUpdate(ydoc, before);
  const snapshot = Y.encodeStateAsUpdate(ydoc);

  return { snapshot, delta };
}

export interface NodeRow {
  id: string;
  business_id: string;
  title: string;
  type: string;
  parent_id: string | null;
  teamspace_id: string | null;
  yjs_snapshot: unknown;
}

export interface ReadNodeResult {
  node: NodeRow;
  markdown: string;
  source: 'snapshot' | 'blocks' | 'empty';
}

export class DocNotFoundError extends Error {}

async function fetchNode(db: SupabaseClient, businessId: string, nodeId: string): Promise<NodeRow> {
  const { data, error } = await db
    .from('nodes')
    .select('id, business_id, title, type, parent_id, teamspace_id, yjs_snapshot')
    .eq('id', nodeId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw new Error(`fetchNode: ${error.message}`);
  if (!data) throw new DocNotFoundError(`Node ${nodeId} not found in this workspace`);
  return data as NodeRow;
}

/** Walks the blocks table's denormalised content when there's no usable
 * snapshot yet (e.g. a node created before Yjs, or one whose snapshot
 * write failed silently — see CLAUDE.md's documented failure mode). */
async function readFromBlocks(db: SupabaseClient, nodeId: string): Promise<string> {
  const { data } = await db.from('blocks').select('content').eq('node_id', nodeId).order('position', { ascending: true });
  if (!data?.length) return '';
  const doc: TiptapDoc = {
    type: 'doc',
    content: data.map((b: { content: { tiptapType?: string; attrs?: Record<string, unknown>; content?: TiptapJSONNode[] } }) => ({
      type: b.content?.tiptapType ?? 'paragraph',
      attrs: b.content?.attrs,
      content: b.content?.content,
    })),
  };
  return proseMirrorToMarkdown(doc);
}

export async function readNode(db: SupabaseClient, businessId: string, nodeId: string): Promise<ReadNodeResult> {
  const node = await fetchNode(db, businessId, nodeId);
  const bytes = decodeSnapshot(node.yjs_snapshot as string | Uint8Array | number[] | null);
  if (bytes) {
    const json = snapshotToProseMirrorJSON(bytes);
    return { node, markdown: proseMirrorToMarkdown(json), source: 'snapshot' };
  }
  const markdown = await readFromBlocks(db, nodeId);
  return { node, markdown, source: markdown ? 'blocks' : 'empty' };
}

const BLOCK_TYPE_MAP: Record<string, string> = {
  bulletList: 'list',
  orderedList: 'list',
  taskList: 'list',
  blockquote: 'quote',
  codeBlock: 'code',
  horizontalRule: 'divider',
};
const BLOCK_SKIP_TYPES = new Set(['listItem', 'taskItem', 'tableRow', 'tableCell', 'tableHeader']);

/** Same typeMap/skipTypes as NexusEditor.tsx's debouncedBlockSync, applied
 * server-side. `blocks` is a denormalised search/display copy, not a
 * source of truth (per CLAUDE.md) — recomputing it from scratch on every
 * server-side write is simpler and correct enough than trying to
 * preserve individual block ids for unchanged content. */
async function syncBlocksForNode(db: SupabaseClient, nodeId: string, doc: TiptapDoc): Promise<void> {
  await db.from('blocks').delete().eq('node_id', nodeId);
  const rows = (doc.content ?? [])
    .filter((node) => !BLOCK_SKIP_TYPES.has(node.type))
    .map((node, index) => ({
      node_id: nodeId,
      type: BLOCK_TYPE_MAP[node.type] ?? node.type,
      content: { tiptapType: node.type, attrs: node.attrs ?? {}, content: node.content ?? [] },
      position: index,
    }));
  if (rows.length > 0) {
    const { error } = await db.from('blocks').insert(rows);
    if (error) throw new Error(`syncBlocksForNode: ${error.message}`);
  }
}

/** Best-effort — a broadcast failure must never fail the append itself
 * (the snapshot is already durably saved by this point). Same channel/
 * event/payload contract as SupabaseYjsProvider.ts's live-editor sync. */
async function broadcastDelta(db: SupabaseClient, nodeId: string, delta: Uint8Array): Promise<void> {
  try {
    const channel = db.channel(`node:${nodeId}`, { config: { broadcast: { ack: true } } });
    await new Promise<void>((resolve) => {
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') resolve();
      });
      // Don't hang forever if the realtime service is unreachable.
      setTimeout(resolve, 2000);
    });
    await channel.send({ type: 'broadcast', event: 'sync', payload: { update: Array.from(delta) } });
    await db.removeChannel(channel);
  } catch {
    // Broadcast is a nice-to-have (lets an open editor merge live); the
    // snapshot write is what actually matters and already succeeded.
  }
}

export interface AppendOptions {
  heading?: string;
  timestamp?: boolean;
}

export async function appendToNode(
  db: SupabaseClient,
  businessId: string,
  nodeId: string,
  markdown: string,
  opts: AppendOptions = {},
): Promise<{ delta: Uint8Array }> {
  const node = await fetchNode(db, businessId, nodeId);
  const existingBytes = decodeSnapshot(node.yjs_snapshot as string | Uint8Array | number[] | null);
  const currentJSON = existingBytes ? snapshotToProseMirrorJSON(existingBytes) : EMPTY_DOC;
  const nextJSON = appendContent(currentJSON, markdownToProseMirror(markdown), {
    heading: opts.heading,
    timestamp: opts.timestamp ?? true,
  });

  const { snapshot, delta } = diffAppendIntoDoc(existingBytes, nextJSON);

  const { error } = await db.rpc('save_yjs_snapshot', {
    p_node_id: nodeId,
    p_snapshot_hex: Buffer.from(snapshot).toString('hex'),
  });
  if (error) throw new Error(`appendToNode (save): ${error.message}`);

  await syncBlocksForNode(db, nodeId, nextJSON);
  await broadcastDelta(db, nodeId, delta);

  return { delta };
}

export interface CreateNodeInput {
  title: string;
  parentId?: string | null;
  teamspaceId?: string | null;
  markdown?: string;
}

export async function createNode(db: SupabaseClient, businessId: string, input: CreateNodeInput): Promise<NodeRow> {
  let position = 0;
  {
    const { data: siblings } = await db
      .from('nodes')
      .select('position')
      .eq('business_id', businessId)
      .eq('parent_id', input.parentId ?? null)
      .order('position', { ascending: false })
      .limit(1);
    position = siblings?.length ? (siblings[0].position as number) + 1 : 0;
  }

  const { data: created, error } = await db
    .from('nodes')
    .insert({
      business_id: businessId,
      type: 'document',
      title: input.title,
      name: input.title,
      is_name_custom: false,
      parent_id: input.parentId ?? null,
      teamspace_id: input.teamspaceId ?? null,
      position,
    })
    .select('id, business_id, title, type, parent_id, teamspace_id, yjs_snapshot')
    .single();
  if (error) throw new Error(`createNode: ${error.message}`);

  if (input.markdown) {
    await appendToNode(db, businessId, created.id as string, input.markdown, { timestamp: false });
  }

  return created as NodeRow;
}

export { proseMirrorToMarkdown, markdownToProseMirror } from './markdown';
