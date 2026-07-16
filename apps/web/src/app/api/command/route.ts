import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { scoreScam } from '@/lib/command/scam';

// Token-guarded automation endpoint for the Command Center MCP / heartbeat.
// The target workspace is resolved dynamically from the request (?workspace=slug on
// GET, or { workspace } in the POST body), so this is NOT tied to any single
// workspace. COMMAND_CENTER_BUSINESS_SLUG is only an optional default for a
// single-operator setup. It uses the service-role client (bypasses RLS) and is
// therefore protected by COMMAND_CENTER_TOKEN; it only ever touches a workspace
// that has command_center_enabled = true.
//
// Env required:
//   COMMAND_CENTER_TOKEN            shared secret (also set in the MCP)
//   SUPABASE_SERVICE_ROLE_KEY       service role key
//   COMMAND_CENTER_BUSINESS_SLUG    optional default workspace slug

function authed(req: NextRequest): boolean {
  const token = process.env.COMMAND_CENTER_TOKEN;
  return !!token && req.headers.get('authorization') === `Bearer ${token}`;
}

/** Resolve the target business id from an explicit slug, falling back to the env default.
 *  Only returns enabled workspaces, so a stray token can't touch a workspace that
 *  hasn't opted in. */
async function businessId(
  supabase: ReturnType<typeof createServiceClient>,
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
  supabase: ReturnType<typeof createServiceClient>,
  business_id: string, platform: string | null, kind: string,
  ref_id: string | null, detail: string,
) {
  await supabase.from('command_action_log').insert({ business_id, platform, kind, ref_id, detail });
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return new NextResponse('Unauthorized', { status: 401 });
  const supabase = createServiceClient();
  const slug = req.nextUrl.searchParams.get('workspace');
  const biz = await businessId(supabase, slug);
  if (!biz) return NextResponse.json({ error: 'workspace not found or not enabled' }, { status: 404 });

  const [drafts, quarantined, posts, health] = await Promise.all([
    supabase.from('opportunities').select('*').eq('business_id', biz).eq('status', 'drafted')
      .order('fit_score', { ascending: false }),
    supabase.from('opportunities').select('*').eq('business_id', biz).eq('status', 'quarantined'),
    supabase.from('calendar_entries').select('*, node:nodes(id,title)').eq('business_id', biz)
      .eq('status', 'draft'),
    supabase.from('platform_health').select('*').eq('business_id', biz)
      .order('health_score', { ascending: true }),
  ]);

  return NextResponse.json({
    drafts: drafts.data ?? [],
    quarantined: quarantined.data ?? [],
    posts: posts.data ?? [],
    health: health.data ?? [],
    summary: {
      pendingOps: (drafts.data ?? []).length,
      quarantined: (quarantined.data ?? []).length,
      pendingPosts: (posts.data ?? []).length,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return new NextResponse('Unauthorized', { status: 401 });
  const supabase = createServiceClient();
  const body = await req.json();
  const biz = await businessId(supabase, body.workspace);
  if (!biz) return NextResponse.json({ error: 'workspace not found or not enabled' }, { status: 404 });

  const op = body.op as string;

  try {
    switch (op) {
      case 'capture_opportunity': {
        const { scam_score } = scoreScam(body.message ?? '');
        const status = scam_score >= 60 ? 'quarantined' : body.draft_reply ? 'drafted' : 'new';
        const { data, error } = await supabase.from('opportunities').insert({
          business_id: biz, platform: body.platform, type: body.type ?? 'message',
          contact: body.contact ?? null, source_url: body.source_url ?? null,
          message: body.message ?? null, draft_reply: body.draft_reply ?? null,
          fit_score: body.fit_score ?? 0, scam_score, status,
        }).select('*').single();
        if (error) throw error;
        await log(supabase, biz, body.platform, status === 'quarantined' ? 'error' : 'drafted',
          data.id, status === 'quarantined' ? `quarantined scam=${scam_score}` : 'inbound captured');
        return NextResponse.json({ ok: true, id: data.id, scam_score, status });
      }
      case 'draft_reply': {
        const { error } = await supabase.from('opportunities')
          .update({ draft_reply: body.draft_reply, status: 'drafted',
            ...(body.fit_score != null ? { fit_score: body.fit_score } : {}) })
          .eq('id', body.id).eq('business_id', biz);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case 'decide_opportunity': {
        const map: Record<string, string> = { approve: 'approved', reject: 'rejected', sent: 'sent' };
        const status = map[body.decision];
        if (!status) return NextResponse.json({ error: 'bad decision' }, { status: 400 });
        const { data, error } = await supabase.from('opportunities')
          .update({ status, decided_at: new Date().toISOString() })
          .eq('id', body.id).eq('business_id', biz).select('platform').single();
        if (error) throw error;
        await log(supabase, biz, data.platform, status === 'sent' ? 'sent' : 'checked', body.id, status);
        return NextResponse.json({ ok: true, status });
      }
      case 'add_post': {
        // Reuse the calendar model: a backing document node + a calendar_entry.
        const { data: node, error: nodeErr } = await supabase.from('nodes').insert({
          business_id: biz, type: 'document', title: body.title || 'Untitled post',
          name: body.title || 'Untitled post', is_name_custom: false, position: 0,
        }).select('id').single();
        if (nodeErr) throw nodeErr;
        const { data, error } = await supabase.from('calendar_entries').insert({
          node_id: node.id, business_id: biz, platform: body.platform, status: 'draft',
          publish_date: body.scheduled_for ?? null, notes: body.body ?? null,
          properties: { body: body.body ?? '', media_ref: body.media_ref ?? null,
            quality_score: body.quality_score ?? 0 },
        }).select('id').single();
        if (error) throw error;
        await log(supabase, biz, body.platform, 'drafted', data.id, 'post drafted');
        return NextResponse.json({ ok: true, id: data.id });
      }
      case 'decide_post': {
        const map: Record<string, string> = { approve: 'scheduled', posted: 'published', reject: 'cancelled' };
        const status = map[body.decision];
        if (!status) return NextResponse.json({ error: 'bad decision' }, { status: 400 });
        const { data, error } = await supabase.from('calendar_entries')
          .update({ status, ...(body.post_url ? { properties: { post_url: body.post_url } } : {}) })
          .eq('id', body.id).eq('business_id', biz).select('platform').single();
        if (error) throw error;
        await log(supabase, biz, data.platform, status === 'published' ? 'posted' : 'checked', body.id, status);
        return NextResponse.json({ ok: true, status });
      }
      case 'record_health': {
        const { error } = await supabase.from('platform_health').upsert({
          business_id: biz, platform: body.platform, health_score: body.health_score,
          top_fix: body.top_fix ?? null, last_checked: new Date().toISOString(),
          ...(body.kind ? { kind: body.kind } : {}), ...(body.handle !== undefined ? { handle: body.handle } : {}),
        }, { onConflict: 'business_id,platform' });
        if (error) throw error;
        await log(supabase, biz, body.platform, 'scored', null, `health=${body.health_score}`);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: `unknown op ${op}` }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
