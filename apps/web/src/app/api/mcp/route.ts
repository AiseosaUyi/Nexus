import { NextRequest, NextResponse } from 'next/server';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import * as ops from '@/lib/command/ops';

// Hosted remote MCP endpoint for the Command Center — the URL-based twin of
// services/command-mcp (the stdio version, kept as-is for local/manual use).
// Add this as a Custom Connector in Claude: URL + an Authorization: Bearer
// header set to COMMAND_CENTER_TOKEN. No local process required.
//
// All 7 tools delegate to @/lib/command/ops — the same functions /api/command
// calls — so behaviour never drifts between the token-guarded REST endpoint
// and this MCP endpoint.

// Accept the shared secret either as an Authorization: Bearer header (used by the
// stdio MCP and curl) OR as a `?key=` query param. The query-param path exists
// because Claude's "Add custom connector" dialog only offers a URL + OAuth — it has
// no request-headers field — so the secret has to travel in the URL itself, e.g.
//   https://<domain>/api/mcp?key=<COMMAND_CENTER_TOKEN>
function authed(req: NextRequest): boolean {
  const token = process.env.COMMAND_CENTER_TOKEN;
  if (!token) return false;
  const byHeader = req.headers.get('authorization') === `Bearer ${token}`;
  const byQuery = req.nextUrl.searchParams.get('key') === token;
  return byHeader || byQuery;
}

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errResult(message: string): ToolResult {
  return { content: [{ type: 'text', text: `ERROR: ${message}` }], isError: true };
}

/** Resolves the workspace (falling back to COMMAND_CENTER_BUSINESS_SLUG), only ever
 *  touching a workspace with command_center_enabled = true, then runs the op. */
async function withWorkspace<T>(
  workspace: string | undefined,
  run: (supabase: ReturnType<typeof createServiceClient>, businessId: string) => Promise<T>,
): Promise<ToolResult> {
  const supabase = createServiceClient();
  try {
    const biz = await ops.resolveBusinessId(supabase, workspace);
    if (!biz) return errResult(`workspace not found or not enabled: ${workspace ?? '(default)'}`);
    return ok(await run(supabase, biz));
  } catch (e: any) {
    return errResult(e.message ?? String(e));
  }
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      'cc_pending',
      {
        title: 'Pending items',
        description: 'Get everything waiting on the configured workspace: drafted replies/proposals, pending posts, quarantined items, and platform health. Call first each run.',
        inputSchema: { workspace: z.string().optional() },
      },
      async ({ workspace }) => withWorkspace(workspace, (supabase, biz) => ops.getPending(supabase, biz)),
    );

    server.registerTool(
      'cc_capture_opportunity',
      {
        title: 'Capture opportunity',
        description: 'Record a new inbound item (message/comment/job/invite). Auto-scores scam risk and quarantines obvious scams. Include draft_reply to place it in the approval queue.',
        inputSchema: {
          workspace: z.string().optional(),
          platform: z.string(),
          type: z.enum(['message', 'comment', 'job', 'invite']).optional(),
          contact: z.string().optional(),
          source_url: z.string().optional(),
          message: z.string(),
          draft_reply: z.string().optional(),
          fit_score: z.number().optional(),
        },
      },
      async ({ workspace, ...args }) =>
        withWorkspace(workspace, (supabase, biz) => ops.captureOpportunity(supabase, biz, args)),
    );

    server.registerTool(
      'cc_draft_reply',
      {
        title: 'Draft reply',
        description: 'Attach/update a draft reply on an existing opportunity and move it into the approval queue.',
        inputSchema: {
          workspace: z.string().optional(),
          id: z.string(),
          draft_reply: z.string(),
          fit_score: z.number().optional(),
        },
      },
      async ({ workspace, ...args }) =>
        withWorkspace(workspace, (supabase, biz) => ops.draftReply(supabase, biz, args)),
    );

    server.registerTool(
      'cc_mark_sent',
      {
        title: 'Mark sent',
        description: 'After the workspace owner approved and Cowork actually sent the reply, mark the opportunity sent.',
        inputSchema: { workspace: z.string().optional(), id: z.string() },
      },
      async ({ workspace, id }) =>
        withWorkspace(workspace, (supabase, biz) => ops.decideOpportunity(supabase, biz, { id, decision: 'sent' })),
    );

    server.registerTool(
      'cc_add_post',
      {
        title: 'Add content post',
        description: 'Add a content post (caption/body + optional media note) to the calendar for a platform, awaiting approval.',
        inputSchema: {
          workspace: z.string().optional(),
          platform: z.string(),
          title: z.string().optional(),
          body: z.string(),
          media_ref: z.string().optional(),
          scheduled_for: z.string().optional(),
          quality_score: z.number().optional(),
        },
      },
      async ({ workspace, ...args }) =>
        withWorkspace(workspace, (supabase, biz) => ops.addPost(supabase, biz, args)),
    );

    server.registerTool(
      'cc_mark_posted',
      {
        title: 'Mark posted',
        description: 'After the workspace owner approved and Cowork published the post, mark it posted with the URL.',
        inputSchema: {
          workspace: z.string().optional(),
          id: z.string(),
          post_url: z.string().optional(),
        },
      },
      async ({ workspace, id, post_url }) =>
        withWorkspace(workspace, (supabase, biz) =>
          ops.decidePost(supabase, biz, { id, decision: 'posted', post_url })),
    );

    server.registerTool(
      'cc_record_health',
      {
        title: 'Record platform health',
        description: 'Store a 0-100 health score for a platform plus the single top fix.',
        inputSchema: {
          workspace: z.string().optional(),
          platform: z.string(),
          health_score: z.number(),
          top_fix: z.string().optional(),
          kind: z.enum(['inbound', 'content', 'both']).optional(),
          handle: z.string().optional(),
        },
      },
      async ({ workspace, ...args }) =>
        withWorkspace(workspace, (supabase, biz) => ops.recordHealth(supabase, biz, args)),
    );
  },
  {},
  {
    basePath: '/api',
    disableSse: true,
    maxDuration: 60,
  },
);

async function handler(req: NextRequest) {
  if (!authed(req)) return new NextResponse('Unauthorized', { status: 401 });
  return mcpHandler(req);
}

export { handler as GET, handler as POST };
