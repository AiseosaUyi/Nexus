import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireToolScope, mcpToolResult, mcpToolError, type ToolHandlerExtra } from '@/lib/mcp/context';
import { registerAuditedTool } from '@/lib/mcp/audit';
import { getManifest } from '@/lib/mcp/manifest';
import { listOpenLoops, getMemoryTimeline } from '@/lib/memory/service';
import { getLastFinishedSession } from '@/lib/sessions/service';
import * as ops from '@/lib/command/ops';

export function registerMetaTools(server: McpServer) {
  registerAuditedTool(
    server,
    {
      name: 'nexus_whoami',
      scope: null,
      mutates: false,
      description: 'Resolve the connected token to its business, scopes, and integration links. Read-only.',
    },
    {
      title: 'Who am I',
      description:
        'Resolve the connected token to its business, scopes, and integration links. Call this first to ground yourself before anything else — read-only.',
      inputSchema: {},
    },
    async (_args: Record<string, never>, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, null);
      if (!gate.ok) return gate.error;
      const { businessId, businessSlug, scopes, tokenKind, db } = gate.context;

      const [{ data: business }, { data: integrations }] = await Promise.all([
        db.from('businesses').select('id, slug, name, command_center_enabled').eq('id', businessId).single(),
        db.from('business_integrations').select('provider, config').eq('business_id', businessId),
      ]);

      const pulseRow = integrations?.find((i) => i.provider === 'pulse');
      const gruveRow = integrations?.find((i) => i.provider === 'gruve');
      const pulseConfig = pulseRow?.config as { tenantSlug?: string; baseUrl?: string } | undefined;
      const gruveConfig = gruveRow?.config as { baseUrl?: string } | undefined;

      return mcpToolResult({
        business: { id: businessId, slug: businessSlug, name: business?.name ?? businessSlug },
        scopes,
        links: {
          pulse: pulseRow && pulseConfig?.tenantSlug ? { tenantSlug: pulseConfig.tenantSlug, baseUrl: pulseConfig.baseUrl ?? null } : null,
          // connected reflects a row existing, never the decrypted key itself.
          gruve: { connected: Boolean(gruveRow), baseUrl: gruveConfig?.baseUrl ?? null },
        },
        commandCenterEnabled: Boolean(business?.command_center_enabled),
        tokenKind,
      });
    },
  );

  registerAuditedTool(
    server,
    {
      name: 'nexus_manifest',
      scope: null,
      mutates: false,
      description: 'Every registered tool with name, scope, and mutates flag. Read-only.',
    },
    {
      title: 'List capabilities',
      description:
        'Machine-readable list of every nexus_* tool on this server — name, required scope, and whether it mutates data. Use this to discover capabilities without needing a code update. Read-only.',
      inputSchema: {},
    },
    async (_args: Record<string, never>, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, null);
      if (!gate.ok) return gate.error;
      return mcpToolResult({ tools: getManifest() });
    },
  );

  registerAuditedTool(
    server,
    {
      name: 'nexus_brief',
      scope: 'memory:read',
      mutates: false,
      description: 'The command-center opening call: last session, open loops, decisions, preferences, calendar. Read-only.',
    },
    {
      title: 'Brief',
      description:
        "The command-center opening call. Returns last finished session, active open loops (overdue first), decisions from the last 14 days, all active preferences, pinned facts, calendar entries for the next 7 days, and suggested recall queries. Call this before doing anything else. Read-only.",
      inputSchema: { agent: z.string().optional() },
    },
    async ({ agent }: { agent?: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'memory:read');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;

      const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const next7d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Independent reads — Promise.all so this "opening call" doesn't pay
      // for 7 sequential round-trips (matches ops.ts's getPending() pattern).
      const [lastSession, agentSession, openLoops, decisions, preferences, pinned, calendar, topRecalled] =
        await Promise.all([
          getLastFinishedSession(db, businessId),
          agent ? getLastFinishedSession(db, businessId, agent) : Promise.resolve(null),
          listOpenLoops(db, businessId, { limit: 25 }),
          getMemoryTimeline(db, businessId, { since: since14d, kinds: ['decision'] }),
          db.from('memories').select('*').eq('business_id', businessId).eq('kind', 'preference').eq('status', 'active'),
          db.from('memories').select('*').eq('business_id', businessId).eq('status', 'active').contains('tags', ['pinned']),
          db
            .from('calendar_entries')
            .select('*, node:nodes(id,title)')
            .eq('business_id', businessId)
            .gte('publish_date', new Date().toISOString())
            .lte('publish_date', next7d),
          db
            .from('memories')
            .select('subject, recall_count')
            .eq('business_id', businessId)
            .eq('status', 'active')
            .order('recall_count', { ascending: false })
            .limit(5),
        ]);

      let commandCenterPending: unknown = null;
      const { data: business } = await db.from('businesses').select('command_center_enabled').eq('id', businessId).single();
      if (business?.command_center_enabled) {
        const pending = await ops.getPending(db, businessId);
        commandCenterPending = pending.summary;
      }

      return mcpToolResult({
        lastSession,
        agentSession: agent ? agentSession : undefined,
        openLoops,
        decisions,
        preferences: preferences.data ?? [],
        pinnedFacts: pinned.data ?? [],
        calendar: calendar.data ?? [],
        commandCenterPending,
        suggestedRecallQueries: (topRecalled.data ?? []).map((m) => m.subject),
      });
    },
  );
}
