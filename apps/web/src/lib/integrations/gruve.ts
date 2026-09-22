// Typed, read-only client for the Gruve Payment-service partner API
// (../Gruve/Backend/src/api/partnerApi/*). Nexus never writes to Gruve —
// this client has no POST/PUT/DELETE methods, by design, not by omission.
//
// Contract verified directly against Gruve's own source (not assumed from
// the spec's prose): Bearer gruve_live_<12>_<32> auth, 401/403 JSON
// {message, data} on failure (src/utils/apiKeyAuth.ts), every list
// endpoint cursor-paginated {data, pagination:{next_cursor,has_more}} with
// limit clamped to 100 server-side (src/api/partnerApi/partnerApi.service.ts).
//
// Known gap in Gruve, surfaced not papered over: v1 covers the on-chain
// Events/Tickets/Payments path only — OffChain* tables aren't included yet.
// Every response here carries coverage: 'onchain-only' (or 'partial' for
// nexus_gruve_snapshot's paginated aggregate, when it hits its page cap).

import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/lib/crypto/secretbox';

export interface GruvePagination {
  next_cursor: string | null;
  has_more: boolean;
}

export interface GruvePage<T> {
  data: T[];
  pagination: GruvePagination;
  coverage: 'onchain-only';
}

export class GruveApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GruveApiError';
  }
}

export type GruveConnectionResult = { ok: true; client: GruveClient } | { ok: false; reason: 'not_connected' };

const REQUEST_TIMEOUT_MS = 10_000;

export class GruveClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async request<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const attempt = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        return await fetch(url.toString(), {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    let res: Response;
    try {
      res = await attempt();
    } catch {
      // Retried at most once, per spec — a single transient network blip
      // shouldn't surface as a tool error, but this is not a resilience
      // system for a genuinely unreachable upstream.
      res = await attempt();
    }

    if (!res.ok) {
      let message = `Gruve API error (${res.status})`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        // Non-JSON error body — keep the generic message.
      }
      throw new GruveApiError(res.status, message);
    }

    return (await res.json()) as T;
  }

  async listEvents(cursor?: string, limit?: number) {
    const page = await this.request<{ data: unknown[]; pagination: GruvePagination }>('/api/v1/events', {
      cursor,
      limit: limit ? Math.min(limit, 100) : undefined,
    });
    return { ...page, coverage: 'onchain-only' as const };
  }

  async getEvent(id: string) {
    return this.request<unknown>(`/api/v1/events/${encodeURIComponent(id)}`);
  }

  async listTickets(cursor?: string, limit?: number) {
    const page = await this.request<{ data: unknown[]; pagination: GruvePagination }>('/api/v1/tickets', {
      cursor,
      limit: limit ? Math.min(limit, 100) : undefined,
    });
    return { ...page, coverage: 'onchain-only' as const };
  }

  async listRegistrations(cursor?: string, limit?: number) {
    const page = await this.request<{ data: unknown[]; pagination: GruvePagination }>('/api/v1/registrations', {
      cursor,
      limit: limit ? Math.min(limit, 100) : undefined,
    });
    return { ...page, coverage: 'onchain-only' as const };
  }

  async listSales(cursor?: string, limit?: number) {
    const page = await this.request<{ data: unknown[]; pagination: GruvePagination }>('/api/v1/sales', {
      cursor,
      limit: limit ? Math.min(limit, 100) : undefined,
    });
    return { ...page, coverage: 'onchain-only' as const };
  }

  /** Loops pages until has_more is false OR a bounded page cap is hit —
   * unbounded for a single operator's data volume, but never infinite.
   * Returns coverage: 'partial' if the cap was hit, so a caller (nexus_
   * gruve_snapshot) never silently reports a truncated total as complete. */
  async listAllPages<T>(
    fn: (cursor: string | undefined, limit: number) => Promise<GruvePage<T>>,
    opts: { maxPages?: number } = {},
  ): Promise<{ items: T[]; coverage: 'onchain-only' | 'partial' }> {
    const maxPages = opts.maxPages ?? 10;
    const items: T[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const result = await fn(cursor, 100);
      items.push(...result.data);
      if (!result.pagination.has_more) return { items, coverage: 'onchain-only' };
      cursor = result.pagination.next_cursor ?? undefined;
      if (!cursor) return { items, coverage: 'onchain-only' };
    }
    return { items, coverage: 'partial' };
  }
}

/** The shared setup every nexus_gruve_* tool needs — load creds, decrypt
 * the key, build a client — in one place, so it isn't copy-pasted across
 * 5 tool handlers (the eng review's Code Quality finding). Returns a typed
 * "not connected" result instead of throwing, so every caller can surface
 * a clear tool error naming the missing integration rather than a raw
 * null-pointer crash (the eng review's Failure Modes finding). */
export async function getGruveClientForBusiness(db: SupabaseClient, businessId: string): Promise<GruveConnectionResult> {
  const { data } = await db
    .from('business_integrations')
    .select('config, secret_enc')
    .eq('business_id', businessId)
    .eq('provider', 'gruve')
    .maybeSingle();
  if (!data || !data.secret_enc) return { ok: false, reason: 'not_connected' };

  const config = data.config as { baseUrl?: string };
  const apiKey = decryptSecret(data.secret_enc as string);
  return { ok: true, client: new GruveClient(config.baseUrl ?? 'https://secure.gruve.events', apiKey) };
}
