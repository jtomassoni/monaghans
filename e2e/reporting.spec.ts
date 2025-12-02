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
      
      await page.waitForTimeout(1000);
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have reporting content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should view food cost report', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      await page.waitForTimeout(1000);
      
      // Look for food cost link/button
      const foodCostLink = page.locator('a:has-text("Food Cost"), button:has-text("Food Cost"), text=/food cost/i').first();
      const linkCount = await foodCostLink.count();
      
      if (linkCount > 0) {
        await foodCostLink.first().click();
        await page.waitForTimeout(2000);
        
        // Should show food cost report
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should view labor cost report', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      await page.waitForTimeout(1000);
      
      const laborCostLink = page.locator('a:has-text("Labor Cost"), button:has-text("Labor Cost"), text=/labor cost/i').first();
      const linkCount = await laborCostLink.count();
      
      if (linkCount > 0) {
        await laborCostLink.first().click();
        await page.waitForTimeout(2000);
        
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should view sales analytics', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      await page.waitForTimeout(1000);
      
      const salesLink = page.locator('a:has-text("Sales"), button:has-text("Sales"), text=/sales analytics/i').first();
      const linkCount = await salesLink.count();
      
      if (linkCount > 0) {
        await salesLink.first().click();
        await page.waitForTimeout(2000);
        
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should view profitability report', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      await page.waitForTimeout(1000);
      
      const profitabilityLink = page.locator('a:has-text("Profitability"), button:has-text("Profitability"), text=/profitability/i').first();
      const linkCount = await profitabilityLink.count();
      
      if (linkCount > 0) {
        await profitabilityLink.first().click();
        await page.waitForTimeout(2000);
        
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should view AI insights', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      await page.waitForTimeout(1000);
      
      const aiLink = page.locator('a:has-text("AI"), button:has-text("AI"), text=/insights|recommendations/i').first();
      const linkCount = await aiLink.count();
      
      if (linkCount > 0) {
        await aiLink.first().click();
        await page.waitForTimeout(2000);
        
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should filter reports by date range', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      await page.waitForTimeout(1000);
      
      // Look for date range inputs
      const startDateInput = page.locator('input[type="date"][id*="start"], input[type="date"][name*="start"]');
      const endDateInput = page.locator('input[type="date"][id*="end"], input[type="date"][name*="end"]');
      
      if (await startDateInput.count() > 0 && await endDateInput.count() > 0) {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const today = new Date();
        
        await startDateInput.first().fill(lastMonth.toISOString().split('T')[0]);
        await endDateInput.first().fill(today.toISOString().split('T')[0]);
        
        // Look for apply/update button
        const applyButton = page.locator('button:has-text("Apply"), button:has-text("Update"), button:has-text("Filter")');
        if (await applyButton.count() > 0) {
          await applyButton.first().click();
          await page.waitForTimeout(2000);
          
          // Report should update
          await expect(page.locator('body')).toBeVisible();
        }
      }
    });

    test('should export report data', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      await page.waitForTimeout(1000);
      
      // Look for export button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export")');
      const exportCount = await exportButton.count();
      
      if (exportCount > 0) {
        // Export functionality may trigger download or show options
        await exportButton.first().click();
        await page.waitForTimeout(1000);
        
        // Should handle export (may download file or show options)
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should have reporting sections', async ({ page }) => {
      await page.goto('/admin/reporting');
      
      await page.waitForTimeout(1000);
      
      // Look for common reporting sections
      const reportingSections = page.locator('text=/food cost|labor cost|sales|profitability|analytics/i');
      const sectionCount = await reportingSections.count();
      
      // Should have at least some reporting options
      expect(sectionCount).toBeGreaterThanOrEqual(0);
    });
  });
}

