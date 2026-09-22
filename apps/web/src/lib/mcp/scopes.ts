// Scope catalog for the Nexus Brain MCP server. `scopes` is stored as a
// comma-separated string on both workspace_api_tokens and the OAuth grant
// tables — this is the single source of truth for which strings are valid,
// both for token-minting validation and the Connections settings scope
// picker. Shape copied from Pulse's src/lib/api/scopes.ts.

export const MCP_SCOPES = [
  'memory:read',
  'memory:write',
  'docs:read',
  'docs:write',
  'calendar:read',
  'calendar:write',
  'command:read',
  'command:write',
  'gruve:read',
  'admin',
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

/** Defaults for a newly minted static token: all *:read plus memory:write
 * (memory is the whole point of the brain layer). */
export const DEFAULT_MCP_SCOPES: McpScope[] = [
  'memory:read',
  'docs:read',
  'calendar:read',
  'command:read',
  'gruve:read',
  'memory:write',
];

export const MCP_SCOPE_GROUPS: Array<{ label: string; scopes: McpScope[] }> = [
  { label: 'Memory', scopes: ['memory:read', 'memory:write'] },
  { label: 'Docs', scopes: ['docs:read', 'docs:write'] },
  { label: 'Calendar', scopes: ['calendar:read', 'calendar:write'] },
  { label: 'Command Center', scopes: ['command:read', 'command:write'] },
  { label: 'Gruve', scopes: ['gruve:read'] },
  { label: 'Admin', scopes: ['admin'] },
];

/** `admin` implies every other scope. */
export function hasScope(scopes: string[], required?: McpScope | null): boolean {
  if (!required) return true;
  return scopes.includes(required) || scopes.includes('admin');
}

/** Intersects a requested scope list against the catalog. An empty or
 * entirely-invalid request falls back to the defaults (OAuth grants
 * "whatever scope string the client asked for, intersected with this
 * catalog; an empty or absent scope request gets the same defaults"). */
export function resolveRequestedScopes(requested: string[]): McpScope[] {
  const valid = requested.filter((s): s is McpScope => (MCP_SCOPES as readonly string[]).includes(s));
  return valid.length > 0 ? valid : [...DEFAULT_MCP_SCOPES];
}
