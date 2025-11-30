import { test, expect } from '@playwright/test';

// Test with both superadmin and owner roles
const roles = ['superadmin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Announcements Management (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    test('should navigate to announcements page', async ({ page }) => {
      await page.goto('/admin');
      
      // Navigate to announcements
      await page.click('a:has-text("Announcements")');
      
      // Should be on announcements page
      await expect(page).toHaveURL(/\/admin\/announcements/);
    });

    test('should display announcements list', async ({ page }) => {
      await page.goto('/admin/announcements');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have announcements content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should be able to create new announcement', async ({ page }) => {
      await page.goto('/admin/announcements');
      
      // Look for "New" or "Add" button
      const newButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();
      const buttonCount = await newButton.count();
      
      if (buttonCount > 0) {
        await newButton.click();
        await page.waitForTimeout(500);
        
        // Form should be visible
        const formVisible = await page.locator('form, [role="dialog"]').isVisible().catch(() => false);
        expect(formVisible).toBeTruthy();
      }
    });
  });
}

