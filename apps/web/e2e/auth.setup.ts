import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL || 'aiseosauyiidahor@gmail.com';
  const password = process.env.E2E_TEST_PASSWORD;

  if (!password) {
    throw new Error(
      'E2E_TEST_PASSWORD environment variable is required. ' +
      'Add it to .env.local: E2E_TEST_PASSWORD=your_password'
    );
  }

  // 1. Navigate to login
  await page.goto('/login');

  // 2. Fill credentials
  await page.fill('#email', email);
  await page.fill('#password', password);

  // 3. Submit
  await page.click('button[type="submit"]');

  // 4. Wait for redirection — could land on /w/... (has workspace) or /dashboard (no workspace)
  await page.waitForURL(/\/(w\/|dashboard)/, { timeout: 15000 });

  // 5. If on onboarding (no workspace), create one
  if (page.url().endsWith('/dashboard') || page.url().includes('/dashboard?')) {
    const createBtn = page.getByRole('button', { name: 'Create First Workspace' });
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      // Fill in workspace name
      const nameInput = page.getByRole('textbox', { name: 'Workspace Name' });
      await nameInput.waitFor({ timeout: 5000 });
      await nameInput.fill('E2E Test Workspace');
      // Fill in slug
      const slugInput = page.getByRole('textbox', { name: 'Workspace Slug' });
      await slugInput.fill('e2e-test');
      // Submit
      await page.getByRole('button', { name: 'Create Workspace' }).click();
      await page.waitForURL(/.*\/w\/.*/, { timeout: 15000 });
    }
  }

  // 6. Verify the sidebar is visible as a smoke test for successful login
  await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });

  // 6. Save the storage state to a file
  await page.context().storageState({ path: authFile });
});
