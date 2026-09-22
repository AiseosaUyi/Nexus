// OAuth consent screen. Session-gated by middleware.ts (isProtectedRoute
// includes /oauth/authorize, and unauthenticated visitors are bounced to
// /login?next=... which preserves this full URL). Validates the client and
// redirect_uri BEFORE rendering anything interactive — an unknown client or
// unregistered redirect_uri never gets a redirect target handed to it (the
// classic OAuth open-redirect mistake the exact-match rule exists to
// prevent).
//
// Lives under the (auth) route group — not a bare app/oauth/authorize
// folder — purely for the shared (auth)/layout.tsx shell (logo, centered
// column, background); route groups don't affect the URL, so this is
// still served at /oauth/authorize.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getClient, validateRedirectUri } from '@/lib/oauth/clients';
import { resolveRequestedScopes, describeScopes } from '@/lib/mcp/scopes';
import { AuthorizeConsent } from './AuthorizeConsent';

export const dynamic = 'force-dynamic';

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const {
    response_type: responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
  } = params;

  if (!clientId || !redirectUri) {
    redirect('/oauth/authorize/invalid');
  }

  const db = createServiceClient();
  const client = await getClient(db, clientId);
  if (!client || !validateRedirectUri(client, redirectUri)) {
    redirect('/oauth/authorize/invalid');
  }

  // From here on redirectUri is validated — safe to send the user back to
  // it with an OAuth error instead of only ever showing an in-app page.
  if (responseType !== 'code') {
    const url = new URL(redirectUri);
    url.searchParams.set('error', 'unsupported_response_type');
    if (state) url.searchParams.set('state', state);
    redirect(url.toString());
  }
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    const url = new URL(redirectUri);
    url.searchParams.set('error', 'invalid_request');
    url.searchParams.set('error_description', 'code_challenge (S256) is required');
    if (state) url.searchParams.set('state', state);
    redirect(url.toString());
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Belt-and-suspenders: middleware already gates this route, but a tool
  // handler shouldn't trust a layer it doesn't own for its own correctness.
  if (!user) redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${new URLSearchParams(params as Record<string, string>).toString()}`)}`);

  const { data: memberships } = await supabase
    .from('business_members')
    .select('role, businesses(id, slug, name)')
    .eq('user_id', user.id)
    .eq('role', 'ADMIN');

  const eligibleBusinesses = (memberships ?? [])
    .map((m) => m.businesses as unknown as { id: string; slug: string; name: string } | null)
    .filter((b): b is { id: string; slug: string; name: string } => Boolean(b));

  const scopes = resolveRequestedScopes((scope ?? '').trim() ? scope!.trim().split(/\s+/) : []);

  return (
    <AuthorizeConsent
      clientName={client.clientName ?? client.id}
      userEmail={user.email ?? ''}
      eligibleBusinesses={eligibleBusinesses}
      scopeDescriptions={describeScopes(scopes)}
      clientId={clientId}
      redirectUri={redirectUri}
      scope={scopes.join(' ')}
      state={state}
      codeChallenge={codeChallenge}
      codeChallengeMethod={codeChallengeMethod}
    />
  );
}
