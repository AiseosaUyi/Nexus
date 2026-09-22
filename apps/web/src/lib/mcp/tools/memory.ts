import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireToolScope, mcpToolResult, mcpToolError, type ToolHandlerExtra } from '@/lib/mcp/context';
import { registerAuditedTool } from '@/lib/mcp/audit';
import { recallMemories } from '@/lib/memory/fts';
import { rememberMemory, updateMemory, forgetMemory, listOpenLoops, getMemoryTimeline, MemoryValidationError } from '@/lib/memory/service';

const MEMORY_KINDS = [
  'fact',
  'decision',
  'preference',
  'open_loop',
  'person',
  'project',
  'event',
  'insight',
  'session_summary',
] as const;

export function registerMemoryTools(server: McpServer) {
  registerAuditedTool(
    server,
    { name: 'nexus_recall', scope: 'memory:read', mutates: false, description: 'Ranked search over memories. Read-only apart from recall counters.' },
    {
      title: 'Recall',
      description:
        'Ranked search over remembered facts, decisions, preferences, and open loops. Empty query returns most recently updated. Read-only apart from bumping recall counters.',
      inputSchema: {
        query: z.string().optional(),
        kinds: z.array(z.enum(MEMORY_KINDS)).optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(['active', 'all']).optional(),
        limit: z.number().min(1).max(50).optional(),
      },
    },
    async (args: { query?: string; kinds?: string[]; tags?: string[]; status?: 'active' | 'all'; limit?: number }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'memory:read');
      if (!gate.ok) return gate.error;
      const results = await recallMemories(gate.context.db, gate.context.businessId, args as any);
      return mcpToolResult({ results });
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_remember', scope: 'memory:write', mutates: true, description: 'Upsert a memory by (kind, subject) dedupe key.' },
    {
      title: 'Remember',
      description:
        'Upsert a memory by its (kind, subject) dedupe key — updates the existing active row unless supersede is set. Rejects content matching an obvious secret pattern. Mutates data.',
      inputSchema: {
        kind: z.enum(MEMORY_KINDS),
        subject: z.string().max(120),
        content: z.string().max(2000),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
        sourceRef: z.string().optional(),
        confidence: z.number().min(0).max(100).optional(),
        dueAt: z.string().optional(),
        nodeId: z.string().optional(),
        supersede: z.boolean().optional(),
      },
    },
    async (args: any, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'memory:write');
      if (!gate.ok) return gate.error;
      try {
        const { memory, action } = await rememberMemory(gate.context.db, gate.context.businessId, args, gate.context.createdBy);
        return mcpToolResult({ memory, action });
      } catch (e) {
        if (e instanceof MemoryValidationError) return mcpToolError(e.message);
        throw e;
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_update_memory', scope: 'memory:write', mutates: true, description: 'Partial update to an existing memory, business-scoped.' },
    {
      title: 'Update memory',
      description: 'Partial update to an existing memory (status, content, tags, dueAt, confidence), business-scoped. Mutates data.',
      inputSchema: {
        id: z.string(),
        status: z.enum(['active', 'resolved', 'archived']).optional(),
        content: z.string().max(2000).optional(),
        tags: z.array(z.string()).optional(),
        dueAt: z.string().optional(),
        confidence: z.number().min(0).max(100).optional(),
      },
    },
    async ({ id, ...patch }: any, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'memory:write');
      if (!gate.ok) return gate.error;
      try {
        const memory = await updateMemory(gate.context.db, gate.context.businessId, id, patch);
        return mcpToolResult({ memory });
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_forget', scope: 'memory:write', mutates: true, description: 'Archives a memory. Never deletes.' },
    {
      title: 'Forget',
      description: 'Archives a memory (status: archived) — never deletes it. Mutates data.',
      inputSchema: { id: z.string(), reason: z.string().optional() },
    },
    async ({ id, reason }: { id: string; reason?: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'memory:write');
      if (!gate.ok) return gate.error;
      try {
        const memory = await forgetMemory(gate.context.db, gate.context.businessId, id, gate.context.createdBy, reason);
        return mcpToolResult({ memory });
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_open_loops', scope: 'memory:read', mutates: false, description: 'Active open loops, overdue first. Read-only.' },
    {
      title: 'Open loops',
      description: 'Active open_loop memories, overdue first, then by due date (nulls last). Read-only.',
      inputSchema: { includeOverdueOnly: z.boolean().optional(), limit: z.number().optional() },
    },
    async (args: { includeOverdueOnly?: boolean; limit?: number }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'memory:read');
      if (!gate.ok) return gate.error;
      const openLoops = await listOpenLoops(gate.context.db, gate.context.businessId, args);
      return mcpToolResult({ openLoops });
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_timeline', scope: 'memory:read', mutates: false, description: 'Memories created/updated in a date range. Read-only.' },
    {
      title: 'Timeline',
      description: 'Memories created or updated within [since, until], optionally filtered by kind. Read-only.',
      inputSchema: { since: z.string(), until: z.string().optional(), kinds: z.array(z.enum(MEMORY_KINDS)).optional() },
    },
    async (args: { since: string; until?: string; kinds?: string[] }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'memory:read');
      if (!gate.ok) return gate.error;
      const timeline = await getMemoryTimeline(gate.context.db, gate.context.businessId, args as any);
      return mcpToolResult({ timeline });
    },
  );
}
