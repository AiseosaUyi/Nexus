# TODOS

## Nexus Brain MCP

### Upstash-backed distributed rate limiting

**What:** Replace `lib/mcp/rate-limit.ts`'s in-memory fixed-window limiter with an Upstash-backed one.

**Why:** The in-memory `Map` resets on every cold start and isn't shared across concurrent Vercel function instances, so the stated 60rpm/token and 300rpm/IP limits are a soft ceiling, not an enforced one (flagged in `/plan-eng-review`, Architecture issue 4 — same known limitation Pulse's own code comment documents).

**Context:** Deliberately deferred at build time — no real traffic pattern exists yet on `/api/mcp` to size a distributed limiter against, and this is a single-operator tool today. Revisit once there's a second real caller, a scheduled high-frequency agent, or evidence the in-memory limiter is actually being exceeded across instances.

**Effort:** S
**Priority:** P3
**Depends on:** None

### pgvector semantic search over memories/blocks

**What:** Replace `lib/memory/fts.ts`'s Postgres full-text-search ranking (`ts_rank_cd` + recency/confidence multipliers) with pgvector-backed semantic search.

**Why:** Spec section 1 names this explicitly as the phase-1 non-goal with an intentional "clearly marked seam" — FTS is lexical-match-only and will start missing semantically-similar-but-differently-worded memories/docs as the corpus grows.

**Context:** The seam is `fts.ts`'s ranking function itself — swap the scoring/matching logic there, not the schema (the `memories.search` tsvector column can coexist with a new embedding column). Entry point when picked up: add an `embedding vector` column via a new additive migration, backfill, and swap `nexus_recall`/`nexus_search_docs` to query it.

**Effort:** L
**Priority:** P4
**Depends on:** Enough accumulated memories/docs that FTS demonstrably misses relevant results (a few thousand rows, per spec's own estimate of when FTS stops being "enough for one operator").

### SSE transport for the MCP endpoint

**What:** Add SSE transport alongside the Streamable HTTP transport on `/api/mcp`.

**Why:** Spec section 1 defers this — SSE needs Redis for session state, which this stack doesn't provision today. Streamable HTTP already covers Cowork, Claude desktop, and Claude Code.

**Context:** Not a standalone task — provisioning Redis (or an equivalent shared session store) is the real prerequisite. Only worth doing if a future MCP client specifically requires SSE and can't use Streamable HTTP.

**Effort:** M
**Priority:** P4
**Depends on:** Redis (or equivalent) provisioned first
