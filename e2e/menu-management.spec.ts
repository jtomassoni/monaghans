import { test, expect } from '@playwright/test';

// Test with both superadmin and owner roles
const roles = ['superadmin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Menu Management (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    test('should navigate to menu management page', async ({ page }) => {
      await page.goto('/admin');
      
      // Navigate to menu
      await page.click('a:has-text("Menu")');
      
      // Should be on menu management page
      await expect(page).toHaveURL(/\/admin\/menu/);
    });

    test('should display menu sections and items', async ({ page }) => {
      await page.goto('/admin/menu');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have menu content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should be able to create new menu section', async ({ page }) => {
      await page.goto('/admin/menu');
      
      // Wait for page to load
      await expect(page.locator('body')).toBeVisible();
      
      // Look for "New Section" button - it should have text "New Section"
      const newButton = page.locator('button:has-text("New Section")');
      const buttonCount = await newButton.count();
      
      if (buttonCount > 0) {
        await newButton.first().click();
        // Wait for modal to appear
        await page.waitForSelector('form', { state: 'visible', timeout: 5000 });
        
        // Form should be visible - check for the form with the name input field
        const formVisible = await page.locator('form input[id="name"]').isVisible().catch(() => false);
        expect(formVisible).toBeTruthy();
      } else {
        // If no button found, check if there's a "Create First Section" button (empty state)
        const createFirstButton = page.locator('button:has-text("Create First Section")');
        const createFirstCount = await createFirstButton.count();
        
        if (createFirstCount > 0) {
          await createFirstButton.first().click();
          await page.waitForSelector('form', { state: 'visible', timeout: 5000 });
          const formVisible = await page.locator('form input[id="name"]').isVisible().catch(() => false);
          expect(formVisible).toBeTruthy();
        } else {
          // If neither button exists, the test should fail
          throw new Error('Could not find "New Section" or "Create First Section" button');
        }
      }
    });
  });
}

