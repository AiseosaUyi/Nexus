'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { SlashCommand, suggestion } from './extensions/SlashCommand';
import { useEffect, useCallback } from 'react';

interface MiniEditorProps {
  content?: string;
  placeholder?: string;
  onChange?: (text: string, json: any) => void;
  autoFocus?: boolean;
}

export default function MiniEditor({ content, placeholder, onChange, autoFocus }: MiniEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
          return placeholder || "Type '/' for commands...";
        },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, allowBase64: true }),
      SlashCommand.configure({ suggestion }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getText(), editor.getJSON());
      }
    },
  });

  useEffect(() => {
    if (autoFocus && editor) {
      setTimeout(() => editor.commands.focus('end'), 100);
    }
  }, [autoFocus, editor]);

  return (
    <EditorContent
      editor={editor}
      className="tiptap text-[14px] text-foreground/75 leading-relaxed min-h-[80px] w-full outline-none"
    />
  );
}
