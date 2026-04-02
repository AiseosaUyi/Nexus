/**
 * Extracts and parses Notion's internal block data from public page HTML.
 * Notion public pages store their content in a __NEXT_DATA__ script tag.
 */

export interface NotionImportResult {
  title: string;
  html: string;
}

function normalizeId(id: string): string {
  return typeof id === 'string' ? id.replace(/-/g, '') : id;
}

function findRecordMap(obj: any, depth = 0): any {
  if (depth > 8 || !obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (obj.recordMap?.block) return obj.recordMap;
  for (const key of Object.keys(obj)) {
    const found = findRecordMap(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

export function parseNotionPage(html: string): NotionImportResult {
  // 1. Extract the __NEXT_DATA__ JSON blob
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    // If not found, check for the older INITIAL_STATE pattern
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?);<\/script>/);
    if (!stateMatch) return { title: 'Imported Page', html };
    return processRecordMap(stateMatch[1]);
  }

  try {
    const data = JSON.parse(match[1]);
    const recordMap = findRecordMap(data);
    if (!recordMap) return { title: 'Imported Page', html };

    return convertRecordMapToHtml(recordMap);
  } catch (e) {
    console.error('[NotionParser] Error parsing JSON:', e);
    return { title: 'Imported Page', html };
  }
}

function processRecordMap(jsonStr: string): NotionImportResult {
  try {
    const data = JSON.parse(jsonStr);
    const recordMap = data.recordMap;
    if (!recordMap) return { title: 'Imported Page', html: '' };
    return convertRecordMapToHtml(recordMap);
  } catch {
    return { title: 'Imported Page', html: '' };
  }
}

function processBlocks(blockIds: string[], blocks: any): string {
  let html = '';
  let i = 0;
  while (i < blockIds.length) {
    const container = blocks[blockIds[i]];
    if (!container?.value) { i++; continue; }
    const type = container.value.type;
    if (type === 'bulleted_list') {
      let items = '';
      while (i < blockIds.length && blocks[blockIds[i]]?.value?.type === 'bulleted_list') {
        const b = blocks[blockIds[i]].value;
        const rt = parseRichText(b.properties?.title || []);
        const available = (b.content || []).filter((id: string) => !!blocks[id]);
        const nested = available.length ? processBlocks(available, blocks) : '';
        items += `<li>${rt}${nested}</li>`;
        i++;
      }
      html += `<ul>${items}</ul>`;
    } else if (type === 'numbered_list') {
      let items = '';
      while (i < blockIds.length && blocks[blockIds[i]]?.value?.type === 'numbered_list') {
        const b = blocks[blockIds[i]].value;
        const rt = parseRichText(b.properties?.title || []);
        const available = (b.content || []).filter((id: string) => !!blocks[id]);
        const nested = available.length ? processBlocks(available, blocks) : '';
        items += `<li>${rt}${nested}</li>`;
        i++;
      }
      html += `<ol>${items}</ol>`;
    } else {
      html += blockToHtml(blockIds[i], blocks);
      i++;
    }
  }
  return html;
}

function blockToHtml(blockId: string, blocks: any): string {
  const container = blocks[blockId];
  if (!container?.value) return '';
  const block = container.value;
  const type = block.type;
  const richText = parseRichText(block.properties?.title || []);
  const available = (block.content || []).filter((id: string) => !!blocks[id]);
  const childrenHtml = available.length ? processBlocks(available, blocks) : '';

  switch (type) {
    case 'page':
      return richText ? `<p><strong>${richText}</strong></p>` : '';
    case 'header':
      return `<h2>${richText}</h2>${childrenHtml}`;
    case 'sub_header':
      return `<h3>${richText}</h3>${childrenHtml}`;
    case 'sub_sub_header':
      return `<h4>${richText}</h4>${childrenHtml}`;
    case 'text':
      return (richText ? `<p>${richText}</p>` : '') + childrenHtml;
    case 'to_do': {
      const checked = block.properties?.checked?.[0]?.[0] === 'Yes';
      return `<p><input type="checkbox"${checked ? ' checked' : ''}> ${richText}</p>${childrenHtml}`;
    }
    case 'code': {
      const lang = (block.properties?.language?.[0]?.[0] || '').toLowerCase();
      return `<pre><code${lang ? ` class="language-${lang}"` : ''}>${richText}</code></pre>`;
    }
    case 'quote':
      return `<blockquote><p>${richText}</p></blockquote>${childrenHtml}`;
    case 'callout': {
      const icon = block.format?.page_icon || '';
      return `<blockquote><p>${icon ? icon + '\u00a0' : ''}${richText}</p></blockquote>${childrenHtml}`;
    }
    case 'divider':
      return '<hr />';
    case 'image': {
      const src = block.format?.display_source || block.properties?.source?.[0]?.[0];
      return src ? `<img src="${src}" alt="" />` : '';
    }
    case 'embed':
    case 'video': {
      const url = block.format?.display_source || block.properties?.source?.[0]?.[0];
      return url ? `<p><a href="${url}">${richText || url}</a></p>` : '';
    }
    case 'bookmark': {
      const url = block.properties?.link?.[0]?.[0] || block.properties?.source?.[0]?.[0];
      return url ? `<p><a href="${url}">${richText || url}</a></p>` : '';
    }
    case 'toggle':
      return (richText ? `<p><strong>${richText}</strong></p>` : '') + childrenHtml;
    case 'column_list':
    case 'column':
      return childrenHtml;
    case 'table_of_contents':
    case 'breadcrumb':
      return '';
    default:
      return childrenHtml;
  }
}

/**
 * Normalizes a recordMap from the Notion API (/api/v3/loadPageChunk) which
 * has a nested value.value structure, into the flat value structure expected
 * by convertRecordMapToHtml.
 */
function normalizeRecordMap(recordMap: any): any {
  const rawBlocks = recordMap?.block;
  if (!rawBlocks) return recordMap;

  // Check if blocks use the nested value.value format (API response)
  const firstBlock = Object.values(rawBlocks)[0] as any;
  if (firstBlock?.value?.value?.type) {
    const normalized: any = {};
    for (const [key, entry] of Object.entries(rawBlocks)) {
      const e = entry as any;
      normalized[key] = { value: e.value?.value || e.value };
    }
    return { ...recordMap, block: normalized };
  }

  return recordMap;
}

/**
 * Converts a Notion recordMap into a flat HTML representation that Nexus can import.
 */
export function convertRecordMapToHtml(rawRecordMap: any): NotionImportResult {
  const recordMap = normalizeRecordMap(rawRecordMap);
  const rawBlocks = recordMap.block;
  if (!rawBlocks) return { title: 'Imported Page', html: '' };

  // Normalize all block IDs to strip hyphens — Notion uses both formats
  // across different fields (content[] may use hyphens, block keys may not, or vice versa)
  const blocks: any = {};
  for (const [key, value] of Object.entries(rawBlocks)) {
    const normKey = normalizeId(key);
    const entry = value as any;
    // Deep-clone the content array with normalized IDs so lookups always match
    if (entry?.value?.content && Array.isArray(entry.value.content)) {
      blocks[normKey] = {
        ...entry,
        value: { ...entry.value, content: entry.value.content.map(normalizeId) },
      };
    } else {
      blocks[normKey] = entry;
    }
  }

  // Find the TRUE root page block: the page-type block that is not
  // referenced as a child by any other block (i.e., the document root).
  const allChildIds = new Set<string>(
    Object.values(blocks).flatMap((b: any) => b?.value?.content || [])
  );
  const rootBlockId =
    Object.keys(blocks).find(id => blocks[id]?.value?.type === 'page' && !allChildIds.has(id)) ??
    Object.keys(blocks).find(id => blocks[id]?.value?.type === 'page');

  const rootBlock = rootBlockId ? blocks[rootBlockId].value : null;
  const title = rootBlock
    ? parseRichText(rootBlock.properties?.title || [], true)
    : 'Imported Page';

  // Filter children to only those present in the normalized blocks map
  const childIds = (rootBlock?.content || []).filter((id: string) => !!blocks[id]);

  if (!childIds.length) {
    // Root block has no resolvable children (partial SSR / lazy-loaded page).
    // Fall back to processing every non-page block available in the record map.
    const allIds = Object.keys(blocks).filter(id => blocks[id]?.value?.type !== 'page');
    return { title, html: `<h1>${title}</h1>` + processBlocks(allIds, blocks) };
  }

  return {
    title,
    html: `<h1>${title}</h1>` + processBlocks(childIds, blocks),
  };
}

/**
 * Parses Notion's internal property format [[text, marks], ...] into HTML.
 */
export function parseRichText(property: any[], plainText = false): string {
  if (!property || !Array.isArray(property)) return '';

  return property.map(([text, marks]) => {
    if (plainText) return text;
    if (!marks || !marks.length) return text;

    let wrapped = text;
    marks.forEach((mark: any[]) => {
      const type = mark[0];
      switch (type) {
        case 'b': // Bold
          wrapped = `<strong>${wrapped}</strong>`;
          break;
        case 'i': // Italic
          wrapped = `<em>${wrapped}</em>`;
          break;
        case 's': // Strikethrough
          wrapped = `<strike>${wrapped}</strike>`;
          break;
        case 'c': // Code
          wrapped = `<code>${wrapped}</code>`;
          break;
        case 'a': // Link
          wrapped = `<a href="${mark[1]}" target="_blank">${wrapped}</a>`;
          break;
        case 'u': // Underline
          wrapped = `<u>${wrapped}</u>`;
          break;
      }
    });
    return wrapped;
  }).join('');
}


