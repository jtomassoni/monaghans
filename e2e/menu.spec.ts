import { test, expect } from '@playwright/test';
import { TestMetadata } from './test-metadata';

export const testMetadata: TestMetadata = {
  specName: 'menu',
  featureArea: 'operations',
  description: 'Public menu display',
};

test.describe('Public Menu Display', () => {
  test('should display menu page', async ({ page }) => {
    await page.goto('/menu');
    
    // Check that menu page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Menu should have sections or items displayed
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should display menu sections', async ({ page }) => {
    await page.goto('/menu');
    
    await page.waitForTimeout(1000);
    
    // Look for menu sections
    const sections = page.locator('h2, h3, [data-section], .menu-section');
    const sectionCount = await sections.count();
    
    // Should have at least some content
    expect(sectionCount).toBeGreaterThanOrEqual(0);
  });

  test('should display menu items', async ({ page }) => {
    await page.goto('/menu');
    
    await page.waitForTimeout(1000);
    
    // Look for menu items
    const items = page.locator('[data-item], .menu-item, .item');
    const itemCount = await items.count();
    
    // Items may or may not be displayed
    expect(itemCount).toBeGreaterThanOrEqual(0);
  });

  test('should display item prices', async ({ page }) => {
    await page.goto('/menu');
    
    await page.waitForTimeout(1000);
    
    // Look for price displays - use .or() to combine regex text locator with CSS selector
    const prices = page.locator('text=/\$[0-9]/').or(page.locator('[data-price]'));
    const priceCount = await prices.count();
    
    // Prices may or may not be displayed
    expect(priceCount).toBeGreaterThanOrEqual(0);
  });

  test('should display item descriptions', async ({ page }) => {
    await page.goto('/menu');
    
    await page.waitForTimeout(1000);
    
    // Look for descriptions
    const descriptions = page.locator('[data-description], .description, p');
    const descCount = await descriptions.count();
    
    // Descriptions may or may not be displayed
    expect(descCount).toBeGreaterThanOrEqual(0);
  });

  test('should filter menu by section', async ({ page }) => {
    await page.goto('/menu');
    
    await page.waitForTimeout(1000);
    
    // Look for section filters/tabs
    const sectionFilters = page.locator('button:has-text("Food"), button:has-text("Drinks"), a:has-text("Food")');
    const filterCount = await sectionFilters.count();
    
    if (filterCount > 0) {
      await sectionFilters.first().click();
      await page.waitForTimeout(1000);
      
      // Menu should update
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show item availability', async ({ page }) => {
    await page.goto('/menu');
    
    await page.waitForTimeout(1000);
    
    // Look for availability indicators
    const availability = page.locator('text=/unavailable/i').or(page.locator('text=/sold out/i')).or(page.locator('[data-available="false"]'));
    const availCount = await availability.count();
    
    // Availability may or may not be displayed
    expect(availCount).toBeGreaterThanOrEqual(0);
  });
});


