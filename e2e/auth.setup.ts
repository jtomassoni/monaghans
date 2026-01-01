import { test as setup, expect } from '@playwright/test';
import path from 'path';

const adminAuthFile = path.join(__dirname, '../.auth/admin.json');
const ownerAuthFile = path.join(__dirname, '../.auth/owner.json');

// Helper function to parse credentials from env var
function parseUserCredentials(envVar: string | undefined): Array<{username: string, password: string}> {
  if (!envVar) return [];
  return envVar
    .split(',')
    .map(pair => {
      const [username, password] = pair.split(':').map(s => s.trim());
      if (username && password) {
        return { username, password };
      }
      return null;
    })
    .filter((cred): cred is {username: string, password: string} => cred !== null);
}

// Helper function to authenticate a user
async function authenticateUser(page: any, username: string, password: string) {
  await page.goto('/admin/login');
  
  // Wait for the login form to be visible
  await page.waitForSelector('input[id="username"]', { state: 'visible', timeout: 30000 });
  await page.waitForSelector('input[id="password"]', { state: 'visible' });
  
  // Fill in credentials
  await page.fill('input[id="username"]', username);
  await page.fill('input[id="password"]', password);
  await page.waitForTimeout(500); // Small delay to ensure fields are filled
  
  // Wait for submit button to be enabled
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 5000 });
  const submitButton = page.locator('button[type="submit"]:not([disabled])');
  
  // Set up navigation promise BEFORE clicking
  const navigationPromise = page.waitForURL(/\/admin/, { timeout: 30000 }).catch(() => null);
  
  // Click submit and wait for navigation
  await submitButton.click();
  
  // Wait for navigation - could go to /admin or /admin/overview or stay on /admin/login if error
  try {
    await navigationPromise;
    
    // Additional wait to ensure page has loaded
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    
    // Verify we're actually on an admin page
    const currentUrl = page.url();
    if (!currentUrl.includes('/admin') || currentUrl.includes('/admin/login')) {
      throw new Error(`Navigation completed but still on login page: ${currentUrl}`);
    }
  } catch (error) {
    // If navigation failed, check if we're still on login page (might be an error)
    const currentUrl = page.url();
    if (currentUrl.includes('/admin/login')) {
      // Check for error message
      const errorVisible = await page.locator('text=/error|invalid|incorrect/i').isVisible().catch(() => false);
      if (errorVisible) {
        throw new Error('Login failed - check credentials');
      }
      // Otherwise wait a bit more and try again - sometimes redirect is slow
      await page.waitForTimeout(3000);
      try {
        await page.waitForURL(/\/admin/, { timeout: 15000 });
      } catch (retryError) {
        // If still failing, check if we're actually logged in by looking for admin content
        // Try multiple ways to detect if we're logged in
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        
        // If we're not on login page, try to verify we're logged in
        if (!currentUrl.includes('/admin/login')) {
          // We navigated away from login - check for admin content
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          const adminContent = await page.locator('text=Monaghan\'s').or(page.locator('nav')).or(page.locator('[class*="admin"]')).first().isVisible({ timeout: 3000 }).catch(() => false);
          if (adminContent) {
            // We're logged in!
            return;
          }
        }
        
        // Still on login or no admin content - check for error message
        const errorText = await page.locator('text=/error|invalid|incorrect|failed/i').textContent().catch(() => '');
        if (errorText) {
          throw new Error(`Login failed - error message: ${errorText}. Current URL: ${currentUrl}`);
        }
        
        // No error but still on login - might be a timing issue
        // Try navigating directly to /admin to see if we're actually logged in
        await page.goto('/admin');
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(2000);
        
        const afterDirectNav = page.url();
        if (afterDirectNav.includes('/admin/login')) {
          // Redirected back to login - credentials are wrong or user doesn't exist
          throw new Error(`Login failed - redirected back to login page. Credentials may be incorrect or user doesn't exist. Username: ${username}`);
        }
        
        // We're on an admin page - check for content
        const adminContentAfterNav = await page.locator('text=Monaghan\'s').or(page.locator('nav')).first().isVisible({ timeout: 3000 }).catch(() => false);
        if (adminContentAfterNav) {
          // We're logged in!
          return;
        }
        
        throw new Error(`Login failed - navigated to ${afterDirectNav} but no admin content found`);
      }
    } else {
      // Not on login page, might have navigated somewhere else
      throw error;
    }
  }
  
  // Verify we're logged in by checking URL - if we're on /admin (not /admin/login), we're good
  const finalUrl = page.url();
  if (finalUrl.includes('/admin/login')) {
    // Still on login page - check for error message
    const errorVisible = await page.locator('text=/error|invalid|incorrect/i').isVisible().catch(() => false);
    if (errorVisible) {
      throw new Error('Login failed - check credentials');
    }
    // No error but still on login - might be a timing issue, wait a bit more and check again
    await page.waitForTimeout(3000);
    const stillOnLogin = page.url().includes('/admin/login');
    if (stillOnLogin) {
      // Try one more time - sometimes the redirect happens after a delay
      await page.waitForTimeout(2000);
      const finalCheck = page.url();
      if (finalCheck.includes('/admin/login')) {
        // Check if we can see admin content even though URL says login (might be a redirect issue)
        const adminContent = await page.locator('text=Monaghan\'s').or(page.locator('nav')).isVisible({ timeout: 2000 }).catch(() => false);
        if (!adminContent) {
          // Check if there's an error message on the page
          const errorText = await page.locator('text=/error|invalid|incorrect|failed/i').textContent().catch(() => '');
          if (errorText) {
            throw new Error(`Login failed - error message: ${errorText}. Final URL: ${finalCheck}`);
          }
          // Try navigating directly to /admin to see if we're actually logged in
          await page.goto('/admin');
          await page.waitForTimeout(2000);
          const afterDirectNav = page.url();
          if (afterDirectNav.includes('/admin/login')) {
            throw new Error(`Login failed - could not navigate away from login page. Final URL: ${finalCheck}`);
          }
          // If we're not on login page after direct nav, we're logged in
          return;
        }
      }
    }
  }
  // If we're here and not on login page, we're logged in
}

setup('authenticate as admin', async ({ page }) => {
  // Get first admin user from env (default: jt:test)
  const adminUsers = parseUserCredentials(process.env.ADMIN_USERS || 'jt:test');
  if (adminUsers.length === 0) {
    throw new Error('ADMIN_USERS must be set with at least one user');
  }
  
  const { username, password } = adminUsers[0];
  await authenticateUser(page, username, password);
  
  // Save signed-in state
  await page.context().storageState({ path: adminAuthFile });
});

setup('authenticate as owner', async ({ page }) => {
  // Get first owner user from env (default: owner:test)
  const ownerUsers = parseUserCredentials(process.env.OWNER_USERS || 'owner:test');
  if (ownerUsers.length === 0) {
    throw new Error('OWNER_USERS must be set with at least one user');
  }
  
  const { username, password } = ownerUsers[0];
  await authenticateUser(page, username, password);
  
  // Save signed-in state
  await page.context().storageState({ path: ownerAuthFile });
});

