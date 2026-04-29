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
import { Table as TiptapTable } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Typography } from '@tiptap/extension-typography';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { Details } from '@tiptap/extension-details';
import { DetailsContent } from '@tiptap/extension-details-content';
import { DetailsSummary } from '@tiptap/extension-details-summary';
import { Youtube } from '@tiptap/extension-youtube';
import { Callout } from './extensions/Callout';
import { Audio } from './extensions/Audio';
import { File } from './extensions/File';
import { PageLink } from './extensions/PageLink';
import { Comment } from './extensions/Comment';
import { Mention, mentionSuggestion } from './extensions/Mention';
import { BlockType } from '@nexus/api/schema';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { syncBlocks, updateYjsSnapshot } from '@/app/(dashboard)/w/[workspace_slug]/actions';
import { useDebouncedCallback } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { SupabaseYjsProvider } from '@/lib/realtime/SupabaseYjsProvider';
import AIBubbleMenu from './AIBubbleMenu';
import AIPromptBar from './AIPromptBar';
import BlockPickerPanel from './BlockPickerPanel';
import { Bold, Italic, Strikethrough, Code, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// Walks the editor doc, collects every threadId present on a Comment mark,
// and dispatches `nexus:thread-ids`. CommentSidebar uses this to flag orphan
// threads (rows in DB whose text was deleted from the doc).
function broadcastThreadIds(editor: { state: { doc: { descendants: (cb: (n: any) => void) => void } } }) {
  const ids = new Set<string>();
  editor.state.doc.descendants((node: any) => {
    if (!node.marks) return;
    for (const mark of node.marks) {
      if (mark.type?.name === 'comment' && typeof mark.attrs?.threadId === 'string') {
        ids.add(mark.attrs.threadId);
      }
    }
  });
  window.dispatchEvent(
    new CustomEvent('nexus:thread-ids', { detail: { threadIds: Array.from(ids) } })
  );
}

interface NexusEditorProps {
  initialContent?: any;
  initialSnapshot?: Uint8Array | null;
  nodeId: string;
  userName: string;
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
  userName,
  userColor = '#2383e2',
  onChange
}: NexusEditorProps) {
  const supabase = createClient();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isAIPromptOpen, setIsAIPromptOpen] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition | null>(null);
  const [blockHandleTop, setBlockHandleTop] = useState<number | null>(null);
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  const hoveredBlockEl = useRef<HTMLElement | null>(null);
  
  // 1. Initialize Yjs Doc and Provider
  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    if (initialSnapshot) {
      try {
        const raw: unknown = initialSnapshot;
        let bytes: Uint8Array | null = null;

        if (typeof raw === 'string' && raw.length > 0) {
          // Try hex format first: \x010203... (PostgreSQL hex output)
          const hexCandidate = raw.startsWith('\\x') ? raw.slice(2) : raw;
          if (hexCandidate.length > 0 && hexCandidate.length % 2 === 0 && /^[0-9a-f]+$/i.test(hexCandidate)) {
            bytes = new Uint8Array(hexCandidate.length / 2);
            for (let i = 0; i < bytes.length; i++) {
              bytes[i] = parseInt(hexCandidate.slice(i * 2, i * 2 + 2), 16);
            }
          } else {
            // Try base64 (PostgREST may return bytea as base64)
            try {
              const binary = atob(raw);
              bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            } catch {
              // Not base64 either — ignore
            }
          }
        } else if (raw instanceof Uint8Array) {
          bytes = raw;
        } else if (Array.isArray(raw)) {
          bytes = new Uint8Array(raw as number[]);
        }

        if (bytes && bytes.length > 0) {
          Y.applyUpdate(doc, bytes);
          // Log the structure of the loaded content for debugging
          const frag = doc.getXmlFragment('default');
          const nodeNames: string[] = [];
          const walk = (el: any) => { if (el.nodeName) nodeNames.push(el.nodeName); if (el.toArray) el.toArray().forEach(walk); };
          walk(frag);
          console.log('[NexusEditor] Snapshot loaded:', { bytes: bytes.length, fragmentLength: frag.length, nodeNames });
        }
      } catch (e) {
        console.error('[NexusEditor] Failed to decode snapshot:', e);
      }
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
    const typeMap: Record<string, string> = {
      bulletList: 'list', orderedList: 'list', taskList: 'list',
      blockquote: 'quote', codeBlock: 'code', horizontalRule: 'divider',
    };
    const skipTypes = new Set(['listItem', 'taskItem', 'tableRow', 'tableCell', 'tableHeader']);
    const blockPayloads = (json.content || [])
      .filter((node: any) => !skipTypes.has(node.type))
      .map((node: any, index: number) => ({
        type: (typeMap[node.type] || node.type) as BlockType,
        content: { tiptapType: node.type, attrs: node.attrs || {}, content: node.content || [] },
        position: index,
      }));
    await syncBlocks(nodeId, blockPayloads);
  }, 30000);

  // 4. Build the editor first so effects can reference it
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ 
        history: false,
        heading: { levels: [1, 2, 3, 4] }
      } as any),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
          return "Type '/' for commands, or ⌘J for AI...";
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: 'text-[#2383e2] hover:underline cursor-pointer' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Details,
      DetailsSummary,
      DetailsContent,
      Callout,
      Audio,
      File,
      PageLink,
      Comment.configure({
        HTMLAttributes: {
          onClick: (e: any) => {
             const threadId = e.target.getAttribute('data-thread-id');
             if (threadId) {
                // We'll dispatch a custom event that NodePage can listen to
                window.dispatchEvent(new CustomEvent('nexus:open-comment', { detail: { threadId } }));
             }
          }
        }
      }),
      Mention.configure({
        suggestion: {
          ...mentionSuggestion,
          char: '@',
          items: async ({ query }: { query: string }) => {
             const businessIdMatch = window.location.pathname.match(/\/w\/([^\/]+)/);
             if (!businessIdMatch) return [];
             try {
               const { getTeamMembers } = require('@/app/(dashboard)/w/[workspace_slug]/actions');
               const { data } = await getTeamMembers(businessIdMatch[1]);
               const items = data || [];
               // Add a fallback for testing if no members
               if (items.length === 0) {
                 items.push({ id: 'nexus-ai', name: 'Nexus AI', email: 'ai@nexus.so' });
               }
               return items.filter((item: any) => item.name.toLowerCase().startsWith(query.toLowerCase()));
             } catch (err) {
               console.error('Error fetching members:', err);
               return [{ id: 'nexus-ai', name: 'Nexus AI', email: 'ai@nexus.so' }];
             }
          }
        }
      }),
      Youtube.configure({
        controls: false,
        nocookie: true,
      }),
      SlashCommand.configure({ suggestion }),
      TiptapTable.configure({ resizable: true }),
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
      broadcastThreadIds(editor);
    },
  }, [ydoc]);

  // 5. Fallback: if Y.Doc is empty but we have initialContent, populate via setContent.
  // The Collaboration ySyncPlugin will sync the PM transaction into the Y.Doc automatically.
  const didApplyFallback = useRef(false);
  useEffect(() => {
    if (!editor || didApplyFallback.current) return;
    const fragment = ydoc.getXmlFragment('default');
    if (fragment.length === 0 && initialContent?.content?.length > 0) {
      // Check if initialContent has actual nodes (not just an empty paragraph)
      const hasRealContent = initialContent.content.some(
        (n: any) => n.type !== 'paragraph' || (n.content && n.content.length > 0)
      );
      if (hasRealContent) {
        didApplyFallback.current = true;
        // Use requestAnimationFrame to ensure the editor + ySyncPlugin is fully mounted
        requestAnimationFrame(() => {
          if (!editor.isDestroyed) {
            editor.commands.setContent(initialContent);
            // Trigger a snapshot save so the content persists
            debouncedSnapshotSave();
          }
        });
      }
    }
  }, [editor, ydoc, initialContent, debouncedSnapshotSave]);

  // 6. Presence Tracking
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

  // 7. Cmd+J to toggle AI Prompt Bar / Cmd+S to force-save
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
      e.preventDefault();
      setIsAIPromptOpen(prev => !prev);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('nexus:saving'));
      debouncedSnapshotSave.flush();
    }
  }, [debouncedSnapshotSave]);

  useEffect(() => {
    const handleApplyComment = (e: any) => {
      const { threadId } = e.detail;
      if (threadId && editor) {
        editor.chain().focus().setComment({ threadId }).run();
      }
    };
    const handleScrollToThread = (e: any) => {
      const { threadId } = e.detail;
      if (!threadId || !editor) return;
      // Find the DOM element rendered by the Comment mark.
      const root = editorRef.current;
      if (!root) return;
      const el = root.querySelector(`span[data-thread-id="${CSS.escape(threadId)}"]`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('nexus-comment-flash');
      window.setTimeout(() => el.classList.remove('nexus-comment-flash'), 1400);
    };
    window.addEventListener('nexus:apply-comment', handleApplyComment);
    window.addEventListener('nexus:scroll-to-thread', handleScrollToThread);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('nexus:apply-comment', handleApplyComment);
      window.removeEventListener('nexus:scroll-to-thread', handleScrollToThread);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, handleKeyDown]);

  // Broadcast the set of comment-mark threadIds present in the document so
  // CommentSidebar can detect orphaned threads (text deleted but thread row
  // still exists).
  useEffect(() => {
    if (!editor) return;
    broadcastThreadIds(editor);
    // Re-broadcast after collaborative updates from Yjs as well — onUpdate
    // covers local edits but Yjs sync from another tab needs this hook.
    const handler = () => broadcastThreadIds(editor);
    editor.on('transaction', handler);
    return () => {
      editor.off('transaction', handler);
    };
  }, [editor]);

  // 8. Cleanup
  useEffect(() => {
    return () => { provider.destroy(); };
  }, [provider]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    const proseMirror = editorRef.current.querySelector('.ProseMirror');
    if (!proseMirror) return;

    let el = e.target as HTMLElement;
    while (el && el !== proseMirror) {
      if (el.parentElement === proseMirror) {
        const containerRect = editorRef.current.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        setBlockHandleTop(elRect.top - containerRect.top + elRect.height / 2 - 10);
        hoveredBlockEl.current = el;
        return;
      }
      el = el.parentElement as HTMLElement;
    }
    // Mouse is over the ProseMirror padding/margin — keep the last handle position.
    // Only onMouseLeave clears it when the cursor fully exits the editor area.
  }, []);

  const handleBlockAdd = useCallback(() => {
    if (!editor) return;
    const view = editor.view;

    if (hoveredBlockEl.current) {
      try {
        const elRect = hoveredBlockEl.current.getBoundingClientRect();
        const posInfo = view.posAtCoords({ left: elRect.left + 2, top: elRect.top + 2 });
        if (posInfo) {
          const $pos = view.state.doc.resolve(posInfo.pos);
          const node = $pos.node($pos.depth);
          const isBlockEmpty = node.content.size === 0;

          if (isBlockEmpty) {
            // Block is empty — just place cursor there so the picker converts it
            const start = $pos.start($pos.depth);
            editor.chain().focus().setTextSelection(start).run();
          } else {
            // Block has content — insert a new empty paragraph below
            const nodeEnd = $pos.end($pos.depth);
            const insertAt = Math.min(nodeEnd + 1, view.state.doc.content.size);
            editor.chain()
              .focus()
              .insertContentAt(insertAt, { type: 'paragraph' })
              .setTextSelection(insertAt + 1)
              .run();
          }
        }
      } catch {
        editor.chain().focus().insertContent({ type: 'paragraph' }).run();
      }
    } else {
      editor.chain().focus().insertContent({ type: 'paragraph' }).run();
    }
    setBlockPickerOpen(true);
  }, [editor]);

  return (
    <div
      className="w-full relative md:pl-[48px] md:-ml-[48px]"
      ref={editorRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setBlockHandleTop(null);
        hoveredBlockEl.current = null;
      }}
    >
      {/* Block add handle — only on larger screens with hover */}
      {blockHandleTop !== null && (
        <button
          data-block-handle
          style={{ top: blockHandleTop, left: 8 }}
          onMouseDown={(e) => {
            e.preventDefault();
            handleBlockAdd();
          }}
          className="absolute hidden md:flex items-center justify-center w-5 h-5 rounded text-foreground/30 hover:text-foreground/70 hover:bg-hover transition-colors z-10"
          title="Click to add a block below"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Block picker panel — opens when "+" is clicked */}
      {blockPickerOpen && (
        <BlockPickerPanel
          style={{ position: 'absolute', top: (blockHandleTop ?? 0) + 24, left: 32, zIndex: 50 }}
          onSelect={(apply) => {
            setBlockPickerOpen(false);
            if (editor) apply(editor);
          }}
          onClose={() => setBlockPickerOpen(false)}
        />
      )}

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
