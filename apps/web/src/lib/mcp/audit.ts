import { createHash } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServiceClient } from '@/lib/supabase/service';
import type { McpTokenExtra, ToolHandlerExtra } from '@/lib/mcp/context';
import { registerManifestEntry, type ManifestEntry } from '@/lib/mcp/manifest';

type ToolHandler<TArgs> = (args: TArgs, extra: ToolHandlerExtra) => Promise<unknown>;

/** Wraps a tool handler so every call writes exactly one mcp_audit_log row
 * in a finally — tool name, business, token, ok/fail, duration, and a
 * sha256 digest of the args (never the raw args: memory contents and
 * document bodies would otherwise leak into a log table). Best-effort:
 * a failure to write the audit row never fails the tool call itself. */
export function withAudit<TArgs>(toolName: string, handler: ToolHandler<TArgs>): ToolHandler<TArgs> {
  return async (args, extra) => {
    const startedAt = Date.now();
    let ok = false;
    try {
      const result = await handler(args, extra);
      ok = !(result && typeof result === 'object' && 'isError' in result && (result as { isError?: boolean }).isError);
      return result;
    } finally {
      const durationMs = Date.now() - startedAt;
      const meta = extra.authInfo?.extra as McpTokenExtra | undefined;
      if (meta) {
        const argsDigest = createHash('sha256').update(JSON.stringify(args ?? {})).digest('hex');
        createServiceClient()
          .from('mcp_audit_log')
          .insert({
            business_id: meta.businessId,
            token_id: meta.tokenId,
            tool: toolName,
            ok,
            duration_ms: durationMs,
            args_digest: argsDigest,
          })
          .then(() => undefined);
      }
    }
  };
}

/** registerManifestEntry() + server.registerTool() + withAudit(), in one
 * call, so every tool file gets audit logging and manifest registration
 * "for free" without hand-wiring it per tool. */
export function registerAuditedTool<TArgs>(
  server: McpServer,
  entry: ManifestEntry,
  config: { title: string; description: string; inputSchema: Record<string, unknown> },
  handler: ToolHandler<TArgs>,
): void {
  registerManifestEntry(entry);
  server.registerTool(entry.name, config as never, withAudit(entry.name, handler) as never);
}
