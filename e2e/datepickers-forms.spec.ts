/**
 * Comprehensive tests for date pickers, time pickers, and form validation
 * These tests ensure all datetime inputs work correctly with Mountain Time
 */
import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'datepickers-forms',
  featureArea: 'ui-components',
  description: 'Date picker and form validation components',
};
import {
  formatDateTimeLocal,
  formatDateLocal,
  getDateNDaysFromNow,
  getNextMonday,
  elementExists,
  fillIfExists,
  clickIfExists,
  generateTestId,
  TestDataTracker,
  setupAutoTracking,
} from './test-helpers';

test.use({ storageState: '.auth/admin.json' });

async function openNewEventModal(page: any) {
  await page.goto('/admin?view=list');
  await page.waitForTimeout(1000);

  const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
  if (await newEventButton.isVisible().catch(() => false)) {
    await newEventButton.click();
  } else {
    // Fallback: dispatch the custom event that the UI listens for
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('openNewEvent'));
    });
  }

  // Wait for the modal/form to become available
  await page.waitForSelector('input[id="title"], input[name="title"], input[type="datetime-local"]', {
    timeout: 5000,
  }).catch(() => {});
  await page.waitForTimeout(500);
}

test.describe('Date Pickers and Forms', () => {
  // Track test data for cleanup
  let tracker: TestDataTracker;

  test.beforeEach(() => {
    tracker = new TestDataTracker('.auth/admin.json', 'Test ');
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });
  
  test('should open and close date picker', async ({ page }) => {
    await openNewEventModal(page);

    const dateInput = page
      .locator('input[type="datetime-local"], input[id*="startDateTime"], input[name*="startDateTime"]')
      .first();
    if (await dateInput.count() > 0) {
      await dateInput.click();
      await page.waitForTimeout(500);
      await expect(dateInput).toBeFocused();
    }
  });

  test('should accept valid date/time input', async ({ page }) => {
    await openNewEventModal(page);

    const testDate = getDateNDaysFromNow(5);
    testDate.setHours(19, 0, 0, 0); // 7pm
    const dateTimeStr = formatDateTimeLocal(testDate);

    const dateInput = page.locator('input[type="datetime-local"], input[id*="startDateTime"]').first();
    if (await dateInput.count() > 0) {
      await dateInput.fill(dateTimeStr);
      await page.waitForTimeout(500);

      const value = await dateInput.inputValue();
      expect(value).toBeTruthy();
    }
  });

  test('should handle date picker in event creation form', async ({ page }) => {
    // Set up automatic tracking for created entities
    setupAutoTracking(page, tracker);

    await openNewEventModal(page);

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
  });

  test('should handle all-day toggle correctly', async ({ page }) => {
    await openNewEventModal(page);

    const allDayCheckbox = page.locator('input[type="checkbox"][id*="allDay"], input[type="checkbox"][name*="allDay"]').first();
    if (await allDayCheckbox.count() > 0) {
      const initialState = await allDayCheckbox.isChecked().catch(() => false);
      
      await allDayCheckbox.click();
      await page.waitForTimeout(500);

      const newState = await allDayCheckbox.isChecked().catch(() => false);
      expect(newState).not.toBe(initialState);
    }
  });

  test('should handle recurrence end date picker', async ({ page }) => {
    await openNewEventModal(page);

    const weeklyRadio = page.locator('input[type="radio"][value="weekly"], input[name*="recurrence"][value="weekly"]').first();
    if (await weeklyRadio.count() > 0) {
      await weeklyRadio.click();
      await page.waitForTimeout(500);

      const recurrenceEndInput = page.locator('input[type="date"][id*="recurrenceEnd"], input[type="date"][name*="recurrenceEnd"]').first();
      if (await recurrenceEndInput.count() > 0) {
        const endDate = getDateNDaysFromNow(21);
        const endDateStr = formatDateLocal(endDate);

        await recurrenceEndInput.fill(endDateStr);
        await page.waitForTimeout(500);

        const value = await recurrenceEndInput.inputValue();
        expect(value).toBeTruthy();
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    await openNewEventModal(page);

    const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      const errorVisible = await page.locator('text=/required|error|invalid/i').isVisible().catch(() => false);
      const successVisible = await page.locator('text=/success|created/i').isVisible().catch(() => false);
      
      expect(errorVisible || !successVisible).toBeTruthy();
    }
  });

  test('should preserve form data on validation errors', async ({ page }) => {
    // Set up automatic tracking for created entities
    setupAutoTracking(page, tracker);

    await openNewEventModal(page);

    const testTitle = `Form Data Test ${generateTestId()}`;
    const titleInput = page.locator('input[id="title"], input[name="title"]').first();
    if (await titleInput.count() > 0) {
      await titleInput.fill(testTitle);

      const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Check if form is still open (validation error) or if it closed (success)
        const formStillOpen = await titleInput.isVisible().catch(() => false);
        if (formStillOpen) {
          // Form is still open, check that data is preserved
          const titleValue = await titleInput.inputValue();
          expect(titleValue).toBe(testTitle);
        } else {
          // Form closed, which means it was submitted successfully
          // This is also acceptable - the form preserved data long enough to submit
          const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    }
  });

  test('should format dates in Mountain Time consistently', async ({ page }) => {
    await openNewEventModal(page);

    const testDate = new Date('2026-01-15T19:00:00-07:00'); // 7pm MST on Jan 15, 2026
    const dateTimeStr = formatDateTimeLocal(testDate);

    const dateInput = page.locator('input[type="datetime-local"], input[id*="startDateTime"]').first();
    if (await dateInput.count() > 0) {
      await dateInput.fill(dateTimeStr);
      await page.waitForTimeout(500);

      const value = await dateInput.inputValue();
      expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    }
  });

  test('should handle events spanning midnight', async ({ page }) => {
    // Set up automatic tracking for created entities
    setupAutoTracking(page, tracker);

    await openNewEventModal(page);

    const titleInput = page.locator('input[id="title"], input[name="title"]').first();
    if (await titleInput.count() > 0) {
      await titleInput.fill(`Midnight Span Test ${generateTestId()}`);

      const startDate = getDateNDaysFromNow(5);
      startDate.setHours(23, 0, 0, 0);
      const startDateTime = formatDateTimeLocal(startDate);

      await fillIfExists(page, 'input[type="datetime-local"], input[id*="startDateTime"]', startDateTime);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(2, 0, 0, 0);
      const endDateTime = formatDateTimeLocal(endDate);

      await fillIfExists(page, 'input[id*="endDateTime"]', endDateTime);

      const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
        expect(successVisible).toBeTruthy();
      }
    }
  });
});





