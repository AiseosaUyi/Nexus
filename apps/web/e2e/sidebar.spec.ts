import { test, expect } from '@playwright/test';

test.describe('Sidebar Interactivity', () => {
  test.beforeEach(async ({ page }) => {
    // In a real production setup, we would use a test user and handle login here.
    // For now, we'll navigate to the workspace (assuming the server is running).
    await page.goto('/');
  });

  test('should allow renaming a node from the sidebar', async ({ page }) => {
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
    const input = page.locator('input[value="Untitled"]');
    await expect(input).toBeFocused();
    await input.fill('My New Page');
    await input.press('Enter');

    // 5. Verify the title is updated in the sidebar
    await expect(page.locator('aside').getByText('My New Page')).toBeVisible();
  });

  test('should allow duplicating a node', async ({ page }) => {
    const sidebarItem = page.locator('aside').getByText('Untitled').first();
    await expect(sidebarItem).toBeVisible();

    // 1. Open context menu and duplicate
    await sidebarItem.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();

    // 2. Verify navigation to the new node
    await expect(page).toHaveURL(/.*\/n\/.*/);
    
    // 3. Verify the copy exists in the sidebar
    await expect(page.locator('aside').getByText('Untitled (Copy)')).toBeVisible();
  });
});
