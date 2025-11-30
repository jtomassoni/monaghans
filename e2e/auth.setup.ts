import { test as setup, expect } from '@playwright/test';
import path from 'path';

const superadminAuthFile = path.join(__dirname, '../.auth/superadmin.json');
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
  
  // Wait for submit button to be enabled
  await page.waitForSelector('button[type="submit"]:not([disabled])');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to admin dashboard
  await page.waitForURL('/admin', { timeout: 30000 });
  
  // Verify we're logged in by checking for admin navigation
  await expect(page.locator('text=Monaghan\'s')).toBeVisible({ timeout: 10000 });
}

setup('authenticate as superadmin', async ({ page }) => {
  // Get first superadmin user from env (default: jt:test)
  const superadminUsers = parseUserCredentials(process.env.SUPERADMIN_USERS || 'jt:test');
  if (superadminUsers.length === 0) {
    throw new Error('SUPERADMIN_USERS must be set with at least one user');
  }
  
  const { username, password } = superadminUsers[0];
  await authenticateUser(page, username, password);
  
  // Save signed-in state
  await page.context().storageState({ path: superadminAuthFile });
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

