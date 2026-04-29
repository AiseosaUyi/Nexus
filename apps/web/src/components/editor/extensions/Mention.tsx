import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import tippy from 'tippy.js';

// Each editor instance gets its own PluginKey so the document editor and the
// inline comment composer don't fight over a shared suggestion plugin state.
let _mentionPluginCounter = 0;

export const Mention = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) return {};
          return { 'data-id': attributes.id };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) return {};
          return { 'data-label': attributes.label };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-mention]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span', 
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 
        'data-mention': '',
        class: 'bg-cta/10 text-cta font-bold rounded-sm px-1 py-0.5 border border-cta/20 cursor-pointer hover:bg-cta/20 transition-colors' 
      }), 
      `@${node.attrs.label}`
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label}`;
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey(`mention-${++_mentionPluginCounter}`);
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        pluginKey,
      }),
    ];
  },
});

// Internal Suggestion List Component. Reset selectedIndex when the items
// array identity changes (i.e. when query refines) so the highlight stays on
// the first match instead of going out of bounds.
const SuggestionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.name });
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (props.items.length === 0) return false;
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
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
      {props.items.map((item: any, index: number) => (
        <button
          key={item.id}
          type="button"
          // Prevent focus/blur from stealing selection from the editor before
          // command() can fire — without this, clicking the item dismissed the
          // popup without inserting the mention.
          onMouseDown={(e) => {
            e.preventDefault();
            selectItem(index);
          }}
          className={`flex w-full items-center text-left px-2 py-1.5 rounded transition-colors ${
            index === selectedIndex ? 'bg-hover text-foreground' : 'text-muted hover:bg-hover hover:text-foreground'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-cta/10 flex items-center justify-center text-[10px] font-bold text-cta mr-2 shrink-0">
             {item.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate text-foreground">{item.name}</div>
            {item.email && (
              <div className="text-[11px] truncate text-muted/70">{item.email}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

SuggestionList.displayName = 'SuggestionList';

export const mentionSuggestion = {
  // Critical: without a `command` here, the Suggestion plugin's default does
  // nothing when you click an item — the popup just dismisses. This handler
  // replaces the trigger range ("@que") with an actual mention node + a
  // trailing space so the cursor lands sensibly.
  command: ({ editor, range, props }: { editor: any; range: { from: number; to: number }; props: { id: string; label: string } }) => {
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        { type: 'mention', attrs: { id: props.id, label: props.label } },
        { type: 'text', text: ' ' },
      ])
      .run();
  },
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
