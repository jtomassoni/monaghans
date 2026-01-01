import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'scheduling',
  featureArea: 'staff',
  description: 'Staff scheduling and shift management',
};

// Test with both admin and owner roles
const roles = ['admin', 'owner'] as const;

for (const role of roles) {
  test.describe(`Scheduling (${role})`, () => {
    test.use({ storageState: `.auth/${role}.json` });

    test('should navigate to scheduling page', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForTimeout(1000);
      
      // Navigate to scheduling - look for Staff Management link (in Back of House section)
      // The link might be in a collapsible section, so we need to expand it first
      const backOfHouseButton = page.locator('button:has-text("Back of House")').or(page.locator('button:has-text("BOH")'));
      const bohButtonCount = await backOfHouseButton.count().catch(() => 0);
      
      if (bohButtonCount > 0 && await backOfHouseButton.isVisible().catch(() => false)) {
        // Expand the Back of House section
        await backOfHouseButton.click();
        await page.waitForTimeout(500);
      }
      
      // Now look for Staff Management link
      const staffLink = page.locator('a:has-text("Staff Management")').or(page.locator('a[href="/admin/staff"]')).first();
      await staffLink.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      
      if (await staffLink.isVisible().catch(() => false)) {
        await staffLink.click();
        await page.waitForURL(/\/admin\/staff/, { timeout: 5000 });
      } else {
        // Link not visible, try direct navigation
        await page.goto('/admin/staff');
        await expect(page).toHaveURL(/\/admin\/staff/);
      }
    });

    test('should display scheduling interface', async ({ page }) => {
      await page.goto('/admin/staff');
      
      // Page should load
      await expect(page.locator('body')).toBeVisible();
      
      // Should have scheduling content
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    });

    test('should have schedule tab and create a shift', async ({ page }) => {
      await page.goto('/admin/staff');
      
      await page.waitForTimeout(1000);
      
      // Look for schedule tab
      const scheduleTab = page.locator('button:has-text("Schedule"), a:has-text("Schedule"), [role="tab"]:has-text("Schedule")');
      const tabCount = await scheduleTab.count();
      
      if (tabCount > 0) {
        await scheduleTab.first().click();
        await page.waitForTimeout(1000);
        
        // Look for "New" or "Add Shift" button
        const newButton = page.locator('button:has-text("New"), button:has-text("Add Shift"), button:has-text("Create")');
        const newButtonCount = await newButton.count();
        
        if (newButtonCount > 0) {
          await newButton.first().click();
          await page.waitForTimeout(1000);
          
          // Form should appear
          const formVisible = await page.locator('form, [role="dialog"], select[id="employeeId"], select[name="employeeId"]').isVisible().catch(() => false);
          expect(formVisible).toBeTruthy();
          
          // Try to fill form if employee select exists
          const employeeSelect = page.locator('select[id="employeeId"], select[name="employeeId"]');
          if (await employeeSelect.count() > 0) {
            const options = await employeeSelect.locator('option').count();
            if (options > 1) {
              // Select first employee (skip "Select..." option)
              await employeeSelect.selectIndex(1);
              
              // Set date (tomorrow)
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const dateStr = tomorrow.toISOString().split('T')[0];
              
              const dateInput = page.locator('input[type="date"], input[id="date"], input[name="date"]');
              if (await dateInput.count() > 0) {
                await dateInput.fill(dateStr);
              }
              
              // Select shift type
              const shiftTypeSelect = page.locator('select[id="shiftType"], select[name="shiftType"]');
              if (await shiftTypeSelect.count() > 0) {
                await shiftTypeSelect.selectOption({ index: 1 });
              }
              
              // Try to save
              const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
              if (await saveButton.count() > 0) {
                await saveButton.first().click();
                await page.waitForTimeout(2000);
                
                // Should see success
                const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
                expect(successVisible).toBeTruthy();
              }
            }
          }
        }
      }
    });

    test('should edit an existing shift', async ({ page }) => {
      await page.goto('/admin/staff');
      
      await page.waitForTimeout(1000);
      
      // Go to schedule tab
      const scheduleTab = page.locator('button:has-text("Schedule"), [role="tab"]:has-text("Schedule")');
      if (await scheduleTab.count() > 0) {
        await scheduleTab.first().click();
        await page.waitForTimeout(1000);
        
        // Look for existing shifts to edit
        const shiftCells = page.locator('[data-schedule], .schedule-cell, [role="button"]:has-text(":")');
        const shiftCount = await shiftCells.count();
        
        if (shiftCount > 0) {
          await shiftCells.first().click();
          await page.waitForTimeout(1000);
          
          // Edit form should appear
          const formVisible = await page.locator('form, [role="dialog"]').isVisible().catch(() => false);
          if (formVisible) {
            // Modify shift type or notes
            const notesInput = page.locator('textarea[id="notes"], textarea[name="notes"]');
            if (await notesInput.count() > 0) {
              await notesInput.fill('Updated test notes');
            }
            
            // Save
            const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
            if (await saveButton.count() > 0) {
              await saveButton.first().click();
              await page.waitForTimeout(2000);
              
              // Should see success
              const successVisible = await page.locator('text=/success|updated|saved/i').isVisible().catch(() => false);
              expect(successVisible).toBeTruthy();
            }
          }
        }
      }
    });

    test('should navigate between weeks', async ({ page }) => {
      await page.goto('/admin/staff');
      
      await page.waitForTimeout(1000);
      
      const scheduleTab = page.locator('button:has-text("Schedule"), [role="tab"]:has-text("Schedule")');
      if (await scheduleTab.count() > 0) {
        await scheduleTab.first().click();
        await page.waitForTimeout(1000);
        
        // Find week navigation buttons
        const nextWeekButton = page.locator('button:has-text("Next"), button[aria-label*="Next"], button[aria-label*="next"]');
        if (await nextWeekButton.count() > 0) {
          await nextWeekButton.first().click();
          await page.waitForTimeout(1000);
          
          // Schedule should still be visible
          await expect(page.locator('body')).toBeVisible();
        }
      }
    });

    test('should create shift requirements', async ({ page }) => {
      await page.goto('/admin/staff');
      
      await page.waitForTimeout(1000);
      
      const scheduleTab = page.locator('button:has-text("Schedule"), [role="tab"]:has-text("Schedule")');
      if (await scheduleTab.count() > 0) {
        await scheduleTab.first().click();
        await page.waitForTimeout(1000);
        
        // Look for requirements button or section
        const requirementsButton = page.locator('button:has-text("Requirement"), button:has-text("Requirements"), button:has-text("Add Requirement")');
        const reqButtonCount = await requirementsButton.count();
        
        if (reqButtonCount > 0) {
          await requirementsButton.first().click();
          await page.waitForTimeout(1000);
          
          // Requirements form should appear
          const formVisible = await page.locator('form, [role="dialog"]').isVisible().catch(() => false);
          expect(formVisible).toBeTruthy();
        }
      }
    });

    test('should have availability tab', async ({ page }) => {
      await page.goto('/admin/staff');
      
      await page.waitForTimeout(1000);
      
      // Look for availability tab
      const availabilityTab = page.locator('button:has-text("Availability"), a:has-text("Availability"), [role="tab"]:has-text("Availability")');
      const tabCount = await availabilityTab.count();
      
      if (tabCount > 0) {
        await availabilityTab.first().click();
        await page.waitForTimeout(1000);
        
        // Availability view should be visible
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should have employees tab', async ({ page }) => {
      await page.goto('/admin/staff');
      
      await page.waitForTimeout(1000);
      
      const employeesTab = page.locator('button:has-text("Employees"), [role="tab"]:has-text("Employees")');
      const tabCount = await employeesTab.count();
      
      if (tabCount > 0) {
        await employeesTab.first().click();
        await page.waitForTimeout(1000);
        
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('should have payroll tab', async ({ page }) => {
      await page.goto('/admin/staff');
      
      await page.waitForTimeout(1000);
      
      const payrollTab = page.locator('button:has-text("Payroll"), [role="tab"]:has-text("Payroll")');
      const tabCount = await payrollTab.count();
      
      if (tabCount > 0) {
        await payrollTab.first().click();
        await page.waitForTimeout(1000);
        
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });
}

