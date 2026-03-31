/**
 * Converts cleaned HTML (browser DOM) to Tiptap JSON using DOMParser.
 * Client-side only — uses the browser's native DOM APIs.
 */

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

// ─── Inline converter ─────────────────────────────────────────────────────────

function nodeToInline(el: Node): TiptapNode[] {
  const nodes: TiptapNode[] = [];

  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text) nodes.push({ type: 'text', text });
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const tag = (child as Element).tagName.toLowerCase();
    const inner = nodeToInline(child);

    const applyMark = (markType: string, attrs?: Record<string, unknown>) => {
      inner.forEach((n) => {
        if (n.type === 'text') {
          const existing = n.marks ?? [];
          const mark = attrs ? { type: markType, attrs } : { type: markType };
          nodes.push({ ...n, marks: [...existing, mark] });
        } else {
          nodes.push(n);
        }
      });
    };

    switch (tag) {
      case 'strong': case 'b':
        applyMark('bold'); break;
      case 'em': case 'i':
        applyMark('italic'); break;
      case 's': case 'del': case 'strike':
        applyMark('strike'); break;
      case 'code':
        applyMark('code'); break;
      case 'a': {
        const href = (child as HTMLAnchorElement).href || '';
        applyMark('link', { href, target: '_blank' });
        break;
      }
      case 'br':
        nodes.push({ type: 'hardBreak' });
        break;
      default:
        nodes.push(...inner);
    }
  });

  return nodes;
}

// ─── Block converter ──────────────────────────────────────────────────────────

function elementToBlock(el: Element): TiptapNode | null {
  const tag = el.tagName.toLowerCase();

  // Headings
  if (/^h[1-6]$/.test(tag)) {
    const level = Math.min(parseInt(tag[1]), 4);
    const content = nodeToInline(el);
    if (!content.length) return null;
    return { type: 'heading', attrs: { level }, content };
  }

  // Paragraph
  if (tag === 'p') {
    const content = nodeToInline(el);
    if (!content.length) return null;
    return { type: 'paragraph', content };
  }

  // Blockquote
  if (tag === 'blockquote') {
    const inner: TiptapNode[] = [];
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const block = elementToBlock(child as Element);
        if (block) inner.push(block);
      } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        inner.push({ type: 'paragraph', content: [{ type: 'text', text: child.textContent.trim() }] });
      }
    });
    if (!inner.length) return null;
    return { type: 'blockquote', content: inner };
  }

  // Code block: <pre><code> or just <pre>
  if (tag === 'pre') {
    const codeEl = el.querySelector('code');
    const text = codeEl ? codeEl.textContent ?? '' : el.textContent ?? '';
    const lang = codeEl?.className.match(/language-(\w+)/)?.[1] ?? null;
    if (!text.trim()) return null;
    return {
      type: 'codeBlock',
      attrs: { language: lang },
      content: [{ type: 'text', text: text.replace(/\n$/, '') }],
    };
  }

  // Horizontal rule
  if (tag === 'hr') {
    return { type: 'horizontalRule' };
  }

  // Unordered list
  if (tag === 'ul') {
    const items: TiptapNode[] = [];
    el.querySelectorAll(':scope > li').forEach((li) => {
      // Check for task list checkbox
      const checkbox = li.querySelector('input[type="checkbox"]');
      if (checkbox) {
        const checked = (checkbox as HTMLInputElement).checked;
        // Remove checkbox from text
        const text = li.textContent?.replace(/^\s*/, '').trim() ?? '';
        items.push({
          type: 'taskItem',
          attrs: { checked },
          content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
        });
      } else {
        const content = nodeToInline(li);
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content }],
        });
      }
    });
    if (!items.length) return null;
    const allTask = items.every((i) => i.type === 'taskItem');
    return { type: allTask ? 'taskList' : 'bulletList', content: items };
  }

  // Ordered list
  if (tag === 'ol') {
    const items: TiptapNode[] = [];
    el.querySelectorAll(':scope > li').forEach((li) => {
      const content = nodeToInline(li);
      items.push({ type: 'listItem', content: [{ type: 'paragraph', content }] });
    });
    if (!items.length) return null;
    return { type: 'orderedList', attrs: { start: 1 }, content: items };
  }

  // Table
  if (tag === 'table') {
    const rows: TiptapNode[] = [];
    el.querySelectorAll('tr').forEach((tr, rowIdx) => {
      const cells: TiptapNode[] = [];
      tr.querySelectorAll('th, td').forEach((cell) => {
        const isHeader = cell.tagName.toLowerCase() === 'th';
        const content = nodeToInline(cell);
        cells.push({
          type: isHeader ? 'tableHeader' : 'tableCell',
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: [{ type: 'paragraph', content }],
        });
      });
      if (cells.length) rows.push({ type: 'tableRow', content: cells });
    });
    if (!rows.length) return null;
    return { type: 'table', content: rows };
  }

  // Divs/sections — recurse and flatten their block children
  if (['div', 'section', 'article', 'main', 'aside'].includes(tag)) {
    return null; // handled by walkChildren below
  }

  return null;
}

function walkChildren(el: Element): TiptapNode[] {
  const nodes: TiptapNode[] = [];

  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim() ?? '';
      if (text) {
        nodes.push({ type: 'paragraph', content: [{ type: 'text', text }] });
      }
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    const block = elementToBlock(el);

    if (block) {
      nodes.push(block);
    } else if (['div', 'section', 'article', 'main', 'aside', 'span', 'figure'].includes(tag)) {
      nodes.push(...walkChildren(el));
    }
  });

  return nodes;
}

// ─── Notion class-based helpers ───────────────────────────────────────────────

function getNotionBlockType(el: Element): string | null {
  const m = el.className?.match?.(/notion-([a-z_]+)-block/);
  return m ? m[1] : null;
}

function walkNotionContent(el: Element): TiptapNode[] {
  const children = Array.from(el.children);
  const nodes: TiptapNode[] = [];
  let i = 0;

  while (i < children.length) {
    const child = children[i];
    const blockType = getNotionBlockType(child);

    if (blockType === 'bulleted_list') {
      const items: TiptapNode[] = [];
      while (i < children.length && getNotionBlockType(children[i]) === 'bulleted_list') {
        const textEl = children[i].querySelector('.notranslate') ?? children[i];
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: nodeToInline(textEl) }] });
        i++;
      }
      if (items.length) nodes.push({ type: 'bulletList', content: items });
    } else if (blockType === 'numbered_list') {
      const items: TiptapNode[] = [];
      while (i < children.length && getNotionBlockType(children[i]) === 'numbered_list') {
        const textEl = children[i].querySelector('.notranslate') ?? children[i];
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: nodeToInline(textEl) }] });
        i++;
      }
      if (items.length) nodes.push({ type: 'orderedList', attrs: { start: 1 }, content: items });
    } else if (blockType === 'to_do') {
      const items: TiptapNode[] = [];
      while (i < children.length && getNotionBlockType(children[i]) === 'to_do') {
        const cb = children[i].querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        const textEl = children[i].querySelector('.notranslate') ?? children[i];
        items.push({ type: 'taskItem', attrs: { checked: cb?.checked ?? false }, content: [{ type: 'paragraph', content: nodeToInline(textEl) }] });
        i++;
      }
      if (items.length) nodes.push({ type: 'taskList', content: items });
    } else if (blockType) {
      const textEl = child.querySelector('.notranslate') ?? child;
      const inline = nodeToInline(textEl);
      const text = textEl.textContent?.trim() ?? '';

      switch (blockType) {
        case 'header':
          if (text) nodes.push({ type: 'heading', attrs: { level: 2 }, content: inline });
          break;
        case 'sub_header':
          if (text) nodes.push({ type: 'heading', attrs: { level: 3 }, content: inline });
          break;
        case 'sub_sub_header':
          if (text) nodes.push({ type: 'heading', attrs: { level: 4 }, content: inline });
          break;
        case 'text':
          if (text) nodes.push({ type: 'paragraph', content: inline });
          break;
        case 'quote':
          if (text) nodes.push({ type: 'blockquote', content: [{ type: 'paragraph', content: inline }] });
          break;
        case 'code': {
          const codeEl = child.querySelector('code') ?? textEl;
          const codeText = codeEl.textContent?.trim() ?? '';
          const lang = codeEl.className?.match?.(/language-(\w+)/)?.[1] ?? null;
          if (codeText) nodes.push({ type: 'codeBlock', attrs: { language: lang }, content: [{ type: 'text', text: codeText }] });
          break;
        }
        case 'divider':
          nodes.push({ type: 'horizontalRule' });
          break;
        case 'image': {
          const img = child.querySelector('img');
          if (img?.src) nodes.push({ type: 'image', attrs: { src: img.src, alt: img.alt || '' } } as TiptapNode);
          break;
        }
        case 'page':
        case 'title':
          if (text) nodes.push({ type: 'heading', attrs: { level: 1 }, content: inline });
          break;
        default:
          // Recurse into unknown block types
          nodes.push(...walkChildren(child));
          break;
      }
      i++;
    } else {
      // Not a Notion block — use generic recursion
      const block = elementToBlock(child);
      if (block) {
        nodes.push(block);
      } else if (['div', 'section', 'article', 'main', 'aside', 'span', 'figure'].includes(child.tagName.toLowerCase())) {
        nodes.push(...walkChildren(child));
      }
      i++;
    }
  }

  return nodes;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function htmlToTiptap(html: string): { type: 'doc'; content: TiptapNode[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove noise elements
  ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'iframe'].forEach(
    (sel) => doc.querySelectorAll(sel).forEach((el) => el.remove())
  );

  // Notion-specific parsing: detect class-based block structure
  const notionContentEl =
    doc.querySelector('.notion-page-content') ??
    doc.querySelector('[class*="notion-frame"]');

  if (notionContentEl) {
    const notionNodes = walkNotionContent(notionContentEl);
    const deduped = notionNodes.filter((n, idx) => {
      if (n.type === 'paragraph' && !n.content?.length) {
        return idx === 0 || notionNodes[idx - 1]?.type !== 'paragraph';
      }
      return true;
    });
    return {
      type: 'doc',
      content: deduped.length > 0 ? deduped : [{ type: 'paragraph', content: [] }],
    };
  }

  // Try to find the main content area
  const contentEl =
    doc.querySelector('article') ??
    doc.querySelector('main') ??
    doc.querySelector('[role="main"]') ??
    doc.querySelector('.post-content, .entry-content, .article-content, .content') ??
    doc.body;

  const nodes = walkChildren(contentEl);

  // Dedupe consecutive empty paragraphs
  const dedupe = nodes.filter((n, idx) => {
    if (n.type === 'paragraph' && !n.content?.length) {
      return idx === 0 || nodes[idx - 1]?.type !== 'paragraph' || nodes[idx - 1]?.content?.length !== 0;
    }
    return true;
  });

  return {
    type: 'doc',
    content: dedupe.length > 0 ? dedupe : [{ type: 'paragraph', content: [] }],
  };
}
