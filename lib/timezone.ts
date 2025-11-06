/**
 * Timezone utilities for Mountain Time (America/Denver)
 * All date/time operations should use Mountain Time since that's where the bar is located
 */

/**
 * Get today's date in Mountain Time (start of day, 00:00:00)
 * Returns a Date object representing today at midnight in Mountain Time
 */
export function getMountainTimeToday(): Date {
  const now = new Date();
  
  // Get the current date components in Mountain Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')!.value);
  
  // Find what UTC time corresponds to MT midnight
  // MT is UTC-7 (MST) or UTC-6 (MDT), so MT midnight is UTC 7am or 6am
  // Try both offsets and check which one gives us MT midnight
  for (let offsetHours = 6; offsetHours <= 7; offsetHours++) {
    const candidate = new Date(Date.UTC(year, month, day, offsetHours, 0, 0));
    const mtCandidate = candidate.toLocaleString('en-US', { 
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const candidateParts = mtCandidate.split(', ');
    const candidateDate = candidateParts[0];
    const candidateTime = candidateParts[1];
    
    const targetDate = `${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
    
    if (candidateDate === targetDate && candidateTime === '00:00:00') {
      return candidate;
    }
  }
  
  // Fallback: use UTC-7 (MST)
  return new Date(Date.UTC(year, month, day, 7, 0, 0));
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
 */
export function getMountainTimeWeekday(): string {
  const now = new Date();
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
