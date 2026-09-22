// THE SPIKE. Verifies diffAppendIntoDoc — the one genuinely novel piece of
// this build (headless Yjs diffing with no browser, no live EditorView) —
// before anything else in content.ts was built on top of it. No mocking:
// real Yjs, real y-prosemirror, real ProseMirror schema/Node.fromJSON.
//
// This is the go/no-go the eng review's outside voice asked for: if this
// breaks, it breaks as silent data corruption on the canonical content
// store, not a 500 — worth proving correct in isolation first.
//
// Contract this proves: prosemirrorToYXmlFragment(pmDoc, fragment) makes
// the fragment MATCH pmDoc exactly — it's a sync-to-target diff, not an
// "append this on top" operation. So diffAppendIntoDoc's caller (appendToNode
// in content.ts) is responsible for composing the FULL next document
// (existing content + new content) before calling it; passing only the
// new fragment as `nextJSON` would make the fragment forget everything
// else. Every test below composes the full next doc for that reason —
// an earlier draft of this suite got that wrong and the first run of
// these tests caught it immediately (see git history of this file).

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { diffAppendIntoDoc, snapshotToProseMirrorJSON } from './content';
import { markdownToProseMirror } from './markdown';
import type { TiptapDoc } from './markdown';

function textOf(doc: TiptapDoc): string {
  return JSON.stringify(doc);
}

function mergeDocs(current: TiptapDoc, appended: TiptapDoc): TiptapDoc {
  return { type: 'doc', content: [...(current.content ?? []), ...(appended.content ?? [])] };
}

describe('diffAppendIntoDoc (the spike)', () => {
  it('appends to a brand-new doc (null existing snapshot)', () => {
    const toAppend = markdownToProseMirror('# Hello\n\nWorld');
    const { snapshot, delta } = diffAppendIntoDoc(null, toAppend);

    expect(snapshot.length).toBeGreaterThan(0);
    expect(delta.length).toBeGreaterThan(0);

    const roundTripped = snapshotToProseMirrorJSON(snapshot);
    expect(textOf(roundTripped)).toContain('Hello');
    expect(textOf(roundTripped)).toContain('World');
  });

  it('preserves existing content when appending to a doc that already has some', () => {
    const existingJSON: TiptapDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original paragraph' }] }],
    };
    const existing = diffAppendIntoDoc(null, existingJSON).snapshot;

    const toAppend = markdownToProseMirror('New appended paragraph');
    const nextJSON = mergeDocs(existingJSON, toAppend);

    const { snapshot, delta } = diffAppendIntoDoc(existing, nextJSON);
    expect(delta.length).toBeGreaterThan(0);

    const result = snapshotToProseMirrorJSON(snapshot);
    const serialized = textOf(result);
    expect(serialized).toContain('Original paragraph');
    expect(serialized).toContain('New appended paragraph');
  });

  it('produces a delta that, applied alone to a fresh peer doc, reaches the same final state as the full snapshot', () => {
    // This is the actual property the Realtime broadcast depends on: an
    // open editor merges the DELTA (payload.update), not the full
    // snapshot — if applying just the delta didn't converge to the same
    // state, live editors would silently diverge from what got saved.
    const existingJSON: TiptapDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Base content' }] }],
    };
    const existing = diffAppendIntoDoc(null, existingJSON).snapshot;

    const toAppend = markdownToProseMirror('Delta-only content');
    const nextJSON = mergeDocs(existingJSON, toAppend);
    const { snapshot, delta } = diffAppendIntoDoc(existing, nextJSON);

    // Simulate a peer that already had `existing` and receives only the delta.
    const peerDoc = new Y.Doc();
    Y.applyUpdate(peerDoc, existing);
    Y.applyUpdate(peerDoc, delta);
    const peerState = Y.encodeStateAsUpdate(peerDoc);

    const authoritativeDoc = new Y.Doc();
    Y.applyUpdate(authoritativeDoc, snapshot);
    const authoritativeState = Y.encodeStateAsUpdate(authoritativeDoc);

    // Two independently-constructed Y.Docs converging to the same state
    // vector is the CRDT correctness property — compare via re-encoding
    // rather than raw byte equality (update encodings aren't guaranteed
    // byte-identical, but applying either to a fresh doc must converge).
    const fromPeer = new Y.Doc();
    Y.applyUpdate(fromPeer, peerState);
    const fromAuthoritative = new Y.Doc();
    Y.applyUpdate(fromAuthoritative, authoritativeState);
    expect(Y.encodeStateVector(fromPeer)).toEqual(Y.encodeStateVector(fromAuthoritative));

    const peerJSON = snapshotToProseMirrorJSON(Y.encodeStateAsUpdate(fromPeer));
    expect(textOf(peerJSON)).toContain('Base content');
    expect(textOf(peerJSON)).toContain('Delta-only content');
  });

  it('round-trips a doc containing a Callout node without stripping it', () => {
    const existingJSON: TiptapDoc = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { emoji: '💡' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A callout note' }] }],
        },
      ],
    };
    // Built with content.ts's own extended schema (via diffAppendIntoDoc
    // itself), NOT generateYjsSnapshot.ts's narrower one — that file's
    // schema doesn't know about `callout` at all and would throw
    // "Unknown node type: callout" trying to build this fixture, which is
    // exactly the schema gap this extension list exists to close.
    const existing = diffAppendIntoDoc(null, existingJSON).snapshot;

    const toAppend = markdownToProseMirror('Appended after the callout');
    const nextJSON = mergeDocs(existingJSON, toAppend);

    const { snapshot } = diffAppendIntoDoc(existing, nextJSON);
    const result = snapshotToProseMirrorJSON(snapshot);

    const hasCallout = result.content?.some((n) => n.type === 'callout');
    expect(hasCallout).toBe(true);
    expect(textOf(result)).toContain('A callout note');
    expect(textOf(result)).toContain('Appended after the callout');
  });

  it('handles appending to a node whose snapshot is null/empty (brand-new node path)', () => {
    const toAppend = markdownToProseMirror('First content ever in this doc');
    const { snapshot, delta } = diffAppendIntoDoc(null, toAppend);
    expect(snapshot.length).toBeGreaterThan(0);
    expect(delta.length).toBeGreaterThan(0);
    // For a brand-new doc, the delta and the full snapshot should
    // converge to the same state (nothing existed before).
    const fromDelta = new Y.Doc();
    Y.applyUpdate(fromDelta, delta);
    const fromSnapshot = new Y.Doc();
    Y.applyUpdate(fromSnapshot, snapshot);
    expect(Y.encodeStateVector(fromDelta)).toEqual(Y.encodeStateVector(fromSnapshot));
  });
});
