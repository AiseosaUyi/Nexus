import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeDedupeKey, detectSecretPattern, rememberMemory, MemoryValidationError } from './service';

describe('computeDedupeKey', () => {
  it('is the same for the same (kind, subject) regardless of case', () => {
    expect(computeDedupeKey('fact', 'Detty December pricing')).toBe(computeDedupeKey('fact', 'detty december pricing'));
  });

  it('differs across kinds for the same subject', () => {
    expect(computeDedupeKey('fact', 'x')).not.toBe(computeDedupeKey('decision', 'x'));
  });

  it('differs across subjects for the same kind', () => {
    expect(computeDedupeKey('fact', 'x')).not.toBe(computeDedupeKey('fact', 'y'));
  });
});

describe('detectSecretPattern', () => {
  it.each([
    ['nexus_key_abc123', 'nexus_key_'],
    ['a gruve_live_a1b2c3 key', 'gruve_live_'],
    ['pulse_ext_xyz', 'pulse_ext_'],
    ['sk-abc123', 'sk-'],
    ['Authorization: Bearer eyJhbGciOi', 'Bearer '],
    ['card number 4111111111111111', '16+ digit card-like run'],
    ['-----BEGIN PRIVATE KEY-----', '-----BEGIN'],
  ])('flags %s as %s', (content, expected) => {
    expect(detectSecretPattern(content)).toBe(expected);
  });

  it('returns null for ordinary prose', () => {
    expect(detectSecretPattern('The Detty December pricing is $50/ticket, decided on a call with Tola.')).toBeNull();
  });
});

function makeFakeDb(opts: { activeRow?: { id: string } | null; rpcResult?: any } = {}) {
  const calls: { method: string; args: any }[] = [];
  return {
    from: (table: string) => {
      calls.push({ method: `from:${table}`, args: undefined });
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: opts.activeRow ?? null }),
              }),
            }),
          }),
        }),
        update: (patch: any) => {
          calls.push({ method: 'update', args: patch });
          return { eq: async () => ({ error: null }) };
        },
        insert: (values: any) => {
          calls.push({ method: 'insert', args: values });
          return {
            select: () => ({
              single: async () => ({ data: { id: 'new-row', ...values }, error: null }),
            }),
          };
        },
      };
    },
    rpc: (fn: string, args: any) => {
      calls.push({ method: `rpc:${fn}`, args });
      return Promise.resolve({ data: opts.rpcResult ?? { id: 'row-1', was_insert: true, ...args }, error: null });
    },
    _calls: calls,
  };
}

describe('rememberMemory', () => {
  it('rejects dueAt on a non-open_loop kind', async () => {
    const db = makeFakeDb();
    await expect(
      rememberMemory(db as any, 'biz-1', { kind: 'fact', subject: 'x', content: 'y', dueAt: '2099-01-01' }, null),
    ).rejects.toBeInstanceOf(MemoryValidationError);
  });

  it('rejects content matching a secret pattern before calling the DB at all', async () => {
    const db = makeFakeDb();
    await expect(
      rememberMemory(db as any, 'biz-1', { kind: 'fact', subject: 'x', content: 'here is nexus_key_abc123' }, null),
    ).rejects.toBeInstanceOf(MemoryValidationError);
    expect(db._calls).toHaveLength(0);
  });

  it('calls the atomic upsert RPC with the computed dedupe key for the default (non-supersede) path', async () => {
    const db = makeFakeDb({ rpcResult: { id: 'row-1', was_insert: true } });
    const { action } = await rememberMemory(db as any, 'biz-1', { kind: 'fact', subject: 'x', content: 'y' }, 'user-1');
    expect(action).toBe('created');
    const rpcCall = db._calls.find((c) => c.method === 'rpc:remember_memory');
    expect(rpcCall?.args.p_dedupe_key).toBe(computeDedupeKey('fact', 'x'));
    expect(rpcCall?.args.p_business_id).toBe('biz-1');
  });

  it('reports "updated" when the RPC reports was_insert: false', async () => {
    const db = makeFakeDb({ rpcResult: { id: 'row-1', was_insert: false } });
    const { action } = await rememberMemory(db as any, 'biz-1', { kind: 'fact', subject: 'x', content: 'y' }, null);
    expect(action).toBe('updated');
  });

  it('supersede chain: marks the existing active row superseded and inserts a new one pointing back to it', async () => {
    const db = makeFakeDb({ activeRow: { id: 'old-row' } });
    const { action, memory } = await rememberMemory(
      db as any,
      'biz-1',
      { kind: 'insight', subject: 'Gruve snapshot', content: 'new numbers', supersede: true },
      null,
    );
    expect(action).toBe('superseded');
    expect(memory.supersedes_id).toBe('old-row');

    const updateCall = db._calls.find((c) => c.method === 'update');
    expect(updateCall?.args).toEqual({ status: 'superseded' });
    const insertCall = db._calls.find((c) => c.method === 'insert');
    expect(insertCall?.args.supersedes_id).toBe('old-row');
    // Supersede path never touches the RPC — it's a deliberate two-step
    // write, not the concurrent-race path the RPC exists to close.
    expect(db._calls.some((c) => c.method.startsWith('rpc:'))).toBe(false);
  });

  it('falls through to the normal upsert RPC when supersede is true but nothing is active yet', async () => {
    const db = makeFakeDb({ activeRow: null, rpcResult: { id: 'row-1', was_insert: true } });
    const { action } = await rememberMemory(
      db as any,
      'biz-1',
      { kind: 'insight', subject: 'Gruve snapshot', content: 'first numbers', supersede: true },
      null,
    );
    expect(action).toBe('created');
    expect(db._calls.some((c) => c.method === 'rpc:remember_memory')).toBe(true);
  });
});
