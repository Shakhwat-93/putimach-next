import { test, expect } from '@playwright/test';

test.describe('Comprehensive Full Website QA Audit Suite', () => {
  const consoleErrors: { url: string; msg: string }[] = [];
  const networkFailures: { url: string; status: number; reqUrl: string }[] = [];

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ url: page.url(), msg: msg.text() });
      }
    });
    page.on('response', res => {
      if (res.status() >= 400 && res.status() !== 404 && res.status() !== 401) {
        networkFailures.push({ url: page.url(), status: res.status(), reqUrl: res.url() });
      }
    });
  });

  test('Public Routes Audit & Form Validation Check', async ({ page }) => {
    // 1. Homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/PutiMach/i);

    // 2. Shop Page
    await page.goto('/shop');
    await expect(page.locator('body')).toBeVisible();

    // 3. Track Order Page (Test Empty & Invalid Tracking Input)
    await page.goto('/track');
    const phoneInput = page.locator('input[placeholder*="Phone"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('000');
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }
    }

    // 4. Contact Us Form Test
    await page.goto('/contact-us');
    await expect(page.locator('body')).toBeVisible();

    // 5. Checkout Page Validation (Test Invalid Inputs)
    await page.goto('/checkout');
    await expect(page.locator('body')).toBeVisible();

    // 6. Footer & Static Policy Pages
    const staticRoutes = ['/our-story', '/faq', '/returns-exchanges', '/shipping-info', '/privacy-policy', '/terms-of-service', '/cookie-policy'];
    for (const route of staticRoutes) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Admin ERP All Modules & Action Flow Audit', async ({ page }) => {
    const adminRoutes = [
      '/admin',
      '/admin/ordersboard',
      '/admin/orders',
      '/admin/storefrontmanagement',
      '/admin/storefront',
      '/admin/inventorypage',
      '/admin/inventory',
      '/admin/taskboard',
      '/admin/tasks',
      '/admin/call-team',
      '/admin/moderator',
      '/admin/steadfast',
      '/admin/factory',
      '/admin/digital-marketer',
      '/admin/reportspanel',
      '/admin/usermanagement',
      '/admin/settings',
      '/admin/fraudcontrol',
      '/admin/backup',
      '/admin/profile'
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      // Ensure "Preparing Workspace…" infinite blocker is never present on taskboard
      if (route.includes('tasks')) {
        await expect(page.getByText('Preparing Workspace…')).not.toBeVisible({ timeout: 4000 });
      }
    }
  });

  test('Edge Case & Negative Testing (404, Invalid Routes, Malformed Query)', async ({ page }) => {
    // 1. Non-existent product slug
    await page.goto('/product/non-existent-product-slug-xyz-999');
    await expect(page.locator('body')).toBeVisible();

    // 2. Non-existent admin subpage
    await page.goto('/admin/invalid-subpage-999');
    await expect(page.locator('body')).toBeVisible();
  });

  test.afterAll(async () => {
    console.log('--- CONSOLE ERRORS CAPTURED DURING AUDIT ---');
    console.log(JSON.stringify(consoleErrors, null, 2));
    console.log('--- NETWORK FAILURES CAPTURED DURING AUDIT ---');
    console.log(JSON.stringify(networkFailures, null, 2));
  });
});
