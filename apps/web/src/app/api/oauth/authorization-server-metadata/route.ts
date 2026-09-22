// RFC 8414 Authorization Server Metadata. mcp-handler doesn't provide this
// (it only ships RFC 9728 protected-resource metadata helpers, confirmed
// against its own type exports) — hand-rolled here, served at
// /.well-known/oauth-authorization-server via the next.config.ts rewrite.

import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/mcp/app-url';
import { MCP_SCOPES } from '@/lib/mcp/scopes';

export const dynamic = 'force-dynamic';

export async function GET() {
  const issuer = appUrl('/').replace(/\/$/, '');
  return NextResponse.json(
    {
      issuer,
      authorization_endpoint: appUrl('/oauth/authorize'),
      token_endpoint: appUrl('/api/oauth/token'),
      registration_endpoint: appUrl('/api/oauth/register'),
      scopes_supported: [...MCP_SCOPES],
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
    },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
