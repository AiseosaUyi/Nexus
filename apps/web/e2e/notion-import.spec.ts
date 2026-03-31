import { test, expect, Page } from '@playwright/test';

/** Helper: get the current workspace slug from the URL */
async function getWorkspaceSlug(page: Page): Promise<string> {
  const url = page.url();
  const match = url.match(/\/w\/([^/]+)/);
  if (!match) throw new Error(`Could not extract workspace slug from ${url}`);
  return match[1];
}

test.describe('Notion Import E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/', { timeout: 60000 });
    
    // Increased timeout and added a check for the sidebar as a backup sign of being logged in
    await Promise.race([
      page.waitForURL(/\/w\/.+/, { timeout: 30000 }),
      page.waitForSelector('aside', { timeout: 30000 })
    ]);

    const url = page.url();
    if (!url.includes('/dashboard')) {
      const slugMatch = url.match(/\/w\/([^/]+)/);
      if (slugMatch) {
        await page.goto(`/w/${slugMatch[1]}/dashboard`);
      }
    }
    await page.waitForLoadState('networkidle');
  });

  test('imports a public Notion page and verifies content presence', async ({ page }) => {
    const notionUrl = 'https://grand-tulip-c22.notion.site/Junior-PM-at-Gruve-c22fef8b0b154c8ab9486b4fad235de8';
    
    // 1. Open Import Modal
    await page.getByRole('button', { name: 'Import Page' }).click();
    await expect(page.getByText('Import', { exact: true }).first()).toBeVisible();

    // 2. Switch to Web URL tab
    await page.getByRole('button', { name: 'Web URL' }).click();

    // 3. Fill Notion URL
    const urlInput = page.getByTestId('import-url-input');
    await urlInput.fill(notionUrl);

    // 4. Click Fetch
    await page.getByRole('button', { name: 'Fetch' }).click();

    // 5. Wait for preview
    await expect(page.getByText('Junior PM at Gruve')).toBeVisible({ timeout: 15000 });

    // 6. Add to queue
    await page.getByText('Add to import queue').click();

    // 7. Click Import
    await page.getByTestId('import-submit-btn').click();

    // 8. Wait for "Open" link and click it
    const openLink = page.locator('a').filter({ hasText: 'Open' }).first();
    await expect(openLink).toBeVisible({ timeout: 20000 });
    await openLink.click();

    // 9. Verify page content (Wait for the editor to load)
    await page.waitForURL(/\/w\/.+\/n\/.+/);
    
    // The title should be correct
    await expect(page.locator('h1[contenteditable]')).toContainText('Junior PM at Gruve');

    // CRITICAL: The content should NOT be empty. 
    // We expect some keywords from the Notion page to satisfy this test.
    // E.g., "About Gruve", "Role Overview", "Requirements"
    await expect(page.getByText('About Gruve')).toBeVisible({ timeout: 10000 });
  });
});
