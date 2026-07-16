# Command Center — the Freelance hub inside Nexus

A private module inside your **Aise** workspace that tracks every freelance + marketing
platform, drafts replies and posts, scores your presence, and only acts after you approve.
**Nexus is the brain; Cowork is the hands.** Isolated by RLS to the `aise` workspace, so your
Gruve and Sippy employees never see it.

Platforms: Behance · Dribbble · Upwork · Contra · Fiverr · Twitter · LinkedIn.

## Pieces (all on the `feature/command-center` branch)

```
database/migrations/26_command_center.sql   opportunities, platform_health, command_action_log (+RLS)
database/seeds/aise_space.sql               creates the private "Aise" workspace + seeds platforms
apps/web/src/app/.../command-actions.ts     server actions for the dashboard
apps/web/src/app/api/command/route.ts       token-guarded endpoint for the MCP / heartbeat
apps/web/src/app/.../command-center/        the dashboard route
apps/web/src/components/dashboard/CommandCenter.tsx   the UI (approval queue, health, quarantine)
services/command-mcp/                        this MCP + the operator playbooks
```

Content posts reuse the existing `calendar_entries` table — no duplicate calendar.

## Setup

1. **Apply the migration + seed** (after logging into Nexus once so your user row exists):
   ```bash
   pnpm supabase db reset          # replays all migrations incl. 26
   # then run the seed against your DB:
   psql "$DATABASE_URL" -f database/seeds/aise_space.sql
   ```
2. **Env** (in `apps/web/.env.local`):
   ```
   SUPABASE_SERVICE_ROLE_KEY=...           # from Supabase project settings
   COMMAND_CENTER_TOKEN=<a long random secret>
   COMMAND_CENTER_BUSINESS_SLUG=aise
   ```
3. **Run the app** (`pnpm dev`), open the `Aise` workspace → **Command Center** in the sidebar.
4. **Connect the MCP to Cowork:**
   ```json
   {
     "mcpServers": {
       "nexus-command-center": {
         "command": "node",
         "args": ["ABSOLUTE/PATH/Nexus/services/command-mcp/index.js"],
         "env": {
           "COMMAND_API": "http://localhost:3000/api/command",
           "COMMAND_TOKEN": "<same COMMAND_CENTER_TOKEN>"
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
