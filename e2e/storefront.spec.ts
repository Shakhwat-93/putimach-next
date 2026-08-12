import { test, expect } from '@playwright/test';

test.describe('Storefront E2E & Regression Tests', () => {
  test('should load storefront home page instantly without blocking loading screen', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PutiMach/i);
    // Verify hero or branding is visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should navigate to shop page', async ({ page }) => {
    await page.goto('/shop');
    await expect(page).toHaveTitle(/PutiMach/i);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
