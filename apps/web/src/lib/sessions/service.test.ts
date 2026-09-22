import { describe, it, expect } from 'vitest';
import { startSession, finishSession } from './service';

function makeFakeDb(opts: { staleSession?: { id: string; summary: string | null } | null; insertError?: { code: string; message: string } } = {}) {
  const calls: { method: string; args?: any }[] = [];
  let insertedId: string | null = null;
  return {
    from: (table: string) => {
      if (table === 'agent_sessions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: async () => ({ data: opts.staleSession ?? null }),
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
            insertedId = 'new-session-1';
            return {
              select: () => ({
                single: async () =>
                  opts.insertError ? { data: null, error: opts.insertError } : { data: { id: insertedId }, error: null },
              }),
            };
          },
        };
      }
      if (table === 'memories') {
        return {
          insert: (values: any) => {
            calls.push({ method: 'memory-insert', args: values });
            return { select: () => ({ single: async () => ({ data: { id: 'mem-1', ...values }, error: null }) }) };
          },
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: async () => ({ data: null }) }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc: (_fn: string, args: any) => {
      calls.push({ method: 'rpc', args });
      return Promise.resolve({ data: { id: 'mem-rpc-1', was_insert: true, ...args }, error: null });
    },
    _calls: calls,
  };
}

describe('startSession', () => {
  it('starts a fresh session with no previous summary when nothing was open', async () => {
    const db = makeFakeDb({ staleSession: null });
    const result = await startSession(db as any, 'biz-1', 'gruve-command-center', 'client-1');
    expect(result.sessionId).toBe('new-session-1');
    expect(result.previousSummary).toBeNull();
    expect(db._calls.some((c) => c.method === 'update')).toBe(false);
  });

  it('auto-closes a stale open session for the same agent before starting the new one', async () => {
    const db = makeFakeDb({ staleSession: { id: 'stale-1', summary: 'left off here' } });
    const result = await startSession(db as any, 'biz-1', 'gruve-command-center', 'client-1');
    expect(result.previousSummary).toBe('left off here');
    const updateCall = db._calls.find((c) => c.method === 'update');
    expect(updateCall?.args.summary).toBe('left off here');
    expect(updateCall?.args.finished_at).toBeTruthy();
  });

  it('defaults the auto-close summary when the stale session never had one', async () => {
    const db = makeFakeDb({ staleSession: { id: 'stale-1', summary: null } });
    await startSession(db as any, 'biz-1', 'gruve-command-center', 'client-1');
    const updateCall = db._calls.find((c) => c.method === 'update');
    expect(updateCall?.args.summary).toBe('auto-closed by next session');
  });

  it('surfaces a clear error on a unique-violation race instead of throwing a raw Postgres error', async () => {
    const db = makeFakeDb({ staleSession: null, insertError: { code: '23505', message: 'duplicate key value' } });
    await expect(startSession(db as any, 'biz-1', 'gruve-command-center', 'client-1')).rejects.toThrow(
      /another session.*just started/i,
    );
  });
});

describe('finishSession', () => {
  it('stamps finished_at and writes a session_summary memory', async () => {
    const db = makeFakeDb();
    // finishSession updates agent_sessions directly (not via the fake's
    // insert/select-chain above) — extend the fake minimally inline.
    const dbWithFinish = {
      ...db,
      from: (table: string) => {
        if (table === 'agent_sessions') {
          return {
            update: (patch: any) => ({
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    single: async () => ({ data: { id: 'sess-1', ...patch }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return db.from(table);
      },
    };

    const result = await finishSession(dbWithFinish as any, 'biz-1', 'gruve-command-center', 'user-1', {
      sessionId: 'sess-1',
      summary: 'Reviewed Q3 pricing, updated two open loops.',
      decisions: ['Raise Detty December price to $60'],
      openLoops: [{ subject: 'Follow up with venue', content: 'Confirm capacity', dueAt: '2099-01-01' }],
    });

    expect(result.session.finished_at).toBeTruthy();
    expect(result.decisionsRecorded).toBe(1);
    expect(result.openLoopsRecorded).toBe(1);
  });
});
