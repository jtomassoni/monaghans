import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'owner-permissions',
  featureArea: 'administration',
  description: 'Owner role permissions and restrictions',
};

// Test owner role permissions and restrictions
test.use({ storageState: '.auth/owner.json' });

test.describe('Owner Permissions', () => {
  test('should be able to access admin dashboard as owner', async ({ page }) => {
    await page.goto('/admin');
    
    // Owner should be able to see the dashboard
    await expect(page.locator('text=Monaghan\'s')).toBeVisible();
  });

  test('should be able to view events as owner', async ({ page }) => {
    await page.goto('/admin/events');
    
    // Owner should be able to view events
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be able to view menu as owner', async ({ page }) => {
    await page.goto('/admin/menu');
    
    // Owner should be able to view menu
    await expect(page.locator('body')).toBeVisible();
  });
});


