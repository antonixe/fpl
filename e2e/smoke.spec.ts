import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads and shows title', async ({ page }) => {
    await page.goto('/');
    // Page should load without errors
    await expect(page).toHaveTitle(/FPL/i);
    // Navigation should be visible
    await expect(page.locator('text=FPLGRID').first()).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.goto('/');

    // Click Players link
    await page.click('nav >> text=Players');
    await page.waitForURL('**/players');
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();

    // Click Fixtures link
    await page.click('nav >> text=Fixtures');
    await page.waitForURL('**/fixtures');

    // Click Live link
    await page.click('nav >> text=Live');
    await page.waitForURL('**/live');

    // Click Optimizer link
    await page.click('nav >> text=Optimizer');
    await page.waitForURL('**/optimizer');

    // Click Dashboard (home)
    await page.click('nav >> text=Dashboard');
    await page.waitForURL('/');
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('text=Page Not Found').first()).toBeVisible();
  });

  test('skip to content link exists', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveCount(1);
  });

  test('theme toggle cycles themes', async ({ page }) => {
    await page.goto('/');
    const themeBtn = page.locator('button[aria-label^="Theme:"]');
    await expect(themeBtn).toBeVisible();

    // Click to cycle through themes
    await themeBtn.click();
    const label1 = await themeBtn.getAttribute('aria-label');
    await themeBtn.click();
    const label2 = await themeBtn.getAttribute('aria-label');
    await themeBtn.click();
    const label3 = await themeBtn.getAttribute('aria-label');

    // All three labels should be different
    expect(new Set([label1, label2, label3]).size).toBe(3);
  });
});

test.describe('Player Detail Page', () => {
  test('player page loads with valid ID', async ({ page }) => {
    // Use a known player ID (Salah = 328, Haaland = 351 — varies by season)
    // Just test that /players/1 doesn't crash
    const response = await page.goto('/players/1');
    // Should load (200) or show player not found — not a server error
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe('Optimizer Page', () => {
  test('optimizer loads with mode tabs', async ({ page }) => {
    await page.goto('/optimizer');
    // Should show the three mode buttons
    await expect(page.locator('text=Transfer Advisor').first()).toBeVisible();
    await expect(page.locator('text=Squad Builder').first()).toBeVisible();
    await expect(page.locator('text=Chip Advisor').first()).toBeVisible();
  });

  test('optimizer modes switch on click', async ({ page }) => {
    await page.goto('/optimizer');
    // Click on Chip Advisor tab
    await page.locator('button:has-text("Chip Advisor")').click();
    // Should show chip-related content
    await expect(page.locator('text=Your FPL Team').first()).toBeVisible();
  });
});

test.describe('Health Check', () => {
  test('health endpoint returns valid response', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBeLessThanOrEqual(503);

    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('checks');
    expect(['ok', 'degraded']).toContain(body.status);
  });
});
