# PROJECT HANDOFF: Nexus Knowledge Base 🚀

This document serves as the high-level context for the next developer/AI (Claude) to continue building Nexus.

## 1. Project Overview
Nexus is a Notion-style collaborative workspace built with **Next.js 15**, **Supabase**, and **Tiptap**. 

### 核心核心 (Core Pillars)
- **Hierarchy**: Everything is a Node. Nodes are either folders or documents.
- **Teamspaces**: Top-level containers in the sidebar for themed organization.
- **Collaboration**: Real-time comments and @-mentions.
- **Editor**: Custom block-based Tiptap editor (Callouts, Audio, Video, etc.).

---

## 2. Technical Stack
- **Framework**: Next.js 15 (App Router).
- **Database/Auth**: Supabase (PostgreSQL + RLS).
- **Editor Engine**: Tiptap v2 + Yjs (Hocuspocus/Supabase backend).
- **Styling**: Vanilla CSS + Tailwind-like utilities.
- **Icons**: Lucide React.
- **Testing**: Playwright (e2e).

---

## 3. Recent Accomplishments (Stable Features)

### 📂 Teamspaces & Unlimited Hierarchy
- Implemented recursive sidebar rendering for infinite nesting.
- Added support for **Teamspaces** (collapsible root containers).
- Refactored `SidebarTree.tsx` to handle distinct "Teamspace" vs. "Private" logic.

### 💬 Collaborative Comments & Mentions
- Selection-based commenting system using `Comment` Tiptap marks.
- Live Discussion Sidebar with thread support.
- **@-Mention Engine**: Triggered by `@`, fetching workspace members with a fallback for dev.

### 🛠️ Critical Bug Fixes (Stability)
- **PluginKey Conflicts**: Resolved `RangeError` by assigning unique keys to SlashCommand and Mention extensions.
- **Hydration Mismatches**: Fixed DND-related hydration errors in the sidebar.
- **SSR/Tiptap Crash**: Ensured editor extensions only initialize in the browser.

---

## 4. Current State & Known Implementation Details
- **Node Sync**: The sidebar and editor sync via server actions plus a custom `nexus:apply-comment` event bridge.
- **Sidebar Persistence**: `is_name_custom` and `teamspace_id` columns now drive the UI hierarchy.

---

## 5. Next Steps (ROADMAP)
See [ROADMAP.md](./ROADMAP.md) for detailed technical specs on:
1. **Public Site Link**: Shareable read-only URLs for any node.
2. **Import from Link**: Populating documents from external Notion/public URLs.
3. **E2E Test Suite Expansion**: Automating the "Create -> Attach -> Format" flow.

---

## 6. How to Start
1. Run `npx supabase db push` (or run migrations 10, 12, 13 manually).
2. Start the dev server: `pnpm dev`.
3. Open `http://localhost:3000` and check the 'Engineering' or 'Marketing' teamspaces.
