# Build task for Cursor: hosted MCP endpoint (URL-based custom connector)

Goal: expose the Command Center's 7 tools as a **remote MCP server** at `/api/mcp` in the Next.js
app, so it can be added in Claude as a Custom Connector by URL + a bearer header — no local stdio
process. Reuse the existing logic in `apps/web/src/app/api/command/route.ts`; do not duplicate it.

## Approach

1. Add the Vercel MCP adapter: `pnpm --filter web add mcp-handler` (a.k.a. `@vercel/mcp-adapter`).
   Use its **stateless Streamable HTTP** mode (no Redis) so it runs on Vercel serverless.
2. **Refactor first (no behaviour change):** extract the op handlers currently inside
   `api/command/route.ts` (`capture_opportunity`, `draft_reply`, `decide_opportunity`, `add_post`,
   `decide_post`, `record_health`, plus the `GET` pending read) into a shared module, e.g.
   `apps/web/src/lib/command/ops.ts`, exporting typed functions that take
   `(supabase, businessId, args)`. Have BOTH `api/command/route.ts` and the new `api/mcp` route call
   these, so there is one source of truth. Keep the existing `/api/command` endpoint working.
3. Create the MCP route (path per the adapter, typically
   `apps/web/src/app/api/[transport]/route.ts` or `api/mcp/route.ts`). Register 7 tools mirroring
   `services/command-mcp/index.js`: `cc_pending`, `cc_capture_opportunity`, `cc_draft_reply`,
   `cc_mark_sent`, `cc_add_post`, `cc_mark_posted`, `cc_record_health`. Each resolves the target
   workspace from the tool arg `workspace` (fallback `COMMAND_CENTER_BUSINESS_SLUG`) and calls the
   shared ops. Only operate on workspaces with `command_center_enabled = true`.
4. **Auth:** in the route, before handling, require
   `Authorization: Bearer ${process.env.COMMAND_CENTER_TOKEN}`. Return 401 otherwise. (Claude sends
   whatever header you configure in the connector.) Use the service-role client
   (`@/lib/supabase/service`) since this is trusted server-side automation.
5. Reuse the scam scorer (`@/lib/command/scam`) inside `capture_opportunity` exactly as today.

## Verify

- `npx tsc --noEmit` clean; `pnpm build` passes.
- Local: `curl -X POST http://localhost:3000/api/mcp -H "Authorization: Bearer $TOKEN" ...` returns a
  valid MCP `initialize` / `tools/list` response; a wrong token → 401.
- Confirm `/api/command` still works (regression) with the same curls from `COMMAND_CENTER_HANDOFF.md`.
- Deploy to Vercel with `COMMAND_CENTER_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`,
  `COMMAND_CENTER_BUSINESS_SLUG` set.

## Guardrails

- Additive only; never touch Gruve/Sippy data. Never send/post/change rates/move money — those are
  the user's actions. The MCP only reads the queue and writes drafts/scores/status.
- Keep `services/command-mcp/` (the stdio MCP) as-is; it stays a working fallback.

## After it's deployed — how the user connects (no code)

In Claude → **Settings → Connectors → Add custom connector**:
- **Name:** Nexus Command Center
- **URL:** `https://<your-vercel-domain>/api/mcp`
- **Advanced / Request headers:** add `Authorization` = `Bearer <COMMAND_CENTER_TOKEN>`
- Save → approve. The `cc_` tools become available; no config file needed.
