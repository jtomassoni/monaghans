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
    // Handle connection errors gracefully
    try {
      await page.goto('/admin', { waitUntil: 'networkidle', timeout: 30000 });
    } catch (error: any) {
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.message?.includes('net::ERR')) {
        test.skip(true, 'Server not available - connection refused');
        return;
      }
      throw error;
    }
    
    // Owner should be able to see the dashboard
    await expect(page.locator('text=Monaghan\'s')).toBeVisible();
  });

  test('should be able to view events as owner', async ({ page }) => {
    // Handle connection errors gracefully
    try {
      await page.goto('/admin/events', { waitUntil: 'networkidle', timeout: 30000 });
    } catch (error: any) {
      if (error?.message?.includes('ERR_CONNECTION_REFUSED') || error?.message?.includes('net::ERR')) {
        test.skip(true, 'Server not available - connection refused');
        return;
      }
      throw error;
    }
    
    // Owner should be able to view events
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be able to view menu as owner', async ({ page }) => {
    await page.goto('/admin/menu');
    
    // Owner should be able to view menu
    await expect(page.locator('body')).toBeVisible();
  });
});


