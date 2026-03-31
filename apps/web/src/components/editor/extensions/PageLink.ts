import { Node, mergeAttributes } from '@tiptap/core';

export interface PageLinkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageLink: {
      /**
       * Add a page link block
       */
      setPageLink: (options: { href: string; title: string; icon?: string }) => ReturnType;
    }
  }
}

export const PageLink = Node.create<PageLinkOptions>({
  name: 'pageLink',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      href: {
        default: null,
      },
      title: {
        default: 'Untitled Page',
      },
      icon: {
        default: '📄',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page-link"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      { 
        'data-type': 'page-link',
        class: 'page-link-wrapper my-2'
      },
      [
        'a',
        { 
          href: HTMLAttributes.href, 
          class: 'flex items-center gap-2 p-2 hover:bg-hover rounded-lg transition-all cursor-pointer no-underline border border-transparent hover:border-border/10' 
        },
        ['span', { class: 'text-lg shrink-0' }, HTMLAttributes.icon || '📄'],
        ['span', { class: 'text-[14px] font-bold text-foreground/80 truncate border-b border-border/20 group-hover:border-foreground/40' }, HTMLAttributes.title]
      ]
    ];
  },

  addCommands() {
    return {
      setPageLink: (options) => ({ chain }) => {
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
