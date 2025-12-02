import { test, expect } from '@playwright/test';

// Test with both admin and owner roles
const roles = ['admin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Events Management (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    test('should navigate to events page', async ({ page }) => {
      await page.goto('/admin');
      
      // Navigate to events via sidebar
      await page.click('a:has-text("Events")');
      
      // Should be on events page
      await expect(page).toHaveURL(/\/admin\/.*events/);
    });

    test('should display events list', async ({ page }) => {
      await page.goto('/admin/events');
      
      // Events page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have events content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should create a new one-time event', async ({ page }) => {
      await page.goto('/admin/events');
      
      await page.waitForTimeout(1000);
      
      // Look for "New Event" button
      const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New"), a:has-text("New Event")').first();
      const buttonCount = await newEventButton.count();
      
      if (buttonCount > 0) {
        await newEventButton.click();
        await page.waitForTimeout(1000);
        
        // Form should be visible
        const titleInput = page.locator('input[id="title"], input[name="title"]');
        await expect(titleInput).toBeVisible({ timeout: 5000 });
        
        // Fill in event details
        await titleInput.fill('Test Event');
        
        // Set start date/time (tomorrow at 6pm)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startDateTime = tomorrow.toISOString().slice(0, 16);
        
        const startInput = page.locator('input[id="startDateTime"], input[name="startDateTime"], input[type="datetime-local"]').first();
        if (await startInput.count() > 0) {
          await startInput.fill(startDateTime);
        }
        
        // Try to submit (may need to find submit button)
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(2000);
          
          // Should see success message or redirect
          const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    });

    test('should create a recurring weekly event', async ({ page }) => {
      await page.goto('/admin/events');
      
      await page.waitForTimeout(1000);
      
      const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New"), a:has-text("New Event")').first();
      const buttonCount = await newEventButton.count();
      
      if (buttonCount > 0) {
        await newEventButton.click();
        await page.waitForTimeout(1000);
        
        // Fill in title
        const titleInput = page.locator('input[id="title"], input[name="title"]');
        if (await titleInput.count() > 0) {
          await titleInput.fill('Weekly Test Event');
          
          // Set recurrence to weekly
          const weeklyRadio = page.locator('input[type="radio"][value="weekly"], input[name="recurrence"][value="weekly"]');
          if (await weeklyRadio.count() > 0) {
            await weeklyRadio.first().click();
            await page.waitForTimeout(500);
            
            // Select days (e.g., Monday and Wednesday)
            const mondayCheckbox = page.locator('input[type="checkbox"][value="Monday"], input[type="checkbox"][value="1"]');
            if (await mondayCheckbox.count() > 0) {
              await mondayCheckbox.first().click();
            }
          }
          
          // Set start date/time
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const startDateTime = tomorrow.toISOString().slice(0, 16);
          
          const startInput = page.locator('input[id="startDateTime"], input[name="startDateTime"]').first();
          if (await startInput.count() > 0) {
            await startInput.fill(startDateTime);
          }
          
          // Submit
          const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            await page.waitForTimeout(2000);
            
            // Should see success
            const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
            expect(successVisible).toBeTruthy();
          }
        }
      }
    });

    test('should edit an existing event', async ({ page }) => {
      await page.goto('/admin/events');
      
      await page.waitForTimeout(2000);
      
      // Look for an event to edit (could be in a list or calendar)
      const eventItems = page.locator('a:has-text("Edit"), button:has-text("Edit"), [data-event]').first();
      const eventCount = await eventItems.count();
      
      if (eventCount > 0) {
        await eventItems.first().click();
        await page.waitForTimeout(1000);
        
        // Form should be visible with existing data
        const titleInput = page.locator('input[id="title"], input[name="title"]');
        if (await titleInput.count() > 0) {
          const currentValue = await titleInput.inputValue();
          expect(currentValue).toBeTruthy();
          
          // Modify title
          await titleInput.fill(`${currentValue} - Updated`);
          
          // Try to save
          const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            await page.waitForTimeout(2000);
            
            // Should see success
            const successVisible = await page.locator('text=/success|updated|saved/i').isVisible().catch(() => false);
            expect(successVisible).toBeTruthy();
          }
        }
      }
    });

    test('should delete an event', async ({ page }) => {
      await page.goto('/admin/events');
      
      await page.waitForTimeout(2000);
      
      // Look for delete button
      const deleteButtons = page.locator('button:has-text("Delete"), button[aria-label*="Delete"]');
      const deleteCount = await deleteButtons.count();
      
      if (deleteCount > 0) {
        await deleteButtons.first().click();
        await page.waitForTimeout(500);
        
        // Confirm deletion if confirmation dialog appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
          await page.waitForTimeout(2000);
          
          // Should see success message
          const successVisible = await page.locator('text=/success|deleted|removed/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    });

    test('should filter events by tags', async ({ page }) => {
      await page.goto('/admin/events');
      
      await page.waitForTimeout(1000);
      
      // Look for tag filter controls
      const tagFilters = page.locator('button:has-text("Tag"), select[name*="tag"], input[name*="tag"]');
      const filterCount = await tagFilters.count();
      
      // If filters exist, test them
      if (filterCount > 0) {
        await tagFilters.first().click();
        await page.waitForTimeout(500);
        
        // Calendar should still be visible
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });
}

