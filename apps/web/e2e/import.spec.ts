import { test, expect, Page } from '@playwright/test';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

/** Minimal markdown content used across all import tests */
const MD_CONTENT = `# Imported Heading

This paragraph was imported from a Markdown file.

## Section Two

- Bullet one
- Bullet two

Some final text.`;

/** Helper: upload an in-memory .md file to a visible file input */
async function uploadMarkdown(page: Page, inputSelector: string, filename = 'test-import.md') {
  const input = page.locator(inputSelector);
  await input.setInputFiles({
    name: filename,
    mimeType: 'text/markdown',
    buffer: Buffer.from(MD_CONTENT),
  });
}

/** Helper: get the current workspace slug from the URL */
async function getWorkspaceSlug(page: Page): Promise<string> {
  const url = page.url();
  const match = url.match(/\/w\/([^/]+)/);
  if (!match) throw new Error(`Could not extract workspace slug from ${url}`);
  return match[1];
}

// ─── 1. Dashboard → "Import Page" quick action ───────────────────────────────

test.describe('Dashboard Import', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard (URL must match /w/<slug>/dashboard)
    await page.goto('/');
    await page.waitForURL(/\/w\/.+/);
    const slug = await getWorkspaceSlug(page);
    await page.goto(`/w/${slug}/dashboard`);
    await page.waitForLoadState('networkidle');
  });

  test('opens import modal from "Import Page" quick action', async ({ page }) => {
    await page.getByRole('button', { name: 'Import Page' }).click();

    // Modal should appear
    await expect(page.getByText('Import', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('File Upload')).toBeVisible();
    await expect(page.getByText('Web URL')).toBeVisible();
  });

  test('shows destination picker with Private option', async ({ page }) => {
    await page.getByRole('button', { name: 'Import Page' }).click();

    await expect(page.getByTestId('destination-private')).toBeVisible();
    await expect(page.getByText('Destination')).toBeVisible();
  });

  test('can create a new teamspace from destination picker', async ({ page }) => {
    await page.getByRole('button', { name: 'Import Page' }).click();

    // Click "New teamspace"
    await page.getByTestId('create-teamspace-btn').click();
    const nameInput = page.getByTestId('new-teamspace-input');
    await expect(nameInput).toBeVisible();

    await nameInput.fill('E2E Import Space');
    await nameInput.press('Enter');

    // New teamspace option should appear in destination list
    await expect(page.getByText('E2E Import Space')).toBeVisible();
  });

  test('imports a markdown file and creates a new page (Private)', async ({ page }) => {
    await page.getByRole('button', { name: 'Import Page' }).click();

    // Select Private destination (already default)
    await expect(page.getByTestId('destination-private')).toBeVisible();

    // Upload the markdown file
    await uploadMarkdown(page, '[data-testid="import-file-input"]');

    // File should appear in the queue
    await expect(page.getByText('Imported Heading')).toBeVisible();

    // Submit
    await page.getByTestId('import-submit-btn').click();

    // Wait for import to complete — "Open" link appears
    await expect(page.locator('a').filter({ hasText: 'Open' })).toBeVisible({ timeout: 15_000 });
  });

  test('imports a markdown file to an existing teamspace', async ({ page }) => {
    await page.getByRole('button', { name: 'Import Page' }).click();

    // Create a teamspace to import into
    await page.getByTestId('create-teamspace-btn').click();
    await page.getByTestId('new-teamspace-input').fill('Dashboard Import TS');
    await page.getByTestId('new-teamspace-input').press('Enter');
    await expect(page.getByText('Dashboard Import TS')).toBeVisible({ timeout: 5_000 });

    // Select that teamspace as destination
    await page.getByText('Dashboard Import TS').click();

    // Upload file
    await uploadMarkdown(page, '[data-testid="import-file-input"]');
    await expect(page.getByText('Imported Heading')).toBeVisible();

    // Import
    await page.getByTestId('import-submit-btn').click();
    await expect(page.locator('a').filter({ hasText: 'Open' })).toBeVisible({ timeout: 15_000 });
  });
});

// ─── 2. Sidebar → "Import" nav item ──────────────────────────────────────────

test.describe('Sidebar Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/w\/.+/);
  });

  test('opens import modal from sidebar nav', async ({ page }) => {
    await page.getByRole('button', { name: 'Import' }).click();

    await expect(page.getByText('File Upload')).toBeVisible();
    await expect(page.getByTestId('destination-private')).toBeVisible();
  });

  test('imports markdown and creates page (Private)', async ({ page }) => {
    await page.getByRole('button', { name: 'Import' }).click();

    await uploadMarkdown(page, '[data-testid="import-file-input"]');
    await expect(page.getByText('Imported Heading')).toBeVisible();

    await page.getByTestId('import-submit-btn').click();
    await expect(page.locator('a').filter({ hasText: 'Open' })).toBeVisible({ timeout: 15_000 });
  });

  test('imports markdown into a selected teamspace from sidebar', async ({ page }) => {
    await page.getByRole('button', { name: 'Import' }).click();

    // Create a new teamspace inline
    await page.getByTestId('create-teamspace-btn').click();
    await page.getByTestId('new-teamspace-input').fill('Sidebar Import TS');
    await page.getByTestId('new-teamspace-input').press('Enter');
    await expect(page.getByText('Sidebar Import TS')).toBeVisible({ timeout: 5_000 });

    // Select it
    await page.getByText('Sidebar Import TS').click();

    // Upload and import
    await uploadMarkdown(page, '[data-testid="import-file-input"]');
    await page.getByTestId('import-submit-btn').click();
    await expect(page.locator('a').filter({ hasText: 'Open' })).toBeVisible({ timeout: 15_000 });
  });

  test('navigates to created page after import', async ({ page }) => {
    await page.getByRole('button', { name: 'Import' }).click();

    await uploadMarkdown(page, '[data-testid="import-file-input"]');
    await page.getByTestId('import-submit-btn').click();

    const openLink = page.locator('a').filter({ hasText: 'Open' }).first();
    await expect(openLink).toBeVisible({ timeout: 15_000 });

    // Navigate to the created page
    await openLink.click();
    await page.waitForURL(/\/w\/.+\/n\/.+/);

    // The page should render with the imported title in the header
    await expect(page.getByText('Imported Heading')).toBeVisible({ timeout: 10_000 });
  });
});

// ─── 3. In-page import (populates existing page content) ─────────────────────

test.describe('In-page Import', () => {
  let pageUrl: string;

  test.beforeEach(async ({ page }) => {
    // Create a fresh blank page to import into
    await page.goto('/');
    await page.waitForURL(/\/w\/.+/);
    const slug = await getWorkspaceSlug(page);

    // Open the "New Page" modal from sidebar Import button vicinity — or use
    // the dashboard to create a blank page first
    await page.goto(`/w/${slug}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Create blank page via the New Page quick action
    await page.getByRole('button', { name: 'New Page' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Accept the default (Private) and create
    await page.getByRole('button', { name: /Create page/i }).click();

    // Wait until we land on a node page
    await page.waitForURL(/\/w\/.+\/n\/.+/, { timeout: 15_000 });
    pageUrl = page.url();
  });

  test('opens page import modal from ⋯ menu → Import', async ({ page }) => {
    // Open the MoreHorizontal dropdown menu in PageHeader
    await page.getByTestId('page-header-import-btn').waitFor({ timeout: 5_000 }).catch(async () => {
      // The button is inside the dropdown — open it first
      await page.locator('button:has(svg)').filter({ hasText: '' }).last().click();
    });

    // Open the ⋯ menu
    await page.locator('[data-radix-collection-item]').first().waitFor({ timeout: 2_000 }).catch(() => {});
    const moreBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    await moreBtn.click({ timeout: 5_000 }).catch(async () => {
      // Try clicking the MoreHorizontal icon directly
      const moreHoriz = page.locator('svg').last();
      await moreHoriz.click();
    });

    // Click Import
    await page.getByTestId('page-header-import-btn').click({ timeout: 5_000 });

    // PageImportModal should open
    await expect(page.getByText('Import into page')).toBeVisible({ timeout: 5_000 });
  });

  test('imports markdown file and populates page content', async ({ page }) => {
    // Open dropdown and click Import
    const dropdownTrigger = page.locator('button').filter({
      has: page.locator('.lucide-more-horizontal'),
    });
    await dropdownTrigger.click();
    await page.getByTestId('page-header-import-btn').click();

    // Modal should open
    await expect(page.getByText('Import into page')).toBeVisible({ timeout: 5_000 });

    // Upload the markdown file
    await uploadMarkdown(page, '[data-testid="page-import-file-input"]');

    // Should show processing → done
    await expect(page.getByText('Content imported successfully')).toBeVisible({ timeout: 15_000 });

    // After auto-close + refresh, editor should contain imported text
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Imported Heading')).toBeVisible({ timeout: 10_000 });
  });

  test('import modal shows file and URL tabs', async ({ page }) => {
    const dropdownTrigger = page.locator('button').filter({
      has: page.locator('.lucide-more-horizontal'),
    });
    await dropdownTrigger.click();
    await page.getByTestId('page-header-import-btn').click();

    await expect(page.getByText('Import into page')).toBeVisible();
    await expect(page.getByRole('button', { name: 'File' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'URL' })).toBeVisible();
  });

  test('page title stays intact after importing content', async ({ page }) => {
    // Set a custom title before importing
    const titleEl = page.locator('h1[contenteditable]');
    await titleEl.click();
    await titleEl.fill('My Import Test Page');

    // Open dropdown → Import
    const dropdownTrigger = page.locator('button').filter({
      has: page.locator('.lucide-more-horizontal'),
    });
    await dropdownTrigger.click();
    await page.getByTestId('page-header-import-btn').click();

    await uploadMarkdown(page, '[data-testid="page-import-file-input"]');
    await expect(page.getByText('Content imported successfully')).toBeVisible({ timeout: 15_000 });

    // Title is managed separately from editor content — it should remain
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1[contenteditable]')).toContainText('My Import Test Page');
  });
});

// ─── 4. URL import (smoke — just verify the fetch + queue flow) ───────────────

test.describe('URL Import flow (UI only)', () => {
  test('shows fetch button and error state for invalid URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/w\/.+/);

    await page.getByRole('button', { name: 'Import' }).click();
    await page.getByRole('button', { name: 'Web URL' }).click();

    const urlInput = page.getByTestId('import-url-input');
    await urlInput.fill('https://this-domain-definitely-does-not-exist-xyz.com/page');
    await page.getByRole('button', { name: 'Fetch' }).click();

    // Should show an error (could not connect, DNS failure, etc.)
    await expect(page.locator('[class*="text-red"]')).toBeVisible({ timeout: 15_000 });
  });
});
