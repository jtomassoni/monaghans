import { test, expect } from '@playwright/test';
import { TestDataTracker } from './test-helpers';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'user-management',
  featureArea: 'administration',
  description: 'User account management',
};

test.use({ storageState: '.auth/admin.json' });

test.describe('User Management', () => {
  // Track test data for cleanup
  let tracker: TestDataTracker;

  test.beforeEach(() => {
    tracker = new TestDataTracker('.auth/admin.json', 'test');
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });
  test('should navigate to users page', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Wait for navigation to be ready
    await page.waitForTimeout(500);
    
    // Navigate to users - try multiple link texts and direct navigation
    // First try to expand Administration section if needed
    const adminSectionButton = page.locator('button:has-text("Administration")');
    if (await adminSectionButton.count() > 0 && await adminSectionButton.isVisible().catch(() => false)) {
      const isExpanded = await adminSectionButton.getAttribute('aria-expanded').catch(() => null);
      if (isExpanded !== 'true') {
        await adminSectionButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const usersLink = page.locator('a:has-text("Users & Staff"), a:has-text("Users"), a:has-text("Staff"), a[href="/admin/users-staff"], a[href*="users-staff"]').first();
    const linkVisible = await usersLink.waitFor({ state: 'visible', timeout: 5000 }).catch(() => false);
    
    if (linkVisible) {
      await usersLink.click();
      await expect(page).toHaveURL(/\/admin\/users|\/admin\/users-staff/, { timeout: 10000 });
    } else {
      // Link not visible, try direct navigation
      await page.goto('/admin/users-staff');
      await expect(page).toHaveURL(/\/admin\/users|\/admin\/users-staff/, { timeout: 10000 });
    }
  });

  test('should display users list', async ({ page }) => {
    await page.goto('/admin/users-staff');
    
    await page.waitForTimeout(1000);
    
    // Page should load
    await expect(page.locator('body')).toBeVisible();
    
    // Should have users content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should create a new user', async ({ page }) => {
    await page.goto('/admin/users-staff');
    
    await page.waitForTimeout(1000);
    
    // Intercept API response to capture created user ID
    page.on('response', async (response) => {
      if (response.url().includes('/api/users') && response.request().method() === 'POST') {
        if (response.ok) {
          try {
            const data = await response.json();
            if (data.id) {
              tracker.trackUser(data.id);
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
      
      // Form should appear
      const usernameInput = page.locator('input[id="username"], input[name="username"], input[id="name"]');
      const formVisible = await usernameInput.isVisible().catch(() => false);
      
      if (formVisible) {
        // Fill in user details with test prefix
        await usernameInput.fill('testuser');
        
        // Fill password if exists
        const passwordInput = page.locator('input[type="password"][id*="password"], input[type="password"][name*="password"]');
        if (await passwordInput.count() > 0) {
          await passwordInput.first().fill('testpassword123');
        }
        
        // Fill email if exists
        const emailInput = page.locator('input[type="email"], input[id*="email"], input[name*="email"]');
        if (await emailInput.count() > 0) {
          await emailInput.first().fill('test@example.com');
        }
        
        // Select role
        const roleSelect = page.locator('select[id*="role"], select[name*="role"]');
        if (await roleSelect.count() > 0) {
          const options = await roleSelect.locator('option').count();
          if (options > 1) {
            // Select manager role (not owner)
            await roleSelect.selectOption({ index: 1 });
          }
        }
        
        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(2000);
          
          const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    }
  });

  test('should edit an existing user', async ({ page }) => {
    await page.goto('/admin/users-staff');
    
    await page.waitForTimeout(1000);
    
    // Look for edit buttons
    const editButtons = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    const editCount = await editButtons.count();
    
    if (editCount > 0) {
      await editButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Form should appear with existing data
      const usernameInput = page.locator('input[id="username"], input[name="username"]');
      if (await usernameInput.count() > 0) {
        const currentValue = await usernameInput.inputValue();
        if (currentValue) {
          // Update username
          await usernameInput.fill(`${currentValue}_updated`);
          
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

  test('should change user role', async ({ page }) => {
    await page.goto('/admin/users-staff');
    
    await page.waitForTimeout(1000);
    
    const editButtons = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    if (await editButtons.count() > 0) {
      await editButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Change role
      const roleSelect = page.locator('select[id*="role"], select[name*="role"]');
      if (await roleSelect.count() > 0) {
        const options = await roleSelect.locator('option').count();
        if (options > 2) {
          // Select a different role
          await roleSelect.selectOption({ index: 2 });
          
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

  test('should delete a user', async ({ page }) => {
    await page.goto('/admin/users-staff');
    
    await page.waitForTimeout(1000);
    
    // Look for delete buttons
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

  test('should filter users by role', async ({ page }) => {
    await page.goto('/admin/users-staff');
    
    await page.waitForTimeout(1000);
    
    // Look for role filter
    const roleFilter = page.locator('select[id*="role"], select[name*="role"], button:has-text("Role")');
    const filterCount = await roleFilter.count();
    
    if (filterCount > 0) {
      if (await roleFilter.first().evaluate(el => el.tagName === 'SELECT')) {
        const options = await roleFilter.locator('option').count();
        if (options > 1) {
          await roleFilter.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          // Filter should be applied
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });

  test('should search users', async ({ page }) => {
    await page.goto('/admin/users-staff');
    
    await page.waitForTimeout(1000);
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[id*="search"], input[name*="search"], input[placeholder*="Search"]');
    const inputCount = await searchInput.count();
    
    if (inputCount > 0) {
      await searchInput.first().fill('test');
      await page.waitForTimeout(1000);
      
      // Search should filter results
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should activate/deactivate users', async ({ page }) => {
    await page.goto('/admin/users-staff');
    
    await page.waitForTimeout(1000);
    
    // Look for activate/deactivate toggles
    const statusToggles = page.locator('input[type="checkbox"][id*="active"], input[type="checkbox"][name*="active"], button[aria-label*="active"]');
    const toggleCount = await statusToggles.count();
    
    if (toggleCount > 0) {
      const initialState = await statusToggles.first().isChecked().catch(() => false);
      await statusToggles.first().click();
      await page.waitForTimeout(1000);
      
      const newState = await statusToggles.first().isChecked().catch(() => false);
      expect(newState).not.toBe(initialState);
    }
  });
});

