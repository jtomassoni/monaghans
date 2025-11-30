import { test, expect } from '@playwright/test';

test.describe('Menu Display', () => {
  test('should display menu page', async ({ page }) => {
    await page.goto('/menu');
    
    // Check that menu page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Menu should have sections or items displayed
    // This is a basic check - adjust based on your actual menu structure
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

