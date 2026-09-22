// Naive in-memory fixed-window limiters, copied from Pulse's
// src/lib/api/rate-limit.ts shape. Cheap floor against a runaway agent
// loop and against unauthenticated cost/DoS abuse of the token lookup
// itself (every request bearing a well-formed nexus_key_ prefix costs a
// real Supabase round-trip whether or not the token is valid).
//
// Known limitation, accepted for v1 (see TODOS.md): these Maps are per
// serverless instance, reset on cold start, and aren't shared across
// concurrent Vercel invocations, so they're a soft limit at best.

const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
}

function check(namespace: string, key: string, windowMs: number, maxRequests: number): RateLimitResult {
  const bucketKey = `${namespace}:${key}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= maxRequests) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Per-token limit, applied once a token has resolved (60 requests/min). */
export function checkRateLimit(tokenId: string): RateLimitResult {
  return check('token', tokenId, 60_000, 60);
}

/** Per-IP limit, applied BEFORE the token lookup (300 requests/min) — any
 * request with a well-formed bearer prefix costs a real DB round-trip
 * regardless of whether the token turns out to be valid, so this has to
 * gate ahead of resolveApiToken()/verifyAccessToken(), not after. Generous
 * ceiling since legitimate callers can share one IP. */
export function checkPreAuthRateLimit(ip: string): RateLimitResult {
  return check('preauth-ip', ip, 60_000, 300);
}
