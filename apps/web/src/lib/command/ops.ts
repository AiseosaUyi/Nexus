import type { SupabaseClient } from '@supabase/supabase-js';
import { scoreScam } from '@/lib/command/scam';

// Single source of truth for the Command Center's operations. Called by both
// the token-guarded /api/command endpoint (legacy, POST { op, ... }) and the
// hosted MCP endpoint (/api/mcp) so behaviour never drifts between the two.
//
// Every function takes (supabase, businessId, args) — the caller resolves
// which business_id the request is allowed to touch (only enabled workspaces,
// see resolveBusinessId) and passes it in; these functions never re-check
// enablement themselves.

/** Thrown for bad input. Callers map this to a 400 (HTTP) or a tool error (MCP). */
export class OpValidationError extends Error {}

/** Resolve the target business id from an explicit slug, falling back to the env default.
 *  Only returns enabled workspaces, so a stray token can't touch a workspace that
 *  hasn't opted in. */
export async function resolveBusinessId(
  supabase: SupabaseClient,
  slug?: string | null,
) {
  const wanted = slug || process.env.COMMAND_CENTER_BUSINESS_SLUG;
  if (!wanted) return undefined;
  const { data } = await supabase
    .from('businesses')
    .select('id, command_center_enabled')
    .eq('slug', wanted)
    .single();
  if (!data?.command_center_enabled) return undefined;
  return data.id as string;
}

async function log(
  supabase: SupabaseClient,
  business_id: string, platform: string | null, kind: string,
  ref_id: string | null, detail: string,
) {
  await supabase.from('command_action_log').insert({ business_id, platform, kind, ref_id, detail });
}

export async function getPending(supabase: SupabaseClient, businessId: string) {
  const [drafts, quarantined, posts, health] = await Promise.all([
    supabase.from('opportunities').select('*').eq('business_id', businessId).eq('status', 'drafted')
      .order('fit_score', { ascending: false }),
    supabase.from('opportunities').select('*').eq('business_id', businessId).eq('status', 'quarantined'),
    supabase.from('calendar_entries').select('*, node:nodes(id,title)').eq('business_id', businessId)
      .eq('status', 'draft'),
    supabase.from('platform_health').select('*').eq('business_id', businessId)
      .order('health_score', { ascending: true }),
  ]);

  return {
    drafts: drafts.data ?? [],
    quarantined: quarantined.data ?? [],
    posts: posts.data ?? [],
    health: health.data ?? [],
    summary: {
      pendingOps: (drafts.data ?? []).length,
      quarantined: (quarantined.data ?? []).length,
      pendingPosts: (posts.data ?? []).length,
    },
  };
}

export async function captureOpportunity(supabase: SupabaseClient, businessId: string, args: {
  platform?: string; type?: string; contact?: string; source_url?: string;
  message?: string; draft_reply?: string; fit_score?: number;
}) {
  if (!args.platform || !args.message) {
    throw new OpValidationError('platform and message are required');
  }
  const { scam_score } = scoreScam(args.message ?? '');
  const status = scam_score >= 60 ? 'quarantined' : args.draft_reply ? 'drafted' : 'new';
  const { data, error } = await supabase.from('opportunities').insert({
    business_id: businessId, platform: args.platform, type: args.type ?? 'message',
    contact: args.contact ?? null, source_url: args.source_url ?? null,
    message: args.message ?? null, draft_reply: args.draft_reply ?? null,
    fit_score: args.fit_score ?? 0, scam_score, status,
  }).select('*').single();
  if (error) throw error;
  await log(supabase, businessId, args.platform, status === 'quarantined' ? 'quarantined' : 'drafted',
    data.id, status === 'quarantined' ? `quarantined scam=${scam_score}` : 'inbound captured');
  return { id: data.id as string, scam_score, status };
}

export async function draftReply(supabase: SupabaseClient, businessId: string, args: {
  id?: string; draft_reply?: string; fit_score?: number;
}) {
  if (!args.id || !args.draft_reply) {
    throw new OpValidationError('id and draft_reply are required');
  }
  const { error } = await supabase.from('opportunities')
    .update({ draft_reply: args.draft_reply, status: 'drafted',
      ...(args.fit_score != null ? { fit_score: args.fit_score } : {}) })
    .eq('id', args.id).eq('business_id', businessId);
  if (error) throw error;
  return {};
}

const DECIDE_OPPORTUNITY_MAP: Record<string, string> = { approve: 'approved', reject: 'rejected', sent: 'sent' };

export async function decideOpportunity(supabase: SupabaseClient, businessId: string, args: {
  id?: string; decision?: string;
}) {
  if (!args.id) throw new OpValidationError('id is required');
  const status = DECIDE_OPPORTUNITY_MAP[args.decision ?? ''];
  if (!status) throw new OpValidationError('bad decision');
  const { data, error } = await supabase.from('opportunities')
    .update({ status, decided_at: new Date().toISOString() })
    .eq('id', args.id).eq('business_id', businessId).select('platform').single();
  if (error) throw error;
  await log(supabase, businessId, data.platform, status === 'sent' ? 'sent' : 'checked', args.id, status);
  return { status };
}

export async function addPost(supabase: SupabaseClient, businessId: string, args: {
  platform?: string; title?: string; body?: string; media_ref?: string;
  scheduled_for?: string; quality_score?: number;
}) {
  if (!args.platform || !args.body) {
    throw new OpValidationError('platform and body are required');
  }
  // Reuse the calendar model: a backing document node + a calendar_entry.
  const { data: node, error: nodeErr } = await supabase.from('nodes').insert({
    business_id: businessId, type: 'document', title: args.title || 'Untitled post',
    name: args.title || 'Untitled post', is_name_custom: false, position: 0,
  }).select('id').single();
  if (nodeErr) throw nodeErr;
  const { data, error } = await supabase.from('calendar_entries').insert({
    node_id: node.id, business_id: businessId, platform: args.platform, status: 'draft',
    publish_date: args.scheduled_for ?? null, notes: args.body ?? null,
    properties: { body: args.body ?? '', media_ref: args.media_ref ?? null,
      quality_score: args.quality_score ?? 0 },
  }).select('id').single();
  if (error) throw error;
  await log(supabase, businessId, args.platform, 'drafted', data.id, 'post drafted');
  return { id: data.id as string };
}

const DECIDE_POST_MAP: Record<string, string> = { approve: 'scheduled', posted: 'published', reject: 'cancelled' };

export async function decidePost(supabase: SupabaseClient, businessId: string, args: {
  id?: string; decision?: string; post_url?: string;
}) {
  if (!args.id) throw new OpValidationError('id is required');
  const status = DECIDE_POST_MAP[args.decision ?? ''];
  if (!status) throw new OpValidationError('bad decision');
  const { data, error } = await supabase.from('calendar_entries')
    .update({ status, ...(args.post_url ? { properties: { post_url: args.post_url } } : {}) })
    .eq('id', args.id).eq('business_id', businessId).select('platform').single();
  if (error) throw error;
  await log(supabase, businessId, data.platform, status === 'published' ? 'posted' : 'checked', args.id, status);
  return { status };
}

export async function recordHealth(supabase: SupabaseClient, businessId: string, args: {
  platform?: string; health_score?: number; top_fix?: string; kind?: string; handle?: string;
}) {
  if (!args.platform || args.health_score == null) {
    throw new OpValidationError('platform and health_score are required');
  }
  const { error } = await supabase.from('platform_health').upsert({
    business_id: businessId, platform: args.platform, health_score: args.health_score,
    top_fix: args.top_fix ?? null, last_checked: new Date().toISOString(),
    ...(args.kind ? { kind: args.kind } : {}), ...(args.handle !== undefined ? { handle: args.handle } : {}),
  }, { onConflict: 'business_id,platform' });
  if (error) throw error;
  await log(supabase, businessId, args.platform, 'scored', null, `health=${args.health_score}`);
  return {};
}
