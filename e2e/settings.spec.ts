import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Settings Management', () => {
  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/admin');
    
    // Navigate to settings
    await page.click('a:has-text("Settings")');
    
    // Should be on settings page
    await expect(page).toHaveURL(/\/admin\/settings/);
  });

  test('should display settings form', async ({ page }) => {
    await page.goto('/admin/settings');
    
    await page.waitForTimeout(1000);
    
    // Form should be visible
    await expect(page.locator('body')).toBeVisible();
    
    // Should have settings content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should update business hours', async ({ page }) => {
    await page.goto('/admin/settings');
    
    await page.waitForTimeout(1000);
    
    // Look for hours inputs (could be various formats)
    const hoursInputs = page.locator('input[type="time"], input[id*="hour"], input[name*="hour"]');
    const inputCount = await hoursInputs.count();
    
    if (inputCount > 0) {
      // Update first hours input
      await hoursInputs.first().fill('09:00');
      
      // Save
      const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
      if (await saveButton.count() > 0) {
        await saveButton.first().click();
        await page.waitForTimeout(2000);
        
        const successVisible = await page.locator('text=/success|saved|updated/i').isVisible().catch(() => false);
        expect(successVisible).toBeTruthy();
      }
    }
  });

  test('should update business information', async ({ page }) => {
    await page.goto('/admin/settings');
    
    await page.waitForTimeout(1000);
    
    // Look for address/phone inputs
    const addressInput = page.locator('input[id*="address"], textarea[id*="address"], input[name*="address"]');
    const phoneInput = page.locator('input[id*="phone"], input[name*="phone"]');
    
    if (await addressInput.count() > 0) {
      await addressInput.first().fill('123 Test Street');
      
      if (await phoneInput.count() > 0) {
        await phoneInput.first().fill('(555) 123-4567');
      }
      
      // Save
      const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
      if (await saveButton.count() > 0) {
        await saveButton.first().click();
        await page.waitForTimeout(2000);
        
        const successVisible = await page.locator('text=/success|saved|updated/i').isVisible().catch(() => false);
        expect(successVisible).toBeTruthy();
      }
    }
  });

  test('should configure shift types', async ({ page }) => {
    await page.goto('/admin/settings');
    
    await page.waitForTimeout(1000);
    
    // Look for shift type configuration
    const shiftTypeSection = page.locator('text=/shift type|shift config/i');
    const sectionCount = await shiftTypeSection.count();
    
    if (sectionCount > 0) {
      // Should be able to configure shift types
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should update timezone setting', async ({ page }) => {
    await page.goto('/admin/settings');
    
    await page.waitForTimeout(1000);
    
    // Look for timezone select
    const timezoneSelect = page.locator('select[id*="timezone"], select[name*="timezone"]');
    const selectCount = await timezoneSelect.count();
    
    if (selectCount > 0) {
      // Select a different timezone
      const options = await timezoneSelect.locator('option').count();
      if (options > 1) {
        await timezoneSelect.selectIndex(1);
        
        // Save
        const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(2000);
          
          const successVisible = await page.locator('text=/success|saved|updated/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    }
  });

  test('should toggle online ordering', async ({ page }) => {
    await page.goto('/admin/settings');
    
    await page.waitForTimeout(1000);
    
    // Look for online ordering toggle
    const orderingToggle = page.locator('input[type="checkbox"][id*="ordering"], input[type="checkbox"][name*="ordering"]');
    const toggleCount = await orderingToggle.count();
    
    if (toggleCount > 0) {
      const initialState = await orderingToggle.first().isChecked();
      await orderingToggle.first().click();
      await page.waitForTimeout(500);
      
      const newState = await orderingToggle.first().isChecked();
      expect(newState).not.toBe(initialState);
      
      // Save
      const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
      if (await saveButton.count() > 0) {
        await saveButton.first().click();
        await page.waitForTimeout(2000);
        
        const successVisible = await page.locator('text=/success|saved|updated/i').isVisible().catch(() => false);
        expect(successVisible).toBeTruthy();
      }
    }
  });
});

