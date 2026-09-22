/** Builds an absolute URL from NEXT_PUBLIC_APP_URL — the base for the OAuth
 * issuer, resourceUrl, and every metadata/redirect endpoint. Shared so the
 * MCP route, the OAuth endpoints, and the consent page all agree on one
 * value rather than each hand-rolling the same fallback. */
export function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${path}`;
}
