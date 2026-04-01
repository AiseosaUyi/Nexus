/**
 * Tests that Notion's rendered HTML (class-based block structure)
 * is correctly parsed into Tiptap JSON with proper list types and bold marks.
 */
import { describe, it, expect } from 'vitest';
import { htmlToTiptap } from './htmlToTiptap';

// Minimal reproduction of Notion's rendered HTML structure (new format with data-content-editable-leaf)
const NOTION_RENDERED_HTML = `
<div class="notion-page-content" style="flex-shrink: 0;">
  <div class="notion-selectable notion-text-block">
    <div><div><div><div class="x78zum5">
      <div data-content-editable-leaf="true"><span style="font-weight:600">Job Description:</span></div>
    </div></div></div></div>
  </div>
  <div class="notion-selectable notion-text-block">
    <div><div><div><div class="x78zum5">
      <div data-content-editable-leaf="true">We are seeking a Junior Product Manager.</div>
    </div></div></div></div>
  </div>
  <div class="notion-selectable notion-text-block">
    <div><div><div><div class="x78zum5">
      <div data-content-editable-leaf="true"><span style="font-weight:600">Responsibilities:</span></div>
    </div></div></div></div>
  </div>
  <div class="notion-selectable notion-numbered_list-block">
    <div><div><div>
      <div class="notion-list-item-box-left"><span class="pseudoBefore"></span></div>
      <div><div class="x78zum5">
        <div data-content-editable-leaf="true"><span style="font-weight:600">Product development coordination:</span> assist in planning.</div>
      </div></div>
    </div></div></div>
  </div>
  <div class="notion-selectable notion-numbered_list-block">
    <div><div><div>
      <div class="notion-list-item-box-left"><span class="pseudoBefore"></span></div>
      <div><div class="x78zum5">
        <div data-content-editable-leaf="true"><span style="font-weight:600">User Engagement:</span> Engage with users.</div>
      </div></div>
    </div></div></div>
  </div>
  <div class="notion-selectable notion-numbered_list-block">
    <div><div><div>
      <div class="notion-list-item-box-left"><span class="pseudoBefore"></span></div>
      <div><div class="x78zum5">
        <div data-content-editable-leaf="true"><span style="font-weight:600">Project Planning:</span> Contribute to planning.</div>
      </div></div>
    </div></div></div>
  </div>
  <div class="notion-selectable notion-text-block">
    <div><div><div><div class="x78zum5">
      <div data-content-editable-leaf="true"><span style="font-weight:600">Requirements:</span></div>
    </div></div></div></div>
  </div>
  <div class="notion-selectable notion-bulleted_list-block">
    <div><div><div>
      <div class="notion-list-item-box-left"><div class="pseudoBefore"></div></div>
      <div><div class="x78zum5">
        <div data-content-editable-leaf="true">Strong analytical skills.</div>
      </div></div>
    </div></div></div>
  </div>
  <div class="notion-selectable notion-bulleted_list-block">
    <div><div><div>
      <div class="notion-list-item-box-left"><div class="pseudoBefore"></div></div>
      <div><div class="x78zum5">
        <div data-content-editable-leaf="true">Excellent communication.</div>
      </div></div>
    </div></div></div>
  </div>
  <div class="notion-selectable notion-bulleted_list-block">
    <div><div><div>
      <div class="notion-list-item-box-left"><div class="pseudoBefore"></div></div>
      <div><div class="x78zum5">
        <div data-content-editable-leaf="true">Familiarity with Agile methodologies.</div>
      </div></div>
    </div></div></div>
  </div>
</div>`;

/** Mirrors Notion public pages: H1 sits in `.notion-page-block` above `.notion-page-content`. */
const NOTION_HTML_WITH_TITLE_ABOVE_BODY = `
<main id="main" class="notion-frame">
  <div class="layout-content">
    <div data-block-id="c22fef8b-0b15-4c8a-b948-6b4fad235de8" class="notion-selectable notion-page-block">
      <h1 class="content-editable-leaf-rtl" data-content-editable-leaf="true">Junior PM at Gruve</h1>
    </div>
  </div>
  <div class="layout-content">
    ${NOTION_RENDERED_HTML}
  </div>
</main>`;

describe('Notion rendered HTML import (class-based blocks)', () => {
  it('detects .notion-page-content and uses Notion-specific parser', () => {
    const result = htmlToTiptap(NOTION_RENDERED_HTML);
    expect(result.type).toBe('doc');
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('produces orderedList from notion-numbered_list-block divs', () => {
    const result = htmlToTiptap(NOTION_RENDERED_HTML);
    const types = result.content.map(n => n.type);
    expect(types).toContain('orderedList');
  });

  it('produces bulletList from notion-bulleted_list-block divs', () => {
    const result = htmlToTiptap(NOTION_RENDERED_HTML);
    const types = result.content.map(n => n.type);
    expect(types).toContain('bulletList');
  });

  it('groups consecutive numbered_list blocks into a single orderedList', () => {
    const result = htmlToTiptap(NOTION_RENDERED_HTML);
    const orderedLists = result.content.filter(n => n.type === 'orderedList');
    expect(orderedLists).toHaveLength(1);
    // 3 numbered items
    expect(orderedLists[0].content).toHaveLength(3);
    expect(orderedLists[0].content![0].type).toBe('listItem');
  });

  it('groups consecutive bulleted_list blocks into a single bulletList', () => {
    const result = htmlToTiptap(NOTION_RENDERED_HTML);
    const bulletLists = result.content.filter(n => n.type === 'bulletList');
    expect(bulletLists).toHaveLength(1);
    // 3 bullet items
    expect(bulletLists[0].content).toHaveLength(3);
  });

  it('extracts text from [data-content-editable-leaf] elements', () => {
    const result = htmlToTiptap(NOTION_RENDERED_HTML);
    // First text block should be "Job Description:" paragraph
    const firstParagraph = result.content[0];
    expect(firstParagraph.type).toBe('paragraph');
    const textContent = firstParagraph.content?.map(n => n.text).join('');
    expect(textContent).toContain('Job Description:');
  });

  it('preserves bold marks from font-weight:600 spans', () => {
    const result = htmlToTiptap(NOTION_RENDERED_HTML);
    // "Job Description:" should have bold mark
    const firstParagraph = result.content[0];
    const boldNode = firstParagraph.content?.find(n => n.marks?.some(m => m.type === 'bold'));
    expect(boldNode).toBeTruthy();
    expect(boldNode?.text).toContain('Job Description:');
  });

  it('preserves bold + plain text in list items', () => {
    const result = htmlToTiptap(NOTION_RENDERED_HTML);
    const orderedList = result.content.find(n => n.type === 'orderedList');
    const firstItem = orderedList?.content?.[0];
    const paragraph = firstItem?.content?.[0];
    // Should have mixed content: bold "Product development coordination:" + plain " assist in planning."
    expect(paragraph?.content?.length).toBeGreaterThanOrEqual(2);
    const boldPart = paragraph?.content?.find(n => n.marks?.some(m => m.type === 'bold'));
    expect(boldPart?.text).toContain('Product development coordination:');
    const plainPart = paragraph?.content?.find(n => !n.marks?.length && n.text?.includes('assist'));
    expect(plainPart).toBeTruthy();
  });

  it('produces correct overall structure', () => {
    const result = htmlToTiptap(NOTION_RENDERED_HTML);
    const types = result.content.map(n => n.type);
    // paragraph (Job Desc), paragraph (We are seeking), paragraph (Responsibilities),
    // orderedList (3 items), paragraph (Requirements), bulletList (3 items)
    expect(types).toEqual([
      'paragraph', 'paragraph', 'paragraph',
      'orderedList',
      'paragraph',
      'bulletList',
    ]);
  });

  it('includes page title from .notion-page-block when it sits above .notion-page-content', () => {
    const result = htmlToTiptap(NOTION_HTML_WITH_TITLE_ABOVE_BODY);
    expect(result.content[0].type).toBe('heading');
    expect(result.content[0].attrs).toEqual({ level: 1 });
    const titleText = result.content[0].content?.map(n => n.text).join('');
    expect(titleText).toBe('Junior PM at Gruve');
    // Body still parses: first body block is paragraph "Job Description:"
    expect(result.content[1].type).toBe('paragraph');
  });
});

describe('HTML nested list import', () => {
  it('preserves nested unordered lists inside list items', () => {
    const html = `<ul>
      <li>Item 1
        <ul>
          <li>Nested A</li>
          <li>Nested B</li>
        </ul>
      </li>
      <li>Item 2</li>
    </ul>`;
    const result = htmlToTiptap(html);
    const list = result.content.find(n => n.type === 'bulletList');
    expect(list).toBeTruthy();
    // First item should have paragraph + nested bulletList
    const firstItem = list!.content![0];
    expect(firstItem.type).toBe('listItem');
    expect(firstItem.content).toHaveLength(2);
    expect(firstItem.content![0].type).toBe('paragraph');
    expect(firstItem.content![1].type).toBe('bulletList');
    // Nested list should have 2 items
    expect(firstItem.content![1].content).toHaveLength(2);
    // Second top-level item has no nested list
    const secondItem = list!.content![1];
    expect(secondItem.content).toHaveLength(1);
    expect(secondItem.content![0].type).toBe('paragraph');
  });

  it('preserves nested ordered lists inside list items', () => {
    const html = `<ol>
      <li>First
        <ol>
          <li>Sub 1</li>
          <li>Sub 2</li>
        </ol>
      </li>
    </ol>`;
    const result = htmlToTiptap(html);
    const list = result.content.find(n => n.type === 'orderedList');
    expect(list).toBeTruthy();
    const firstItem = list!.content![0];
    expect(firstItem.content).toHaveLength(2);
    expect(firstItem.content![0].type).toBe('paragraph');
    expect(firstItem.content![1].type).toBe('orderedList');
    expect(firstItem.content![1].content).toHaveLength(2);
  });

  it('handles deeply nested lists (3 levels)', () => {
    const html = `<ul>
      <li>Level 1
        <ul>
          <li>Level 2
            <ul>
              <li>Level 3</li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>`;
    const result = htmlToTiptap(html);
    const l1 = result.content.find(n => n.type === 'bulletList');
    const l2 = l1!.content![0].content![1]; // nested list at level 2
    expect(l2.type).toBe('bulletList');
    const l3 = l2.content![0].content![1]; // nested list at level 3
    expect(l3.type).toBe('bulletList');
    expect(l3.content![0].content![0].content![0].text).toBe('Level 3');
  });

  it('handles Notion-style nested HTML from notion-parser (ul inside li)', () => {
    // This is what notion-parser.ts generates for nested bulleted lists
    const html = `<h1>Test</h1><ul><li>Parent item<ul><li>Child item 1</li><li>Child item 2</li></ul></li><li>Another parent</li></ul>`;
    const result = htmlToTiptap(html);
    const list = result.content.find(n => n.type === 'bulletList');
    expect(list).toBeTruthy();
    const parentItem = list!.content![0];
    expect(parentItem.content).toHaveLength(2);
    const nestedList = parentItem.content![1];
    expect(nestedList.type).toBe('bulletList');
    expect(nestedList.content).toHaveLength(2);
  });
});
