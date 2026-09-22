// Static nexus_key_ token helpers for the Nexus Brain MCP server. A token
// is 32 random bytes encoded as `nexus_key_<64 hex>`. We hash (sha256)
// before writing, so the raw value only ever leaves the server once, at
// mint time. Shape copied from Pulse's src/lib/api-tokens.ts.

import { createHash, randomBytes } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveRequestedScopes, type McpScope } from '@/lib/mcp/scopes';

const PREFIX = 'nexus_key_';
const LAST_USED_DEBOUNCE_MS = 5 * 60 * 1000;

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateToken(): string {
  return `${PREFIX}${randomBytes(32).toString('hex')}`;
}

export interface ResolvedApiToken {
  businessId: string;
  businessSlug: string;
  tokenId: string;
  scopes: string[];
  createdBy: string | null;
}

/**
 * Look up a token, confirm it's valid and un-revoked, and return the
 * business + scopes. Debounces last_used_at to once per 5 minutes so a
 * chatty agent doesn't turn every tool call into two writes.
 */
export async function resolveApiToken(raw: string): Promise<ResolvedApiToken | null> {
  if (!raw || !raw.startsWith(PREFIX)) return null;
  const supabase = createServiceClient();
  const hash = hashToken(raw);
  const { data, error } = await supabase
    .from('workspace_api_tokens')
    .select('id, business_id, scopes, revoked_at, created_by, last_used_at, businesses(slug)')
    .eq('token_hash', hash)
    .maybeSingle();
  if (error || !data) return null;
  if (data.revoked_at) return null;

  const isStale = !data.last_used_at || Date.now() - new Date(data.last_used_at).getTime() > LAST_USED_DEBOUNCE_MS;
  if (isStale) {
    // Fire-and-forget; don't block the request on telemetry.
    supabase
      .from('workspace_api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => undefined);
  }

  const business = data.businesses as unknown as { slug: string } | { slug: string }[] | null;
  const businessSlug = Array.isArray(business) ? business[0]?.slug : business?.slug;
  if (!businessSlug) return null;

  return {
    businessId: data.business_id as string,
    businessSlug,
    tokenId: data.id as string,
    scopes: (data.scopes as string).split(',').map((s) => s.trim()).filter(Boolean),
    createdBy: data.created_by as string | null,
  };
}

export interface MintedApiToken {
  token: string;
  tokenPrefix: string;
}

/** Mints and stores a new static token (hashed — the raw value only ever
 * leaves this function once, to the caller). */
export async function mintApiToken(
  businessId: string,
  name: string,
  requestedScopes: string[],
  createdBy: string,
): Promise<MintedApiToken> {
  const supabase = createServiceClient();
  const raw = generateToken();
  const scopes: McpScope[] = resolveRequestedScopes(requestedScopes);
  const tokenPrefix = raw.slice(0, PREFIX.length + 8);
  const { error } = await supabase.from('workspace_api_tokens').insert({
    business_id: businessId,
    name,
    token_prefix: tokenPrefix,
    token_hash: hashToken(raw),
    scopes: scopes.join(','),
    created_by: createdBy,
  });
  if (error) throw new Error(`mintApiToken: ${error.message}`);
  return { token: raw, tokenPrefix };
}

export function extractBearer(req: Request): string | null {
  const raw = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!raw) return null;
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return m?.[1] ?? null;
}
