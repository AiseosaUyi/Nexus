import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { scoreScam } from '@/lib/command/scam';

// Token-guarded automation endpoint for the Command Center MCP / heartbeat.
// Scoped to a single private workspace (default slug "aise"). Because it uses the
// service-role client it bypasses RLS, so it is protected by COMMAND_CENTER_TOKEN
// and only ever touches the one configured business.
//
// Env required:
//   COMMAND_CENTER_TOKEN            shared secret (also set in the MCP)
//   SUPABASE_SERVICE_ROLE_KEY       service role key
//   COMMAND_CENTER_BUSINESS_SLUG    default "aise"

function authed(req: NextRequest): boolean {
  const token = process.env.COMMAND_CENTER_TOKEN;
  return !!token && req.headers.get('authorization') === `Bearer ${token}`;
}

async function businessId(supabase: ReturnType<typeof createServiceClient>) {
  const slug = process.env.COMMAND_CENTER_BUSINESS_SLUG || 'aise';
  const { data } = await supabase.from('businesses').select('id').eq('slug', slug).single();
  return data?.id as string | undefined;
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
  const biz = await businessId(supabase);
  if (!biz) return NextResponse.json({ error: 'workspace not found' }, { status: 404 });

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
  const biz = await businessId(supabase);
  if (!biz) return NextResponse.json({ error: 'workspace not found' }, { status: 404 });

  const body = await req.json();
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
