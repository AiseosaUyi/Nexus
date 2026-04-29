'use client';

import React from 'react';

// Renders a comment's stored content, which can be either:
//   - Legacy plain shape: { text: "hello" }
//   - Tiptap JSON: { type: "doc", content: [{ type: "paragraph", content: [...] }] }
// Walks Tiptap JSON and renders text + @mention chips. If a mention chip lost
// its label during a save round-trip, falls back to looking up the user in
// the supplied `members` map (id → { name }) so the chip never displays as
// the meaningless "@someone".

interface MemberInfo {
  name: string;
  email?: string | null;
}

interface CommentBodyProps {
  content: unknown;
  className?: string;
  members?: Record<string, MemberInfo>;
}

interface NodeLike {
  type?: string;
  text?: string;
  attrs?: { id?: string; label?: string };
  content?: NodeLike[];
}

function resolveMentionLabel(
  attrs: { id?: string; label?: string } | undefined,
  members: Record<string, MemberInfo> | undefined
): string {
  if (attrs?.label && typeof attrs.label === 'string' && attrs.label !== 'null') {
    return attrs.label;
  }
  if (attrs?.id && members?.[attrs.id]?.name) {
    return members[attrs.id].name;
  }
  if (attrs?.id && members?.[attrs.id]?.email) {
    return members[attrs.id].email!.split('@')[0];
  }
  return 'someone';
}

function renderNode(
  node: NodeLike,
  key: string,
  members?: Record<string, MemberInfo>
): React.ReactNode {
  if (!node || typeof node !== 'object') return null;

  if (typeof node.text === 'string') {
    return <span key={key}>{node.text}</span>;
  }

  if (node.type === 'mention') {
    const label = resolveMentionLabel(node.attrs, members);
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
    const children = node.content.map((c, i) => renderNode(c, `${key}-${i}`, members));
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

export default function CommentBody({ content, className, members }: CommentBodyProps) {
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
      {renderNode(content as NodeLike, 'root', members)}
    </div>
  );
}
