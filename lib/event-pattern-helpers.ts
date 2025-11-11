/**
 * Helper functions for extracting and working with event patterns
 * Used for calendar duplication and pattern tracking
 */

export interface EventPattern {
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  weekOfMonth?: number; // 1-5 (first, second, third, fourth, last)
  monthDay?: number; // 1-31
  patternMetadata?: {
    frequency: 'weekly' | 'monthly';
    days?: string[]; // For weekly: ["Monday", "Wednesday"]
    monthDay?: number; // For monthly: specific day of month
  };
}

/**
 * Extract pattern information from an event's start date and recurrence rule
 */
export function extractEventPattern(
  startDateTime: Date,
  recurrenceRule: string | null | undefined
): EventPattern | null {
  if (!recurrenceRule) {
    return null; // No pattern for one-time events
  }

  const pattern: EventPattern = {};

  // Parse RRULE
  const freqMatch = recurrenceRule.match(/FREQ=(\w+)/);
  const frequency = freqMatch ? freqMatch[1].toLowerCase() : null;

  if (frequency === 'weekly') {
    // Extract days of week from BYDAY
    const daysMatch = recurrenceRule.match(/BYDAY=([^;]+)/);
    if (daysMatch) {
      const dayMap: Record<string, string> = {
        'MO': 'Monday',
        'TU': 'Tuesday',
        'WE': 'Wednesday',
        'TH': 'Thursday',
        'FR': 'Friday',
        'SA': 'Saturday',
        'SU': 'Sunday',
      };
      const days = daysMatch[1]
        .split(',')
        .map((d) => dayMap[d.trim()] || '')
        .filter(Boolean);

      pattern.patternMetadata = {
        frequency: 'weekly',
        days,
      };

      // For weekly events, store the day of week from the start date
      // This represents the primary day if multiple days are selected
      pattern.dayOfWeek = startDateTime.getDay();
    }
  } else if (frequency === 'monthly') {
    // Check for BYMONTHDAY (specific day of month)
    const monthDayMatch = recurrenceRule.match(/BYMONTHDAY=(\d+)/);
    if (monthDayMatch) {
      const day = parseInt(monthDayMatch[1]);
      pattern.monthDay = day;
      pattern.patternMetadata = {
        frequency: 'monthly',
        monthDay: day,
      };
    } else {
      // Check for BYDAY (nth weekday of month, e.g., "2MO" = second Monday)
      const bydayMatch = recurrenceRule.match(/BYDAY=([^;]+)/);
      if (bydayMatch) {
        const byday = bydayMatch[1].trim();
        // Parse format like "2MO" (second Monday) or "MO" (every Monday)
        const nthMatch = byday.match(/^(-?\d+)?([A-Z]{2})$/);
        if (nthMatch) {
          const nth = nthMatch[1] ? parseInt(nthMatch[1]) : null;
          const dayAbbr = nthMatch[2];

          const dayMap: Record<string, number> = {
            'SU': 0,
            'MO': 1,
            'TU': 2,
            'WE': 3,
            'TH': 4,
            'FR': 5,
            'SA': 6,
          };

          pattern.dayOfWeek = dayMap[dayAbbr];
          if (nth !== null) {
            // Convert -1 to 5 (last), 1-4 to 1-4
            pattern.weekOfMonth = nth === -1 ? 5 : nth;
          } else {
            // Every occurrence of that weekday
            pattern.weekOfMonth = undefined;
          }

          pattern.patternMetadata = {
            frequency: 'monthly',
          };
        }
      }
    }
  }

  return Object.keys(pattern).length > 0 ? pattern : null;
}

/**
 * Calculate the week of month (1-5) for a given date
 * 1 = first week, 2 = second week, 3 = third week, 4 = fourth week, 5 = last week
 */
export function getWeekOfMonth(date: Date): number {
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // Find the first occurrence of this day of week in the month
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstOfMonth.getDay();

  // Calculate offset to first occurrence of this weekday
  let offset = (dayOfWeek - firstDayOfWeek + 7) % 7;
  if (offset === 0 && firstDayOfWeek !== dayOfWeek) {
    offset = 7;
  }

  // Calculate which occurrence this is (1-based)
  const weekNumber = Math.floor((day - offset) / 7) + 1;

  // Check if this is the last occurrence
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const lastDay = lastOfMonth.getDate();
  const lastDayOfWeek = lastOfMonth.getDay();

  // Find the last occurrence of this weekday
  let lastOccurrenceDay = lastDay;
  while (lastOccurrenceDay > 0) {
    const testDate = new Date(date.getFullYear(), date.getMonth(), lastOccurrenceDay);
    if (testDate.getDay() === dayOfWeek) {
      break;
    }
    lastOccurrenceDay--;
  }

  // If this is the last occurrence, return 5
  if (day >= lastOccurrenceDay - 6) {
    // Check if this day is within the last week's range
    const daysFromLast = lastOccurrenceDay - day;
    if (daysFromLast >= 0 && daysFromLast < 7) {
      return 5; // Last week
    }
  }

  return Math.min(weekNumber, 4); // Cap at 4, 5 is reserved for last
}

/**
 * Generate dates for a pattern in a given year
 */
export function generateDatesForPattern(
  pattern: EventPattern,
  year: number,
  startMonth?: number,
  endMonth?: number
): Date[] {
  const dates: Date[] = [];
  const startM = startMonth !== undefined ? startMonth : 0;
  const endM = endMonth !== undefined ? endMonth : 11;

  if (pattern.patternMetadata?.frequency === 'weekly') {
    // Weekly pattern
    const days = pattern.patternMetadata.days || [];
    const dayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    for (let month = startM; month <= endM; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
        if (days.includes(dayName)) {
          dates.push(date);
        }
      }
    }
  } else if (pattern.patternMetadata?.frequency === 'monthly') {
    // Monthly pattern
    if (pattern.monthDay) {
      // Specific day of month (e.g., 15th of every month)
      for (let month = startM; month <= endM; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const day = Math.min(pattern.monthDay, daysInMonth);
        dates.push(new Date(year, month, day));
      }
    } else if (pattern.dayOfWeek !== undefined && pattern.weekOfMonth) {
      // Nth weekday of month (e.g., second Monday)
      for (let month = startM; month <= endM; month++) {
        const date = getNthWeekdayOfMonth(year, month, pattern.dayOfWeek, pattern.weekOfMonth);
        if (date) {
          dates.push(date);
        }
      }
    } else if (pattern.dayOfWeek !== undefined) {
      // Every occurrence of a weekday (e.g., every Monday)
      for (let month = startM; month <= endM; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          if (date.getDay() === pattern.dayOfWeek) {
            dates.push(date);
          }
        }
      }
    }
  }

  return dates;
}

/**
 * Get the nth occurrence of a weekday in a month
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  weekOfMonth: number
): Date | null {
  if (weekOfMonth === 5) {
    // Last occurrence
    const lastDay = new Date(year, month + 1, 0);
    let day = lastDay.getDate();
    while (day > 0) {
      const date = new Date(year, month, day);
      if (date.getDay() === dayOfWeek) {
        return date;
      }
      day--;
    }
  } else {
    // First through fourth occurrence
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    let offset = (dayOfWeek - firstDayOfWeek + 7) % 7;
    if (offset === 0 && firstDayOfWeek !== dayOfWeek) {
      offset = 7;
    }
    const targetDay = 1 + offset + (weekOfMonth - 1) * 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    if (targetDay <= daysInMonth) {
      return new Date(year, month, targetDay);
    }
  }
  return null;
}

