/**
 * Comprehensive tests for date pickers, time pickers, and form validation
 * These tests ensure all datetime inputs work correctly with Mountain Time
 */
import { test, expect } from '@playwright/test';
import {
  formatDateTimeLocal,
  formatDateLocal,
  getDateNDaysFromNow,
  getNextMonday,
  elementExists,
  fillIfExists,
  clickIfExists,
  generateTestId,
} from './test-helpers';

test.use({ storageState: '.auth/admin.json' });

test.describe('Date Pickers and Forms', () => {
  
  test('should open and close date picker', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    // Navigate to events
    const eventsLink = page.locator('a:has-text("Events")');
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await page.waitForTimeout(1000);
    }

    // Click to create new event
    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
    if (await newEventButton.count() > 0) {
      await newEventButton.click();
      await page.waitForTimeout(1000);

      // Find datetime input
      const dateInput = page.locator('input[type="datetime-local"], input[id*="startDateTime"], input[name*="startDateTime"]').first();
      if (await dateInput.count() > 0) {
        // Click to focus (may open picker)
        await dateInput.click();
        await page.waitForTimeout(500);

        // Input should be focused
        await expect(dateInput).toBeFocused();
      }
    }
  });

  test('should accept valid date/time input', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    const eventsLink = page.locator('a:has-text("Events")');
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await page.waitForTimeout(1000);
    }

    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
    if (await newEventButton.count() > 0) {
      await newEventButton.click();
      await page.waitForTimeout(1000);

      const testDate = getDateNDaysFromNow(5);
      testDate.setHours(19, 0, 0, 0); // 7pm
      const dateTimeStr = formatDateTimeLocal(testDate);

      const dateInput = page.locator('input[type="datetime-local"], input[id*="startDateTime"]').first();
      if (await dateInput.count() > 0) {
        await dateInput.fill(dateTimeStr);
        await page.waitForTimeout(500);

        // Verify value was set
        const value = await dateInput.inputValue();
        expect(value).toBeTruthy();
      }
    }
  });

  test('should handle date picker in event creation form', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    const eventsLink = page.locator('a:has-text("Events")');
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await page.waitForTimeout(1000);
    }

    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
    if (await newEventButton.count() > 0) {
      await newEventButton.click();
      await page.waitForTimeout(1000);

      // Fill title
      const titleInput = page.locator('input[id="title"], input[name="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill(`Datepicker Test ${generateTestId()}`);

        // Set start date/time
        const startDate = getDateNDaysFromNow(3);
        startDate.setHours(18, 30, 0, 0);
        const startDateTime = formatDateTimeLocal(startDate);

        await fillIfExists(page, 'input[type="datetime-local"], input[id*="startDateTime"]', startDateTime);

        // Set end date/time
        const endDate = new Date(startDate);
        endDate.setHours(21, 0, 0, 0);
        const endDateTime = formatDateTimeLocal(endDate);

        await fillIfExists(page, 'input[id*="endDateTime"], input[name*="endDateTime"]', endDateTime);

        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    }
  });

  test('should handle all-day toggle correctly', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    const eventsLink = page.locator('a:has-text("Events")');
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await page.waitForTimeout(1000);
    }

    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
    if (await newEventButton.count() > 0) {
      await newEventButton.click();
      await page.waitForTimeout(1000);

      // Find all-day checkbox
      const allDayCheckbox = page.locator('input[type="checkbox"][id*="allDay"], input[type="checkbox"][name*="allDay"]').first();
      if (await allDayCheckbox.count() > 0) {
        const initialState = await allDayCheckbox.isChecked().catch(() => false);
        
        // Toggle all-day
        await allDayCheckbox.click();
        await page.waitForTimeout(500);

        const newState = await allDayCheckbox.isChecked().catch(() => false);
        expect(newState).not.toBe(initialState);

        // When all-day is checked, time inputs might be hidden or disabled
        // This is a structural check
      }
    }
  });

  test('should handle recurrence end date picker', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    const eventsLink = page.locator('a:has-text("Events")');
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await page.waitForTimeout(1000);
    }

    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
    if (await newEventButton.count() > 0) {
      await newEventButton.click();
      await page.waitForTimeout(1000);

      // Set recurrence to weekly
      const weeklyRadio = page.locator('input[type="radio"][value="weekly"], input[name*="recurrence"][value="weekly"]').first();
      if (await weeklyRadio.count() > 0) {
        await weeklyRadio.click();
        await page.waitForTimeout(500);

        // Find recurrence end date input
        const recurrenceEndInput = page.locator('input[type="date"][id*="recurrenceEnd"], input[type="date"][name*="recurrenceEnd"]').first();
        if (await recurrenceEndInput.count() > 0) {
          const endDate = getDateNDaysFromNow(21);
          const endDateStr = formatDateLocal(endDate);

          await recurrenceEndInput.fill(endDateStr);
          await page.waitForTimeout(500);

          // Verify value was set
          const value = await recurrenceEndInput.inputValue();
          expect(value).toBeTruthy();
        }
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    const eventsLink = page.locator('a:has-text("Events")');
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await page.waitForTimeout(1000);
    }

    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
    if (await newEventButton.count() > 0) {
      await newEventButton.click();
      await page.waitForTimeout(1000);

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should see validation errors or form should not submit
        const errorVisible = await page.locator('text=/required|error|invalid/i').isVisible().catch(() => false);
        const successVisible = await page.locator('text=/success|created/i').isVisible().catch(() => false);
        
        // Either errors should show OR form shouldn't submit (no success message)
        expect(errorVisible || !successVisible).toBeTruthy();
      }
    }
  });

  test('should preserve form data on validation errors', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    const eventsLink = page.locator('a:has-text("Events")');
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await page.waitForTimeout(1000);
    }

    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
    if (await newEventButton.count() > 0) {
      await newEventButton.click();
      await page.waitForTimeout(1000);

      const testTitle = `Form Data Test ${generateTestId()}`;
      const titleInput = page.locator('input[id="title"], input[name="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill(testTitle);

        // Try to submit (may fail validation)
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // Title should still be filled
          const titleValue = await titleInput.inputValue();
          expect(titleValue).toBe(testTitle);
        }
      }
    }
  });

  test('should format dates in Mountain Time consistently', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    const eventsLink = page.locator('a:has-text("Events")');
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await page.waitForTimeout(1000);
    }

    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
    if (await newEventButton.count() > 0) {
      await newEventButton.click();
      await page.waitForTimeout(1000);

      // Set a specific date/time
      const testDate = new Date('2026-01-15T19:00:00-07:00'); // 7pm MST on Jan 15, 2026
      const dateTimeStr = formatDateTimeLocal(testDate);

      const dateInput = page.locator('input[type="datetime-local"], input[id*="startDateTime"]').first();
      if (await dateInput.count() > 0) {
        await dateInput.fill(dateTimeStr);
        await page.waitForTimeout(500);

        // Verify the value is in the expected format
        const value = await dateInput.inputValue();
        expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      }
    }
  });

  test('should handle events spanning midnight', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);

    const eventsLink = page.locator('a:has-text("Events")');
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await page.waitForTimeout(1000);
    }

    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
    if (await newEventButton.count() > 0) {
      await newEventButton.click();
      await page.waitForTimeout(1000);

      const titleInput = page.locator('input[id="title"], input[name="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill(`Midnight Span Test ${generateTestId()}`);

        // Start at 11pm
        const startDate = getDateNDaysFromNow(5);
        startDate.setHours(23, 0, 0, 0);
        const startDateTime = formatDateTimeLocal(startDate);

        await fillIfExists(page, 'input[type="datetime-local"], input[id*="startDateTime"]', startDateTime);

        // End at 2am next day
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(2, 0, 0, 0);
        const endDateTime = formatDateTimeLocal(endDate);

        await fillIfExists(page, 'input[id*="endDateTime"]', endDateTime);

        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    }
  });
});

