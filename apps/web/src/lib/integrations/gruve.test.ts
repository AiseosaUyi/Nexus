// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GruveClient, GruveApiError, getGruveClientForBusiness } from './gruve';
import { encryptSecret } from '@/lib/crypto/secretbox';

beforeEach(() => {
  process.env.NEXUS_INTEGRATION_KEY = Buffer.alloc(32, 7).toString('base64');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

describe('GruveClient', () => {
  it('passes through the {data, pagination} shape and adds coverage: onchain-only', async () => {
    const fixture = { data: [{ id: 'evt-1' }], pagination: { next_cursor: 'abc', has_more: true } };
    mockFetchOnce(200, fixture);
    const client = new GruveClient('https://secure.gruve.events', 'gruve_live_test');
    const result = await client.listEvents();
    expect(result).toEqual({ ...fixture, coverage: 'onchain-only' });
  });

  it('sends the Bearer auth header', async () => {
    mockFetchOnce(200, { data: [], pagination: { next_cursor: null, has_more: false } });
    const client = new GruveClient('https://secure.gruve.events', 'gruve_live_abc');
    await client.listEvents();
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer gruve_live_abc');
  });

  it('clamps limit to 100', async () => {
    mockFetchOnce(200, { data: [], pagination: { next_cursor: null, has_more: false } });
    const client = new GruveClient('https://secure.gruve.events', 'key');
    await client.listEvents(undefined, 500);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const [url] = fetchMock.mock.calls[0];
    expect(new URL(url as string).searchParams.get('limit')).toBe('100');
  });

  it('maps a 401 to a GruveApiError with the upstream message', async () => {
    mockFetchOnce(401, { message: 'invalid or missing API key', data: {} });
    const client = new GruveClient('https://secure.gruve.events', 'bad-key');
    await expect(client.listEvents()).rejects.toMatchObject({
      status: 401,
      message: 'invalid or missing API key',
    });
    await expect(client.listEvents()).rejects.toBeInstanceOf(GruveApiError);
  });

  it('maps a 403 (missing scope) to a GruveApiError', async () => {
    mockFetchOnce(403, { message: 'this API key does not have the required scope', data: {} });
    const client = new GruveClient('https://secure.gruve.events', 'scoped-key');
    await expect(client.listSales()).rejects.toMatchObject({ status: 403 });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 500 })));
    const client = new GruveClient('https://secure.gruve.events', 'key');
    await expect(client.listEvents()).rejects.toMatchObject({ status: 500 });
  });

  it('retries exactly once on a network failure, then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [], pagination: { next_cursor: null, has_more: false } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new GruveClient('https://secure.gruve.events', 'key');
    const result = await client.listEvents();
    expect(result.coverage).toBe('onchain-only');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('GruveClient.listAllPages', () => {
  it('loops through pages until has_more is false, coverage stays onchain-only', async () => {
    const pages = [
      { data: [{ id: '1' }], pagination: { next_cursor: 'c1', has_more: true } },
      { data: [{ id: '2' }], pagination: { next_cursor: null, has_more: false } },
    ];
    let call = 0;
    const client = new GruveClient('https://secure.gruve.events', 'key');
    const fn = vi.fn(async () => ({ ...pages[call++], coverage: 'onchain-only' as const }));
    const result = await client.listAllPages(fn);
    expect(result.items).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.coverage).toBe('onchain-only');
  });

  it('stops at the page cap and reports coverage: partial instead of silently truncating', async () => {
    // The eng review's finding: nexus_gruve_snapshot must never report a
    // truncated total as if it were complete.
    const client = new GruveClient('https://secure.gruve.events', 'key');
    const fn = vi.fn(async (cursor: string | undefined) => ({
      data: [{ id: cursor ?? 'first' }],
      pagination: { next_cursor: 'always-more', has_more: true },
      coverage: 'onchain-only' as const,
    }));
    const result = await client.listAllPages(fn, { maxPages: 3 });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(result.coverage).toBe('partial');
    expect(result.items).toHaveLength(3);
  });
});

function makeFakeDb(row: { config: Record<string, unknown>; secret_enc: string | null } | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: row }),
          }),
        }),
      }),
    }),
  };
}

describe('getGruveClientForBusiness', () => {
  it('returns not_connected when no integration row exists', async () => {
    const db = makeFakeDb(null);
    const result = await getGruveClientForBusiness(db as any, 'biz-1');
    expect(result).toEqual({ ok: false, reason: 'not_connected' });
  });

  it('returns not_connected when the row exists but has no secret', async () => {
    const db = makeFakeDb({ config: { baseUrl: 'https://secure.gruve.events' }, secret_enc: null });
    const result = await getGruveClientForBusiness(db as any, 'biz-1');
    expect(result).toEqual({ ok: false, reason: 'not_connected' });
  });

  it('decrypts the key and builds a client when connected', async () => {
    const encrypted = encryptSecret('gruve_live_abc_def');
    const db = makeFakeDb({ config: { baseUrl: 'https://backend.gruve.events' }, secret_enc: encrypted });
    const result = await getGruveClientForBusiness(db as any, 'biz-1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.client).toBeInstanceOf(GruveClient);
  });

  it('defaults to the production base URL when none is stored', async () => {
    const encrypted = encryptSecret('gruve_live_abc_def');
    const db = makeFakeDb({ config: {}, secret_enc: encrypted });
    const result = await getGruveClientForBusiness(db as any, 'biz-1');
    expect(result.ok).toBe(true);
  });
});
