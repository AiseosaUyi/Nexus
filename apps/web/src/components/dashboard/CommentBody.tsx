'use client';

import React from 'react';

// Renders a comment's stored content, which can be either:
//   - Legacy plain shape: { text: "hello" }
//   - Tiptap JSON: { type: "doc", content: [{ type: "paragraph", content: [...] }] }
// Walks Tiptap JSON and renders text + @mention chips. Doesn't try to match
// the editor's full rendering — comments are short, single-paragraph things.

interface CommentBodyProps {
  content: unknown;
  className?: string;
}

interface NodeLike {
  type?: string;
  text?: string;
  attrs?: { id?: string; label?: string };
  content?: NodeLike[];
}

function renderNode(node: NodeLike, key: string): React.ReactNode {
  if (!node || typeof node !== 'object') return null;

  if (typeof node.text === 'string') {
    return <span key={key}>{node.text}</span>;
  }

  if (node.type === 'mention') {
    const label = node.attrs?.label || 'someone';
    return (
      <span
        key={key}
        className="inline-flex items-center px-1 py-0.5 rounded bg-cta/15 text-cta border border-cta/30 text-[12px] font-bold mx-0.5"
      >
        @{label}
      </span>
    );
  }

  if (Array.isArray(node.content)) {
    const children = node.content.map((c, i) => renderNode(c, `${key}-${i}`));
    if (node.type === 'paragraph') {
      return (
        <p key={key} className="m-0">
          {children}
        </p>
      );
    }
    return <React.Fragment key={key}>{children}</React.Fragment>;
  }

  return null;
}

export default function CommentBody({ content, className }: CommentBodyProps) {
  // Legacy { text: "..." } shape
  if (
    content &&
    typeof content === 'object' &&
    typeof (content as { text?: unknown }).text === 'string'
  ) {
    const text = (content as { text: string }).text;
    return (
      <p className={className ?? 'm-0 whitespace-pre-wrap break-words'}>{text}</p>
    );
  }

  // Tiptap JSON shape
  return (
    <div className={className ?? 'text-[13px] leading-relaxed text-foreground/85 break-words space-y-1'}>
      {renderNode(content as NodeLike, 'root')}
    </div>
  );
}
