# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

All commands run from the repo root unless noted.

```bash
# Development
pnpm dev                          # Start all apps (Turborepo)
cd apps/web && pnpm dev           # Start only the web app

# Build & lint
pnpm build                        # Build all packages
pnpm lint                         # Lint all packages

# Unit tests (Vitest) — run from apps/web
pnpm test                         # Run all unit tests
pnpm test src/lib/tree.test.ts    # Run a single test file

# E2E tests (Playwright) — run from apps/web
pnpm e2e                          # Run all E2E tests (requires dev server)
pnpm e2e --grep "import"          # Run tests matching a string
pnpm e2e:ui                       # Open Playwright UI mode

# Type-check
cd apps/web && npx tsc --noEmit

# Test coverage
cd apps/web && pnpm test:coverage   # Generate coverage report

# Supabase local (from repo root)
pnpm supabase start               # Start local Supabase stack
pnpm supabase db reset            # Reset DB and replay migrations
```

### E2E setup
Copy `.env.local.example` → `.env.local` in `apps/web` and set:
```
E2E_TEST_EMAIL=your@email.com
E2E_TEST_PASSWORD=yourpassword
```
The `setup` Playwright project runs `e2e/auth.setup.ts` to store session cookies in `playwright/.auth/user.json` before authenticated tests run.

---

## Monorepo structure

```
apps/web/          Next.js 16 application (primary codebase)
packages/api/      Shared TypeScript types (schema.ts — no runtime code)
packages/editor/   Tiptap editor package (unused at runtime — types only)
packages/ui/       Shared UI primitives
database/migrations/  Ordered SQL files applied to Supabase
supabase/          Supabase local config
```

**Package manager**: pnpm 10 with workspaces. **Build orchestration**: Turborepo.

---

## Next.js 16 — critical differences

`apps/web/AGENTS.md` flags this explicitly: **this is not the Next.js from training data**. Key breaking changes in use throughout this codebase:

- **`params` is a `Promise`** — always `await params` before destructuring:
  ```ts
  export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
  }
  ```
- Route groups: `(auth)`, `(dashboard)`, `(public)` — these are layout boundaries, not URL segments.
- Server Actions require `'use server'` at the top of the file, not just the function.

---

## Architecture

### Data model

The central entity is the **Node** (`packages/api/schema.ts`):
- A node is either a `document`, `folder`, or `calendar` entry
- Nodes belong to a **Business** (workspace) and optionally a **Teamspace** (section)
- `parent_id` enables recursive nesting; `position` controls ordering
- `title` = page H1; `name` = sidebar label (decoupled when `is_name_custom = true`)
- `yjs_snapshot` (bytea) is the canonical content store — see below

Hierarchy: `Business → Teamspace → Node (tree via parent_id)`

### Document persistence — Yjs binary snapshots

**This is the most important pattern to understand.** The editor does NOT use a traditional JSON column for content at rest. Instead:

1. `NexusEditor` initializes a `Y.Doc` from `node.yjs_snapshot` via `Y.applyUpdate(doc, snapshot)`
2. Tiptap's `Collaboration` extension keeps the `Y.Doc` in sync with ProseMirror
3. On change, `updateYjsSnapshot(nodeId, Array.from(Y.encodeStateAsUpdate(ydoc)))` persists back (debounced 10s)
4. Real-time sync between browser tabs uses `SupabaseYjsProvider` — it broadcasts Yjs binary updates over Supabase Realtime channels (`node:<nodeId>`)
5. `blocks` (the JSONB fallback) only matter when there is no `yjs_snapshot`

When creating a node programmatically with content (e.g., import), generate the snapshot client-side via `src/lib/generateYjsSnapshot.ts`, then save via `updateYjsSnapshot`.

**Snapshot serialization details:**
- `generateYjsSnapshot(tiptapJson)` returns `number[]` — binary bytes
- `updateYjsSnapshot(nodeId, snapshot)` converts to hex string and calls RPC: `save_yjs_snapshot(nodeId, Buffer.from(snapshot).toString('hex'))`
- PostgreSQL `decode(hex_string, 'hex')` converts hex back to bytea in the database
- NexusEditor's `initialSnapshot` comes from Supabase as `\xHEXDATA` string — decoded back to `Uint8Array` before `Y.applyUpdate()`
- If snapshot is null/empty, NexusEditor falls back to `initialContent` (reconstructed from blocks table)

**Common issues:**
- **Missing `yjs_snapshot` column**: When `ALTER TABLE nodes ADD COLUMN yjs_snapshot bytea` hasn't been run, imports appear to succeed but content is never saved (no error thrown). Check DB schema.
- **BlockType mismatch**: Tiptap produces `bulletList`, `orderedList`, `blockquote`, `codeBlock`, etc. but DB enum expects `list`, `quote`, `code`. Import normalizes these types before syncing to blocks table.
- **Schema mismatch in snapshots**: `generateYjsSnapshot` uses subset of extensions (StarterKit, TaskList, TaskItem, Link, Tables). Custom extensions like YouTube, Callout, Details won't survive snapshot roundtrip. Content survives via blocks fallback if snapshot fails.

### Server actions

All server-side mutations live in **`actions.ts` files co-located with the route**:
- `apps/web/src/app/(auth)/actions.ts` — auth (signIn, signUp, signOut, createBusiness, getUserBusinesses)
- `apps/web/src/app/(dashboard)/w/[workspace_slug]/actions.ts` — node/document mutations (CRUD, import, calendar, comments, sharing)
- `apps/web/src/app/(dashboard)/w/[workspace_slug]/team-actions.ts` — team/workspace mutations (members, invitations, roles)

Each action creates a fresh Supabase server client via `createClient()` (from `@/lib/supabase/server`). Client components use `createClient()` from `@/lib/supabase/client`.

### Middleware and auth flow

`middleware.ts` refreshes the Supabase session on every request. Unauthenticated users hitting `/w/*` or `/dashboard` are redirected to `/login`; authenticated users on `/login` or `/signup` are redirected to `/dashboard`. The landing page (`/`) is unprotected.

**Signup auto-confirms users** — the `signUp` action uses the Supabase admin API (`SUPABASE_SERVICE_ROLE_KEY`) to auto-confirm the user's email when Supabase doesn't return a session, then signs them in immediately. No email verification step.

**Invitation flow** — team invitations use token-based acceptance:
1. Admin invites via `TeamSettingsModal` → `inviteMember()` creates an `invitations` row with a unique token (7-day expiry)
2. Invite link (`/invite/{token}`) is shown in the UI for the admin to copy and share manually
3. Email is also sent via Resend if configured (optional — requires verified domain)
4. Recipient visits `/invite/{token}` → `AcceptInviteClient` → `acceptInvitation()` calls the `accept_invitation` PostgreSQL function → creates `business_members` row

`/dashboard` redirects to `/w/<slug>/dashboard` (the first business the user belongs to).

`(dashboard)/w/[workspace_slug]/layout.tsx` is the shell — it server-renders the sidebar with initial nodes/teamspaces and passes them to `DashboardLayoutWrapper`. The layout also mounts `NavigationProgress` (a thin top-of-screen progress bar that listens for internal `<a>` clicks globally and completes when `usePathname` changes).

**Mobile responsive layout** — `DashboardLayoutWrapper` orchestrates the desktop/mobile split:
- Desktop: renders the sidebar `<aside>` inline with a `<main>` content area
- Mobile (`md:` breakpoint): hides the sidebar, shows `MobileHeader` (sticky top bar with hamburger menu + workspace breadcrumb) and `MobileSidebar` (Radix Dialog slide-in drawer with the full `SidebarTree`)
- Mobile-safe CSS utilities in `globals.css`: `.mobile-safe-top` / `.mobile-safe-bottom` use `env(safe-area-inset-*)` for notch support

**Dashboard routes under `/w/[workspace_slug]/`:**
- `dashboard/` — workspace home
- `n/[node_id]/` — document/folder editor page
- `t/[teamspace_id]/` — teamspace overview (card grid of root pages)
- `calendar/` — content calendar
- `updates/` — activity feed

### Component patterns

- **Server page → Client component** split is standard: pages fetch data, pass it as props to `*Client.tsx` components
- Modals manage their own open/close state in the parent; they are never portaled to a separate route
- `SidebarTree` owns sidebar state (nodes, teamspaces) and passes callbacks to children
- All Radix UI dropdown items that trigger server actions use `onSelect`, not `onClick`

**Breadcrumb prop chain** — `PageHeader` shows a contextual breadcrumb but has no direct DB access. The server page (`n/[node_id]/page.tsx`) fetches the node's teamspace and passes `teamspace: { id, name }`, `workspaceSlug`, and `isCalendarEntry` down through `NodePageClient` → `PageHeader`. When `isCalendarEntry` is true the breadcrumb shows `Home / Calendar / Page`; otherwise `Home / [Teamspace] / Page`.

**Cross-component communication via custom events** — use `window.dispatchEvent` for decoupled updates rather than prop drilling:
- `nexus:saving` — triggers save indicator in `PageHeader`
- `nexus:node-created` — optimistically adds a node to `SidebarTree` state (avoids the `router.push` + `router.refresh` conflict where refresh cancels navigation)
- `nexus:apply-comment` / `nexus:open-comment` — wires editor comment marks to `CommentSidebar`

**`router.push` + `router.refresh` conflict** — calling both in the same tick causes the refresh to override the push in Next.js App Router's action queue. Pattern: dispatch `nexus:node-created` for optimistic sidebar update instead of `router.refresh()` after `router.push()`.

### Editor extensions

Custom Tiptap extensions in `src/components/editor/extensions/`:
- `SlashCommand` — `/` command menu (uses Tiptap `Suggestion`)
- `Callout`, `Audio`, `File`, `PageLink` — custom block nodes
- `Comment` — inline comment marks tied to `comment_threads`
- `Mention` — `@mention` with user autocomplete

### Import system (`src/lib/`)

Three client-side utilities for the import feature:
- `markdownToTiptap.ts` — pure string parser: Markdown → Tiptap JSON
- `htmlToTiptap.ts` — browser DOMParser: cleaned HTML → Tiptap JSON
- `generateYjsSnapshot.ts` — DOM-free: uses `getSchema` + `Node.fromJSON` (from `@tiptap/pm/model`) + `prosemirrorToYDoc` (from `y-prosemirror`) to convert Tiptap JSON → Yjs binary snapshot

Server action `importFromURL` in `actions.ts` fetches URLs server-side (avoids CORS) and has special handling for `notion.site` / `notion.so` URLs via `src/lib/notion-parser.ts`.

**Import pipeline data flow:**
1. ImportModal converts content to Tiptap JSON via markdown/HTML parsers
2. `generateYjsSnapshot()` converts JSON → binary snapshot
3. `updateYjsSnapshot()` saves snapshot via RPC `save_yjs_snapshot(node_id, hex_string)`
4. `syncBlocks()` also saves blocks with type normalization (e.g., `bulletList` → `list`)
5. On page load, NexusEditor reads snapshot from `node.yjs_snapshot` and applies it to Y.Doc
6. If snapshot is missing/null, NexusEditor falls back to reconstructing from blocks via `initialContent`

**BlockType normalization:** Tiptap produces node types like `bulletList`, `orderedList`, `blockquote`, `codeBlock`, but the DB `block_type` enum only accepts `list`, `quote`, `code`, etc. ImportModal and NexusEditor both normalize types during block sync.

### Email (`src/lib/email.ts`)

Uses Resend SDK. Two functions: `sendTeamInviteEmail()` and `sendPageShareEmail()`. Both are fire-and-forget — failures are caught and logged but don't block the invitation/share creation. Requires `RESEND_API_KEY`; falls back to `onboarding@resend.dev` as sender (sandbox mode — only delivers to the Resend account owner's email). For production delivery, set `RESEND_FROM_EMAIL` to a verified domain.

---

## Database migrations

Migrations are plain SQL files in `database/migrations/` and must be applied in order. When adding a column:
1. Create `database/migrations/NN_description.sql`
2. Apply via `pnpm supabase db reset` (local) or Supabase dashboard SQL editor (production)
3. Update `packages/api/schema.ts` to match
4. Update RLS policies if needed (check `11_fix_nodes_rls.sql` for the pattern)

**All migrations through `17_node_shares.sql` must be applied for the current codebase.**

**Critical migrations:**
- `08_realtime.sql` — adds `yjs_snapshot bytea` column to nodes (required for snapshot storage)
- `16_save_snapshot_rpc.sql` — adds `save_yjs_snapshot(p_node_id uuid, p_snapshot_hex text)` RPC function that uses `decode(p_snapshot_hex, 'hex')` to bypass PostgREST JSON encoding issues with bytea columns
- `17_node_shares.sql` — adds `node_shares` and `access_requests` tables with RLS policies for per-node sharing and access request workflow

> When querying nullable FK columns in Supabase (e.g. `parent_id`, `teamspace_id`), use `.is('col', null)` not `.eq('col', null)` — the latter silently returns no rows.

> **Bytea column serialization**: PostgREST cannot serialize `Uint8Array` to bytea correctly (JSON.stringify produces `{"0":1,"1":2,...}` which the database rejects). Always use the RPC function with hex encoding instead of direct `.update()`.

---

## Testing

**Unit tests** (Vitest): co-located with source files as `*.test.ts`. Mock Supabase via `vi.mock('@/lib/supabase/server', ...)` — see `actions.test.ts` for the chained mock pattern.

**Import pipeline tests** (`src/lib/import-pipeline.test.ts`): End-to-end tests validating:
- Markdown parsing and Tiptap JSON structure
- `generateYjsSnapshot` produces valid binary snapshots
- Snapshots survive hex round-trip (encode/decode via `updateYjsSnapshot` and `NexusEditor`)
- Snapshots survive base64 round-trip (if Supabase returns base64 format)
- Yjs snapshots reconstruct Y.Doc with correct content at `'default'` fragment

**E2E tests** (Playwright): in `apps/web/e2e/`. Three Playwright projects:
- `setup` — auth only (runs once)
- `chromium-public` — unauthenticated flows (`smoke`, `auth` specs)
- `chromium-auth` — authenticated flows (`create-page`, `sidebar`, `import`, etc.)

New E2E spec files must be added to the `testMatch` regex in `apps/web/playwright.config.ts`.

---

## Deployment

No `vercel.json` — Vercel auto-detects Next.js from `apps/web/package.json`. Set **Root Directory** to `apps/web` in Vercel project settings and leave all Framework Settings at defaults (no overrides). Environment variables must be configured in Vercel dashboard (see below).

---

## Environment variables

Copy `apps/web/.env.example` → `apps/web/.env.local` and fill in values.

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=                # AI bubble menu
```

**Optional — email (Resend):**
```
RESEND_API_KEY=                 # Team invites & page sharing emails
RESEND_FROM_EMAIL=              # Defaults to onboarding@resend.dev
```

**Optional — monitoring:**
```
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=       # Defaults to https://app.posthog.com
```

**Playwright only:**
```
E2E_TEST_EMAIL=
E2E_TEST_PASSWORD=
```

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
