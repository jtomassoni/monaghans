/**
 * Shared test utilities for e2e tests
 * These helpers ensure consistent test data creation and common operations
 */

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
 * Delete a user by ID (only non-admin users)
 */
export async function cleanupUser(id: string, storageState: string = '.auth/admin.json'): Promise<boolean> {
  try {
    const response = await apiRequest('DELETE', `/api/users/${id}`, storageState);
    return response.ok;
  } catch (error) {
    console.error(`Failed to cleanup user ${id}:`, error);
    return false;
  }
}

/**
 * Find and cleanup test entities by title prefix
 */
export async function cleanupByTitlePrefix(
  type: 'announcement' | 'event' | 'special',
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

    // Fetch all items
    const response = await fetch(`${BASE_URL}/api/${type === 'special' ? 'specials' : `${type}s`}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return 0;

    const items = await response.json();
    const testItems = items.filter((item: any) => 
      item.title && item.title.startsWith(titlePrefix)
    );

    // Delete all test items
    const deletePromises = testItems.map((item: any) => {
      if (type === 'announcement') return cleanupAnnouncement(item.id, storageState);
      if (type === 'event') return cleanupEvent(item.id, storageState);
      if (type === 'special') return cleanupSpecial(item.id, storageState);
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
 * Test data tracker - tracks created entities for cleanup
 */
export class TestDataTracker {
  private announcements: string[] = [];
  private events: string[] = [];
  private specials: string[] = [];
  private menuItems: string[] = [];
  private menuSections: string[] = [];
  private users: string[] = [];
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

  trackUser(id: string) {
    this.users.push(id);
  }

  /**
   * Clean up all tracked entities
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

    for (const id of this.users) {
      promises.push(cleanupUser(id, this.storageState));
    }

    await Promise.allSettled(promises);

    // Also cleanup by title prefix as a fallback
    await cleanupByTitlePrefix('announcement', this.testPrefix, this.storageState);
    await cleanupByTitlePrefix('event', this.testPrefix, this.storageState);
    await cleanupByTitlePrefix('special', this.testPrefix, this.storageState);

    // Clear tracked IDs
    this.announcements = [];
    this.events = [];
    this.specials = [];
    this.menuItems = [];
    this.menuSections = [];
    this.users = [];
  }
}





