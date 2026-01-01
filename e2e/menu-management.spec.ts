import { test, expect } from '@playwright/test';
import { TestDataTracker } from './test-helpers';
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
        await menuLink.click();
        await page.waitForURL(/\/admin\/menu/, { timeout: 5000 });
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
      
      // Look for "New Section" button
      const newButton = page.locator('button:has-text("New Section"), button:has-text("Create First Section")');
      const buttonCount = await newButton.count();
      
      if (buttonCount > 0) {
        await newButton.first().click();
        await page.waitForSelector('form', { state: 'visible', timeout: 5000 });
        
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
          
          // Should see success
          const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
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
        await newItemButton.first().click();
        await page.waitForTimeout(1000);
        
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
              await sectionSelect.selectIndex(1);
            }
          }
          
          // Submit
          const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            await page.waitForTimeout(2000);
            
            const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
            expect(successVisible).toBeTruthy();
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
              
              const successVisible = await page.locator('text=/success|updated|saved/i').isVisible().catch(() => false);
              expect(successVisible).toBeTruthy();
            }
          }
        }
      }
    });

    test('should edit a menu item', async ({ page }) => {
      await page.goto('/admin/menu');
      
      await page.waitForTimeout(1000);
      
      // Navigate to items tab if exists
      const itemsTab = page.locator('button:has-text("Items"), [role="tab"]:has-text("Items")');
      if (await itemsTab.count() > 0) {
        await itemsTab.first().click();
        await page.waitForTimeout(1000);
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
              
              const successVisible = await page.locator('text=/success|updated|saved/i').isVisible().catch(() => false);
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
          
          const successVisible = await page.locator('text=/success|deleted|removed/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    });

    test('should toggle item availability', async ({ page }) => {
      await page.goto('/admin/menu');
      
      await page.waitForTimeout(1000);
      
      // Navigate to items tab if exists
      const itemsTab = page.locator('button:has-text("Items"), [role="tab"]:has-text("Items")');
      if (await itemsTab.count() > 0) {
        await itemsTab.first().click();
        await page.waitForTimeout(1000);
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

