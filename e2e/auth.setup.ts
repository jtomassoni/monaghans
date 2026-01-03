import { test as setup, expect } from '@playwright/test';
import path from 'path';

const adminAuthFile = path.join(__dirname, '../.auth/admin.json');
const ownerAuthFile = path.join(__dirname, '../.auth/owner.json');

// Helper function to parse credentials from env var
// Supports both JSON and colon-separated formats (matches lib/auth.ts)
function parseUserCredentials(envVar: string | undefined): Array<{username: string, password: string}> {
  if (!envVar) return [];
  
  // First try JSON format
  try {
    const parsed = JSON.parse(envVar);
    
    // If it's an array, return it directly
    if (Array.isArray(parsed)) {
      return parsed.filter((cred): cred is {username: string, password: string} => 
        cred && typeof cred === 'object' && 
        typeof cred.username === 'string' && 
        typeof cred.password === 'string'
      );
    }
    
    // If it's a single object, wrap it in an array
    if (parsed && typeof parsed === 'object' && 
        typeof parsed.username === 'string' && 
        typeof parsed.password === 'string') {
      return [parsed];
    }
  } catch (error) {
    // Not JSON, try colon-separated format
    // Format: "username1:password1,username2:password2"
    const credentials = envVar
      .split(',')
      .map(pair => {
        const [username, password] = pair.split(':').map(s => s.trim());
        if (username && password) {
          return { username, password };
        }
        return null;
      })
      .filter((cred): cred is {username: string, password: string} => cred !== null);
    
    if (credentials.length > 0) {
      return credentials;
    }
  }
  
  return [];
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
  
  // Click submit - the form uses client-side navigation (router.push)
  await submitButton.click();
  
  // Wait for navigation - client-side navigation might take a moment
  // Try multiple approaches: URL change, admin content appearing, or network idle
  let loggedIn = false;
  
  // Wait up to 15 seconds for successful login
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    
    // Check if we navigated away from login page
    if (!currentUrl.includes('/admin/login') && currentUrl.includes('/admin')) {
      // We're on an admin page - verify we're logged in by checking for admin content
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      // Check for admin content (nav, Monaghan's text, etc.)
      const adminContent = await page.locator('nav').or(page.locator('text=Monaghan\'s')).or(page.locator('[class*="admin"]')).first().isVisible({ timeout: 2000 }).catch(() => false);
      
      if (adminContent) {
        loggedIn = true;
        break;
      }
    }
    
    // Check if we're still on login page - might be an error
    if (currentUrl.includes('/admin/login')) {
      // Check for error message
      const errorVisible = await page.locator('text=/error|invalid|incorrect/i').isVisible({ timeout: 500 }).catch(() => false);
      if (errorVisible) {
        const errorText = await page.locator('text=/error|invalid|incorrect/i').textContent().catch(() => '');
        throw new Error(`Login failed - error message: ${errorText}`);
      }
    }
  }
  
  if (!loggedIn) {
    // Check if we're still on login page - might have an error message
    const currentUrl = page.url();
    if (currentUrl.includes('/admin/login')) {
      // Check for error message on the page
      const errorText = await page.locator('text=/error|invalid|incorrect|failed/i').textContent({ timeout: 2000 }).catch(() => '');
      if (errorText) {
        throw new Error(`Login failed - error message: "${errorText}". Username: ${username}`);
      }
      
      // Try navigating directly to /admin to see if we're actually logged in (session might have been created)
      await page.goto('/admin');
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      const finalUrl = page.url();
      if (finalUrl.includes('/admin/login')) {
        // Still redirected to login - credentials are definitely wrong or not configured
        throw new Error(
          `Login failed - redirected back to login page.\n` +
          `Username: ${username}\n` +
          `This usually means:\n` +
          `- ADMIN_USERS env var is not set correctly on the server\n` +
          `- Password doesn't match the env var\n` +
          `- Check that .env file has ADMIN_USERS="jt:test" (or your custom credentials)\n` +
          `- Verify the dev server has restarted after changing env vars`
        );
      }
      
      // We're on an admin page - check for content
      const adminContent = await page.locator('nav').or(page.locator('text=Monaghan\'s')).first().isVisible({ timeout: 3000 }).catch(() => false);
      if (!adminContent) {
        throw new Error(`Login failed - navigated to ${finalUrl} but no admin content found`);
      }
      
      // Success - we're logged in!
      return;
    }
  }
  
  // Verify we're logged in
  const finalUrl = page.url();
  if (finalUrl.includes('/admin/login')) {
    throw new Error('Login failed - still on login page after all attempts');
  }
  
  // Success - we're logged in
}

setup('authenticate as admin', async ({ page }) => {
  // Get first admin user from env - support both ADMIN_USER and ADMIN_USERS
  const adminUsers = parseUserCredentials(process.env.ADMIN_USERS || process.env.ADMIN_USER || 'jt:test');
  if (adminUsers.length === 0) {
    throw new Error('ADMIN_USERS or ADMIN_USER must be set with at least one user');
  }
  
  const { username, password } = adminUsers[0];
  
  // Log credentials being used (username only, not password)
  console.log(`🔐 Attempting to authenticate as admin user: ${username}`);
  
  try {
    await authenticateUser(page, username, password);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to authenticate as admin:\n${errorMsg}\n\n` +
      `Troubleshooting:\n` +
      `1. Check that .env file has ADMIN_USERS="jt:test" (or your custom credentials)\n` +
      `2. Verify the dev server has the env vars (check webServer.env in playwright.config.ts)\n` +
      `3. Restart the dev server if you just changed env vars\n` +
      `4. Check server logs for authentication errors`
    );
  }
  
  // Save signed-in state
  await page.context().storageState({ path: adminAuthFile });
  console.log(`✅ Successfully authenticated as admin and saved auth state`);
});

setup('authenticate as owner', async ({ page }) => {
  // Get first owner user from env - support both OWNER_USER and OWNER_USERS
  const ownerUsers = parseUserCredentials(process.env.OWNER_USERS || process.env.OWNER_USER || 'owner:test');
  if (ownerUsers.length === 0) {
    throw new Error('OWNER_USERS or OWNER_USER must be set with at least one user');
  }
  
  const { username, password } = ownerUsers[0];
  
  // Log credentials being used (username only, not password)
  console.log(`🔐 Attempting to authenticate as owner user: ${username}`);
  
  try {
    await authenticateUser(page, username, password);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to authenticate as owner:\n${errorMsg}\n\n` +
      `Troubleshooting:\n` +
      `1. Check that .env file has OWNER_USERS="owner:test" (or your custom credentials)\n` +
      `2. Verify the dev server has the env vars (check webServer.env in playwright.config.ts)\n` +
      `3. Restart the dev server if you just changed env vars\n` +
      `4. Check server logs for authentication errors`
    );
  }
  
  // Save signed-in state
  await page.context().storageState({ path: ownerAuthFile });
  console.log(`✅ Successfully authenticated as owner and saved auth state`);
});

