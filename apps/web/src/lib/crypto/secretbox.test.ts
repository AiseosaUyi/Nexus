// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { encryptSecret, decryptSecret, isSecretboxConfigured, SecretboxNotConfiguredError } from './secretbox';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXUS_INTEGRATION_KEY = randomBytes(32).toString('base64');
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('secretbox', () => {
  it('round-trips a plaintext secret', () => {
    const encrypted = encryptSecret('gruve_live_abc123_secretpart');
    expect(decryptSecret(encrypted)).toBe('gruve_live_abc123_secretpart');
  });

  it('produces the v1.<iv>.<ciphertext>.<tag> format', () => {
    const encrypted = encryptSecret('hello');
    const parts = encrypted.split('.');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('v1');
  });

  it('produces different ciphertext for the same plaintext each time (random IV)', () => {
    expect(encryptSecret('same input')).not.toBe(encryptSecret('same input'));
  });

  it('rejects a tampered ciphertext (auth tag mismatch)', () => {
    const encrypted = encryptSecret('sensitive value');
    const [v, iv, ciphertext, tag] = encrypted.split('.');
    const tamperedByte = Buffer.from(ciphertext, 'base64');
    tamperedByte[0] = tamperedByte[0] ^ 0xff;
    const tampered = `${v}.${iv}.${tamperedByte.toString('base64')}.${tag}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('rejects decryption with the wrong key', () => {
    const encrypted = encryptSecret('sensitive value');
    process.env.NEXUS_INTEGRATION_KEY = randomBytes(32).toString('base64');
    expect(() => decryptSecret(encrypted)).toThrow();
  });

  it('rejects a malformed payload', () => {
    expect(() => decryptSecret('not-even-close')).toThrow(/Malformed/);
    expect(() => decryptSecret('v2.a.b.c')).toThrow(/Malformed/);
  });

  it('throws SecretboxNotConfiguredError when the key is unset', () => {
    delete process.env.NEXUS_INTEGRATION_KEY;
    expect(() => encryptSecret('x')).toThrow(SecretboxNotConfiguredError);
    expect(isSecretboxConfigured()).toBe(false);
  });

  it('rejects a key that does not decode to exactly 32 bytes', () => {
    process.env.NEXUS_INTEGRATION_KEY = Buffer.from('too short').toString('base64');
    expect(() => encryptSecret('x')).toThrow(/32 bytes/);
  });
});
