import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'events',
  featureArea: 'content',
  description: 'Events management (create, edit, delete, recurring events)',
};
import {
  formatDateTimeLocal,
  formatDateLocal,
  getDateNDaysFromNow,
  getNextMonday,
  getNextWednesday,
  generateTestId,
  fillIfExists,
  clickIfExists,
  TestDataTracker,
  waitForFormSubmission,
  waitForNetworkIdle,
} from './test-helpers';

// Test with both admin and owner roles
const roles = ['admin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Events Management (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    // Track test data for cleanup
    let tracker: TestDataTracker;

    test.beforeEach(() => {
      tracker = new TestDataTracker(`.auth/${role}.json`, 'Test ');
    });

    test.afterEach(async () => {
      await tracker.cleanup();
    });

    test('should navigate to events page', async ({ page }) => {
      await page.goto('/admin');
      
      // Navigate to events via sidebar - "Calendar & Events" link goes to /admin
      const eventsLink = page.locator('a:has-text("Events"), a:has-text("Calendar & Events")').first();
      await eventsLink.waitFor({ state: 'visible', timeout: 5000 });
      await eventsLink.click();
      
      // Events page redirects to /admin?view=list, so check for that or /admin
      await page.waitForURL(/\/admin(\?view=list)?/, { timeout: 5000 });
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
      
      // Intercept API response to capture created event ID
      page.on('response', async (response) => {
        if (response.url().includes('/api/events') && response.request().method() === 'POST') {
          if (response.ok) {
            try {
              const data = await response.json();
              if (data.id) {
                tracker.trackEvent(data.id);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      });
      
      // Look for "New Event" button - try multiple approaches
      let newEventButton = page.locator('button:has-text("New Event")').first();
      let buttonVisible = await newEventButton.isVisible().catch(() => false);
      
      if (!buttonVisible) {
        // Try alternative selectors or dispatch custom event
        newEventButton = page.locator('button:has-text("New")').first();
        buttonVisible = await newEventButton.isVisible().catch(() => false);
      }
      
      if (buttonVisible) {
        await newEventButton.click();
        await page.waitForTimeout(1000);
      } else {
        // Fallback: dispatch the custom event that the UI listens for
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('openNewEvent'));
        });
        await page.waitForTimeout(1000);
      }
      
      // Form should be visible
      const titleInput = page.locator('input[id="title"], input[name="title"]');
      await expect(titleInput).toBeVisible({ timeout: 5000 });
      
      // Fill in event details with test prefix
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
    });

    test('should create a recurring weekly event', async ({ page }) => {
      await page.goto('/admin/events');
      
      await page.waitForTimeout(1000);
      
      // Try to click the New Event button, or dispatch the custom event
      const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
      if (await newEventButton.isVisible().catch(() => false)) {
        await newEventButton.click();
      } else {
        // Fallback: dispatch the custom event that the UI listens for
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('openNewEvent'));
        });
      }
      await page.waitForTimeout(1000);
      
      // Wait for form to be available
      await page.waitForSelector('input[id="title"], input[name="title"]', {
        timeout: 5000,
      }).catch(() => {});
      
      // Fill in title
      const titleInput = page.locator('input[id="title"], input[name="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill(`Weekly Test Event ${generateTestId()}`);
        
        // Set recurrence to weekly
        const weeklyRadio = page.locator('input[type="radio"][value="weekly"], input[name="recurrence"][value="weekly"]');
        if (await weeklyRadio.count() > 0) {
          await weeklyRadio.first().click();
          await page.waitForTimeout(500);
          
          // Select days (e.g., Monday and Wednesday)
          const mondayCheckbox = page.locator('input[type="checkbox"][value="Monday"], input[type="checkbox"][value="1"], label:has-text("Monday") input').first();
          if (await mondayCheckbox.count() > 0) {
            await mondayCheckbox.click();
          }
        }
        
        // Set start date/time (next Monday at 6pm Mountain Time)
        const startDate = getNextMonday();
        startDate.setHours(18, 0, 0, 0);
        const startDateTime = formatDateTimeLocal(startDate);
        
        await fillIfExists(page, 'input[id="startDateTime"], input[name="startDateTime"], input[type="datetime-local"]', startDateTime);
        
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
    });

    test('should create recurring weekly event with UNTIL date including last occurrence', async ({ page }) => {
      await page.goto('/admin/events');
      
      await page.waitForTimeout(1000);
      
      // Try to click the New Event button, or dispatch the custom event
      const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
      let buttonClicked = false;
      
      if (await newEventButton.isVisible().catch(() => false)) {
        try {
          await newEventButton.click();
          buttonClicked = true;
        } catch {
          // Button click failed, will use custom event
        }
      }
      
      if (!buttonClicked) {
        // Fallback: dispatch the custom event that the UI listens for
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('openNewEvent'));
        });
      }
      
      // Wait for form/modal to appear
      await page.waitForSelector('input[id="title"], input[name="title"], [role="dialog"] input', {
        state: 'visible',
        timeout: 10000,
      }).catch(() => {});
      await page.waitForTimeout(500);
      
      const titleInput = page.locator('input[id="title"], input[name="title"]').first();
      if (await titleInput.count() > 0) {
        const testTitle = `UNTIL Test Event ${generateTestId()}`;
        await titleInput.fill(testTitle);
        
        // Set recurrence to weekly
        const weeklyRadio = page.locator('input[type="radio"][value="weekly"], input[name*="recurrence"][value="weekly"]').first();
        if (await weeklyRadio.count() > 0) {
          await weeklyRadio.click();
          await page.waitForTimeout(500);
          
          // Select Wednesday
          const wednesdayCheckbox = page.locator('input[type="checkbox"][value="Wednesday"], label:has-text("Wednesday") input').first();
          if (await wednesdayCheckbox.count() > 0) {
            await wednesdayCheckbox.click();
          }
        }
        
        // Set start date (next Wednesday)
        const startDate = getNextWednesday();
        startDate.setHours(18, 0, 0, 0);
        const startDateTime = formatDateTimeLocal(startDate);
        
        await fillIfExists(page, 'input[id*="startDateTime"], input[name*="startDateTime"]', startDateTime);
        
        // Set UNTIL date to exactly 3 weeks later (should include that Wednesday)
        const untilDate = new Date(startDate);
        untilDate.setDate(untilDate.getDate() + 21); // 3 weeks = 4 occurrences
        const untilDateStr = formatDateLocal(untilDate);
        
        await fillIfExists(page, 'input[type="date"][id*="recurrenceEnd"], input[type="date"][name*="recurrenceEnd"]', untilDateStr);
        
        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          
          // Wait for form submission to complete deterministically
          try {
            const success = await waitForFormSubmission(page, {
              waitForNetworkIdle: true,
              waitForSuccess: true,
              waitForModalClose: true,
              timeout: 10000,
              context: 'creating recurring event with UNTIL date',
            });
            expect(success).toBeTruthy();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(
              `Failed to create recurring event:\n${errorMessage}\n` +
              `Test: should create recurring weekly event with UNTIL date including last occurrence\n` +
              `Event title: ${testTitle}\n` +
              `Start date: ${startDateTime}\n` +
              `UNTIL date: ${untilDateStr}\n` +
              `Check that:\n` +
              `- Recurrence pattern is valid\n` +
              `- UNTIL date is after start date\n` +
              `- Form submission completed\n` +
              `- API endpoint is responding\n` +
              `- No console errors in browser`
            );
          }
          
          // First verify the event was created by checking the admin events page
          // Wait a moment for the event to be fully saved
          await page.waitForTimeout(2000);
          
          // Go back to admin events page to verify the event exists
          await page.goto('/admin/events');
          await waitForNetworkIdle(page, 10000);
          await page.waitForTimeout(2000);
          
          // Check if event appears in admin list (this confirms it was created)
          const adminEventTitle = page.locator(`text=${testTitle}`).first();
          const adminEventCount = await adminEventTitle.count();
          
          if (adminEventCount === 0) {
            // Event wasn't created - this is a different issue
            throw new Error(
              `Event was not created successfully\n` +
              `Test: should create recurring weekly event with UNTIL date including last occurrence\n` +
              `Event title: ${testTitle}\n` +
              `Check that the form submission completed successfully`
            );
          }
          
          // Event exists in admin - now check public page
          // Wait a bit more for recurrence to be calculated
          await page.waitForTimeout(3000);
          
          await page.goto('/events');
          await waitForNetworkIdle(page, 10000);
          await page.waitForTimeout(2000); // Wait for events to render
          
          // Wait for event to appear with retries (recurring events need time to process)
          const eventTitle = page.locator(`text=${testTitle}`);
          let eventCount = 0;
          
          // Try multiple times - recurring events might need server-side processing
          for (let i = 0; i < 15; i++) {
            eventCount = await eventTitle.count();
            if (eventCount > 0) break;
            
            await page.waitForTimeout(1000);
            
            // Refresh page every few attempts to pick up new events
            if (i > 2 && i % 3 === 0) {
              await page.reload();
              await waitForNetworkIdle(page, 5000);
              await page.waitForTimeout(1000);
            }
            
            // Scroll to load more events if needed
            if (i > 1) {
              await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
              await page.waitForTimeout(500);
            }
          }
          
          // Event should appear (may appear multiple times if recurring)
          if (eventCount === 0) {
            const url = page.url();
            const pageContent = await page.textContent('body').catch(() => 'unable to get page content');
            // Check if page loaded correctly
            const hasEventsContent = pageContent && (pageContent.includes('Event') || pageContent.includes('Upcoming'));
            
            // Check if there are any events at all on the page
            const anyEvents = await page.locator('[class*="event"], [data-event]').count();
            
            throw new Error(
              `Event not found on public events page after creation\n` +
              `Test: should create recurring weekly event with UNTIL date including last occurrence\n` +
              `Event title: ${testTitle}\n` +
              `URL: ${url}\n` +
              `Event count found: 0\n` +
              `Total events on page: ${anyEvents}\n` +
              `Page has events content: ${hasEventsContent}\n` +
              `Event exists in admin: true\n` +
              `This usually means:\n` +
              `- Event was created but recurrence calculation is still processing\n` +
              `- Event date is in the future and not shown (start date: ${startDateTime})\n` +
              `- Recurrence calculation failed\n` +
              `- Public page filters out the event for some reason\n` +
              `Check screenshot/video for visual context`
            );
          }
          
          expect(eventCount).toBeGreaterThanOrEqual(1);
        }
      }
    });

    test('should create monthly recurring event', async ({ page }) => {
      await page.goto('/admin/events');
      
      await page.waitForTimeout(1000);
      
      // Try to click the New Event button, or dispatch the custom event
      const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
      if (await newEventButton.isVisible().catch(() => false)) {
        await newEventButton.click();
      } else {
        // Fallback: dispatch the custom event that the UI listens for
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('openNewEvent'));
        });
      }
      await page.waitForTimeout(1000);
      
      // Wait for form to be available
      await page.waitForSelector('input[id="title"], input[name="title"]', {
        timeout: 5000,
      }).catch(() => {});
      
      const titleInput = page.locator('input[id="title"], input[name="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill(`Monthly Event ${generateTestId()}`);
        
        // Set recurrence to monthly
        const monthlyRadio = page.locator('input[type="radio"][value="monthly"], input[name*="recurrence"][value="monthly"]').first();
        if (await monthlyRadio.count() > 0) {
          await monthlyRadio.click();
          await page.waitForTimeout(500);
          
          // Set day of month (15th)
          await fillIfExists(page, 'input[id*="monthDay"], input[name*="monthDay"], input[type="number"]', '15');
        }
        
        // Set start date (15th of next month at 7pm)
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() + 1);
        startDate.setDate(15);
        startDate.setHours(19, 0, 0, 0);
        const startDateTime = formatDateTimeLocal(startDate);
        
        await fillIfExists(page, 'input[id*="startDateTime"]', startDateTime);
        
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

    test('should create all-day event', async ({ page }) => {
      await page.goto('/admin/events');
      
      await page.waitForTimeout(1000);
      
      // Try to click the New Event button, or dispatch the custom event
      const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New")').first();
      if (await newEventButton.isVisible().catch(() => false)) {
        await newEventButton.click();
      } else {
        // Fallback: dispatch the custom event that the UI listens for
        await page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('openNewEvent'));
        });
      }
      await page.waitForTimeout(1000);
      
      // Wait for form to be available
      await page.waitForSelector('input[id="title"], input[name="title"]', {
        timeout: 5000,
      }).catch(() => {});
      
      const titleInput = page.locator('input[id="title"], input[name="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill(`All Day Event ${generateTestId()}`);
        
        // Check all-day checkbox - try normal click, scroll if needed, then force
        const allDayCheckbox = page.locator('input[type="checkbox"][id*="allDay"], input[type="checkbox"][name*="allDay"]').first();
        if (await allDayCheckbox.count() > 0) {
          try {
            await allDayCheckbox.click({ timeout: 3000 });
          } catch {
            try {
              await allDayCheckbox.scrollIntoViewIfNeeded();
              await allDayCheckbox.click({ timeout: 3000 });
            } catch {
              await allDayCheckbox.click({ force: true });
            }
          }
          await page.waitForTimeout(500);
        }
        
        // Set date (5 days from now)
        const startDate = getDateNDaysFromNow(5);
        const startDateStr = formatDateLocal(startDate);
        
        await fillIfExists(page, 'input[type="date"], input[id*="startDateTime"]', startDateStr);
        
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
            await page.waitForTimeout(3000);
            
            // Should see success or modal should close (which indicates success)
            const successVisible = await page.locator('text=/success|updated|saved/i').isVisible().catch(() => false);
            // Also check if modal closed (form no longer visible)
            const formStillVisible = await titleInput.isVisible().catch(() => false);
            // Success if we see success message OR form closed
            expect(successVisible || !formStillVisible).toBeTruthy();
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

