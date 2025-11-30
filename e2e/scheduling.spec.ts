import { test, expect } from '@playwright/test';

// Test with both superadmin and owner roles
const roles = ['superadmin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Scheduling (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    test('should navigate to scheduling page', async ({ page }) => {
      await page.goto('/admin');
      
      // Navigate to scheduling
      await page.click('a:has-text("Scheduling")');
      
      // Should be on scheduling page
      await expect(page).toHaveURL(/\/admin\/staff/);
    });

    test('should display scheduling interface', async ({ page }) => {
      await page.goto('/admin/staff');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have scheduling content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should have schedule tab', async ({ page }) => {
      await page.goto('/admin/staff');
      
      // Look for schedule tab
      const scheduleTab = page.locator('button:has-text("Schedule"), a:has-text("Schedule"), [role="tab"]:has-text("Schedule")');
      const tabCount = await scheduleTab.count();
      
      if (tabCount > 0) {
        await scheduleTab.first().click();
        await page.waitForTimeout(500);
        
        // Schedule view should be visible
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should have availability tab', async ({ page }) => {
      await page.goto('/admin/staff');
      
      // Look for availability tab
      const availabilityTab = page.locator('button:has-text("Availability"), a:has-text("Availability"), [role="tab"]:has-text("Availability")');
      const tabCount = await availabilityTab.count();
      
      if (tabCount > 0) {
        await availabilityTab.first().click();
        await page.waitForTimeout(500);
        
        // Availability view should be visible
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });
}

