import { test, expect } from '@playwright/test';

test.describe('Sidebar Interactivity', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the workspace dashboard (authenticated via setup)
    await page.goto('/dashboard');
    await page.waitForURL(/\/w\/.+\/dashboard/);
  });

  test('should allow renaming a node from the sidebar', async ({ page }) => {
    // First create a page so there's a node to rename
    const newPageBtn = page.getByRole('button', { name: 'New Page' }).first();
    await newPageBtn.click();
    await page.waitForURL(/\/n\/.*/);

    // Go back to dashboard and find the node
    await page.goto('/dashboard');
    await page.waitForURL(/\/w\/.+\/dashboard/);

    // 1. Locate a node in the sidebar
    const sidebarItem = page.locator('aside').getByText('Untitled').first();
    await expect(sidebarItem).toBeVisible();

    // 2. Right click to open context menu
    await sidebarItem.click({ button: 'right' });

    // 3. Click "Rename"
    const renameOption = page.getByRole('menuitem', { name: 'Rename' });
    await expect(renameOption).toBeVisible();
    await renameOption.click();

    // 4. Type new title and press Enter
    const input = page.locator('aside input');
    await input.waitFor({ state: 'visible' });
    await input.fill('My Renamed Page');
    await input.press('Enter');

    // 5. Verify the title is updated in the sidebar
    await expect(page.locator('aside').getByText('My Renamed Page')).toBeVisible();
  });

  test('should allow duplicating a node via context menu', async ({ page }) => {
    // First create a page so there's a node to duplicate
    const newPageBtn = page.getByRole('button', { name: 'New Page' }).first();
    await newPageBtn.click();
    await page.waitForURL(/\/n\/.*/);

    await page.goto('/dashboard');
    await page.waitForURL(/\/w\/.+\/dashboard/);

    const sidebarItem = page.locator('aside').getByText('Untitled').first();
    await expect(sidebarItem).toBeVisible();

    // 1. Open context menu and duplicate
    await sidebarItem.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();

    // 2. Verify navigation to the new node
    await expect(page).toHaveURL(/.*\/n\/.*/);

    // 3. Verify at least one copy exists in the sidebar
    await expect(page.locator('aside').getByText('Untitled (Copy)').first()).toBeVisible({ timeout: 5000 });
  });
});
