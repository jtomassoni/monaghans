import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import ImageCarousel from '@/components/image-carousel';
import Footer from '@/components/footer';
import { marked } from 'marked';
import { getMountainTimeToday, getMountainTimeTomorrow, getMountainTimeWeekday, getMountainTimeNow, getMountainTimeDateString, parseMountainTimeDate } from '@/lib/timezone';
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns';
import { RRule } from 'rrule';

// Configure marked to allow HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Force dynamic rendering to prevent caching - we need fresh data for today's specials
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // Use Mountain Time for all date calculations
  const today = getMountainTimeToday();
  const tomorrowStart = getMountainTimeTomorrow();
  const now = getMountainTimeNow();

  // Fetch all active events (including recurring ones)
  const allEvents = await prisma.event.findMany({
    where: {
      isActive: true,
    },
    orderBy: { startDateTime: 'asc' },
  });

  // Helper function to get recurring event occurrences for a date range
  const getRecurringEventOccurrences = (event: any, rangeStart: Date, rangeEnd: Date) => {
    if (!event.recurrenceRule) return [];
    
    try {
      const exceptions: string[] = event.exceptions ? JSON.parse(event.exceptions) : [];
      const startDate = new Date(event.startDateTime);
      
      // Extract the original time components in Mountain Time
      // This ensures recurring events always show at the same time of day
      const mtFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const originalStartMTParts = mtFormatter.formatToParts(startDate);
      const originalHours = parseInt(originalStartMTParts.find(p => p.type === 'hour')!.value);
      const originalMinutes = parseInt(originalStartMTParts.find(p => p.type === 'minute')!.value);
      const originalSeconds = parseInt(originalStartMTParts.find(p => p.type === 'second')?.value || '0');
      
      // Extract original end time components if endDateTime exists
      let originalEndHours = 0;
      let originalEndMinutes = 0;
      let originalEndSeconds = 0;
      if (event.endDateTime) {
        const endDate = new Date(event.endDateTime);
        const originalEndMTParts = mtFormatter.formatToParts(endDate);
        originalEndHours = parseInt(originalEndMTParts.find(p => p.type === 'hour')!.value);
        originalEndMinutes = parseInt(originalEndMTParts.find(p => p.type === 'minute')!.value);
        originalEndSeconds = parseInt(originalEndMTParts.find(p => p.type === 'second')?.value || '0');
      }
      
      // Helper function to create a Date object for a specific date and time in Mountain Time
      const createMountainTimeDate = (year: number, month: number, day: number, hours: number, minutes: number, seconds: number): Date => {
        // Try different UTC offsets to find the one that gives us the desired Mountain Time
        // MT is UTC-7 (MST) or UTC-6 (MDT)
        for (let offsetHours = 6; offsetHours <= 7; offsetHours++) {
          const candidateUTC = new Date(Date.UTC(year, month, day, hours + offsetHours, minutes, seconds));
          const candidateParts = mtFormatter.formatToParts(candidateUTC);
          const candidateYear = parseInt(candidateParts.find(p => p.type === 'year')!.value);
          const candidateMonth = parseInt(candidateParts.find(p => p.type === 'month')!.value);
          const candidateDay = parseInt(candidateParts.find(p => p.type === 'day')!.value);
          const candidateHour = parseInt(candidateParts.find(p => p.type === 'hour')!.value);
          const candidateMinute = parseInt(candidateParts.find(p => p.type === 'minute')!.value);
          const candidateSecond = parseInt(candidateParts.find(p => p.type === 'second')?.value || '0');
          
          // candidateMonth is 1-indexed (1-12), month is 0-indexed (0-11)
          if (candidateYear === year && candidateMonth === month + 1 && candidateDay === day &&
              candidateHour === hours && candidateMinute === minutes && candidateSecond === seconds) {
            return candidateUTC;
          }
        }
        
        // Fallback: use UTC-7 (MST)
        return new Date(Date.UTC(year, month, day, hours + 7, minutes, seconds));
      };
      
      // Handle monthly events with BYMONTHDAY (similar to calendar logic)
      // For weekly events, we need to ensure dtstart represents the correct day of week in Mountain Time
      let ruleToUse = event.recurrenceRule;
      let dtstartDate: Date;
      
      if (event.recurrenceRule.includes('BYMONTHDAY')) {
        const monthDayMatch = event.recurrenceRule.match(/BYMONTHDAY=(\d+)/);
        if (monthDayMatch) {
          const targetDay = parseInt(monthDayMatch[1]);
          const localYear = startDate.getFullYear();
          const localMonth = startDate.getMonth();
          const localTargetMidday = new Date(localYear, localMonth, targetDay, 12, 0, 0);
          const utcMiddayDay = localTargetMidday.getUTCDate();
          const utcTargetYear = localTargetMidday.getUTCFullYear();
          const utcTargetMonth = localTargetMidday.getUTCMonth();
          const utcCorrespondingDay = utcMiddayDay;
          ruleToUse = event.recurrenceRule.replace(/BYMONTHDAY=\d+/, `BYMONTHDAY=${utcCorrespondingDay}`);
          dtstartDate = new Date(Date.UTC(utcTargetYear, utcTargetMonth, utcCorrespondingDay, 12, 0, 0));
        } else {
          dtstartDate = startDate;
        }
      } else if (event.recurrenceRule.includes('FREQ=WEEKLY')) {
        // For weekly events, ensure dtstart is on one of the days specified in BYDAY
        // Extract the target days of week from BYDAY in the RRULE
        const bydayMatch = event.recurrenceRule.match(/BYDAY=([^;]+)/);
        const dayMap: Record<string, number> = {
          'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
        };
        
        // Get the start date components in Mountain Time
        const startMTParts = mtFormatter.formatToParts(startDate);
        const startMTYear = parseInt(startMTParts.find(p => p.type === 'year')!.value);
        const startMTMonth = parseInt(startMTParts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
        const startMTDay = parseInt(startMTParts.find(p => p.type === 'day')!.value);
        
        // Get the day of the week in Mountain Time (0 = Sunday, 1 = Monday, etc.)
        const startMTDayOfWeek = new Date(startMTYear, startMTMonth, startMTDay).getDay();
        
        // Create dtstart at the original time but ensure it represents the correct day in Mountain Time
        let candidateDtstart = createMountainTimeDate(startMTYear, startMTMonth, startMTDay, originalHours, originalMinutes, originalSeconds);
        
        // If BYDAY is specified, check if the start date's day matches any of the specified days
        if (bydayMatch) {
          const bydayStr = bydayMatch[1];
          const targetDays = bydayStr.split(',').map((d: string) => dayMap[d.trim()]).filter((d: number | undefined): d is number => d !== undefined);
          
          // Check if the start date's day of week (in MT) matches any of the target days
          const startDateMatches = targetDays.includes(startMTDayOfWeek);
          
          // For weekly events, RRule uses the day of week from dtstart to determine recurrence
          // If the start date matches BYDAY, use it as dtstart
          // If not, we need to find the first occurrence that matches BYDAY on or after the start date
          if (startDateMatches) {
            // The start date already matches one of the BYDAY days, use it as-is
            dtstartDate = candidateDtstart;
          } else {
            // The start date doesn't match any of the BYDAY days
            // Find the first target day that comes on or after the start date
            const sortedTargetDays = [...targetDays].sort((a, b) => a - b);
            let targetDay = sortedTargetDays.find(d => d >= startMTDayOfWeek) || sortedTargetDays[0];
            
            // Calculate days to add to get to the target day
            let dayDiff = targetDay - startMTDayOfWeek;
            if (dayDiff < 0) dayDiff += 7; // Wrap around to next week
            
            // Adjust the date to the target day
            const adjustedDate = new Date(startMTYear, startMTMonth, startMTDay + dayDiff);
            const adjustedMTYear = adjustedDate.getFullYear();
            const adjustedMTMonth = adjustedDate.getMonth();
            const adjustedMTDay = adjustedDate.getDate();
            
            // Create dtstart on the target day with the original time
            dtstartDate = createMountainTimeDate(adjustedMTYear, adjustedMTMonth, adjustedMTDay, originalHours, originalMinutes, originalSeconds);
          }
        } else {
          // No BYDAY specified, use the start date as-is
          dtstartDate = candidateDtstart;
        }
      } else {
        dtstartDate = startDate;
      }
      
      const rule = RRule.fromString(ruleToUse);
      const ruleOptions = {
        ...rule.options,
        dtstart: dtstartDate,
      };
      const ruleWithDtstart = new RRule(ruleOptions);
      
      const searchStart = startDate > rangeStart ? startDate : rangeStart;
      const occurrences = ruleWithDtstart.between(searchStart, rangeEnd, true);
      
      // Filter out exceptions and create event objects for each occurrence
      return occurrences
        .filter(occurrence => {
          const occurrenceDateStr = format(occurrence, 'yyyy-MM-dd');
          return !exceptions.includes(occurrenceDateStr);
        })
        .map(occurrence => {
          // Get the occurrence date components in Mountain Time
          const occurrenceMTParts = mtFormatter.formatToParts(occurrence);
          const occurrenceMTYear = parseInt(occurrenceMTParts.find(p => p.type === 'year')!.value);
          const occurrenceMTMonth = parseInt(occurrenceMTParts.find(p => p.type === 'month')!.value);
          const occurrenceMTDay = parseInt(occurrenceMTParts.find(p => p.type === 'day')!.value);
          
          // For monthly events with BYMONTHDAY, RRule returns UTC dates
          // We need to ensure these display correctly in local time
          // If the target day and occurrence day don't match in local time, adjust
          let eventStart: Date;
          if (event.recurrenceRule && event.recurrenceRule.includes('BYMONTHDAY')) {
            const monthDayMatch = event.recurrenceRule.match(/BYMONTHDAY=(\d+)/);
            if (monthDayMatch) {
              const targetDay = parseInt(monthDayMatch[1]); // This is the original local day from RRULE
              const occurrenceLocalDay = occurrence.getDate(); // What day the occurrence shows in local time
              
              // If RRule returned a date that displays as a different day in local time,
              // we need to adjust it to match the target day
              if (occurrenceLocalDay !== targetDay) {
                // Use the target day with the original time in Mountain Time
                eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, targetDay, originalHours, originalMinutes, originalSeconds);
              } else {
                // Use the occurrence date but preserve the original time in Mountain Time
                eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds);
              }
            } else {
              // Use the occurrence date but preserve the original time in Mountain Time
              eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds);
            }
          } else if (event.recurrenceRule && event.recurrenceRule.includes('FREQ=WEEKLY')) {
            // For weekly events, ensure the occurrence appears on the correct day of week in Mountain Time
            // Get the target days of week from BYDAY
            const bydayMatch = event.recurrenceRule.match(/BYDAY=([^;]+)/);
            const dayMap: Record<string, number> = {
              'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
            };
            
            // Check what day of week the occurrence represents in Mountain Time
            const occurrenceMTDayOfWeek = new Date(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay).getDay();
            
            // If BYDAY is specified, check if the occurrence's day matches any of the specified days
            if (bydayMatch) {
              const bydayStr = bydayMatch[1];
              const targetDays = bydayStr.split(',').map((d: string) => dayMap[d.trim()]).filter((d: number | undefined): d is number => d !== undefined);
              
              // Check if the occurrence's day of week matches any of the target days
              if (targetDays.includes(occurrenceMTDayOfWeek)) {
                // The occurrence is on one of the target days, use it as-is
                eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds);
              } else {
                // The occurrence is not on a target day (timezone issue), find the nearest target day
                const sortedTargetDays = [...targetDays].sort((a, b) => a - b);
                let targetDay = sortedTargetDays.find(d => d >= occurrenceMTDayOfWeek) || sortedTargetDays[0];
                
                // Calculate days to add to get to the target day
                let dayDiff = targetDay - occurrenceMTDayOfWeek;
                if (dayDiff < 0) dayDiff += 7; // Wrap around to next week
                
                const adjustedDay = occurrenceMTDay + dayDiff;
                eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, adjustedDay, originalHours, originalMinutes, originalSeconds);
              }
            } else {
              // No BYDAY specified, use the occurrence date as-is
              eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds);
            }
          } else {
            // For other recurring events, use the occurrence date
            // but preserve the original time components in Mountain Time
            eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds);
          }
          
          // Calculate end time by preserving the time from the original event in Mountain Time
          let eventEnd: Date | null = null;
          if (event.endDateTime) {
            eventEnd = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalEndHours, originalEndMinutes, originalEndSeconds);
          }
          
          return {
            ...event,
            startDateTime: eventStart.toISOString(),
            endDateTime: eventEnd?.toISOString() || null,
            isRecurringOccurrence: true,
          };
        });
    } catch (e) {
      // If RRule parsing fails, return empty array
      return [];
    }
  };

  // Get today's events (one-time events + recurring occurrences)
  // IMPORTANT: We show ALL events for today, not just the first one
  const todaysOneTimeEvents = allEvents.filter(event => {
    if (event.recurrenceRule) return false; // Skip recurring events here
    const eventDate = new Date(event.startDateTime);
    // Include any event that starts today (between today midnight and tomorrow midnight in Mountain Time)
    return eventDate >= today && eventDate < tomorrowStart;
  });

  const todaysRecurringOccurrences = allEvents
    .filter(event => event.recurrenceRule)
    .flatMap(event => getRecurringEventOccurrences(event, today, tomorrowStart));

  // Combine all events for today and sort by start time
  // This will include multiple events if there are multiple events scheduled for the same day
  const todaysEvents = [...todaysOneTimeEvents, ...todaysRecurringOccurrences]
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

  // Get upcoming events (one-time events + recurring occurrences, starting from now)
  const futureDate = new Date(now);
  futureDate.setMonth(futureDate.getMonth() + 3); // Look ahead 3 months for recurring events

  const upcomingOneTimeEvents = allEvents.filter(event => {
    if (event.recurrenceRule) return false;
    const eventDate = new Date(event.startDateTime);
    return eventDate >= now;
  });

  const upcomingRecurringOccurrences = allEvents
    .filter(event => event.recurrenceRule)
    .flatMap(event => getRecurringEventOccurrences(event, now, futureDate));

  const upcomingEvents = [...upcomingOneTimeEvents, ...upcomingRecurringOccurrences]
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    .slice(0, 3);

  // Fetch published announcements (most recent first)
  // First check total count to enforce 3-announcement limit
  const totalPublishedAnnouncements = await prisma.announcement.count({
    where: {
      isPublished: true,
      AND: [
        {
          OR: [
            { publishAt: null },
            { publishAt: { lte: now } },
          ],
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ] as any,
        },
      ],
    },
  });

  // Throw error if more than 3 announcements are published
  if (totalPublishedAnnouncements > 3) {
    throw new Error(
      `Too many published announcements (${totalPublishedAnnouncements}). Maximum of 3 announcements can be published at once. Please unpublish or expire some announcements.`
    );
  }

  const publishedAnnouncements = await prisma.announcement.findMany({
    where: {
      isPublished: true,
      AND: [
        {
          OR: [
            { publishAt: null },
            { publishAt: { lte: now } },
          ],
        },
        {
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ] as any,
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 3, // Show up to 3 announcements
  });

  const hoursSetting = await prisma.setting.findUnique({
    where: { key: 'hours' },
  });

  const contactSetting = await prisma.setting.findUnique({
    where: { key: 'contact' },
  });

  const happyHourSetting = await prisma.setting.findUnique({
    where: { key: 'happyHour' },
  });

  const heroSetting = await prisma.setting.findUnique({
    where: { key: 'homepageHero' },
  });

  const aboutSetting = await prisma.setting.findUnique({
    where: { key: 'homepageAbout' },
  });

  const gallerySetting = await prisma.setting.findUnique({
    where: { key: 'homepageGallery' },
  });

  // Fetch today's specials using Mountain Time
  const todayName = getMountainTimeWeekday();
  const todayStart = getMountainTimeToday();

  // Get today's food specials (date-based or weekly recurring)
  // Collect ALL matching food specials, not just the first one
  const allFoodSpecials = await prisma.special.findMany({
    where: {
      isActive: true,
      type: 'food',
    },
  });

  const todaysFoodSpecials: typeof allFoodSpecials = [];
  for (const special of allFoodSpecials) {
    // Parse appliesOn if it exists
    let appliesOn: string[] = [];
    try {
      if (special.appliesOn) {
        appliesOn = typeof special.appliesOn === 'string' 
          ? JSON.parse(special.appliesOn) 
          : special.appliesOn;
        if (!Array.isArray(appliesOn)) {
          appliesOn = [];
        }
        // Normalize day names (trim whitespace, ensure proper case)
        appliesOn = appliesOn.map(day => day.trim()).filter(day => day.length > 0);
      }
    } catch {
      // Invalid JSON, skip
      appliesOn = [];
    }

    // Parse dates as Mountain Time dates (not UTC) to prevent day shifts
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (special.startDate) {
      const startDateValue = special.startDate as string | Date;
      startDateStr = typeof startDateValue === 'string' 
        ? startDateValue.split('T')[0] 
        : getMountainTimeDateString(startDateValue);
    }
    
    if (special.endDate) {
      const endDateValue = special.endDate as string | Date;
      endDateStr = typeof endDateValue === 'string' 
        ? endDateValue.split('T')[0] 
        : getMountainTimeDateString(endDateValue);
    }
    
    const startDate = startDateStr ? parseMountainTimeDate(startDateStr) : null;
    const endDate = endDateStr ? parseMountainTimeDate(endDateStr) : null;

    // If weekly recurring days are set
    if (appliesOn.length > 0) {
      // Check if today matches a recurring day (case-insensitive comparison)
      const matchesDay = appliesOn.some(day => 
        day.toLowerCase() === todayName.toLowerCase()
      );
      
      if (matchesDay) {
        // Weekly recurring specials: check day match AND date range if set
        let isInDateRange = true;
        
        // Check if we're past the start date (if set)
        if (startDate) {
          const start = startOfDay(startDate);
          if (todayStart < start) {
            isInDateRange = false;
          }
        }
        
        // Check if we're before the end date (if set)
        if (endDate && isInDateRange) {
          const end = endOfDay(endDate);
          if (todayStart > end) {
            isInDateRange = false;
          }
        }
        
        if (isInDateRange) {
          todaysFoodSpecials.push(special);
        }
      }
    } else if (startDate) {
      // Date-based special (no weekly recurring)
      // If only startDate is set, treat it as a single-day special
      // If both dates are set, use the date range
      const effectiveEndDate = endDate || startDate;
      const start = startOfDay(startDate);
      const end = endOfDay(effectiveEndDate);
      
      if (todayStart >= start && todayStart <= end) {
        todaysFoodSpecials.push(special);
      }
    }
  }

  // Get today's drink special (weekly recurring or date-based)
  const allDrinkSpecials = await prisma.special.findMany({
    where: {
      isActive: true,
      type: 'drink',
    },
  });

  let todaysDrinkSpecial = null;
  for (const special of allDrinkSpecials) {
    // Parse appliesOn if it exists
    let appliesOn: string[] = [];
    try {
      if (special.appliesOn) {
        appliesOn = typeof special.appliesOn === 'string' 
          ? JSON.parse(special.appliesOn) 
          : special.appliesOn;
        if (!Array.isArray(appliesOn)) {
          appliesOn = [];
        }
        // Normalize day names (trim whitespace, ensure proper case)
        appliesOn = appliesOn.map(day => day.trim()).filter(day => day.length > 0);
      }
    } catch {
      // Invalid JSON, skip
      appliesOn = [];
    }

    // Parse dates as Mountain Time dates (not UTC) to prevent day shifts
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (special.startDate) {
      const startDateValue = special.startDate as string | Date;
      startDateStr = typeof startDateValue === 'string' 
        ? startDateValue.split('T')[0] 
        : getMountainTimeDateString(startDateValue);
    }
    
    if (special.endDate) {
      const endDateValue = special.endDate as string | Date;
      endDateStr = typeof endDateValue === 'string' 
        ? endDateValue.split('T')[0] 
        : getMountainTimeDateString(endDateValue);
    }
    
    const startDate = startDateStr ? parseMountainTimeDate(startDateStr) : null;
    const endDate = endDateStr ? parseMountainTimeDate(endDateStr) : null;

    // If weekly recurring days are set
    if (appliesOn.length > 0) {
      // Check if today matches a recurring day (case-insensitive comparison)
      const matchesDay = appliesOn.some(day => 
        day.toLowerCase() === todayName.toLowerCase()
      );
      
      if (matchesDay) {
        // Weekly recurring specials: check day match AND date range if set
        let isInDateRange = true;
        
        // Check if we're past the start date (if set)
        if (startDate) {
          const start = startOfDay(startDate);
          if (todayStart < start) {
            isInDateRange = false;
          }
        }
        
        // Check if we're before the end date (if set)
        if (endDate && isInDateRange) {
          const end = endOfDay(endDate);
          if (todayStart > end) {
            isInDateRange = false;
          }
        }
        
        if (isInDateRange) {
          todaysDrinkSpecial = special;
          break;
        }
      }
    } else if (startDate) {
      // Date-based special (no weekly recurring)
      const start = startOfDay(startDate);
      const end = endDate ? endOfDay(endDate) : start;
      
      if (todayStart >= start && todayStart <= end) {
        todaysDrinkSpecial = special;
        break;
      }
    }
  }

  let hours: any = {};
  let contact: any = {};
  let happyHour: any = {};
  let hero: any = {};
  let about: any = {};
  let gallery: any = {};
  try {
    hours = hoursSetting ? JSON.parse(hoursSetting.value) : {};
    contact = contactSetting ? JSON.parse(contactSetting.value) : {};
    happyHour = happyHourSetting ? JSON.parse(happyHourSetting.value) : {};
    hero = heroSetting ? JSON.parse(heroSetting.value) : {};
    about = aboutSetting ? JSON.parse(aboutSetting.value) : {};
    gallery = gallerySetting ? JSON.parse(gallerySetting.value) : {};
  } catch {}

  const hasHappyHour = happyHour && (happyHour.title || happyHour.description || happyHour.times);

  const formatHours = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    if (!hours || Object.keys(hours).length === 0) {
      return 'Open Daily';
    }

    // Get today's day name in Mountain Time
    const mtToday = getMountainTimeNow();
    const mtDayName = mtToday.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: 'America/Denver'
    }).toLowerCase();
    const todayDay = days.find(day => dayNames[days.indexOf(day)].toLowerCase() === mtDayName) || days[0];
    const todayHours = hours[todayDay];
    
    if (todayHours) {
      const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
      };
      return `Today: ${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
    }
    
    return 'Open Daily';
  };

  return (
    <main id="main-content" className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] scroll-smooth" role="main" aria-label="Main content">
      {/* Hero Section */}
      <section aria-label="Hero section" className="relative h-screen overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/pics/hero.png"
            alt="Monaghan's Bar and Grill"
            fill
            className="object-cover"
            priority
            unoptimized={true}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col h-full justify-center">
          {/* Compact Grid Layout for Specials, Events, and Announcements */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 max-w-6xl mx-auto w-full">
            {/* Today's Events - Recurring and Ad Hoc */}
            {todaysEvents.map((event) => {
              const isRecurring = event.recurrenceRule || (event as any).isRecurringOccurrence;
              const originalEvent = allEvents.find(e => e.id === event.id);
              const hasRecurrenceRule = originalEvent?.recurrenceRule;
              
              // Try to extract recurrence pattern for display
              let recurrenceLabel = '';
              if (hasRecurrenceRule) {
                try {
                  const rule = RRule.fromString(hasRecurrenceRule);
                  if (rule.options.freq === RRule.WEEKLY) {
                    const byday = rule.options.byweekday;
                    if (byday && Array.isArray(byday) && byday.length > 0) {
                      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const days = byday.map((d) => {
                        if (typeof d === 'number') {
                          return dayNames[d];
                        } else if (d && typeof d === 'object' && 'weekday' in d) {
                          return dayNames[(d as { weekday: number }).weekday];
                        }
                        return '';
                      }).filter(Boolean).join(', ');
                      recurrenceLabel = days ? `Every ${days}` : 'Recurring';
                    } else {
                      recurrenceLabel = 'Recurring';
                    }
                  } else if (rule.options.freq === RRule.DAILY) {
                    recurrenceLabel = 'Daily';
                  } else if (rule.options.freq === RRule.MONTHLY) {
                    recurrenceLabel = 'Monthly';
                  } else {
                    recurrenceLabel = 'Recurring';
                  }
                } catch {
                  recurrenceLabel = 'Recurring';
                }
              }
              
              return (
                <div 
                  key={`${event.id}-${event.startDateTime}`} 
                  className="group bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`p-1.5 sm:p-2 ${isRecurring ? 'bg-purple-500/40' : 'bg-purple-500/30'} rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-purple-200 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                          {isRecurring ? 'Recurring Event' : 'Today\'s Event'}
                        </span>
                        {isRecurring && (
                          <span className="px-1.5 py-0.5 bg-purple-500/30 border border-purple-400/30 rounded-full text-purple-200 text-[9px] font-medium">
                            Recurring
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 leading-tight">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-white/80 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                      <div className="space-y-1">
                        {recurrenceLabel && (
                          <div className="flex items-center gap-1.5 text-purple-200/90 text-[10px] sm:text-xs font-medium">
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>{recurrenceLabel}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-purple-200 text-[10px] sm:text-xs">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">
                            {new Date(event.startDateTime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              timeZone: 'America/Denver',
                            })}
                            {event.endDateTime &&
                              ` - ${new Date(event.endDateTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                timeZone: 'America/Denver',
                              })}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Food Specials */}
            {todaysFoodSpecials.map((special) => (
              <div key={special.id} className="group bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-orange-500/30 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-orange-200 text-[10px] sm:text-xs font-semibold uppercase tracking-wider block mb-1">
                      Food Special
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 leading-tight">
                      {special.title}
                    </h3>
                    {special.description && (
                      <p className="text-white/80 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed">
                        {special.description}
                      </p>
                    )}
                    {special.priceNotes && (
                      <p className="text-white/70 text-[10px] sm:text-xs mb-2 font-medium">
                        {special.priceNotes}
                      </p>
                    )}
                    {special.timeWindow && (
                      <div className="flex items-center gap-1.5 text-orange-200 text-[10px] sm:text-xs">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{special.timeWindow}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Drink Special */}
            {todaysDrinkSpecial && (
              <div className="group bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-blue-500/30 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-blue-200 text-[10px] sm:text-xs font-semibold uppercase tracking-wider block mb-1">
                      Drink Special
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 leading-tight">
                      {todaysDrinkSpecial.title}
                    </h3>
                    {todaysDrinkSpecial.description && (
                      <p className="text-white/80 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed">
                        {todaysDrinkSpecial.description}
                      </p>
                    )}
                    {todaysDrinkSpecial.priceNotes && (
                      <p className="text-white/70 text-[10px] sm:text-xs mb-2 font-medium">
                        {todaysDrinkSpecial.priceNotes}
                      </p>
                    )}
                    {todaysDrinkSpecial.timeWindow && (
                      <div className="flex items-center gap-1.5 text-blue-200 text-[10px] sm:text-xs">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{todaysDrinkSpecial.timeWindow}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Announcements */}
            {publishedAnnouncements.map((announcement) => (
              <div key={announcement.id} className="group bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-red-500/30 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-red-200 text-[10px] sm:text-xs font-semibold uppercase tracking-wider block mb-1">
                      Announcement
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 leading-tight">
                      {announcement.title}
                    </h3>
                    {announcement.body && (
                      <div className="text-white/80 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed prose prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: marked.parse(announcement.body) }} />
                    )}
                    {announcement.ctaText && announcement.ctaUrl && (
                      <Link href={announcement.ctaUrl} className="inline-block mt-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg text-red-200 text-[10px] sm:text-xs font-semibold transition-all hover:scale-105">
                        {announcement.ctaText}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Happy Hour */}
            {hasHappyHour && (
              <div className="group bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-green-500/30 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-green-200 text-[10px] sm:text-xs font-semibold uppercase tracking-wider block mb-1">
                      Always Available
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 leading-tight">
                      {happyHour.title || 'Buy One Get One'}
                    </h3>
                    {happyHour.description && (
                      <p className="text-white/80 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed">
                        {happyHour.description}
                      </p>
                    )}
                    {happyHour.details && (
                      <p className="text-white/70 text-[10px] sm:text-xs mb-2 font-medium">
                        {happyHour.details}
                      </p>
                    )}
                    {happyHour.times && (
                      <div className="flex items-center gap-1.5 text-green-200 text-[10px] sm:text-xs">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{happyHour.times}</span>
                        <span className="text-green-200/70">• Every Day</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Call to Action Buttons */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-6xl mx-auto w-full">
            <div
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-semibold transition-all shadow-lg bg-gray-600/50 cursor-not-allowed opacity-75 sm:w-auto"
              title="Online ordering coming soon"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Order Online
              <span className="text-xs ml-1">(Coming Soon)</span>
            </div>
            <Link
              href="/menu"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-white/30 px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-semibold transition-all hover:scale-105 bg-white/10 backdrop-blur-sm hover:border-white/50 hover:bg-white/20 sm:w-auto"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              View Menu
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" aria-label="About section" className="py-20 md:py-32 px-4 bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-black dark:via-gray-900 dark:to-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-bold mb-4 text-gray-900 dark:text-white">{about.title || "A Neighborhood Institution"}</h2>
            <div className="w-24 h-1 bg-[var(--color-accent)] mx-auto mb-8"></div>
          </div>
          
          <div className="space-y-6 text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
            {about.paragraph1 ? (
              <p>
                {about.paragraph1}
              </p>
            ) : (
              <p>
                Since 1892, Monaghan&apos;s has been the heart of the Sheridan neighborhood—Denver&apos;s second-oldest bar and a true local landmark. For over 130 years, we&apos;ve been where neighbors gather, stories are shared, and traditions are made.
              </p>
            )}
            
            {about.paragraph2Title ? (
              <p className="text-gray-900 dark:text-white font-semibold">
                {about.paragraph2Title}
              </p>
            ) : (
              <p className="text-gray-900 dark:text-white font-semibold">
                A Woman-Owned Legacy
              </p>
            )}
            
            {about.paragraph2 ? (
              <p>
                {about.paragraph2}
              </p>
            ) : (
              <p>
                After over a decade of dedicated service behind the bar, our owner purchased Monaghan&apos;s, continuing a legacy of community, hospitality, and genuine neighborhood spirit. We&apos;re proud to carry forward the traditions that make this place special.
              </p>
            )}
            
            {about.paragraph3 ? (
              <p>
                {about.paragraph3}
              </p>
            ) : (
              <p>
                From our famous Green Chili to our daily BOGO Happy Hour, from catching the game to enjoying live music, Monaghan&apos;s is where great food, cold drinks, and warm community come together.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Gallery Carousel */}
      <section id="gallery" aria-label="Gallery section" className="py-16 md:py-24 px-3 sm:px-4 md:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-center text-gray-900 dark:text-white">{gallery.title || "Inside Monaghan's"}</h2>
          <ImageCarousel />
        </div>
      </section>

      {/* Events Section */}
      <section id="events" aria-label="Events section" className="py-16 md:py-24 px-3 sm:px-4 md:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">Upcoming Events</h2>
            <div className="w-24 h-1 bg-[var(--color-accent)] mx-auto mb-8"></div>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-300 dark:border-gray-800 rounded-xl p-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No upcoming events</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm">Check back soon for updates!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <div
                  key={`${event.id}-${event.startDateTime}`}
                  className="bg-white dark:bg-gray-900/60 backdrop-blur-sm border border-gray-300 dark:border-gray-800 rounded-xl p-6 shadow-sm dark:shadow-none"
                >
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{event.title}</h3>
                  {event.description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed text-sm">{event.description}</p>
                  )}
                  
                  <div className="space-y-2 pt-4 border-t border-gray-300 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">
                        {new Date(event.startDateTime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          timeZone: 'America/Denver',
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">
                        {new Date(event.startDateTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZone: 'America/Denver',
                        })}
                        {event.endDateTime &&
                          ` - ${new Date(event.endDateTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZone: 'America/Denver',
                          })}`}
                      </span>
                    </div>
                    
                    {event.venueArea && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">{event.venueArea}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              href="/events"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer"
            >
              <span>View All Events</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
