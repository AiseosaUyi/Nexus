// The 7 Command Center tools, moved from the old apps/web/src/app/api/mcp/route.ts.
// Tenant identity now comes ONLY from the authenticated token's business —
// the `workspace` argument is gone entirely, a breaking change from the old
// route that the spec calls out as intentional. Every handler still calls
// the same @/lib/command/ops.ts functions the /api/command REST endpoint
// uses, so behaviour never drifts between the two.

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireToolScope, mcpToolResult, mcpToolError, type ToolHandlerExtra } from '@/lib/mcp/context';
import { registerManifestEntry } from '@/lib/mcp/manifest';
import * as ops from '@/lib/command/ops';

/** Every cc_* handler needs the same "is Command Center on for this
 * business" check before touching ops.ts — this is that gate, run after
 * requireToolScope() so scope errors always take priority over feature-flag
 * errors. */
async function requireCommandCenterEnabled(
  db: ReturnType<typeof import('@/lib/supabase/service').createServiceClient>,
  businessId: string,
): Promise<{ ok: true } | { ok: false; error: ReturnType<typeof mcpToolError> }> {
  const { data } = await db.from('businesses').select('command_center_enabled').eq('id', businessId).single();
  if (!data?.command_center_enabled) {
    return { ok: false, error: mcpToolError('Command Center is not enabled for this workspace.') };
  }
  return { ok: true };
}

export function registerCommandCenterTools(server: McpServer) {
  registerManifestEntry({
    name: 'nexus_cc_pending',
    scope: 'command:read',
    mutates: false,
    description: 'Get everything waiting: drafted replies, pending posts, quarantined items, platform health.',
  });
  server.registerTool(
    'nexus_cc_pending',
    {
      title: 'cc_pending',
      description:
        'Get everything waiting on this workspace: drafted replies/proposals, pending posts, quarantined items, and platform health. Call first each run. Read-only.',
      inputSchema: {},
    },
    async (_args: Record<string, never>, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'command:read');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;
      const enabled = await requireCommandCenterEnabled(db, businessId);
      if (!enabled.ok) return enabled.error;
      return mcpToolResult(await ops.getPending(db, businessId));
    },
  );

  registerManifestEntry({
    name: 'nexus_cc_capture_opportunity',
    scope: 'command:write',
    mutates: true,
    description: 'Record a new inbound item. Auto-scores scam risk and quarantines obvious scams.',
  });
  server.registerTool(
    'nexus_cc_capture_opportunity',
    {
      title: 'cc_capture_opportunity',
      description:
        'Record a new inbound item (message/comment/job/invite). Auto-scores scam risk and quarantines obvious scams. Include draft_reply to place it in the approval queue. Mutates data.',
      inputSchema: {
        platform: z.string(),
        type: z.enum(['message', 'comment', 'job', 'invite']).optional(),
        contact: z.string().optional(),
        source_url: z.string().optional(),
        message: z.string(),
        draft_reply: z.string().optional(),
        fit_score: z.number().optional(),
      },
    },
    async (args, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'command:write');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;
      const enabled = await requireCommandCenterEnabled(db, businessId);
      if (!enabled.ok) return enabled.error;
      try {
        return mcpToolResult(await ops.captureOpportunity(db, businessId, args));
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerManifestEntry({
    name: 'nexus_cc_draft_reply',
    scope: 'command:write',
    mutates: true,
    description: 'Attach/update a draft reply on an existing opportunity and move it into the approval queue.',
  });
  server.registerTool(
    'nexus_cc_draft_reply',
    {
      title: 'cc_draft_reply',
      description:
        'Attach/update a draft reply on an existing opportunity and move it into the approval queue. Mutates data.',
      inputSchema: { id: z.string(), draft_reply: z.string(), fit_score: z.number().optional() },
    },
    async (args, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'command:write');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;
      const enabled = await requireCommandCenterEnabled(db, businessId);
      if (!enabled.ok) return enabled.error;
      try {
        return mcpToolResult(await ops.draftReply(db, businessId, args));
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerManifestEntry({
    name: 'nexus_cc_mark_sent',
    scope: 'command:write',
    mutates: true,
    description: 'After the owner approved and it was actually sent, mark the opportunity sent.',
  });
  server.registerTool(
    'nexus_cc_mark_sent',
    {
      title: 'cc_mark_sent',
      description:
        'After the workspace owner approved and the reply was actually sent, mark the opportunity sent. Mutates data.',
      inputSchema: { id: z.string() },
    },
    async ({ id }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'command:write');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;
      const enabled = await requireCommandCenterEnabled(db, businessId);
      if (!enabled.ok) return enabled.error;
      try {
        return mcpToolResult(await ops.decideOpportunity(db, businessId, { id, decision: 'sent' }));
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerManifestEntry({
    name: 'nexus_cc_add_post',
    scope: 'command:write',
    mutates: true,
    description: 'Add a content post to the calendar for a platform, awaiting approval.',
  });
  server.registerTool(
    'nexus_cc_add_post',
    {
      title: 'cc_add_post',
      description:
        'Add a content post (caption/body + optional media note) to the calendar for a platform, awaiting approval. Mutates data.',
      inputSchema: {
        platform: z.string(),
        title: z.string().optional(),
        body: z.string(),
        media_ref: z.string().optional(),
        scheduled_for: z.string().optional(),
        quality_score: z.number().optional(),
      },
    },
    async (args, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'command:write');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;
      const enabled = await requireCommandCenterEnabled(db, businessId);
      if (!enabled.ok) return enabled.error;
      try {
        return mcpToolResult(await ops.addPost(db, businessId, args));
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerManifestEntry({
    name: 'nexus_cc_mark_posted',
    scope: 'command:write',
    mutates: true,
    description: 'After the owner approved and it was published, mark the post posted with the URL.',
  });
  server.registerTool(
    'nexus_cc_mark_posted',
    {
      title: 'cc_mark_posted',
      description:
        'After the workspace owner approved and the post was published, mark it posted with the URL. Mutates data.',
      inputSchema: { id: z.string(), post_url: z.string().optional() },
    },
    async ({ id, post_url }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'command:write');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;
      const enabled = await requireCommandCenterEnabled(db, businessId);
      if (!enabled.ok) return enabled.error;
      try {
        return mcpToolResult(await ops.decidePost(db, businessId, { id, decision: 'posted', post_url }));
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerManifestEntry({
    name: 'nexus_cc_record_health',
    scope: 'command:write',
    mutates: true,
    description: 'Store a 0-100 health score for a platform plus the single top fix.',
  });
  server.registerTool(
    'nexus_cc_record_health',
    {
      title: 'cc_record_health',
      description: 'Store a 0-100 health score for a platform plus the single top fix. Mutates data.',
      inputSchema: {
        platform: z.string(),
        health_score: z.number(),
        top_fix: z.string().optional(),
        kind: z.enum(['inbound', 'content', 'both']).optional(),
        handle: z.string().optional(),
      },
    },
    async (args, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'command:write');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;
      const enabled = await requireCommandCenterEnabled(db, businessId);
      if (!enabled.ok) return enabled.error;
      try {
        return mcpToolResult(await ops.recordHealth(db, businessId, args));
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );
}
