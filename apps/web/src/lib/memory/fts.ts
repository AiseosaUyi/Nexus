import type { SupabaseClient } from '@supabase/supabase-js';
import type { Memory, MemoryKind } from './types';

export interface RecallOptions {
  query?: string;
  kinds?: MemoryKind[];
  tags?: string[];
  status?: 'active' | 'all';
  limit?: number;
}

/** Ranked recall — the actual ranking (ts_rank_cd * recency * confidence,
 * with an overdue-open-loop bonus) runs inside recall_memories() in
 * Postgres (see 30_memory.sql), since it needs the tsvector column and
 * websearch_to_tsquery(), neither of which PostgREST's REST layer exposes
 * as composable client-side operations. This is a thin, typed wrapper. */
export async function recallMemories(db: SupabaseClient, businessId: string, opts: RecallOptions = {}): Promise<Memory[]> {
  const { data, error } = await db.rpc('recall_memories', {
    p_business_id: businessId,
    p_query: opts.query ?? '',
    p_kinds: opts.kinds ?? null,
    p_tags: opts.tags ?? null,
    p_status: opts.status ?? 'active',
    p_limit: Math.min(Math.max(opts.limit ?? 15, 1), 50),
  });
  if (error) throw new Error(`recallMemories: ${error.message}`);
  return (data as Memory[]) ?? [];
}
