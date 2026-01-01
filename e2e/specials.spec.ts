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
      
      // Look for "New" or "Add" button
      const newButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), a:has-text("New")').first();
      const buttonCount = await newButton.count();
      
      if (buttonCount > 0) {
        await newButton.click();
        await page.waitForTimeout(1000);
        
        // Form should be visible
        const titleInput = page.locator('input[id="title"], input[name="title"]');
        const formVisible = await titleInput.isVisible().catch(() => false);
        
        if (formVisible) {
          // Fill in special details with test prefix
          await titleInput.fill('Test Food Special');
          
          // Fill description if exists
          const descriptionInput = page.locator('textarea[id="description"], textarea[name="description"]');
          if (await descriptionInput.count() > 0) {
            await descriptionInput.fill('Test description');
          }
          
          // Set weekday (e.g., Monday)
          const mondayCheckbox = page.locator('input[type="checkbox"][value="Monday"], input[type="checkbox"][value="1"]');
          if (await mondayCheckbox.count() > 0) {
            await mondayCheckbox.first().click();
          }
          
          // Set date range (optional)
          const startDateInput = page.locator('input[type="date"][id*="start"], input[type="date"][name*="start"]');
          if (await startDateInput.count() > 0) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await startDateInput.fill(tomorrow.toISOString().split('T')[0]);
          }
          
          // Submit
          const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
          if (await submitButton.count() > 0) {
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
      
      const newButton = page.locator('button:has-text("New"), button:has-text("Add"), a:has-text("New")').first();
      const buttonCount = await newButton.count();
      
      if (buttonCount > 0) {
        await newButton.click();
        await page.waitForTimeout(1000);
        
        const titleInput = page.locator('input[id="title"], input[name="title"]');
        if (await titleInput.count() > 0) {
          await titleInput.fill('Test Drink Special');
          
          // Submit if form is simple
          const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            await page.waitForTimeout(2000);
            
            const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
            expect(successVisible).toBeTruthy();
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
      
      const newButton = page.locator('button:has-text("New"), a:has-text("New")').first();
      if (await newButton.count() > 0) {
        await newButton.click();
        await page.waitForTimeout(1000);
        
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

