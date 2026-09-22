import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, checkPreAuthRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first 60 calls in a window for a given token', () => {
    const tokenId = `token-${Math.random()}`;
    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit(tokenId).ok).toBe(true);
    }
  });

  it('rejects the 61st call in the same 60s window and reports a positive retryAfterSeconds', () => {
    const tokenId = `token-${Math.random()}`;
    for (let i = 0; i < 60; i++) checkRateLimit(tokenId);
    const result = checkRateLimit(tokenId);
    expect(result.ok).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets after the window elapses', () => {
    const tokenId = `token-${Math.random()}`;
    for (let i = 0; i < 60; i++) checkRateLimit(tokenId);
    expect(checkRateLimit(tokenId).ok).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit(tokenId).ok).toBe(true);
  });

  it('keeps separate buckets per token', () => {
    const a = `token-a-${Math.random()}`;
    const b = `token-b-${Math.random()}`;
    for (let i = 0; i < 60; i++) checkRateLimit(a);
    expect(checkRateLimit(a).ok).toBe(false);
    expect(checkRateLimit(b).ok).toBe(true);
  });
});

describe('checkPreAuthRateLimit', () => {
  it('allows up to 300 calls per IP per window, then rejects', () => {
    const ip = `1.2.3.${Math.floor(Math.random() * 255)}`;
    for (let i = 0; i < 300; i++) {
      expect(checkPreAuthRateLimit(ip).ok).toBe(true);
    }
    expect(checkPreAuthRateLimit(ip).ok).toBe(false);
  });

  it('keeps the per-token and per-IP namespaces independent even with the same key string', () => {
    const key = `shared-${Math.random()}`;
    for (let i = 0; i < 60; i++) checkRateLimit(key);
    expect(checkRateLimit(key).ok).toBe(false);
    // Same string, different namespace — must not be blocked by the token bucket above.
    expect(checkPreAuthRateLimit(key).ok).toBe(true);
  });
});
