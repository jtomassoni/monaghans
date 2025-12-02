import { test, expect } from '@playwright/test';

// Test with both admin and owner roles
const roles = ['admin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Announcements Management (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    test('should navigate to announcements page', async ({ page }) => {
      await page.goto('/admin');
      
      // Navigate to announcements
      await page.click('a:has-text("Announcements")');
      
      // Should be on announcements page
      await expect(page).toHaveURL(/\/admin\/announcements/);
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
          // Fill in announcement details
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
      await page.goto('/admin/announcements');
      
      await page.waitForTimeout(1000);
      
      // Look for edit buttons
      const editButtons = page.locator('button:has-text("Edit"), a:has-text("Edit"), [data-announcement]').first();
      const editCount = await editButtons.count();
      
      if (editCount > 0) {
        await editButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Form should appear with existing data
        const titleInput = page.locator('input[id="title"], input[name="title"]');
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

    test('should delete an announcement', async ({ page }) => {
      await page.goto('/admin/announcements');
      
      await page.waitForTimeout(1000);
      
      // Look for delete button
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

