/**
 * Returns the href only if it is a safe navigation target: http(s), mailto,
 * a same-origin path, or an in-page anchor. Anything else (javascript:,
 * data:, vbscript:, …) becomes '#'. Used when rendering link-bearing editor
 * nodes whose attributes can arrive via import, collaboration or MCP.
 */
export function safeHref(href: unknown): string {
  if (typeof href !== 'string') return '#';
  // Strip control chars/whitespace browsers ignore when parsing the scheme.
  const trimmed = href.replace(/[\u0000-\u001F\u007F\s]+/g, '');
  if (!trimmed) return '#';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return href.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('?')) return href.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return href.trim();
  return '#';
}
