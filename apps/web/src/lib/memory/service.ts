import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Memory, MemoryKind, RememberInput, RememberAction } from './types';

export function computeDedupeKey(kind: MemoryKind, subject: string): string {
  return createHash('sha256').update(`${kind}|${subject}`.toLowerCase()).digest('hex');
}

/** Obvious secret shapes nexus_remember must never persist — content is
 * plain prose written into a durable, recall-ranked store, not a secrets
 * vault. Returns the pattern name that matched, or null if clean. */
const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'nexus_key_', re: /nexus_key_/i },
  { name: 'gruve_live_', re: /gruve_live_/i },
  { name: 'pulse_ext_', re: /pulse_ext_/i },
  { name: 'sk-', re: /\bsk-[a-zA-Z0-9]/ },
  { name: 'Bearer ', re: /\bBearer\s+\S/i },
  { name: '16+ digit card-like run', re: /\b\d{16,}\b/ },
  { name: '-----BEGIN', re: /-----BEGIN/ },
];

export function detectSecretPattern(content: string): string | null {
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(content)) return name;
  }
  return null;
}

export class MemoryValidationError extends Error {}

export interface RememberResult {
  memory: Memory;
  action: RememberAction;
}

export async function rememberMemory(
  db: SupabaseClient,
  businessId: string,
  input: RememberInput,
  createdBy: string | null,
): Promise<RememberResult> {
  if (input.dueAt && input.kind !== 'open_loop') {
    throw new MemoryValidationError('dueAt is only valid for kind: open_loop');
  }
  const secretHit = detectSecretPattern(input.content);
  if (secretHit) {
    throw new MemoryValidationError(`Content matches a secret pattern (${secretHit}) and was not stored`);
  }

  const dedupeKey = computeDedupeKey(input.kind, input.subject);
  const source = input.source ?? 'cowork';
  const confidence = input.confidence ?? 80;

  if (input.supersede) {
    const { data: existing } = await db
      .from('memories')
      .select('id')
      .eq('business_id', businessId)
      .eq('dedupe_key', dedupeKey)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      const { error: supersedeError } = await db
        .from('memories')
        .update({ status: 'superseded' })
        .eq('id', existing.id);
      if (supersedeError) throw new Error(`rememberMemory (supersede): ${supersedeError.message}`);

      const { data: inserted, error: insertError } = await db
        .from('memories')
        .insert({
          business_id: businessId,
          kind: input.kind,
          subject: input.subject,
          content: input.content,
          tags: input.tags ?? [],
          source,
          source_ref: input.sourceRef ?? null,
          confidence,
          due_at: input.dueAt ?? null,
          node_id: input.nodeId ?? null,
          dedupe_key: dedupeKey,
          supersedes_id: existing.id,
          created_by: createdBy,
        })
        .select('*')
        .single();
      if (insertError) throw new Error(`rememberMemory (supersede insert): ${insertError.message}`);
      return { memory: inserted as Memory, action: 'superseded' };
    }
    // Nothing active to supersede — falls through to the normal upsert path.
  }

  const { data, error } = await db.rpc('remember_memory', {
    p_business_id: businessId,
    p_kind: input.kind,
    p_subject: input.subject,
    p_content: input.content,
    p_tags: input.tags ?? [],
    p_source: source,
    p_source_ref: input.sourceRef ?? null,
    p_confidence: confidence,
    p_due_at: input.dueAt ?? null,
    p_node_id: input.nodeId ?? null,
    p_dedupe_key: dedupeKey,
    p_created_by: createdBy,
  });
  if (error) throw new Error(`rememberMemory: ${error.message}`);

  const row = data as Memory & { was_insert: boolean };
  const { was_insert, ...memory } = row;
  return { memory: memory as Memory, action: was_insert ? 'created' : 'updated' };
}

export interface UpdateMemoryInput {
  status?: 'active' | 'resolved' | 'archived';
  content?: string;
  tags?: string[];
  dueAt?: string;
  confidence?: number;
}

export async function updateMemory(
  db: SupabaseClient,
  businessId: string,
  id: string,
  patch: UpdateMemoryInput,
): Promise<Memory> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.content !== undefined) update.content = patch.content;
  if (patch.tags !== undefined) update.tags = patch.tags;
  if (patch.dueAt !== undefined) update.due_at = patch.dueAt;
  if (patch.confidence !== undefined) update.confidence = patch.confidence;

  const { data, error } = await db
    .from('memories')
    .update(update)
    .eq('id', id)
    .eq('business_id', businessId)
    .select('*')
    .single();
  if (error) throw new Error(`updateMemory: ${error.message}`);
  return data as Memory;
}

export async function forgetMemory(
  db: SupabaseClient,
  businessId: string,
  id: string,
  createdBy: string | null,
  reason?: string,
): Promise<Memory> {
  const { data, error } = await db
    .from('memories')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', businessId)
    .select('*')
    .single();
  if (error) throw new Error(`forgetMemory: ${error.message}`);

  if (reason) {
    await rememberMemory(
      db,
      businessId,
      {
        kind: 'insight',
        subject: `Archived ${data.subject}`,
        content: `Archived "${data.subject}": ${reason}`,
        source: 'session',
      },
      createdBy,
    );
  }

  return data as Memory;
}

export interface OpenLoopsOptions {
  includeOverdueOnly?: boolean;
  limit?: number;
}

export async function listOpenLoops(
  db: SupabaseClient,
  businessId: string,
  opts: OpenLoopsOptions = {},
): Promise<Memory[]> {
  let query = db
    .from('memories')
    .select('*')
    .eq('business_id', businessId)
    .eq('kind', 'open_loop')
    .eq('status', 'active');

  if (opts.includeOverdueOnly) {
    query = query.lt('due_at', new Date().toISOString());
  }

  const { data, error } = await query
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(opts.limit ?? 25);
  if (error) throw new Error(`listOpenLoops: ${error.message}`);
  return (data as Memory[]) ?? [];
}

export interface TimelineOptions {
  since: string;
  until?: string;
  kinds?: MemoryKind[];
}

export async function getMemoryTimeline(db: SupabaseClient, businessId: string, opts: TimelineOptions): Promise<Memory[]> {
  let query = db
    .from('memories')
    .select('*')
    .eq('business_id', businessId)
    .gte('updated_at', opts.since);
  if (opts.until) query = query.lte('updated_at', opts.until);
  if (opts.kinds?.length) query = query.in('kind', opts.kinds);

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw new Error(`getMemoryTimeline: ${error.message}`);
  return (data as Memory[]) ?? [];
}
