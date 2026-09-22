// @vitest-environment node
//
// Same jose/jsdom cross-realm reason as lib/oauth/tokens.test.ts — this
// route mints real JWTs via mintAccessToken().
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';

const ORIGINAL_ENV = { ...process.env };

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}));

interface FakeState {
  authCode: {
    id: string;
    code_hash: string;
    client_id: string;
    user_id: string;
    business_id: string;
    scopes: string;
    redirect_uri: string;
    code_challenge: string;
    code_challenge_method: string;
    expires_at: string;
    used_at: string | null;
  } | null;
  refreshToken: {
    id: string;
    token_hash: string;
    client_id: string;
    user_id: string;
    business_id: string;
    scopes: string;
    expires_at: string | null;
    revoked_at: string | null;
  } | null;
  client: { id: string } | null;
  business: { id: string; slug: string } | null;
}

function hashHex(raw: string) {
  // Mirrors the real hashCode()/hashRefreshToken() in codes.ts/tokens.ts —
  // the fake DB just needs to compare hashes the same way those do.
  return createHash('sha256').update(raw).digest('hex');
}

function makeFakeDb(state: FakeState) {
  const inserted: { table: string; values: any }[] = [];
  return {
    from: (table: string) => {
      if (table === 'oauth_clients') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () =>
                ({ data: state.client ? { ...state.client, redirect_uris: [state.authCode?.redirect_uri], grant_types: [], token_endpoint_auth_method: 'none', created_at: new Date().toISOString(), client_name: null } : null }),
            }),
          }),
        };
      }
      if (table === 'oauth_authorization_codes') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => ({ data: state.authCode && state.authCode.code_hash === val ? state.authCode : null }),
            }),
          }),
          update: (patch: any) => ({
            eq: () => ({
              is: () => ({
                select: async () => {
                  if (state.authCode && state.authCode.used_at === null) {
                    state.authCode.used_at = patch.used_at;
                    return { data: [{ id: state.authCode.id }], error: null };
                  }
                  return { data: [], error: null };
                },
              }),
            }),
          }),
        };
      }
      if (table === 'oauth_refresh_tokens') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => ({ data: state.refreshToken && state.refreshToken.token_hash === val ? state.refreshToken : null }),
            }),
          }),
          update: (patch: any) => ({
            eq: () => ({
              is: () => ({
                select: async () => {
                  if (state.refreshToken && state.refreshToken.revoked_at === null) {
                    state.refreshToken.revoked_at = patch.revoked_at;
                    return { data: [{ id: state.refreshToken.id }], error: null };
                  }
                  return { data: [], error: null };
                },
              }),
            }),
          }),
          insert: async (values: any) => {
            inserted.push({ table: 'oauth_refresh_tokens', values });
            return { error: null };
          },
        };
      }
      if (table === 'businesses') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: state.business, error: state.business ? null : { message: 'not found' } }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    _inserted: inserted,
  };
}

beforeEach(() => {
  process.env.NEXUS_MCP_OAUTH_JWT_SECRET = 'a'.repeat(32);
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('POST /api/oauth/token', () => {
  it('returns server_error when NEXUS_MCP_OAUTH_JWT_SECRET is unset', async () => {
    delete process.env.NEXUS_MCP_OAUTH_JWT_SECRET;
    vi.resetModules();
    const { POST } = await import('./route');
    const req = new Request('https://nexus.test/api/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('server_error');
  });

  it('rejects an unsupported grant_type', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    vi.mocked(createServiceClient).mockReturnValue(makeFakeDb({ authCode: null, refreshToken: null, client: null, business: null }) as any);
    const { POST } = await import('./route');
    const req = new Request('https://nexus.test/api/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('unsupported_grant_type');
  });

  it('parses a JSON body for the authorization_code grant and mints tokens', async () => {
    const verifier = 'v'.repeat(64);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const state: FakeState = {
      authCode: {
        id: 'code-1',
        code_hash: hashHex('raw-code-1'),
        client_id: 'mcp_client_abc',
        user_id: 'user-1',
        business_id: 'biz-1',
        scopes: 'memory:read,memory:write',
        redirect_uri: 'http://localhost:9999/cb',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        used_at: null,
      },
      refreshToken: null,
      client: { id: 'mcp_client_abc' },
      business: { id: 'biz-1', slug: 'acme' },
    };
    const { createServiceClient } = await import('@/lib/supabase/service');
    vi.mocked(createServiceClient).mockReturnValue(makeFakeDb(state) as any);

    const { POST } = await import('./route');
    const req = new Request('https://nexus.test/api/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'raw-code-1',
        redirect_uri: 'http://localhost:9999/cb',
        client_id: 'mcp_client_abc',
        code_verifier: verifier,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token_type).toBe('Bearer');
    expect(typeof body.access_token).toBe('string');
    expect(typeof body.refresh_token).toBe('string');
    expect(body.scope).toBe('memory:read memory:write');
  });

  it('parses a form-encoded body the same way as JSON', async () => {
    const verifier = 'v'.repeat(64);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const state: FakeState = {
      authCode: {
        id: 'code-1',
        code_hash: hashHex('raw-code-2'),
        client_id: 'mcp_client_abc',
        user_id: 'user-1',
        business_id: 'biz-1',
        scopes: 'memory:read',
        redirect_uri: 'http://localhost:9999/cb',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        used_at: null,
      },
      refreshToken: null,
      client: { id: 'mcp_client_abc' },
      business: { id: 'biz-1', slug: 'acme' },
    };
    const { createServiceClient } = await import('@/lib/supabase/service');
    vi.mocked(createServiceClient).mockReturnValue(makeFakeDb(state) as any);

    const { POST } = await import('./route');
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'raw-code-2',
      redirect_uri: 'http://localhost:9999/cb',
      client_id: 'mcp_client_abc',
      code_verifier: verifier,
    });
    const req = new Request('https://nexus.test/api/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.access_token).toBe('string');
  });

  it('rotates a valid refresh token and mints a new access token', async () => {
    const state: FakeState = {
      authCode: null,
      refreshToken: {
        id: 'rt-1',
        token_hash: hashHex('raw-refresh-1'),
        client_id: 'mcp_client_abc',
        user_id: 'user-1',
        business_id: 'biz-1',
        scopes: 'memory:read',
        expires_at: null,
        revoked_at: null,
      },
      client: { id: 'mcp_client_abc' },
      business: { id: 'biz-1', slug: 'acme' },
    };
    const { createServiceClient } = await import('@/lib/supabase/service');
    vi.mocked(createServiceClient).mockReturnValue(makeFakeDb(state) as any);

    const { POST } = await import('./route');
    const req = new Request('https://nexus.test/api/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: 'raw-refresh-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.access_token).toBe('string');
    expect(body.refresh_token).not.toBe('raw-refresh-1');
  });

  it('rejects reusing an already-rotated refresh token with invalid_grant', async () => {
    const state: FakeState = {
      authCode: null,
      refreshToken: {
        id: 'rt-1',
        token_hash: hashHex('raw-refresh-2'),
        client_id: 'mcp_client_abc',
        user_id: 'user-1',
        business_id: 'biz-1',
        scopes: 'memory:read',
        expires_at: null,
        revoked_at: null,
      },
      client: { id: 'mcp_client_abc' },
      business: { id: 'biz-1', slug: 'acme' },
    };
    const { createServiceClient } = await import('@/lib/supabase/service');
    vi.mocked(createServiceClient).mockReturnValue(makeFakeDb(state) as any);

    const { POST } = await import('./route');
    const makeReq = () =>
      new Request('https://nexus.test/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: 'raw-refresh-2' }),
      });

    const first = await POST(makeReq());
    expect(first.status).toBe(200);

    const second = await POST(makeReq());
    expect(second.status).toBe(400);
    const body = await second.json();
    expect(body.error).toBe('invalid_grant');
  });

  it('rejects an unknown client_id on the authorization_code grant', async () => {
    const state: FakeState = { authCode: null, refreshToken: null, client: null, business: null };
    const { createServiceClient } = await import('@/lib/supabase/service');
    vi.mocked(createServiceClient).mockReturnValue(makeFakeDb(state) as any);

    const { POST } = await import('./route');
    const req = new Request('https://nexus.test/api/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'whatever',
        redirect_uri: 'http://localhost:9999/cb',
        client_id: 'unknown_client',
        code_verifier: 'x'.repeat(64),
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_client');
  });
});
