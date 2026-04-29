'use client';

// Lightweight Tiptap editor used as the inline comment composer. Keeps just
// the extensions we need for a comment: paragraph + text + Enter-to-send +
// `@` mentions backed by getTeamMembers. Replaces the plain <textarea> so
// users can mention teammates inline.

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Mention, mentionSuggestion } from './extensions/Mention';
import { useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

export interface CommentComposerHandle {
  focus: () => void;
  clear: () => void;
  getJSON: () => unknown;
  isEmpty: () => boolean;
}

interface CommentComposerProps {
  placeholder?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  className?: string;
  autoFocus?: boolean;
  initialContent?: unknown;
}

const CommentComposer = forwardRef<CommentComposerHandle, CommentComposerProps>(
  function CommentComposer(
    {
      placeholder = 'Add a comment…',
      onSubmit,
      onCancel,
      className,
      autoFocus = true,
      initialContent,
    },
    ref
  ) {
    const editor = useEditor({
      immediatelyRender: false,
      content: initialContent && typeof initialContent === 'object' ? initialContent : undefined,
      extensions: [
        StarterKit.configure({
          // Comments are flat — no headings/lists/blockquotes/etc.
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          history: { depth: 50 },
        } as any),
        Placeholder.configure({ placeholder }),
        Mention.configure({
          suggestion: {
            ...mentionSuggestion,
            char: '@',
            items: async ({ query }: { query: string }) => {
              const businessIdMatch = window.location.pathname.match(/\/w\/([^\/]+)/);
              if (!businessIdMatch) return [];
              try {
                const { getTeamMembers } = await import(
                  '@/app/(dashboard)/w/[workspace_slug]/actions'
                );
                // The workspace_slug in the URL is the slug, not the businessId,
                // so we have to look up businessId via the slug. Cache lookup
                // by attaching it to the document body once per session.
                const slug = businessIdMatch[1];
                const cached = (window as any).__nexusBusinessIdBySlug?.[slug] as
                  | string
                  | undefined;
                let businessId = cached;
                if (!businessId) {
                  const { createClient } = await import('@/lib/supabase/client');
                  const supabase = createClient();
                  const { data } = await supabase
                    .from('businesses')
                    .select('id')
                    .eq('slug', slug)
                    .single();
                  businessId = data?.id;
                  if (businessId) {
                    (window as any).__nexusBusinessIdBySlug = {
                      ...((window as any).__nexusBusinessIdBySlug || {}),
                      [slug]: businessId,
                    };
                  }
                }
                if (!businessId) return [];
                const { data } = await getTeamMembers(businessId);
                const items = data || [];
                const q = query.toLowerCase();
                return items.filter(
                  (item: { name: string; email: string }) =>
                    item.name.toLowerCase().includes(q) ||
                    item.email?.toLowerCase().includes(q)
                );
              } catch (err) {
                console.error('[CommentComposer] member lookup failed:', err);
                return [];
              }
            },
          },
        }),
      ],
      editorProps: {
        attributes: {
          class:
            'prose prose-sm max-w-none focus:outline-none min-h-[44px] text-foreground text-sm leading-snug',
        },
        handleKeyDown(_view, event) {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit?.();
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel?.();
            return true;
          }
          return false;
        },
      },
    });

    useEffect(() => {
      if (autoFocus && editor) {
        requestAnimationFrame(() => editor.commands.focus('end'));
      }
    }, [autoFocus, editor]);

    const focus = useCallback(() => editor?.commands.focus(), [editor]);
    const clear = useCallback(() => editor?.commands.clearContent(true), [editor]);
    // editor.getJSON() can drop a custom mention node's attrs depending on
    // schema/extension wiring. Build the JSON ourselves from the live PM doc
    // so attrs.id and attrs.label always make it through.
    const getJSON = useCallback(() => {
      if (!editor) return null;
      const serialize = (node: any): any => {
        const out: any = { type: node.type.name };
        if (node.attrs && Object.keys(node.attrs).length) {
          // Drop null/undefined values so the JSON stays compact, but keep
          // anything else so mention id/label survive.
          const cleanAttrs: Record<string, unknown> = {};
          for (const k of Object.keys(node.attrs)) {
            const v = node.attrs[k];
            if (v !== null && v !== undefined) cleanAttrs[k] = v;
          }
          if (Object.keys(cleanAttrs).length) out.attrs = cleanAttrs;
        }
        if (node.isText) {
          out.text = node.text;
          if (node.marks?.length) {
            out.marks = node.marks.map((m: any) => {
              const mo: any = { type: m.type.name };
              if (m.attrs && Object.keys(m.attrs).length) {
                mo.attrs = { ...m.attrs };
              }
              return mo;
            });
          }
          return out;
        }
        if (node.content?.size) {
          const children: any[] = [];
          node.content.forEach((c: any) => children.push(serialize(c)));
          out.content = children;
        }
        return out;
      };
      return serialize(editor.state.doc);
    }, [editor]);
    const isEmpty = useCallback(() => {
      if (!editor) return true;
      return editor.isEmpty;
    }, [editor]);

    useImperativeHandle(ref, () => ({ focus, clear, getJSON, isEmpty }), [
      focus,
      clear,
      getJSON,
      isEmpty,
    ]);

    return <EditorContent editor={editor} className={className} />;
  }
);

export default CommentComposer;
