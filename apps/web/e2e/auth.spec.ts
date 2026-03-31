import { test, expect } from '@playwright/test';

// Auth tests verify unauthenticated flows — override the global storageState
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication Flow', () => {
  test('should show the landing page with auth CTAs', async ({ page }) => {
    await page.goto('/');

    // Check for landing page hero heading
    await expect(page.locator('h1')).toContainText('Your second brain');

    // Sign In link should exist and point to /login
    const signInLink = page.getByRole('link', { name: /sign in/i }).first();
    await expect(signInLink).toBeVisible();
  });

  test('should navigate to login page without a redirect loop', async ({ page }) => {
    await page.goto('/login');

    // Verify we are actually on the login page and not redirected
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('should navigate to signup page without a redirect loop', async ({ page }) => {
    await page.goto('/signup');

    // Verify we are actually on the signup page
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator('h1')).toContainText('Create your account');
  });

  test('should show error message on invalid login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Server action redirects to /login?error=...
    await expect(page).toHaveURL(/error=/);
    await expect(page.locator('[class*="red"]')).toBeVisible();
  });
});
