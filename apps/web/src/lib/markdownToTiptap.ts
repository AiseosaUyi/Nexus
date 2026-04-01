/**
 * Converts Markdown text to Tiptap JSON document format.
 * Handles: headings, paragraphs, bullet/ordered/task lists,
 * blockquotes, fenced code blocks, horizontal rules,
 * and inline: bold, italic, inline code, links.
 */

type TiptapMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'code' }
  | { type: 'strike' }
  | { type: 'link'; attrs: { href: string; target: string } };

interface TiptapTextNode {
  type: 'text';
  text: string;
  marks?: TiptapMark[];
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: (TiptapNode | TiptapTextNode)[];
  text?: string;
  marks?: TiptapMark[];
}

// ─── Inline parser ────────────────────────────────────────────────────────────

function addMarks(node: TiptapTextNode, extra: TiptapMark[]): TiptapTextNode {
  const existing = node.marks ?? [];
  return { ...node, marks: [...existing, ...extra] };
}

export function parseInline(raw: string): TiptapTextNode[] {
  const nodes: TiptapTextNode[] = [];
  let i = 0;
  let buf = '';

  const flush = () => {
    if (buf) { nodes.push({ type: 'text', text: buf }); buf = ''; }
  };

  while (i < raw.length) {
    const ch = raw[i];

    // Link: [text](url)
    if (ch === '[') {
      const closeBracket = raw.indexOf(']', i + 1);
      if (closeBracket !== -1 && raw[closeBracket + 1] === '(') {
        const closeParen = raw.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          flush();
          const linkText = raw.slice(i + 1, closeBracket);
          const href = raw.slice(closeBracket + 2, closeParen);
          nodes.push({
            type: 'text',
            text: linkText,
            marks: [{ type: 'link', attrs: { href, target: '_blank' } }],
          });
          i = closeParen + 1;
          continue;
        }
      }
    }

    // Bold: **text** or __text__
    const bold2 = raw.slice(i, i + 2);
    if (bold2 === '**' || bold2 === '__') {
      const end = raw.indexOf(bold2, i + 2);
      if (end !== -1) {
        flush();
        const inner = parseInline(raw.slice(i + 2, end));
        inner.forEach((n) => nodes.push(addMarks(n, [{ type: 'bold' }])));
        i = end + 2;
        continue;
      }
    }

    // Italic: *text* or _text_ (single, not double)
    if ((ch === '*' || ch === '_') && raw[i + 1] !== ch) {
      const end = raw.indexOf(ch, i + 1);
      if (end !== -1) {
        flush();
        const inner = parseInline(raw.slice(i + 1, end));
        inner.forEach((n) => nodes.push(addMarks(n, [{ type: 'italic' }])));
        i = end + 1;
        continue;
      }
    }

    // Strikethrough: ~~text~~
    if (raw.slice(i, i + 2) === '~~') {
      const end = raw.indexOf('~~', i + 2);
      if (end !== -1) {
        flush();
        const inner = parseInline(raw.slice(i + 2, end));
        inner.forEach((n) => nodes.push(addMarks(n, [{ type: 'strike' }])));
        i = end + 2;
        continue;
      }
    }

    // Inline code: `code`
    if (ch === '`') {
      const end = raw.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        nodes.push({ type: 'text', text: raw.slice(i + 1, end), marks: [{ type: 'code' }] });
        i = end + 1;
        continue;
      }
    }

    buf += ch;
    i++;
  }

  flush();
  return nodes;
}

// ─── Block parser ─────────────────────────────────────────────────────────────

function makeListItem(innerText: string): TiptapNode {
  return {
    type: 'listItem',
    content: [{ type: 'paragraph', content: parseInline(innerText) }],
  };
}

function makeTaskItem(innerText: string, checked: boolean): TiptapNode {
  return {
    type: 'taskItem',
    attrs: { checked },
    content: [{ type: 'paragraph', content: parseInline(innerText) }],
  };
}

// ─── List helpers ─────────────────────────────────────────────────────────────

function getIndent(line: string): number {
  return line.match(/^(\s*)/)?.[1].length ?? 0;
}

function isBulletLine(line: string): boolean {
  return /^[ \t]*[-*+]\s/.test(line);
}

function isOrderedLine(line: string): boolean {
  return /^[ \t]*\d+\.\s/.test(line);
}

function isListLine(line: string): boolean {
  return isBulletLine(line) || isOrderedLine(line);
}

/**
 * Recursively parse a list starting at `lines[i]` with base indentation `baseIndent`.
 * Returns the parsed Tiptap list node and the index after the last consumed line.
 */
function parseList(
  lines: string[],
  i: number,
  baseIndent: number
): { node: TiptapNode; endI: number } {
  const firstLine = lines[i];
  const listType = isBulletLine(firstLine) ? 'bullet' : 'ordered';
  const items: TiptapNode[] = [];
  let isTaskList = false;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    const indent = getIndent(line);
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; } // orphaned indented line — skip

    if (!isListLine(line)) break;

    // Extract item text
    const itemText = isBulletLine(line)
      ? line.replace(/^[ \t]*[-*+]\s/, '')
      : line.replace(/^[ \t]*\d+\.\s/, '');
    i++;

    // Collect continuation lines (same or higher indent, non-list)
    const continuationLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !isListLine(lines[i])) {
      const nextIndent = getIndent(lines[i]);
      if (nextIndent <= baseIndent) break;
      continuationLines.push(lines[i].trim());
      i++;
    }

    const fullText = continuationLines.length
      ? itemText + ' ' + continuationLines.join(' ')
      : itemText;

    // Check for a nested sub-list
    let subList: TiptapNode | null = null;
    if (i < lines.length && isListLine(lines[i])) {
      const subIndent = getIndent(lines[i]);
      if (subIndent > baseIndent) {
        const { node, endI } = parseList(lines, i, subIndent);
        subList = node;
        i = endI;
      }
    }

    // Task item detection: - [ ] text  or  - [x] text
    const taskMatch = fullText.match(/^\[( |x|X)\]\s+(.*)/);
    if (taskMatch) {
      isTaskList = true;
      const taskContent: TiptapNode[] = [{ type: 'paragraph', content: parseInline(taskMatch[2]) }];
      if (subList) taskContent.push(subList);
      items.push({ type: 'taskItem', attrs: { checked: taskMatch[1].toLowerCase() === 'x' }, content: taskContent });
    } else {
      const liContent: TiptapNode[] = [{ type: 'paragraph', content: parseInline(fullText) }];
      if (subList) liContent.push(subList);
      items.push({ type: 'listItem', content: liContent });
    }
  }

  const nodeType = isTaskList ? 'taskList' : listType === 'bullet' ? 'bulletList' : 'orderedList';
  const node: TiptapNode = nodeType === 'orderedList'
    ? { type: nodeType, attrs: { start: 1 }, content: items }
    : { type: nodeType, content: items };

  return { node, endI: i };
}

// ─── Table parser ─────────────────────────────────────────────────────────────

function parseTableRow(line: string): string[] {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\|?[\s|:-]+\|?$/.test(line.trim());
}

export function markdownToTiptap(markdown: string): { type: 'doc'; content: TiptapNode[] } {
  const lines = markdown.split('\n');
  const nodes: TiptapNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line — skip
    if (trimmed === '') { i++; continue; }

    // ATX Heading: # … ######
    const hMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      nodes.push({
        type: 'heading',
        attrs: { level: Math.min(hMatch[1].length, 4) }, // NexusEditor supports 1-4
        content: parseInline(hMatch[2]),
      });
      i++;
      continue;
    }

    // Horizontal rule: --- / *** / ___
    if (/^(---+|\*\*\*+|___+)\s*$/.test(trimmed)) {
      nodes.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    // Fenced code block: ```lang
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || null;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push({
        type: 'codeBlock',
        attrs: { language: lang },
        content: [{ type: 'text', text: codeLines.join('\n') }],
      });
      continue;
    }

    // Blockquote: > …
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trimStart().startsWith('>') || lines[i].trim() === '')) {
        const l = lines[i];
        quoteLines.push(l.trimStart().startsWith('>') ? l.replace(/^[ \t]*>\s?/, '') : '');
        i++;
      }
      const inner = markdownToTiptap(quoteLines.join('\n'));
      nodes.push({ type: 'blockquote', content: inner.content });
      continue;
    }

    // Pipe table: | col | col |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2 && isSeparatorRow(tableLines[1])) {
        const headerCells = parseTableRow(tableLines[0]);
        const dataRows = tableLines.slice(2).map(parseTableRow);

        const tableRows: TiptapNode[] = [
          {
            type: 'tableRow',
            content: headerCells.map((cell) => ({
              type: 'tableHeader',
              attrs: { colspan: 1, rowspan: 1, colwidth: null },
              content: [{ type: 'paragraph', content: parseInline(cell) }],
            })),
          },
          ...dataRows.map((cells) => ({
            type: 'tableRow',
            content: cells.map((cell) => ({
              type: 'tableCell',
              attrs: { colspan: 1, rowspan: 1, colwidth: null },
              content: [{ type: 'paragraph', content: parseInline(cell) }],
            })),
          })),
        ];
        nodes.push({ type: 'table', content: tableRows });
      }
      continue;
    }

    // Unordered list / task list / ordered list — unified nested parser
    if (isListLine(line)) {
      const baseIndent = getIndent(line);
      const { node, endI } = parseList(lines, i, baseIndent);
      nodes.push(node);
      i = endI;
      continue;
    }

    // Paragraph: collect consecutive non-block lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^[ \t]*(#{1,6}\s|[-*+]\s|\d+\.\s|>|```|---|___|\*\*\*|\|)/.test(lines[i])
    ) {
      paraLines.push(lines[i].trimEnd());
      i++;
    }
    if (paraLines.length > 0) {
      nodes.push({
        type: 'paragraph',
        content: parseInline(paraLines.join(' ')),
      });
    }
  }

  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [{ type: 'paragraph', content: [] }],
  };
}

/**
 * Extracts a page title from markdown content.
 * Handles ATX headings (# Title), setext headings (Title\n====),
 * and skips YAML frontmatter before searching.
 */
export function extractMarkdownTitle(markdown: string): string {
  let content = markdown;

  // Skip YAML frontmatter (--- ... ---)
  if (content.trimStart().startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) content = content.slice(end + 4);
  }

  const lines = content.split('\n');

  // ATX heading: # Title
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.*)/);
    if (h1 && h1[1].trim()) return h1[1].trim();
  }

  // Setext heading: Title\n====
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() && /^=+\s*$/.test(lines[i + 1])) {
      return lines[i].trim().slice(0, 200);
    }
  }

  // First non-empty, non-metadata line
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith('#') && !t.startsWith('---') && !t.startsWith('===')) {
      return t.slice(0, 80);
    }
  }

  return 'Imported Page';
}
