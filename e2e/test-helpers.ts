/**
 * Shared test utilities for e2e tests
 * These helpers ensure consistent test data creation and common operations
 */

import { resetDatabaseToSeedState } from './db-reset';

// Track which test files have already reset the database
// Using a Map to track by worker to handle parallel execution
const resetFiles = new Map<number, Set<string>>();

/**
 * Reset database to seed state once per test file
 * 
 * This should be called in a beforeEach hook at the file level
 * to ensure each test spec starts with a clean database state.
 * 
 * The function tracks which files have already reset, so it's safe
 * to call it in every beforeEach - it will only actually reset once per file.
 * 
 * Note: This function extracts the file path from the call stack, which works
 * but is less reliable than using the fixture approach. Prefer using the
 * `test` and `expect` from `./fixtures` instead.
 * 
 * Example usage:
 * ```typescript
 * test.beforeEach(async () => {
 *   await resetDatabaseOncePerFile();
 * });
 * ```
 */
export async function resetDatabaseOncePerFile(workerIndex: number = 0) {
  // Extract file path from call stack
  const callStack = new Error().stack;
  const fileMatch = callStack?.match(/at.*\(.*\/([^\/]+\.spec\.ts)/);
  const filePath = fileMatch ? fileMatch[1] : 'unknown';
  
  // Get or create the set for this worker
  if (!resetFiles.has(workerIndex)) {
    resetFiles.set(workerIndex, new Set());
  }
  const workerResetFiles = resetFiles.get(workerIndex)!;
  
  // Only reset once per file per worker
  if (!workerResetFiles.has(filePath)) {
    await resetDatabaseToSeedState(true); // Silent mode to reduce noise
    workerResetFiles.add(filePath);
  }
}

/**
 * Format date in YYYY-MM-DDTHH:mm format for datetime-local inputs
 * Uses Mountain Time timezone
 */
export function formatDateTimeLocal(date: Date, timeZone: string = 'America/Denver'): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  const hour = parts.find(p => p.type === 'hour')!.value;
  const minute = parts.find(p => p.type === 'minute')!.value;
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Format date in YYYY-MM-DD format for date inputs
 * Uses Mountain Time timezone
 */
export function formatDateLocal(date: Date, timeZone: string = 'America/Denver'): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Get a date N days from now in Mountain Time
 */
export function getDateNDaysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Get next occurrence of a specific weekday (0=Sunday, 1=Monday, etc.)
 */
export function getNextWeekday(weekday: number): Date {
  const date = new Date();
  const day = date.getDay();
  const diff = (weekday - day + 7) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date;
}

/**
 * Get next Monday
 */
export function getNextMonday(): Date {
  return getNextWeekday(1);
}

/**
 * Get next Wednesday
 */
export function getNextWednesday(): Date {
  return getNextWeekday(3);
}

/**
 * Get next Friday
 */
export function getNextFriday(): Date {
  return getNextWeekday(5);
}

/**
 * Wait for element to be visible with timeout
 */
export async function waitForElement(
  page: any,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if element exists
 */
export async function elementExists(page: any, selector: string): Promise<boolean> {
  const count = await page.locator(selector).count();
  return count > 0;
}

/**
 * Fill form field safely (only if exists)
 */
export async function fillIfExists(
  page: any,
  selector: string,
  value: string
): Promise<boolean> {
  if (await elementExists(page, selector)) {
    await page.locator(selector).first().fill(value);
    return true;
  }
  return false;
}

/**
 * Click element safely (only if exists)
 */
export async function clickIfExists(
  page: any,
  selector: string
): Promise<boolean> {
  if (await elementExists(page, selector)) {
    await page.locator(selector).first().click();
    return true;
  }
  return false;
}

/**
 * Wait for network to be idle (no pending requests)
 * More deterministic than waitForTimeout
 * 
 * @throws Error with context if network doesn't become idle
 */
export async function waitForNetworkIdle(
  page: any,
  timeout: number = 5000,
  context?: string
): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (error) {
    // If networkidle times out, wait a bit more for any pending requests
    await page.waitForTimeout(500);
    
    // Check if still not idle
    try {
      await page.waitForLoadState('networkidle', { timeout: 1000 });
    } catch {
      const url = page.url();
      throw new Error(
        `❌ Network did not become idle after ${timeout}ms${context ? ` (${context})` : ''}\n` +
        `   URL: ${url}\n` +
        `   This usually means:\n` +
        `   - API requests are still pending\n` +
        `   - Background polling is active\n` +
        `   - Network timeout is too short\n` +
        `   Check network tab in browser devtools or increase timeout`
      );
    }
  }
}

/**
 * Wait for success message (toast or notification) to appear
 * Tries multiple selectors and patterns
 * 
 * @throws Error with context if success message is not found
 */
export async function waitForSuccessMessage(
  page: any,
  timeout: number = 5000,
  context?: string
): Promise<boolean> {
  const selectors = [
    '.bg-green-900', // Primary toast selector (most specific)
    '.bg-green-800',
    '[class*="bg-green"]',
    '[role="alert"]',
    '[class*="toast"]',
  ];

  const triedSelectors: string[] = [];

  // First try the specific green toast selector with filter
  for (const selector of selectors) {
    triedSelectors.push(selector);
    try {
      // Try with filter first (more specific)
      const locator = page.locator(selector).filter({ hasText: /success|created|saved|updated/i });
      await locator.waitFor({ state: 'visible', timeout: Math.min(timeout, 3000) });
      return true;
    } catch (error) {
      // Try without filter (less specific, but might catch it)
      try {
        const locator = page.locator(selector);
        const visible = await locator.isVisible({ timeout: 1000 }).catch(() => false);
        if (visible) {
          // Check if it has success text
          const text = await locator.textContent().catch(() => '');
          if (/success|created|saved|updated/i.test(text)) {
            return true;
          }
        }
      } catch {
        // Continue to next selector
      }
    }
  }

  // Fallback: wait for any text matching success pattern anywhere on page
  triedSelectors.push('text=/success|created|saved|updated/i');
  try {
    const textLocator = page.locator('text=/success|created|saved|updated/i');
    await textLocator.waitFor({ state: 'visible', timeout: Math.min(timeout, 2000) });
    return true;
  } catch {
    // Generate helpful error message for CI
    const url = page.url();
    const pageTitle = await page.title().catch(() => 'unknown');
    const errorMsg = `❌ Success message not found after ${timeout}ms${context ? ` (${context})` : ''}\n` +
      `   URL: ${url}\n` +
      `   Page title: ${pageTitle}\n` +
      `   Tried selectors: ${triedSelectors.join(', ')}\n` +
      `   This usually means:\n` +
      `   - Form submission failed silently\n` +
      `   - Success toast didn't appear\n` +
      `   - Network request is still pending\n` +
      `   Check screenshot/video for visual context`;
    
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Wait for form submission to complete
 * Waits for network idle and checks for success/error messages
 * 
 * @throws Error with context if form submission fails
 */
export async function waitForFormSubmission(
  page: any,
  options: {
    waitForNetworkIdle?: boolean;
    waitForSuccess?: boolean;
    waitForModalClose?: boolean;
    timeout?: number;
    context?: string;
  } = {}
): Promise<boolean> {
  const {
    waitForNetworkIdle: waitNetwork = true,
    waitForSuccess: waitSuccess = true,
    waitForModalClose: waitModal = false,
    timeout = 5000,
    context = 'form submission',
  } = options;

  const startTime = Date.now();

  // Wait for network to settle
  if (waitNetwork) {
    try {
      await waitForNetworkIdle(page, timeout);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const url = page.url();
      throw new Error(
        `❌ Network did not become idle after ${elapsed}ms during ${context}\n` +
        `   URL: ${url}\n` +
        `   This usually means:\n` +
        `   - API request is hanging\n` +
        `   - Background requests are still pending\n` +
        `   - Network timeout is too short\n` +
        `   Check network tab in browser devtools`
      );
    }
  }

  // Wait for modal to close if it was open
  if (waitModal) {
    try {
      await page.waitForSelector('[role="dialog"]', { 
        state: 'hidden', 
        timeout: Math.min(timeout, 3000) 
      }).catch(() => {});
    } catch {
      // Modal might not have been open - not a failure
    }
  }

  // Wait for success message
  if (waitSuccess) {
    try {
      return await waitForSuccessMessage(page, timeout, context);
    } catch (error) {
      // Re-throw with additional context
      const elapsed = Date.now() - startTime;
      const url = page.url();
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `❌ Form submission failed: ${context}\n` +
        `   Time elapsed: ${elapsed}ms\n` +
        `   URL: ${url}\n` +
        `   ${errorMessage}\n` +
        `   Check screenshot/video for visual context`
      );
    }
  }

  return true;
}

/**
 * Wait for element to appear with retries
 * More reliable than single waitForSelector
 */
export async function waitForElementWithRetry(
  page: any,
  selector: string,
  options: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<boolean> {
  const {
    timeout = 5000,
    retries = 3,
    retryDelay = 500,
  } = options;

  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector(selector, { 
        state: 'visible', 
        timeout: Math.floor(timeout / retries) 
      });
      return true;
    } catch {
      if (i < retries - 1) {
        await page.waitForTimeout(retryDelay);
      }
    }
  }

  return false;
}

/**
 * Ensure seed data exists for tests that depend on it
 * This helps with test isolation when tests run in parallel
 */
export async function ensureSeedDataExists(
  page: any,
  type: 'announcement' | 'event',
  minCount: number = 1
): Promise<boolean> {
  try {
    // Navigate to the admin page for the type
    const url = type === 'announcement' ? '/admin/announcements' : '/admin/events';
    await page.goto(url);
    await waitForNetworkIdle(page, 5000);

    // Wait a bit for data to load
    await page.waitForTimeout(1000);

    // Check if we have enough items
    // For announcements, look for cards or list items
    // For events, look for event items
    const selector = type === 'announcement' 
      ? '.group\\/item, [class*="bg-white"][class*="rounded-lg"], [class*="bg-gray-800"][class*="rounded-lg"]'
      : '[class*="event"], [data-testid*="event"], tr, .event-item';

    const count = await page.locator(selector).count();
    
    if (count < minCount) {
      console.warn(`⚠️  Only found ${count} ${type}(s), expected at least ${minCount}. Test may be flaky.`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Failed to check seed data for ${type}:`, error);
    return false;
  }
}

/**
 * Capture console errors and network failures for better CI debugging
 * Call this at the start of a test to capture errors
 */
export function captureErrors(page: any): {
  consoleErrors: string[];
  networkFailures: Array<{ url: string; status: number; method: string }>;
  clear: () => void;
} {
  const consoleErrors: string[] = [];
  const networkFailures: Array<{ url: string; status: number; method: string }> = [];

  // Capture console errors
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Capture network failures
  page.on('response', (response: any) => {
    if (response.status() >= 400) {
      networkFailures.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      });
    }
  });

  return {
    consoleErrors,
    networkFailures,
    clear: () => {
      consoleErrors.length = 0;
      networkFailures.length = 0;
    },
  };
}

/**
 * Format captured errors for CI output
 */
export function formatErrorsForCI(
  consoleErrors: string[],
  networkFailures: Array<{ url: string; status: number; method: string }>
): string {
  let output = '';

  if (consoleErrors.length > 0) {
    output += `\n❌ Console Errors (${consoleErrors.length}):\n`;
    consoleErrors.forEach((error, i) => {
      output += `   ${i + 1}. ${error}\n`;
    });
  }

  if (networkFailures.length > 0) {
    output += `\n❌ Network Failures (${networkFailures.length}):\n`;
    networkFailures.forEach((failure, i) => {
      output += `   ${i + 1}. ${failure.method} ${failure.url} → ${failure.status}\n`;
    });
  }

  return output;
}

/**
 * Generate unique test identifier
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Test cleanup utilities
 * These functions use API requests to clean up test data
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

/**
 * Get authentication cookie from storage state
 */
async function getAuthCookie(storageState: string): Promise<string | null> {
  try {
    const fs = require('fs');
    const path = require('path');
    const statePath = path.resolve(process.cwd(), storageState);
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      const cookies = state.cookies || [];
      const authCookie = cookies.find((c: any) => c.name === 'next-auth.session-token' || c.name === '__Secure-next-auth.session-token');
      return authCookie ? `${authCookie.name}=${authCookie.value}` : null;
    }
  } catch (error) {
    console.error('Failed to get auth cookie:', error);
  }
  return null;
}

/**
 * Make authenticated API request
 */
async function apiRequest(
  method: string,
  endpoint: string,
  storageState: string = '.auth/admin.json',
  body?: any
): Promise<Response> {
  const cookie = await getAuthCookie(storageState);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetch(`${BASE_URL}${endpoint}`, options);
}

/**
 * Delete an announcement by ID
 */
export async function cleanupAnnouncement(id: string, storageState: string = '.auth/admin.json'): Promise<boolean> {
  try {
    const response = await apiRequest('DELETE', `/api/announcements/${id}`, storageState);
    return response.ok;
  } catch (error) {
    console.error(`Failed to cleanup announcement ${id}:`, error);
    return false;
  }
}

/**
 * Delete an event by ID
 */
export async function cleanupEvent(id: string, storageState: string = '.auth/admin.json'): Promise<boolean> {
  try {
    const response = await apiRequest('DELETE', `/api/events/${id}`, storageState);
    return response.ok;
  } catch (error) {
    console.error(`Failed to cleanup event ${id}:`, error);
    return false;
  }
}

/**
 * Delete a special by ID
 */
export async function cleanupSpecial(id: string, storageState: string = '.auth/admin.json'): Promise<boolean> {
  try {
    const response = await apiRequest('DELETE', `/api/specials/${id}`, storageState);
    return response.ok;
  } catch (error) {
    console.error(`Failed to cleanup special ${id}:`, error);
    return false;
  }
}

/**
 * Delete a menu item by ID
 */
export async function cleanupMenuItem(id: string, storageState: string = '.auth/admin.json'): Promise<boolean> {
  try {
    const response = await apiRequest('DELETE', `/api/menu-items/${id}`, storageState);
    return response.ok;
  } catch (error) {
    console.error(`Failed to cleanup menu item ${id}:`, error);
    return false;
  }
}

/**
 * Delete a menu section by ID
 */
export async function cleanupMenuSection(id: string, storageState: string = '.auth/admin.json'): Promise<boolean> {
  try {
    const response = await apiRequest('DELETE', `/api/menu-sections/${id}`, storageState);
    return response.ok;
  } catch (error) {
    console.error(`Failed to cleanup menu section ${id}:`, error);
    return false;
  }
}


/**
 * Find and cleanup test entities by title prefix
 */
export async function cleanupByTitlePrefix(
  type: 'announcement' | 'event' | 'special' | 'menuSection' | 'menuItem',
  titlePrefix: string,
  storageState: string = '.auth/admin.json'
): Promise<number> {
  try {
    const cookie = await getAuthCookie(storageState);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    // Determine API endpoint based on type
    let endpoint: string;
    if (type === 'special') {
      endpoint = '/api/specials';
    } else if (type === 'menuSection') {
      endpoint = '/api/menu-sections';
    } else if (type === 'menuItem') {
      endpoint = '/api/menu-items';
    } else {
      endpoint = `/api/${type}s`;
    }

    // Fetch all items
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return 0;

    const items = await response.json();
    // For menu sections/items, check 'name' field instead of 'title'
    const nameField = (type === 'menuSection' || type === 'menuItem') ? 'name' : 'title';
    const testItems = items.filter((item: any) => {
      const fieldValue = item[nameField];
      // Handle empty prefix - match items that start with common test prefixes
      if (!titlePrefix || titlePrefix.trim() === '') {
        return fieldValue && (
          fieldValue.startsWith('Test ') ||
          fieldValue.startsWith('E2E Test ') ||
          fieldValue.startsWith('test-') ||
          fieldValue.startsWith('Food TV') ||
          fieldValue.startsWith('Drink TV') ||
          fieldValue.startsWith('Food Only')
        );
      }
      return fieldValue && fieldValue.startsWith(titlePrefix);
    });

    // Delete all test items
    const deletePromises = testItems.map((item: any) => {
      if (type === 'announcement') return cleanupAnnouncement(item.id, storageState);
      if (type === 'event') return cleanupEvent(item.id, storageState);
      if (type === 'special') return cleanupSpecial(item.id, storageState);
      if (type === 'menuSection') return cleanupMenuSection(item.id, storageState);
      if (type === 'menuItem') return cleanupMenuItem(item.id, storageState);
      return Promise.resolve(false);
    });

    const results = await Promise.allSettled(deletePromises);
    return results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  } catch (error) {
    console.error(`Failed to cleanup ${type}s by prefix:`, error);
    return 0;
  }
}

/**
 * Set up automatic tracking for API responses
 * Call this at the start of a test to automatically track created entities
 */
export function setupAutoTracking(page: any, tracker: TestDataTracker) {
  page.on('response', async (response: any) => {
    const url = response.url();
    const method = response.request().method();
    
    if (method === 'POST' && response.ok) {
      try {
        const data = await response.json();
        if (data.id) {
          if (url.includes('/api/events')) {
            tracker.trackEvent(data.id);
          } else if (url.includes('/api/specials')) {
            tracker.trackSpecial(data.id);
          } else if (url.includes('/api/announcements')) {
            tracker.trackAnnouncement(data.id);
          } else if (url.includes('/api/menu-items')) {
            tracker.trackMenuItem(data.id);
          } else if (url.includes('/api/menu-sections')) {
            tracker.trackMenuSection(data.id);
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  });
}

/**
 * Test data tracker - tracks created entities for cleanup
 * 
 * OPTIMIZATION NOTE: Most tests should follow natural workflows (create → use → delete),
 * which means they clean themselves up. TestDataTracker is primarily a safety net for:
 * 
 * 1. Tests that fail before cleanup runs
 * 2. Tests that only create (don't test delete workflow)
 * 3. Edge cases where deletion isn't part of the test workflow
 * 
 * Best practice: Structure tests to follow natural workflows when possible.
 * Use TestDataTracker as a safety net, not the primary cleanup mechanism.
 */
export class TestDataTracker {
  private announcements: string[] = [];
  private events: string[] = [];
  private specials: string[] = [];
  private menuItems: string[] = [];
  private menuSections: string[] = [];
  private storageState: string;
  private testPrefix: string;

  constructor(storageState: string = '.auth/admin.json', testPrefix: string = 'Test ') {
    this.storageState = storageState;
    this.testPrefix = testPrefix;
  }

  trackAnnouncement(id: string) {
    this.announcements.push(id);
  }

  trackEvent(id: string) {
    this.events.push(id);
  }

  trackSpecial(id: string) {
    this.specials.push(id);
  }

  trackMenuItem(id: string) {
    this.menuItems.push(id);
  }

  trackMenuSection(id: string) {
    this.menuSections.push(id);
  }

  /**
   * Clean up all tracked entities
   * 
   * This is a safety net - ideally tests clean up as part of their workflow.
   * This ensures cleanup even if:
   * - Test fails before natural cleanup
   * - Test only creates (doesn't test delete)
   * - Test runs in parallel and can't share cleanup state
   */
  async cleanup(): Promise<void> {
    // Clean up in reverse order to handle dependencies
    const promises: Promise<boolean>[] = [];

    // Clean up menu items first (they depend on sections)
    for (const id of this.menuItems) {
      promises.push(cleanupMenuItem(id, this.storageState));
    }

    // Then menu sections
    for (const id of this.menuSections) {
      promises.push(cleanupMenuSection(id, this.storageState));
    }

    // Then other entities
    for (const id of this.announcements) {
      promises.push(cleanupAnnouncement(id, this.storageState));
    }

    for (const id of this.events) {
      promises.push(cleanupEvent(id, this.storageState));
    }

    for (const id of this.specials) {
      promises.push(cleanupSpecial(id, this.storageState));
    }

    await Promise.allSettled(promises);

    // Also cleanup by title prefix as a fallback (only if prefix is not empty)
    if (this.testPrefix && this.testPrefix.trim() !== '') {
      await cleanupByTitlePrefix('announcement', this.testPrefix, this.storageState);
      await cleanupByTitlePrefix('event', this.testPrefix, this.storageState);
      await cleanupByTitlePrefix('special', this.testPrefix, this.storageState);
      await cleanupByTitlePrefix('menuSection', this.testPrefix, this.storageState);
      await cleanupByTitlePrefix('menuItem', this.testPrefix, this.storageState);
    }

    // Clear tracked IDs
    this.announcements = [];
    this.events = [];
    this.specials = [];
    this.menuItems = [];
    this.menuSections = [];
  }
}
