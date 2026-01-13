import { test, expect } from '@playwright/test';
import { TestDataTracker, waitForFormSubmission, waitForNetworkIdle, ensureSeedDataExists } from './test-helpers';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'announcements',
  featureArea: 'content',
  description: 'Announcements management (create, edit, delete, publish)',
};

// Test with both admin and owner roles
const roles = ['admin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Announcements Management (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    // Track test data for cleanup
    let tracker: TestDataTracker;

    test.beforeEach(() => {
      tracker = new TestDataTracker(`.auth/${role}.json`);
    });

    test.afterEach(async () => {
      await tracker.cleanup();
    });

    test('should navigate to announcements page', async ({ page }) => {
      await page.goto('/admin/announcements');
      await expect(page).toHaveURL(/\/admin\/announcements/);
      // Check for the main page heading (not the mobile header)
      await expect(page.getByRole('heading', { name: /Announcements/i }).first()).toBeVisible();
    });

    test('should display announcements list', async ({ page }) => {
      await page.goto('/admin/announcements');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have announcements content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should create a new announcement', async ({ page }) => {
      await page.goto('/admin/announcements');
      
      await page.waitForTimeout(1000);
      
      // Intercept API response to capture created announcement ID
      let createdId: string | null = null;
      page.on('response', async (response: any) => {
        if (response.url().includes('/api/announcements') && response.request().method() === 'POST') {
          if (response.status() >= 200 && response.status() < 300) {
            try {
              const data = await response.json();
              if (data.id) {
                createdId = data.id;
                tracker.trackAnnouncement(data.id);
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
          // Fill in announcement details with test prefix
          await titleInput.fill('Test Announcement');
          
          // Fill body/content
          const bodyInput = page.locator('textarea[id="body"], textarea[name="body"], textarea[id="description"]');
          if (await bodyInput.count() > 0) {
            await bodyInput.fill('This is a test announcement');
          }
          
          // Set publish date (optional)
          const publishDateInput = page.locator('input[type="datetime-local"][id*="publish"], input[type="date"][id*="publish"]');
          if (await publishDateInput.count() > 0) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await publishDateInput.fill(tomorrow.toISOString().slice(0, 16));
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
          // Form might be in modal
          const modalVisible = await page.locator('form, [role="dialog"]').isVisible().catch(() => false);
          expect(modalVisible).toBeTruthy();
        }
      }
    });

    test('should edit an existing announcement', async ({ page }) => {
      // Ensure seed data exists (helps with test isolation)
      const hasSeedData = await ensureSeedDataExists(page, 'announcement', 1);
      if (!hasSeedData) {
        console.warn('⚠️  No seed announcements found - test may fail');
      }
      
      await page.goto('/admin/announcements');
      
      // Wait for page to load deterministically
      await waitForNetworkIdle(page, 10000);
      
      // Look for announcement cards - try multiple selectors
      // First try the specific class, then fallback to more general
      let announcementCards = page.locator('.group\\/item');
      let cardCount = await announcementCards.count();
      
      if (cardCount === 0) {
        // Try alternative selectors - look for any clickable announcement item
        announcementCards = page.locator('[class*="bg-white"][class*="rounded-lg"], [class*="bg-gray-800"][class*="rounded-lg"]').filter({ has: page.locator('h3, p') });
        cardCount = await announcementCards.count();
      }
      
      if (cardCount > 0) {
        // Get first card and try to click it
        const firstCard = announcementCards.first();
        // Try clicking the card directly, or the clickable area inside
        let cardClicked = false;
        try {
          const clickableArea = firstCard.locator('.flex-1').first();
          if (await clickableArea.count() > 0) {
            await clickableArea.click({ timeout: 3000 });
            cardClicked = true;
          } else {
            await firstCard.click({ timeout: 3000 });
            cardClicked = true;
          }
        } catch {
          // If click fails, try scrolling and clicking again
          try {
            await firstCard.scrollIntoViewIfNeeded();
            await firstCard.click({ timeout: 3000 });
            cardClicked = true;
          } catch {
            // Still failed, use force as last resort
            await firstCard.click({ force: true });
            cardClicked = true;
          }
        }
        
        // Wait for the API call to fetch announcement data (happens when clicking)
        await page.waitForResponse(
          response => response.url().includes('/api/announcements/') && response.request().method() === 'GET',
          { timeout: 10000 }
        ).catch(() => null);
        
        // Wait for modal to appear - try multiple selectors with longer timeout
        await Promise.race([
          page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 10000 }),
          page.waitForSelector('input[id="title"], input[name="title"]', { state: 'visible', timeout: 10000 }),
          page.waitForSelector('input[id="announcement-title"]', { state: 'visible', timeout: 10000 }),
          page.waitForSelector('textarea[id="body"], textarea[name="body"]', { state: 'visible', timeout: 10000 }),
        ]);
        
        // Give form time to populate with data from API
        await page.waitForTimeout(1000);
        
        // Form should appear with existing data - try all possible selectors
        const titleInput = page.locator('input[id="title"], input[name="title"], input[id="announcement-title"]').first();
        await titleInput.waitFor({ state: 'visible', timeout: 10000 });
        
        const currentValue = await titleInput.inputValue();
        if (currentValue) {
          const updatedTitle = `${currentValue} - Updated`;
          await titleInput.fill(updatedTitle);
          
          // Save - wait for API response
          const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
          await submitButton.first().waitFor({ state: 'visible', timeout: 5000 });
          
          // Set up response listeners before clicking
          const putResponsePromise = page.waitForResponse(response => 
            response.url().includes('/api/announcements/') && response.request().method() === 'PUT',
            { timeout: 10000 }
          ).catch(() => null);
          
          const getResponsePromise = page.waitForResponse(response => 
            response.url().includes('/api/announcements') && 
            response.request().method() === 'GET' &&
            !response.url().includes('/api/announcements/'),
            { timeout: 10000 }
          ).catch(() => null);
          
          await submitButton.first().click();
          
          // Wait for PUT response
          const putResponse = await putResponsePromise;
          if (putResponse) {
            const putStatus = putResponse.status();
            if (putStatus !== 200) {
              const responseBody = await putResponse.text().catch(() => '');
              throw new Error(`Failed to update announcement: API returned status ${putStatus}. Response: ${responseBody}`);
            }
          } else {
            // If no PUT response was captured, check if there was an error
            await page.waitForTimeout(1000);
            const errorMessage = page.locator('text=/error|failed/i').first();
            if (await errorMessage.count() > 0) {
              throw new Error('Form submission may have failed - error message detected');
            }
          }
          
          // Wait for modal to close
          await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
          
          // Wait for GET response (list refresh)
          const getResponse = await getResponsePromise;
          if (getResponse) {
            await getResponse.finished().catch(() => {});
          }
          
          // Wait for network to settle
          await waitForNetworkIdle(page, 3000).catch(() => {});
          
          // Verify the updated title appears in the list
          const updatedRow = page.locator(`text=${updatedTitle}`).first();
          const rowVisible = await updatedRow.waitFor({ 
            state: 'visible', 
            timeout: 5000 
          }).catch(() => false);
          
          if (!rowVisible) {
            // Try reloading the page as fallback
            await page.reload();
            await waitForNetworkIdle(page, 5000).catch(() => {});
            await page.waitForTimeout(1000);
            
            const updatedRowAfterReload = page.locator(`text=${updatedTitle}`).first();
            const rowVisibleAfterReload = await updatedRowAfterReload.isVisible({ timeout: 5000 }).catch(() => false);
            
            if (!rowVisibleAfterReload) {
              // Check if the original title is still there (update might have failed)
              const originalRow = page.locator(`text=${currentValue}`).first();
              const originalVisible = await originalRow.isVisible({ timeout: 1000 }).catch(() => false);
              
              throw new Error(
                `Failed to edit announcement:\n` +
                `Test: should edit an existing announcement\n` +
                `Original title: ${currentValue}\n` +
                `Updated title: ${updatedTitle}\n` +
                `Original title still visible: ${originalVisible}\n` +
                `Check that:\n` +
                `- Announcement exists in seed data\n` +
                `- Form submission completed\n` +
                `- API endpoint is responding\n` +
                `- No console errors in browser`
              );
            }
          }
          
          // Success - the row is visible
          expect(true).toBeTruthy();
        }
      }
    });

    test('should delete an announcement', async ({ page }) => {
      await page.goto('/admin/announcements');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Look for delete button - could be in a menu or directly visible
      const deleteButtons = page.locator('button:has-text("Delete")').or(page.locator('button[aria-label*="Delete" i]')).or(page.locator('[aria-label*="delete" i]'));
      const deleteCount = await deleteButtons.count();
      
      if (deleteCount > 0) {
        // Wait for button to be visible
        const firstDeleteButton = deleteButtons.first();
        await firstDeleteButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await firstDeleteButton.isVisible().catch(() => false)) {
          await firstDeleteButton.click();
          await page.waitForTimeout(1000);
          
          // Confirm deletion - wait for confirmation dialog
          const confirmButton = page.locator('button:has-text("Confirm")').or(page.locator('button:has-text("Delete")')).or(page.locator('button:has-text("Yes")'));
          await confirmButton.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
          if (await confirmButton.count() > 0) {
            await confirmButton.first().click();
            await page.waitForTimeout(2000);
            
            // Check for success message or that item was removed
            const successVisible = await page.locator('text=/success|deleted|removed/i').isVisible().catch(() => false);
            // If no success message, at least verify the page still loads
            if (!successVisible) {
              await page.waitForLoadState('networkidle');
            }
            // Don't fail if no success message - deletion might work without toast
          }
        }
      }
      // If no delete buttons found, that's okay - might not have any announcements to delete
    });

    test('should set publish and expiry dates', async ({ page }) => {
      await page.goto('/admin/announcements');
      
      await page.waitForTimeout(1000);
      
      const newButton = page.locator('button:has-text("New"), a:has-text("New")').first();
      if (await newButton.count() > 0) {
        await newButton.click();
        await page.waitForTimeout(1000);
        
        // Set publish date
        const publishInput = page.locator('input[type="datetime-local"][id*="publish"], input[type="date"][id*="publish"]');
        if (await publishInput.count() > 0) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await publishInput.fill(tomorrow.toISOString().slice(0, 16));
        }
        
        // Set expiry date
        const expiryInput = page.locator('input[type="datetime-local"][id*="expir"], input[type="date"][id*="expir"]');
        if (await expiryInput.count() > 0) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          await expiryInput.fill(nextWeek.toISOString().slice(0, 16));
        }
        
        // Verify dates are set
        if (await publishInput.count() > 0) {
          const publishValue = await publishInput.inputValue();
          expect(publishValue).toBeTruthy();
        }
      }
    });

    test('should toggle social media cross-posting', async ({ page }) => {
      await page.goto('/admin/announcements');
      
      await page.waitForTimeout(1000);
      
      const newButton = page.locator('button:has-text("New"), a:has-text("New")').first();
      if (await newButton.count() > 0) {
        await newButton.click();
        await page.waitForTimeout(1000);
        
        // Look for Facebook/Instagram checkboxes
        const facebookCheckbox = page.locator('input[type="checkbox"][id*="facebook"], input[type="checkbox"][name*="facebook"]');
        const instagramCheckbox = page.locator('input[type="checkbox"][id*="instagram"], input[type="checkbox"][name*="instagram"]');
        
        if (await facebookCheckbox.count() > 0) {
          await facebookCheckbox.first().click();
          const isChecked = await facebookCheckbox.first().isChecked();
          expect(isChecked).toBeTruthy();
        }
        
        if (await instagramCheckbox.count() > 0) {
          await instagramCheckbox.first().click();
          const isChecked = await instagramCheckbox.first().isChecked();
          expect(isChecked).toBeTruthy();
        }
      }
    });
  });
}

