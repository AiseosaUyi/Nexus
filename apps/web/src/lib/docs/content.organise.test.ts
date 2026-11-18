import { describe, it, expect } from 'vitest';
import { createFakeDb } from '@/test/fakeSupabase';
import {
  createNode,
  moveNode,
  renameNode,
  setNodeArchived,
  createTeamspace,
  updateTeamspace,
  appendToNode,
  replaceNodeContent,
  replaceNodeSection,
  replaceSectionContent,
  readNode,
  diffAppendIntoDoc,
  DocInputError,
  DocNotFoundError,
} from './content';
import { markdownToProseMirror } from './markdown';

const BIZ_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const BIZ_B = 'bbbbbbbb-0000-4000-8000-000000000002';
const TS_A1 = 'aaaaaaaa-1111-4000-8000-000000000001';
const TS_A2 = 'aaaaaaaa-1111-4000-8000-000000000002';
const TS_B = 'bbbbbbbb-1111-4000-8000-000000000001';
const uid = (n: number, biz = 'a') => `${biz.repeat(8)}-2222-4000-8000-${String(n).padStart(12, '0')}`;

function node(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    business_id: BIZ_A,
    title: id,
    name: id,
    is_name_custom: false,
    type: 'document',
    parent_id: null,
    teamspace_id: null,
    position: 0,
    is_archived: false,
    yjs_snapshot: null,
    ...extra,
  };
}

function seed() {
  return createFakeDb({
    teamspaces: [
      { id: TS_A1, business_id: BIZ_A, name: 'A1', position: 0 },
      { id: TS_A2, business_id: BIZ_A, name: 'A2', position: 1 },
      { id: TS_B, business_id: BIZ_B, name: 'B', position: 0 },
    ],
    nodes: [
      node(uid(1), { teamspace_id: TS_A1, position: 0 }),
      node(uid(2), { teamspace_id: TS_A1, position: 1 }),
      node(uid(3), { teamspace_id: TS_A1, parent_id: uid(1), position: 0 }),
      node(uid(4), { teamspace_id: TS_A1, parent_id: uid(3), position: 0 }),
      node(uid(5), { teamspace_id: TS_A2, position: 0 }),
      node(uid(9, 'b'), { business_id: BIZ_B, teamspace_id: TS_B, position: 0 }),
    ],
  });
}

const rows = (db: ReturnType<typeof seed>) => db.tables.nodes;
const byId = (db: ReturnType<typeof seed>, id: string) => rows(db).find((n) => n.id === id)!;

describe('createNode — tenant ownership (MCP db client is service-role, RLS bypassed)', () => {
  it('rejects a teamspaceId belonging to another business and inserts nothing', async () => {
    const db = seed();
    const before = rows(db).length;
    await expect(createNode(db as any, BIZ_A, { title: 'x', teamspaceId: TS_B })).rejects.toBeInstanceOf(DocInputError);
    expect(rows(db).length).toBe(before);
  });

  it('rejects a parentId belonging to another business and inserts nothing', async () => {
    const db = seed();
    const before = rows(db).length;
    await expect(createNode(db as any, BIZ_A, { title: 'x', parentId: uid(9, 'b') })).rejects.toBeInstanceOf(DocInputError);
    expect(rows(db).length).toBe(before);
  });

  it('rejects malformed ids with a clear message, not a Postgres error', async () => {
    const db = seed();
    await expect(createNode(db as any, BIZ_A, { title: 'x', teamspaceId: 'not-a-uuid' })).rejects.toThrow(/teamspaceId must be a uuid/);
    await expect(createNode(db as any, BIZ_A, { title: 'x', parentId: "1' or 1=1" })).rejects.toThrow(/parentId must be a uuid/);
  });

  it('rejects a parent in a different teamspace than the one given', async () => {
    const db = seed();
    await expect(createNode(db as any, BIZ_A, { title: 'x', teamspaceId: TS_A2, parentId: uid(1) })).rejects.toThrow(/is in teamspace/);
  });

  it('inherits the parent teamspace when teamspaceId is omitted', async () => {
    const db = seed();
    const created = await createNode(db as any, BIZ_A, { title: 'child', parentId: uid(1) });
    expect(created.teamspace_id).toBe(TS_A1);
    expect(created.parent_id).toBe(uid(1));
  });
});

describe('createNode — position per (business, teamspace, parent)', () => {
  it('appends after siblings in the same teamspace root, ignoring other teamspaces and businesses', async () => {
    const db = seed();
    const created = await createNode(db as any, BIZ_A, { title: 'new', teamspaceId: TS_A1 });
    expect(byId(db, created.id).position).toBe(2);
  });

  it('starts at 0 in a teamspace root that has no pages yet, even if other roots do', async () => {
    const db = seed();
    const ts = await createTeamspace(db as any, BIZ_A, { name: 'Empty' });
    const created = await createNode(db as any, BIZ_A, { title: 'first', teamspaceId: ts.id });
    expect(byId(db, created.id).position).toBe(0);
  });

  it('counts workspace-root siblings (null parent, null teamspace) — the old .eq(null) always returned 0', async () => {
    const db = seed();
    const first = await createNode(db as any, BIZ_A, { title: 'r1' });
    const second = await createNode(db as any, BIZ_A, { title: 'r2' });
    expect(byId(db, first.id).position).toBe(0);
    expect(byId(db, second.id).position).toBe(1);
  });
});

describe('moveNode', () => {
  it('moves a subtree to another teamspace, carrying descendants along', async () => {
    const db = seed();
    const res = await moveNode(db as any, BIZ_A, uid(1), { teamspaceId: TS_A2, parentId: null });
    expect(res).toMatchObject({ teamspaceId: TS_A2, parentId: null, position: 1 });
    expect(byId(db, uid(1)).teamspace_id).toBe(TS_A2);
    expect(byId(db, uid(3)).teamspace_id).toBe(TS_A2);
    expect(byId(db, uid(4)).teamspace_id).toBe(TS_A2);
  });

  it('inserts at a position and renumbers siblings', async () => {
    const db = seed();
    await moveNode(db as any, BIZ_A, uid(5), { teamspaceId: TS_A1, parentId: null, position: 0 });
    expect(byId(db, uid(5)).position).toBe(0);
    expect(byId(db, uid(1)).position).toBe(1);
    expect(byId(db, uid(2)).position).toBe(2);
  });

  it('refuses to move a node under its own descendant', async () => {
    const db = seed();
    await expect(moveNode(db as any, BIZ_A, uid(1), { teamspaceId: TS_A1, parentId: uid(4) })).rejects.toThrow(/under itself/);
  });

  it('refuses a cross-tenant destination teamspace or parent and changes nothing', async () => {
    const db = seed();
    await expect(moveNode(db as any, BIZ_A, uid(2), { teamspaceId: TS_B, parentId: null })).rejects.toBeInstanceOf(DocInputError);
    await expect(moveNode(db as any, BIZ_A, uid(2), { teamspaceId: null, parentId: uid(9, 'b') })).rejects.toBeInstanceOf(DocInputError);
    expect(byId(db, uid(2))).toMatchObject({ teamspace_id: TS_A1, parent_id: null, position: 1 });
  });

  it("can't move another business's node", async () => {
    const db = seed();
    await expect(moveNode(db as any, BIZ_A, uid(9, 'b'), { teamspaceId: TS_A1, parentId: null })).rejects.toBeInstanceOf(DocNotFoundError);
    expect(byId(db, uid(9, 'b')).teamspace_id).toBe(TS_B);
  });
});

describe('renameNode / setNodeArchived', () => {
  it('renames title and sidebar name, but leaves a custom name alone', async () => {
    const db = seed();
    await renameNode(db as any, BIZ_A, uid(1), '  New title ');
    expect(byId(db, uid(1))).toMatchObject({ title: 'New title', name: 'New title' });
    byId(db, uid(2)).is_name_custom = true;
    byId(db, uid(2)).name = 'Custom';
    await renameNode(db as any, BIZ_A, uid(2), 'Other');
    expect(byId(db, uid(2))).toMatchObject({ title: 'Other', name: 'Custom' });
  });

  it('archives a subtree and restores it; never deletes rows', async () => {
    const db = seed();
    const before = rows(db).length;
    const { nodeIds } = await setNodeArchived(db as any, BIZ_A, uid(1), true);
    expect(nodeIds.sort()).toEqual([uid(1), uid(3), uid(4)].sort());
    expect(byId(db, uid(4)).is_archived).toBe(true);
    expect(byId(db, uid(2)).is_archived).toBe(false);
    await setNodeArchived(db as any, BIZ_A, uid(1), false);
    expect(byId(db, uid(4)).is_archived).toBe(false);
    expect(rows(db).length).toBe(before);
  });

  it("can't archive or rename another business's node", async () => {
    const db = seed();
    await expect(setNodeArchived(db as any, BIZ_A, uid(9, 'b'), true)).rejects.toBeInstanceOf(DocNotFoundError);
    await expect(renameNode(db as any, BIZ_A, uid(9, 'b'), 'pwned')).rejects.toBeInstanceOf(DocNotFoundError);
    expect(byId(db, uid(9, 'b'))).toMatchObject({ is_archived: false, title: uid(9, 'b') });
  });
});

describe('teamspaces', () => {
  it('creates at the end of the business, with description', async () => {
    const db = seed();
    const ts = await createTeamspace(db as any, BIZ_A, { name: 'Ops', icon: '🛠', description: 'ops stuff' });
    expect(ts).toMatchObject({ business_id: BIZ_A, name: 'Ops', description: 'ops stuff', position: 2 });
  });

  it("updates only whitelisted fields and can't touch another business's teamspace", async () => {
    const db = seed();
    const ts = await updateTeamspace(db as any, BIZ_A, TS_A1, { name: 'Renamed', position: 5, business_id: BIZ_B } as any);
    expect(ts).toMatchObject({ name: 'Renamed', position: 5, business_id: BIZ_A });
    await expect(updateTeamspace(db as any, BIZ_A, TS_B, { name: 'pwned' })).rejects.toThrow(/not found in this workspace/);
    expect(db.tables.teamspaces.find((t) => t.id === TS_B)!.name).toBe('B');
  });
});

describe('content editing', () => {
  const seedDoc = (md: string) => {
    const db = seed();
    byId(db, uid(1)).yjs_snapshot = Array.from(diffAppendIntoDoc(null, markdownToProseMirror(md)).snapshot);
    return db;
  };

  it('appendToNode does not add a timestamp unless asked', async () => {
    const db = seedDoc('Existing');
    await appendToNode(db as any, BIZ_A, uid(1), 'More');
    const { markdown } = await readNode(db as any, BIZ_A, uid(1));
    expect(markdown).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(markdown).toContain('More');
  });

  it('replaceNodeContent overwrites the whole document', async () => {
    const db = seedDoc('# Old\n\nOld body');
    await replaceNodeContent(db as any, BIZ_A, uid(1), '# Fresh\n\nNew body');
    const { markdown } = await readNode(db as any, BIZ_A, uid(1));
    expect(markdown).toContain('New body');
    expect(markdown).not.toContain('Old body');
  });

  it('replaceNodeSection swaps only the body under the matching heading', async () => {
    const db = seedDoc('# Plan\n\nintro\n\n## Goals\n\nold goal\n\n### Sub\n\nsub detail\n\n## Risks\n\nkeep this');
    await replaceNodeSection(db as any, BIZ_A, uid(1), '## goals', 'new goal');
    const { markdown } = await readNode(db as any, BIZ_A, uid(1));
    expect(markdown).toContain('Goals');
    expect(markdown).toContain('new goal');
    expect(markdown).not.toContain('old goal');
    expect(markdown).not.toContain('sub detail'); // nested ### belongs to the section
    expect(markdown).toContain('intro');
    expect(markdown).toContain('keep this');
  });

  it('replaceSectionContent lists available headings when none match', () => {
    const doc = markdownToProseMirror('## One\n\na\n\n## Two\n\nb');
    expect(() => replaceSectionContent(doc, 'Three', markdownToProseMirror('x'))).toThrow(/"One", "Two"/);
  });

  it('replaceSectionContent drops a duplicated heading at the start of the replacement', () => {
    const doc = markdownToProseMirror('## One\n\na');
    const next = replaceSectionContent(doc, 'One', markdownToProseMirror('## One\n\nb'));
    expect(next.content.filter((n) => n.type === 'heading')).toHaveLength(1);
  });

  it("can't edit another business's doc", async () => {
    const db = seed();
    await expect(replaceNodeContent(db as any, BIZ_A, uid(9, 'b'), 'x')).rejects.toBeInstanceOf(DocNotFoundError);
    expect(db.rpcCalls).toHaveLength(0);
  });
});
