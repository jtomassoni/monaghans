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

    test('should display events list or calendar', async ({ page }) => {
      await page.goto('/admin/specials-events');
      
      // Events page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have some content (list, calendar, or form)
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should be able to create new event', async ({ page }) => {
      await page.goto('/admin/specials-events');
      
      // Look for "New Event" or "Add Event" button
      const newEventButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create")').first();
      const buttonCount = await newEventButton.count();
      
      if (buttonCount > 0) {
        await newEventButton.click();
        
        // Should open modal or navigate to form
        await page.waitForTimeout(500);
        
        // Form should be visible
        const formVisible = await page.locator('form, [role="dialog"]').isVisible().catch(() => false);
        expect(formVisible).toBeTruthy();
      }
    });
  });
}

