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

  // 4. Wait for redirection to dashboard (URL contains /w/)
  await page.waitForURL(/.*\/w\/.*/, { timeout: 15000 });

  // 5. Verify the sidebar is visible as a smoke test for successful login
  await expect(page.locator('aside')).toBeVisible();

  // 6. Save the storage state to a file
  await page.context().storageState({ path: authFile });
});
