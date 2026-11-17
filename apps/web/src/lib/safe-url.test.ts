import { describe, it, expect } from 'vitest';
import { safeHref } from './safe-url';

describe('safeHref', () => {
  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.com/x',
    '',
    null,
    undefined,
    42,
  ])('neutralises %s', (href) => {
    expect(safeHref(href)).toBe('#');
  });

  it.each([
    'https://example.com/a?b=c',
    'http://example.com',
    'mailto:a@b.co',
    '/w/acme/n/123',
    '#section',
  ])('keeps %s', (href) => {
    expect(safeHref(href)).toBe(href);
  });
});
