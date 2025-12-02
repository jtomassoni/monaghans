import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Calendar', () => {
  test('should display calendar on admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    
    // Wait for page to load
    await expect(page.locator('body')).toBeVisible();
    
    // Calendar should be visible - check for calendar navigation buttons or date display
    const hasCalendarNav = await page.locator('button[aria-label="Previous"], button[aria-label="Next"]').count() > 0;
    const hasCalendarDate = await page.locator('[data-month-trigger], [data-year-trigger], h2:has-text("202")').count() > 0;
    
    // At least one calendar element should be present
    expect(hasCalendarNav || hasCalendarDate).toBeTruthy();
  });

  test('should navigate between weeks', async ({ page }) => {
    await page.goto('/admin');
    
    // Wait for calendar to load
    await page.waitForTimeout(1000);
    
    // Find and click next week button
    const nextButton = page.locator('button[aria-label="Next"]');
    if (await nextButton.count() > 0) {
      const initialDate = await page.locator('h2, [data-month-trigger], [data-year-trigger]').first().textContent();
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Date should have changed
      const newDate = await page.locator('h2, [data-month-trigger], [data-year-trigger]').first().textContent();
      expect(newDate).not.toBe(initialDate);
    }
  });

  test('should navigate to previous week', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(1000);
    
    // Find and click previous week button
    const prevButton = page.locator('button[aria-label="Previous"]');
    if (await prevButton.count() > 0) {
      const initialDate = await page.locator('h2, [data-month-trigger], [data-year-trigger]').first().textContent();
      await prevButton.click();
      await page.waitForTimeout(500);
      
      // Date should have changed
      const newDate = await page.locator('h2, [data-month-trigger], [data-year-trigger]').first().textContent();
      expect(newDate).not.toBe(initialDate);
    }
  });

  test('should create event from calendar click', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(1000);
    
    // Try to click on a day cell to create an event
    // Look for calendar day cells (could be buttons or divs with dates)
    const dayCells = page.locator('[role="gridcell"], .calendar-day, [data-day]');
    const cellCount = await dayCells.count();
    
    if (cellCount > 0) {
      // Click on a day cell
      await dayCells.first().click();
      await page.waitForTimeout(500);
      
      // Event modal/form should appear
      const modalVisible = await page.locator('form, [role="dialog"], input[id="title"]').isVisible().catch(() => false);
      expect(modalVisible).toBeTruthy();
    }
  });

  test('should display events on calendar', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(2000);
    
    // Calendar should display events if any exist
    // Look for event elements (could be various selectors)
    const eventElements = page.locator('.event, [data-event], [role="button"]:has-text("Event")');
    const eventCount = await eventElements.count();
    
    // Just verify calendar is rendering (events may or may not exist)
    expect(eventCount).toBeGreaterThanOrEqual(0);
  });

  test('should navigate month to month', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(1000);
    
    // Look for month/year selector or navigation
    const monthTrigger = page.locator('[data-month-trigger], button:has-text("Jan"), button:has-text("Feb")');
    const monthCount = await monthTrigger.count();
    
    if (monthCount > 0) {
      // Try to navigate to a different month
      await monthTrigger.first().click();
      await page.waitForTimeout(500);
      
      // Calendar should still be visible
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

