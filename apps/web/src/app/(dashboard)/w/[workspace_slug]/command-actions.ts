'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { scoreScam } from '@/lib/command/scam';
import type {
  Opportunity,
  OpportunityStatus,
  PlatformHealth,
} from '@nexus/api/schema';

/** Load everything for the Command Center dashboard in one shot. */
export async function getCommandCenter(businessId: string) {
  const supabase = await createClient();
  const [ops, health, log] = await Promise.all([
    supabase
      .from('opportunities')
      .select('*')
      .eq('business_id', businessId)
      .order('scam_score', { ascending: false })
      .order('fit_score', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('platform_health')
      .select('*')
      .eq('business_id', businessId)
      .order('health_score', { ascending: true }),
    supabase
      .from('command_action_log')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return {
    opportunities: (ops.data ?? []) as Opportunity[],
    health: (health.data ?? []) as PlatformHealth[],
    log: log.data ?? [],
  };
}

/** Capture a new inbound item; auto-scores scam risk and quarantines if >= 60. */
export async function captureOpportunity(payload: {
  business_id: string;
  platform: string;
  type?: 'message' | 'comment' | 'job' | 'invite';
  contact?: string | null;
  source_url?: string | null;
  message?: string | null;
  draft_reply?: string | null;
  fit_score?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { scam_score } = scoreScam(payload.message ?? '');
  const status: OpportunityStatus =
    scam_score >= 60 ? 'quarantined' : payload.draft_reply ? 'drafted' : 'new';

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      business_id: payload.business_id,
      platform: payload.platform,
      type: payload.type ?? 'message',
      contact: payload.contact ?? null,
      source_url: payload.source_url ?? null,
      message: payload.message ?? null,
      draft_reply: payload.draft_reply ?? null,
      fit_score: payload.fit_score ?? 0,
      scam_score,
      status,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) return { error: error.message };
  await logAction(payload.business_id, payload.platform,
    status === 'quarantined' ? 'error' : 'drafted', data.id,
    status === 'quarantined' ? `quarantined scam=${scam_score}` : 'inbound captured');
  revalidatePath('/', 'layout');
  return { data: data as Opportunity };
}

/** Attach/replace a draft reply and move an opportunity into the approval queue. */
export async function draftReply(id: string, draft_reply: string, fit_score?: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('opportunities')
    .update({ draft_reply, status: 'drafted', ...(fit_score != null ? { fit_score } : {}) })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** The review loop: approve | reject | sent. */
export async function decideOpportunity(
  id: string,
  decision: 'approve' | 'reject' | 'sent',
) {
  const map = { approve: 'approved', reject: 'rejected', sent: 'sent' } as const;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('opportunities')
    .update({ status: map[decision], decided_at: new Date().toISOString() })
    .eq('id', id)
    .select('business_id, platform')
    .single();
  if (error) return { error: error.message };
  await logAction(data.business_id, data.platform,
    decision === 'sent' ? 'sent' : 'checked', id, map[decision]);
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Record/refresh a platform health score + the single top fix. */
export async function recordHealth(payload: {
  business_id: string;
  platform: string;
  health_score: number;
  top_fix?: string | null;
  kind?: 'inbound' | 'content' | 'both';
  handle?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('platform_health')
    .upsert(
      {
        business_id: payload.business_id,
        platform: payload.platform,
        health_score: payload.health_score,
        top_fix: payload.top_fix ?? null,
        last_checked: new Date().toISOString(),
        ...(payload.kind ? { kind: payload.kind } : {}),
        ...(payload.handle !== undefined ? { handle: payload.handle } : {}),
      },
      { onConflict: 'business_id,platform' },
    );
  if (error) return { error: error.message };
  await logAction(payload.business_id, payload.platform, 'scored', null,
    `health=${payload.health_score}`);
  revalidatePath('/', 'layout');
  return { ok: true };
}

async function logAction(
  business_id: string,
  platform: string | null,
  kind: string,
  ref_id: string | null,
  detail: string,
) {
  const supabase = await createClient();
  await supabase.from('command_action_log').insert({ business_id, platform, kind, ref_id, detail });
}
