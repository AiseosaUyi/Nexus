import { Node, mergeAttributes } from '@tiptap/core';

export interface FileOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    file: {
      /**
       * Add a file block
       */
      setFile: (options: { src: string; name: string; size?: string; type?: string }) => ReturnType;
    }
  }
}

export const File = Node.create<FileOptions>({
  name: 'file',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      name: {
        default: 'Untitled File',
      },
      size: {
        default: null,
      },
      type: {
        default: 'document',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      { 
        'data-type': 'file',
        class: 'file-wrapper my-4 group/file'
      },
      [
        'a',
        { 
          href: HTMLAttributes.src, 
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'flex items-center gap-3 p-3 bg-sidebar/20 hover:bg-sidebar/40 border border-border/10 rounded-xl transition-all cursor-pointer no-underline' 
        },
        ['div', { class: 'w-10 h-12 bg-background border border-border/10 rounded flex items-center justify-center text-xl shrink-0' }, '📄'],
        ['div', { class: 'flex flex-col min-w-0 flex-1' }, 
          ['span', { class: 'text-[14px] font-bold text-foreground/90 truncate' }, HTMLAttributes.name],
          ['div', { class: 'flex items-center gap-2 text-[11px] text-muted-foreground font-medium' },
            ['span', {}, HTMLAttributes.size || 'Unknown size'],
            ['div', { class: 'w-1 h-1 rounded-full bg-border' }],
            ['span', { class: 'uppercase' }, (HTMLAttributes.type || 'file').split('/').pop()]
          ]
        ],
        ['div', { class: 'p-2 opacity-0 group-hover/file:opacity-100 transition-opacity' }, 
           ['span', { class: 'text-muted-foreground' }, '⬇️']
        ]
      ]
    ];
  },

  addCommands() {
    return {
      setFile: (options) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: options,
          })
          .run();
      },
    };
  },
});
