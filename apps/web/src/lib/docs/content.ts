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
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
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
  StarterKit.configure({ undoRedo: false, link: false }), // Link added below
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
    const channel = db.channel(`node:${nodeId}`, {
      config: { broadcast: { ack: true }, private: process.env.NEXT_PUBLIC_REALTIME_PRIVATE === '1' },
    });
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

/** Bad caller input (malformed id, a target outside this workspace, a
 * move that would create a cycle, a missing heading). MCP tools surface
 * the message verbatim as a tool error instead of leaking a Postgres
 * error string. */
export class DocInputError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function assertUuid(value: string, label: string): void {
  if (!isUuid(value)) throw new DocInputError(`${label} must be a uuid (got "${value}")`);
}

/** Saves a full next-document state through the same Yjs path every
 * server-side write uses: diff into the existing CRDT (so an open editor
 * merges it as a peer update), persist via save_yjs_snapshot, recompute
 * the denormalised blocks copy, broadcast the delta. */
async function writeDoc(
  db: SupabaseClient,
  nodeId: string,
  existingBytes: Uint8Array | null,
  nextJSON: TiptapDoc,
  label: string,
): Promise<{ delta: Uint8Array }> {
  const { snapshot, delta } = diffAppendIntoDoc(existingBytes, nextJSON);

  const { error } = await db.rpc('save_yjs_snapshot', {
    p_node_id: nodeId,
    p_snapshot_hex: Buffer.from(snapshot).toString('hex'),
  });
  if (error) throw new Error(`${label} (save): ${error.message}`);

  await syncBlocksForNode(db, nodeId, nextJSON);
  await broadcastDelta(db, nodeId, delta);

  return { delta };
}

async function loadDocJSON(db: SupabaseClient, businessId: string, nodeId: string) {
  const node = await fetchNode(db, businessId, nodeId);
  const existingBytes = decodeSnapshot(node.yjs_snapshot as string | Uint8Array | number[] | null);
  const currentJSON = existingBytes ? snapshotToProseMirrorJSON(existingBytes) : EMPTY_DOC;
  return { node, existingBytes, currentJSON };
}

export interface AppendOptions {
  heading?: string;
  /** Opt-in: prefix the appended content with an italic ISO timestamp. */
  timestamp?: boolean;
}

export async function appendToNode(
  db: SupabaseClient,
  businessId: string,
  nodeId: string,
  markdown: string,
  opts: AppendOptions = {},
): Promise<{ delta: Uint8Array }> {
  const { existingBytes, currentJSON } = await loadDocJSON(db, businessId, nodeId);
  const nextJSON = appendContent(currentJSON, markdownToProseMirror(markdown), {
    heading: opts.heading,
    timestamp: opts.timestamp ?? false,
  });
  return writeDoc(db, nodeId, existingBytes, nextJSON, 'appendToNode');
}

function nonEmptyDoc(doc: TiptapDoc): TiptapDoc {
  return doc.content?.length ? doc : EMPTY_DOC;
}

/** Overwrites the whole document. Still a CRDT diff (not a rebuild), so
 * an open editor receives it as a normal peer update. */
export async function replaceNodeContent(
  db: SupabaseClient,
  businessId: string,
  nodeId: string,
  markdown: string,
): Promise<{ delta: Uint8Array }> {
  const { existingBytes } = await loadDocJSON(db, businessId, nodeId);
  return writeDoc(db, nodeId, existingBytes, nonEmptyDoc(markdownToProseMirror(markdown)), 'replaceNodeContent');
}

function textOf(node: TiptapJSONNode): string {
  if (typeof node.text === 'string') return node.text;
  return (node.content ?? []).map(textOf).join('');
}

function normaliseHeading(text: string): string {
  return text.replace(/^#+\s*/, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Pure: swaps the body under the first top-level heading whose text
 * matches `heading` (case/whitespace-insensitive, leading #'s ignored).
 * The section runs until the next heading of the same or a higher level.
 * The heading itself is kept; a duplicate copy of it at the start of the
 * replacement is dropped. */
export function replaceSectionContent(current: TiptapDoc, heading: string, replacement: TiptapDoc): TiptapDoc {
  const target = normaliseHeading(heading);
  if (!target) throw new DocInputError('heading must not be empty');
  const blocks = current.content ?? [];
  const start = blocks.findIndex((b) => b.type === 'heading' && normaliseHeading(textOf(b)) === target);
  if (start === -1) {
    const available = blocks.filter((b) => b.type === 'heading').map((b) => textOf(b).trim()).filter(Boolean);
    throw new DocInputError(
      `Heading "${heading}" not found.` + (available.length ? ` Headings in this doc: ${available.map((h) => `"${h}"`).join(', ')}` : ' This doc has no headings.'),
    );
  }
  const level = Number(blocks[start].attrs?.level ?? 1);
  let end = start + 1;
  while (end < blocks.length) {
    const b = blocks[end];
    if (b.type === 'heading' && Number(b.attrs?.level ?? 1) <= level) break;
    end++;
  }
  let body = replacement.content ?? [];
  if (body[0]?.type === 'heading' && normaliseHeading(textOf(body[0])) === target) body = body.slice(1);
  // Drop a lone empty paragraph (what an empty markdown string parses to).
  if (body.length === 1 && body[0].type === 'paragraph' && !body[0].content?.length) body = [];
  return { type: 'doc', content: [...blocks.slice(0, start + 1), ...body, ...blocks.slice(end)] };
}

export async function replaceNodeSection(
  db: SupabaseClient,
  businessId: string,
  nodeId: string,
  heading: string,
  markdown: string,
): Promise<{ delta: Uint8Array }> {
  const { existingBytes, currentJSON } = await loadDocJSON(db, businessId, nodeId);
  const nextJSON = replaceSectionContent(currentJSON, heading, markdownToProseMirror(markdown));
  return writeDoc(db, nodeId, existingBytes, nextJSON, 'replaceNodeSection');
}

// ---- Placement: tenant ownership + positions -------------------------

export interface Placement {
  teamspaceId: string | null;
  parentId: string | null;
}

/** The MCP's db client is service-role (RLS bypassed), so nothing below
 * the app stops a caller from pointing a node at another workspace's
 * teamspace or parent. Every write that sets teamspace_id/parent_id goes
 * through here first. A parent decides the teamspace: if teamspaceId is
 * omitted it is inherited; if given it must match. */
export async function resolvePlacement(
  db: SupabaseClient,
  businessId: string,
  input: { teamspaceId?: string | null; parentId?: string | null },
): Promise<Placement> {
  let teamspaceId = input.teamspaceId ?? null;
  const parentId = input.parentId ?? null;

  if (teamspaceId !== null) {
    assertUuid(teamspaceId, 'teamspaceId');
    const { data, error } = await db
      .from('teamspaces')
      .select('id')
      .eq('id', teamspaceId)
      .eq('business_id', businessId)
      .maybeSingle();
    if (error) throw new Error(`resolvePlacement (teamspace): ${error.message}`);
    if (!data) throw new DocInputError(`Teamspace ${teamspaceId} not found in this workspace`);
  }

  if (parentId !== null) {
    assertUuid(parentId, 'parentId');
    const { data: parent, error } = await db
      .from('nodes')
      .select('id, teamspace_id, type')
      .eq('id', parentId)
      .eq('business_id', businessId)
      .maybeSingle();
    if (error) throw new Error(`resolvePlacement (parent): ${error.message}`);
    if (!parent) throw new DocInputError(`Parent node ${parentId} not found in this workspace`);
    const parentTeamspace = (parent.teamspace_id as string | null) ?? null;
    if (input.teamspaceId === undefined) {
      teamspaceId = parentTeamspace;
    } else if (teamspaceId !== parentTeamspace) {
      throw new DocInputError(
        `Parent node ${parentId} is in teamspace ${parentTeamspace ?? '(none)'}, not ${teamspaceId ?? '(none)'}`,
      );
    }
  }

  return { teamspaceId, parentId };
}

/** Sibling query scoped to (business_id, teamspace_id, parent_id). Uses
 * .is() for nulls — .eq(col, null) silently matches nothing. */
function siblingsQuery(db: SupabaseClient, businessId: string, placement: Placement, columns: string) {
  let q = db.from('nodes').select(columns).eq('business_id', businessId);
  q = placement.teamspaceId === null ? q.is('teamspace_id', null) : q.eq('teamspace_id', placement.teamspaceId);
  q = placement.parentId === null ? q.is('parent_id', null) : q.eq('parent_id', placement.parentId);
  return q;
}

export async function nextPosition(db: SupabaseClient, businessId: string, placement: Placement): Promise<number> {
  const { data } = await siblingsQuery(db, businessId, placement, 'position')
    .order('position', { ascending: false })
    .limit(1);
  const rows = (data ?? []) as unknown as Array<{ position: number }>;
  return rows.length ? Number(rows[0].position) + 1 : 0;
}

export interface CreateNodeInput {
  title: string;
  parentId?: string | null;
  teamspaceId?: string | null;
  markdown?: string;
}

export async function createNode(db: SupabaseClient, businessId: string, input: CreateNodeInput): Promise<NodeRow> {
  const placement = await resolvePlacement(db, businessId, input);
  const position = await nextPosition(db, businessId, placement);

  const { data: created, error } = await db
    .from('nodes')
    .insert({
      business_id: businessId,
      type: 'document',
      title: input.title,
      name: input.title,
      is_name_custom: false,
      parent_id: placement.parentId,
      teamspace_id: placement.teamspaceId,
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

// ---- Organising: move / rename / archive -----------------------------

async function fetchNodeMeta(db: SupabaseClient, businessId: string, nodeId: string) {
  assertUuid(nodeId, 'nodeId');
  const { data, error } = await db
    .from('nodes')
    .select('id, parent_id, teamspace_id, is_name_custom, is_archived')
    .eq('id', nodeId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (error) throw new Error(`fetchNodeMeta: ${error.message}`);
  if (!data) throw new DocNotFoundError(`Node ${nodeId} not found in this workspace`);
  return data as { id: string; parent_id: string | null; teamspace_id: string | null; is_name_custom: boolean; is_archived: boolean };
}

/** All descendants of `rootId` within the business (not including root). */
async function descendantIds(db: SupabaseClient, businessId: string, rootId: string): Promise<string[]> {
  const { data, error } = await db.from('nodes').select('id, parent_id').eq('business_id', businessId);
  if (error) throw new Error(`descendantIds: ${error.message}`);
  const children = new Map<string, string[]>();
  for (const row of (data ?? []) as Array<{ id: string; parent_id: string | null }>) {
    if (!row.parent_id) continue;
    const list = children.get(row.parent_id) ?? [];
    list.push(row.id);
    children.set(row.parent_id, list);
  }
  const out: string[] = [];
  const queue = [...(children.get(rootId) ?? [])];
  const seen = new Set<string>([rootId]);
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    queue.push(...(children.get(id) ?? []));
  }
  return out;
}

export interface MoveNodeInput {
  teamspaceId: string | null;
  parentId: string | null;
  /** Zero-based index among the new siblings; omitted = append at end. */
  position?: number;
}

export async function moveNode(
  db: SupabaseClient,
  businessId: string,
  nodeId: string,
  input: MoveNodeInput,
): Promise<{ nodeId: string; teamspaceId: string | null; parentId: string | null; position: number }> {
  await fetchNodeMeta(db, businessId, nodeId);
  const placement = await resolvePlacement(db, businessId, input);

  const descendants = await descendantIds(db, businessId, nodeId);
  if (placement.parentId !== null && (placement.parentId === nodeId || descendants.includes(placement.parentId))) {
    throw new DocInputError('Cannot move a node under itself or one of its descendants');
  }

  // Siblings at the destination, excluding the node being moved.
  const { data: siblingData, error: sibError } = await siblingsQuery(db, businessId, placement, 'id, position').order('position', {
    ascending: true,
  });
  if (sibError) throw new Error(`moveNode (siblings): ${sibError.message}`);
  const siblings = ((siblingData ?? []) as unknown as Array<{ id: string; position: number }>).filter((s) => s.id !== nodeId);

  let index = siblings.length;
  if (input.position !== undefined) {
    if (!Number.isInteger(input.position) || input.position < 0) throw new DocInputError('position must be a non-negative integer');
    index = Math.min(input.position, siblings.length);
  }

  const { error: moveError } = await db
    .from('nodes')
    .update({ teamspace_id: placement.teamspaceId, parent_id: placement.parentId, position: index })
    .eq('id', nodeId)
    .eq('business_id', businessId);
  if (moveError) throw new Error(`moveNode: ${moveError.message}`);

  // Renumber only the siblings whose slot actually changed.
  const ordered = [...siblings.slice(0, index), { id: nodeId, position: index }, ...siblings.slice(index)];
  for (let i = 0; i < ordered.length; i++) {
    const s = ordered[i];
    if (s.id === nodeId || Number(s.position) === i) continue;
    const { error } = await db.from('nodes').update({ position: i }).eq('id', s.id).eq('business_id', businessId);
    if (error) throw new Error(`moveNode (renumber): ${error.message}`);
  }

  // A subtree lives in one teamspace — keep descendants in step.
  if (descendants.length) {
    const { error } = await db
      .from('nodes')
      .update({ teamspace_id: placement.teamspaceId })
      .in('id', descendants)
      .eq('business_id', businessId);
    if (error) throw new Error(`moveNode (descendants): ${error.message}`);
  }

  return { nodeId, teamspaceId: placement.teamspaceId, parentId: placement.parentId, position: index };
}

/** Renames the page H1. The sidebar label follows unless the user gave it
 * a custom name (is_name_custom), mirroring the editor's behaviour. */
export async function renameNode(db: SupabaseClient, businessId: string, nodeId: string, title: string): Promise<{ nameUpdated: boolean }> {
  const trimmed = title.trim();
  if (!trimmed) throw new DocInputError('title must not be empty');
  const meta = await fetchNodeMeta(db, businessId, nodeId);
  const updates: Record<string, unknown> = { title: trimmed };
  if (!meta.is_name_custom) updates.name = trimmed;
  const { error } = await db.from('nodes').update(updates).eq('id', nodeId).eq('business_id', businessId);
  if (error) throw new Error(`renameNode: ${error.message}`);
  return { nameUpdated: !meta.is_name_custom };
}

/** Soft delete: sets is_archived on the node and its whole subtree.
 * `archived: false` restores them. There is no hard delete on the MCP. */
export async function setNodeArchived(
  db: SupabaseClient,
  businessId: string,
  nodeId: string,
  archived: boolean,
): Promise<{ nodeIds: string[] }> {
  await fetchNodeMeta(db, businessId, nodeId);
  const ids = [nodeId, ...(await descendantIds(db, businessId, nodeId))];
  const { error } = await db.from('nodes').update({ is_archived: archived }).in('id', ids).eq('business_id', businessId);
  if (error) throw new Error(`setNodeArchived: ${error.message}`);
  return { nodeIds: ids };
}

// ---- Teamspaces -------------------------------------------------------

export interface TeamspaceRow {
  id: string;
  business_id: string;
  name: string;
  icon: string | null;
  description: string | null;
  position: number;
}

const TEAMSPACE_COLUMNS = 'id, business_id, name, icon, description, position';

/** Same logic as the createTeamspace server action (append at the end of
 * the business's teamspaces), against an explicit business instead of
 * the cookie session. */
export async function createTeamspace(
  db: SupabaseClient,
  businessId: string,
  input: { name: string; icon?: string | null; description?: string | null; createdBy?: string | null },
): Promise<TeamspaceRow> {
  const name = input.name.trim();
  if (!name) throw new DocInputError('name must not be empty');
  const { data: last } = await db
    .from('teamspaces')
    .select('position')
    .eq('business_id', businessId)
    .order('position', { ascending: false })
    .limit(1);
  const position = (((last ?? []) as Array<{ position: number }>)[0]?.position ?? -1) + 1;

  const { data, error } = await db
    .from('teamspaces')
    .insert({
      business_id: businessId,
      name,
      icon: input.icon || null,
      description: input.description ?? null,
      position,
      created_by: input.createdBy ?? null,
    })
    .select(TEAMSPACE_COLUMNS)
    .single();
  if (error) throw new Error(`createTeamspace: ${error.message}`);
  return data as TeamspaceRow;
}

export async function updateTeamspace(
  db: SupabaseClient,
  businessId: string,
  id: string,
  input: { name?: string; icon?: string | null; description?: string | null; position?: number },
): Promise<TeamspaceRow> {
  assertUuid(id, 'id');
  // Explicit whitelist — business_id/created_by/is_private are never writable here.
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) throw new DocInputError('name must not be empty');
    updates.name = input.name.trim();
  }
  if (input.icon !== undefined) updates.icon = input.icon || null;
  if (input.description !== undefined) updates.description = input.description;
  if (input.position !== undefined) {
    if (!Number.isInteger(input.position) || input.position < 0) throw new DocInputError('position must be a non-negative integer');
    updates.position = input.position;
  }
  if (Object.keys(updates).length === 0) throw new DocInputError('Nothing to update');

  const { data, error } = await db
    .from('teamspaces')
    .update(updates)
    .eq('id', id)
    .eq('business_id', businessId)
    .select(TEAMSPACE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`updateTeamspace: ${error.message}`);
  if (!data) throw new DocInputError(`Teamspace ${id} not found in this workspace`);
  return data as TeamspaceRow;
}

export { proseMirrorToMarkdown, markdownToProseMirror } from './markdown';
