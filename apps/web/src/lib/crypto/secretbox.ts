// AES-256-GCM encrypt/decrypt for integration secrets at rest (the Gruve
// partner API key). Same idea as Pulse's PLATFORM_TOKEN_KEY. Output format
// v1.<iv b64>.<ciphertext b64>.<tag b64> — versioned so a future key
// rotation or algorithm change has somewhere to branch from.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce, the standard/recommended size for GCM

export class SecretboxNotConfiguredError extends Error {
  constructor() {
    super('NEXUS_INTEGRATION_KEY is not set — cannot encrypt or decrypt integration secrets.');
    this.name = 'SecretboxNotConfiguredError';
  }
}

function getKey(): Buffer {
  const raw = process.env.NEXUS_INTEGRATION_KEY;
  if (!raw) throw new SecretboxNotConfiguredError();
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(`NEXUS_INTEGRATION_KEY must decode to exactly 32 bytes, got ${key.length}`);
  }
  return key;
}

export function isSecretboxConfigured(): boolean {
  return Boolean(process.env.NEXUS_INTEGRATION_KEY);
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${ciphertext.toString('base64')}.${tag.toString('base64')}`;
}

export function decryptSecret(encoded: string): string {
  const key = getKey();
  const parts = encoded.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Malformed secretbox payload (expected v1.<iv>.<ciphertext>.<tag>)');
  }
  const [, ivB64, ciphertextB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
