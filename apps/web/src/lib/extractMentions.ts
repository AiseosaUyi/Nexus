// Recursive walk of a Tiptap-style jsonb document tree.
//
// Mentions are inline nodes of shape:
//   { type: 'mention', attrs: { id: <userId>, label: <displayName> } }
//
// Filters out the "nexus-ai" placeholder used by NexusEditor.tsx as a fallback
// when no workspace members match the @-query, so the AI never emails itself.

const NEXUS_AI_ID = 'nexus-ai';

export function extractMentions(content: unknown): string[] {
  const ids = new Set<string>();
  walk(content, n => {
    if (n.type === 'mention') {
      const attrs = (n.attrs as Record<string, unknown> | undefined) || {};
      const id = attrs.id;
      if (typeof id === 'string' && id !== NEXUS_AI_ID) ids.add(id);
    }
  });
  return Array.from(ids);
}

/** Concatenate plain text from a Tiptap doc — used for email snippet preview. */
export function stringifyTiptap(content: unknown): string {
  const parts: string[] = [];
  walk(content, n => {
    if (typeof n.text === 'string') parts.push(n.text);
    if (n.type === 'mention') {
      const attrs = (n.attrs as Record<string, unknown> | undefined) || {};
      if (typeof attrs.label === 'string') parts.push(`@${attrs.label}`);
    }
  });
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function walk(node: unknown, visit: (n: Record<string, unknown>) => void): void {
  if (!node || typeof node !== 'object') return;
  const n = node as Record<string, unknown>;
  visit(n);
  if (Array.isArray(n.content)) n.content.forEach(child => walk(child, visit));
}
