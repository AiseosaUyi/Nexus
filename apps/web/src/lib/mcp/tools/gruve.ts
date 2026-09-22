import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireToolScope, mcpToolResult, mcpToolError, type ToolHandlerExtra } from '@/lib/mcp/context';
import { registerAuditedTool } from '@/lib/mcp/audit';
import { hasScope } from '@/lib/mcp/scopes';
import { getGruveClientForBusiness, GruveApiError, GruveClient } from '@/lib/integrations/gruve';
import { rememberMemory } from '@/lib/memory/service';
import type { createServiceClient } from '@/lib/supabase/service';

/** Every nexus_gruve_* handler needs the same "load the client, or say
 * clearly this workspace isn't connected" gate — the eng review's Code
 * Quality (DRY) and Failure Modes findings both point at this exact spot. */
async function withGruveClient<T>(
  db: ReturnType<typeof createServiceClient>,
  businessId: string,
  fn: (client: GruveClient) => Promise<T>,
) {
  const resolved = await getGruveClientForBusiness(db, businessId);
  if (!resolved.ok) {
    return mcpToolError('Gruve is not connected for this workspace — add a key in Connections settings.');
  }
  try {
    return mcpToolResult(await fn(resolved.client));
  } catch (e) {
    if (e instanceof GruveApiError) return mcpToolError(`Gruve API error (${e.status}): ${e.message}`);
    throw e;
  }
}

export function registerGruveTools(server: McpServer) {
  registerAuditedTool(
    server,
    { name: 'nexus_gruve_events', scope: 'gruve:read', mutates: false, description: 'Read-only pass-through to Gruve /api/v1/events.' },
    { title: 'Gruve events', description: 'Read-only pass-through to Gruve /api/v1/events, cursor-paginated.', inputSchema: { cursor: z.string().optional(), limit: z.number().optional() } },
    async ({ cursor, limit }: { cursor?: string; limit?: number }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'gruve:read');
      if (!gate.ok) return gate.error;
      return withGruveClient(gate.context.db, gate.context.businessId, (client) => client.listEvents(cursor, limit));
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_gruve_event', scope: 'gruve:read', mutates: false, description: 'Read-only pass-through to Gruve /api/v1/events/:id.' },
    { title: 'Gruve event', description: 'Read-only pass-through to Gruve /api/v1/events/:id.', inputSchema: { id: z.string() } },
    async ({ id }: { id: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'gruve:read');
      if (!gate.ok) return gate.error;
      return withGruveClient(gate.context.db, gate.context.businessId, (client) => client.getEvent(id));
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_gruve_tickets', scope: 'gruve:read', mutates: false, description: 'Read-only pass-through to Gruve /api/v1/tickets.' },
    { title: 'Gruve tickets', description: 'Read-only pass-through to Gruve /api/v1/tickets, cursor-paginated.', inputSchema: { cursor: z.string().optional(), limit: z.number().optional() } },
    async ({ cursor, limit }: { cursor?: string; limit?: number }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'gruve:read');
      if (!gate.ok) return gate.error;
      return withGruveClient(gate.context.db, gate.context.businessId, (client) => client.listTickets(cursor, limit));
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_gruve_registrations', scope: 'gruve:read', mutates: false, description: 'Read-only pass-through to Gruve /api/v1/registrations.' },
    { title: 'Gruve registrations', description: 'Read-only pass-through to Gruve /api/v1/registrations, cursor-paginated.', inputSchema: { cursor: z.string().optional(), limit: z.number().optional() } },
    async ({ cursor, limit }: { cursor?: string; limit?: number }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'gruve:read');
      if (!gate.ok) return gate.error;
      return withGruveClient(gate.context.db, gate.context.businessId, (client) => client.listRegistrations(cursor, limit));
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_gruve_sales', scope: 'gruve:read', mutates: false, description: 'Read-only pass-through to Gruve /api/v1/sales.' },
    { title: 'Gruve sales', description: 'Read-only pass-through to Gruve /api/v1/sales, cursor-paginated.', inputSchema: { cursor: z.string().optional(), limit: z.number().optional() } },
    async ({ cursor, limit }: { cursor?: string; limit?: number }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'gruve:read');
      if (!gate.ok) return gate.error;
      return withGruveClient(gate.context.db, gate.context.businessId, (client) => client.listSales(cursor, limit));
    },
  );

  registerAuditedTool(
    server,
    {
      name: 'nexus_gruve_snapshot',
      scope: 'gruve:read',
      mutates: true,
      description: 'Computes upcoming events, tickets sold, and revenue for the last 7 days; writes a superseding insight memory.',
    },
    {
      title: 'Gruve snapshot',
      description:
        'Pulls upcoming events, tickets sold and revenue in the last 7 days (paginating through all pages, not just the first — coverage is flagged partial if a page cap is hit), and writes/supersedes a "Gruve snapshot" insight memory. Requires gruve:read AND memory:write. Mutates data.',
      inputSchema: {},
    },
    async (_args: Record<string, never>, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'gruve:read');
      if (!gate.ok) return gate.error;
      if (!hasScope(gate.context.scopes, 'memory:write')) {
        return mcpToolError('Missing required scope: memory:write');
      }
      const { db, businessId, createdBy } = gate.context;

      const resolved = await getGruveClientForBusiness(db, businessId);
      if (!resolved.ok) {
        return mcpToolError('Gruve is not connected for this workspace — add a key in Connections settings.');
      }
      const { client } = resolved;

      try {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        const [eventsPage, ticketsResult, salesResult] = await Promise.all([
          client.listEvents(undefined, 100),
          client.listAllPages((cursor, limit) => client.listTickets(cursor, limit), { maxPages: 10 }),
          client.listAllPages((cursor, limit) => client.listSales(cursor, limit), { maxPages: 10 }),
        ]);

        const upcomingEvents = (eventsPage.data as Array<{ startAt: string }>).filter(
          (e) => new Date(e.startAt).getTime() > Date.now(),
        ).length;

        const recentTickets = (ticketsResult.items as Array<{ datePurchased: string | null }>).filter(
          (t) => t.datePurchased && new Date(t.datePurchased).getTime() >= sevenDaysAgo,
        );
        const ticketsSoldLast7d = recentTickets.length;

        const recentSales = (salesResult.items as Array<{ createdAt: string; amountToPay: number; currency: string }>).filter(
          (s) => new Date(s.createdAt).getTime() >= sevenDaysAgo,
        );
        const revenueLast7dByCurrency: Record<string, number> = {};
        for (const sale of recentSales) {
          revenueLast7dByCurrency[sale.currency] = (revenueLast7dByCurrency[sale.currency] ?? 0) + sale.amountToPay;
        }

        const coverage = ticketsResult.coverage === 'partial' || salesResult.coverage === 'partial' ? 'partial' : 'onchain-only';

        const snapshot = { upcomingEvents, ticketsSoldLast7d, revenueLast7dByCurrency, coverage };

        const { memory } = await rememberMemory(
          db,
          businessId,
          {
            kind: 'insight',
            subject: 'Gruve snapshot',
            content: JSON.stringify(snapshot),
            source: 'gruve',
            supersede: true,
          },
          createdBy,
        );

        return mcpToolResult({ ...snapshot, memoryId: memory.id });
      } catch (e) {
        if (e instanceof GruveApiError) return mcpToolError(`Gruve API error (${e.status}): ${e.message}`);
        throw e;
      }
    },
  );
}
