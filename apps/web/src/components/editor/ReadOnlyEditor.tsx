'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Typography } from '@tiptap/extension-typography';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Youtube } from '@tiptap/extension-youtube';

interface ReadOnlyEditorProps {
  content: any;
}

export default function ReadOnlyEditor({ content }: ReadOnlyEditorProps) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TiptapTable.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      Typography,
      HorizontalRule,
      Youtube,
    ],
    content,
  });

  return (
    <EditorContent
      editor={editor}
      className="prose prose-neutral dark:prose-invert max-w-none focus:outline-none"
    />
  );
}
