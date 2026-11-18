// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const post = (body: string, ip = '203.0.113.' + Math.floor(Math.random() * 250)) =>
  POST(new Request('https://nexus.test/api/csp-report', { method: 'POST', body, headers: { 'x-forwarded-for': ip } }));

describe('POST /api/csp-report', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('logs a compact line for a report-uri style report, without query strings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await post(JSON.stringify({ 'csp-report': {
      'effective-directive': 'connect-src',
      'blocked-uri': 'https://evil.example/collect?token=secret',
      'document-uri': 'https://nexus.test/w/acme/n/1?x=1',
    } }));
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledWith('[CSP-REPORT] connect-src blocked=https://evil.example/collect page=https://nexus.test/w/acme/n/1');
  });

  it('accepts Reporting API arrays', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await post(JSON.stringify([{ type: 'csp-violation', body: { effectiveDirective: 'script-src-elem', blockedURL: 'inline', documentURL: 'https://nexus.test/' } }]));
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized and malformed bodies', async () => {
    expect((await post('x'.repeat(20_000))).status).toBe(413);
    expect((await post('not json')).status).toBe(400);
  });
});
