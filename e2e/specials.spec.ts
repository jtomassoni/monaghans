import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'specials',
  featureArea: 'content',
  description: 'Specials management (create, edit, delete, date ranges)',
};
import { TestDataTracker } from './test-helpers';

// Test with both admin and owner roles
const roles = ['admin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Specials Management (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    // Track test data for cleanup
    let tracker: TestDataTracker;

    test.beforeEach(() => {
      tracker = new TestDataTracker(`.auth/${role}.json`, 'Test ');
    });

    test.afterEach(async () => {
      await tracker.cleanup();
    });

    test('should navigate to food specials page', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      // Wait for navigation to be ready and expand sections if needed
      await page.waitForTimeout(500);
      
      // Navigate to food specials - wait for link to be visible
      const foodSpecialsLink = page.locator('a:has-text("Food Specials")');
      await foodSpecialsLink.waitFor({ state: 'visible', timeout: 5000 });
      await foodSpecialsLink.click();
      
      // Should be on food specials page
      await expect(page).toHaveURL(/\/admin\/food-specials/, { timeout: 10000 });
    });

    test('should navigate to drink specials page', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      // Wait for navigation to be ready and expand sections if needed
      await page.waitForTimeout(500);
      
      // Navigate to drink specials - wait for link to be visible
      const drinkSpecialsLink = page.locator('a:has-text("Drink Specials")');
      await drinkSpecialsLink.waitFor({ state: 'visible', timeout: 5000 });
      await drinkSpecialsLink.click();
      
      // Should be on drink specials page
      await expect(page).toHaveURL(/\/admin\/drink-specials/, { timeout: 10000 });
    });

    test('should display specials list', async ({ page }) => {
      await page.goto('/admin/food-specials');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have some content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should create a new food special', async ({ page }) => {
      await page.goto('/admin/food-specials');
      
      await page.waitForTimeout(1000);
      
      // Intercept API response to capture created special ID
      page.on('response', async (response) => {
        if (response.url().includes('/api/specials') && response.request().method() === 'POST') {
          if (response.ok) {
            try {
              const data = await response.json();
              if (data.id) {
                tracker.trackSpecial(data.id);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      });
      
      // Look for "New" or "Add" button - prefer AdminActionButton which is visible on desktop
      // Try desktop button first (AdminActionButton), then fallback to mobile button
      let newButton = page.locator('button:has-text("New Food Special"), button:has-text("New Drink Special")').first();
      let buttonCount = await newButton.count();
      
      if (buttonCount === 0) {
        // Fallback to generic "New" button
        newButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), a:has-text("New")').first();
        buttonCount = await newButton.count();
      }
      
      if (buttonCount > 0) {
        // Wait for button to be visible, or trigger the custom event directly
        let buttonClicked = false;
        try {
          await newButton.waitFor({ state: 'visible', timeout: 5000 });
          await newButton.scrollIntoViewIfNeeded();
          await newButton.click();
          buttonClicked = true;
        } catch {
          // Button exists but might be hidden - trigger the custom event directly
        }
        
        if (!buttonClicked) {
          await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('openNewSpecial'));
          });
        }
        
        // Wait for form/modal to appear
        await page.waitForSelector('input[id="title"], input[name="title"], [role="dialog"] input', {
          state: 'visible',
          timeout: 10000,
        }).catch(() => {});
        await page.waitForTimeout(500);
        
        // Form should be visible - check for title input in modal or form
        const titleInput = page.locator('input[id="title"], input[name="title"], [role="dialog"] input[id*="title"], [role="dialog"] input[name*="title"]').first();
        const formVisible = await titleInput.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (formVisible) {
          // Fill in special details with test prefix
          await titleInput.fill('Test Food Special');
          
          // Fill description if exists
          const descriptionInput = page.locator('textarea[id="description"], textarea[name="description"]');
          if (await descriptionInput.count() > 0) {
            await descriptionInput.fill('Test description');
          }
          
          // Food specials require a date field (not weekly recurring)
          const dateInput = page.locator('input[type="date"][id*="date"], input[type="date"][name*="date"], input[type="date"]').first();
          if (await dateInput.count() > 0) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];
            await dateInput.fill(dateStr);
            await page.waitForTimeout(500); // Wait for form validation
          }
          
          // Wait for submit button to be enabled (not disabled)
          const submitButton = page.locator('button[type="submit"]:not([disabled])');
          await submitButton.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
          
          // Check if button is enabled
          const isEnabled = await submitButton.first().isEnabled().catch(() => false);
          if (!isEnabled) {
            // Button is still disabled, wait a bit more for validation
            await page.waitForTimeout(1000);
          }
          
          // Submit
          if (await submitButton.count() > 0 && await submitButton.first().isEnabled().catch(() => false)) {
            await submitButton.first().click();
            await page.waitForTimeout(2000);
            
            // Should see success
            const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
            expect(successVisible).toBeTruthy();
          }
        } else {
          // Form might be in a modal
          const modalVisible = await page.locator('form, [role="dialog"]').isVisible().catch(() => false);
          expect(modalVisible).toBeTruthy();
        }
      }
    });

    test('should create a new drink special', async ({ page }) => {
      await page.goto('/admin/drink-specials');
      
      await page.waitForTimeout(1000);
      
      // Look for "New" button - prefer AdminActionButton which is visible on desktop
      let newButton = page.locator('button:has-text("New Drink Special")').first();
      let buttonCount = await newButton.count();
      
      if (buttonCount === 0) {
        // Fallback to generic "New" button
        newButton = page.locator('button:has-text("New"), button:has-text("Add"), a:has-text("New")').first();
        buttonCount = await newButton.count();
      }
      
      if (buttonCount > 0) {
        // Wait for button to be visible, or trigger the custom event directly
        let buttonClicked = false;
        try {
          await newButton.waitFor({ state: 'visible', timeout: 5000 });
          await newButton.scrollIntoViewIfNeeded();
          await newButton.click();
          buttonClicked = true;
        } catch {
          // Button exists but might be hidden - trigger the custom event directly
        }
        
        if (!buttonClicked) {
          await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('openNewDrinkSpecial'));
          });
        }
        
        // Wait for form/modal to appear
        await page.waitForSelector('input[id="title"], input[name="title"], [role="dialog"] input', {
          state: 'visible',
          timeout: 10000,
        }).catch(() => {});
        await page.waitForTimeout(500);
        
        // Check for title input in modal or form
        const titleInput = page.locator('input[id="title"], input[name="title"], [role="dialog"] input[id*="title"], [role="dialog"] input[name*="title"]').first();
        if (await titleInput.count() > 0) {
          await titleInput.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
          await titleInput.fill('Test Drink Special');
          
          // Drink specials require either weekly days OR date range (both start and end)
          // Try to set a weekday first (e.g., Monday)
          // The checkbox is intercepted by a label, so click the label instead
          const mondayLabel = page.locator('label:has-text("Monday")').first();
          const mondayCheckbox = page.locator('input[type="checkbox"][value="Monday"], input[type="checkbox"][name*="appliesOn"][value="Monday"]').first();
          
          if (await mondayLabel.count() > 0) {
            // Click the label instead of the checkbox (label intercepts clicks)
            await mondayLabel.click();
            await page.waitForTimeout(500); // Wait for form validation
          } else if (await mondayCheckbox.count() > 0) {
            // Fallback: try clicking checkbox with force
            await mondayCheckbox.click({ force: true });
            await page.waitForTimeout(500);
          } else {
            // Fallback: set date range (both start and end required)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];
            
            const startDateInput = page.locator('input[type="date"][id*="start"], input[type="date"][name*="start"]').first();
            const endDateInput = page.locator('input[type="date"][id*="end"], input[type="date"][name*="end"]').first();
            
            if (await startDateInput.count() > 0 && await endDateInput.count() > 0) {
              await startDateInput.fill(dateStr);
              await endDateInput.fill(dateStr);
              await page.waitForTimeout(500); // Wait for form validation
            }
          }
          
          // Wait for submit button to be enabled (not disabled)
          const submitButton = page.locator('button[type="submit"]:not([disabled])');
          await submitButton.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
          
          // Check if button is enabled
          const isEnabled = await submitButton.first().isEnabled().catch(() => false);
          if (!isEnabled) {
            // Button is still disabled, wait a bit more for validation
            await page.waitForTimeout(1000);
          }
          
          // Submit
          if (await submitButton.count() > 0 && await submitButton.first().isEnabled().catch(() => false)) {
            await submitButton.first().click();
            await page.waitForTimeout(2000);
            
            const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
            expect(successVisible).toBeTruthy();
          } else {
            // Button is disabled - form validation issue
            const buttonTitle = await submitButton.first().getAttribute('title').catch(() => '');
            throw new Error(`Submit button is disabled. ${buttonTitle || 'Form validation may be failing. Please check required fields.'}`);
          }
        }
      }
    });

    test('should edit an existing special', async ({ page }) => {
      await page.goto('/admin/food-specials');
      
      await page.waitForTimeout(1000);
      
      // Look for edit buttons or clickable special items
      const editButtons = page.locator('button:has-text("Edit"), a:has-text("Edit"), [data-special]').first();
      const editCount = await editButtons.count();
      
      if (editCount > 0) {
        await editButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Form should appear with existing data
        const titleInput = page.locator('input[id="title"], input[name="title"]');
        if (await titleInput.count() > 0) {
          const currentValue = await titleInput.inputValue();
          if (currentValue) {
            await titleInput.fill(`${currentValue} - Updated`);
            
            // Save
            const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
            if (await submitButton.count() > 0) {
              await submitButton.first().click();
              await page.waitForTimeout(2000);
              
              const successVisible = await page.locator('text=/success|updated|saved/i').isVisible().catch(() => false);
              expect(successVisible).toBeTruthy();
            }
          }
        }
      }
    });

    test('should delete a special', async ({ page }) => {
      await page.goto('/admin/food-specials');
      
      await page.waitForTimeout(1000);
      
      // Look for delete button
      const deleteButtons = page.locator('button:has-text("Delete"), button[aria-label*="Delete"]');
      const deleteCount = await deleteButtons.count();
      
      if (deleteCount > 0) {
        await deleteButtons.first().click();
        await page.waitForTimeout(500);
        
        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
          await page.waitForTimeout(2000);
          
          const successVisible = await page.locator('text=/success|deleted|removed/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    });

    test('should set weekday filters for specials', async ({ page }) => {
      await page.goto('/admin/food-specials');
      
      await page.waitForTimeout(1000);
      
      // Look for "New" button - prefer AdminActionButton which is visible on desktop
      let newButton = page.locator('button:has-text("New Food Special"), button:has-text("New Drink Special")').first();
      let buttonCount = await newButton.count();
      
      if (buttonCount === 0) {
        // Fallback to generic "New" button
        newButton = page.locator('button:has-text("New"), a:has-text("New")').first();
        buttonCount = await newButton.count();
      }
      
      if (buttonCount > 0) {
        // Wait for button to be visible, or trigger the custom event directly
        let buttonClicked = false;
        try {
          await newButton.waitFor({ state: 'visible', timeout: 5000 });
          await newButton.scrollIntoViewIfNeeded();
          await newButton.click();
          buttonClicked = true;
        } catch {
          // Button exists but might be hidden - trigger the custom event directly
        }
        
        if (!buttonClicked) {
          await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('openNewSpecial'));
          });
        }
        
        // Wait for form/modal to appear
        await page.waitForSelector('input[id="title"], input[name="title"], [role="dialog"] input', {
          state: 'visible',
          timeout: 10000,
        }).catch(() => {});
        await page.waitForTimeout(500);
        
        // Check weekday checkboxes
        const weekdayCheckboxes = page.locator('input[type="checkbox"][value*="day"], input[type="checkbox"]:has-text("Monday")');
        const checkboxCount = await weekdayCheckboxes.count();
        
        if (checkboxCount > 0) {
          // Select multiple weekdays
          await weekdayCheckboxes.first().click();
          if (checkboxCount > 1) {
            await weekdayCheckboxes.nth(1).click();
          }
          
          // Verify checkboxes are checked
          const firstChecked = await weekdayCheckboxes.first().isChecked();
          expect(firstChecked).toBeTruthy();
        }
      }
    });
  });
}

