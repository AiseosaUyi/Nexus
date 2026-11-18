import { checkPreAuthRateLimit, getClientIp } from '@/lib/mcp/rate-limit';

/**
 * Receives Content-Security-Policy violation reports (report-uri, or the
 * Reporting API's application/reports+json) and logs a compact line per
 * violation: `[CSP-REPORT] <directive> blocked=<uri> page=<path>`. Read them
 * with `vercel logs … --query "message:CSP-REPORT"`. Never echoes input back.
 */
const MAX_BYTES = 16 * 1024;

function stripQuery(u: unknown): string {
  if (typeof u !== 'string' || !u) return '';
  try {
    const url = new URL(u);
    return url.origin + url.pathname;
  } catch {
    return u.slice(0, 120);
  }
}

export async function POST(req: Request) {
  if (!checkPreAuthRateLimit(getClientIp(req)).ok) return new Response(null, { status: 429 });

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return new Response(null, { status: 413 });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  // report-uri: { "csp-report": {...} }  |  Reporting API: [{ type, body: {...} }]
  const reports: Record<string, unknown>[] = Array.isArray(parsed)
    ? parsed.map((r) => (r && typeof r === 'object' ? ((r as { body?: unknown }).body as Record<string, unknown>) : null)).filter(Boolean) as Record<string, unknown>[]
    : parsed && typeof parsed === 'object' && 'csp-report' in parsed
      ? [(parsed as Record<string, Record<string, unknown>>)['csp-report']]
      : [];

  for (const r of reports.slice(0, 10)) {
    const directive = String(r['effective-directive'] ?? r['effectiveDirective'] ?? r['violated-directive'] ?? '?').slice(0, 60);
    const blocked = stripQuery(r['blocked-uri'] ?? r['blockedURL']);
    const page = stripQuery(r['document-uri'] ?? r['documentURL']);
    console.warn(`[CSP-REPORT] ${directive} blocked=${blocked || 'inline'} page=${page}`);
  }
  return new Response(null, { status: 204 });
}
