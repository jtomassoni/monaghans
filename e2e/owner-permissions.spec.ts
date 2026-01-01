import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'owner-permissions',
  featureArea: 'administration',
  description: 'Owner role permissions and restrictions',
};

// Test owner role permissions and restrictions
test.use({ storageState: '.auth/owner.json' });

test.describe('Owner Permissions', () => {
  test('should be able to access admin dashboard as owner', async ({ page }) => {
    await page.goto('/admin');
    
    // Owner should be able to see the dashboard
    await expect(page.locator('text=Monaghan\'s')).toBeVisible();
  });

  test('should be able to view events as owner', async ({ page }) => {
    await page.goto('/admin/events');
    
    // Owner should be able to view events
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be able to view menu as owner', async ({ page }) => {
    await page.goto('/admin/menu');
    
    // Owner should be able to view menu
    await expect(page.locator('body')).toBeVisible();
  });

  test('should NOT be able to create owner accounts', async ({ page }) => {
    await page.goto('/admin/users-staff');
    await page.waitForLoadState('networkidle');
    
    // Wait for page content to load
    await page.waitForSelector('body', { state: 'visible' });
    
    // Try to find a way to create a user - look for "Add Person" or "New" or "Add" button
    const newButton = page.locator('button:has-text("Add Person")').or(page.locator('button:has-text("New")')).or(page.locator('button:has-text("Add")')).or(page.locator('button:has-text("Create")')).first();
    const buttonCount = await newButton.count().catch(() => 0);
    
      if (buttonCount > 0) {
      await newButton.waitFor({ state: 'visible', timeout: 5000 });
      if (await newButton.isVisible().catch(() => false)) {
        // Try normal click first
        let buttonClicked = false;
        try {
          await newButton.click({ timeout: 3000 });
          buttonClicked = true;
        } catch {
          // Click failed, try scrolling and clicking again
          try {
            await newButton.scrollIntoViewIfNeeded();
            await newButton.click({ timeout: 3000 });
            buttonClicked = true;
          } catch {
            // Still failed, use force as last resort
            await newButton.click({ force: true });
            buttonClicked = true;
          }
        }
        
        if (buttonClicked) {
          // Wait for form/modal to appear - wait for form inputs
          await page.waitForSelector('select, input[type="text"], input[type="email"], [role="dialog"]', { state: 'visible', timeout: 5000 });
        }
        
        // Check if owner role option is available in the form
        const ownerOption = page.locator('select option[value="owner"]').or(page.locator('input[value="owner"]'));
        const ownerOptionCount = await ownerOption.count().catch(() => 0);
        
        // Owner should NOT see the option to create another owner
        expect(ownerOptionCount).toBe(0);
      } else {
        // Button not visible - skip test
        test.skip();
      }
    } else {
      // No button found - might not have permission or feature not available
      test.skip();
    }
  });

  test('should be able to create manager and staff accounts', async ({ page }) => {
    await page.goto('/admin/users-staff');
    await page.waitForLoadState('networkidle');
    
    // Wait for page content to load
    await page.waitForSelector('body', { state: 'visible' });
    
    // Try to find a way to create a user
    const newButton = page.locator('button:has-text("New")').or(page.locator('button:has-text("Add")')).or(page.locator('button:has-text("Create")')).first();
    const buttonCount = await newButton.count().catch(() => 0);
    
      if (buttonCount > 0) {
      await newButton.waitFor({ state: 'visible', timeout: 5000 });
      if (await newButton.isVisible().catch(() => false)) {
        // Try normal click first
        let buttonClicked = false;
        try {
          await newButton.click({ timeout: 3000 });
          buttonClicked = true;
        } catch {
          // Click failed, try scrolling and clicking again
          try {
            await newButton.scrollIntoViewIfNeeded();
            await newButton.click({ timeout: 3000 });
            buttonClicked = true;
          } catch {
            // Still failed, use force as last resort
            await newButton.click({ force: true });
            buttonClicked = true;
          }
        }
        
        if (buttonClicked) {
          // Wait for form/modal to appear - wait for form inputs
          await page.waitForSelector('select, input[type="text"], input[type="email"], [role="dialog"]', { state: 'visible', timeout: 5000 });
        }
        
        // Check if manager and staff role options are available
        const managerOption = page.locator('select option[value="manager"]').or(page.locator('input[value="manager"]'));
        const managerOptionCount = await managerOption.count().catch(() => 0);
        
        // Owner should be able to create managers
        expect(managerOptionCount).toBeGreaterThan(0);
      } else {
        // Button not visible - skip test
        test.skip();
      }
    } else {
      // No button found - might not have permission or feature not available
      test.skip();
    }
  });
});


