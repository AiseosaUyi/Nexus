import { describe, it, expect } from 'vitest';
import { decodeSnapshot, snapshotToProseMirrorJSON, diffAppendIntoDoc, readNode, appendToNode, createNode, DocNotFoundError } from './content';
import { proseMirrorToMarkdown, markdownToProseMirror } from './markdown';

describe('decodeSnapshot', () => {
  it('decodes a PostgREST-style "\\x" hex string', () => {
    const bytes = new Uint8Array([1, 2, 3, 255]);
    const hex = '\\x' + Buffer.from(bytes).toString('hex');
    expect(decodeSnapshot(hex)).toEqual(bytes);
  });

  it('decodes a bare hex string (no \\x prefix)', () => {
    const bytes = new Uint8Array([10, 20, 30]);
    expect(decodeSnapshot(Buffer.from(bytes).toString('hex'))).toEqual(bytes);
  });

  it('decodes a base64 string when it is not valid hex', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const base64 = Buffer.from(bytes).toString('base64');
    expect(decodeSnapshot(base64)).toEqual(bytes);
  });

  it('passes through an actual Uint8Array', () => {
    const bytes = new Uint8Array([9, 9, 9]);
    expect(decodeSnapshot(bytes)).toEqual(bytes);
  });

  it('converts a plain number array', () => {
    expect(decodeSnapshot([1, 2, 3])).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('returns null for null, undefined, and empty input', () => {
    expect(decodeSnapshot(null)).toBeNull();
    expect(decodeSnapshot(undefined)).toBeNull();
    expect(decodeSnapshot('')).toBeNull();
    expect(decodeSnapshot([])).toBeNull();
  });
});

describe('markdown round-trip fixtures', () => {
  it.each([
    ['heading', '# Hello World'],
    ['paragraph with bold/italic', 'This is **bold** and _italic_ text.'],
    ['bullet list', '- one\n- two\n- three'],
    ['ordered list', '1. first\n2. second'],
  ])('%s survives markdown -> ProseMirror -> markdown', (_label, md) => {
    const json = markdownToProseMirror(md);
    const back = proseMirrorToMarkdown(json);
    expect(back.length).toBeGreaterThan(0);
    // Not byte-identical (markdown has multiple valid renderings of the
    // same structure) — assert the meaningful text survives instead.
    const words = md.replace(/[#*_\-\d.]/g, '').trim().split(/\s+/).filter(Boolean);
    for (const word of words) expect(back).toContain(word);
  });

  it('renders a task list with checked/unchecked state', () => {
    const json = {
      type: 'doc' as const,
      content: [
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'done thing' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'todo thing' }] }] },
          ],
        },
      ],
    };
    const md = proseMirrorToMarkdown(json);
    expect(md).toContain('[x]');
    expect(md).toContain('[ ]');
    expect(md).toContain('done thing');
    expect(md).toContain('todo thing');
  });

  it('renders a table in pipe syntax', () => {
    const json = {
      type: 'doc' as const,
      content: [
        {
          type: 'table',
          content: [
            { type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] }, { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] }] },
            { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] }, { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '2' }] }] }] },
          ],
        },
      ],
    };
    const md = proseMirrorToMarkdown(json);
    expect(md).toContain('| A | B |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| 1 | 2 |');
  });

  it('renders a callout as a blockquote-style "> **Note**" block', () => {
    const json = {
      type: 'doc' as const,
      content: [{ type: 'callout', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Heads up' }] }] }],
    };
    const md = proseMirrorToMarkdown(json);
    expect(md).toContain('> **Note**');
    expect(md).toContain('> Heads up');
  });

  it('falls back to text content for a genuinely unknown node type', () => {
    const json = { type: 'doc' as const, content: [{ type: 'someFutureNode', text: 'fallback text' }] };
    expect(proseMirrorToMarkdown(json as any)).toContain('fallback text');
  });
});

// ---- DB-level tests (mocked Supabase client) ----

function makeFakeDb(opts: {
  node?: { id: string; business_id: string; title: string; type: string; parent_id: string | null; teamspace_id: string | null; yjs_snapshot: unknown };
  blocks?: unknown[];
} = {}) {
  const calls: { method: string; args?: any }[] = [];
  return {
    from: (table: string) => {
      if (table === 'nodes') {
        // Supports both query shapes createNode/fetchNode issue against
        // this table: fetchNode's .select().eq().eq().maybeSingle(), and
        // createNode's sibling-position lookup .select().eq().eq().order().limit().
        const chain: any = {
          eq: () => chain,
          maybeSingle: async () => ({ data: opts.node ?? null, error: null }),
          order: () => chain,
          limit: async () => ({ data: [], error: null }),
        };
        return {
          select: () => chain,
          insert: (values: any) => {
            calls.push({ method: 'insert-node', args: values });
            return {
              select: () => ({
                single: async () => ({
                  data: { id: 'new-node-1', business_id: values.business_id, title: values.title, type: values.type, parent_id: values.parent_id, teamspace_id: values.teamspace_id, yjs_snapshot: null },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === 'blocks') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: opts.blocks ?? [] }),
            }),
          }),
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: (rows: any) => {
            calls.push({ method: 'insert-blocks', args: rows });
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: (fn: string, args: any) => {
      calls.push({ method: `rpc:${fn}`, args });
      return Promise.resolve({ data: null, error: null });
    },
    channel: () => ({
      subscribe: (cb: (status: string) => void) => cb('SUBSCRIBED'),
      send: async () => undefined,
    }),
    removeChannel: async () => undefined,
    _calls: calls,
  };
}

describe('readNode', () => {
  it('throws DocNotFoundError for a node outside this business', async () => {
    const db = makeFakeDb({ node: undefined });
    await expect(readNode(db as any, 'biz-1', 'node-1')).rejects.toBeInstanceOf(DocNotFoundError);
  });

  it('reads from the snapshot when one exists', async () => {
    const snapshot = diffAppendIntoDoc(null, markdownToProseMirror('Snapshot content')).snapshot;
    const db = makeFakeDb({
      node: { id: 'node-1', business_id: 'biz-1', title: 'Doc', type: 'document', parent_id: null, teamspace_id: null, yjs_snapshot: Array.from(snapshot) },
    });
    const result = await readNode(db as any, 'biz-1', 'node-1');
    expect(result.source).toBe('snapshot');
    expect(result.markdown).toContain('Snapshot content');
  });

  it('falls back to blocks when there is no snapshot', async () => {
    const db = makeFakeDb({
      node: { id: 'node-1', business_id: 'biz-1', title: 'Doc', type: 'document', parent_id: null, teamspace_id: null, yjs_snapshot: null },
      blocks: [{ content: { tiptapType: 'paragraph', content: [{ type: 'text', text: 'From blocks' }] } }],
    });
    const result = await readNode(db as any, 'biz-1', 'node-1');
    expect(result.source).toBe('blocks');
    expect(result.markdown).toContain('From blocks');
  });

  it('reports "empty" when there is neither a snapshot nor blocks', async () => {
    const db = makeFakeDb({
      node: { id: 'node-1', business_id: 'biz-1', title: 'Doc', type: 'document', parent_id: null, teamspace_id: null, yjs_snapshot: null },
      blocks: [],
    });
    const result = await readNode(db as any, 'biz-1', 'node-1');
    expect(result.source).toBe('empty');
  });
});

describe('appendToNode', () => {
  it('appends to a node with an existing snapshot, saving via the RPC and producing a non-empty delta', async () => {
    const snapshot = diffAppendIntoDoc(null, markdownToProseMirror('Existing content')).snapshot;
    const db = makeFakeDb({
      node: { id: 'node-1', business_id: 'biz-1', title: 'Doc', type: 'document', parent_id: null, teamspace_id: null, yjs_snapshot: Array.from(snapshot) },
    });

    const { delta } = await appendToNode(db as any, 'biz-1', 'node-1', 'New content', { timestamp: false });
    expect(delta.length).toBeGreaterThan(0);

    const rpcCall = db._calls.find((c) => c.method === 'rpc:save_yjs_snapshot');
    expect(rpcCall?.args.p_node_id).toBe('node-1');
    expect(typeof rpcCall?.args.p_snapshot_hex).toBe('string');

    const savedBytes = Buffer.from(rpcCall!.args.p_snapshot_hex, 'hex');
    const savedJSON = snapshotToProseMirrorJSON(new Uint8Array(savedBytes));
    expect(JSON.stringify(savedJSON)).toContain('Existing content');
    expect(JSON.stringify(savedJSON)).toContain('New content');
  });

  it('appends to a node whose snapshot is null (brand-new empty doc path)', async () => {
    // The eng review's test gap: appendToNode on a node that has never
    // been edited before (yjs_snapshot is null), not just one that
    // already has content.
    const db = makeFakeDb({
      node: { id: 'node-1', business_id: 'biz-1', title: 'Doc', type: 'document', parent_id: null, teamspace_id: null, yjs_snapshot: null },
    });

    const { delta } = await appendToNode(db as any, 'biz-1', 'node-1', 'First content ever', { timestamp: false });
    expect(delta.length).toBeGreaterThan(0);

    const rpcCall = db._calls.find((c) => c.method === 'rpc:save_yjs_snapshot');
    const savedBytes = Buffer.from(rpcCall!.args.p_snapshot_hex, 'hex');
    const savedJSON = snapshotToProseMirrorJSON(new Uint8Array(savedBytes));
    expect(JSON.stringify(savedJSON)).toContain('First content ever');
  });

  it('adds an H2 heading and timestamp when asked', async () => {
    const db = makeFakeDb({
      node: { id: 'node-1', business_id: 'biz-1', title: 'Doc', type: 'document', parent_id: null, teamspace_id: null, yjs_snapshot: null },
    });
    await appendToNode(db as any, 'biz-1', 'node-1', 'Body text', { heading: 'gruve-command-center · 2026-09-22', timestamp: true });
    const rpcCall = db._calls.find((c) => c.method === 'rpc:save_yjs_snapshot');
    const savedBytes = Buffer.from(rpcCall!.args.p_snapshot_hex, 'hex');
    const savedJSON = snapshotToProseMirrorJSON(new Uint8Array(savedBytes));
    const serialized = JSON.stringify(savedJSON);
    expect(serialized).toContain('gruve-command-center');
    expect(serialized).toContain('heading');
  });

  it('syncs the blocks table with the full next document', async () => {
    const db = makeFakeDb({
      node: { id: 'node-1', business_id: 'biz-1', title: 'Doc', type: 'document', parent_id: null, teamspace_id: null, yjs_snapshot: null },
    });
    await appendToNode(db as any, 'biz-1', 'node-1', 'Some content', { timestamp: false });
    const blocksInsert = db._calls.find((c) => c.method === 'insert-blocks');
    expect(blocksInsert).toBeTruthy();
    expect(blocksInsert!.args.length).toBeGreaterThan(0);
  });
});

describe('createNode', () => {
  it('creates a node without content', async () => {
    const db = makeFakeDb();
    const node = await createNode(db as any, 'biz-1', { title: 'New Page' });
    expect(node.title).toBe('New Page');
    const insertCall = db._calls.find((c) => c.method === 'insert-node');
    expect(insertCall?.args.type).toBe('document');
    expect(insertCall?.args.name).toBe('New Page');
  });

  it('creates a node with initial markdown content, appending it right after creation', async () => {
    // appendToNode (called internally once the node exists) re-fetches it
    // by id, so the fake needs to serve back the same id its own insert
    // just produced ('new-node-1') for the subsequent select to succeed.
    const db = makeFakeDb({
      node: { id: 'new-node-1', business_id: 'biz-1', title: 'New Page', type: 'document', parent_id: null, teamspace_id: null, yjs_snapshot: null },
    });
    const node = await createNode(db as any, 'biz-1', { title: 'New Page', markdown: 'Initial body' });
    expect(node.id).toBe('new-node-1');
    expect(db._calls.some((c) => c.method === 'insert-node')).toBe(true);
    const rpcCall = db._calls.find((c) => c.method === 'rpc:save_yjs_snapshot');
    expect(rpcCall).toBeTruthy();
    const savedBytes = Buffer.from(rpcCall!.args.p_snapshot_hex, 'hex');
    const savedJSON = snapshotToProseMirrorJSON(new Uint8Array(savedBytes));
    expect(JSON.stringify(savedJSON)).toContain('Initial body');
  });
});
