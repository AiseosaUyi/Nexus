import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      /**
       * Set a comment mark
       */
      setComment: (attributes: { threadId: string }) => ReturnType;
      /**
       * Toggle a comment mark
       */
      toggleComment: () => ReturnType;
      /**
       * Unset a comment mark
       */
      unsetComment: () => ReturnType;
    }
  }
}

export const Comment = Mark.create<CommentOptions>({
  name: 'comment',

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: element => element.getAttribute('data-thread-id'),
        renderHTML: attributes => {
          if (!attributes.threadId) return {};
          return { 'data-thread-id': attributes.threadId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-thread-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span', 
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 
        class: 'bg-amber-200/40 border-b-2 border-amber-500/50 cursor-pointer transition-colors hover:bg-amber-500/30' 
      }), 
      0
    ];
  },

  addCommands() {
    return {
      setComment: attributes => ({ chain }) => {
        return chain()
          .setMark(this.name, attributes)
          .run();
      },
      toggleComment: () => ({ chain }) => {
        return chain()
          .toggleMark(this.name)
          .run();
      },
      unsetComment: () => ({ chain }) => {
        return chain()
          .unsetMark(this.name)
          .run();
      },
    };
  },
});
