/**
 * Timezone utilities for company timezone (defaults to Mountain Time - America/Denver)
 * 
 * The company timezone can be configured in Admin Settings (/admin/settings).
 * Currently, these functions use 'America/Denver' as the default, but the setting
 * is stored in the database and can be retrieved using getCompanyTimezone().
 * 
 * Note: Most functions here are synchronous and use the hardcoded default.
 * For server-side code that needs the configured timezone, use getCompanyTimezone().
 */

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
  return 'America/Denver';
}

/**
 * Get the company timezone synchronously (for client-side use)
 * Uses the default timezone. For server-side, use getCompanyTimezone() instead.
 */
export function getCompanyTimezoneSync(): string {
  return 'America/Denver'; // Default, can be overridden by settings
}

/**
 * Get today's date in Mountain Time (start of day, 00:00:00)
 * Returns a Date object representing today at midnight in Mountain Time
 * This function works correctly regardless of the server's timezone (UTC or local)
 */
export function getMountainTimeToday(): Date {
  // Get the current time - this is always in UTC internally
  const now = new Date();
  
  // Get the current date components in Mountain Time
  // This ensures we get the correct day even if the server is in UTC
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')!.value);
  
  // Now find what UTC time corresponds to MT midnight for this date
  // We need to find the UTC time that, when converted to MT, gives us 00:00:00 on this date
  // MT is UTC-7 (MST) or UTC-6 (MDT), so MT midnight is UTC 7am or 6am
  // Try both offsets and check which one gives us MT midnight
  for (let offsetHours = 6; offsetHours <= 7; offsetHours++) {
    const candidate = new Date(Date.UTC(year, month, day, offsetHours, 0, 0));
    
    // Verify this candidate represents midnight in Mountain Time
    const mtParts = formatter.formatToParts(candidate);
    const mtYear = parseInt(mtParts.find(p => p.type === 'year')!.value);
    const mtMonth = parseInt(mtParts.find(p => p.type === 'month')!.value) - 1;
    const mtDay = parseInt(mtParts.find(p => p.type === 'day')!.value);
    const mtHour = parseInt(mtParts.find(p => p.type === 'hour')!.value);
    const mtMinute = parseInt(mtParts.find(p => p.type === 'minute')!.value);
    const mtSecond = parseInt(mtParts.find(p => p.type === 'second')?.value || '0');
    
    // Check if this candidate represents midnight on the target date in MT
    if (mtYear === year && mtMonth === month && mtDay === day && 
        mtHour === 0 && mtMinute === 0 && mtSecond === 0) {
      return candidate;
    }
  }
  
  // Fallback: detect DST and use appropriate offset
  // Check if DST is active for this date by creating a test date at noon
  const testDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
  const mtTest = testDate.toLocaleString('en-US', {
    timeZone: 'America/Denver',
    timeZoneName: 'short'
  });
  
  // MDT is UTC-6 (daylight time), MST is UTC-7 (standard time)
  const isDST = mtTest.includes('MDT');
  const fallbackOffset = isDST ? 6 : 7;
  
  const fallback = new Date(Date.UTC(year, month, day, fallbackOffset, 0, 0));
  
  // Verify the fallback is correct
  const fallbackParts = formatter.formatToParts(fallback);
  const fallbackMTYear = parseInt(fallbackParts.find(p => p.type === 'year')!.value);
  const fallbackMTMonth = parseInt(fallbackParts.find(p => p.type === 'month')!.value) - 1;
  const fallbackMTDay = parseInt(fallbackParts.find(p => p.type === 'day')!.value);
  const fallbackMTHour = parseInt(fallbackParts.find(p => p.type === 'hour')!.value);
  
  // If fallback doesn't match, try the other offset
  if (fallbackMTYear !== year || fallbackMTMonth !== month || fallbackMTDay !== day || fallbackMTHour !== 0) {
    const altOffset = isDST ? 7 : 6;
    return new Date(Date.UTC(year, month, day, altOffset, 0, 0));
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
 * Get the current weekday name in Mountain Time
 * This function works correctly regardless of the server's timezone (UTC or local)
 */
export function getMountainTimeWeekday(): string {
  const now = new Date();
  // Use toLocaleDateString with timeZone to ensure we get the correct day
  // even if the server is running in UTC
  return now.toLocaleDateString('en-US', { 
    weekday: 'long',
    timeZone: 'America/Denver'
  });
}

/**
 * Get the current date/time in Mountain Time
 * Returns a Date object representing the current moment
 */
export function getMountainTimeNow(): Date {
  return new Date();
}

/**
 * Get the date string (YYYY-MM-DD) from a Date object in Mountain Time
 * This prevents dates from shifting by a day due to timezone conversion
 */
export function getMountainTimeDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
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
 * Parse a YYYY-MM-DD date string as Mountain Time (not UTC)
 * This prevents dates from shifting by a day due to timezone conversion
 * Returns a Date object representing midnight in Mountain Time for that date
 * This function works correctly regardless of the server's timezone (UTC or local)
 */
export function parseMountainTimeDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Use Intl.DateTimeFormat to verify dates correctly
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Try different UTC hours to find which one gives us MT midnight
  for (let offsetHours = 6; offsetHours <= 7; offsetHours++) {
    const candidate = new Date(Date.UTC(year, month - 1, day, offsetHours, 0, 0));
    
    // Verify this candidate represents midnight in Mountain Time
    const mtParts = formatter.formatToParts(candidate);
    const mtYear = parseInt(mtParts.find(p => p.type === 'year')!.value);
    const mtMonth = parseInt(mtParts.find(p => p.type === 'month')!.value) - 1;
    const mtDay = parseInt(mtParts.find(p => p.type === 'day')!.value);
    const mtHour = parseInt(mtParts.find(p => p.type === 'hour')!.value);
    const mtMinute = parseInt(mtParts.find(p => p.type === 'minute')!.value);
    const mtSecond = parseInt(mtParts.find(p => p.type === 'second')?.value || '0');
    
    // Check if this candidate represents midnight on the target date in MT
    if (mtYear === year && mtMonth === month - 1 && mtDay === day && 
        mtHour === 0 && mtMinute === 0 && mtSecond === 0) {
      return candidate;
    }
  }
  
  // Fallback: detect DST and use appropriate offset
  // Check if DST is active for this date by creating a test date at noon
  const testDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const mtTest = testDate.toLocaleString('en-US', {
    timeZone: 'America/Denver',
    timeZoneName: 'short'
  });
  
  // MDT is UTC-6 (daylight time), MST is UTC-7 (standard time)
  const isDST = mtTest.includes('MDT');
  const fallbackOffset = isDST ? 6 : 7;
  
  const fallback = new Date(Date.UTC(year, month - 1, day, fallbackOffset, 0, 0));
  
  // Verify the fallback is correct
  const fallbackParts = formatter.formatToParts(fallback);
  const fallbackMTYear = parseInt(fallbackParts.find(p => p.type === 'year')!.value);
  const fallbackMTMonth = parseInt(fallbackParts.find(p => p.type === 'month')!.value) - 1;
  const fallbackMTDay = parseInt(fallbackParts.find(p => p.type === 'day')!.value);
  const fallbackMTHour = parseInt(fallbackParts.find(p => p.type === 'hour')!.value);
  
  // If fallback doesn't match, try the other offset
  if (fallbackMTYear !== year || fallbackMTMonth !== month - 1 || fallbackMTDay !== day || fallbackMTHour !== 0) {
    const altOffset = isDST ? 7 : 6;
    return new Date(Date.UTC(year, month - 1, day, altOffset, 0, 0));
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
