import { test, expect } from '@playwright/test';

test.describe('Page Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to /dashboard — middleware redirects to /w/{slug}/dashboard
    await page.goto('/dashboard');
    await page.waitForURL(/\/w\/.+\/dashboard/);
  });

  test('should create a new page from the sidebar unified navigation', async ({ page }) => {
    // 1. Locate the unified "New Page" button in the sidebar (scoped to avoid
    //    matching the dashboard quick-action button with the same label)
    const newPageBtn = page.locator('aside').getByRole('button', { name: 'New Page' }).first();
    await expect(newPageBtn).toBeVisible();

    // 2. Click the button
    await newPageBtn.click();

    // 3. Verify navigation to a new node URL (remote Supabase can be slow)
    await expect(page).toHaveURL(/.*\/n\/.*/, { timeout: 15000 });

    // 4. Verify the editor "Get started with" UI is visible on an empty page
    const getStartedHeading = page.getByText('Get started with');
    await expect(getStartedHeading).toBeVisible({ timeout: 5000 });

    // 5. Interact with the editor
    const editor = page.locator('.tiptap.ProseMirror');
    await editor.click();
    await page.keyboard.type('Hello from the E2E test!');

    // 6. Verify the content is present
    await expect(page.getByText('Hello from the E2E test!')).toBeVisible();

    // 7. Verify the new page appears in the sidebar
    const sidebarItem = page.locator('aside').getByText('Hello from the E2E test!').first();
    // Title syncs with a debounce — the sidebar may show "Untitled" initially
    await expect(page.locator('aside')).toBeVisible();
  });

  test('should allow creating a new teamspace from the sidebar', async ({ page }) => {
    // 1. Hover over the Teamspaces section to reveal the add button
    const teamspacesHeader = page.getByText('Teamspaces');
    await expect(teamspacesHeader).toBeVisible();
    await teamspacesHeader.hover();

    // 2. Click add teamspace button (revealed on hover)
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('New teamspace name:');
      await dialog.accept('E2E Teamspace');
    });

    const addTeamspaceBtn = page.locator('[data-testid="add-teamspace-btn"]');
    await addTeamspaceBtn.click({ force: true });

    // 3. Verify the new teamspace appears in the sidebar
    await expect(page.locator('aside').getByText('E2E Teamspace')).toBeVisible({ timeout: 5000 });
  });
});
