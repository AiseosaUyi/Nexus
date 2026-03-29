import { describe, it, expect } from 'vitest';
import { transformTiptapToBlocks, transformBlocksToTiptap } from './utils';

describe('Editor Data Transformation', () => {
  const mockTiptapJson = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Hello World' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'This is a test block.' }]
      }
    ]
  };

  const mockBlocks = [
    {
      id: '1',
      type: 'heading',
      content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Hello World' }] },
      position: 0
    },
    {
      id: '2',
      type: 'paragraph',
      content: { attrs: {}, content: [{ type: 'text', text: 'This is a test block.' }] },
      position: 1
    }
  ];

  it('should transform Tiptap JSON to Block payloads correctly', () => {
    const blocks = transformTiptapToBlocks(mockTiptapJson);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].position).toBe(0);
    expect(blocks[1].type).toBe('paragraph');
  });

  it('should transform Block records back to Tiptap JSON document correctly', () => {
    const tiptap = transformBlocksToTiptap(mockBlocks);
    expect(tiptap.type).toBe('doc');
    expect(tiptap.content).toHaveLength(2);
    expect(tiptap.content[0].type).toBe('heading');
    expect(tiptap.content[0].attrs.level).toBe(1);
  });

  it('should return a default paragraph if blocks are empty', () => {
    const tiptap = transformBlocksToTiptap([]);
    expect(tiptap.content).toHaveLength(1);
    expect(tiptap.content[0].type).toBe('paragraph');
  });
});
