import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireToolScope, mcpToolResult, mcpToolError, type ToolHandlerExtra } from '@/lib/mcp/context';
import { registerAuditedTool } from '@/lib/mcp/audit';
import {
  readNode,
  appendToNode,
  createNode,
  replaceNodeContent,
  replaceNodeSection,
  moveNode,
  renameNode,
  setNodeArchived,
  createTeamspace,
  updateTeamspace,
  DocNotFoundError,
  DocInputError,
} from '@/lib/docs/content';

export const READ_DOC_DEFAULT_MAX_CHARS = 100_000;
export const READ_DOC_HARD_MAX_CHARS = 500_000;

/** Caller mistakes become a clean tool error; anything else is a real
 * failure and is rethrown (the audit wrapper still records it). */
function toToolError(e: unknown) {
  if (e instanceof DocNotFoundError || e instanceof DocInputError) return mcpToolError(e.message);
  throw e;
}

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
    { name: 'nexus_read_doc', scope: 'docs:read', mutates: false, description: 'Read a document as markdown, paged with offset/maxChars. Read-only.' },
    {
      title: 'Read doc',
      description:
        `Reads a document as markdown. Returns totalChars; when truncated, call again with offset = nextOffset to page through. maxChars defaults to ${READ_DOC_DEFAULT_MAX_CHARS} (max ${READ_DOC_HARD_MAX_CHARS}). Read-only.`,
      inputSchema: {
        nodeId: z.string(),
        offset: z.number().int().min(0).optional(),
        maxChars: z.number().int().min(1).optional(),
      },
    },
    async ({ nodeId, offset, maxChars }: { nodeId: string; offset?: number; maxChars?: number }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:read');
      if (!gate.ok) return gate.error;
      try {
        const { node, markdown, source } = await readNode(gate.context.db, gate.context.businessId, nodeId);
        const cap = Math.min(Math.max(maxChars ?? READ_DOC_DEFAULT_MAX_CHARS, 1), READ_DOC_HARD_MAX_CHARS);
        const start = Math.min(Math.max(offset ?? 0, 0), markdown.length);
        const end = Math.min(start + cap, markdown.length);
        const truncated = end < markdown.length;
        return mcpToolResult({
          nodeId: node.id,
          title: node.title,
          markdown: markdown.slice(start, end),
          totalChars: markdown.length,
          offset: start,
          truncated,
          nextOffset: truncated ? end : null,
          source,
        });
      } catch (e) {
        return toToolError(e);
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_create_doc', scope: 'docs:write', mutates: true, description: 'Creates a new document, optionally with markdown content.' },
    {
      title: 'Create doc',
      description:
        'Creates a new document node, optionally seeded with markdown content. teamspaceId/parentId must be uuids in this workspace; a parent decides the teamspace (omit teamspaceId to inherit it). Mutates data.',
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
      } catch (e) {
        return toToolError(e);
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_append_doc', scope: 'docs:write', mutates: true, description: 'Appends markdown to an existing document.' },
    {
      title: 'Append doc',
      description:
        'Appends markdown to an existing document, diffed into its Yjs doc so an open editor merges it live. Optional H2 heading; timestamp (default false) prefixes an italic ISO timestamp. Mutates data.',
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
          timestamp: timestamp ?? false,
        });
        return mcpToolResult({ nodeId, appended: true });
      } catch (e) {
        return toToolError(e);
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_replace_doc', scope: 'docs:write', mutates: true, description: 'Overwrites a whole document with markdown.' },
    {
      title: 'Replace doc',
      description:
        'Replaces the entire body of a document with markdown, diffed into its Yjs doc (same path as nexus_append_doc) so an open editor merges it live. Read the doc first — anything not in the new markdown is removed. Mutates data.',
      inputSchema: { nodeId: z.string(), markdown: z.string() },
    },
    async ({ nodeId, markdown }: { nodeId: string; markdown: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:write');
      if (!gate.ok) return gate.error;
      try {
        await replaceNodeContent(gate.context.db, gate.context.businessId, nodeId, markdown);
        return mcpToolResult({ nodeId, replaced: true });
      } catch (e) {
        return toToolError(e);
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_replace_section', scope: 'docs:write', mutates: true, description: 'Replaces the body under one heading in a document.' },
    {
      title: 'Replace section',
      description:
        'Replaces the content under the first heading matching `heading` (case-insensitive, leading #s ignored), up to the next heading of the same or higher level. The heading itself is kept. Errors with the list of headings if none match. Mutates data.',
      inputSchema: { nodeId: z.string(), heading: z.string(), markdown: z.string() },
    },
    async ({ nodeId, heading, markdown }: { nodeId: string; heading: string; markdown: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:write');
      if (!gate.ok) return gate.error;
      try {
        await replaceNodeSection(gate.context.db, gate.context.businessId, nodeId, heading, markdown);
        return mcpToolResult({ nodeId, heading, replaced: true });
      } catch (e) {
        return toToolError(e);
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_create_teamspace', scope: 'docs:write', mutates: true, description: 'Creates a teamspace (sidebar section).' },
    {
      title: 'Create teamspace',
      description: 'Creates a teamspace at the end of the sidebar. Mutates data.',
      inputSchema: { name: z.string(), icon: z.string().optional(), description: z.string().optional() },
    },
    async (args: { name: string; icon?: string; description?: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:write');
      if (!gate.ok) return gate.error;
      const { businessId, db, createdBy } = gate.context;
      try {
        const teamspace = await createTeamspace(db, businessId, { ...args, createdBy });
        return mcpToolResult({ teamspace });
      } catch (e) {
        return toToolError(e);
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_update_teamspace', scope: 'docs:write', mutates: true, description: 'Renames or reorders a teamspace.' },
    {
      title: 'Update teamspace',
      description: 'Updates a teamspace\'s name, icon, description or position. Only the fields given are changed. Mutates data.',
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        icon: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        position: z.number().int().min(0).optional(),
      },
    },
    async (
      { id, ...updates }: { id: string; name?: string; icon?: string | null; description?: string | null; position?: number },
      extra: ToolHandlerExtra,
    ) => {
      const gate = requireToolScope(extra, 'docs:write');
      if (!gate.ok) return gate.error;
      try {
        const teamspace = await updateTeamspace(gate.context.db, gate.context.businessId, id, updates);
        return mcpToolResult({ teamspace });
      } catch (e) {
        return toToolError(e);
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_move_node', scope: 'docs:write', mutates: true, description: 'Moves a node to another teamspace/parent and position.' },
    {
      title: 'Move node',
      description:
        'Moves a node (and its subtree) to teamspaceId/parentId (null = workspace root / top level). A parent decides the teamspace. position is a zero-based index among the new siblings; omit to append at the end. Mutates data.',
      inputSchema: {
        nodeId: z.string(),
        teamspaceId: z.string().nullable(),
        parentId: z.string().nullable(),
        position: z.number().int().min(0).optional(),
      },
    },
    async (
      args: { nodeId: string; teamspaceId: string | null; parentId: string | null; position?: number },
      extra: ToolHandlerExtra,
    ) => {
      const gate = requireToolScope(extra, 'docs:write');
      if (!gate.ok) return gate.error;
      try {
        const moved = await moveNode(gate.context.db, gate.context.businessId, args.nodeId, {
          teamspaceId: args.teamspaceId,
          parentId: args.parentId,
          position: args.position,
        });
        return mcpToolResult(moved);
      } catch (e) {
        return toToolError(e);
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_rename_node', scope: 'docs:write', mutates: true, description: 'Renames a node.' },
    {
      title: 'Rename node',
      description: 'Sets a node\'s title (page H1). The sidebar label follows unless it was custom-named. Mutates data.',
      inputSchema: { nodeId: z.string(), title: z.string() },
    },
    async ({ nodeId, title }: { nodeId: string; title: string }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:write');
      if (!gate.ok) return gate.error;
      try {
        const result = await renameNode(gate.context.db, gate.context.businessId, nodeId, title);
        return mcpToolResult({ nodeId, title: title.trim(), ...result });
      } catch (e) {
        return toToolError(e);
      }
    },
  );

  registerAuditedTool(
    server,
    { name: 'nexus_archive_node', scope: 'docs:write', mutates: true, description: 'Soft-deletes (archives) a node and its subtree; reversible.' },
    {
      title: 'Archive node',
      description:
        'Archives a node and everything under it (soft delete — nothing is destroyed). Pass restore: true to un-archive. There is no hard delete over MCP. Mutates data.',
      inputSchema: { nodeId: z.string(), restore: z.boolean().optional() },
    },
    async ({ nodeId, restore }: { nodeId: string; restore?: boolean }, extra: ToolHandlerExtra) => {
      const gate = requireToolScope(extra, 'docs:write');
      if (!gate.ok) return gate.error;
      try {
        const { nodeIds } = await setNodeArchived(gate.context.db, gate.context.businessId, nodeId, !restore);
        return mcpToolResult({ nodeId, archived: !restore, affected: nodeIds.length });
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
