import { describe, it, expect } from 'vitest';
import { recallMemories } from './fts';

// The actual ranking math (ts_rank_cd * recency * confidence, +1 for an
// overdue open loop, empty-query falls back to updated_at desc) lives in
// recall_memories() in 30_memory.sql — it needs a real tsvector column and
// websearch_to_tsquery(), neither of which a mocked Supabase client can
// exercise. What's unit-testable here is the calling contract: correct RPC
// name, param mapping, and limit clamping. The ranking formula itself must
// be verified against the applied migration (see section 12's manual
// checks) — not claimed as covered by this suite.

function makeFakeDb(rows: unknown[] = []) {
  const calls: { fn: string; args: any }[] = [];
  return {
    rpc: (fn: string, args: any) => {
      calls.push({ fn, args });
      return Promise.resolve({ data: rows, error: null });
    },
    _calls: calls,
  };
}

describe('recallMemories', () => {
  it('calls recall_memories with defaults when no options are given', async () => {
    const db = makeFakeDb([]);
    await recallMemories(db as any, 'biz-1');
    expect(db._calls[0].fn).toBe('recall_memories');
    expect(db._calls[0].args).toEqual({
      p_business_id: 'biz-1',
      p_query: '',
      p_kinds: null,
      p_tags: null,
      p_status: 'active',
      p_limit: 15,
    });
  });

  it('passes through query, kinds, tags, and status', async () => {
    const db = makeFakeDb([]);
    await recallMemories(db as any, 'biz-1', { query: 'pricing', kinds: ['fact', 'decision'], tags: ['pinned'], status: 'all' });
    expect(db._calls[0].args).toMatchObject({
      p_query: 'pricing',
      p_kinds: ['fact', 'decision'],
      p_tags: ['pinned'],
      p_status: 'all',
    });
  });

  it('clamps limit to [1, 50]', async () => {
    const db = makeFakeDb([]);
    await recallMemories(db as any, 'biz-1', { limit: 500 });
    expect(db._calls[0].args.p_limit).toBe(50);

    await recallMemories(db as any, 'biz-1', { limit: 0 });
    expect(db._calls[1].args.p_limit).toBe(1);
  });

  it('returns whatever the RPC returns, in the order given (ranking itself runs in Postgres)', async () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    const db = makeFakeDb(rows);
    const results = await recallMemories(db as any, 'biz-1');
    expect(results).toEqual(rows);
  });

  it('throws with a clear message when the RPC errors', async () => {
    const db = { rpc: () => Promise.resolve({ data: null, error: { message: 'function does not exist' } }) };
    await expect(recallMemories(db as any, 'biz-1')).rejects.toThrow(/recallMemories/);
  });
});
