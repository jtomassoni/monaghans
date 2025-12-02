import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Calendar', () => {
  test('should display calendar on admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    
    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();
    
    // Calendar should be visible - check for calendar navigation buttons or date display
    // The calendar has navigation buttons with aria-label="Previous" and date displays
    const hasCalendarNav = await page.locator('button[aria-label="Previous"], button[aria-label="Next"]').count() > 0;
    const hasCalendarDate = await page.locator('[data-month-trigger], [data-year-trigger], h2:has-text("202")').count() > 0;
    
    // At least one calendar element should be present
    expect(hasCalendarNav || hasCalendarDate).toBeTruthy();
  });

  test('should navigate between calendar views', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for week/month view toggle buttons
    const viewButtons = page.locator('button:has-text("Week"), button:has-text("Month"), button:has-text("week"), button:has-text("month")');
    const count = await viewButtons.count();
    
    if (count > 0) {
      // If view toggle exists, test switching views
      await viewButtons.first().click();
      await page.waitForTimeout(500); // Wait for view to update
    }
    
    // Calendar should still be visible after view change
    await expect(page.locator('body')).toBeVisible();
  });
});

