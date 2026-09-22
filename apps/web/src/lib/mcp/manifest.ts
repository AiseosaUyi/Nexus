// Generated tool list for nexus_manifest. Every registerXTools(server) call
// pushes its tools' metadata in here at registration time so the manifest
// can never drift from the actual tool set.
//
// Keyed by tool name (Map), NOT appended to with Array.push(): mcp-handler
// constructs a fresh McpServer and re-runs the registration callback on
// EVERY POST request (verified against node_modules/mcp-handler/dist/
// index.mjs — the callback isn't a one-time module-init hook), so a plain
// array would grow by one duplicate entry per tool on every request for
// the life of a warm serverless instance. Map.set() on the same key is
// idempotent — repeat registrations just overwrite, not accumulate.

export interface ManifestEntry {
  name: string;
  scope: string | null;
  mutates: boolean;
  description: string;
}

const registry = new Map<string, ManifestEntry>();

export function registerManifestEntry(entry: ManifestEntry): void {
  registry.set(entry.name, entry);
}

export function getManifest(): ManifestEntry[] {
  return Array.from(registry.values());
}

/** Test-only: clears the registry so test files don't leak state into each
 * other via the shared module. Never called from production code. */
export function __resetManifestForTests(): void {
  registry.clear();
}
