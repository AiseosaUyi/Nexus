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

### Server actions

All server-side mutations live in **`actions.ts` files co-located with the route**:
- `apps/web/src/app/(auth)/actions.ts` — auth (signIn, signUp, getUserBusinesses)
- `apps/web/src/app/(dashboard)/w/[workspace_slug]/actions.ts` — all workspace mutations (nodes, teamspaces, calendar, comments, import)

Each action creates a fresh Supabase server client via `createClient()` (from `@/lib/supabase/server`). Client components use `createClient()` from `@/lib/supabase/client`.

### Layout and auth flow

`/dashboard` redirects to `/w/<slug>/dashboard` (the first business the user belongs to).

`(dashboard)/w/[workspace_slug]/layout.tsx` is the shell — it server-renders the sidebar with initial nodes/teamspaces and passes them as props to `SidebarTree`. The sidebar holds its own state and syncs back from server on `router.refresh()`.

### Component patterns

- **Server page → Client component** split is standard: pages fetch data, pass it as props to `*Client.tsx` components
- Modals manage their own open/close state in the parent; they are never portaled to a separate route
- `SidebarTree` owns sidebar state (nodes, teamspaces) and passes callbacks to children
- All Radix UI dropdown items that trigger server actions use `onSelect`, not `onClick`

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
- `generateYjsSnapshot.ts` — headless Tiptap `Editor` with `Collaboration` extension → Yjs binary

Server action `importFromURL` in `actions.ts` fetches URLs server-side (avoids CORS) and has special handling for `notion.site` / `notion.so` URLs via `src/lib/notion-parser.ts`.

---

## Database migrations

Migrations are plain SQL files in `database/migrations/` and must be applied in order. When adding a column:
1. Create `database/migrations/NN_description.sql`
2. Apply via `pnpm supabase db reset` (local) or Supabase dashboard SQL editor (production)
3. Update `packages/api/schema.ts` to match
4. Update RLS policies if needed (check `11_fix_nodes_rls.sql` for the pattern)

**All migrations through `15_calendar_properties.sql` must be applied for the current codebase.**

---

## Testing

**Unit tests** (Vitest): co-located with source files as `*.test.ts`. Mock Supabase via `vi.mock('@/lib/supabase/server', ...)` — see `actions.test.ts` for the chained mock pattern.

**E2E tests** (Playwright): in `apps/web/e2e/`. Three Playwright projects:
- `setup` — auth only (runs once)
- `chromium-public` — unauthenticated flows (`smoke`, `auth` specs)
- `chromium-auth` — authenticated flows (`create-page`, `sidebar`, `import`, etc.)

New E2E spec files must be added to the `testMatch` regex in `apps/web/playwright.config.ts`.

---

## Environment variables

Required in `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=          # AI bubble menu
E2E_TEST_EMAIL=             # Playwright only
E2E_TEST_PASSWORD=          # Playwright only
```
