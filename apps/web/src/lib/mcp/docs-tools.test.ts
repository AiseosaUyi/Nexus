import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeDb, type FakeDb } from '@/test/fakeSupabase';

let fakeDb: FakeDb;
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => fakeDb }));

import { registerDocsTools } from './tools/docs';
import { getManifest, __resetManifestForTests } from './manifest';

const BIZ_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const BIZ_B = 'bbbbbbbb-0000-4000-8000-000000000002';
const TS_B = 'bbbbbbbb-1111-4000-8000-000000000001';
const NODE_A = 'aaaaaaaa-2222-4000-8000-000000000001';

type Handler = (args: any, extra: any) => Promise<any>;

function setup() {
  const handlers = new Map<string, Handler>();
  const server = { registerTool: (name: string, _cfg: unknown, h: Handler) => handlers.set(name, h) };
  registerDocsTools(server as any);
  return handlers;
}

const extra = (scopes: string[]) => ({
  authInfo: { token: 't', clientId: 'c', scopes, extra: { businessId: BIZ_A, businessSlug: 'a', tokenId: `tok-${Math.random()}`, createdBy: null, tokenKind: 'static' } },
});
const text = (r: any) => r.content[0].text as string;

const NEW_TOOLS = [
  'nexus_create_teamspace',
  'nexus_update_teamspace',
  'nexus_move_node',
  'nexus_rename_node',
  'nexus_archive_node',
  'nexus_replace_doc',
  'nexus_replace_section',
];

beforeEach(() => {
  __resetManifestForTests();
  fakeDb = createFakeDb({
    teamspaces: [{ id: TS_B, business_id: BIZ_B, name: 'B', position: 0 }],
    nodes: [{ id: NODE_A, business_id: BIZ_A, title: 'Doc', type: 'document', parent_id: null, teamspace_id: null, position: 0, is_archived: false, yjs_snapshot: null }],
  });
});

describe('docs tools manifest', () => {
  it('registers every organising/editing tool as docs:write and mutating', () => {
    setup();
    const manifest = new Map(getManifest().map((e) => [e.name, e]));
    for (const name of NEW_TOOLS) {
      expect(manifest.get(name), name).toMatchObject({ scope: 'docs:write', mutates: true });
    }
  });

  it('exposes no hard-delete tool', () => {
    setup();
    expect(getManifest().some((e) => /delete|destroy|purge/i.test(e.name))).toBe(false);
  });
});

describe('docs tools scope gate', () => {
  it.each(NEW_TOOLS)('%s refuses a token without docs:write', async (name) => {
    const res = await setup().get(name)!({ nodeId: NODE_A, id: TS_B, name: 'x', title: 'x', heading: 'x', markdown: 'x', teamspaceId: null, parentId: null }, extra(['docs:read']));
    expect(res.isError).toBe(true);
    expect(text(res)).toMatch(/Missing required scope: docs:write/);
  });
});

describe('docs tools — cross-tenant ids become tool errors', () => {
  it('nexus_create_doc refuses another business’s teamspace', async () => {
    const res = await setup().get('nexus_create_doc')!({ title: 'x', teamspaceId: TS_B }, extra(['docs:write']));
    expect(res.isError).toBe(true);
    expect(text(res)).toMatch(/not found in this workspace/);
    expect(fakeDb.tables.nodes).toHaveLength(1);
  });

  it('nexus_create_doc reports a malformed id cleanly', async () => {
    const res = await setup().get('nexus_create_doc')!({ title: 'x', parentId: 'nope' }, extra(['docs:write']));
    expect(res.isError).toBe(true);
    expect(text(res)).toMatch(/parentId must be a uuid/);
  });

  it('nexus_move_node refuses another business’s teamspace', async () => {
    const res = await setup().get('nexus_move_node')!({ nodeId: NODE_A, teamspaceId: TS_B, parentId: null }, extra(['docs:write']));
    expect(res.isError).toBe(true);
    expect(fakeDb.tables.nodes[0].teamspace_id).toBeNull();
  });

  it('nexus_update_teamspace refuses another business’s teamspace', async () => {
    const res = await setup().get('nexus_update_teamspace')!({ id: TS_B, name: 'pwned' }, extra(['docs:write']));
    expect(res.isError).toBe(true);
    expect(fakeDb.tables.teamspaces[0].name).toBe('B');
  });
});

describe('nexus_read_doc paging', () => {
  it('returns totalChars and pages with offset', async () => {
    const handlers = setup();
    await handlers.get('nexus_replace_doc')!({ nodeId: NODE_A, markdown: 'x'.repeat(250) }, extra(['docs:write']));
    const page1 = JSON.parse(text(await handlers.get('nexus_read_doc')!({ nodeId: NODE_A, maxChars: 100 }, extra(['docs:read']))));
    expect(page1).toMatchObject({ totalChars: 250, offset: 0, truncated: true, nextOffset: 100 });
    expect(page1.markdown).toHaveLength(100);
    const page3 = JSON.parse(text(await handlers.get('nexus_read_doc')!({ nodeId: NODE_A, offset: 200, maxChars: 100 }, extra(['docs:read']))));
    expect(page3).toMatchObject({ offset: 200, truncated: false, nextOffset: null });
    expect(page3.markdown).toHaveLength(50);
  });
});
