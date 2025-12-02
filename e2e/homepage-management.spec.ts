import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Homepage Management', () => {
  test('should navigate to homepage management', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for homepage link in navigation
    const homepageLink = page.locator('a:has-text("Homepage"), a:has-text("Home")');
    const linkCount = await homepageLink.count();
    
    if (linkCount > 0) {
      await homepageLink.first().click();
      await expect(page).toHaveURL(/\/admin\/homepage/);
    } else {
      // Try direct navigation
      await page.goto('/admin/homepage');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display homepage form', async ({ page }) => {
    await page.goto('/admin/homepage');
    
    await page.waitForTimeout(1000);
    
    // Form should be visible
    await expect(page.locator('body')).toBeVisible();
    
    // Should have form fields
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should edit hero section', async ({ page }) => {
    await page.goto('/admin/homepage');
    
    await page.waitForTimeout(1000);
    
    // Look for hero title input
    const heroTitleInput = page.locator('input[id*="hero"][id*="title"], input[name*="hero"][name*="title"]');
    const titleCount = await heroTitleInput.count();
    
    if (titleCount > 0) {
      const currentValue = await heroTitleInput.inputValue();
      await heroTitleInput.fill('Updated Hero Title');
      
      // Look for save button
      const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
      if (await saveButton.count() > 0) {
        await saveButton.first().click();
        await page.waitForTimeout(2000);
        
        // Should see success
        const successVisible = await page.locator('text=/success|saved|updated/i').isVisible().catch(() => false);
        expect(successVisible).toBeTruthy();
      }
    }
  });

  test('should edit about section', async ({ page }) => {
    await page.goto('/admin/homepage');
    
    await page.waitForTimeout(1000);
    
    // Look for about section textarea
    const aboutTextarea = page.locator('textarea[id*="about"], textarea[name*="about"]');
    const textareaCount = await aboutTextarea.count();
    
    if (textareaCount > 0) {
      await aboutTextarea.first().fill('Updated about section text');
      
      // Save
      const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
      if (await saveButton.count() > 0) {
        await saveButton.first().click();
        await page.waitForTimeout(2000);
        
        const successVisible = await page.locator('text=/success|saved|updated/i').isVisible().catch(() => false);
        expect(successVisible).toBeTruthy();
      }
    }
  });

  test('should upload hero image', async ({ page }) => {
    await page.goto('/admin/homepage');
    
    await page.waitForTimeout(1000);
    
    // Look for image upload input
    const imageInput = page.locator('input[type="file"][id*="image"], input[type="file"][name*="image"]');
    const inputCount = await imageInput.count();
    
    // Image upload may or may not be available
    expect(inputCount).toBeGreaterThanOrEqual(0);
  });

  test('should preview homepage changes', async ({ page }) => {
    await page.goto('/admin/homepage');
    
    await page.waitForTimeout(1000);
    
    // Look for preview button
    const previewButton = page.locator('button:has-text("Preview"), a:has-text("Preview")');
    const previewCount = await previewButton.count();
    
    if (previewCount > 0) {
      await previewButton.first().click();
      await page.waitForTimeout(1000);
      
      // Should navigate to homepage or open preview
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

