# Nexus — Product Roadmap / Build TODO

These are the differentiators we put on the landing page under **"We're not out-featuring
Notion."** They are framed honestly there as *"On the roadmap"* — i.e. not shipped yet.
This file is the build backlog so the marketing promise and the product stay in sync.

> Rule: nothing moves from "On the roadmap" to a hard claim on the site until it ships.

---

## 1. A workspace that organizes itself  ·  `status: not started`
**Promise on site:** "Capture a thought and Nexus files it, links it to related work, and grows the tree for you — no manual sorting, ever."

**What it means**
- On create/edit, suggest (or auto-apply) the right parent folder based on content + existing tree.
- Auto-link new blocks to related existing nodes (semantic similarity over the workspace).
- "Tidy up" action: propose a cleaner tree for a messy workspace.

**Rough build**
- Embed nodes/blocks (pgvector in Supabase) on write via a background job.
- Server Action: `suggestPlacement(nodeId)` → ranked parent candidates + related nodes.
- UI: subtle "Suggested: Marketing › Launch" chip the user can accept.

---

## 2. Ask your whole workspace  ·  `status: not started`
**Promise on site:** "Pose a question and get an answer drawn from everything your team has written — with sources you can click straight through to."

**What it means**
- RAG over the business's nodes/blocks, scoped by the viewer's permissions (RLS-aware retrieval).
- Answers cite the exact blocks/pages used; every citation is a deep link.

**Rough build**
- Reuse the embeddings from (1) + a retrieval Server Action that respects `business_members` roles.
- Answer endpoint streams via the AI SDK; render inline citations as node links.
- Guardrail: "I couldn't find this in your workspace" instead of hallucinating.

---

## 3. Knowledge that stays true  ·  `status: not started`
**Promise on site:** "Documents flag themselves when they go stale and pull fresh details from the source. No more wikis no one trusts."

**What it means**
- Pages get a freshness signal (last verified, owner, review cadence).
- Optional "source of truth" links (a Linear issue, a metric, a repo) that, when changed, mark the doc as needing review.

**Rough build**
- `review_status` + `review_due` on nodes; a cron (Vercel Cron) surfaces stale docs in Updates.
- Webhook intake for source systems → mark linked docs stale.

---

## 4. Capture from everywhere  ·  `status: not started`
**Promise on site:** "Turn Slack messages, meeting notes, and email into clean, structured nodes — automatically, where they belong."

**What it means**
- Inbound integrations (Slack save, email-to-workspace address, meeting-notes import) that create nodes.
- Routed using (1) so captured items land in the right place, not an "Inbox" graveyard.

**Rough build**
- Slack app + slash/shortcut → API route → create node, run placement suggestion.
- Unique inbound email alias per workspace → parser → blocks.

---

## Supporting work these depend on
- [ ] Embeddings pipeline (pgvector) + backfill job
- [ ] Permission-aware retrieval helper (shared by #1, #2)
- [ ] AI SDK wiring already exists at `apps/web/src/app/api/ai/` — extend for workspace-scoped RAG
- [ ] Background jobs / queue for indexing (BullMQ or Vercel Queues)

## Marketing pages backlog (requested)
- [ ] `/blog` (+ `/blog/[slug]`) — dummy data now, wire **Contentful** later
- [ ] `/about`
- [ ] `/legal/terms`, `/legal/privacy` (compliance), `/legal/cookies`, optional `/legal/dpa`
- [ ] `/security` (YC/investors look for this), `/status`
- [ ] `/docs`, `/api`, `/community` — structure + content
- [ ] Footer links to all of the above
