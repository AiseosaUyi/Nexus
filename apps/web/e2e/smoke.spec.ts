import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the landing page successfully', async ({ page }) => {
    // Navigate to the root URL
    const response = await page.goto('/');

    // Assert that the page loaded without server errors (HTTP 500s)
    expect(response?.ok()).toBeTruthy();
    expect(response?.status()).toBeLessThan(400);

    // Verify critical UI elements load (assumes landing page has Nexus title/branding)
    await expect(page).toHaveTitle(/Nexus/);
  });

  test('should verify the login route is accessible', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Make sure we see an Email input or similar auth element indicative of rendering
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });
});
