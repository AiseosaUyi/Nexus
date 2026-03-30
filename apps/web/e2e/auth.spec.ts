import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show the landing page with auth CTAs', async ({ page }) => {
    await page.goto('/');
    
    // Check for landing page elements
    await expect(page.locator('h1')).toContainText('Your second brain');
    
    // Sign In button should exist and point to /login
    const signInButton = page.getByRole('button', { name: /sign in/i }).first();
    await expect(signInButton).toBeVisible();
  });

  test('should navigate to login page without a redirect loop', async ({ page }) => {
    await page.goto('/login');
    
    // Verify we are actually on the login page and not redirected to /
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

    // Wait for the URL to include an error param or see the error alert
    await expect(page).toHaveURL(/error=/);
    await expect(page.locator('div')).toContainText(/invalid/i);
  });
});
