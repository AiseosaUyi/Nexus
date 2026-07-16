import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import * as ops from '@/lib/command/ops';

// Token-guarded automation endpoint for the Command Center MCP / heartbeat.
// The target workspace is resolved dynamically from the request (?workspace=slug on
// GET, or { workspace } in the POST body), so this is NOT tied to any single
// workspace. COMMAND_CENTER_BUSINESS_SLUG is only an optional default for a
// single-operator setup. It uses the service-role client (bypasses RLS) and is
// therefore protected by COMMAND_CENTER_TOKEN; it only ever touches a workspace
// that has command_center_enabled = true.
//
// The op handlers themselves live in @/lib/command/ops so /api/mcp (the hosted
// remote MCP endpoint) can share the exact same logic — this file only owns
// auth, workspace resolution, and translating ops results/errors to HTTP.
//
// Env required:
//   COMMAND_CENTER_TOKEN            shared secret (also set in the MCP)
//   SUPABASE_SERVICE_ROLE_KEY       service role key
//   COMMAND_CENTER_BUSINESS_SLUG    optional default workspace slug

function authed(req: NextRequest): boolean {
  const token = process.env.COMMAND_CENTER_TOKEN;
  return !!token && req.headers.get('authorization') === `Bearer ${token}`;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return new NextResponse('Unauthorized', { status: 401 });
  const supabase = createServiceClient();
  const slug = req.nextUrl.searchParams.get('workspace');
  const biz = await ops.resolveBusinessId(supabase, slug);
  if (!biz) return NextResponse.json({ error: 'workspace not found or not enabled' }, { status: 404 });

  return NextResponse.json(await ops.getPending(supabase, biz));
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return new NextResponse('Unauthorized', { status: 401 });
  const supabase = createServiceClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const biz = await ops.resolveBusinessId(supabase, body.workspace);
  if (!biz) return NextResponse.json({ error: 'workspace not found or not enabled' }, { status: 404 });

  const op = body.op as string;

  try {
    switch (op) {
      case 'capture_opportunity': {
        const result = await ops.captureOpportunity(supabase, biz, body);
        return NextResponse.json({ ok: true, ...result });
      }
      case 'draft_reply': {
        await ops.draftReply(supabase, biz, body);
        return NextResponse.json({ ok: true });
      }
      case 'decide_opportunity': {
        const result = await ops.decideOpportunity(supabase, biz, body);
        return NextResponse.json({ ok: true, ...result });
      }
      case 'add_post': {
        const result = await ops.addPost(supabase, biz, body);
        return NextResponse.json({ ok: true, ...result });
      }
      case 'decide_post': {
        const result = await ops.decidePost(supabase, biz, body);
        return NextResponse.json({ ok: true, ...result });
      }
      case 'record_health': {
        await ops.recordHealth(supabase, biz, body);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: `unknown op ${op}` }, { status: 400 });
    }
  } catch (e: any) {
    if (e instanceof ops.OpValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
