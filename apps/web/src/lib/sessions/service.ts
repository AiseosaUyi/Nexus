import type { SupabaseClient } from '@supabase/supabase-js';
import { rememberMemory } from '@/lib/memory/service';

export interface AgentSession {
  id: string;
  business_id: string;
  agent: string;
  client_id: string | null;
  started_at: string;
  finished_at: string | null;
  summary: string | null;
  stats: Record<string, unknown>;
  created_at: string;
}

export interface StartSessionResult {
  sessionId: string;
  previousSummary: string | null;
}

/**
 * Auto-closes any stale unfinished session for this (business, agent) pair,
 * then starts a new one. The agent_sessions_one_open partial unique index
 * (30_memory.sql) is the actual concurrency guard — two near-simultaneous
 * calls can't both leave a session open even though this is a two-step
 * (not single-transaction) operation from here: the second INSERT would
 * hit the unique constraint and surface as a clear error rather than
 * silently succeeding.
 */
export async function startSession(
  db: SupabaseClient,
  businessId: string,
  agent: string,
  clientId: string | null,
): Promise<StartSessionResult> {
  const { data: stale } = await db
    .from('agent_sessions')
    .select('id, summary')
    .eq('business_id', businessId)
    .eq('agent', agent)
    .is('finished_at', null)
    .maybeSingle();

  let previousSummary: string | null = null;
  if (stale) {
    await db
      .from('agent_sessions')
      .update({ finished_at: new Date().toISOString(), summary: stale.summary ?? 'auto-closed by next session' })
      .eq('id', stale.id);
    previousSummary = stale.summary;
  }

  const { data: created, error } = await db
    .from('agent_sessions')
    .insert({ business_id: businessId, agent, client_id: clientId })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error('Another session for this agent just started — try again.');
    }
    throw new Error(`startSession: ${error.message}`);
  }

  return { sessionId: created.id as string, previousSummary };
}

export interface FinishSessionInput {
  sessionId: string;
  summary: string;
  stats?: Record<string, unknown>;
  decisions?: string[];
  openLoops?: Array<{ subject: string; content: string; dueAt?: string }>;
}

export interface FinishSessionResult {
  session: AgentSession;
  decisionsRecorded: number;
  openLoopsRecorded: number;
}

/**
 * TODO(step 5): once lib/docs/content.ts's appendToNode/createNode land,
 * finish this by also appending the summary to the workspace's "Session
 * log" document (H2 heading `<agent> · <ISO date>`), per spec section 8.6.
 * Deliberately not built here — the Yjs diff path those functions need is
 * its own spiked, checkpointed step, not something to rush under memory/
 * sessions. Everything else spec'd for nexus_finish_session (stamping
 * finished_at, the session_summary/decision/open_loop memories) is
 * complete and independent of that.
 */
export async function finishSession(
  db: SupabaseClient,
  businessId: string,
  agent: string,
  createdBy: string | null,
  input: FinishSessionInput,
): Promise<FinishSessionResult> {
  const { data: session, error } = await db
    .from('agent_sessions')
    .update({
      finished_at: new Date().toISOString(),
      summary: input.summary,
      stats: input.stats ?? {},
    })
    .eq('id', input.sessionId)
    .eq('business_id', businessId)
    .select('*')
    .single();
  if (error) throw new Error(`finishSession: ${error.message}`);

  const today = new Date().toISOString().slice(0, 10);
  await rememberMemory(
    db,
    businessId,
    {
      kind: 'session_summary',
      subject: `${agent} session ${today}`,
      content: input.summary,
      source: 'session',
      sourceRef: input.sessionId,
    },
    createdBy,
  );

  for (const decision of input.decisions ?? []) {
    await rememberMemory(
      db,
      businessId,
      { kind: 'decision', subject: decision.slice(0, 120), content: decision, source: 'session', sourceRef: input.sessionId },
      createdBy,
    );
  }

  for (const loop of input.openLoops ?? []) {
    await rememberMemory(
      db,
      businessId,
      {
        kind: 'open_loop',
        subject: loop.subject,
        content: loop.content,
        dueAt: loop.dueAt,
        source: 'session',
        sourceRef: input.sessionId,
      },
      createdBy,
    );
  }

  return {
    session: session as AgentSession,
    decisionsRecorded: input.decisions?.length ?? 0,
    openLoopsRecorded: input.openLoops?.length ?? 0,
  };
}

export async function getLastFinishedSession(
  db: SupabaseClient,
  businessId: string,
  agent?: string,
): Promise<AgentSession | null> {
  let query = db.from('agent_sessions').select('*').eq('business_id', businessId).not('finished_at', 'is', null);
  if (agent) query = query.eq('agent', agent);
  const { data } = await query.order('finished_at', { ascending: false }).limit(1).maybeSingle();
  return (data as AgentSession) ?? null;
}
