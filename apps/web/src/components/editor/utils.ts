import { BlockType } from '@nexus/api/schema';

/**
 * Transforms Tiptap JSON content into a flat array of Block payloads for synchronization.
 * Each top-level node in the Tiptap document maps to a single Block row.
 */
export function transformTiptapToBlocks(json: any) {
  if (!json || !json.content) return [];

  return json.content.map((node: any, index: number) => ({
    // Note: In a production system with block-level collaboration, 
    // we would use persistent IDs from a custom Tiptap extension.
    type: node.type as BlockType,
    content: {
      attrs: node.attrs || {},
      content: node.content || []
    },
    position: index,
  }));
}

/**
 * Transforms a flat array of Block entities back into a Tiptap JSON document.
 */
export function transformBlocksToTiptap(blocks: any[]) {
  if (!blocks || blocks.length === 0) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }]
    };
  }

  return {
    type: 'doc',
    content: blocks.map(b => ({
      type: b.type,
      attrs: b.content.attrs || {},
      content: b.content.content || []
    }))
  };
}
