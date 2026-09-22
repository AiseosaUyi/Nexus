# Security Profile — Nexus

## Stack & trust boundaries

- Next.js 16 App Router (`apps/web`), Supabase (Postgres + Auth + Storage +
  Realtime), deployed on Vercel.
- Multi-tenant: `Business` (workspace) → `Teamspace` → `Node` tree.
  Membership via `business_members(business_id, user_id, role)`, roles
  `ADMIN`/`EDITOR`/`VIEWER`.
- **Primary tenancy control is Postgres RLS**, not app-layer checks. Two
  Supabase clients exist: `createClient()` (anon key + user session,
  RLS-bound) and `createServiceClient()` (service role, bypasses RLS,
  used only in server actions after an explicit admin check). Because
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by definition, **RLS is the
  only real tenant boundary** for any table a client ever queries directly
  — a broken policy is exploitable via raw PostgREST regardless of what
  the Next.js app's own code paths do.
- Remote MCP server (`apps/web/src/app/api/[transport]/route.ts`) is a
  second, parallel trust boundary: bearer-token-authenticated (static
  `nexus_key_` tokens or OAuth 2.1 JWTs), tenant identity resolved once
  from the token, tools never take a workspace argument.

## Crown jewels

- `business_integrations.secret_enc` — AES-256-GCM-encrypted Gruve API
  key, decryptable with the single shared `NEXUS_INTEGRATION_KEY` server
  secret. A ciphertext leak today is a live secret leak the moment that
  key is ever compromised.
- `workspace_api_tokens.token_hash` / OAuth refresh tokens — the MCP
  server's entire tenant-authentication surface.
- `business_members` — the root permission table; a leak or forged write
  here is a full multi-tenant compromise vector (self-service privilege
  escalation into any workspace).
- Document content (`nodes.yjs_snapshot`, `blocks`), calendar/content-plan
  data, uploaded asset metadata/storage paths — ordinary tenant content,
  still cross-tenant-sensitive.

## Known bug pattern (recurring — check for this first in any RLS review)

A policy that correlates to `business_members` via
`where bm.business_id = business_id and bm.user_id = auth.uid()` — with an
**unqualified** `business_id` — silently binds to `business_members`'s own
column instead of the policy's own table, because `business_members` has a
column of that name and it's the innermost match in the subquery's FROM
scope. No ambiguity error, just a wrong bind.

- On a table *other than* `business_members`: collapses to a tautology
  (always true) → **cross-tenant leak/tamper**.
- On `business_members` itself (self-referential): hits Postgres's RLS
  recursion guard → **silently resolves to false** (fail-closed, a
  functional bug, not a leak).

Found and fixed three times across this project's history:
`11_fix_nodes_rls.sql` (nodes), `23_fix_business_members_rls.sql`
(business_members — needed a `SECURITY DEFINER` helper, not just a
qualified column, because of the recursion case above), and
`32_fix_businesses_select_rls.sql` +
`33_fix_business_scoped_rls_policies.sql` (businesses, plus assets /
calendar_entries / opportunities / platform_health / command_action_log).

**When reviewing any new or existing RLS policy in this codebase, check
this pattern first.** Full writeup of the most recent occurrence:
`.claude/security/REVIEW-2026-09-22.md`.

## Prior reviews

- 2026-09-22 — systemic `business_members` correlation bug across 8
  tables, found while verifying the Nexus Brain MCP feature. See
  `REVIEW-2026-09-22.md`.
