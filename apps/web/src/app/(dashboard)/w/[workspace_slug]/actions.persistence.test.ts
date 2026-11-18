import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncBlocks, updateNode, updateYjsSnapshot, importFromURL, createNode } from './actions';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

function makeSupabase() {
  const chain: any = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    rpc: vi.fn(),
    from: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
  };
  for (const k of ['from', 'update', 'insert', 'delete', 'upsert', 'select', 'eq', 'is', 'order']) {
    chain[k].mockReturnValue(chain);
  }
  return chain;
}

let sb: ReturnType<typeof makeSupabase>;

beforeEach(() => {
  vi.clearAllMocks();
  sb = makeSupabase();
  (createClient as any).mockResolvedValue(sb);
});

describe('syncBlocks', () => {
  it('replaces blocks atomically via RPC and never upserts id-less rows (duplicate bug)', async () => {
    sb.rpc.mockResolvedValue({ data: 2, error: null });
    const res = await syncBlocks('node-1', [
      { type: 'paragraph', content: { a: 1 }, position: 0 },
      { type: 'heading', content: { b: 2 }, position: 1 },
    ] as any);

    expect(res).toEqual({ data: { count: 2 } });
    expect(sb.rpc).toHaveBeenCalledWith('replace_node_blocks', {
      p_node_id: 'node-1',
      p_blocks: [
        { type: 'paragraph', content: { a: 1 }, position: 0 },
        { type: 'heading', content: { b: 2 }, position: 1 },
      ],
    });
    expect(sb.upsert).not.toHaveBeenCalled();
  });

  it('falls back to delete-then-insert when migration 34 is not applied yet', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'not found' } });
    sb.eq.mockResolvedValueOnce({ error: null }); // delete().eq()
    sb.insert.mockResolvedValueOnce({ error: null });

    const res = await syncBlocks('node-1', [{ type: 'paragraph', content: {}, position: 0 }] as any);

    expect(sb.delete).toHaveBeenCalled();
    expect(sb.insert).toHaveBeenCalledWith([{ type: 'paragraph', content: {}, position: 0, node_id: 'node-1' }]);
    expect(res).toEqual({ data: { count: 1 } });
  });

  it('returns a friendly error, not the raw database message', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "blocks"' } });
    const res = await syncBlocks('node-1', [] as any);
    expect(res).toEqual({ error: 'You don’t have permission to do that.' });
  });
});

describe('updateNode', () => {
  it('drops fields that are not on the whitelist (e.g. business_id, created_by)', async () => {
    sb.single.mockResolvedValue({ data: { id: 'node-1' }, error: null });
    await updateNode('node-1', { title: 'New', business_id: 'other-ws', created_by: 'evil' } as any);
    expect(sb.update).toHaveBeenCalledWith({ title: 'New' });
  });

  it('does not revalidate the layout for a title change', async () => {
    sb.single.mockResolvedValue({ data: { id: 'node-1' }, error: null });
    await updateNode('node-1', { title: 'New' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('revalidates only the workspace layout for structural changes', async () => {
    sb.single.mockResolvedValue({ data: { id: 'node-1' }, error: null });
    await updateNode('node-1', { parent_id: 'p-2' });
    expect(revalidatePath).toHaveBeenCalledWith('/w/[workspace_slug]', 'layout');
  });

  it.each([
    'javascript:alert(1)',
    'linear-gradient(red, blue), url(https://tracker.example/x)',
    'http://insecure.example/x.png',
  ])('rejects unsafe cover_url %s', async (cover) => {
    const res = await updateNode('node-1', { cover_url: cover });
    expect(res).toEqual({ error: 'That cover image isn’t supported.' });
    expect(sb.update).not.toHaveBeenCalled();
  });

  it('accepts gallery gradients and https covers', async () => {
    sb.single.mockResolvedValue({ data: { id: 'node-1' }, error: null });
    for (const cover of ['linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'https://images.unsplash.com/x?w=1200&q=80']) {
      const res = await updateNode('node-1', { cover_url: cover });
      expect(res).not.toHaveProperty('error');
    }
  });
});

describe('updateYjsSnapshot', () => {
  it('requires a signed-in user', async () => {
    sb.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await updateYjsSnapshot('node-1', [1, 2, 3]);
    expect(res).toHaveProperty('error');
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it('surfaces an RLS-blocked save as an error', async () => {
    sb.rpc.mockResolvedValue({ error: { code: '42501', message: 'Not allowed to save this page' } });
    const res = await updateYjsSnapshot('node-1', [1, 2, 3]);
    expect(res).toEqual({ error: 'You don’t have permission to do that.' });
  });
});

describe('importFromURL', () => {
  it('requires a signed-in user', async () => {
    sb.auth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await importFromURL('https://example.com');
    expect(res.error).toBe('Sign in to import pages.');
  });

  it('refuses internal addresses (SSRF)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await importFromURL('http://169.254.169.254/latest/meta-data/');
    expect(res.error).toBe('That address can’t be imported.');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('createNode sibling position', () => {
  it('uses IS NULL (not eq "null") for a top-level page', async () => {
    sb.limit.mockResolvedValue({ data: [{ position: 4 }], error: null });
    sb.single.mockResolvedValue({ data: { id: 'n1' }, error: null });
    await createNode({ business_id: 'biz-1', type: 'document' });
    expect(sb.is).toHaveBeenCalledWith('parent_id', null);
    expect(sb.eq).not.toHaveBeenCalledWith('parent_id', null);
    expect(sb.insert).toHaveBeenCalledWith([expect.objectContaining({ position: 5, parent_id: null })]);
  });

  it('uses eq for a nested page', async () => {
    sb.limit.mockResolvedValue({ data: [], error: null });
    sb.single.mockResolvedValue({ data: { id: 'n2' }, error: null });
    await createNode({ business_id: 'biz-1', type: 'document', parent_id: 'parent-1' });
    expect(sb.eq).toHaveBeenCalledWith('parent_id', 'parent-1');
    expect(sb.is).not.toHaveBeenCalled();
    expect(sb.insert).toHaveBeenCalledWith([expect.objectContaining({ position: 0, parent_id: 'parent-1' })]);
  });
});
