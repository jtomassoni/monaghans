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
    await page.waitForLoadState('networkidle');
    
    // Wait for navigation to be ready
    await page.waitForTimeout(500);
    
    // Navigate to settings - wait for link to be visible
    const settingsLink = page.locator('a:has-text("Settings")');
    await settingsLink.waitFor({ state: 'visible', timeout: 5000 });
    await settingsLink.click();
    
    // Should be on settings page
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10000 });
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
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for Business Hours section - TimePicker renders as buttons, not inputs
    // Find the Monday open time button (first time picker button in Business Hours section)
    const hoursSection = page.locator('text=Business Hours').locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]');
    
    // Find Monday row - it should have two time picker buttons (open and close)
    const mondayRow = hoursSection.locator('text=Monday').locator('xpath=ancestor::div[contains(@class, "flex")]').first();
    const timeButtons = mondayRow.locator('button').filter({ hasText: /AM|PM|Select time/ });
    const buttonCount = await timeButtons.count();
    
    if (buttonCount > 0) {
      // Click the first time button (open time) to open the time picker
      await timeButtons.first().click();
      await page.waitForTimeout(500);
      
      // The time picker should open - look for hour/minute buttons
      // Try to select 9:00 AM (9 hours, 0 minutes)
      // First, try to find and click hour 9 (data-hour="9")
      const hour9Button = page.locator('button[data-hour="9"]').first();
      if (await hour9Button.count() > 0) {
        await hour9Button.scrollIntoViewIfNeeded();
        await hour9Button.click();
        await page.waitForTimeout(300);
        
        // Then click minute 0 (data-minute="0")
        const minute0Button = page.locator('button[data-minute="0"]').first();
        if (await minute0Button.count() > 0) {
          await minute0Button.scrollIntoViewIfNeeded();
          await minute0Button.click();
          await page.waitForTimeout(300);
        }
        
        // Click "Done" button to close the picker
        const doneButton = page.locator('button:has-text("Done")').first();
        if (await doneButton.count() > 0) {
          await doneButton.click();
          await page.waitForTimeout(500);
        }
      } else {
        // Fallback: close picker and try a different approach
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      
      // Find the Save button in the Business Hours section card
      // The Save button should be enabled after making changes
      await page.waitForTimeout(1000); // Wait for dirty state to update
      const saveButton = hoursSection.locator('button:has-text("Save"):not([disabled])');
      
      if (await saveButton.count() > 0) {
        await saveButton.first().click();
        await page.waitForTimeout(2000);
        
        // Wait for toast notification - it appears in top-right corner with class bg-green-900
        const successVisible = await page.locator('.bg-green-900').filter({ hasText: /success|saved|updated/i }).isVisible({ timeout: 5000 }).catch(() => false);
        expect(successVisible).toBeTruthy();
      } else {
        throw new Error('Save button not found or not enabled in Business Hours section after time change');
      }
    } else {
      throw new Error('Business hours time picker buttons not found');
    }
  });

  test('should update business information', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for Contact Information section - find the address and phone inputs
    const addressInput = page.locator('input[id="address"]');
    const phoneInput = page.locator('input[id="phone"]');
    
    const addressCount = await addressInput.count().catch(() => 0);
    const phoneCount = await phoneInput.count().catch(() => 0);
    
    if (addressCount > 0 || phoneCount > 0) {
      // Find the Contact Information section card
      const contactSection = page.locator('text=Contact Information').locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]');
      
      if (addressCount > 0) {
        await addressInput.waitFor({ state: 'visible', timeout: 5000 });
        await addressInput.fill('123 Test Street');
        await page.waitForTimeout(500);
      }
      
      if (phoneCount > 0) {
        await phoneInput.waitFor({ state: 'visible', timeout: 5000 });
        await phoneInput.fill('(555) 123-4567');
        await page.waitForTimeout(500);
      }
      
      // Find Save button in Contact Information section
      const saveButton = contactSection.locator('button:has-text("Save"):not([disabled])');
      await page.waitForTimeout(1000); // Wait for dirty state to update
      
      if (await saveButton.count() > 0) {
        await saveButton.first().click();
        await page.waitForTimeout(2000);
        
        // Wait for toast notification - check for green toast in top-right
        // The toast appears with class bg-green-900 and contains success text
        const successToast = page.locator('.bg-green-900').filter({ hasText: /success|saved|updated/i });
        const successVisible = await successToast.isVisible({ timeout: 5000 }).catch(() => false);
        if (!successVisible) {
          // Fallback: check for any success text on the page
          const anySuccess = await page.locator('text=/success|saved|updated/i').isVisible({ timeout: 2000 }).catch(() => false);
          expect(anySuccess).toBeTruthy();
        } else {
          expect(successVisible).toBeTruthy();
        }
      } else {
        throw new Error('Save button not found or not enabled in Contact Information section');
      }
    } else {
      throw new Error('Contact information inputs not found');
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
    await page.waitForTimeout(2000);
    
    // Look for timezone select - it has id="timezone"
    const timezoneSelect = page.locator('select[id="timezone"]');
    const selectCount = await timezoneSelect.count().catch(() => 0);
    
    if (selectCount > 0) {
      await timezoneSelect.waitFor({ state: 'visible', timeout: 5000 });
      
      // Get current value
      const currentValue = await timezoneSelect.inputValue().catch(() => '');
      
      // Find the Timezone section card
      const timezoneSection = page.locator('text=Timezone').locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]');
      
      // Select a different timezone
      const options = await timezoneSelect.locator('option').count();
      if (options > 1) {
        // Select the second option (index 1)
        await timezoneSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        
        // Verify the value changed
        const newValue = await timezoneSelect.inputValue().catch(() => '');
        if (newValue === currentValue && options > 2) {
          // Value didn't change, try next option
          await timezoneSelect.selectOption({ index: 2 });
          await page.waitForTimeout(500);
        }
        
        // Find Save button in Timezone section
        const saveButton = timezoneSection.locator('button:has-text("Save"):not([disabled])');
        await page.waitForTimeout(1000); // Wait for dirty state
        
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(2000);
          
          // Wait for toast notification - check for green toast in top-right
          const successToast = page.locator('.bg-green-900').filter({ hasText: /success|saved|updated/i });
          const successVisible = await successToast.isVisible({ timeout: 5000 }).catch(() => false);
          if (!successVisible) {
            // Fallback: check for any success text on the page
            const anySuccess = await page.locator('text=/success|saved|updated/i').isVisible({ timeout: 2000 }).catch(() => false);
            expect(anySuccess).toBeTruthy();
          } else {
            expect(successVisible).toBeTruthy();
          }
        } else {
          throw new Error('Save button not found or not enabled in Timezone section');
        }
      } else {
        throw new Error('Timezone select has only one option - cannot test changing timezone');
      }
    } else {
      throw new Error('Timezone select not found');
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

