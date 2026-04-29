import { describe, it, expect } from 'vitest';
import { extractMentions, stringifyTiptap } from './extractMentions';

describe('extractMentions', () => {
  it('returns [] for empty content', () => {
    expect(extractMentions(null)).toEqual([]);
    expect(extractMentions(undefined)).toEqual([]);
    expect(extractMentions({})).toEqual([]);
  });

  it('returns [] when no mentions present', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Just plain text' }] }],
    };
    expect(extractMentions(doc)).toEqual([]);
  });

  it('extracts a single mention id', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hey ' },
            { type: 'mention', attrs: { id: 'user-1', label: 'Alice' } },
          ],
        },
      ],
    };
    expect(extractMentions(doc)).toEqual(['user-1']);
  });

  it('dedupes when the same user is mentioned multiple times', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'user-1', label: 'Alice' } },
            { type: 'text', text: ' and again ' },
            { type: 'mention', attrs: { id: 'user-1', label: 'Alice' } },
            { type: 'text', text: ' three ' },
            { type: 'mention', attrs: { id: 'user-1', label: 'Alice' } },
          ],
        },
      ],
    };
    expect(extractMentions(doc)).toEqual(['user-1']);
  });

  it('filters out the nexus-ai placeholder id', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'nexus-ai', label: 'Nexus AI' } },
            { type: 'mention', attrs: { id: 'user-2', label: 'Bob' } },
          ],
        },
      ],
    };
    expect(extractMentions(doc)).toEqual(['user-2']);
  });

  it('finds mentions nested inside blockquotes and lists', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'mention', attrs: { id: 'user-3', label: 'Carol' } }],
            },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'mention', attrs: { id: 'user-4', label: 'Dan' } }],
                },
              ],
            },
          ],
        },
      ],
    };
    const ids = extractMentions(doc).sort();
    expect(ids).toEqual(['user-3', 'user-4']);
  });

  it('ignores mention nodes without a string id', () => {
    const doc = {
      type: 'paragraph',
      content: [
        { type: 'mention', attrs: { label: 'no id here' } },
        { type: 'mention', attrs: { id: null } },
        { type: 'mention', attrs: { id: 42 } },
      ],
    };
    expect(extractMentions(doc)).toEqual([]);
  });
});

describe('stringifyTiptap', () => {
  it('flattens text with mentions into "@label" tokens', () => {
    const doc = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hi ' },
        { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
        { type: 'text', text: ' please look' },
      ],
    };
    expect(stringifyTiptap(doc)).toBe('Hi @Alice please look');
  });

  it('collapses whitespace', () => {
    const doc = { type: 'text', text: '  hello   world  ' };
    expect(stringifyTiptap(doc)).toBe('hello world');
  });

  it('returns empty string for empty input', () => {
    expect(stringifyTiptap(null)).toBe('');
    expect(stringifyTiptap({})).toBe('');
  });
});
