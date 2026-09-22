// ProseMirror/Tiptap JSON -> Markdown. Deterministic (no LLM, no
// randomness) so nexus_read_doc and appendToNode's round-trip tests are
// reproducible. markdownToProseMirror (the reverse direction) reuses
// lib/markdownToTiptap.ts directly rather than re-implementing a parser —
// that file is already a pure, DOM-free string parser.

import { markdownToTiptap } from '@/lib/markdownToTiptap';

export interface TiptapJSONNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapJSONNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface TiptapDoc {
  type: 'doc';
  content: TiptapJSONNode[];
}

function renderMarks(text: string, marks: TiptapJSONNode['marks'] = []): string {
  let out = text;
  for (const mark of marks) {
    if (mark.type === 'bold') out = `**${out}**`;
    else if (mark.type === 'italic') out = `_${out}_`;
    else if (mark.type === 'code') out = `\`${out}\``;
    else if (mark.type === 'strike') out = `~~${out}~~`;
    else if (mark.type === 'link') out = `[${out}](${mark.attrs?.href ?? ''})`;
    // Unknown marks (e.g. `comment`) intentionally drop their wrapping —
    // the underlying text still comes through.
  }
  return out;
}

function renderInline(nodes: TiptapJSONNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return renderMarks(node.text ?? '', node.marks);
      if (node.type === 'hardBreak') return '\n';
      if (node.type === 'pageLink') {
        const title = (node.attrs?.title as string) ?? 'Untitled';
        const id = (node.attrs?.nodeId as string) ?? '';
        return `[${title}](nexus://node/${id})`;
      }
      if (node.type === 'mention') return `@${(node.attrs?.label as string) ?? ''}`;
      // Unknown inline node — fall back to its own text content, if any.
      return node.text ?? renderInline(node.content);
    })
    .join('');
}

function renderListItem(item: TiptapJSONNode, ordered: boolean, index: number, indent: string): string {
  const marker = ordered ? `${index}.` : '-';
  const isTask = item.type === 'taskItem';
  const checkbox = isTask ? (item.attrs?.checked ? '[x] ' : '[ ] ') : '';
  const lines = (item.content ?? []).map((child) => renderBlock(child, indent + '  ')).filter(Boolean);
  const [first, ...rest] = lines;
  const firstLine = `${indent}${marker} ${checkbox}${(first ?? '').trimStart()}`;
  return [firstLine, ...rest].join('\n');
}

function renderTable(node: TiptapJSONNode): string {
  const rows = (node.content ?? []).filter((r) => r.type === 'tableRow');
  if (rows.length === 0) return '';
  const cellText = (cell: TiptapJSONNode) =>
    (cell.content ?? []).map((p) => renderInline(p.content)).join(' ').trim();
  const rendered = rows.map((row) => (row.content ?? []).map(cellText));
  const colCount = rendered[0]?.length ?? 0;
  const lines = [
    `| ${rendered[0]?.join(' | ') ?? ''} |`,
    `| ${Array(colCount).fill('---').join(' | ')} |`,
    ...rendered.slice(1).map((r) => `| ${r.join(' | ')} |`),
  ];
  return lines.join('\n');
}

function renderBlock(node: TiptapJSONNode, indent = ''): string {
  switch (node.type) {
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
      return `${indent}${'#'.repeat(level)} ${renderInline(node.content)}`;
    }
    case 'paragraph':
      return `${indent}${renderInline(node.content)}`;
    case 'bulletList':
      return (node.content ?? []).map((item, i) => renderListItem(item, false, i + 1, indent)).join('\n');
    case 'orderedList':
      return (node.content ?? []).map((item, i) => renderListItem(item, true, i + 1, indent)).join('\n');
    case 'taskList':
      return (node.content ?? []).map((item, i) => renderListItem(item, false, i + 1, indent)).join('\n');
    case 'blockquote':
      return (node.content ?? [])
        .map((child) => renderBlock(child))
        .join('\n')
        .split('\n')
        .map((line) => `${indent}> ${line}`)
        .join('\n');
    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? '';
      const code = (node.content ?? []).map((t) => t.text ?? '').join('');
      return `${indent}\`\`\`${lang}\n${code}\n${indent}\`\`\``;
    }
    case 'horizontalRule':
      return `${indent}---`;
    case 'table':
      return renderTable(node);
    case 'callout': {
      const body = (node.content ?? []).map((child) => renderBlock(child)).join('\n');
      return `${indent}> **Note**\n${body
        .split('\n')
        .map((line) => `${indent}> ${line}`)
        .join('\n')}`;
    }
    default:
      // Unknown block node (audio, file, youtube, details, ...) — fall
      // back to its text content so nothing silently disappears.
      if (node.content) return node.content.map((child) => renderBlock(child, indent)).join('\n');
      return node.text ? `${indent}${node.text}` : '';
  }
}

export function proseMirrorToMarkdown(doc: TiptapDoc | TiptapJSONNode): string {
  const content = 'content' in doc ? doc.content ?? [] : [];
  return content
    .map((node) => renderBlock(node))
    .filter((line) => line.length > 0)
    .join('\n\n');
}

/** Reuses the existing pure-string Markdown parser rather than
 * re-implementing it — see lib/markdownToTiptap.ts's own header comment. */
export function markdownToProseMirror(markdown: string): TiptapDoc {
  return markdownToTiptap(markdown) as TiptapDoc;
}
