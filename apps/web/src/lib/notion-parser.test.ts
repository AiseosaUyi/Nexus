import { describe, it, expect } from 'vitest';
import { parseNotionPage, parseRichText } from './notion-parser';

describe('Notion Parser', () => {
  describe('parseRichText', () => {
    it('handles plain text', () => {
      const property = [['Hello World']];
      expect(parseRichText(property)).toBe('Hello World');
    });

    it('handles bold and italic', () => {
      const property = [
        ['Bold', [['b']]],
        [' and ', []],
        ['Italic', [['i']]]
      ];
      expect(parseRichText(property)).toBe('<strong>Bold</strong> and <em>Italic</em>');
    });

    it('handles strikethrough and code', () => {
      const property = [
        ['Strike', [['s']]],
        [' and ', []],
        ['Code', [['c']]]
      ];
      expect(parseRichText(property)).toBe('<strike>Strike</strike> and <code>Code</code>');
    });

    it('handles links', () => {
      const property = [['Nexus', [['a', 'https://nexus.so']]]];
      expect(parseRichText(property)).toBe('<a href="https://nexus.so" target="_blank">Nexus</a>');
    });

    it('handles multiple marks on one segment', () => {
      const property = [['Bold Italic', [['b'], ['i']]]];
      expect(parseRichText(property)).toBe('<em><strong>Bold Italic</strong></em>');
    });
  });

  describe('parseNotionPage (RecordMap)', () => {
    const mockRecordMap = {
      block: {
        'page-id': {
          value: {
            id: 'page-id',
            type: 'page',
            properties: {
              title: [['The Real Title']]
            },
            content: ['block-1', 'block-2']
          }
        },
        'block-1': {
          value: {
            id: 'block-1',
            type: 'header',
            properties: {
              title: [['Section 1']]
            }
          }
        },
        'block-2': {
          value: {
            id: 'block-2',
            type: 'text',
            properties: {
              title: [['This is ', []], ['bold', [['b']]], [' text.', []]]
            }
          }
        }
      }
    };

    const mockHtml = `
      <html>
        <body>
          <script id="__NEXT_DATA__" type="application/json">
            ${JSON.stringify({
              props: {
                pageProps: {
                  recordMap: mockRecordMap
                }
              }
            })}
          </script>
        </body>
      </html>
    `;

    it('extracts the correct page title from the root block', () => {
      const result = parseNotionPage(mockHtml);
      expect(result.title).toBe('The Real Title');
    });

    it('reconstructs the block hierarchy into semantic HTML', () => {
      const result = parseNotionPage(mockHtml);
      expect(result.html).toContain('<h1>The Real Title</h1>');
      expect(result.html).toContain('<h2>Section 1</h2>');
      expect(result.html).toContain('<p>This is <strong>bold</strong> text.</p>');
    });

    it('handles missing recordMap gracefully', () => {
      const emptyHtml = '<script id="__NEXT_DATA__" type="application/json">{}</script>';
      const result = parseNotionPage(emptyHtml);
      expect(result.title).toBe('Imported Page');
    });
  });
});
