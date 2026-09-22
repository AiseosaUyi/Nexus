// Shared auth/scope gate for every MCP tool. withMcpAuth() (see
// app/api/[transport]/route.ts) resolves the bearer token once per request
// via verifyToken() and stashes the result on `extra.authInfo`; this
// re-derives a typed, scope-checked context from it inside each tool
// handler, and builds the fresh service client the same way every other
// server-side entry point in this codebase does. Shape copied from
// Pulse's src/lib/api/mcp-context.ts.

import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createServiceClient } from '@/lib/supabase/service';
import { hasScope, type McpScope } from '@/lib/mcp/scopes';
import { checkRateLimit } from '@/lib/mcp/rate-limit';

export type McpTokenKind = 'static' | 'oauth' | 'legacy';

export interface McpTokenExtra {
  businessId: string;
  businessSlug: string;
  tokenId: string;
  createdBy: string | null;
  tokenKind: McpTokenKind;
}

export interface McpToolContext {
  businessId: string;
  businessSlug: string;
  tokenId: string;
  scopes: string[];
  createdBy: string | null;
  tokenKind: McpTokenKind;
  db: ReturnType<typeof createServiceClient>;
}

/** Structural subset of the SDK's RequestHandlerExtra — every tool
 * callback's second param satisfies this; we don't need the rest of its
 * fields (signal, sessionId, sendNotification, ...). */
export interface ToolHandlerExtra {
  authInfo?: AuthInfo;
}

export interface McpToolError {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
}

export function mcpToolError(text: string): McpToolError {
  return { content: [{ type: 'text', text }], isError: true };
}

export function mcpToolResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}

export function requireToolScope(
  extra: ToolHandlerExtra,
  requiredScope: McpScope | null,
): { ok: true; context: McpToolContext } | { ok: false; error: McpToolError } {
  const authInfo = extra.authInfo;
  const meta = authInfo?.extra as McpTokenExtra | undefined;
  if (!authInfo || !meta) {
    return { ok: false, error: mcpToolError('Unauthorized: no valid token') };
  }
  if (!hasScope(authInfo.scopes, requiredScope)) {
    return { ok: false, error: mcpToolError(`Missing required scope: ${requiredScope}`) };
  }
  const rl = checkRateLimit(meta.tokenId);
  if (!rl.ok) {
    return { ok: false, error: mcpToolError('Rate limit exceeded — slow down and try again shortly.') };
  }
  return {
    ok: true,
    context: {
      businessId: meta.businessId,
      businessSlug: meta.businessSlug,
      tokenId: meta.tokenId,
      scopes: authInfo.scopes,
      createdBy: meta.createdBy,
      tokenKind: meta.tokenKind,
      db: createServiceClient(),
    },
  };
}
