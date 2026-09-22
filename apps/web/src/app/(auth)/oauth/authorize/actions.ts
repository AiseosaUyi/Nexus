'use server';

// Approve/deny actions for the OAuth consent page. Both re-validate
// everything server-side against the current session — the form fields
// are a UI convenience, never trusted blindly (a tampered business_id or
// client_id must still fail the same checks the page itself already ran).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getClient, validateRedirectUri } from '@/lib/oauth/clients';
import { mintAuthorizationCode } from '@/lib/oauth/codes';
import { DEFAULT_MCP_SCOPES } from '@/lib/mcp/scopes';

function buildRedirect(redirectUri: string, params: Record<string, string | undefined>): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function approveAuthorization(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const clientId = String(formData.get('client_id') ?? '');
  const redirectUri = String(formData.get('redirect_uri') ?? '');
  const state = formData.get('state') ? String(formData.get('state')) : undefined;
  const codeChallenge = String(formData.get('code_challenge') ?? '');
  const codeChallengeMethod = String(formData.get('code_challenge_method') ?? 'S256');
  const scopeParam = formData.get('scope') ? String(formData.get('scope')) : '';
  const businessId = String(formData.get('business_id') ?? '');

  const db = createServiceClient();
  const client = await getClient(db, clientId);
  // Client or redirect_uri invalid — cannot safely redirect anywhere
  // (redirecting to an unvalidated redirect_uri is the exact open-redirect
  // mistake the redirect_uri exact-match rule exists to prevent). Render
  // an in-app error instead of bouncing.
  if (!client || !validateRedirectUri(client, redirectUri)) {
    redirect('/oauth/authorize/invalid');
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('role')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('role', 'ADMIN')
    .maybeSingle();
  if (!membership) {
    redirect(buildRedirect(redirectUri, { error: 'access_denied', error_description: 'no_eligible_business', state }));
  }

  const scopes = scopeParam.trim() ? scopeParam.trim().split(/\s+/) : [...DEFAULT_MCP_SCOPES];
  const code = await mintAuthorizationCode(db, {
    clientId,
    userId: user.id,
    businessId,
    scopes,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
  });

  redirect(buildRedirect(redirectUri, { code, state }));
}

export async function denyAuthorization(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const redirectUri = String(formData.get('redirect_uri') ?? '');
  const state = formData.get('state') ? String(formData.get('state')) : undefined;

  const db = createServiceClient();
  const clientId = String(formData.get('client_id') ?? '');
  const client = await getClient(db, clientId);
  if (!client || !validateRedirectUri(client, redirectUri)) {
    redirect('/oauth/authorize/invalid');
  }

  redirect(buildRedirect(redirectUri, { error: 'access_denied', state }));
}
