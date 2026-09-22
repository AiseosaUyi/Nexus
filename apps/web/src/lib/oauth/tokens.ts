// OAuth access + refresh token minting/verification for the Nexus Brain
// MCP authorization server. Access tokens are HS256 JWTs (issuer "nexus",
// a distinct audience) signed with a dedicated secret — no external party
// ever needs to verify these, so a symmetric secret only Nexus knows is
// correct. Shape copied from Pulse's src/lib/oauth/tokens.ts.
//
// Refresh tokens are DB-backed (workspace_api_tokens' sibling table,
// oauth_refresh_tokens) since they must be revocable; that table only
// carries business_id (not business_slug, per the migration), so the
// caller minting a fresh access token after a refresh must resolve
// business_slug via businessId itself before calling mintAccessToken.

import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OAuthAccessTokenClaims } from './types';

const SECRET = process.env.NEXUS_MCP_OAUTH_JWT_SECRET;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1h — bounds the blast radius of a
// membership change not retroactively invalidating an already-issued token;
// refresh tokens (DB-backed) are what's actually revocable.
const REFRESH_TOKEN_PREFIX = 'nexus_mcp_rt_';

export class McpOAuthNotConfiguredError extends Error {
  constructor() {
    super('NEXUS_MCP_OAUTH_JWT_SECRET is not set — cannot mint or verify OAuth access tokens.');
    this.name = 'McpOAuthNotConfiguredError';
  }
}

export function isMcpOAuthConfigured(): boolean {
  return Boolean(SECRET);
}

export interface MintedAccessToken {
  token: string;
  expiresIn: number;
}

export async function mintAccessToken(claims: {
  userId: string;
  businessId: string;
  businessSlug: string;
  scopes: string[];
  clientId: string;
}): Promise<MintedAccessToken> {
  if (!SECRET) throw new McpOAuthNotConfiguredError();
  const key = new TextEncoder().encode(SECRET);
  const jti = randomUUID();
  const token = await new SignJWT({
    business_id: claims.businessId,
    business_slug: claims.businessSlug,
    scopes: claims.scopes.join(','),
    client_id: claims.clientId,
  } satisfies Omit<OAuthAccessTokenClaims, 'sub' | 'jti'>)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.userId)
    .setJti(jti)
    .setIssuedAt()
    .setIssuer('nexus')
    .setAudience('nexus-mcp-oauth')
    .setExpirationTime(Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS)
    .sign(key);
  return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export type VerifyAccessTokenResult =
  | { ok: true; claims: OAuthAccessTokenClaims }
  | { ok: false; reason: 'not_configured' | 'expired' | 'invalid' };

export async function verifyAccessToken(token: string): Promise<VerifyAccessTokenResult> {
  if (!SECRET) return { ok: false, reason: 'not_configured' };
  const key = new TextEncoder().encode(SECRET);
  try {
    const { payload } = await jwtVerify(token, key, { issuer: 'nexus', audience: 'nexus-mcp-oauth' });
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.business_id !== 'string' ||
      typeof payload.business_slug !== 'string' ||
      typeof payload.scopes !== 'string' ||
      typeof payload.client_id !== 'string' ||
      typeof payload.jti !== 'string'
    ) {
      return { ok: false, reason: 'invalid' };
    }
    return {
      ok: true,
      claims: {
        sub: payload.sub,
        business_id: payload.business_id,
        business_slug: payload.business_slug,
        scopes: payload.scopes,
        client_id: payload.client_id,
        jti: payload.jti,
      },
    };
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}

function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateRefreshToken(): string {
  return `${REFRESH_TOKEN_PREFIX}${randomBytes(32).toString('hex')}`;
}

export interface RefreshTokenClaims {
  clientId: string;
  userId: string;
  businessId: string;
  scopes: string[];
}

/** Mints and stores a new refresh token (hashed — the raw value only ever
 * leaves this function once, to the caller). */
export async function mintRefreshToken(
  db: SupabaseClient,
  claims: RefreshTokenClaims,
  rotatedFrom?: string,
): Promise<string> {
  const raw = generateRefreshToken();
  const { error } = await db.from('oauth_refresh_tokens').insert({
    token_hash: hashRefreshToken(raw),
    client_id: claims.clientId,
    user_id: claims.userId,
    business_id: claims.businessId,
    scopes: claims.scopes.join(','),
    rotated_from: rotatedFrom ?? null,
  });
  if (error) throw new Error(`mintRefreshToken: ${error.message}`);
  return raw;
}

export type RotateRefreshTokenResult =
  | { ok: true; refreshToken: string; claims: RefreshTokenClaims }
  | { ok: false; error: string };

/** Validates a refresh token, revokes it, and mints a replacement in one
 * step (OAuth 2.1-recommended rotation for public clients). The
 * conditional UPDATE (`revoked_at is null`) is the concurrency guard — a
 * replayed/racing refresh token can only win the rotation once. */
export async function rotateRefreshToken(db: SupabaseClient, rawToken: string): Promise<RotateRefreshTokenResult> {
  const tokenHash = hashRefreshToken(rawToken);
  const { data: row } = await db
    .from('oauth_refresh_tokens')
    .select('id, client_id, user_id, business_id, scopes, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (!row) return { ok: false, error: 'Invalid refresh token' };
  if (row.revoked_at) return { ok: false, error: 'Refresh token already used or revoked' };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'Refresh token expired' };
  }

  const { data: updated, error } = await db
    .from('oauth_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('revoked_at', null)
    .select('id');
  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: 'Refresh token already used or revoked' };
  }

  const claims: RefreshTokenClaims = {
    clientId: row.client_id,
    userId: row.user_id,
    businessId: row.business_id,
    scopes: row.scopes.split(','),
  };
  const newToken = await mintRefreshToken(db, claims, row.id);
  return { ok: true, refreshToken: newToken, claims };
}
