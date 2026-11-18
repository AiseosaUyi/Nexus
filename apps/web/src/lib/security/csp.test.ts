import { describe, it, expect } from 'vitest';
import { buildCsp } from './csp';

const parse = (csp: string) =>
  Object.fromEntries(csp.split('; ').map((d) => { const [k, ...v] = d.split(' '); return [k, v]; }));

describe('buildCsp', () => {
  const prod = parse(buildCsp({ supabaseUrl: 'https://abc.supabase.co', isDev: false }));

  it('allows the Supabase REST and Realtime origins only', () => {
    expect(prod['connect-src']).toEqual(expect.arrayContaining(["'self'", 'https://abc.supabase.co', 'wss://abc.supabase.co']));
    expect(prod['connect-src']).not.toContain('https:');
  });

  it('never allows eval in production, and does in dev', () => {
    expect(prod['script-src']).not.toContain("'unsafe-eval'");
    expect(parse(buildCsp({ isDev: true }))['script-src']).toContain("'unsafe-eval'");
  });

  it('locks down plugins, base and framing', () => {
    expect(prod['object-src']).toEqual(["'none'"]);
    expect(prod['base-uri']).toEqual(["'self'"]);
    expect(prod['frame-ancestors']).toEqual(["'none'"]);
  });

  it('adds PostHog only when configured', () => {
    expect(prod['connect-src'].join(' ')).not.toContain('posthog');
    const withPh = parse(buildCsp({ supabaseUrl: 'https://abc.supabase.co', posthogHost: 'https://eu.i.posthog.com/' }));
    expect(withPh['connect-src']).toEqual(expect.arrayContaining(['https://eu.i.posthog.com', 'https://*.posthog.com']));
  });

  it('reports violations to /api/csp-report', () => {
    expect(prod['report-uri']).toEqual(['/api/csp-report']);
  });
});
