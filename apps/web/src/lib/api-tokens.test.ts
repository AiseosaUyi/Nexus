import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { generateToken, hashToken, mintApiToken, resolveApiToken } from './api-tokens';

function makeFakeDb(tokenRow: Record<string, unknown> | null) {
  const updates: Array<{ patch: any; id: string }> = [];
  const inserts: any[] = [];
  return {
    from: (table: string) => {
      if (table !== 'workspace_api_tokens') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: tokenRow, error: null }),
          }),
        }),
        update: (patch: any) => ({
          eq: (_col: string, id: string) => {
            updates.push({ patch, id });
            return Promise.resolve({ error: null });
          },
        }),
        insert: async (values: any) => {
          inserts.push(values);
          return { error: null };
        },
      };
    },
    _updates: updates,
    _inserts: inserts,
  };
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}));

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('generateToken / hashToken', () => {
  it('generates a token with the nexus_key_ prefix and 64 hex chars', () => {
    const token = generateToken();
    expect(token).toMatch(/^nexus_key_[0-9a-f]{64}$/);
  });

  it('generates a different token every call', () => {
    expect(generateToken()).not.toBe(generateToken());
  });

  it('hashes deterministically with sha256', () => {
    const raw = 'nexus_key_abc123';
    expect(hashToken(raw)).toBe(createHash('sha256').update(raw).digest('hex'));
    expect(hashToken(raw)).toBe(hashToken(raw));
  });
});

describe('resolveApiToken', () => {
  beforeEach(async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    vi.mocked(createServiceClient).mockReset();
  });

  it('returns null for a bearer that does not have the nexus_key_ prefix', async () => {
    expect(await resolveApiToken('Bearer something-else')).toBeNull();
    expect(await resolveApiToken('')).toBeNull();
  });

  it('returns null when the token is not found', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    const db = makeFakeDb(null);
    vi.mocked(createServiceClient).mockReturnValue(db as any);
    expect(await resolveApiToken('nexus_key_' + 'a'.repeat(64))).toBeNull();
  });

  it('returns null when the token is revoked', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    const db = makeFakeDb({
      id: 'tok-1',
      business_id: 'biz-1',
      scopes: 'memory:read,memory:write',
      revoked_at: new Date().toISOString(),
      created_by: 'user-1',
      last_used_at: null,
      businesses: { slug: 'acme' },
    });
    vi.mocked(createServiceClient).mockReturnValue(db as any);
    expect(await resolveApiToken('nexus_key_' + 'a'.repeat(64))).toBeNull();
  });

  it('resolves a valid token to its business and scopes', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    const db = makeFakeDb({
      id: 'tok-1',
      business_id: 'biz-1',
      scopes: 'memory:read, memory:write',
      revoked_at: null,
      created_by: 'user-1',
      last_used_at: null,
      businesses: { slug: 'acme' },
    });
    vi.mocked(createServiceClient).mockReturnValue(db as any);
    const resolved = await resolveApiToken('nexus_key_' + 'a'.repeat(64));
    expect(resolved).toEqual({
      businessId: 'biz-1',
      businessSlug: 'acme',
      tokenId: 'tok-1',
      scopes: ['memory:read', 'memory:write'],
      createdBy: 'user-1',
    });
  });

  it('debounces last_used_at: does NOT write when last used less than 5 minutes ago', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    const db = makeFakeDb({
      id: 'tok-1',
      business_id: 'biz-1',
      scopes: 'memory:read',
      revoked_at: null,
      created_by: null,
      last_used_at: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago
      businesses: { slug: 'acme' },
    });
    vi.mocked(createServiceClient).mockReturnValue(db as any);
    await resolveApiToken('nexus_key_' + 'a'.repeat(64));
    await flushMicrotasks();
    expect(db._updates).toHaveLength(0);
  });

  it('debounces last_used_at: DOES write when never used before (null)', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    const db = makeFakeDb({
      id: 'tok-1',
      business_id: 'biz-1',
      scopes: 'memory:read',
      revoked_at: null,
      created_by: null,
      last_used_at: null,
      businesses: { slug: 'acme' },
    });
    vi.mocked(createServiceClient).mockReturnValue(db as any);
    await resolveApiToken('nexus_key_' + 'a'.repeat(64));
    await flushMicrotasks();
    expect(db._updates).toHaveLength(1);
    expect(db._updates[0].id).toBe('tok-1');
  });

  it('debounces last_used_at: DOES write when last used more than 5 minutes ago', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    const db = makeFakeDb({
      id: 'tok-1',
      business_id: 'biz-1',
      scopes: 'memory:read',
      revoked_at: null,
      created_by: null,
      last_used_at: new Date(Date.now() - 6 * 60_000).toISOString(), // 6 minutes ago
      businesses: { slug: 'acme' },
    });
    vi.mocked(createServiceClient).mockReturnValue(db as any);
    await resolveApiToken('nexus_key_' + 'a'.repeat(64));
    await flushMicrotasks();
    expect(db._updates).toHaveLength(1);
  });
});

describe('mintApiToken', () => {
  it('inserts a hashed token with resolved scopes and returns the raw token once', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    const db = makeFakeDb(null);
    vi.mocked(createServiceClient).mockReturnValue(db as any);

    const minted = await mintApiToken('biz-1', 'CI key', ['memory:read', 'bogus'], 'user-1');
    expect(minted.token).toMatch(/^nexus_key_[0-9a-f]{64}$/);
    expect(minted.tokenPrefix).toBe(minted.token.slice(0, 'nexus_key_'.length + 8));

    expect(db._inserts).toHaveLength(1);
    const row = db._inserts[0];
    expect(row.business_id).toBe('biz-1');
    expect(row.name).toBe('CI key');
    expect(row.token_hash).toBe(hashToken(minted.token));
    expect(row.scopes).toBe('memory:read');
    expect(row.created_by).toBe('user-1');
  });

  it('falls back to default scopes when every requested scope is invalid', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service');
    const db = makeFakeDb(null);
    vi.mocked(createServiceClient).mockReturnValue(db as any);

    await mintApiToken('biz-1', 'CI key', [], 'user-1');
    expect(db._inserts[0].scopes.split(',')).toContain('memory:write');
  });
});
