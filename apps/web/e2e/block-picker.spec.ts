import { test, expect } from '@playwright/test';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

/**
 * Block Picker E2E tests.
 *
 * These tests verify that clicking the "+" block handle opens the BlockPickerPanel
 * and that selecting each block type inserts the correct element into the editor.
 *
 * storageState is configured via playwright.config.ts (chromium-auth project).
 */

// Generate a tiny test image (1x1 red pixel PNG)
function createTestImage(dir: string): string {
  mkdirSync(dir, { recursive: true });
  const filePath = resolve(dir, 'test-block-image.png');
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
    0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
    0xae, 0x42, 0x60, 0x82,
  ]);
  writeFileSync(filePath, png);
  return filePath;
}

// Helper: navigate to a fresh page and open the editor
async function openFreshEditorPage(page: any) {
  await page.goto('/dashboard');
  await page.waitForURL(/\/w\/.+\/dashboard/);

  const newPageBtn = page.locator('aside').getByRole('button', { name: 'New Page' }).first();
  await expect(newPageBtn).toBeVisible();
  await newPageBtn.click();

  await expect(page).toHaveURL(/.*\/n\/.*/, { timeout: 15000 });

  const editor = page.locator('.tiptap.ProseMirror');
  await editor.click();
}

// Helper: type text on the first line, hover it, click "+", wait for picker
async function openBlockPicker(page: any, lineText: string) {
  const editor = page.locator('.tiptap.ProseMirror');

  // Type some text so there is a hoverable block
  await page.keyboard.type(lineText);

  // Hover over the typed text to reveal the block handle
  const textLocator = editor.getByText(lineText).first();
  await textLocator.hover();

  // Click the "+" handle
  const blockHandle = page.locator('[data-block-handle]');
  await expect(blockHandle).toBeVisible({ timeout: 5000 });
  await blockHandle.click();

  // Wait for the block picker to appear
  const picker = page.locator('[data-block-picker]');
  await expect(picker).toBeVisible({ timeout: 5000 });

  return picker;
}

test.describe('Block Picker — Basic blocks', () => {
  test('Text block creates a paragraph', async ({ page }) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Text block test');

    await picker.getByText('Text').click();

    const editor = page.locator('.tiptap.ProseMirror');
    // Use .first() because the editor may have multiple paragraphs (the original line + the new empty one)
    await expect(editor.locator('p').first()).toBeVisible({ timeout: 5000 });
  });

  test('Heading 1 creates an h1 element', async ({ page }) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Heading 1 test');

    await picker.getByText('Heading 1').click();

    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor.locator('h1')).toBeVisible({ timeout: 5000 });
  });

  test('Heading 2 creates an h2 element', async ({ page }) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Heading 2 test');

    await picker.getByText('Heading 2').click();

    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor.locator('h2')).toBeVisible({ timeout: 5000 });
  });

  test('Heading 3 creates an h3 element', async ({ page }) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Heading 3 test');

    await picker.getByText('Heading 3').click();

    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor.locator('h3')).toBeVisible({ timeout: 5000 });
  });

  test('Bulleted list creates a ul > li', async ({ page }) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Bullet test');

    await picker.getByText('Bulleted list').click();

    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor.locator('ul li')).toBeVisible({ timeout: 5000 });
  });

  test('Numbered list creates an ol > li', async ({ page }) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Numbered list test');

    await picker.getByText('Numbered list').click();

    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor.locator('ol li')).toBeVisible({ timeout: 5000 });
  });

  test('To-do list creates a task item with a checkbox', async ({ page }) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Todo test');

    await picker.getByText('To-do list').click();

    const editor = page.locator('.tiptap.ProseMirror');
    // TaskItem renders a label with a checkbox input
    const checkbox = editor.locator('input[type="checkbox"]');
    const taskItem = editor.locator('[data-type="taskItem"]');
    await expect(checkbox.or(taskItem).first()).toBeVisible({ timeout: 5000 });
  });

  test('Quote creates a blockquote element', async ({ page }) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Quote test');

    await picker.getByText('Quote').click();

    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor.locator('blockquote')).toBeVisible({ timeout: 5000 });
  });

  test('Code creates a pre > code element', async ({ page }) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Code test');

    await picker.getByText('Code').click();

    const editor = page.locator('.tiptap.ProseMirror');
    // Tiptap renders a <pre> wrapping a <code>; the <code> element may be
    // considered "hidden" by the layout engine (it fills the pre), so assert on
    // the <pre> element itself which is the visible container.
    await expect(editor.locator('pre')).toBeVisible({ timeout: 5000 });
  });

  test('Picker closes on Escape key', async ({ page }) => {
    await openFreshEditorPage(page);

    // Type and hover to show handle
    const editor = page.locator('.tiptap.ProseMirror');
    await page.keyboard.type('Escape test line');
    const textLocator = editor.getByText('Escape test line').first();
    await textLocator.hover();

    const blockHandle = page.locator('[data-block-handle]');
    await expect(blockHandle).toBeVisible({ timeout: 5000 });
    await blockHandle.click();

    const picker = page.locator('[data-block-picker]');
    await expect(picker).toBeVisible({ timeout: 5000 });

    // Press Escape — picker should disappear
    await page.keyboard.press('Escape');
    await expect(picker).not.toBeVisible({ timeout: 3000 });
  });

  test('Picker filters blocks by search query', async ({ page }) => {
    await openFreshEditorPage(page);

    const editor = page.locator('.tiptap.ProseMirror');
    await page.keyboard.type('Filter test line');
    const textLocator = editor.getByText('Filter test line').first();
    await textLocator.hover();

    const blockHandle = page.locator('[data-block-handle]');
    await expect(blockHandle).toBeVisible({ timeout: 5000 });
    await blockHandle.click();

    const picker = page.locator('[data-block-picker]');
    await expect(picker).toBeVisible({ timeout: 5000 });

    // Type into the search input to filter
    const searchInput = picker.locator('input');
    await searchInput.fill('heading');

    // Only heading items should be visible; "Text" should be gone
    await expect(picker.getByText('Heading 1')).toBeVisible({ timeout: 3000 });
    await expect(picker.getByText('Text')).not.toBeVisible();
  });
});

test.describe('Block Picker — Image persistence', () => {
  // Regression test: uploading an image and immediately reloading the page
  // (well inside the 10s Yjs snapshot debounce window) used to lose the
  // image entirely, because NexusEditor never flushed the pending debounced
  // snapshot save on unload/unmount.
  test('Image inserted via "+" survives an immediate page reload', async ({ page }, testInfo) => {
    await openFreshEditorPage(page);
    const picker = await openBlockPicker(page, 'Image persistence test');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await picker.getByText('Image').click();
    const fileChooser = await fileChooserPromise;
    const imagePath = createTestImage(testInfo.outputDir);
    await fileChooser.setFiles(imagePath);

    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor.locator('img')).toBeVisible({ timeout: 5000 });

    // Reload right away — before the 10s snapshot debounce would normally
    // fire on its own. The unload flush must persist it instead.
    await page.reload();

    const editorAfterReload = page.locator('.tiptap.ProseMirror');
    await expect(editorAfterReload.locator('img')).toBeVisible({ timeout: 10000 });
  });
});
