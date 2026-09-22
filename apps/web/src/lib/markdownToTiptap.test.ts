import { describe, it, expect } from 'vitest';
import { parseInline } from './markdownToTiptap';

describe('parseInline — italic emphasis', () => {
  it('keeps a genuine _italic_ span', () => {
    const nodes = parseInline('the _quick_ fox');
    const italic = nodes.find((n) => n.marks?.some((m) => m.type === 'italic'));
    expect(italic?.text).toBe('quick');
  });

  it('keeps a genuine *italic* span', () => {
    const nodes = parseInline('the *quick* fox');
    const italic = nodes.find((n) => n.marks?.some((m) => m.type === 'italic'));
    expect(italic?.text).toBe('quick');
  });

  it('does not italicize an intraword underscore identifier (nexus_append_doc)', () => {
    const nodes = parseInline('call nexus_append_doc now');
    expect(nodes.some((n) => n.marks?.some((m) => m.type === 'italic'))).toBe(false);
    expect(nodes.map((n) => n.text).join('')).toBe('call nexus_append_doc now');
  });

  it('does not italicize a snake_case identifier standing alone', () => {
    const nodes = parseInline('the_quick_brown_fox');
    expect(nodes.some((n) => n.marks?.some((m) => m.type === 'italic'))).toBe(false);
  });

  it('still allows intraword *asterisk* emphasis (CommonMark distinguishes * from _)', () => {
    const nodes = parseInline('foo*bar*baz');
    const italic = nodes.find((n) => n.marks?.some((m) => m.type === 'italic'));
    expect(italic?.text).toBe('bar');
  });
});
