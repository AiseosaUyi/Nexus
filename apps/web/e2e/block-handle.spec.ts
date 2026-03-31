import { test, expect } from '@playwright/test';

/**
 * Block Handle "+" Button Tests
 *
 * Verifies that the block handle appears when hovering over a paragraph in the
 * Nexus editor, stays visible as the mouse moves left toward the "+" button,
 * and that clicking the "+" button inserts a "/" and opens the slash command
 * menu.
 *
 * Implementation notes from NexusEditor.tsx:
 * - The outer wrapper has paddingLeft: 48 and marginLeft: -48, so the "+" button
 *   (left: 8 inside that wrapper) is ~40px to the left of the ProseMirror content.
 * - onMouseLeave is only fired when the cursor leaves the entire outer wrapper,
 *   NOT when it moves from the text into the left margin — so moving left should
 *   keep the handle visible.
 * - handleBlockAdd inserts a "/" at the end of the hovered block, which triggers
 *   the Tiptap SlashCommand suggestion via tippy.js (appended to document.body).
 * - The first group label in the slash menu is "Basic blocks".
 */
test.describe('Block Handle "+" Button', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Navigate to /dashboard — middleware redirects to /w/{slug}/dashboard
    await page.goto('/dashboard');

    // 2. Wait for the workspace redirect
    await page.waitForURL(/\/w\/.+\/dashboard/, { timeout: 15000 });
  });

  test('shows handle on hover, stays visible moving left, opens slash menu on click', async ({ page }) => {
    // ── Step 1: Create a new page ───────────────────────────────────────────
    const newPageBtn = page.locator('aside').getByRole('button', { name: 'New Page' }).first();
    await expect(newPageBtn).toBeVisible({ timeout: 10000 });
    await newPageBtn.click();

    // 4. Wait for navigation to the node URL
    await expect(page).toHaveURL(/.*\/n\/.*/, { timeout: 15000 });

    // ── Step 2: Type a line of text into the editor ─────────────────────────
    const editor = page.locator('.tiptap.ProseMirror');
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await page.keyboard.type('Block handle test line');

    // Confirm the text is present in the editor
    await expect(editor.getByText('Block handle test line')).toBeVisible({ timeout: 5000 });

    // ── Step 3: Hover over the typed text line ──────────────────────────────
    // Get the bounding box of the paragraph element containing our text
    const paragraph = editor.locator('p', { hasText: 'Block handle test line' }).first();
    await expect(paragraph).toBeVisible();
    const paraBox = await paragraph.boundingBox();
    if (!paraBox) throw new Error('Could not get bounding box for paragraph');

    // Move mouse to the vertical center of the paragraph, horizontally inside the text
    const textMidX = paraBox.x + paraBox.width / 2;
    const textMidY = paraBox.y + paraBox.height / 2;
    await page.mouse.move(textMidX, textMidY);

    // 7. Assert the block handle button becomes visible
    const blockHandle = page.locator('[data-block-handle]');
    await expect(blockHandle).toBeVisible({ timeout: 5000 });

    // ── Step 4: Move mouse left toward the "+" button ───────────────────────
    // The "+" button is positioned at left: 8 inside a wrapper that has
    // marginLeft: -48, so the button lives ~40px to the left of the ProseMirror
    // content edge. We move to a point clearly to the left of the text but still
    // inside the outer wrapper (which extends 48px left of the content).
    const blockHandleBox = await blockHandle.boundingBox();
    if (!blockHandleBox) throw new Error('Could not get bounding box for block handle');

    // Target: center of the "+" button itself
    const handleCenterX = blockHandleBox.x + blockHandleBox.width / 2;
    const handleCenterY = blockHandleBox.y + blockHandleBox.height / 2;
    await page.mouse.move(handleCenterX, handleCenterY);

    // 8. Assert the block handle button is STILL visible after moving left
    await expect(blockHandle).toBeVisible({ timeout: 3000 });

    // ── Step 5: Click the "+" button ────────────────────────────────────────
    // 9. Click — this calls handleBlockAdd which inserts "/" and triggers the
    //    slash command suggestion rendered via tippy.js into document.body.
    await blockHandle.click();

    // ── Step 6: Assert the slash command menu appears ────────────────────────
    // The slash menu is a tippy popup appended to <body>. The CommandsList
    // component renders a group label "Basic blocks" as the first category header.
    // We use a broad locator scoped to document.body to find that text.
    const slashMenu = page.locator('[data-tippy-root]');
    await expect(slashMenu).toBeVisible({ timeout: 5000 });

    // Also verify the "Basic blocks" group label is present inside the menu
    await expect(slashMenu.getByText('Basic blocks')).toBeVisible({ timeout: 3000 });
  });
});
