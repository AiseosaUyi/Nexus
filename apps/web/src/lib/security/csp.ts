/**
 * Content-Security-Policy for the app. Shipped as Content-Security-Policy-
 * Report-Only first: browsers report violations to /api/csp-report (visible in
 * Vercel logs as [CSP-REPORT]) without blocking anything. Once the logs are
 * clean on real traffic, switch the header name to Content-Security-Policy.
 *
 * 'unsafe-inline' scripts are required by Next.js App Router hydration unless
 * every page is rendered with a per-request nonce (which disables static
 * rendering). The big wins here are elsewhere: no third-party script hosts,
 * connect-src limited to Supabase (+ PostHog), no plugins, no <base> hijack,
 * no framing.
 */
export function buildCsp(env: {
  supabaseUrl?: string;
  posthogHost?: string;
  isDev?: boolean;
}): string {
  const supabase = env.supabaseUrl ? new URL(env.supabaseUrl) : null;
  const supabaseHttp = supabase ? supabase.origin : '';
  const supabaseWs = supabase ? `wss://${supabase.host}` : '';
  const posthog = env.posthogHost ? new URL(env.posthogHost).origin : '';

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(env.isDev ? ["'unsafe-eval'"] : []), 'https://vercel.live'],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Covers, imported and pasted images can come from any https host.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'media-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      supabaseHttp,
      supabaseWs,
      posthog,
      ...(posthog ? ['https://*.posthog.com'] : []),
      'https://vercel.live',
      'wss://ws-us3.pusher.com', // Vercel preview toolbar
    ].filter(Boolean),
    'frame-src': ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://vercel.live'],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    // The OAuth consent form redirects to the MCP client's redirect_uri
    // (any https host, or a localhost port for CLI clients) — form-action
    // also governs post-submit redirects in Chromium.
    'form-action': ["'self'", 'https:', 'http://localhost:*', 'http://127.0.0.1:*'],
    'frame-ancestors': ["'none'"],
    'report-uri': ['/api/csp-report'],
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}
