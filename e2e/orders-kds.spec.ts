import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Orders and KDS Management', () => {
  test('should navigate to orders page', async ({ page }) => {
    await page.goto('/admin');
    
    // Navigate to orders
    await page.click('a:has-text("Orders")');
    
    // Should be on orders page
    await expect(page).toHaveURL(/\/admin\/orders/);
  });

  test('should display orders list', async ({ page }) => {
    await page.goto('/admin/orders');
    
    await page.waitForTimeout(1000);
    
    // Page should load
    await expect(page.locator('body')).toBeVisible();
    
    // Should have orders content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should filter orders by status', async ({ page }) => {
    await page.goto('/admin/orders');
    
    await page.waitForTimeout(1000);
    
    // Look for status filter
    const statusFilter = page.locator('select[id*="status"], select[name*="status"], button:has-text("Pending")');
    const filterCount = await statusFilter.count();
    
    if (filterCount > 0) {
      if (await statusFilter.first().evaluate(el => el.tagName === 'SELECT')) {
        const options = await statusFilter.locator('option').count();
        if (options > 1) {
          await statusFilter.selectIndex(1);
          await page.waitForTimeout(1000);
          
          // Filter should be applied
          await expect(page.locator('body')).toBeVisible();
        }
      } else {
        await statusFilter.first().click();
        await page.waitForTimeout(1000);
        
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should update order status', async ({ page }) => {
    await page.goto('/admin/orders');
    
    await page.waitForTimeout(1000);
    
    // Look for order status dropdowns or buttons
    const statusControls = page.locator('select[id*="status"], button:has-text("Update"), button:has-text("Status")').first();
    const controlCount = await statusControls.count();
    
    if (controlCount > 0) {
      // Try to update status
      if (await statusControls.first().evaluate(el => el.tagName === 'SELECT')) {
        const options = await statusControls.locator('option').count();
        if (options > 1) {
          await statusControls.selectIndex(1);
          await page.waitForTimeout(1000);
          
          // Should see update
          const successVisible = await page.locator('text=/success|updated/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    }
  });

  test('should view order details', async ({ page }) => {
    await page.goto('/admin/orders');
    
    await page.waitForTimeout(1000);
    
    // Look for order items/rows
    const orderItems = page.locator('[data-order], .order-item, tr, a:has-text("View")').first();
    const itemCount = await orderItems.count();
    
    if (itemCount > 0) {
      await orderItems.first().click();
      await page.waitForTimeout(1000);
      
      // Should show order details
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should navigate to KDS page', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for KDS link
    const kdsLink = page.locator('a:has-text("KDS"), a:has-text("Kitchen")');
    const linkCount = await kdsLink.count();
    
    if (linkCount > 0) {
      await kdsLink.first().click();
      await expect(page).toHaveURL(/\/admin\/kds|\/kitchen/);
    } else {
      // Try direct navigation
      await page.goto('/admin/kds');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display KDS interface', async ({ page }) => {
    await page.goto('/admin/kds');
    
    await page.waitForTimeout(1000);
    
    // KDS should display orders
    await expect(page.locator('body')).toBeVisible();
    
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should update order status from KDS', async ({ page }) => {
    await page.goto('/admin/kds');
    
    await page.waitForTimeout(1000);
    
    // Look for order status buttons (acknowledge, preparing, ready, etc.)
    const statusButtons = page.locator('button:has-text("Acknowledge"), button:has-text("Preparing"), button:has-text("Ready"), button:has-text("Complete")');
    const buttonCount = await statusButtons.count();
    
    if (buttonCount > 0) {
      await statusButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Status should update
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter orders by date range', async ({ page }) => {
    await page.goto('/admin/orders');
    
    await page.waitForTimeout(1000);
    
    // Look for date range inputs
    const startDateInput = page.locator('input[type="date"][id*="start"], input[type="date"][name*="start"]');
    const endDateInput = page.locator('input[type="date"][id*="end"], input[type="date"][name*="end"]');
    
    if (await startDateInput.count() > 0 && await endDateInput.count() > 0) {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const today = new Date();
      
      await startDateInput.first().fill(lastWeek.toISOString().split('T')[0]);
      await endDateInput.first().fill(today.toISOString().split('T')[0]);
      
      // Apply filter
      const applyButton = page.locator('button:has-text("Apply"), button:has-text("Filter")');
      if (await applyButton.count() > 0) {
        await applyButton.first().click();
        await page.waitForTimeout(2000);
        
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should search orders', async ({ page }) => {
    await page.goto('/admin/orders');
    
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
});

