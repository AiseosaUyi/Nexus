/**
 * End-to-end test for the import pipeline:
 * markdown → Tiptap JSON → Yjs snapshot → Y.Doc with content
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { markdownToTiptap } from './markdownToTiptap';
import { generateYjsSnapshot } from './generateYjsSnapshot';

// Mirrors the NexusEditor decode logic
function decodeSnapshot(raw: unknown): Uint8Array | null {
  if (typeof raw === 'string') {
    const hex = raw.startsWith('\\x') ? raw.slice(2) : raw;
    if (hex.length > 0 && /^[0-9a-f]+$/i.test(hex)) {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      return bytes;
    }
  }
  if (raw instanceof Uint8Array) return raw;
  if (Array.isArray(raw)) return new Uint8Array(raw as number[]);
  return null;
}

// Mirrors the updateYjsSnapshot hex encoding (now via RPC, but the hex string is the same)
function encodeSnapshot(snapshot: number[]): string {
  return '\\x' + Buffer.from(snapshot).toString('hex');
}

const SAMPLE_MD = `# Junior PM at Gruve

**Job Description:**

We are seeking a Junior Product Manager to join our dynamic team.

**Responsibilities:**

1. **Product development coordination:** assist in the planning, design, and execution.
2. **User Engagement:** Engage with users to gather feedback.
3. **Project Planning:** Contribute to project planning.

Some more text here to make it longer.`;

describe('markdownToTiptap', () => {
  it('parses markdown into a non-empty Tiptap document', () => {
    const result = markdownToTiptap(SAMPLE_MD);
    expect(result.type).toBe('doc');
    expect(result.content).toBeDefined();
    expect(result.content!.length).toBeGreaterThan(2);
  });

  it('extracts heading correctly', () => {
    const result = markdownToTiptap(SAMPLE_MD);
    const heading = result.content!.find(n => n.type === 'heading');
    expect(heading).toBeDefined();
    expect((heading!.content as any[])[0].text).toBe('Junior PM at Gruve');
  });

  it('parses ordered list', () => {
    const result = markdownToTiptap(SAMPLE_MD);
    const list = result.content!.find(n => n.type === 'orderedList');
    expect(list).toBeDefined();
    const items = (list!.content as any[]);
    expect(items.length).toBe(3);
  });
});

describe('generateYjsSnapshot', () => {
  it('produces a non-empty snapshot from tiptap JSON', () => {
    const tiptapJson = markdownToTiptap(SAMPLE_MD);
    const snapshot = generateYjsSnapshot(tiptapJson as Record<string, unknown>);
    expect(snapshot.length).toBeGreaterThan(10);
  });

  it('snapshot produces a Y.Doc with content at field "default"', () => {
    const tiptapJson = markdownToTiptap(SAMPLE_MD);
    const snapshot = generateYjsSnapshot(tiptapJson as Record<string, unknown>);

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, Uint8Array.from(snapshot));

    const fragment = ydoc.getXmlFragment('default');
    expect(fragment.length).toBeGreaterThan(0);
  });

  it('snapshot encodes heading content at field "default"', () => {
    const tiptapJson = markdownToTiptap('# Hello World\n\nThis is a paragraph.');
    const snapshot = generateYjsSnapshot(tiptapJson as Record<string, unknown>);

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, Uint8Array.from(snapshot));

    const fragment = ydoc.getXmlFragment('default');
    const fragmentJson = JSON.stringify(fragment.toJSON());

    expect(fragmentJson).toContain('Hello World');
  });
});

describe('hex encode/decode round-trip (Supabase bytea)', () => {
  it('encodes snapshot to hex string and decodes back to same bytes', () => {
    const tiptapJson = markdownToTiptap('# Test\n\nContent here.');
    const snapshot = generateYjsSnapshot(tiptapJson as Record<string, unknown>);

    // Simulate updateYjsSnapshot encoding
    const hexStr = encodeSnapshot(snapshot);
    expect(hexStr.startsWith('\\x')).toBe(true);
    expect(hexStr.length).toBeGreaterThan(4);

    // Simulate NexusEditor decoding
    const decoded = decodeSnapshot(hexStr);
    expect(decoded).not.toBeNull();
    expect(decoded!.length).toBe(snapshot.length);
    expect(Array.from(decoded!)).toEqual(snapshot);
  });

  it('decoded bytes produce a Y.Doc with content', () => {
    const tiptapJson = markdownToTiptap('# Hello World\n\nParagraph content.');
    const snapshot = generateYjsSnapshot(tiptapJson as Record<string, unknown>);

    const hexStr = encodeSnapshot(snapshot);
    const decoded = decodeSnapshot(hexStr)!;

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, decoded);

    const fragment = ydoc.getXmlFragment('default');
    expect(fragment.length).toBeGreaterThan(0);

    const fragmentJson = JSON.stringify(fragment.toJSON());
    expect(fragmentJson).toContain('Hello World');
  });
});
