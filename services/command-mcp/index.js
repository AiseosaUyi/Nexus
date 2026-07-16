#!/usr/bin/env node
// Command Center MCP — the tools Cowork calls. Thin client over the Nexus
// /api/command endpoint. Cowork reads the approval queue and writes drafts/results;
// the Next.js app (with RLS + the token guard) is the source of truth.
//
// Config via env:
//   COMMAND_API        full URL of the endpoint  (e.g. https://your-nexus.app/api/command
//                      or http://localhost:3000/api/command)
//   COMMAND_TOKEN      must match COMMAND_CENTER_TOKEN set on the Nexus server
//   COMMAND_WORKSPACE  the workspace slug this operator drives (e.g. "aise").
//                      Any workspace that has the Command Center enabled works.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const API = process.env.COMMAND_API || 'http://localhost:3000/api/command';
const TOKEN = process.env.COMMAND_TOKEN || '';
const WORKSPACE = process.env.COMMAND_WORKSPACE || '';

async function call(method, body) {
  const url = method === 'GET' && WORKSPACE
    ? `${API}?workspace=${encodeURIComponent(WORKSPACE)}`
    : API;
  const r = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify({ ...body, ...(WORKSPACE ? { workspace: WORKSPACE } : {}) }) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!r.ok) throw new Error(`API ${r.status}: ${text}`);
  return data;
}
const ok = (d) => ({ content: [{ type: 'text', text: JSON.stringify(d, null, 2) }] });

const TOOLS = [
  { name: 'cc_pending', description: 'Get everything waiting on the configured workspace (COMMAND_WORKSPACE): drafted replies/proposals, pending posts, quarantined items, and platform health. Call first each run.',
    inputSchema: { type: 'object', properties: {} }, run: () => call('GET').then(ok) },
  { name: 'cc_capture_opportunity', description: 'Record a new inbound item (message/comment/job/invite). Auto-scores scam risk and quarantines obvious scams. Include draft_reply to place it in the approval queue.',
    inputSchema: { type: 'object', required: ['platform', 'message'], properties: {
      platform: { type: 'string' }, type: { type: 'string', enum: ['message','comment','job','invite'] },
      contact: { type: 'string' }, source_url: { type: 'string' }, message: { type: 'string' },
      draft_reply: { type: 'string' }, fit_score: { type: 'number' } } },
    run: (a) => call('POST', { op: 'capture_opportunity', ...a }).then(ok) },
  { name: 'cc_draft_reply', description: 'Attach/update a draft reply on an existing opportunity and move it into the approval queue.',
    inputSchema: { type: 'object', required: ['id','draft_reply'], properties: {
      id: { type: 'string' }, draft_reply: { type: 'string' }, fit_score: { type: 'number' } } },
    run: (a) => call('POST', { op: 'draft_reply', ...a }).then(ok) },
  { name: 'cc_mark_sent', description: 'After the workspace owner approved and Cowork actually sent the reply, mark the opportunity sent.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    run: (a) => call('POST', { op: 'decide_opportunity', id: a.id, decision: 'sent' }).then(ok) },
  { name: 'cc_add_post', description: 'Add a content post (caption/body + optional media note) to the calendar for a platform, awaiting approval.',
    inputSchema: { type: 'object', required: ['platform','body'], properties: {
      platform: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' },
      media_ref: { type: 'string' }, scheduled_for: { type: 'string' }, quality_score: { type: 'number' } } },
    run: (a) => call('POST', { op: 'add_post', ...a }).then(ok) },
  { name: 'cc_mark_posted', description: 'After the workspace owner approved and Cowork published the post, mark it posted with the URL.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, post_url: { type: 'string' } } },
    run: (a) => call('POST', { op: 'decide_post', id: a.id, decision: 'posted', post_url: a.post_url }).then(ok) },
  { name: 'cc_record_health', description: 'Store a 0-100 health score for a platform plus the single top fix.',
    inputSchema: { type: 'object', required: ['platform','health_score'], properties: {
      platform: { type: 'string' }, health_score: { type: 'number' }, top_fix: { type: 'string' },
      kind: { type: 'string', enum: ['inbound','content','both'] }, handle: { type: 'string' } } },
    run: (a) => call('POST', { op: 'record_health', ...a }).then(ok) },
];

const server = new Server({ name: 'nexus-command-center', version: '0.1.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = TOOLS.find((t) => t.name === req.params.name);
  if (!tool) throw new Error(`unknown tool ${req.params.name}`);
  try { return await tool.run(req.params.arguments || {}); }
  catch (e) { return { content: [{ type: 'text', text: `ERROR: ${e.message}` }], isError: true }; }
});
await server.connect(new StdioServerTransport());
console.error('nexus-command-mcp connected →', API);
