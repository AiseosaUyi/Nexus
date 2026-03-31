import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import tippy from 'tippy.js';

const SlashCommandPluginKey = new PluginKey('slashCommand');
import CommandsList from './SlashCommandList';

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
          editor.chain().focus().deleteRange(range).setNode('details').run();
        },
      },
      {
        title: 'Page',
        description: 'Link to another page in Nexus.',
        searchTerms: ['link', 'mention', 'page', 'subpage'],
        group: 'Basic blocks',
        shortcut: '',
        command: ({ editor, range }: any) => {
          const title = window.prompt('Page Title');
          const url = window.prompt('URL or ID');
          if (title && url) {
            editor.chain().focus().deleteRange(range).setPageLink({ title, href: url }).run();
          }
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
        command: ({ editor, range }: any) => {
          const url = window.prompt('Image URL');
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
        command: ({ editor, range }: any) => {
          const url = window.prompt('YouTube URL');
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
        command: ({ editor, range }: any) => {
          const url = window.prompt('Audio URL');
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
        command: ({ editor, range }: any) => {
          const name = window.prompt('File Name', 'Untitled File');
          const url = window.prompt('File URL');
          if (name && url) {
            editor.chain().focus().deleteRange(range).setFile({ name, src: url }).run();
          }
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
