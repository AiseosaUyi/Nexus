import { Node, mergeAttributes } from '@tiptap/core';

export interface AudioOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    audio: {
      /**
       * Add an audio block
       */
      setAudio: (options: { src: string }) => ReturnType;
    }
  }
}

export const Audio = Node.create<AudioOptions>({
  name: 'audio',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'audio',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      { class: 'audio-wrapper my-8 p-4 bg-sidebar/20 rounded-xl border border-border/5 flex flex-col gap-2' },
      [
        'div',
        { class: 'flex items-center gap-3' },
        ['span', { class: 'text-2xl' }, '🔊'],
        ['div', { class: 'flex flex-col' }, 
          ['span', { class: 'text-[13px] font-bold text-foreground/80' }, 'Audio Embed'],
          ['span', { class: 'text-[11px] text-muted-foreground' }, HTMLAttributes.src || 'No source provided']
        ]
      ],
      ['audio', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'w-full outline-none' })]
    ];
  },

  addCommands() {
    return {
      setAudio: (options) => ({ chain }) => {
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
