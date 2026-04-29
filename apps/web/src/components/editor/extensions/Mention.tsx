import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

// A small @-mention node. Two attributes (`id`, `label`) are persisted in
// the document JSON so chip rendering doesn't have to resolve through a
// separate users-by-id lookup. Each editor instance gets its own plugin key
// so the document editor and the inline comment composer don't collide.

let _mentionPluginCounter = 0;

interface MentionItem {
  id: string;
  name: string;
  email?: string | null;
}

export const Mention = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  // Both attributes are returned in JSON because they have no `default` —
  // ProseMirror's `node.toJSON()` only includes attrs whose key exists on
  // `this.attrs`, and explicit `null` plus parseHTML/renderHTML hooks force
  // each attr to be present on every instance.
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-id'),
        renderHTML: (attrs) =>
          attrs.id ? { 'data-id': attrs.id as string } : {},
      },
      label: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-label'),
        renderHTML: (attrs) =>
          attrs.label ? { 'data-label': attrs.label as string } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-mention]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = (node.attrs.label as string | null) ?? 'someone';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-mention': '',
        class:
          'bg-cta/10 text-cta font-bold rounded-sm px-1 py-0.5 border border-cta/20',
      }),
      `@${label}`,
    ];
  },

  renderText({ node }) {
    return `@${(node.attrs.label as string | null) ?? 'someone'}`;
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey(`mention-${++_mentionPluginCounter}`);
    return [
      Suggestion({
        editor: this.editor,
        char: '@',
        pluginKey,
        ...this.options.suggestion,
        // The command here is the source of truth for how a picked item
        // turns into an inserted node. We attach `id` and `label` directly
        // to the new node's attrs, then add a trailing space.
        command: ({ editor, range, props }: any) => {
          if (!props?.id || !props?.label) {
            console.warn('[Mention] missing id/label on insert', props);
            return;
          }
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'mention',
                attrs: { id: props.id, label: props.label },
              },
              { type: 'text', text: ' ' },
            ])
            .run();
        },
      }),
    ];
  },
});

const SuggestionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index] as MentionItem | undefined;
    if (!item) return;
    props.command({ id: item.id, label: item.name });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (props.items.length === 0) return false;
      if (event.key === 'ArrowUp') {
        setSelectedIndex(
          (selectedIndex + props.items.length - 1) % props.items.length
        );
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="z-[120] min-w-[180px] bg-background rounded-lg shadow-popover border border-border px-3 py-2 text-[12px] text-muted">
        No matches
      </div>
    );
  }

  return (
    <div className="z-[120] min-w-[200px] bg-background rounded-lg shadow-popover border border-border p-1 animate-in fade-in zoom-in-95 duration-100">
      {props.items.map((item: MentionItem, index: number) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            selectItem(index);
          }}
          className={`flex w-full items-center text-left px-2 py-1.5 rounded transition-colors ${
            index === selectedIndex
              ? 'bg-hover text-foreground'
              : 'text-muted hover:bg-hover hover:text-foreground'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-cta/10 flex items-center justify-center text-[10px] font-bold text-cta mr-2 shrink-0">
            {item.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate text-foreground">
              {item.name}
            </div>
            {item.email && (
              <div className="text-[11px] truncate text-muted/70">
                {item.email}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

SuggestionList.displayName = 'SuggestionList';

export const mentionSuggestion = {
  render: () => {
    let component: any;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SuggestionList, {
          props,
          editor: props.editor,
        });
        if (!props.clientRect) return;
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
        if (!props.clientRect) return;
        popup[0].setProps({ getReferenceClientRect: props.clientRect });
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
