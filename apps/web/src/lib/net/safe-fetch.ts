import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF-safe fetch for user-supplied URLs (used by importFromURL).
 *
 * - http/https only, default ports only, no embedded credentials
 * - every hostname (including each redirect hop) is resolved and rejected if
 *   ANY address is private, loopback, link-local, CGNAT, multicast or
 *   reserved (blocks 169.254.169.254 metadata, localhost, 10/8, etc.)
 * - redirects are followed manually (max 5) so each hop is re-validated
 * - body is streamed with a hard byte cap
 *
 * Residual risk: DNS rebinding between our lookup and fetch's own lookup.
 * Acceptable for an HTML-import feature; pin the IP with a custom dispatcher
 * if this is ever used for anything more sensitive.
 */

export class UnsafeUrlError extends Error {}

const MAX_REDIRECTS = 5;
export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function inV4Cidr(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

/** True if the address must never be fetched server-side. */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return BLOCKED_V4.some(([base, bits]) => inV4Cidr(address, base, bits));
  }
  if (family === 6) {
    const a = address.toLowerCase();
    // IPv4-mapped / -compatible (::ffff:1.2.3.4, ::1.2.3.4)
    const mapped = a.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    if (a === '::' || a === '::1') return true;
    if (/^f[cd]/.test(a)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(a)) return true; // fe80::/10 link-local
    if (a.startsWith('ff')) return true; // multicast
    if (a.startsWith('2001:db8')) return true; // documentation
    if (a.startsWith('64:ff9b:')) return true; // NAT64 → could map to private v4
    return false;
  }
  return true; // not an IP at all → refuse
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError('That doesn’t look like a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https links can be imported.');
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('Links with embedded credentials can’t be imported.');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new UnsafeUrlError('Only standard web ports can be imported.');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new UnsafeUrlError('That address can’t be imported.');
  }

  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true, verbatim: true }).catch(() => {
        throw new UnsafeUrlError('Couldn’t find that website.');
      });

  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new UnsafeUrlError('That address can’t be imported.');
  }
  return url;
}

export async function safeFetchText(
  raw: string,
  init: { headers?: Record<string, string>; timeoutMs?: number; maxBytes?: number } = {},
): Promise<{ response: Response; text: string; finalUrl: URL }> {
  const maxBytes = init.maxBytes ?? DEFAULT_MAX_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 10_000);

  try {
    let url = await assertPublicUrl(raw);
    let response: Response | null = null;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      response = await fetch(url, {
        headers: init.headers,
        redirect: 'manual',
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        if (hop === MAX_REDIRECTS) throw new UnsafeUrlError('Too many redirects.');
        await response.body?.cancel();
        url = await assertPublicUrl(new URL(response.headers.get('location')!, url).toString());
        continue;
      }
      break;
    }
    if (!response) throw new UnsafeUrlError('No response.');

    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > maxBytes) {
      await response.body?.cancel();
      throw new UnsafeUrlError('That page is too large to import.');
    }

    let text = '';
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          await reader.cancel();
          throw new UnsafeUrlError('That page is too large to import.');
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    }

    return { response, text, finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}
