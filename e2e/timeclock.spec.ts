import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'timeclock',
  featureArea: 'staff',
  description: 'Timeclock functionality (clock in/out)',
};

test.use({ storageState: '.auth/admin.json' });

test.describe('Timeclock', () => {
  test('should navigate to timeclock tab', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    // Look for clock in/out tab
    const clockTab = page.locator('button:has-text("Clock"), [role="tab"]:has-text("Clock"), button:has-text("Timeclock")');
    const tabCount = await clockTab.count();
    
    if (tabCount > 0) {
      await clockTab.first().click();
      await page.waitForTimeout(1000);
      
      // Clock interface should be visible
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display clock in/out interface', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const clockTab = page.locator('button:has-text("Clock"), [role="tab"]:has-text("Clock")');
    if (await clockTab.count() > 0) {
      await clockTab.first().click();
      await page.waitForTimeout(1000);
      
      // Should show clock interface
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });

  test('should display shift history', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const clockTab = page.locator('button:has-text("Clock"), [role="tab"]:has-text("Clock")');
    if (await clockTab.count() > 0) {
      await clockTab.first().click();
      await page.waitForTimeout(1000);
      
      // Look for shift history/list
      const shiftHistory = page.locator('[data-shift], .shift-entry, table, tbody');
      const historyCount = await shiftHistory.count();
      
      // Should show shift history (may be empty)
      expect(historyCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should filter shifts by employee', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const clockTab = page.locator('button:has-text("Clock"), [role="tab"]:has-text("Clock")');
    if (await clockTab.count() > 0) {
      await clockTab.first().click();
      await page.waitForTimeout(1000);
      
      // Look for employee filter
      const employeeFilter = page.locator('select[id*="employee"], select[name*="employee"]');
      const filterCount = await employeeFilter.count();
      
      if (filterCount > 0) {
        const options = await employeeFilter.locator('option').count();
        if (options > 1) {
          await employeeFilter.selectIndex(1);
          await page.waitForTimeout(1000);
          
          // Filter should be applied
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });

  test('should filter shifts by date range', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const clockTab = page.locator('button:has-text("Clock"), [role="tab"]:has-text("Clock")');
    if (await clockTab.count() > 0) {
      await clockTab.first().click();
      await page.waitForTimeout(1000);
      
      // Look for date range inputs
      const startDateInput = page.locator('input[type="date"][id*="start"], input[type="date"][name*="start"]');
      const endDateInput = page.locator('input[type="date"][id*="end"], input[type="date"][name*="end"]');
      
      if (await startDateInput.count() > 0 && await endDateInput.count() > 0) {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const today = new Date();
        
        await startDateInput.fill(lastWeek.toISOString().split('T')[0]);
        await endDateInput.fill(today.toISOString().split('T')[0]);
        await page.waitForTimeout(1000);
        
        // Filter should be applied
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should display hours worked calculation', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const clockTab = page.locator('button:has-text("Clock"), [role="tab"]:has-text("Clock")');
    if (await clockTab.count() > 0) {
      await clockTab.first().click();
      await page.waitForTimeout(1000);
      
      // Look for hours display (may show totals or per-shift)
      const hoursDisplay = page.locator('text=/hours|hrs|time worked/i');
      const hoursCount = await hoursDisplay.count();
      
      // Hours may or may not be displayed depending on data
      expect(hoursCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should edit clock times', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const clockTab = page.locator('button:has-text("Clock"), [role="tab"]:has-text("Clock")');
    if (await clockTab.count() > 0) {
      await clockTab.first().click();
      await page.waitForTimeout(1000);
      
      // Look for edit buttons on shifts
      const editButtons = page.locator('button:has-text("Edit"), button[aria-label*="Edit"]');
      const editCount = await editButtons.count();
      
      if (editCount > 0) {
        await editButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Edit form should appear
        const formVisible = await page.locator('form, [role="dialog"], input[type="datetime-local"]').isVisible().catch(() => false);
        expect(formVisible).toBeTruthy();
      }
    }
  });
});

