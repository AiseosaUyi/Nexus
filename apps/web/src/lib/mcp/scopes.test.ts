import { describe, it, expect } from 'vitest';
import { hasScope, resolveRequestedScopes, DEFAULT_MCP_SCOPES, MCP_SCOPES } from './scopes';

describe('hasScope', () => {
  it('returns true when the required scope is present', () => {
    expect(hasScope(['memory:read', 'docs:read'], 'memory:read')).toBe(true);
  });

  it('returns false when the required scope is absent', () => {
    expect(hasScope(['memory:read'], 'memory:write')).toBe(false);
  });

  it('returns true for any scope when the token has admin', () => {
    for (const scope of MCP_SCOPES) {
      expect(hasScope(['admin'], scope)).toBe(true);
    }
  });

  it('returns true when no scope is required (null)', () => {
    expect(hasScope([], null)).toBe(true);
  });
});

describe('resolveRequestedScopes', () => {
  it('keeps only catalog-valid scopes from the request', () => {
    expect(resolveRequestedScopes(['memory:read', 'bogus:scope', 'docs:write'])).toEqual([
      'memory:read',
      'docs:write',
    ]);
  });

  it('falls back to the defaults when the request is empty', () => {
    expect(resolveRequestedScopes([])).toEqual(DEFAULT_MCP_SCOPES);
  });

  it('falls back to the defaults when every requested scope is invalid', () => {
    expect(resolveRequestedScopes(['not:real', 'also:fake'])).toEqual(DEFAULT_MCP_SCOPES);
  });
});
