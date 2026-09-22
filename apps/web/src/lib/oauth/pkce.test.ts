import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { verifyCodeChallenge } from './pkce';

function challengeFor(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

describe('verifyCodeChallenge', () => {
  it('accepts a correct S256 verifier/challenge pair', () => {
    const verifier = 'a'.repeat(64);
    expect(verifyCodeChallenge(verifier, challengeFor(verifier), 'S256')).toBe(true);
  });

  it('rejects a mismatched verifier', () => {
    const verifier = 'a'.repeat(64);
    const wrongVerifier = 'b'.repeat(64);
    expect(verifyCodeChallenge(wrongVerifier, challengeFor(verifier), 'S256')).toBe(false);
  });

  it('rejects the "plain" method — S256 is mandatory', () => {
    const verifier = 'a'.repeat(64);
    expect(verifyCodeChallenge(verifier, verifier, 'plain')).toBe(false);
  });

  it('rejects an unknown method', () => {
    const verifier = 'a'.repeat(64);
    expect(verifyCodeChallenge(verifier, challengeFor(verifier), 'md5')).toBe(false);
  });
});
