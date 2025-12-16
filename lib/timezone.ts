/**
 * Timezone utilities for company timezone (defaults to Mountain Time - America/Denver)
 * 
 * The company timezone can be configured in Admin Settings (/admin/settings).
 * Currently, these functions use 'America/Denver' as the default, but the setting
 * is stored in the database and can be retrieved using getCompanyTimezone().
 * 
 * Note: Most functions here are synchronous and use the hardcoded default.
 * For server-side code that needs the configured timezone, use getCompanyTimezone().
 * 
 * CRITICAL: All date/time operations should use these utilities to ensure consistency
 * across different server timezones (Vercel UTC vs local dev) and client timezones.
 */

const DEFAULT_TIMEZONE = 'America/Denver';

/**
 * Get the company timezone from settings
 * Falls back to 'America/Denver' if not set
 * This should be called server-side only (uses Prisma)
 */
export async function getCompanyTimezone(): Promise<string> {
  try {
    const { prisma } = await import('@/lib/prisma');
    const setting = await prisma.setting.findUnique({
      where: { key: 'timezone' },
    });
    if (setting?.value) {
      return setting.value;
    }
  } catch (error) {
    // If Prisma is not available (client-side), fall back to default
    console.warn('Could not fetch timezone setting, using default');
  }
  return DEFAULT_TIMEZONE;
}

/**
 * Get the company timezone synchronously (for client-side use)
 * Uses the default timezone. For server-side, use getCompanyTimezone() instead.
 */
export function getCompanyTimezoneSync(): string {
  return DEFAULT_TIMEZONE; // Default, can be overridden by settings
}

/**
 * Helper to get timezone-aware formatter for the company timezone
 */
function getCompanyTimezoneFormatter(timezone: string = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Parse a datetime-local string (YYYY-MM-DDTHH:mm) as company timezone
 * This is critical for forms where users input dates/times that should be
 * interpreted in the company timezone, not the browser's local timezone.
 * 
 * @param datetimeLocal - String in format "YYYY-MM-DDTHH:mm" (no timezone info)
 * @param timezone - Company timezone (defaults to America/Denver)
 * @returns Date object in UTC representing the datetime in company timezone
 */
export function parseDateTimeLocalAsCompanyTimezone(
  datetimeLocal: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  if (!datetimeLocal) {
    throw new Error('datetimeLocal string is required');
  }

  const [datePart, timePart] = datetimeLocal.split('T');
  if (!datePart) {
    throw new Error('Invalid datetime-local format');
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const [hours = 0, minutes = 0] = (timePart || '00:00').split(':').map(Number);

  const formatter = getCompanyTimezoneFormatter(timezone);

  // Try different UTC offsets to find which one gives us the desired company timezone time
  // Most timezones have offsets between -12 and +14, but we'll try a reasonable range
  // For Mountain Time: UTC-7 (MST) or UTC-6 (MDT)
  // We'll try offsets from -8 to +8 hours (covering most common timezones)
  for (let offsetHours = -8; offsetHours <= 8; offsetHours++) {
    const candidateUTC = new Date(Date.UTC(year, month - 1, day, hours - offsetHours, minutes, 0));
    
    const parts = formatter.formatToParts(candidateUTC);
    const candidateYear = parseInt(parts.find(p => p.type === 'year')!.value);
    const candidateMonth = parseInt(parts.find(p => p.type === 'month')!.value);
    const candidateDay = parseInt(parts.find(p => p.type === 'day')!.value);
    const candidateHour = parseInt(parts.find(p => p.type === 'hour')!.value);
    const candidateMinute = parseInt(parts.find(p => p.type === 'minute')!.value);
    
    // candidateMonth is 1-indexed (1-12), month is 0-indexed (0-11)
    if (candidateYear === year && candidateMonth === month && candidateDay === day &&
        candidateHour === hours && candidateMinute === minutes) {
      return candidateUTC;
    }
  }

  // Fallback: Use a more sophisticated approach
  // Create a date at noon in the target timezone to determine DST
  const testDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const tzInfo = testDate.toLocaleString('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  });

  // Try to extract offset from timezone name or use a reasonable default
  // This is a fallback, so we'll use a conservative approach
  // For most US timezones, we can try common offsets
  const commonOffsets = timezone.includes('America') 
    ? [7, 6, 8, 5, 9, 4] // Common US timezone offsets
    : [0, 1, -1, 2, -2, 3, -3]; // Common offsets for other regions

  for (const offsetHours of commonOffsets) {
    const candidateUTC = new Date(Date.UTC(year, month - 1, day, hours - offsetHours, minutes, 0));
    const parts = formatter.formatToParts(candidateUTC);
    const candidateYear = parseInt(parts.find(p => p.type === 'year')!.value);
    const candidateMonth = parseInt(parts.find(p => p.type === 'month')!.value);
    const candidateDay = parseInt(parts.find(p => p.type === 'day')!.value);
    const candidateHour = parseInt(parts.find(p => p.type === 'hour')!.value);
    const candidateMinute = parseInt(parts.find(p => p.type === 'minute')!.value);
    
    if (candidateYear === year && candidateMonth === month && candidateDay === day &&
        candidateHour === hours && candidateMinute === minutes) {
      return candidateUTC;
    }
  }

  // Last resort: Use a simple offset calculation (not ideal but better than error)
  // For Mountain Time, default to UTC-7
  const defaultOffset = timezone === 'America/Denver' ? 7 : 0;
  return new Date(Date.UTC(year, month - 1, day, hours - defaultOffset, minutes, 0));
}

/**
 * Convert a UTC Date to datetime-local string in company timezone
 * Used for displaying dates in forms (datetime-local input format)
 * 
 * @param date - Date object (in UTC)
 * @param timezone - Company timezone (defaults to America/Denver)
 * @returns String in format "YYYY-MM-DDTHH:mm"
 */
export function formatDateAsDateTimeLocal(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const formatter = getCompanyTimezoneFormatter(timezone);
  const parts = formatter.formatToParts(date);
  
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  const hour = parts.find(p => p.type === 'hour')!.value;
  const minute = parts.find(p => p.type === 'minute')!.value;
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Get today's date in Mountain Time (start of day, 00:00:00)
 * Returns a Date object representing today at midnight in Mountain Time
 * This function works correctly regardless of the server's timezone (UTC or local)
 * 
 * @deprecated Use getCompanyTimezoneToday() for better timezone support
 */
export function getMountainTimeToday(): Date {
  return getCompanyTimezoneToday();
}

/**
 * Get today's date in company timezone (start of day, 00:00:00)
 * Returns a Date object representing today at midnight in company timezone
 * This function works correctly regardless of the server's timezone (UTC or local)
 * 
 * @param timezone - Company timezone (defaults to America/Denver)
 */
export function getCompanyTimezoneToday(timezone: string = DEFAULT_TIMEZONE): Date {
  // Get the current time - this is always in UTC internally
  const now = new Date();
  
  // Get the current date components in company timezone
  // This ensures we get the correct day even if the server is in UTC
  const formatter = getCompanyTimezoneFormatter(timezone);
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')!.value);
  
  // Now find what UTC time corresponds to company timezone midnight for this date
  // Try different UTC offsets to find which one gives us midnight in company timezone
  for (let offsetHours = -12; offsetHours <= 14; offsetHours++) {
    const candidate = new Date(Date.UTC(year, month, day, -offsetHours, 0, 0));
    
    // Verify this candidate represents midnight in company timezone
    const tzParts = formatter.formatToParts(candidate);
    const tzYear = parseInt(tzParts.find(p => p.type === 'year')!.value);
    const tzMonth = parseInt(tzParts.find(p => p.type === 'month')!.value) - 1;
    const tzDay = parseInt(tzParts.find(p => p.type === 'day')!.value);
    const tzHour = parseInt(tzParts.find(p => p.type === 'hour')!.value);
    const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');
    const tzSecond = parseInt(tzParts.find(p => p.type === 'second')?.value || '0');
    
    // Check if this candidate represents midnight on the target date in company timezone
    if (tzYear === year && tzMonth === month && tzDay === day && 
        tzHour === 0 && tzMinute === 0 && tzSecond === 0) {
      return candidate;
    }
  }
  
  // Fallback: Use a reasonable default offset based on timezone
  // For Mountain Time, default to UTC-7 (MST)
  const defaultOffset = timezone === 'America/Denver' ? 7 : 0;
  const fallback = new Date(Date.UTC(year, month, day, defaultOffset, 0, 0));
  
  // Verify the fallback is correct
  const fallbackParts = formatter.formatToParts(fallback);
  const fallbackTZYear = parseInt(fallbackParts.find(p => p.type === 'year')!.value);
  const fallbackTZMonth = parseInt(fallbackParts.find(p => p.type === 'month')!.value) - 1;
  const fallbackTZDay = parseInt(fallbackParts.find(p => p.type === 'day')!.value);
  const fallbackTZHour = parseInt(fallbackParts.find(p => p.type === 'hour')!.value);
  
  // If fallback doesn't match, try adjacent offsets
  if (fallbackTZYear !== year || fallbackTZMonth !== month || fallbackTZDay !== day || fallbackTZHour !== 0) {
    for (const altOffset of [defaultOffset - 1, defaultOffset + 1, defaultOffset - 2, defaultOffset + 2]) {
      const altCandidate = new Date(Date.UTC(year, month, day, altOffset, 0, 0));
      const altParts = formatter.formatToParts(altCandidate);
      const altYear = parseInt(altParts.find(p => p.type === 'year')!.value);
      const altMonth = parseInt(altParts.find(p => p.type === 'month')!.value) - 1;
      const altDay = parseInt(altParts.find(p => p.type === 'day')!.value);
      const altHour = parseInt(altParts.find(p => p.type === 'hour')!.value);
      
      if (altYear === year && altMonth === month && altDay === day && altHour === 0) {
        return altCandidate;
      }
    }
  }
  
  return fallback;
}

/**
 * Get tomorrow's date in Mountain Time (start of day, 00:00:00)
 */
export function getMountainTimeTomorrow(): Date {
  const today = getMountainTimeToday();
  // Add 24 hours to get tomorrow
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  
  // Verify it's tomorrow in MT
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const todayParts = formatter.formatToParts(today);
  const tomorrowParts = formatter.formatToParts(tomorrow);
  
  const todayDay = parseInt(todayParts.find(p => p.type === 'day')!.value);
  const tomorrowDay = parseInt(tomorrowParts.find(p => p.type === 'day')!.value);
  
  // Check if it's actually tomorrow (handle month rollover)
  const todayMonth = parseInt(todayParts.find(p => p.type === 'month')!.value);
  const tomorrowMonth = parseInt(tomorrowParts.find(p => p.type === 'month')!.value);
  
  if (tomorrowDay === todayDay + 1 || 
      (tomorrowDay === 1 && todayDay > 27 && tomorrowMonth === todayMonth + 1) ||
      (tomorrowDay === 1 && todayDay > 27 && todayMonth === 12 && tomorrowMonth === 1)) {
    return tomorrow;
  }
  
  // If not, add another day
  return new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Get the current weekday name in company timezone
 * This function works correctly regardless of the server's timezone (UTC or local)
 * 
 * @param timezone - Company timezone (defaults to America/Denver)
 */
export function getMountainTimeWeekday(timezone: string = DEFAULT_TIMEZONE): string {
  return getCompanyTimezoneWeekday(timezone);
}

/**
 * Get the current weekday name in company timezone
 * This function works correctly regardless of the server's timezone (UTC or local)
 * 
 * @param timezone - Company timezone (defaults to America/Denver)
 */
export function getCompanyTimezoneWeekday(timezone: string = DEFAULT_TIMEZONE): string {
  const now = new Date();
  // Use toLocaleDateString with timeZone to ensure we get the correct day
  // even if the server is running in UTC
  return now.toLocaleDateString('en-US', { 
    weekday: 'long',
    timeZone: timezone
  });
}

/**
 * Get the current date/time in company timezone
 * Returns a Date object representing the current moment
 * Note: Date objects are always in UTC internally, this just returns current time
 */
export function getMountainTimeNow(): Date {
  return getCompanyTimezoneNow();
}

/**
 * Get the current date/time in company timezone
 * Returns a Date object representing the current moment
 * Note: Date objects are always in UTC internally, this just returns current time
 */
export function getCompanyTimezoneNow(): Date {
  return new Date();
}

/**
 * Get the date string (YYYY-MM-DD) from a Date object in company timezone
 * This prevents dates from shifting by a day due to timezone conversion
 * 
 * @param date - Date object
 * @param timezone - Company timezone (defaults to America/Denver)
 */
export function getMountainTimeDateString(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  return getCompanyTimezoneDateString(date, timezone);
}

/**
 * Get the date string (YYYY-MM-DD) from a Date object in company timezone
 * This prevents dates from shifting by a day due to timezone conversion
 * 
 * @param date - Date object
 * @param timezone - Company timezone (defaults to America/Denver)
 */
export function getCompanyTimezoneDateString(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD date string as company timezone (not UTC)
 * This prevents dates from shifting by a day due to timezone conversion
 * Returns a Date object representing midnight in company timezone for that date
 * This function works correctly regardless of the server's timezone (UTC or local)
 * 
 * @param dateStr - Date string in format "YYYY-MM-DD"
 * @param timezone - Company timezone (defaults to America/Denver)
 */
export function parseMountainTimeDate(dateStr: string, timezone: string = DEFAULT_TIMEZONE): Date {
  return parseCompanyTimezoneDate(dateStr, timezone);
}

/**
 * Parse a YYYY-MM-DD date string as company timezone (not UTC)
 * This prevents dates from shifting by a day due to timezone conversion
 * Returns a Date object representing midnight in company timezone for that date
 * This function works correctly regardless of the server's timezone (UTC or local)
 * 
 * @param dateStr - Date string in format "YYYY-MM-DD"
 * @param timezone - Company timezone (defaults to America/Denver)
 */
export function parseCompanyTimezoneDate(dateStr: string, timezone: string = DEFAULT_TIMEZONE): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Use Intl.DateTimeFormat to verify dates correctly
  const formatter = getCompanyTimezoneFormatter(timezone);
  
  // Try different UTC offsets to find which one gives us company timezone midnight
  for (let offsetHours = -12; offsetHours <= 14; offsetHours++) {
    const candidate = new Date(Date.UTC(year, month - 1, day, -offsetHours, 0, 0));
    
    // Verify this candidate represents midnight in company timezone
    const tzParts = formatter.formatToParts(candidate);
    const tzYear = parseInt(tzParts.find(p => p.type === 'year')!.value);
    const tzMonth = parseInt(tzParts.find(p => p.type === 'month')!.value) - 1;
    const tzDay = parseInt(tzParts.find(p => p.type === 'day')!.value);
    const tzHour = parseInt(tzParts.find(p => p.type === 'hour')!.value);
    const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')!.value);
    const tzSecond = parseInt(tzParts.find(p => p.type === 'second')?.value || '0');
    
    // Check if this candidate represents midnight on the target date in company timezone
    if (tzYear === year && tzMonth === month - 1 && tzDay === day && 
        tzHour === 0 && tzMinute === 0 && tzSecond === 0) {
      return candidate;
    }
  }
  
  // Fallback: Use a reasonable default offset based on timezone
  const defaultOffset = timezone === 'America/Denver' ? 7 : 0;
  const fallback = new Date(Date.UTC(year, month - 1, day, defaultOffset, 0, 0));
  
  // Verify the fallback is correct
  const fallbackParts = formatter.formatToParts(fallback);
  const fallbackTZYear = parseInt(fallbackParts.find(p => p.type === 'year')!.value);
  const fallbackTZMonth = parseInt(fallbackParts.find(p => p.type === 'month')!.value) - 1;
  const fallbackTZDay = parseInt(fallbackParts.find(p => p.type === 'day')!.value);
  const fallbackTZHour = parseInt(fallbackParts.find(p => p.type === 'hour')!.value);
  
  // If fallback doesn't match, try adjacent offsets
  if (fallbackTZYear !== year || fallbackTZMonth !== month - 1 || fallbackTZDay !== day || fallbackTZHour !== 0) {
    for (const altOffset of [defaultOffset - 1, defaultOffset + 1, defaultOffset - 2, defaultOffset + 2]) {
      const altCandidate = new Date(Date.UTC(year, month - 1, day, altOffset, 0, 0));
      const altParts = formatter.formatToParts(altCandidate);
      const altYear = parseInt(altParts.find(p => p.type === 'year')!.value);
      const altMonth = parseInt(altParts.find(p => p.type === 'month')!.value) - 1;
      const altDay = parseInt(altParts.find(p => p.type === 'day')!.value);
      const altHour = parseInt(altParts.find(p => p.type === 'hour')!.value);
      
      if (altYear === year && altMonth === month - 1 && altDay === day && altHour === 0) {
        return altCandidate;
      }
    }
  }
  
  return fallback;
}

/**
 * Compare two dates in Mountain Time to see if they represent the same day
 * Returns true if both dates fall on the same day in Mountain Time
 */
export function compareMountainTimeDates(date1: Date, date2: Date): boolean {
  return getMountainTimeDateString(date1) === getMountainTimeDateString(date2);
}

/**
 * Parse any date value (string, Date, or null) as Mountain Time
 * This ensures dates are always interpreted in the company timezone (Mountain Time)
 * regardless of where the request is coming from or what format the date is in.
 * 
 * This is critical when the same database is used by production (UTC) and local dev (various timezones).
 * 
 * @param dateValue - Can be:
 *   - A YYYY-MM-DD string (parsed as Mountain Time midnight)
 *   - An ISO string (date components extracted and interpreted as Mountain Time)
 *   - A Date object (converted to Mountain Time date string, then parsed)
 *   - null or undefined (returns null)
 * @returns Date object representing the date at midnight in Mountain Time, or null
 */
export function parseAnyDateAsMountainTime(dateValue: string | Date | null | undefined): Date | null {
  if (!dateValue) return null;
  
  // If it's already a Date object, extract the date components in Mountain Time
  if (dateValue instanceof Date) {
    const dateStr = getMountainTimeDateString(dateValue);
    return parseMountainTimeDate(dateStr);
  }
  
  // If it's a string in YYYY-MM-DD format, parse it directly
  if (typeof dateValue === 'string') {
    // Check if it's in YYYY-MM-DD format
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return parseMountainTimeDate(dateValue);
    }
    
    // If it's an ISO string or other format, extract the date part
    // First, try to parse it as a date to get the components
    const tempDate = new Date(dateValue);
    
    // Check if it's a valid date
    if (isNaN(tempDate.getTime())) {
      // If parsing failed, try to extract YYYY-MM-DD from the string
      const dateMatch = dateValue.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        return parseMountainTimeDate(dateMatch[1]);
      }
      return null;
    }
    
    // Get the date components in Mountain Time from the parsed date
    const dateStr = getMountainTimeDateString(tempDate);
    return parseMountainTimeDate(dateStr);
  }
  
  return null;
}
