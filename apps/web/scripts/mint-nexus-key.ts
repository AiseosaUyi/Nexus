#!/usr/bin/env -S node --env-file=.env.local
// One-off script to mint a static nexus_key_ token for curl-testing the
// Nexus Brain MCP server before OAuth exists (step 2) or for any
// non-interactive agent that can set an Authorization header directly.
//
// Run from apps/web:
//   node --env-file=.env.local scripts/mint-nexus-key.ts <business-slug> [token-name]
//
// Deliberately self-contained (duplicates the small amount of logic from
// lib/api-tokens.ts + lib/mcp/scopes.ts) rather than importing those
// modules — they use the "@/..." path alias Next.js resolves at build
// time, which a bare `node` invocation of this script doesn't understand.

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';

const DEFAULT_SCOPES = ['memory:read', 'docs:read', 'calendar:read', 'command:read', 'gruve:read', 'memory:write'];

async function main() {
  const [, , businessSlug, tokenName] = process.argv;
  if (!businessSlug) {
    console.error('Usage: node --env-file=.env.local scripts/mint-nexus-key.ts <business-slug> [token-name]');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('slug', businessSlug)
    .single();
  if (businessError || !business) {
    console.error(`No business found with slug "${businessSlug}": ${businessError?.message ?? 'not found'}`);
    process.exit(1);
  }

  const raw = `nexus_key_${randomBytes(32).toString('hex')}`;
  const tokenHash = createHash('sha256').update(raw).digest('hex');
  const tokenPrefix = raw.slice(0, 'nexus_key_'.length + 8);
  const name = tokenName ?? 'CLI-minted key';

  const { error: insertError } = await supabase.from('workspace_api_tokens').insert({
    business_id: business.id,
    name,
    token_prefix: tokenPrefix,
    token_hash: tokenHash,
    scopes: DEFAULT_SCOPES.join(','),
  });
  if (insertError) {
    console.error(`Failed to mint token: ${insertError.message}`);
    process.exit(1);
  }

  console.log(`Minted "${name}" for business "${businessSlug}":\n`);
  console.log(raw);
  console.log('\nShown once — it is not retrievable again. Store it somewhere safe.');
}

main();
