import { describe, it, expect } from 'vitest';
import { decidePost, decideOpportunity, OpValidationError } from './ops';

// Regression suite for lib/command/ops.ts — this file had ZERO test
// coverage before the Nexus Brain MCP build touched it (verified: no
// ops.test.ts existed in this directory), and it's called from both the
// legacy /api/command REST endpoint and the new nexus_cc_* MCP tools, so a
// change here has two live callers to protect.

type Row = Record<string, unknown>;

/** Minimal chainable fake matching exactly the .from().select()/.update()
 * .eq().eq().select().single() shapes ops.ts uses — not a generic Supabase
 * mock, just enough surface for these two functions plus the log() insert
 * every branch calls. */
function makeFakeSupabase(opts: {
  calendarEntryRow: Row;
  opportunityRow?: Row;
}) {
  let currentProperties = (opts.calendarEntryRow.properties as Row) ?? {};
  const inserts: Row[] = [];
  const updates: Row[] = [];

  const calendarEntries = {
    select: (_cols: string) => ({
      eq: () => ({
        eq: () => ({
          single: async () => ({ data: { ...opts.calendarEntryRow, properties: currentProperties }, error: null }),
        }),
      }),
    }),
    update: (patch: Row) => {
      updates.push(patch);
      if (patch.properties) currentProperties = patch.properties as Row;
      return {
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { platform: opts.calendarEntryRow.platform }, error: null }),
            }),
          }),
        }),
      };
    },
  };

  const opportunities = {
    update: (patch: Row) => {
      updates.push(patch);
      return {
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { platform: opts.opportunityRow?.platform }, error: null }),
            }),
          }),
        }),
      };
    },
  };

  const commandActionLog = {
    insert: async (values: Row) => {
      inserts.push(values);
      return { error: null };
    },
  };

  return {
    from: (table: string) => {
      if (table === 'calendar_entries') return calendarEntries;
      if (table === 'opportunities') return opportunities;
      if (table === 'command_action_log') return commandActionLog;
      throw new Error(`unexpected table ${table}`);
    },
    _inserts: inserts,
    _updates: updates,
  };
}

describe('decidePost', () => {
  it('merges post_url into existing properties instead of replacing them', async () => {
    const supabase = makeFakeSupabase({
      calendarEntryRow: {
        platform: 'Twitter',
        properties: { body: 'hello world', media_ref: 'img-1', quality_score: 80 },
      },
    });

    const result = await decidePost(supabase as any, 'biz-1', {
      id: 'entry-1',
      decision: 'posted',
      post_url: 'https://twitter.com/x/status/1',
    });

    expect(result).toEqual({ status: 'published' });
    const updateWithProperties = supabase._updates.find((u) => u.properties);
    expect(updateWithProperties?.properties).toEqual({
      body: 'hello world',
      media_ref: 'img-1',
      quality_score: 80,
      post_url: 'https://twitter.com/x/status/1',
    });
  });

  it('does not touch properties at all when no post_url is given', async () => {
    const supabase = makeFakeSupabase({
      calendarEntryRow: { platform: 'Twitter', properties: { body: 'hello world' } },
    });

    await decidePost(supabase as any, 'biz-1', { id: 'entry-1', decision: 'approve' });

    const updateWithProperties = supabase._updates.find((u) => 'properties' in u);
    expect(updateWithProperties).toBeUndefined();
  });

  it('maps decisions to the correct status', async () => {
    const cases: Array<[string, string]> = [
      ['approve', 'scheduled'],
      ['posted', 'published'],
      ['reject', 'cancelled'],
    ];
    for (const [decision, expectedStatus] of cases) {
      const supabase = makeFakeSupabase({ calendarEntryRow: { platform: 'Twitter', properties: {} } });
      const result = await decidePost(supabase as any, 'biz-1', { id: 'entry-1', decision });
      expect(result).toEqual({ status: expectedStatus });
    }
  });

  it('throws OpValidationError for a missing id', async () => {
    const supabase = makeFakeSupabase({ calendarEntryRow: { platform: 'Twitter', properties: {} } });
    await expect(decidePost(supabase as any, 'biz-1', { decision: 'posted' })).rejects.toBeInstanceOf(
      OpValidationError,
    );
  });

  it('throws OpValidationError for an unknown decision', async () => {
    const supabase = makeFakeSupabase({ calendarEntryRow: { platform: 'Twitter', properties: {} } });
    await expect(
      decidePost(supabase as any, 'biz-1', { id: 'entry-1', decision: 'not-a-real-decision' }),
    ).rejects.toBeInstanceOf(OpValidationError);
  });

  it('writes an action log entry', async () => {
    const supabase = makeFakeSupabase({ calendarEntryRow: { platform: 'Twitter', properties: {} } });
    await decidePost(supabase as any, 'biz-1', { id: 'entry-1', decision: 'posted' });
    expect(supabase._inserts).toHaveLength(1);
    expect(supabase._inserts[0]).toMatchObject({ business_id: 'biz-1', platform: 'Twitter', kind: 'posted' });
  });
});

describe('decideOpportunity', () => {
  it('maps decisions to the correct status', async () => {
    const cases: Array<[string, string]> = [
      ['approve', 'approved'],
      ['reject', 'rejected'],
      ['sent', 'sent'],
    ];
    for (const [decision, expectedStatus] of cases) {
      const supabase = makeFakeSupabase({
        calendarEntryRow: { platform: 'Twitter', properties: {} },
        opportunityRow: { platform: 'Upwork' },
      });
      const result = await decideOpportunity(supabase as any, 'biz-1', { id: 'opp-1', decision });
      expect(result).toEqual({ status: expectedStatus });
    }
  });

  it('throws OpValidationError for a missing id', async () => {
    const supabase = makeFakeSupabase({ calendarEntryRow: { platform: 'Twitter', properties: {} } });
    await expect(decideOpportunity(supabase as any, 'biz-1', { decision: 'approve' })).rejects.toBeInstanceOf(
      OpValidationError,
    );
  });

  it('throws OpValidationError for an unknown decision', async () => {
    const supabase = makeFakeSupabase({ calendarEntryRow: { platform: 'Twitter', properties: {} } });
    await expect(
      decideOpportunity(supabase as any, 'biz-1', { id: 'opp-1', decision: 'bogus' }),
    ).rejects.toBeInstanceOf(OpValidationError);
  });
});
