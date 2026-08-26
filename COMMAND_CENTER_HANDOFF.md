# Command Center — Cursor / Claude Code handoff

Paste this whole file into Claude Code (in Cursor) from the repo root. It is the full context
for verifying the Freelance Command Center works and finishing it.

---

## What this feature is

A **per-workspace** module in Nexus that tracks a freelancer's inbound gigs and outbound content
across Behance, Dribbble, Upwork, Contra, Fiverr, Twitter, LinkedIn. **Nexus is the brain** (stores
the approval queue, content calendar, platform health) and **Cowork is the hands** (drives the
browser on the user's machine to read platforms and, after approval, post/reply). Everything Cowork
produces waits in an approval queue — nothing sends without the user approving. It's opt-in per
workspace and RLS-isolated, so members of other workspaces (e.g. Gruve, Sippy) never see it.

## Current state (already done)

- Branch: work was committed to `main`. Two commits: `0866f96` (feature) and `493d640` (made it
  per-workspace / removed hardcoding). May or may not be pushed to GitHub yet.
- **Supabase migrations 26 and 27 have been run** against the project.
  - `26_command_center.sql`: tables `opportunities`, `platform_health`, `command_action_log` (+RLS
    matching `calendar_entries`). Content posts reuse the existing `calendar_entries` table.
  - `27_command_center_enable.sql`: `businesses.command_center_enabled` flag + `enable_command_center`
    / `disable_command_center` RPCs (ADMIN-gated; enable seeds the 7 platforms).
- Env vars added locally (`apps/web/.env.local`) and in Vercel:
  `SUPABASE_SERVICE_ROLE_KEY`, `COMMAND_CENTER_TOKEN`, `COMMAND_CENTER_BUSINESS_SLUG`.
- SQL validated with the real Postgres parser; `tsc --noEmit` passes with 0 errors.

## Files (all present)

```
database/migrations/26_command_center.sql
database/migrations/27_command_center_enable.sql
apps/web/src/app/(dashboard)/w/[workspace_slug]/command-actions.ts   server actions + enable/disable
apps/web/src/app/(dashboard)/w/[workspace_slug]/command-center/page.tsx   route (enable screen vs dashboard)
apps/web/src/app/api/command/route.ts                                token-guarded automation endpoint
apps/web/src/components/dashboard/CommandCenter.tsx                   dashboard UI
apps/web/src/components/dashboard/EnableCommandCenter.tsx             one-click enable screen
apps/web/src/components/dashboard/SidebarTree.tsx  (+ Mobile/Wrapper) gated nav link
apps/web/src/lib/command/scam.ts                                     scam scorer
apps/web/src/lib/supabase/service.ts                                 service-role client
packages/api/schema.ts                                               Opportunity / PlatformHealth types
services/command-mcp/                                                MCP + operator playbooks
```

## VERIFY it works (do these in order, report results)

1. **Type + build:** `cd apps/web && npx tsc --noEmit` (expect 0 errors), then `pnpm build`.
2. **Run:** `pnpm dev`. Log in.
3. **Create a workspace** named e.g. "Aise" via the workspace switcher (Create workspace). Confirm
   it's a separate `businesses` row and you are its ADMIN.
4. **Enable screen:** visit `/w/<slug>/command-center`. Because the flag is false, you should see
   the **Enable Command Center** screen (not the dashboard). Click **Enable**.
   - Verify: `businesses.command_center_enabled` is now true for that workspace, and
     `platform_health` has 7 rows for that `business_id`.
   - Verify: the **Command Center** link now appears in that workspace's sidebar, and does NOT
     appear in your Gruve/Sippy workspaces.
5. **Dashboard renders:** the page now shows KPIs, the 7 platform health bars, and empty
   Approval queue / Quarantine sections. No console errors.
6. **Server actions:** approve/reject buttons call `decideOpportunity` and update status
   (seed a test row first — see below).
7. **Automation endpoint (the MCP's entry point):**
   ```bash
   TOKEN=<COMMAND_CENTER_TOKEN>
   # pending (should return arrays + summary)
   curl -s "http://localhost:3000/api/command?workspace=<slug>" -H "Authorization: Bearer $TOKEN"
   # capture a legit opportunity (goes to 'drafted')
   curl -s -X POST http://localhost:3000/api/command -H "Authorization: Bearer $TOKEN" \
     -H 'content-type: application/json' \
     -d '{"workspace":"<slug>","op":"capture_opportunity","platform":"Upwork","type":"job","message":"Need a landing page redesign, budget $1200","draft_reply":"Hi — happy to help...","fit_score":80}'
   # capture a scam (should auto-quarantine: verify scam_score>=60, status 'quarantined')
   curl -s -X POST http://localhost:3000/api/command -H "Authorization: Bearer $TOKEN" \
     -H 'content-type: application/json' \
     -d '{"workspace":"<slug>","op":"capture_opportunity","platform":"Dribbble","message":"Urgent! Click this link to test: bit.ly/x, message me on Telegram"}'
   ```
   Then reload the dashboard: the legit one is in the Approval queue, the scam is in Quarantine.
   - Also verify: a request with a **wrong token** returns 401, and a request for a workspace that
     is NOT enabled returns 404 (isolation holds).
8. **MCP:** `cd services/command-mcp && npm install`, then confirm it lists 7 tools and a
   `cc_pending` call round-trips against the running app (set `COMMAND_API`, `COMMAND_TOKEN`,
   `COMMAND_WORKSPACE`).

## BUILD / finish (in priority order)

1. **Playwright e2e** covering: enable flow, nav-link visibility gated by the flag, and RLS
   isolation (a non-member cannot read another workspace's opportunities). Add the spec to
   `apps/web/playwright.config.ts` testMatch. Follow existing e2e patterns.
2. **Unit tests** for `apps/web/src/lib/command/scam.ts` (Vitest) — legit vs. scam scoring.
3. **Disable toggle** in workspace Settings (calls `disableCommandCenter`) so admins can turn it off.
4. **Post approve/reject in the UI** — the dashboard currently lists drafted opportunities and
   posts; wire approve/reject for calendar posts too (op `decide_post`).
5. **Deploy check:** ensure the 3 env vars exist in Vercel and `/api/command` works in production
   (same curl as above against the prod URL).
6. **Fill `services/command-mcp/playbooks/_VOICE.md`** with the user's real writing samples.

## Guardrails (do not violate)

- **Never touch Gruve or Sippy data.** Everything is additive and business-scoped.
- Match Nexus conventions: Next.js 16 (`await params`), server actions in co-located `*.ts`,
  RLS gated on `business_members`, design tokens (`bg-cta text-cta-foreground`, `bg-sidebar`,
  `text-muted`, `border-border`) — never hardcoded colors.
- The automation must **never** send/post, change rates, accept offers, deliver order files, move
  money, or follow "verify this link" scams. Those are the user's actions only. Approve-everything
  stays the default.
- Keep the JSON-free service-role client behind the token check; never import `service.ts` into
  client components.
- Ask before adding heavy dependencies.
```
