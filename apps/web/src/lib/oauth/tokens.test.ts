// @vitest-environment node
//
// This suite must run in the Node environment, not the project-wide jsdom
// default: jose's WebCrypto build does `instanceof Uint8Array` on its HMAC
// key, and jsdom's globals live in a separate realm from Node's — a
// TextEncoder().encode() produced under jsdom fails that check with a
// misleading "Received an instance of Uint8Array" error. Pure Node
// crypto/JWT logic has no business running under a DOM environment anyway.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// tokens.ts reads NEXUS_MCP_OAUTH_JWT_SECRET at module-load time, so the env
// var must be set and the module reset/re-imported per test — same pattern
// as email.test.ts.

const ORIGINAL_ENV = { ...process.env };

/** Minimal fake Supabase client for oauth_refresh_tokens — models exactly
 * the conditional-UPDATE concurrency guard rotateRefreshToken relies on. */
function makeFakeDb(row: {
  id: string;
  client_id: string;
  user_id: string;
  business_id: string;
  scopes: string;
  expires_at: string | null;
  revoked_at: string | null;
}) {
  let revokedInDb = row.revoked_at;
  const inserted: any[] = [];
  return {
    from(table: string) {
      if (table !== 'oauth_refresh_tokens') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { ...row, revoked_at: revokedInDb } }),
          }),
        }),
        update: (patch: { revoked_at: string }) => ({
          eq: () => ({
            is: () => ({
              select: async () => {
                if (revokedInDb === null) {
                  revokedInDb = patch.revoked_at;
                  return { data: [{ id: row.id }], error: null };
                }
                return { data: [], error: null };
              },
            }),
          }),
        }),
        insert: async (values: any) => {
          inserted.push(values);
          return { error: null };
        },
      };
    },
    _inserted: inserted,
  };
}

beforeEach(() => {
  process.env.NEXUS_MCP_OAUTH_JWT_SECRET = 'a'.repeat(32);
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('mintAccessToken / verifyAccessToken', () => {
  it('round-trips: a minted token verifies with the same claims', async () => {
    const { mintAccessToken, verifyAccessToken } = await import('./tokens');
    const minted = await mintAccessToken({
      userId: 'user-1',
      businessId: 'biz-1',
      businessSlug: 'acme',
      scopes: ['memory:read', 'memory:write'],
      clientId: 'mcp_client_abc',
    });
    expect(minted.expiresIn).toBe(3600);

    const result = await verifyAccessToken(minted.token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claims.sub).toBe('user-1');
      expect(result.claims.business_id).toBe('biz-1');
      expect(result.claims.business_slug).toBe('acme');
      expect(result.claims.scopes).toBe('memory:read,memory:write');
      expect(result.claims.client_id).toBe('mcp_client_abc');
      expect(typeof result.claims.jti).toBe('string');
    }
  });

  it('rejects a token signed with a different secret', async () => {
    const { mintAccessToken } = await import('./tokens');
    const minted = await mintAccessToken({
      userId: 'user-1',
      businessId: 'biz-1',
      businessSlug: 'acme',
      scopes: ['memory:read'],
      clientId: 'mcp_client_abc',
    });

    process.env.NEXUS_MCP_OAUTH_JWT_SECRET = 'b'.repeat(32);
    vi.resetModules();
    const { verifyAccessToken } = await import('./tokens');
    const result = await verifyAccessToken(minted.token);
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('reports not_configured when the secret is unset', async () => {
    delete process.env.NEXUS_MCP_OAUTH_JWT_SECRET;
    vi.resetModules();
    const { verifyAccessToken, isMcpOAuthConfigured } = await import('./tokens');
    expect(isMcpOAuthConfigured()).toBe(false);
    const result = await verifyAccessToken('anything');
    expect(result).toEqual({ ok: false, reason: 'not_configured' });
  });

  it('throws McpOAuthNotConfiguredError when minting without a secret', async () => {
    delete process.env.NEXUS_MCP_OAUTH_JWT_SECRET;
    vi.resetModules();
    const { mintAccessToken, McpOAuthNotConfiguredError } = await import('./tokens');
    await expect(
      mintAccessToken({ userId: 'u', businessId: 'b', businessSlug: 's', scopes: [], clientId: 'c' }),
    ).rejects.toBeInstanceOf(McpOAuthNotConfiguredError);
  });
});

describe('rotateRefreshToken', () => {
  it('rotates a valid, unrevoked token: mints a new one and revokes the old row', async () => {
    const { rotateRefreshToken } = await import('./tokens');
    const db = makeFakeDb({
      id: 'row-1',
      client_id: 'mcp_client_abc',
      user_id: 'user-1',
      business_id: 'biz-1',
      scopes: 'memory:read,memory:write',
      expires_at: null,
      revoked_at: null,
    });

    const result = await rotateRefreshToken(db as any, 'nexus_mcp_rt_original');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.refreshToken).not.toBe('nexus_mcp_rt_original');
      expect(result.claims).toEqual({
        clientId: 'mcp_client_abc',
        userId: 'user-1',
        businessId: 'biz-1',
        scopes: ['memory:read', 'memory:write'],
      });
    }
    expect(db._inserted).toHaveLength(1);
    expect(db._inserted[0].rotated_from).toBe('row-1');
  });

  it('rejects reuse of an already-rotated refresh token (replay/race guard)', async () => {
    const { rotateRefreshToken } = await import('./tokens');
    const db = makeFakeDb({
      id: 'row-1',
      client_id: 'mcp_client_abc',
      user_id: 'user-1',
      business_id: 'biz-1',
      scopes: 'memory:read',
      expires_at: null,
      revoked_at: null,
    });

    const first = await rotateRefreshToken(db as any, 'nexus_mcp_rt_original');
    expect(first.ok).toBe(true);

    // Second caller replaying the SAME raw token after it was already rotated —
    // this is the concurrency guard's job: the conditional UPDATE (revoked_at
    // is null) has already been consumed, so this must fail, not silently
    // mint a second valid refresh token for the same grant.
    const second = await rotateRefreshToken(db as any, 'nexus_mcp_rt_original');
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error).toMatch(/already used or revoked/i);
    }
  });

  it('rejects an unknown refresh token', async () => {
    const { rotateRefreshToken } = await import('./tokens');
    const db = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
    };
    const result = await rotateRefreshToken(db as any, 'nexus_mcp_rt_does_not_exist');
    expect(result).toEqual({ ok: false, error: 'Invalid refresh token' });
  });

  it('rejects an expired refresh token', async () => {
    const { rotateRefreshToken } = await import('./tokens');
    const db = makeFakeDb({
      id: 'row-1',
      client_id: 'mcp_client_abc',
      user_id: 'user-1',
      business_id: 'biz-1',
      scopes: 'memory:read',
      expires_at: new Date(Date.now() - 1000).toISOString(),
      revoked_at: null,
    });
    const result = await rotateRefreshToken(db as any, 'nexus_mcp_rt_expired');
    expect(result).toEqual({ ok: false, error: 'Refresh token expired' });
  });
});
