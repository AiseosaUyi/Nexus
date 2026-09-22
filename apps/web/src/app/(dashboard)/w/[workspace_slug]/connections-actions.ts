'use server';

// Server actions for the Connections settings page: static API tokens,
// connected OAuth apps, and the Gruve/Pulse integration config.
//
// workspace_api_tokens and business_integrations have RLS policies that
// already gate writes on business_members.role = 'ADMIN' (29_mcp_auth.sql,
// 31_integrations.sql), so those actions use the normal auth-context
// client and let RLS do the enforcement — same convention as
// team-actions.ts. oauth_clients/oauth_authorization_codes/oauth_refresh_tokens
// deliberately have NO RLS policies at all (service-role only, per the
// spec) — RLS gives zero protection there, so those actions use the
// service client AND manually verify ADMIN membership first.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { mintApiToken } from '@/lib/api-tokens';
import { resolveRequestedScopes } from '@/lib/mcp/scopes';
import { encryptSecret, isSecretboxConfigured } from '@/lib/crypto/secretbox';
import { GruveClient, GruveApiError } from '@/lib/integrations/gruve';

async function requireAdmin(businessId: string): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { data: membership } = await supabase
    .from('business_members')
    .select('role')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .eq('role', 'ADMIN')
    .maybeSingle();
  if (!membership) return { error: 'Only a workspace admin can manage connections' };
  return { userId: user.id };
}

// ─── API tokens ─────────────────────────────────────────────────────────────

export async function listApiTokens(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspace_api_tokens')
    .select('id, name, token_prefix, scopes, last_used_at, revoked_at, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) return { error: error.message, data: [] };
  return { data: data ?? [] };
}

export async function mintApiTokenAction(businessId: string, name: string, scopes: string[]) {
  const admin = await requireAdmin(businessId);
  if ('error' in admin) return { error: admin.error };
  if (!name.trim()) return { error: 'Name is required' };

  try {
    const { token } = await mintApiToken(businessId, name.trim(), resolveRequestedScopes(scopes), admin.userId);
    revalidatePath('/w/[workspace_slug]/settings/connections', 'page');
    return { token };
  } catch (e: any) {
    return { error: e.message ?? String(e) };
  }
}

export async function revokeApiTokenAction(businessId: string, tokenId: string) {
  const admin = await requireAdmin(businessId);
  if ('error' in admin) return { error: admin.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .eq('business_id', businessId);
  if (error) return { error: error.message };
  revalidatePath('/w/[workspace_slug]/settings/connections', 'page');
  return { success: true };
}

// ─── Connected OAuth apps ───────────────────────────────────────────────────
// oauth_refresh_tokens has no RLS policies (service-role only) — this
// action does its own admin check before touching the service client.

export async function listConnectedApps(businessId: string) {
  const admin = await requireAdmin(businessId);
  if ('error' in admin) return { error: admin.error, data: [] };

  const db = createServiceClient();
  const { data, error } = await db
    .from('oauth_refresh_tokens')
    .select('client_id, user_id, scopes, created_at, revoked_at')
    .eq('business_id', businessId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  if (error) return { error: error.message, data: [] };

  const clientIds = Array.from(new Set((data ?? []).map((r) => r.client_id)));
  const { data: clients } = clientIds.length
    ? await db.from('oauth_clients').select('id, client_name').in('id', clientIds)
    : { data: [] as { id: string; client_name: string | null }[] };
  const clientNames = new Map((clients ?? []).map((c) => [c.id, c.client_name ?? c.id]));

  // One row per client_id (a client may hold several rotated-but-still-open
  // refresh tokens; the settings page shows one connection per app).
  const byClient = new Map<string, { clientId: string; clientName: string; scopes: string[]; createdAt: string }>();
  for (const row of data ?? []) {
    if (!byClient.has(row.client_id)) {
      byClient.set(row.client_id, {
        clientId: row.client_id,
        clientName: clientNames.get(row.client_id) ?? row.client_id,
        scopes: row.scopes.split(','),
        createdAt: row.created_at,
      });
    }
  }
  return { data: Array.from(byClient.values()) };
}

export async function revokeConnectedApp(businessId: string, clientId: string) {
  const admin = await requireAdmin(businessId);
  if ('error' in admin) return { error: admin.error };

  const db = createServiceClient();
  const { error } = await db
    .from('oauth_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .eq('client_id', clientId)
    .is('revoked_at', null);
  if (error) return { error: error.message };
  revalidatePath('/w/[workspace_slug]/settings/connections', 'page');
  return { success: true };
}

// ─── Gruve integration ──────────────────────────────────────────────────────

export async function getGruveIntegration(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('business_integrations')
    .select('config, secret_enc')
    .eq('business_id', businessId)
    .eq('provider', 'gruve')
    .maybeSingle();
  if (!data) return { connected: false as const };
  // Last-4-chars display only — secret_enc itself never leaves this
  // function, and the plaintext key is never sent to the client at all
  // (not even briefly) once it's been saved.
  return { connected: true as const, baseUrl: (data.config as { baseUrl?: string })?.baseUrl ?? null };
}

export async function saveGruveIntegration(businessId: string, baseUrl: string, rawKey: string) {
  const admin = await requireAdmin(businessId);
  if ('error' in admin) return { error: admin.error };
  if (!isSecretboxConfigured()) return { error: 'NEXUS_INTEGRATION_KEY is not configured on the server' };
  if (!rawKey.trim()) return { error: 'API key is required' };

  // Validate before storing — a bad key should never get saved.
  try {
    const testClient = new GruveClient(baseUrl, rawKey.trim());
    await testClient.listEvents(undefined, 1);
  } catch (e) {
    if (e instanceof GruveApiError) return { error: `Could not verify this key: ${e.message}` };
    return { error: `Could not reach Gruve: ${e instanceof Error ? e.message : String(e)}` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('business_integrations').upsert(
    {
      business_id: businessId,
      provider: 'gruve',
      config: { baseUrl },
      secret_enc: encryptSecret(rawKey.trim()),
      created_by: admin.userId,
    },
    { onConflict: 'business_id,provider' },
  );
  if (error) return { error: error.message };
  revalidatePath('/w/[workspace_slug]/settings/connections', 'page');
  return { success: true };
}

export async function disconnectGruve(businessId: string) {
  const admin = await requireAdmin(businessId);
  if ('error' in admin) return { error: admin.error };
  const supabase = await createClient();
  const { error } = await supabase.from('business_integrations').delete().eq('business_id', businessId).eq('provider', 'gruve');
  if (error) return { error: error.message };
  revalidatePath('/w/[workspace_slug]/settings/connections', 'page');
  return { success: true };
}

// ─── Pulse integration ──────────────────────────────────────────────────────

export async function getPulseIntegration(businessId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('business_integrations')
    .select('config')
    .eq('business_id', businessId)
    .eq('provider', 'pulse')
    .maybeSingle();
  if (!data) return { connected: false as const };
  const config = data.config as { tenantSlug?: string; baseUrl?: string };
  return { connected: true as const, tenantSlug: config.tenantSlug ?? '', baseUrl: config.baseUrl ?? '' };
}

export async function savePulseIntegration(businessId: string, tenantSlug: string, baseUrl: string) {
  const admin = await requireAdmin(businessId);
  if ('error' in admin) return { error: admin.error };
  if (!tenantSlug.trim()) return { error: 'Tenant slug is required' };

  const supabase = await createClient();
  const { error } = await supabase.from('business_integrations').upsert(
    {
      business_id: businessId,
      provider: 'pulse',
      config: { tenantSlug: tenantSlug.trim(), baseUrl: baseUrl.trim() || undefined },
      created_by: admin.userId,
    },
    { onConflict: 'business_id,provider' },
  );
  if (error) return { error: error.message };
  revalidatePath('/w/[workspace_slug]/settings/connections', 'page');
  return { success: true };
}
