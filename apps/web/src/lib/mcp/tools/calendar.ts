import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireToolScope, mcpToolResult, mcpToolError, type ToolHandlerExtra } from '@/lib/mcp/context';
import { registerAuditedTool } from '@/lib/mcp/audit';
import { createNode } from '@/lib/docs/content';
import * as ops from '@/lib/command/ops';

export function registerCalendarTools(server: McpServer) {
  registerAuditedTool(
    server,
    { name: 'nexus_calendar', scope: 'calendar:read', mutates: false, description: 'Calendar entries in a date range. Read-only.' },
    {
      title: 'Calendar',
      description: 'calendar_entries joined to their document node, ordered by publish_date, within [from, to]. Read-only.',
      inputSchema: { from: z.string(), to: z.string() },
    },
    async ({ from, to }: { from: string; to: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'calendar:read');
      if (!gate.ok) return gate.error;
      const { data, error } = await gate.context.db
        .from('calendar_entries')
        .select('*, node:nodes(id,title)')
        .eq('business_id', gate.context.businessId)
        .gte('publish_date', from)
        .lte('publish_date', to)
        .order('publish_date', { ascending: true });
      if (error) return mcpToolError(error.message);
      return mcpToolResult({ entries: data ?? [] });
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_add_calendar_entry', scope: 'calendar:write', mutates: true, description: 'Creates a backing document and a draft calendar entry.' },
    {
      title: 'Add calendar entry',
      description: 'Creates the backing document node and a calendar_entries row with status: draft. Mutates data.',
      inputSchema: {
        title: z.string(),
        platform: z.string().optional(),
        publishDate: z.string().optional(),
        notes: z.string().optional(),
        markdown: z.string().optional(),
      },
    },
    async (args: { title: string; platform?: string; publishDate?: string; notes?: string; markdown?: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'calendar:write');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;
      try {
        const node = await createNode(db, businessId, { title: args.title, markdown: args.markdown });
        const { data, error } = await db
          .from('calendar_entries')
          .insert({
            node_id: node.id,
            business_id: businessId,
            platform: args.platform ?? null,
            publish_date: args.publishDate ?? null,
            notes: args.notes ?? null,
            status: 'draft',
          })
          .select('id')
          .single();
        if (error) return mcpToolError(error.message);
        return mcpToolResult({ nodeId: node.id, calendarEntryId: data.id });
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_set_calendar_status', scope: 'calendar:write', mutates: true, description: 'Sets a calendar entry\'s status.' },
    {
      title: 'Set calendar status',
      description:
        'Sets a calendar entry to draft/scheduled/published/cancelled, merging postUrl into properties without clobbering other keys. Mutates data.',
      inputSchema: {
        id: z.string(),
        status: z.enum(['draft', 'scheduled', 'published', 'cancelled']),
        postUrl: z.string().optional(),
      },
    },
    async ({ id, status, postUrl }: { id: string; status: string; postUrl?: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'calendar:write');
      if (!gate.ok) return gate.error;
      try {
        const result = await ops.setCalendarStatus(gate.context.db, gate.context.businessId, { id, status, post_url: postUrl });
        return mcpToolResult(result);
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );
}
