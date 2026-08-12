import { test, expect } from '@playwright/test';

test.describe('Admin Panel E2E & Regression Tests', () => {
  test('should load admin dashboard overview', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveTitle(/PutiMach/i);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should load storefront management page', async ({ page }) => {
    await page.goto('/admin/storefrontmanagement');
    await expect(page).toHaveTitle(/PutiMach/i);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should load tasks workspace page without getting stuck on Preparing Workspace', async ({ page }) => {
    await page.goto('/admin/tasks');
    await expect(page).toHaveTitle(/PutiMach/i);
    // Ensure Preparing Workspace loader is not stuck infinitely
    await expect(page.getByText('Preparing Workspace…')).not.toBeVisible({ timeout: 5000 });
  });
});
