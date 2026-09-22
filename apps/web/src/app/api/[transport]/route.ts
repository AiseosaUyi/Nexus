// Remote MCP server exposing every nexus_* tool — the URL-based, OAuth-
// capable successor to the old apps/web/src/app/api/mcp/route.ts (deleted
// in this same commit; see the note on the legacy branch below for why
// that's safe).
//
// [transport] is a literal dynamic segment mcp-handler resolves itself (it
// becomes "mcp" for streamable HTTP) — it is NOT a folder named "mcp".
// basePath is the parent path this file sits under, so the real served
// (and public) URL is {basePath}/mcp, i.e. /api/mcp. Next.js prefers a
// static app/api/mcp/route.ts over this dynamic segment for that exact
// path, which is why the old file had to go, not just be added alongside.
//
// Auth accepts THREE bearer shapes, dual-checked by prefix in verifyToken()
// below: a static nexus_key_ token (resolveApiToken()), a self-issued
// OAuth 2.1 access token (verifyAccessToken()), and — only while
// MCP_LEGACY_COMMAND_TOKEN=1 — the pre-existing COMMAND_CENTER_TOKEN, via
// EITHER an Authorization header OR the old ?key= query param. That last
// branch is the rollout-continuity fix from the eng review: the live
// Cowork connector today authenticates via ?key= (Cowork's "Add custom
// connector" dialog has no header field), and mcp-handler calls
// verifyToken(req, bearerToken) unconditionally — bearerToken is undefined
// when there's no Authorization header, but the full `req` is always
// passed, so ?key= is still readable here even with no header at all
// (confirmed by reading node_modules/mcp-handler/dist/index.mjs's
// withMcpAuth). That's what makes it safe to delete the old file in this
// same commit rather than leaving two files racing for the same route: the
// old auth shape is fully subsumed here, not dropped. Remove the flag (and
// this branch) once the Cowork connector is re-added via OAuth.
//
// Tools never accept a tenant argument from the model — requireToolScope()
// (lib/mcp/context.ts) is the only way a tool resolves its business, from
// whichever bearer shape authenticated the request.

import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { resolveApiToken } from '@/lib/api-tokens';
import { checkPreAuthRateLimit, getClientIp } from '@/lib/mcp/rate-limit';
import { verifyAccessToken } from '@/lib/oauth/tokens';
import type { McpTokenExtra } from '@/lib/mcp/context';
import { registerMetaTools } from '@/lib/mcp/tools/meta';
import { registerCommandCenterTools } from '@/lib/mcp/tools/command-center';
import { registerMemoryTools } from '@/lib/mcp/tools/memory';
import { registerSessionTools } from '@/lib/mcp/tools/sessions';
import { registerDocsTools } from '@/lib/mcp/tools/docs';
import { registerCalendarTools } from '@/lib/mcp/tools/calendar';
import { createServiceClient } from '@/lib/supabase/service';
import { appUrl } from '@/lib/mcp/app-url';

const handler = createMcpHandler(
  (server) => {
    registerMetaTools(server);
    registerCommandCenterTools(server);
    registerMemoryTools(server);
    registerSessionTools(server);
    registerDocsTools(server);
    registerCalendarTools(server);
  },
  {},
  {
    basePath: '/api',
    maxDuration: 60,
  },
);

async function verifyLegacyCommandToken(req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (process.env.MCP_LEGACY_COMMAND_TOKEN !== '1') return undefined;
  const sharedToken = process.env.COMMAND_CENTER_TOKEN;
  const businessSlug = process.env.COMMAND_CENTER_BUSINESS_SLUG;
  if (!sharedToken || !businessSlug) return undefined;

  const url = new URL(req.url);
  const byHeader = bearerToken === sharedToken;
  const byQuery = url.searchParams.get('key') === sharedToken;
  if (!byHeader && !byQuery) return undefined;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('businesses')
    .select('id, command_center_enabled')
    .eq('slug', businessSlug)
    .single();
  if (!data?.command_center_enabled) return undefined;

  // eslint-disable-next-line no-console
  console.warn(
    `[mcp] legacy COMMAND_CENTER_TOKEN auth used (${byQuery ? '?key=' : 'Authorization header'}) — ` +
      'delete MCP_LEGACY_COMMAND_TOKEN once the connector is re-added via OAuth.',
  );

  const extra: McpTokenExtra = {
    businessId: data.id as string,
    businessSlug,
    tokenId: 'legacy-command-token',
    createdBy: null,
    tokenKind: 'legacy',
  };
  return {
    token: bearerToken ?? 'legacy-query-key',
    scopes: ['command:read', 'command:write'],
    clientId: businessSlug,
    extra: extra as unknown as Record<string, unknown>,
  };
}

const verifyToken = async (req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  // Gate ahead of any token lookup/verification — a well-formed bearer
  // costs a real Supabase round-trip (or a JWT verify) whether or not it
  // turns out to be valid.
  if (!checkPreAuthRateLimit(getClientIp(req)).ok) return undefined;

  if (bearerToken?.startsWith('nexus_key_')) {
    const resolved = await resolveApiToken(bearerToken);
    if (!resolved) return undefined;
    const extra: McpTokenExtra = {
      businessId: resolved.businessId,
      businessSlug: resolved.businessSlug,
      tokenId: resolved.tokenId,
      createdBy: resolved.createdBy,
      tokenKind: 'static',
    };
    return {
      token: bearerToken,
      scopes: resolved.scopes,
      clientId: resolved.businessSlug,
      extra: extra as unknown as Record<string, unknown>,
    };
  }

  if (bearerToken) {
    const verified = await verifyAccessToken(bearerToken);
    if (verified.ok) {
      const extra: McpTokenExtra = {
        businessId: verified.claims.business_id,
        businessSlug: verified.claims.business_slug,
        tokenId: verified.claims.jti,
        createdBy: verified.claims.sub,
        tokenKind: 'oauth',
      };
      return {
        token: bearerToken,
        scopes: verified.claims.scopes.split(','),
        clientId: verified.claims.client_id,
        extra: extra as unknown as Record<string, unknown>,
      };
    }
  }

  return verifyLegacyCommandToken(req, bearerToken);
};

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceUrl: appUrl('/api/mcp'),
});

export { authHandler as GET, authHandler as POST };
