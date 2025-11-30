import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display homepage content', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Check that "Order Online" button is disabled
    const orderButton = page.locator('text=Order Online');
    await expect(orderButton).toBeVisible();
    await expect(orderButton).toContainText('Coming Soon');
    
    // Check that "View Menu" button is enabled
    const menuButton = page.locator('text=View Menu');
    await expect(menuButton).toBeVisible();
    
    // Verify menu button links to /menu
    await expect(menuButton).toHaveAttribute('href', '/menu');
  });

  test('should navigate to menu page', async ({ page }) => {
    await page.goto('/');
    
    // Click View Menu button
    await page.click('text=View Menu');
    
    // Should navigate to menu page
    await expect(page).toHaveURL(/\/menu/);
  });

  test('should not allow navigation to order page from homepage', async ({ page }) => {
    await page.goto('/');
    
    // Order Online button should not be a link
    const orderButton = page.locator('text=Order Online').locator('..');
    const isLink = await orderButton.evaluate((el) => el.tagName === 'A');
    expect(isLink).toBeFalsy();
  });
});

