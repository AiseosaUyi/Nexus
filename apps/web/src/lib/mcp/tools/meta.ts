import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireToolScope, mcpToolResult, type ToolHandlerExtra } from '@/lib/mcp/context';
import { registerManifestEntry, getManifest } from '@/lib/mcp/manifest';

export function registerMetaTools(server: McpServer) {
  registerManifestEntry({
    name: 'nexus_whoami',
    scope: null,
    mutates: false,
    description: 'Resolve the connected token to its business, scopes, and integration links. Read-only.',
  });
  server.registerTool(
    'nexus_whoami',
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

      const { data: business } = await db
        .from('businesses')
        .select('id, slug, name, command_center_enabled')
        .eq('id', businessId)
        .single();

      return mcpToolResult({
        business: { id: businessId, slug: businessSlug, name: business?.name ?? businessSlug },
        scopes,
        // TODO(step 6): once 31_integrations.sql lands, look these up from
        // business_integrations instead of returning static not-connected
        // defaults — see lib/integrations/gruve.ts.
        links: {
          pulse: null as { tenantSlug: string; baseUrl: string } | null,
          gruve: { connected: false, baseUrl: null as string | null },
        },
        commandCenterEnabled: Boolean(business?.command_center_enabled),
        tokenKind,
      });
    },
  );

  registerManifestEntry({
    name: 'nexus_manifest',
    scope: null,
    mutates: false,
    description: 'Every registered tool with name, scope, and mutates flag. Read-only.',
  });
  server.registerTool(
    'nexus_manifest',
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
}
