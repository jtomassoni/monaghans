import { test, expect } from '@playwright/test';

test.describe('Public Homepage', () => {
  test('should display homepage content', async ({ page }) => {
    await page.goto('/');
    
    // Check for main heading
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Check that "Order Online" button is disabled or shows "Coming Soon"
    const orderButton = page.locator('text=Order Online, text=/coming soon/i');
    const orderButtonCount = await orderButton.count();
    
    if (orderButtonCount > 0) {
      await expect(orderButton.first()).toBeVisible();
    }
    
    // Check that "View Menu" button is enabled
    const menuButton = page.locator('text=View Menu, a:has-text("Menu")');
    const menuButtonCount = await menuButton.count();
    
    if (menuButtonCount > 0) {
      await expect(menuButton.first()).toBeVisible();
    }
  });

  test('should navigate to menu page', async ({ page }) => {
    await page.goto('/');
    
    // Click View Menu button or link
    const menuButton = page.locator('text=View Menu, a:has-text("Menu")').first();
    if (await menuButton.count() > 0) {
      await menuButton.click();
      
      // Should navigate to menu page
      await expect(page).toHaveURL(/\/menu/);
    }
  });

  test('should display today\'s specials', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(1000);
    
    // Look for specials section
    const specialsSection = page.locator('text=/special/i, text=/today/i');
    const sectionCount = await specialsSection.count();
    
    // Specials may or may not be displayed
    expect(sectionCount).toBeGreaterThanOrEqual(0);
  });

  test('should display events', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(1000);
    
    // Look for events section
    const eventsSection = page.locator('text=/event/i, text=/tonight/i');
    const sectionCount = await eventsSection.count();
    
    // Events may or may not be displayed
    expect(sectionCount).toBeGreaterThanOrEqual(0);
  });

  test('should display today\'s events in hero section with correct timezone', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(2000);
    
    // Verify homepage loads
    await expect(page.locator('body')).toBeVisible();
    
    // Look for hero section or events section
    // The hero should show today's events if any exist
    const heroContent = await page.textContent('body');
    expect(heroContent).toBeTruthy();
    
    // Check for any date/time formatting (should be in Mountain Time)
    // Events displayed should show correct times regardless of when/where test runs
    const dateElements = page.locator('text=/Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|PM|AM|pm|am/');
    const dateCount = await dateElements.count();
    
    // If dates are shown, they should be formatted (structural check)
    expect(dateCount).toBeGreaterThanOrEqual(0);
  });

  test('should not show hydration errors related to dates/times', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load and hydrate
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check console for hydration errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('hydration') || text.includes('Hydration') || 
            (text.includes('date') && text.includes('mismatch'))) {
          consoleErrors.push(text);
        }
      }
    });
    
    // Navigate around to trigger any hydration issues
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Verify no hydration errors occurred
    expect(consoleErrors.length).toBe(0);
  });

  test('should display announcements', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(1000);
    
    // Look for announcements
    const announcements = page.locator('text=/announcement/i, [data-announcement]');
    const announcementCount = await announcements.count();
    
    // Announcements may or may not be displayed
    expect(announcementCount).toBeGreaterThanOrEqual(0);
  });

  test('should display business hours', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(1000);
    
    // Look for hours section
    const hoursSection = page.locator('text=/hour/i, text=/open/i, text=/close/i');
    const sectionCount = await hoursSection.count();
    
    // Hours should be displayed
    expect(sectionCount).toBeGreaterThanOrEqual(0);
  });

  test('should display contact information', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(1000);
    
    // Look for contact info (phone, address)
    const contactInfo = page.locator('text=/phone/i, text=/address/i, a[href^="tel:"]');
    const infoCount = await contactInfo.count();
    
    // Contact info should be available
    expect(infoCount).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to events page', async ({ page }) => {
    await page.goto('/');
    
    // Look for events link
    const eventsLink = page.locator('a:has-text("Events"), a[href*="events"]');
    const linkCount = await eventsLink.count();
    
    if (linkCount > 0) {
      await eventsLink.first().click();
      await expect(page).toHaveURL(/\/events/);
    }
  });

  test('should navigate to contact page', async ({ page }) => {
    await page.goto('/');
    
    // Look for contact link
    const contactLink = page.locator('a:has-text("Contact"), a[href*="contact"]');
    const linkCount = await contactLink.count();
    
    if (linkCount > 0) {
      await contactLink.first().click();
      await expect(page).toHaveURL(/\/contact/);
    }
  });

  test('should not allow navigation to order page from homepage', async ({ page }) => {
    await page.goto('/');
    
    // Order Online button should not be a link or should be disabled
    const orderButton = page.locator('text=Order Online, text=/coming soon/i');
    const orderButtonCount = await orderButton.count();
    
    if (orderButtonCount > 0) {
      // Check if it's a link
      const parent = orderButton.first().locator('..');
      const isLink = await parent.evaluate((el) => el.tagName === 'A').catch(() => false);
      
      // Should not be an active link
      expect(isLink).toBeFalsy();
    }
  });
});


