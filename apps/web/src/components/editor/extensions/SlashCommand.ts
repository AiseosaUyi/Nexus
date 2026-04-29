import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import tippy from 'tippy.js';

const SlashCommandPluginKey = new PluginKey('slashCommand');
import CommandsList from './SlashCommandList';

// Bridge to <DialogProvider> for non-React Tiptap commands. Uses our
// designed modals; falls back to the browser primitive only if the
// provider hasn't mounted yet (which shouldn't happen at runtime).
function dialogPrompt(opts: {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
}): Promise<string | null> {
  const handle = (typeof window !== 'undefined' ? (window as any).__nexusDialog : null) as
    | { prompt: (o: any) => Promise<string | null> }
    | null;
  if (handle?.prompt) return handle.prompt(opts);
  const fallback = window.prompt(opts.title, opts.defaultValue);
  return Promise.resolve(fallback);
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        pluginKey: SlashCommandPluginKey,
      }),
    ];
  },
});

export const suggestion = {
  items: ({ query }: { query: string }) => {
    return [
      // ── Basic blocks ────────────────────────────────────────────
      {
        title: 'Text',
        description: 'Just start writing with plain text.',
        searchTerms: ['paragraph', 'text', 'plain', 'p'],
        group: 'Basic blocks',
        shortcut: '',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setParagraph().run();
        },
      },
      {
        title: 'Heading 1',
        description: 'Big section heading.',
        searchTerms: ['h1', 'head', 'large', 'title'],
        group: 'Basic blocks',
        shortcut: '#',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        },
      },
      {
        title: 'Heading 2',
        description: 'Medium section heading.',
        searchTerms: ['h2', 'head', 'medium'],
        group: 'Basic blocks',
        shortcut: '##',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        },
      },
      {
        title: 'Heading 3',
        description: 'Small section heading.',
        searchTerms: ['h3', 'head', 'small'],
        group: 'Basic blocks',
        shortcut: '###',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
        },
      },
      {
        title: 'Heading 4',
        description: 'Tiny section heading.',
        searchTerms: ['h4', 'head', 'tiny'],
        group: 'Basic blocks',
        shortcut: '####',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setNode('heading', { level: 4 }).run();
        },
      },
      {
        title: 'Bulleted list',
        description: 'Create a simple bulleted list.',
        searchTerms: ['unordered', 'point', 'bullet', 'ul'],
        group: 'Basic blocks',
        shortcut: '-',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
      },
      {
        title: 'Numbered list',
        description: 'Create a list with numbering.',
        searchTerms: ['ordered', 'list', 'numbered', 'ol'],
        group: 'Basic blocks',
        shortcut: '1.',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        title: 'To-do list',
        description: 'Track tasks with a to-do list.',
        searchTerms: ['task', 'checkbox', 'todo', 'check'],
        group: 'Basic blocks',
        shortcut: '[]',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
      },
      {
        title: 'Toggle list',
        description: 'Toggles can hide and show content.',
        searchTerms: ['details', 'summary', 'collapse', 'toggle'],
        group: 'Basic blocks',
        shortcut: '>',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).setDetails().run();
        },
      },
      {
        title: 'Page',
        description: 'Link to another page in Nexus.',
        searchTerms: ['link', 'mention', 'page', 'subpage'],
        group: 'Basic blocks',
        shortcut: '',
        command: async ({ editor, range }: any) => {
          const title = await dialogPrompt({
            title: 'Link to a page',
            description: 'Add a label first — that’s what readers will see.',
            placeholder: 'e.g. Q3 launch plan',
            confirmLabel: 'Next',
          });
          if (!title) return;
          const url = await dialogPrompt({
            title: 'Page URL or ID',
            description: 'Paste the link or page ID this should jump to.',
            placeholder: 'https://app.nexus.so/… or page ID',
            confirmLabel: 'Insert link',
          });
          if (!url) return;
          editor.chain().focus().deleteRange(range).setPageLink({ title, href: url }).run();
        },
      },
      {
        title: 'Callout',
        description: 'Make writing stand out.',
        searchTerms: ['info', 'alert', 'notice', 'box', 'callout'],
        group: 'Basic blocks',
        shortcut: '',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleCallout().run();
        },
      },
      {
        title: 'Quote',
        description: 'Capture a quotation.',
        searchTerms: ['blockquote', 'quote'],
        group: 'Basic blocks',
        shortcut: '"',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },

      // ── Media ────────────────────────────────────────────────────
      {
        title: 'Image',
        description: 'Upload or embed an image.',
        searchTerms: ['picture', 'photo', 'img'],
        group: 'Media',
        shortcut: '',
        command: async ({ editor, range }: any) => {
          const url = await dialogPrompt({
            title: 'Embed an image',
            description: 'Paste a public image URL — JPG, PNG, GIF, or WebP.',
            placeholder: 'https://example.com/photo.jpg',
            confirmLabel: 'Insert image',
          });
          if (url) {
            editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
          }
        },
      },
      {
        title: 'Video',
        description: 'Embed a YouTube video.',
        searchTerms: ['youtube', 'vimeo', 'video'],
        group: 'Media',
        shortcut: '',
        command: async ({ editor, range }: any) => {
          const url = await dialogPrompt({
            title: 'Embed a YouTube video',
            description: 'Paste the full YouTube link — we’ll embed the player inline.',
            placeholder: 'https://youtube.com/watch?v=…',
            confirmLabel: 'Embed video',
          });
          if (url) {
            editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url }).run();
          }
        },
      },
      {
        title: 'Audio',
        description: 'Embed an audio file.',
        searchTerms: ['mp3', 'sound', 'music', 'podcast'],
        group: 'Media',
        shortcut: '',
        command: async ({ editor, range }: any) => {
          const url = await dialogPrompt({
            title: 'Embed audio',
            description: 'Drop in a public MP3 or WAV — it’ll play right inside the page.',
            placeholder: 'https://example.com/track.mp3',
            confirmLabel: 'Embed audio',
          });
          if (url) {
            editor.chain().focus().deleteRange(range).setAudio({ src: url }).run();
          }
        },
      },
      {
        title: 'Code',
        description: 'Write a code snippet.',
        searchTerms: ['codeblock', 'code', 'pre', 'snippet'],
        group: 'Media',
        shortcut: '```',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
      },
      {
        title: 'File',
        description: 'Upload or embed a file.',
        searchTerms: ['attachment', 'pdf', 'doc', 'file'],
        group: 'Media',
        shortcut: '',
        command: async ({ editor, range }: any) => {
          const name = await dialogPrompt({
            title: 'Attach a file',
            description: 'Give it a name readers will recognize.',
            placeholder: 'Q3 financials.pdf',
            defaultValue: 'Untitled file',
            confirmLabel: 'Next',
          });
          if (!name) return;
          const url = await dialogPrompt({
            title: 'File URL',
            description: 'Paste a public link to the file you want to attach.',
            placeholder: 'https://example.com/file.pdf',
            confirmLabel: 'Attach',
          });
          if (!url) return;
          editor.chain().focus().deleteRange(range).setFile({ name, src: url }).run();
        },
      },

      // ── Inline ───────────────────────────────────────────────────
      {
        title: 'Mention a person',
        description: 'Mention and notify a teammate.',
        searchTerms: ['mention', 'at', 'person', 'user', 'tag'],
        group: 'Inline',
        shortcut: '@',
        command: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).insertContent('@').run();
        },
      },
    ].filter(item => {
      if (typeof query !== 'string' || query.length === 0) return true;
      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.searchTerms && item.searchTerms.some(term => term.includes(q)))
      );
    });
  },

  render: () => {
    let component: any;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(CommandsList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component.update(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        return component.ref?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
