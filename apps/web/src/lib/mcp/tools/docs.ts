import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireToolScope, mcpToolResult, mcpToolError, type ToolHandlerExtra } from '@/lib/mcp/context';
import { registerAuditedTool } from '@/lib/mcp/audit';
import { readNode, appendToNode, createNode, DocNotFoundError } from '@/lib/docs/content';

export function registerDocsTools(server: McpServer) {
  registerAuditedTool(
    server,
    { name: 'nexus_list_tree', scope: 'docs:read', mutates: false, description: 'Teamspaces and nodes for the business. Read-only.' },
    {
      title: 'List tree',
      description:
        'Teamspaces and nodes (id, title, type, parent_id, teamspace_id, updated_at, is_archived) for the business, excluding yjs_snapshot. Read-only.',
      inputSchema: {
        teamspaceId: z.string().optional(),
        parentId: z.string().optional(),
        includeArchived: z.boolean().optional(),
      },
    },
    async (args: { teamspaceId?: string; parentId?: string; includeArchived?: boolean }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:read');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;

      const [teamspaces, nodesQuery] = await Promise.all([
        db.from('teamspaces').select('id, name, icon, position').eq('business_id', businessId).order('position'),
        (() => {
          let q = db
            .from('nodes')
            .select('id, title, type, parent_id, teamspace_id, updated_at, is_archived')
            .eq('business_id', businessId);
          if (args.teamspaceId) q = q.eq('teamspace_id', args.teamspaceId);
          if (args.parentId) q = q.eq('parent_id', args.parentId);
          if (!args.includeArchived) q = q.eq('is_archived', false);
          return q.order('position');
        })(),
      ]);

      return mcpToolResult({ teamspaces: teamspaces.data ?? [], nodes: nodesQuery.data ?? [] });
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_search_docs', scope: 'docs:read', mutates: false, description: 'FTS over node titles and block content. Read-only.' },
    {
      title: 'Search docs',
      description: 'Full-text search over node titles (substring match) and block content (Postgres FTS). Read-only.',
      inputSchema: { query: z.string(), limit: z.number().min(1).max(50).optional() },
    },
    async ({ query, limit }: { query: string; limit?: number }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:read');
      if (!gate.ok) return gate.error;
      const { businessId, db } = gate.context;
      const cap = Math.min(Math.max(limit ?? 15, 1), 50);

      const [titleMatches, contentMatches] = await Promise.all([
        db
          .from('nodes')
          .select('id, title, updated_at')
          .eq('business_id', businessId)
          .eq('is_archived', false)
          .ilike('title', `%${query}%`)
          .order('updated_at', { ascending: false })
          .limit(cap),
        db.rpc('search_blocks', { p_business_id: businessId, p_query: query, p_limit: cap }),
      ]);

      const seen = new Set<string>();
      const results: Array<{ id: string; title: string; snippet: string | null; updated_at: string }> = [];
      for (const row of titleMatches.data ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        results.push({ id: row.id, title: row.title, snippet: null, updated_at: row.updated_at });
      }
      for (const row of (contentMatches.data as Array<{ node_id: string; title: string; snippet: string; updated_at: string }>) ?? []) {
        if (seen.has(row.node_id)) continue;
        seen.add(row.node_id);
        results.push({ id: row.node_id, title: row.title, snippet: row.snippet, updated_at: row.updated_at });
      }
      results.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

      return mcpToolResult({ results: results.slice(0, cap) });
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_read_doc', scope: 'docs:read', mutates: false, description: 'Read a document as markdown. Read-only.' },
    {
      title: 'Read doc',
      description: 'Reads a document as markdown, clipped to maxChars (default 20000). Read-only.',
      inputSchema: { nodeId: z.string(), maxChars: z.number().optional() },
    },
    async ({ nodeId, maxChars }: { nodeId: string; maxChars?: number }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:read');
      if (!gate.ok) return gate.error;
      try {
        const { node, markdown, source } = await readNode(gate.context.db, gate.context.businessId, nodeId);
        const cap = maxChars ?? 20000;
        const truncated = markdown.length > cap;
        return mcpToolResult({
          nodeId: node.id,
          title: node.title,
          markdown: truncated ? markdown.slice(0, cap) : markdown,
          truncated,
          source,
        });
      } catch (e) {
        if (e instanceof DocNotFoundError) return mcpToolError(e.message);
        throw e;
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_create_doc', scope: 'docs:write', mutates: true, description: 'Creates a new document, optionally with markdown content.' },
    {
      title: 'Create doc',
      description: 'Creates a new document node, optionally seeded with markdown content. Mutates data.',
      inputSchema: {
        title: z.string(),
        markdown: z.string().optional(),
        teamspaceId: z.string().optional(),
        parentId: z.string().optional(),
      },
    },
    async (args: { title: string; markdown?: string; teamspaceId?: string; parentId?: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:write');
      if (!gate.ok) return gate.error;
      const { businessId, businessSlug, db } = gate.context;
      try {
        const node = await createNode(db, businessId, args);
        return mcpToolResult({ nodeId: node.id, url: `/w/${businessSlug}/n/${node.id}` });
      } catch (e: any) {
        return mcpToolError(e.message ?? String(e));
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_append_doc', scope: 'docs:write', mutates: true, description: 'Appends markdown to an existing document.' },
    {
      title: 'Append doc',
      description: 'Appends markdown to an existing document, diffed into its Yjs doc so an open editor merges it live. Mutates data.',
      inputSchema: { nodeId: z.string(), markdown: z.string(), heading: z.string().optional(), timestamp: z.boolean().optional() },
    },
    async (
      { nodeId, markdown, heading, timestamp }: { nodeId: string; markdown: string; heading?: string; timestamp?: boolean },
      extra: ToolHandlerExtra,
    ) => {
      const gate = requireToolScope(extra, 'docs:write');
      if (!gate.ok) return gate.error;
      try {
        await appendToNode(gate.context.db, gate.context.businessId, nodeId, markdown, {
          heading,
          timestamp: timestamp ?? true,
        });
        return mcpToolResult({ nodeId, appended: true });
      } catch (e) {
        if (e instanceof DocNotFoundError) return mcpToolError(e.message);
        throw e;
      }
    },
  );
}
