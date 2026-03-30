'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { SlashCommand, suggestion } from './extensions/SlashCommand';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Typography } from '@tiptap/extension-typography';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { BlockType } from '@nexus/api/schema';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { syncBlocks, updateYjsSnapshot } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useDebouncedCallback } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { SupabaseYjsProvider } from '@/lib/realtime/SupabaseYjsProvider';
import AIBubbleMenu from './AIBubbleMenu';
import AIPromptBar from './AIPromptBar';
import { Bold, Italic, Strikethrough, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NexusEditorProps {
  initialContent?: any;
  initialSnapshot?: Uint8Array | null;
  nodeId: string;
  userName?: string;
  userColor?: string;
  onChange?: (json: any) => void;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

export default function NexusEditor({ 
  initialContent, 
  initialSnapshot,
  nodeId, 
  userName = 'Anonymous',
  userColor = '#2383e2',
  onChange 
}: NexusEditorProps) {
  const supabase = createClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isAIPromptOpen, setIsAIPromptOpen] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition | null>(null);
  
  // 1. Initialize Yjs Doc and Provider
  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    if (initialSnapshot && initialSnapshot.length > 0) {
      Y.applyUpdate(doc, initialSnapshot);
    }
    return doc;
  }, [initialSnapshot]);

  const provider = useMemo(() => new SupabaseYjsProvider({
    channelName: `node:${nodeId}`,
    supabase,
    doc: ydoc,
  }), [nodeId, supabase, ydoc]);

  // 2. Debounced Binary Sync (every 10s of inactivity)
  const debouncedSnapshotSave = useDebouncedCallback(async () => {
    const snapshot = Y.encodeStateAsUpdate(ydoc);
    await updateYjsSnapshot(nodeId, Array.from(snapshot));
  }, 10000);

  // 3. Debounced Block Sync (every 30s for search indexing)
  const debouncedBlockSync = useDebouncedCallback(async (json: any) => {
    const blockPayloads = (json.content || []).map((node: any, index: number) => ({
      type: node.type as BlockType,
      content: { attrs: node.attrs || {}, content: node.content || [] },
      position: index,
    }));
    await syncBlocks(nodeId, blockPayloads);
  }, 30000);

  // 4. Build the editor first so effects can reference it
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false } as any),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
          return "Type '/' for commands, or ⌘J for AI...";
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[#2383e2] hover:underline cursor-pointer' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      SlashCommand.configure({ suggestion }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: false, allowBase64: true }),
      Typography,
      HorizontalRule.configure({
        HTMLAttributes: { class: 'my-8 border-t border-border/20' },
      }),
      // @ts-ignore — Tiptap v2/v3 peer mismatch; works correctly at runtime
      Collaboration.configure({ document: ydoc }),
      // @ts-ignore
      CollaborationCursor.configure({ provider, user: { name: userName, color: userColor } }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg focus:outline-none min-h-[500px] w-full max-w-none font-sans text-foreground selection:bg-accent/30',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange?.(json);
      debouncedSnapshotSave();
      debouncedBlockSync(json);
    },
  }, [ydoc]);

  // 5. Presence Tracking
  useEffect(() => {
    if (provider) {
      provider.setPresence({ userId: 'temp-id', name: userName, color: userColor });
    }
  }, [provider, userName, userColor]);

  // 6. Track selection for floating toolbar position
  useEffect(() => {
    if (!editor) return;
    const updateToolbar = () => {
      const { from, to } = editor.state.selection;
      if (from === to) { setToolbarPos(null); return; }
      const domSel = window.getSelection();
      if (!domSel || domSel.rangeCount === 0) return;
      const rect = domSel.getRangeAt(0).getBoundingClientRect();
      const container = editorRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      setToolbarPos({
        top: rect.top - containerRect.top - 8,
        left: rect.left - containerRect.left + rect.width / 2,
      });
    };
    editor.on('selectionUpdate', updateToolbar);
    editor.on('blur', () => setToolbarPos(null));
    return () => { editor.off('selectionUpdate', updateToolbar); };
  }, [editor]);

  // 7. Cmd+J to toggle AI Prompt Bar
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
      e.preventDefault();
      setIsAIPromptOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 8. Cleanup
  useEffect(() => {
    return () => { provider.destroy(); };
  }, [provider]);

  return (
    <div className="w-full relative" ref={editorRef}>
      {/* Custom Floating Toolbar (shown when text is selected) */}
      {editor && toolbarPos && (
        <div
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
          className="absolute z-50 flex items-center gap-0.5 bg-background rounded-lg shadow-popover border border-border p-0.5 -translate-x-1/2 -translate-y-full mb-2 animate-in fade-in zoom-in-95"
          onMouseDown={e => e.preventDefault()}
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center text-muted hover:bg-hover transition-colors",
              editor.isActive('bold') && "bg-active text-foreground font-bold"
            )}
          >
            <Bold className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center text-muted hover:bg-hover transition-colors",
              editor.isActive('italic') && "bg-active text-foreground"
            )}
          >
            <Italic className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center text-muted hover:bg-hover transition-colors",
              editor.isActive('strike') && "bg-active text-foreground"
            )}
          >
            <Strikethrough className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn(
              "w-7 h-7 rounded flex items-center justify-center text-muted hover:bg-hover transition-colors",
              editor.isActive('code') && "bg-active text-foreground"
            )}
          >
            <Code className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <AIBubbleMenu editor={editor} />
        </div>
      )}

      <EditorContent editor={editor} />

      {/* AI Prompt Bar (⌘J) */}
      {editor && (
        <AIPromptBar
          editor={editor}
          isOpen={isAIPromptOpen}
          onClose={() => setIsAIPromptOpen(false)}
        />
      )}
    </div>
  );
}
