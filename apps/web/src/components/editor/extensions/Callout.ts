import { Node, mergeAttributes, RawCommands } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Toggle a callout
       */
      toggleCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'inline*',
  
  addAttributes() {
    return {
      emoji: {
        default: '💡',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'callout',
        class: 'flex gap-3 p-4 bg-hover/20 border border-border/5 rounded-lg my-4 items-start' 
      }),
      ['span', { class: 'text-xl select-none leading-none' }, node.attrs.emoji],
      ['div', { class: 'flex-1 min-w-0' }, 0],
    ];
  },

  addCommands() {
    return {
      toggleCallout:
        () =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph');
        },
    } as Partial<RawCommands>;
  },
});
