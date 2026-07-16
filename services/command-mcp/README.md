# Command Center — the Freelance hub inside Nexus

A per-workspace module that tracks every freelance + marketing platform, drafts replies and
posts, scores your presence, and only acts after you approve. **Nexus is the brain; Cowork is
the hands.** It's opt-in per workspace: any workspace ADMIN enables it, and it's RLS-isolated to
that workspace, so members of your *other* workspaces (e.g. Gruve, Sippy employees) never see it.
Nothing is hardcoded to one workspace — create a private workspace, enable it there, done.

Platforms: Behance · Dribbble · Upwork · Contra · Fiverr · Twitter · LinkedIn.

## Pieces (all on the `feature/command-center` branch)

```
database/migrations/26_command_center.sql     opportunities, platform_health, command_action_log (+RLS)
database/migrations/27_command_center_enable.sql  per-workspace enable flag + enable/disable RPCs
apps/web/src/app/.../command-actions.ts        server actions (incl. enable/disable)
apps/web/src/app/api/command/route.ts          token-guarded endpoint (workspace resolved per request)
apps/web/src/app/.../command-center/           the dashboard route (+ enable screen)
apps/web/src/components/dashboard/CommandCenter.tsx    the UI (approval queue, health, quarantine)
apps/web/src/components/dashboard/EnableCommandCenter.tsx  one-click enable screen
services/command-mcp/                          this MCP + the operator playbooks
```

Content posts reuse the existing `calendar_entries` table — no duplicate calendar.
Nothing is scoped to a fixed workspace: a `command_center_enabled` flag on `businesses` +
`enable_command_center(business_id)` / `disable_command_center(business_id)` RPCs make it opt-in
per workspace for any admin.

## Setup

1. **Apply the migrations** — run `pnpm supabase db reset` (replays 26 + 27), or paste
   `26_command_center.sql` then `27_command_center_enable.sql` into the Supabase SQL editor.
2. **Create a private workspace** for your freelancing via the normal “Create workspace” button
   (e.g. name it *Aise*). This is just a regular Nexus workspace — no special setup.
3. **Enable it:** open that workspace → visit `/w/<slug>/command-center` → click **Enable**.
   That flips the flag and seeds the 7 platforms. The sidebar link then appears (only in this
   workspace). Enabling requires ADMIN of the workspace.
4. **Env** (in `apps/web/.env.local`, for the automation endpoint):
   ```
   SUPABASE_SERVICE_ROLE_KEY=...           # from Supabase project settings
   COMMAND_CENTER_TOKEN=<a long random secret>
   COMMAND_CENTER_BUSINESS_SLUG=<your slug>   # optional default; the MCP can also pass it
   ```
5. **Connect the MCP to Cowork:**
   ```json
   {
     "mcpServers": {
       "nexus-command-center": {
         "command": "node",
         "args": ["ABSOLUTE/PATH/Nexus/services/command-mcp/index.js"],
         "env": {
           "COMMAND_API": "http://localhost:3000/api/command",
           "COMMAND_TOKEN": "<same COMMAND_CENTER_TOKEN>",
           "COMMAND_WORKSPACE": "<your workspace slug>"
         }
       }
     }
   }
   ```
   `cd services/command-mcp && npm install` first.

## Daily loop

1. The heartbeat (scheduled Cowork run) reads each platform via the playbooks, filters scams,
   drafts replies + posts, scores health, and writes to Nexus via the MCP. It never sends.
2. You open **Command Center**, review, tap **Approve** / **Reject**.
3. You tell Cowork "send the approved items" → it executes on your screen and marks them sent/posted.

## The heartbeat prompt (paste into the Cowork scheduler, e.g. every 3h, 8am–8pm)

> Run my Command Center check. Read `services/command-mcp/playbooks/_OPERATING.md` first, then for
> each active platform (Behance, Dribbble, Upwork, Contra, Fiverr, Twitter, LinkedIn) follow its
> playbook: open it, read what's new, run inbound through `_SCAM-FILTER.md`, draft replies and
> proposals in my voice (`_VOICE.md`), score each item and platform, and write everything to Nexus
> via the cc_ MCP tools. Do NOT send or post anything. Then give me a 5-line summary: drafts waiting,
> anything quarantined, the two lowest health scores with the top fix each, and any platform logged out.

## Safety

Approve-everything by default. Cowork never changes rates, accepts offers, delivers order files,
moves money, or clicks "verify this link" scams — those are yours. Quarantined items sit apart so
the Dribbble-style scam never reaches a real reply.
