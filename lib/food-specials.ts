/**
 * Shared logic for determining when a food special is active.
 *
 * Food specials can recur in two ways:
 *  1. Weekly recurrence via `appliesOn` (a JSON array of weekday names,
 *     e.g. ["Tuesday"] for Taco Tuesday). Optionally constrained to a
 *     start/end date range.
 *  2. A one-off date or date range via `startDate`/`endDate`.
 *
 * Historically each surface (homepage, /menu, /order, admin calendar,
 * specials-tv) reimplemented this check slightly differently, which caused
 * recurring food specials to appear on the calendar/homepage but NOT on the
 * marketing ordering pages. This module is the single source of truth so all
 * surfaces stay consistent.
 *
 * The helpers are pure (no Prisma / server-only imports) so they can be used
 * in both server components and the client-side admin calendar.
 */

import { getCompanyTimezoneDateString } from '@/lib/timezone';

export interface FoodSpecialRecurrence {
  /** JSON array string or already-parsed array of weekday names. */
  appliesOn?: string | string[] | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

/**
 * Parse the `appliesOn` field into a normalized array of weekday names.
 * Tolerates JSON strings, already-parsed arrays, malformed values, and
 * stray whitespace/casing.
 */
export function parseAppliesOn(appliesOn: string | string[] | null | undefined): string[] {
  if (!appliesOn) return [];

  let parsed: unknown = appliesOn;
  if (typeof appliesOn === 'string') {
    try {
      parsed = JSON.parse(appliesOn);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((day): day is string => typeof day === 'string')
    .map((day) => day.trim())
    .filter((day) => day.length > 0);
}

/**
 * Convert a date value (string or Date) to a company-timezone YYYY-MM-DD
 * string, or null. ISO/Date values are interpreted in the company timezone to
 * avoid day-shift bugs.
 */
function toDateString(value: string | Date | null | undefined, timezone?: string): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    // Already a YYYY-MM-DD or an ISO timestamp – take the date portion.
    return value.split('T')[0];
  }
  return getCompanyTimezoneDateString(value, timezone);
}

/**
 * Get the long weekday name (e.g. "Tuesday") for a YYYY-MM-DD calendar date.
 * Computed independently of timezone since the calendar date is unambiguous.
 */
function weekdayForDateString(dateStr: string): string {
  // Anchor at noon UTC so the weekday is stable regardless of runtime tz.
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
}

/**
 * Determine whether a food special should be shown on a given calendar date.
 *
 * @param special - The special's recurrence fields.
 * @param date - The date to test (any moment; interpreted in company tz).
 * @param timezone - Optional company timezone override.
 */
export function isFoodSpecialActiveOnDate(
  special: FoodSpecialRecurrence,
  date: Date,
  timezone?: string
): boolean {
  const dateStr = getCompanyTimezoneDateString(date, timezone);
  const startStr = toDateString(special.startDate, timezone);
  const endStr = toDateString(special.endDate, timezone);
  const appliesOn = parseAppliesOn(special.appliesOn);

  // Weekly recurring special (optionally bounded by a date range).
  if (appliesOn.length > 0) {
    const weekday = weekdayForDateString(dateStr);
    const matchesDay = appliesOn.some((day) => day.toLowerCase() === weekday.toLowerCase());
    if (!matchesDay) return false;

    if (startStr && dateStr < startStr) return false;
    if (endStr && dateStr > endStr) return false;
    return true;
  }

  // Date-based special: single day (startDate only) or a date range.
  if (startStr) {
    const effectiveEnd = endStr || startStr;
    return dateStr >= startStr && dateStr <= effectiveEnd;
  }

  return false;
}
