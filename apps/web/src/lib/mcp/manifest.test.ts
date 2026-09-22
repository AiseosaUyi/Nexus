import { describe, it, expect, beforeEach } from 'vitest';
import { registerManifestEntry, getManifest, __resetManifestForTests } from './manifest';

describe('manifest registry', () => {
  beforeEach(() => {
    __resetManifestForTests();
  });

  it('registers a tool once', () => {
    registerManifestEntry({ name: 'nexus_whoami', scope: null, mutates: false, description: 'x' });
    expect(getManifest()).toHaveLength(1);
  });

  it('is idempotent by name — registering the same tool twice does not duplicate it', () => {
    // Regression test for the bug this design fixes: mcp-handler re-runs
    // the tool-registration callback on every POST request, so a naive
    // Array.push()-based registry would grow unbounded across requests in
    // a warm serverless instance. Simulating two "requests" here.
    const entry = { name: 'nexus_whoami', scope: null, mutates: false, description: 'x' };
    registerManifestEntry(entry); // request 1
    registerManifestEntry(entry); // request 2 — same tool, re-registered
    registerManifestEntry(entry); // request 3
    expect(getManifest()).toHaveLength(1);
  });

  it('overwrites the entry when the same name is registered with different metadata', () => {
    registerManifestEntry({ name: 'nexus_whoami', scope: null, mutates: false, description: 'old' });
    registerManifestEntry({ name: 'nexus_whoami', scope: null, mutates: false, description: 'new' });
    const manifest = getManifest();
    expect(manifest).toHaveLength(1);
    expect(manifest[0].description).toBe('new');
  });

  it('tracks distinct tools separately', () => {
    registerManifestEntry({ name: 'nexus_whoami', scope: null, mutates: false, description: 'a' });
    registerManifestEntry({ name: 'nexus_manifest', scope: null, mutates: false, description: 'b' });
    registerManifestEntry({ name: 'nexus_whoami', scope: null, mutates: false, description: 'a again' });
    expect(getManifest().map((e) => e.name).sort()).toEqual(['nexus_manifest', 'nexus_whoami']);
  });
});
