// RFC 9728 Protected Resource Metadata — built from mcp-handler's own
// protectedResourceHandler, the one place the library actually offers
// something for OAuth. Served at /.well-known/oauth-protected-resource
// via the next.config.ts rewrite.

import { protectedResourceHandler } from 'mcp-handler';
import { appUrl } from '@/lib/mcp/app-url';

export const dynamic = 'force-dynamic';

export const GET = protectedResourceHandler({
  authServerUrls: [appUrl('/').replace(/\/$/, '')],
  resourceUrl: appUrl('/api/mcp'),
});
