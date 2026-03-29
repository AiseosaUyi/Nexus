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
import { BlockType } from '@nexus/api/schema';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { syncBlocks, updateYjsSnapshot } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useDebouncedCallback } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { SupabaseYjsProvider } from '@/lib/realtime/SupabaseYjsProvider';
import AIBubbleMenu from './AIBubbleMenu';
import AIPromptBar from './AIPromptBar';
import { Bold, Italic, Strikethrough, Code } from 'lucide-react';

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
      // @ts-ignore — Tiptap v2/v3 peer mismatch; works correctly at runtime
      Collaboration.configure({ document: ydoc }),
      // @ts-ignore
      CollaborationCursor.configure({ provider, user: { name: userName, color: userColor } }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none min-h-[500px] w-full max-w-none font-sans text-[#37352f] px-12 md:px-24 py-20',
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
          className="absolute z-50 flex items-center gap-0.5 bg-white rounded-xl shadow-xl border border-slate-100 p-1 -translate-x-1/2 -translate-y-full"
          onMouseDown={e => e.preventDefault()}
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors ${editor.isActive('bold') ? 'bg-slate-100 text-slate-900 font-bold' : ''}`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors ${editor.isActive('italic') ? 'bg-slate-100 text-slate-900' : ''}`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors ${editor.isActive('strike') ? 'bg-slate-100 text-slate-900' : ''}`}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors ${editor.isActive('code') ? 'bg-slate-100 text-slate-900' : ''}`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
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
