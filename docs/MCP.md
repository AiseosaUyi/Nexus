# Nexus Brain MCP

A remote MCP server exposing Nexus as the memory layer behind the Gruve Command Center (or any
other AI operator scoped to one Nexus workspace) — durable memory, document read/append, calendar,
and a read-only Gruve bridge, all reachable by URL plus OAuth, no config file. Modelled on Pulse's
remote MCP (`../Sippy/Pulse`), same shape, adapted to Nexus's businesses/users tables.

## Endpoint

```
https://<your-nexus-domain>/api/mcp
```

**Transport:** Streamable HTTP only. SSE needs Redis for cross-instance session state, which this
stack doesn't provision — deferred (see `TODOS.md`).

## Connecting from Cowork / Claude desktop / Claude Code

**URL only (recommended)** — leave Client ID/Secret blank:
- **URL**: `https://<your-nexus-domain>/api/mcp`

The client auto-discovers everything else via `/.well-known/oauth-protected-resource` and
`/.well-known/oauth-authorization-server`, registers itself via DCR, and drives you through a
normal Nexus login + workspace-consent screen.

**Static bearer token** — paste a token directly, no OAuth round-trip:
- **URL**: `https://<your-nexus-domain>/api/mcp`
- **Auth**: `Authorization: Bearer nexus_key_...`, minted from `/w/<slug>/settings/connections`
  (or `scripts/mint-nexus-key.ts` for a one-off).

## Authentication

Three bearer shapes, dual-checked by prefix in `verifyToken()` (`api/[transport]/route.ts`):

1. **`nexus_key_...`** — a static token minted from Connections settings, resolved via
   `resolveApiToken()` (`lib/api-tokens.ts`). `last_used_at` is debounced to once per 5 minutes.
2. **An OAuth access token** — a self-contained HS256 JWT (1h TTL), verified via
   `verifyAccessToken()` (`lib/oauth/tokens.ts`).
3. **The legacy `COMMAND_CENTER_TOKEN`** — only when `MCP_LEGACY_COMMAND_TOKEN=1`, via either an
   `Authorization` header or the old `?key=` query param. Logs a deprecation warning on every use.
   Delete the env var (and this branch stops working) once the Cowork connector has been re-added
   via OAuth.

**Tools never accept a workspace, business, tenant, or slug argument.** The token/session is the
only source of tenant identity — `requireToolScope()` (`lib/mcp/context.ts`) is the only way a
tool resolves its business.

Missing/invalid/revoked token → MCP tool error, not a workspace-not-found message. Valid token,
missing scope → tool error naming the missing scope. Over the rate limit (60/min per token, 300/min
per IP pre-auth) → tool error, not a crash.

## Scopes

Comma-separated on the token; `admin` implies every scope.

| Scope | Grants |
|---|---|
| `memory:read` / `memory:write` | Recall, remember, update, forget memories; open loops; timeline |
| `docs:read` / `docs:write` | List tree, search, read, create, append documents |
| `calendar:read` / `calendar:write` | Calendar entries, add entry, set status |
| `command:read` / `command:write` | The 7 `nexus_cc_*` Command Center tools |
| `gruve:read` | Read-only Gruve bridge |
| `admin` | Everything above |

A newly minted static token defaults to all `*:read` plus `memory:write` — memory is the whole
point of the brain layer.

## Self-discovery

```
nexus_manifest
```

Returns `{ tools: [{name, scope, mutates, description}, ...] }`, generated from a registry
(`lib/mcp/manifest.ts`) every tool file pushes into at registration — see Deviations below for why
this is keyed by name, not append-only.

## Tool list

Every tool is prefixed `nexus_`. `mutates: false` tools are read-only; `mutates: true` tools write
data. None call an LLM.

**Meta**

| Tool | Scope | Description |
|---|---|---|
| `nexus_whoami` | any | Business, scopes, integration links, Command Center status, token kind |
| `nexus_manifest` | any | Every registered tool |
| `nexus_brief` | `memory:read` | The opening call: last session, open loops, recent decisions, preferences, pinned facts, next-7-days calendar, Command Center pending summary, suggested recall queries |

**Memory**

| Tool | Scope | Description |
|---|---|---|
| `nexus_recall` | `memory:read` | Ranked search (recency + confidence + overdue-open-loop bonus) |
| `nexus_remember` | `memory:write` | Upsert by `(kind, subject)`; rejects obvious secret patterns |
| `nexus_update_memory` | `memory:write` | Partial update (status, content, tags, dueAt, confidence) |
| `nexus_forget` | `memory:write` | Archives — never deletes |
| `nexus_open_loops` | `memory:read` | Active open loops, overdue first |
| `nexus_timeline` | `memory:read` | Memories created/updated in a date range |

**Sessions**

| Tool | Scope | Description |
|---|---|---|
| `nexus_start_session` | `memory:write` | Auto-closes a stale open session for the same agent first |
| `nexus_finish_session` | `memory:write` | Stamps finished, writes a session_summary + one memory per decision/open loop |

**Docs**

| Tool | Scope | Description |
|---|---|---|
| `nexus_list_tree` | `docs:read` | Teamspaces and nodes |
| `nexus_search_docs` | `docs:read` | Title (substring) + block-content (Postgres FTS) search, merged |
| `nexus_read_doc` | `docs:read` | Markdown, clipped to `maxChars` (default 20000) |
| `nexus_create_doc` | `docs:write` | New document, optionally seeded with markdown |
| `nexus_append_doc` | `docs:write` | Diffs markdown into the existing Yjs doc — an open editor merges it live |

**Calendar**

| Tool | Scope | Description |
|---|---|---|
| `nexus_calendar` | `calendar:read` | Entries in `[from, to]` |
| `nexus_add_calendar_entry` | `calendar:write` | Creates the backing document + a draft entry |
| `nexus_set_calendar_status` | `calendar:write` | draft/scheduled/published/cancelled, merges `postUrl` |

**Command Center** (moved from the old `/api/mcp` route, `workspace` argument dropped)

| Tool | Scope | Description |
|---|---|---|
| `nexus_cc_pending` | `command:read` | Drafted replies, pending posts, quarantined items, platform health |
| `nexus_cc_capture_opportunity` | `command:write` | Records an inbound item, auto-scores scam risk |
| `nexus_cc_draft_reply` | `command:write` | Attaches a draft reply |
| `nexus_cc_mark_sent` | `command:write` | Marks an opportunity sent |
| `nexus_cc_add_post` | `command:write` | Adds a content post to the calendar |
| `nexus_cc_mark_posted` | `command:write` | Marks a post published with its URL |
| `nexus_cc_record_health` | `command:write` | Stores a platform health score |

All seven require `businesses.command_center_enabled = true`, returning a clear tool error when
it's off. All continue to call `lib/command/ops.ts` unchanged — behavior never drifts from
`/api/command`.

**Gruve bridge** (read-only — the client has no POST/PUT/DELETE methods)

| Tool | Scope | Description |
|---|---|---|
| `nexus_gruve_events` | `gruve:read` | Pass-through to `/api/v1/events` |
| `nexus_gruve_event` | `gruve:read` | Pass-through to `/api/v1/events/:id` |
| `nexus_gruve_tickets` | `gruve:read` | Pass-through to `/api/v1/tickets` |
| `nexus_gruve_registrations` | `gruve:read` | Pass-through to `/api/v1/registrations` |
| `nexus_gruve_sales` | `gruve:read` | Pass-through to `/api/v1/sales` |
| `nexus_gruve_snapshot` | `gruve:read` + `memory:write` | Upcoming events, tickets/revenue in the last 7 days (paginated), writes a superseding `insight` memory |

Every Gruve response carries `coverage: 'onchain-only'` (Gruve's v1 doesn't cover the OffChain*
tables) or `coverage: 'partial'` (a pagination cap was hit — see Deviations). A workspace with no
Gruve key connected gets a clear tool error, not a crash.

**No delete tools anywhere** — memories, docs, and calendar entries are archived/resolved/cancelled,
never deleted, by design.

## OAuth 2.1

**Endpoints:**

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/oauth-protected-resource` | RFC 9728, via `mcp-handler`'s `protectedResourceHandler` |
| `GET /.well-known/oauth-authorization-server` | RFC 8414, hand-rolled (`mcp-handler` doesn't provide this) |
| `POST /api/oauth/register` | RFC 7591 DCR — public clients only, no `client_secret` |
| `GET /oauth/authorize` | Consent page — Nexus login gate, then a workspace picker |
| `POST /api/oauth/token` | `authorization_code` (PKCE-verified) and `refresh_token` (rotates every use) grants |

**Flow:** DCR → redirect to `/oauth/authorize?client_id&redirect_uri&code_challenge&
code_challenge_method=S256&scope&state` → Nexus login if needed (`next` preserves the full query
string) → consent screen lists every workspace where the user is ADMIN, shows the exact scopes
being requested, pre-selects when there's exactly one, always shows the explicit confirmation
(never silently skipped), empty state for zero → one-time code → `POST /api/oauth/token` → 1h
access JWT + rotating refresh token.

**PKCE is mandatory, S256 only.**

**Env var:** `NEXUS_MCP_OAUTH_JWT_SECRET` — `/api/oauth/token` returns a clean 500 when unset,
never silently mints an unverifiable token.

**Not implemented:** `POST /api/oauth/revoke`. Revoking is deleting/stamping the refresh-token row
from Connections settings (`nexus_key_` tokens and connected apps both revoke this way).

## Connections settings

`/w/<slug>/settings/connections` (ADMIN-only): mint/revoke static tokens, see/revoke connected
OAuth apps, connect a Gruve API key (validated against the live API before it's ever stored), and
record the matching Pulse tenant slug. `secret_enc` (the encrypted Gruve key) is never returned by
any tool, action, or page — the settings page shows only "connected" + the base URL.

## Operator contract

How the Gruve Command Center (or any operator agent) is meant to use this:

1. `nexus_whoami` once, to confirm the business and read `links.pulse.tenantSlug`.
2. `nexus_start_session` with `agent: "gruve-command-center"`.
3. `nexus_brief`. Read it before doing anything else — overdue open loops come first.
4. Work through the Pulse-Gruve connector (`pulse_*`, on Pulse's own MCP) and the `nexus_gruve_*`
   tools. When something is learned that will matter next week, `nexus_remember` it immediately
   with a specific `subject`. Call `nexus_recall` with the subject first when unsure whether it's
   already tracked — prefer updating an existing subject over inventing a near-duplicate.
5. Anything the user must do, or that must be checked later, becomes an `open_loop` with `dueAt`.
6. Long-form output goes into a doc via `nexus_create_doc`/`nexus_append_doc`; the memory holds a
   one-line pointer with `nodeId`.
7. `nexus_finish_session` with a summary, the decisions taken, and the open loops created.

Nothing in this contract sends a message, publishes a post, moves money, or changes Gruve data —
those remain the user's own actions.

## Deviations from the build spec

1. **Route location and cutover.** `api/[transport]/route.ts`, not `api/mcp/[transport]/route.ts` —
   `[transport]` is a literal segment `mcp-handler` resolves itself; `basePath: "/api"` plus this
   location produces the clean `/api/mcp` public URL. The old static `api/mcp/route.ts` (`?key=`
   auth) was **deleted in the same commit** that created the new route, not left racing it for the
   same path (Next.js prefers a static route over a dynamic segment, so leaving both would have
   meant the new route never actually served `/api/mcp`) — made safe by extending the legacy bridge
   to also check `?key=`, confirmed via `mcp-handler`'s own source that `verifyToken(req, bearerToken)`
   always receives the full request even with no `Authorization` header present.
2. **`nexus_manifest`'s registry is keyed by tool name (a `Map`), not appended to with `Array.push()`.**
   `mcp-handler` reconstructs a fresh `McpServer` and re-runs the whole registration callback on
   every POST request (verified by reading its compiled source) — an append-only array would grow
   by one duplicate entry per tool on every request for the life of a warm serverless instance.
3. **`remember_memory()` and `recall_memories()` are Postgres RPCs, not `.upsert()`/`.select()`
   calls.** `memories_dedupe` is a *partial* unique index (`where status = 'active'`); Postgres only
   accepts a partial index as an `ON CONFLICT` arbiter when the conflict clause repeats the exact
   same predicate, which PostgREST's generic REST layer has no way to express. Same reasoning for
   `recall_memories()` bumping `recall_count`/`last_recalled_at` atomically for exactly the rows
   the ranking query returns.
4. **The Yjs diff path (`appendToNode`) was spiked and checkpointed before anything else in
   `lib/docs/content.ts` was built on it** — real Yjs/y-prosemirror, no mocking
   (`content.diff.test.ts`). Confirmed: `prosemirrorToYXmlFragment(pmDoc, fragment)` makes the
   fragment match `pmDoc` exactly (a sync-to-target diff), so the caller composes the full next
   document (existing + appended) before diffing — it is not an "append this on top" primitive.
5. **`nexus_gruve_snapshot` paginates** (bounded, 10 pages) rather than reading only the first page
   of events/tickets/sales, and reports `coverage: 'partial'` if the cap is hit — an account with
   more than 100 sales in 7 days would otherwise have silently truncated its revenue total, and
   this snapshot is exactly what `nexus_brief` reports back as "what the numbers looked like last
   time."
6. **`decidePost`'s `properties` merge bug, fixed in the same build.** The pre-existing
   `cc_mark_posted`/now-`nexus_set_calendar_status` path replaced the entire `properties` JSONB
   column on `post_url` updates, wiping `body`/`media_ref`/`quality_score`. Fixed to merge; added
   `ops.test.ts` as the first-ever test coverage for `lib/command/ops.ts`.
7. **Zero-argument tools use the two-arg `(args, extra) => ...` callback form even with
   `inputSchema: {}`**, matching the MCP SDK's `ToolCallback` type (the single-arg `(extra) => ...`
   form only applies when `inputSchema` is omitted entirely).
8. **`withAudit()`/`registerAuditedTool()`** wraps every tool registration once (`lib/mcp/audit.ts`)
   rather than each tool hand-writing its own `mcp_audit_log` insert — never logs raw arguments,
   only a sha256 digest.

## Migrations

Applied by hand in the Supabase SQL editor, in order:

| # | File | Contents |
|---|---|---|
| 29 | `29_mcp_auth.sql` | `workspace_api_tokens`, `oauth_clients`, `oauth_authorization_codes`, `oauth_refresh_tokens` |
| 30 | `30_memory.sql` | `memories`, `agent_sessions`, `mcp_audit_log`, `remember_memory()`, `recall_memories()`, `search_blocks()`, the `blocks_content_search` expression index |
| 31 | `31_integrations.sql` | `business_integrations` |

## Env vars

```
NEXUS_MCP_OAUTH_JWT_SECRET=      # required for OAuth; 500 from /api/oauth/token when missing
NEXUS_INTEGRATION_KEY=           # 32 bytes base64; required to save a Gruve key
NEXT_PUBLIC_APP_URL=             # OAuth issuer and resourceUrl derive from this
MCP_LEGACY_COMMAND_TOKEN=        # optional "1" during migration; delete afterwards
COMMAND_CENTER_TOKEN=            # existing; only read when the flag above is set
COMMAND_CENTER_BUSINESS_SLUG=    # existing; same
```

See `apps/web/.env.example` for the full list with comments.
