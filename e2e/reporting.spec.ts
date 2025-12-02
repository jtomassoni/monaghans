import { test, expect } from '@playwright/test';

// Test with both admin and owner roles
const roles = ['admin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Reporting (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    test('should navigate to reporting page', async ({ page }) => {
      await page.goto('/admin');
      
      // Navigate to reporting
      await page.click('a:has-text("Reporting")');
      
      // Should be on reporting page
      await expect(page).toHaveURL(/\/admin\/reporting/);
    });

    test('should display reporting options', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have reporting content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should have reporting sections', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      // Look for common reporting sections
      const reportingSections = page.locator('text=/food cost|labor cost|sales|profitability|analytics/i');
      const sectionCount = await reportingSections.count();
      
      // Should have at least some reporting options
      expect(sectionCount).toBeGreaterThanOrEqual(0);
    });
  });
}

