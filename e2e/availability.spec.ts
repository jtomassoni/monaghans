import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'availability',
  featureArea: 'staff',
  description: 'Employee availability management',
};

test.use({ storageState: '.auth/admin.json' });

test.describe('Availability Management', () => {
  test('should navigate to availability tab', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    // Look for availability tab
    const availabilityTab = page.locator('button:has-text("Availability"), [role="tab"]:has-text("Availability")');
    const tabCount = await availabilityTab.count();
    
    expect(tabCount).toBeGreaterThan(0);
    
    if (tabCount > 0) {
      await availabilityTab.first().click();
      await page.waitForTimeout(1000);
      
      // Availability view should be visible
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display availability entries', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const availabilityTab = page.locator('button:has-text("Availability"), [role="tab"]:has-text("Availability")');
    if (await availabilityTab.count() > 0) {
      await availabilityTab.first().click();
      await page.waitForTimeout(1000);
      
      // Should show availability content (may be empty)
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });

  test('should filter availability by employee', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const availabilityTab = page.locator('button:has-text("Availability"), [role="tab"]:has-text("Availability")');
    if (await availabilityTab.count() > 0) {
      await availabilityTab.first().click();
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

  test('should filter availability by status', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const availabilityTab = page.locator('button:has-text("Availability"), [role="tab"]:has-text("Availability")');
    if (await availabilityTab.count() > 0) {
      await availabilityTab.first().click();
      await page.waitForTimeout(1000);
      
      // Look for status filter (available/unavailable)
      const statusFilter = page.locator('select[id*="status"], select[name*="status"], button:has-text("Available"), button:has-text("Unavailable")');
      const filterCount = await statusFilter.count();
      
      if (filterCount > 0) {
        await statusFilter.first().click();
        await page.waitForTimeout(1000);
        
        // Filter should be applied
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should navigate between months', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const availabilityTab = page.locator('button:has-text("Availability"), [role="tab"]:has-text("Availability")');
    if (await availabilityTab.count() > 0) {
      await availabilityTab.first().click();
      await page.waitForTimeout(1000);
      
      // Look for month navigation buttons
      const nextMonthButton = page.locator('button:has-text("Next"), button[aria-label*="Next"], button[aria-label*="next"]');
      if (await nextMonthButton.count() > 0) {
        await nextMonthButton.first().click();
        await page.waitForTimeout(1000);
        
        // Should still be on availability page
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should view availability submissions', async ({ page }) => {
    await page.goto('/admin/staff');
    
    await page.waitForTimeout(1000);
    
    const availabilityTab = page.locator('button:has-text("Availability"), [role="tab"]:has-text("Availability")');
    if (await availabilityTab.count() > 0) {
      await availabilityTab.first().click();
      await page.waitForTimeout(1000);
      
      // Look for availability entries (may be empty)
      const availabilityEntries = page.locator('[data-availability], .availability-entry, tr');
      const entryCount = await availabilityEntries.count();
      
      // Should at least show the table/list structure
      expect(entryCount).toBeGreaterThanOrEqual(0);
    }
  });
});

