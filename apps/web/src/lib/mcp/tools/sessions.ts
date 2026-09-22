import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireToolScope, mcpToolResult, mcpToolError, type ToolHandlerExtra } from '@/lib/mcp/context';
import { registerAuditedTool } from '@/lib/mcp/audit';
import { startSession, finishSession } from '@/lib/sessions/service';

export function registerSessionTools(server: McpServer) {
  registerAuditedTool(
    server,
    { name: 'nexus_start_session', scope: 'memory:write', mutates: true, description: 'Starts an agent session, auto-closing any stale one for that agent.' },
    {
      title: 'Start session',
      description: 'Starts an agent session, auto-closing a stale unfinished session for that agent first. Mutates data.',
      inputSchema: { agent: z.string() },
    },
    async ({ agent }: { agent: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'memory:write');
      if (!gate.ok) return gate.error;
      try {
        const result = await startSession(gate.context.db, gate.context.businessId, agent, gate.context.tokenId);
        return mcpToolResult(result);
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_finish_session', scope: 'memory:write', mutates: true, description: 'Closes a session, writing a summary and any decisions/open loops as memories.' },
    {
      title: 'Finish session',
      description:
        'Closes a session — stamps finished_at, writes a session_summary memory, one decision memory per item, and one open_loop per item. Mutates data.',
      inputSchema: {
        sessionId: z.string(),
        summary: z.string().max(4000),
        stats: z.record(z.string(), z.unknown()).optional(),
        decisions: z.array(z.string()).optional(),
        openLoops: z.array(z.object({ subject: z.string(), content: z.string(), dueAt: z.string().optional() })).optional(),
      },
    },
    async (input: any, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'memory:write');
      if (!gate.ok) return gate.error;
      try {
        // finishSession's memory subjects need the agent label (spec:
        // 'session_summary' subject is "<agent> session <date>") but the
        // tool's own input schema (matching spec 8.6) doesn't take one —
        // it's read back off the session row instead.
        const { data: session } = await gate.context.db.from('agent_sessions').select('agent').eq('id', input.sessionId).single();
        if (!session) return mcpToolError('Unknown sessionId');
        const result = await finishSession(gate.context.db, gate.context.businessId, session.agent, gate.context.createdBy, input);
        return mcpToolResult(result);
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );
}
