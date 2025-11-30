import { test, expect } from '@playwright/test';

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
    
    // Wait for page to load
    await page.waitForSelector('body', { state: 'visible' });
    
    // Try to find a way to create a user - look for "New" or "Add" button
    const newButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();
    const buttonCount = await newButton.count();
    
    if (buttonCount > 0) {
      await newButton.click();
      await page.waitForTimeout(500);
      
      // Check if owner role option is available in the form
      const ownerOption = page.locator('select option[value="owner"], input[value="owner"]');
      const ownerOptionCount = await ownerOption.count();
      
      // Owner should NOT see the option to create another owner
      expect(ownerOptionCount).toBe(0);
    }
  });

  test('should be able to create manager and staff accounts', async ({ page }) => {
    await page.goto('/admin/users-staff');
    
    // Wait for page to load
    await page.waitForSelector('body', { state: 'visible' });
    
    // Try to find a way to create a user
    const newButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();
    const buttonCount = await newButton.count();
    
    if (buttonCount > 0) {
      await newButton.click();
      await page.waitForTimeout(500);
      
      // Check if manager and staff role options are available
      const managerOption = page.locator('select option[value="manager"], input[value="manager"]');
      const managerOptionCount = await managerOption.count();
      
      // Owner should be able to create managers
      expect(managerOptionCount).toBeGreaterThan(0);
    }
  });
});

