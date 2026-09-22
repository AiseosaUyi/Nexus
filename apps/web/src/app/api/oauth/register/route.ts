// RFC 7591 Dynamic Client Registration. Public endpoint — no auth (a
// client can't authenticate before it has credentials), rate-limited
// per-IP the same way every other pre-auth path is. Always registers a
// public client (no secret) — see lib/oauth/clients.ts's registerClient().

import { z } from 'zod';
import { checkPreAuthRateLimit, getClientIp } from '@/lib/mcp/rate-limit';
import { oauthError, oauthOk } from '@/lib/oauth/respond';
import { registerClient } from '@/lib/oauth/clients';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  client_name: z.string().max(200).optional(),
  redirect_uris: z.array(z.string()).min(1),
  token_endpoint_auth_method: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const preAuth = checkPreAuthRateLimit(getClientIp(req));
  if (!preAuth.ok) {
    return oauthError(429, 'server_error', 'Rate limit exceeded');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return oauthError(400, 'invalid_request', 'Invalid JSON body');
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return oauthError(400, 'invalid_request', parsed.error.issues.map((i) => i.message).join('; '));
  }

  const db = createServiceClient();
  const result = await registerClient(db, {
    clientName: parsed.data.client_name,
    redirectUris: parsed.data.redirect_uris,
  });
  if (!result.ok) return oauthError(400, 'invalid_request', result.error);

  const { client } = result;
  return oauthOk(
    {
      client_id: client.id,
      client_name: client.clientName ?? undefined,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: ['code'],
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      client_id_issued_at: Math.floor(new Date(client.createdAt).getTime() / 1000),
    },
    201,
  );
}
