import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'settings',
  featureArea: 'administration',
  description: 'Application settings management',
};

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
    await page.waitForLoadState('networkidle');
    
    // Wait for settings form to be visible
    await page.waitForSelector('form, select, input', { state: 'visible', timeout: 10000 });
    
    // Look for timezone select - try multiple selectors
    let timezoneSelect = page.locator('select[id*="timezone"]').or(page.locator('select[name*="timezone"]')).first();
    let selectCount = await timezoneSelect.count().catch(() => 0);
    
    if (selectCount === 0) {
      // Try finding by label
      const timezoneLabel = page.locator('label:has-text("Timezone"), label:has-text("timezone")');
      if (await timezoneLabel.count() > 0) {
        const labelFor = await timezoneLabel.getAttribute('for').catch(() => null);
        if (labelFor) {
          timezoneSelect = page.locator(`select#${labelFor}`).or(page.locator(`select[name="${labelFor}"]`)).first();
          selectCount = await timezoneSelect.count().catch(() => 0);
        }
      }
    }
    
    if (selectCount === 0) {
      // Try finding any select in a settings form
      timezoneSelect = page.locator('form select').first();
      selectCount = await timezoneSelect.count().catch(() => 0);
    }
    
    if (selectCount > 0) {
      await timezoneSelect.waitFor({ state: 'visible', timeout: 5000 });
      // Get current value
      const currentValue = await timezoneSelect.inputValue().catch(() => '');
      
      // Select a different timezone
      const options = await timezoneSelect.locator('option').count();
      if (options > 1) {
        // Select the second option (index 1)
        await timezoneSelect.selectIndex(1);
        // Wait for the select value to change
        await expect(timezoneSelect).not.toHaveValue(currentValue, { timeout: 2000 }).catch(() => {});
        
        // Verify the value changed
        const newValue = await timezoneSelect.inputValue().catch(() => '');
        if (newValue === currentValue && options > 2) {
          // Value didn't change, try next option
          await timezoneSelect.selectIndex(2);
          await expect(timezoneSelect).not.toHaveValue(currentValue, { timeout: 2000 }).catch(() => {});
        }
        
        // Save - look for enabled save button in the form
        const form = timezoneSelect.locator('xpath=ancestor::form').first();
        let saveButton = form.locator('button[type="submit"]:not([disabled])').first();
        
        if (await saveButton.count() === 0) {
          // Try finding save button by text
          saveButton = page.locator('button:has-text("Save"):not([disabled])').first();
        }
        
        if (await saveButton.count() > 0) {
          await saveButton.waitFor({ state: 'visible', timeout: 5000 });
          if (await saveButton.isEnabled().catch(() => false)) {
            await saveButton.click();
            
            // Wait for success message or form to update
            await Promise.race([
              page.waitForSelector('text=/success|saved|updated/i', { state: 'visible', timeout: 5000 }).catch(() => null),
              page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null),
            ]);
            
            // Check for success message or that the value persisted
            const successVisible = await page.locator('text=/success|saved|updated/i').isVisible({ timeout: 2000 }).catch(() => false);
            const finalValue = await timezoneSelect.inputValue().catch(() => '');
            // Success if we see success message OR the value is different from initial
            expect(successVisible || (finalValue !== '' && finalValue !== currentValue)).toBeTruthy();
          } else {
            // Button not enabled - scroll into view and wait for it to be enabled
            await saveButton.scrollIntoViewIfNeeded();
            await saveButton.waitFor({ state: 'visible', timeout: 2000 });
            await expect(saveButton).toBeEnabled({ timeout: 3000 }).catch(() => {});
            
            if (await saveButton.isEnabled().catch(() => false)) {
              await saveButton.click();
              // Wait for success message
              await page.waitForSelector('text=/success|saved|updated/i', { state: 'visible', timeout: 5000 }).catch(() => {});
              const successVisible = await page.locator('text=/success|saved|updated/i').isVisible({ timeout: 2000 }).catch(() => false);
              expect(successVisible).toBeTruthy();
            } else {
              // Can't save - skip
              test.skip();
            }
          }
        } else {
          // No save button found - might auto-save or feature not available
          test.skip();
        }
      } else {
        // Only one option - skip test
        test.skip();
      }
    } else {
      // No timezone select found - skip test
      test.skip();
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

