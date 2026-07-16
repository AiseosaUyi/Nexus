import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for trusted server-to-server automation
 * (the Command Center MCP / heartbeat). Bypasses RLS, so it must ONLY be used
 * behind the token check in /api/command. Never import this into client code.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
