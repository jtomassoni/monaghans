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
  
  // Wait for the button's loading state to complete (button becomes enabled again or page navigates)
  // The form sets loading=true when submitting, then loading=false when done
  try {
    // Wait for either: button becomes enabled again (loading finished) OR navigation happens
    await Promise.race([
      page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 10000 }).catch(() => null),
      page.waitForURL(url => !url.includes('/admin/login'), { timeout: 10000 }).catch(() => null),
    ]);
  } catch (e) {
    // Ignore - we'll check the result below
  }
  
  // Check for error message (appears if authentication failed)
  const errorVisible = await page.locator('text=/error|invalid|incorrect|failed/i').isVisible({ timeout: 2000 }).catch(() => false);
  if (errorVisible) {
    const errorText = await page.locator('text=/error|invalid|incorrect|failed/i').textContent().catch(() => 'Unknown error');
    throw new Error(`Login failed - error message: "${errorText}". Username: ${username}`);
  }
  
  // Check if we navigated away from login page
  const currentUrl = page.url();
  if (!currentUrl.includes('/admin/login')) {
    // Successfully navigated - verify we're on an admin page
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const adminContent = await page.locator('nav').or(page.locator('text=Monaghan\'s')).or(page.locator('[class*="admin"]')).first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!adminContent) {
      throw new Error(`Login failed - navigated to ${currentUrl} but no admin content found`);
    }
    // Success - we're logged in!
    return;
  }
  
  // Still on login page - check for error message one more time
  const errorText = await page.locator('text=/error|invalid|incorrect|failed/i').textContent({ timeout: 2000 }).catch(() => '');
  if (errorText) {
    throw new Error(`Login failed - error message: "${errorText}". Username: ${username}`);
  }
  
  // No error message and still on login page - try navigating directly to check if session was created
  if (currentUrl.includes('/admin/login')) {
    
    // Try navigating directly to /admin to see if we're actually logged in (session might have been created)
    await page.goto('/admin');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    
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
  
  // Should not reach here, but if we do, authentication failed
  throw new Error('Login failed - still on login page after all attempts');
}

setup('authenticate as admin', async ({ page }) => {
  // Get first admin user from env - prefer TEST_ADMIN_USERS for tests, then ADMIN_USERS, then ADMIN_USER
  const adminUsersEnv = process.env.TEST_ADMIN_USERS || process.env.ADMIN_USERS || process.env.ADMIN_USER || 'jt:test';
  const adminUsers = parseUserCredentials(adminUsersEnv);
  
  // Debug: Log what we're using
  console.log(`🔍 Auth Debug Info:`);
  console.log(`   ADMIN_USERS env var: ${process.env.ADMIN_USERS ? 'SET' : 'NOT SET'}`);
  console.log(`   ADMIN_USER env var: ${process.env.ADMIN_USER ? 'SET' : 'NOT SET'}`);
  console.log(`   Using value: ${adminUsersEnv.substring(0, 20)}...`);
  console.log(`   Parsed ${adminUsers.length} admin user(s)`);
  
  if (adminUsers.length === 0) {
    throw new Error(
      `ADMIN_USERS or ADMIN_USER must be set with at least one user.\n` +
      `Current value: ${adminUsersEnv}\n` +
      `Please set ADMIN_USERS="jt:test" in your .env file or environment variables.`
    );
  }
  
  const { username, password } = adminUsers[0];
  
  // Log credentials being used (username only, not password)
  console.log(`🔐 Attempting to authenticate as admin user: ${username}`);
  
  try {
    await authenticateUser(page, username, password);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Try to check if the server can see the env vars by hitting a test endpoint
    let serverEnvInfo = 'Unable to check server environment';
    try {
      const testRes = await page.request.get('/api/test-env');
      if (testRes.ok()) {
        const testData = await testRes.json();
        serverEnvInfo = `Server ADMIN_USERS: ${testData.ADMIN_USERS || 'NOT SET'}`;
      }
    } catch (e) {
      // Ignore errors checking test endpoint
    }
    
    throw new Error(
      `Failed to authenticate as admin:\n${errorMsg}\n\n` +
      `Debug Info:\n` +
      `  Test process ADMIN_USERS: ${process.env.ADMIN_USERS || 'NOT SET'}\n` +
      `  ${serverEnvInfo}\n` +
      `  Username attempted: ${username}\n\n` +
      `Troubleshooting:\n` +
      `1. Check that .env file has ADMIN_USERS="jt:test" (or your custom credentials)\n` +
      `2. Verify the dev server has the env vars (check webServer.env in playwright.config.ts)\n` +
      `3. Restart the dev server if you just changed env vars\n` +
      `4. Check server logs for authentication errors\n` +
      `5. Ensure the web server process has access to ADMIN_USERS environment variable`
    );
  }
  
  // Save signed-in state
  await page.context().storageState({ path: adminAuthFile });
  console.log(`✅ Successfully authenticated as admin and saved auth state`);
});

setup('authenticate as owner', async ({ page }) => {
  // Get first owner user from env - prefer TEST_OWNER_USERS for tests, then OWNER_USERS, then OWNER_USER
  const ownerUsersEnv = process.env.TEST_OWNER_USERS || process.env.OWNER_USERS || process.env.OWNER_USER || 'owner:test';
  const ownerUsers = parseUserCredentials(ownerUsersEnv);
  
  // Debug: Log what we're using
  console.log(`🔍 Owner Auth Debug Info:`);
  console.log(`   OWNER_USERS env var: ${process.env.OWNER_USERS ? 'SET' : 'NOT SET'}`);
  console.log(`   OWNER_USER env var: ${process.env.OWNER_USER ? 'SET' : 'NOT SET'}`);
  console.log(`   Using value: ${ownerUsersEnv.substring(0, 20)}...`);
  console.log(`   Parsed ${ownerUsers.length} owner user(s)`);
  
  if (ownerUsers.length === 0) {
    throw new Error(
      `OWNER_USERS or OWNER_USER must be set with at least one user.\n` +
      `Current value: ${ownerUsersEnv}\n` +
      `Please set OWNER_USERS="owner:test" in your .env file or environment variables.`
    );
  }
  
  const { username, password } = ownerUsers[0];
  
  // Log credentials being used (username only, not password)
  console.log(`🔐 Attempting to authenticate as owner user: ${username}`);
  
  try {
    await authenticateUser(page, username, password);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    // Try to check if the server can see the env vars by hitting a test endpoint
    let serverEnvInfo = 'Unable to check server environment';
    try {
      const testRes = await page.request.get('/api/test-env');
      if (testRes.ok()) {
        const testData = await testRes.json();
        serverEnvInfo = `Server OWNER_USERS: ${testData.OWNER_USERS || 'NOT SET'}`;
      }
    } catch (e) {
      // Ignore errors checking test endpoint
    }
    
    throw new Error(
      `Failed to authenticate as owner:\n${errorMsg}\n\n` +
      `Debug Info:\n` +
      `  Test process OWNER_USERS: ${process.env.OWNER_USERS || 'NOT SET'}\n` +
      `  ${serverEnvInfo}\n` +
      `  Username attempted: ${username}\n\n` +
      `Troubleshooting:\n` +
      `1. Check that .env file has OWNER_USERS="owner:test" (or your custom credentials)\n` +
      `2. Verify the dev server has the env vars (check webServer.env in playwright.config.ts)\n` +
      `3. Restart the dev server if you just changed env vars\n` +
      `4. Check server logs for authentication errors\n` +
      `5. Ensure the web server process has access to OWNER_USERS environment variable`
    );
  }
  
  // Save signed-in state
  await page.context().storageState({ path: ownerAuthFile });
  console.log(`✅ Successfully authenticated as owner and saved auth state`);
});

