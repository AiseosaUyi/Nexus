import { describe, it, expect } from 'vitest';


import { isBlockedAddress, assertPublicUrl, UnsafeUrlError } from './safe-fetch';

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
    '::1', '::', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:169.254.169.254',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['1.1.1.1', '8.8.8.8', '172.32.0.1', '104.16.0.1', '2606:4700:4700::1111'])(
    'allows public %s',
    (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    },
  );
});

describe('assertPublicUrl', () => {
  it.each([
    'file:///etc/passwd',
    'ftp://example.com/x',
    'http://localhost/',
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://user:pass@example.com/',
    'http://example.com:8080/',
    'http://foo.internal/',
    'not a url',
  ])('rejects %s', async (url) => {
    await expect(assertPublicUrl(url)).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('accepts a public IP literal', async () => {
    const url = await assertPublicUrl('https://1.1.1.1/page');
    expect(url.hostname).toBe('1.1.1.1');
  });
});
