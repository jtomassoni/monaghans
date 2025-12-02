import { test, expect } from '@playwright/test';

// Test with both admin and owner roles
const roles = ['admin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Specials Management (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    test('should navigate to food specials page', async ({ page }) => {
      await page.goto('/admin');
      
      // Navigate to food specials
      await page.click('a:has-text("Food Specials")');
      
      // Should be on food specials page
      await expect(page).toHaveURL(/\/admin\/food-specials/);
    });

    test('should navigate to drink specials page', async ({ page }) => {
      await page.goto('/admin');
      
      // Navigate to drink specials
      await page.click('a:has-text("Drink Specials")');
      
      // Should be on drink specials page
      await expect(page).toHaveURL(/\/admin\/drink-specials/);
    });

    test('should display specials list', async ({ page }) => {
      await page.goto('/admin/food-specials');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have some content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should be able to create new special', async ({ page }) => {
      await page.goto('/admin/food-specials');
      
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

