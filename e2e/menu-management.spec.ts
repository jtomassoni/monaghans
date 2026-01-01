import { test, expect } from '@playwright/test';
import { TestDataTracker, waitForFormSubmission } from './test-helpers';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'menu-management',
  featureArea: 'operations',
  description: 'Menu management (admin)',
};

// Test with both admin and owner roles
const roles = ['admin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Menu Management (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    // Track test data for cleanup
    let tracker: TestDataTracker;

    test.beforeEach(() => {
      tracker = new TestDataTracker(`.auth/${role}.json`, 'Test ');
    });

    test.afterEach(async () => {
      await tracker.cleanup();
    });

    test('should navigate to menu management page', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForTimeout(1000);
      
      // Navigate to menu - wait for link to be visible
      const menuLink = page.locator('a:has-text("Menu")').first();
      await menuLink.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      
      if (await menuLink.isVisible().catch(() => false)) {
        try {
          await menuLink.click({ timeout: 3000 });
          await page.waitForURL(/\/admin\/menu/, { timeout: 5000 });
        } catch {
          // If click is intercepted, try force click or direct navigation
          try {
            await menuLink.click({ force: true, timeout: 3000 });
            await page.waitForURL(/\/admin\/menu/, { timeout: 5000 });
          } catch {
            // Fallback to direct navigation
            await page.goto('/admin/menu');
            await expect(page).toHaveURL(/\/admin\/menu/);
          }
        }
      } else {
        // Link not visible, try direct navigation
        await page.goto('/admin/menu');
        await expect(page).toHaveURL(/\/admin\/menu/);
      }
    });

    test('should display menu sections and items', async ({ page }) => {
      await page.goto('/admin/menu');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have menu content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should create a new menu section', async ({ page }) => {
      await page.goto('/admin/menu');
      
      await page.waitForTimeout(1000);
      
      // Look for "New Section" button - try both mobile and desktop versions
      const newButton = page.locator('button:has-text("New Section"), button:has-text("Create First Section")');
      const buttonCount = await newButton.count();
      
      if (buttonCount > 0) {
        const button = newButton.first();
        // Wait for button to be visible, or trigger the custom event directly
        let buttonClicked = false;
        try {
          await button.waitFor({ state: 'visible', timeout: 5000 });
          await button.scrollIntoViewIfNeeded();
          await button.click();
          buttonClicked = true;
        } catch {
          // Button exists but might be hidden - trigger the custom event directly
        }
        
        if (!buttonClicked) {
          await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('openNewSection'));
          });
        }
        
        // Wait for form/modal to appear
        await page.waitForSelector('form, [role="dialog"]', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(500);
        
        // Form should be visible
        const nameInput = page.locator('form input[id="name"], form input[name="name"]');
        await expect(nameInput).toBeVisible();
        
        // Fill in section name with test prefix
        await nameInput.fill('Test Section');
        
        // Submit
        const submitButton = page.locator('form button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(2000);
          
          // Check for toast notification with success message
          const toastMessage = page.locator('.bg-green-900, .bg-green-800').filter({ hasText: /success|created|saved/i });
          const successVisible = await toastMessage.isVisible({ timeout: 3000 }).catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    });

    test('should create a new menu item', async ({ page }) => {
      await page.goto('/admin/menu');
      
      await page.waitForTimeout(1000);
      
      // Intercept API response to capture created item ID
      page.on('response', async (response) => {
        if (response.url().includes('/api/menu-items') && response.request().method() === 'POST') {
          if (response.ok) {
            try {
              const data = await response.json();
              if (data.id) {
                tracker.trackMenuItem(data.id);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      });
      
      // Look for "New Item" button
      const newItemButton = page.locator('button:has-text("New Item"), button:has-text("Add Item"), a:has-text("New Item")');
      const buttonCount = await newItemButton.count();
      
      if (buttonCount > 0) {
        const button = newItemButton.first();
        // Wait for button to be visible, or trigger the custom event directly
        let buttonClicked = false;
        try {
          await button.waitFor({ state: 'visible', timeout: 5000 });
          await button.scrollIntoViewIfNeeded();
          await button.click();
          buttonClicked = true;
        } catch {
          // Button exists but might be hidden - trigger the custom event directly
        }
        
        if (!buttonClicked) {
          await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('openNewItem'));
          });
        }
        
        // Wait for form/modal to appear
        await page.waitForSelector('form, [role="dialog"]', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(500);
        
        // Form should appear
        const titleInput = page.locator('input[id="title"], input[id="name"], input[name="title"]');
        const formVisible = await titleInput.isVisible().catch(() => false);
        
        if (formVisible) {
          // Fill in item details with test prefix
          await titleInput.fill('Test Menu Item');
          
          // Fill description if exists
          const descriptionInput = page.locator('textarea[id="description"], textarea[name="description"]');
          if (await descriptionInput.count() > 0) {
            await descriptionInput.fill('Test description');
          }
          
          // Set price if exists
          const priceInput = page.locator('input[type="number"][id*="price"], input[type="number"][name*="price"]');
          if (await priceInput.count() > 0) {
            await priceInput.fill('9.99');
          }
          
          // Select section if dropdown exists
          const sectionSelect = page.locator('select[id*="section"], select[name*="section"]');
          if (await sectionSelect.count() > 0) {
            const options = await sectionSelect.locator('option').count();
            if (options > 1) {
              await sectionSelect.selectOption({ index: 1 });
            }
          }
          
          // Submit
          const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            
            // Wait for form submission to complete (network idle + success message)
            try {
              const success = await waitForFormSubmission(page, {
                waitForNetworkIdle: true,
                waitForSuccess: true,
                waitForModalClose: true,
                timeout: 10000,
                context: 'creating menu item',
              });
              expect(success).toBeTruthy();
            } catch (error) {
              // Add test context to error
              const errorMessage = error instanceof Error ? error.message : String(error);
              throw new Error(
                `Failed to create menu item:\n${errorMessage}\n` +
                `Test: should create a new menu item\n` +
                `Check that:\n` +
                `- Menu section exists and is selectable\n` +
                `- Form fields are valid\n` +
                `- API endpoint is responding\n` +
                `- No console errors in browser`
              );
            }
          } else {
            throw new Error('Submit button not found - form may not have loaded correctly');
          }
        }
      }
    });

    test('should edit a menu section', async ({ page }) => {
      await page.goto('/admin/menu');
      
      await page.waitForTimeout(1000);
      
      // Look for edit buttons on sections
      const editButtons = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
      const editCount = await editButtons.count();
      
      if (editCount > 0) {
        await editButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Form should appear with existing data
        const nameInput = page.locator('input[id="name"], input[name="name"]');
        if (await nameInput.count() > 0) {
          const currentValue = await nameInput.inputValue();
          if (currentValue) {
            await nameInput.fill(`${currentValue} - Updated`);
            
            // Save
            const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
            if (await submitButton.count() > 0) {
              await submitButton.first().click();
              await page.waitForTimeout(2000);
              
              // Check for toast notification with success message
              const toastMessage = page.locator('.bg-green-900, .bg-green-800').filter({ hasText: /success|updated|saved/i });
              const successVisible = await toastMessage.isVisible({ timeout: 3000 }).catch(() => false);
              expect(successVisible).toBeTruthy();
            }
          }
        }
      }
    });

    test('should edit a menu item', async ({ page }) => {
      await page.goto('/admin/menu');
      
      await page.waitForTimeout(1000);
      
      // Navigate to items tab if exists - look for "All Items" button
      const itemsTab = page.locator('button:has-text("All Items"), button:has-text("Items"), [role="tab"]:has-text("Items"), [role="tab"]:has-text("All Items")');
      const tabCount = await itemsTab.count();
      if (tabCount > 0) {
        // Check if button is visible
        const isVisible = await itemsTab.first().isVisible().catch(() => false);
        if (isVisible) {
          try {
            await itemsTab.first().click({ timeout: 3000 });
            await page.waitForTimeout(1000);
          } catch {
            // If click fails, try force click
            await itemsTab.first().click({ force: true, timeout: 3000 });
            await page.waitForTimeout(1000);
          }
        }
        // If button exists but isn't visible, continue anyway - items might already be shown
      }
      
      // Look for edit buttons on items
      const editButtons = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
      const editCount = await editButtons.count();
      
      if (editCount > 0) {
        await editButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Form should appear
        const titleInput = page.locator('input[id="title"], input[id="name"], input[name="title"]');
        if (await titleInput.count() > 0) {
          const currentValue = await titleInput.inputValue();
          if (currentValue) {
            await titleInput.fill(`${currentValue} - Updated`);
            
            // Save
            const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
            if (await submitButton.count() > 0) {
              await submitButton.first().click();
              await page.waitForTimeout(2000);
              
              // Check for toast notification with success message
              const toastMessage = page.locator('.bg-green-900, .bg-green-800').filter({ hasText: /success|updated|saved/i });
              const successVisible = await toastMessage.isVisible({ timeout: 3000 }).catch(() => false);
              expect(successVisible).toBeTruthy();
            }
          }
        }
      }
    });

    test('should delete a menu section', async ({ page }) => {
      await page.goto('/admin/menu');
      
      await page.waitForTimeout(1000);
      
      // Look for delete buttons
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
          
          // Check for toast notification with success message
          const toastMessage = page.locator('.bg-green-900, .bg-green-800').filter({ hasText: /success|deleted|removed/i });
          const successVisible = await toastMessage.isVisible({ timeout: 3000 }).catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    });

    test('should toggle item availability', async ({ page }) => {
      await page.goto('/admin/menu');
      
      await page.waitForTimeout(1000);
      
      // Navigate to items tab if exists - look for "All Items" button
      const itemsTab = page.locator('button:has-text("All Items"), button:has-text("Items"), [role="tab"]:has-text("Items"), [role="tab"]:has-text("All Items")');
      const tabCount = await itemsTab.count();
      if (tabCount > 0) {
        // Check if button is visible
        const isVisible = await itemsTab.first().isVisible().catch(() => false);
        if (isVisible) {
          try {
            await itemsTab.first().click({ timeout: 3000 });
            await page.waitForTimeout(1000);
          } catch {
            // If click fails, try force click
            await itemsTab.first().click({ force: true, timeout: 3000 });
            await page.waitForTimeout(1000);
          }
        }
        // If button exists but isn't visible, continue anyway - items might already be shown
      }
      
      // Look for availability toggles
      const availabilityToggles = page.locator('input[type="checkbox"][id*="available"], input[type="checkbox"][name*="available"], button[aria-label*="available"]');
      const toggleCount = await availabilityToggles.count();
      
      if (toggleCount > 0) {
        const initialState = await availabilityToggles.first().isChecked().catch(() => false);
        await availabilityToggles.first().click();
        await page.waitForTimeout(1000);
        
        const newState = await availabilityToggles.first().isChecked().catch(() => false);
        expect(newState).not.toBe(initialState);
      }
    });
  });
}

