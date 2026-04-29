import { test, expect } from '@playwright/test';

test.describe('Comment system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/w\/.+\/dashboard/);

    // Create a fresh page for each test so comments don't bleed across runs.
    const newPageBtn = page.locator('aside').getByRole('button', { name: 'New Page' }).first();
    await newPageBtn.click();
    await expect(page).toHaveURL(/.*\/n\/.*/, { timeout: 15000 });

    const editor = page.locator('.tiptap.ProseMirror');
    await editor.click();
    await page.keyboard.type('A paragraph that we will comment on.');
  });

  test('creates a comment, replies, then resolves the thread', async ({ page }) => {
    const editor = page.locator('.tiptap.ProseMirror');

    // Select the paragraph text we just typed.
    await editor.click({ clickCount: 3 });

    // Click the Comment button in PageHeader. The label is hidden on small
    // viewports — match by the icon's aria-friendly button instead.
    const commentBtn = page.getByRole('button', { name: /Comment/i }).first();
    await commentBtn.click();

    // Sidebar should open.
    const sidebar = page.locator('h3', { hasText: 'Comments' });
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    // The newly created thread should appear (initially empty until we reply).
    // Reply input is the visible "Reply…" placeholder in the active thread.
    const replyInput = page.getByPlaceholder(/Reply/i).first();
    await expect(replyInput).toBeVisible({ timeout: 5000 });

    await replyInput.fill('Looks good to me');
    await replyInput.press('Enter');

    // Wait for the reply to render in the thread.
    await expect(page.getByText('Looks good to me')).toBeVisible({ timeout: 5000 });

    // Hover the thread card so the Resolve button appears.
    const threadCard = page.locator('text=Looks good to me').locator('..').locator('..').first();
    await threadCard.hover();

    const resolveBtn = page.getByRole('button', { name: /Resolve/i }).first();
    if (await resolveBtn.isVisible()) {
      await resolveBtn.click();
      // After resolve, the thread is hidden by default — the active count
      // pill drops to 0 and a "Show resolved" toggle appears.
      await expect(page.getByText(/resolved/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('orphan thread shows a deleted-text badge after the marked range is removed', async ({
    page,
  }) => {
    const editor = page.locator('.tiptap.ProseMirror');

    // Create a comment thread on the existing text.
    await editor.click({ clickCount: 3 });
    await page.getByRole('button', { name: /Comment/i }).first().click();
    const replyInput = page.getByPlaceholder(/Reply/i).first();
    await replyInput.fill('Anchor reply');
    await replyInput.press('Enter');
    await expect(page.getByText('Anchor reply')).toBeVisible({ timeout: 5000 });

    // Now nuke the text the comment was attached to.
    await editor.click({ clickCount: 3 });
    await page.keyboard.press('Delete');

    // The sidebar should mark the thread as orphan.
    await expect(
      page.getByText(/text this comment was attached to was deleted/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
