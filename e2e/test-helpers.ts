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


