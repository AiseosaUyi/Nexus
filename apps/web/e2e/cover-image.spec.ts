import { test, expect } from '@playwright/test';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Generate a tiny test image (1x1 red pixel PNG)
function createTestImage(dir: string): string {
  mkdirSync(dir, { recursive: true });
  const filePath = resolve(dir, 'test-cover.png');
  // Minimal valid PNG: 1x1 red pixel
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

test.describe('Cover Image', () => {
  let pageUrl: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForURL(/\/w\/.+/, { timeout: 15000 });

    // Try sidebar "New Page" button first, fall back to workspace dashboard "+ New page" or direct creation
    const sidebarNewPage = page.locator('aside').getByRole('button', { name: /new page/i }).first();
    const dashboardNewPage = page.getByRole('button', { name: /new page/i }).first();

    if (await sidebarNewPage.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sidebarNewPage.click();
    } else if (await dashboardNewPage.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dashboardNewPage.click();
      // Handle the "New page" modal — pick Private and create
      const privateOption = page.getByText('Private');
      if (await privateOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await privateOption.click();
        await page.getByRole('button', { name: /create page/i }).click();
      }
    }

    await expect(page).toHaveURL(/.*\/n\/.*/, { timeout: 15000 });
    pageUrl = page.url();
  });

  test('should open cover picker and select a gallery image', async ({ page }) => {
    // Hover over the header area to reveal "Add cover" button
    const header = page.locator('.group\\/header').first();
    await header.hover();

    // Click "Add cover"
    const addCoverBtn = page.getByText('Add cover');
    await expect(addCoverBtn).toBeVisible({ timeout: 5000 });
    await addCoverBtn.click();

    // Cover picker should open with gallery
    const picker = page.getByText('Choose a cover');
    await expect(picker).toBeVisible();

    // Gallery images should be visible
    const galleryItems = page.locator('[title="Purple Haze"], [title="Ocean Blue"], [title="Mountains"]');
    await expect(galleryItems.first()).toBeVisible({ timeout: 5000 });

    // Click a gallery gradient
    await page.locator('[title="Purple Haze"]').click();

    // Cover should be displayed (picker closes, cover area visible)
    const coverArea = page.locator('.group\\/cover');
    await expect(coverArea).toBeVisible({ timeout: 5000 });
  });

  test('should upload an image from device', async ({ page }) => {
    // Create a test image file
    const testImagePath = createTestImage(resolve(__dirname, '../test-results'));

    // Hover to reveal "Add cover"
    const header = page.locator('.group\\/header').first();
    await header.hover();

    const addCoverBtn = page.getByText('Add cover');
    await expect(addCoverBtn).toBeVisible({ timeout: 5000 });
    await addCoverBtn.click();

    // Cover picker should open
    await expect(page.getByText('Choose a cover')).toBeVisible();

    // Click "Upload from device" — this triggers a hidden file input
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(testImagePath);

    // Wait for the cover to appear (either as img or div with background)
    const coverArea = page.locator('.group\\/cover');
    await expect(coverArea).toBeVisible({ timeout: 10000 });

    // Cover picker should close after upload
    await expect(page.getByText('Choose a cover')).not.toBeVisible();
  });

  test('should allow icon and cover at the same time', async ({ page }) => {
    // First add a cover
    const header = page.locator('.group\\/header').first();
    await header.hover();

    const addCoverBtn = page.getByText('Add cover');
    await expect(addCoverBtn).toBeVisible({ timeout: 5000 });
    await addCoverBtn.click();
    await page.locator('[title="Ocean Blue"]').click();

    // Cover should be visible
    const coverArea = page.locator('.group\\/cover');
    await expect(coverArea).toBeVisible({ timeout: 5000 });

    // Now hover again — "Add icon" button should still be available
    await header.hover();
    const addIconBtn = page.getByText('Add icon');
    await expect(addIconBtn).toBeVisible({ timeout: 5000 });
  });

  test('should change and remove cover', async ({ page }) => {
    // Add a cover first
    const header = page.locator('.group\\/header').first();
    await header.hover();
    await page.getByText('Add cover').click();
    await page.locator('[title="Mint Fresh"]').click();

    // Cover visible
    const coverArea = page.locator('.group\\/cover');
    await expect(coverArea).toBeVisible({ timeout: 5000 });

    // Hover on cover — "Change cover" and "Remove cover" should appear
    await coverArea.hover();
    const changeCoverBtn = page.getByText('Change cover');
    await expect(changeCoverBtn).toBeVisible({ timeout: 3000 });

    const removeCoverBtn = page.getByText('Remove cover');
    await expect(removeCoverBtn).toBeVisible();

    // Click remove
    await removeCoverBtn.click();

    // Cover should be gone
    await expect(coverArea).not.toBeVisible({ timeout: 3000 });
  });
});
