import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import ImageCarousel from '@/components/image-carousel';
import Footer from '@/components/footer';
import AnnouncementsHandler from '@/components/announcements-handler';
import HeroImage from '@/components/hero-image';
import { marked } from 'marked';
import { getMountainTimeToday, getMountainTimeTomorrow, getMountainTimeWeekday, getMountainTimeNow, getMountainTimeDateString, parseMountainTimeDate } from '@/lib/timezone';
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns';
import { RRule } from 'rrule';
import { FaCalendarAlt, FaUtensils, FaBeer } from 'react-icons/fa';

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
            recurrenceRule: event.recurrenceRule, // Preserve recurrenceRule for consistent display
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
    .flatMap(event => getRecurringEventOccurrences(event, now, futureDate))
    .filter(occurrence => {
      // Filter to only include occurrences that are now or in the future
      const occurrenceDate = new Date(occurrence.startDateTime);
      return occurrenceDate >= now;
    });

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
  const todayDateStr = getMountainTimeDateString(todayStart);

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
        
        // Check if we're past the start date (if set) - use Date comparison
        if (startDate) {
          if (today < startOfDay(startDate)) {
            isInDateRange = false;
          }
        }
        
        // Check if we're before the end date (if set) - use Date comparison
        if (endDate && isInDateRange) {
          if (today > endOfDay(endDate)) {
            isInDateRange = false;
          }
        }
        
        if (isInDateRange) {
          todaysFoodSpecials.push(special);
        }
      }
    } else if (startDateStr && startDate) {
      // Date-based special (no weekly recurring)
      // Use Date objects with startOfDay/endOfDay for accurate comparison (same as menu page)
      const effectiveEndDate = endDate || startDate;
      const start = startOfDay(startDate);
      const end = endOfDay(effectiveEndDate);
      
      // Check if today is within the date range
      if (today >= start && today <= end) {
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
        
        // Check if we're past the start date (if set) - use Date comparison
        if (startDate) {
          if (today < startOfDay(startDate)) {
            isInDateRange = false;
          }
        }
        
        // Check if we're before the end date (if set) - use Date comparison
        if (endDate && isInDateRange) {
          if (today > endOfDay(endDate)) {
            isInDateRange = false;
          }
        }
        
        if (isInDateRange) {
          todaysDrinkSpecial = special;
          break;
        }
      }
    } else if (startDateStr && startDate) {
      // Date-based special (no weekly recurring)
      // Use Date objects with startOfDay/endOfDay for accurate comparison (same as menu page)
      const effectiveEndDate = endDate || startDate;
      const start = startOfDay(startDate);
      const end = endOfDay(effectiveEndDate);
      
      // Check if today is within the date range
      if (today >= start && today <= end) {
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
  
  // Check if today is a weekday (Monday-Friday) for happy hour display
  const isWeekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(todayName);
  const shouldShowHappyHour = hasHappyHour && isWeekday;

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

  // Hero image is always the hero pic
  const getHeroImage = () => {
    return '/pics/hero.png';
  };

  // For food specials, only show the first/most relevant one to avoid clutter
  // Sort by startDate to ensure the most recent/current one shows first
  // This ensures only one food special appears in the hero at a time
  const sortedFoodSpecials = [...todaysFoodSpecials].sort((a, b) => {
    const aStartDate = a.startDate as string | Date | null;
    const bStartDate = b.startDate as string | Date | null;
    const aDate = aStartDate ? (typeof aStartDate === 'string' ? aStartDate.split('T')[0] : getMountainTimeDateString(aStartDate)) : '';
    const bDate = bStartDate ? (typeof bStartDate === 'string' ? bStartDate.split('T')[0] : getMountainTimeDateString(bStartDate)) : '';
    return bDate.localeCompare(aDate); // Most recent first
  });
  const displayFoodSpecial = sortedFoodSpecials.length > 0 ? [sortedFoodSpecials[0]] : [];
  
  // Collect all available content for dynamic display
  // Note: Announcements are shown as modals, not in the grid
  const allContent = [
    ...todaysEvents,
    ...displayFoodSpecial,
    ...(todaysDrinkSpecial ? [todaysDrinkSpecial] : []),
    ...(shouldShowHappyHour ? ['happyHour'] : []),
  ];

  // Calculate total number of items for dynamic grid layout
  const totalItems = todaysEvents.length + displayFoodSpecial.length + (todaysDrinkSpecial ? 1 : 0) + (shouldShowHappyHour ? 1 : 0);
  
  // Determine grid columns and max width based on number of items
  const getGridCols = () => {
    if (totalItems === 0) return { cols: 'grid-cols-1', maxWidth: 'max-w-6xl' };
    if (totalItems === 1) return { cols: 'grid-cols-1', maxWidth: 'max-w-md' };
    if (totalItems === 2) return { cols: 'grid-cols-1 md:grid-cols-2', maxWidth: 'max-w-4xl' };
    if (totalItems === 3) return { cols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', maxWidth: 'max-w-6xl' };
    // 4 or more items
    return { cols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4', maxWidth: 'max-w-6xl' };
  };
  
  const gridConfig = getGridCols();

  return (
    <main id="main-content" className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)] scroll-smooth" role="main" aria-label="Main content">
      {/* Hero Section */}
      <section aria-label="Hero section" className="relative h-screen overflow-hidden">
        <div className="absolute inset-0 z-0">
          <HeroImage
            src={getHeroImage()}
            alt="Monaghan's Bar and Grill"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col h-full justify-center">
          {/* Welcome Title */}
          <div className="text-center mb-4 sm:mb-6 max-w-6xl mx-auto w-full">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2 sm:mb-3 drop-shadow-lg">
              {hero?.title || "Monaghan's"}
            </h1>
            {hero?.tagline && (
              <p className="text-lg sm:text-xl md:text-2xl text-white/90 drop-shadow-md mb-2">
                {hero.tagline}
              </p>
            )}
            {hero?.subtitle && (
              <p className="text-base sm:text-lg md:text-xl text-white/80 drop-shadow-md">
                {hero.subtitle}
              </p>
            )}
          </div>
          
          {/* Announcements Handler - Integrated into hero */}
          <AnnouncementsHandler announcements={publishedAnnouncements} />
          
          {/* Compact Grid Layout for Specials and Events */}
          {totalItems > 0 ? (
            <div className={`grid ${gridConfig.cols} gap-3 sm:gap-4 mb-4 sm:mb-6 ${gridConfig.maxWidth} mx-auto w-full`}>
            {/* Today's Events - Recurring and Ad Hoc */}
            {todaysEvents.map((event) => {
              // Check if event is recurring - either has recurrenceRule or is an expanded occurrence
              const isRecurring = !!(event.recurrenceRule || (event as any).isRecurringOccurrence);
              // Get the original event to check recurrence rule (for expanded occurrences, use the event itself)
              const originalEvent = allEvents.find(e => e.id === event.id);
              const hasRecurrenceRule = event.recurrenceRule || originalEvent?.recurrenceRule;
              
              // All recurring events display the same way regardless of frequency
              // No need to show specific recurrence pattern - just mark as recurring
              
              return (
                <div 
                  key={`${event.id}-${event.startDateTime}`} 
                  className="group relative rounded-2xl p-3 sm:p-4 border-l-4 border-purple-400 shadow-xl hover:shadow-2xl hover:shadow-purple-500/20 overflow-hidden"
                >
                  {/* Solid background layer for maximum opacity */}
                  <div className="absolute inset-0 bg-purple-900 rounded-2xl"></div>
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/98 via-purple-800/98 to-indigo-900/98 backdrop-blur-md rounded-2xl"></div>
                  {/* Decorative pattern overlay */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl"></div>
                  </div>
                  <div className="relative flex items-start gap-2 sm:gap-3">
                    <div className={`p-2 sm:p-2.5 ${isRecurring ? 'bg-purple-500/60' : 'bg-purple-500/50'} rounded-xl flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg ring-2 ring-purple-300/30`}>
                      <FaCalendarAlt className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-purple-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                          {isRecurring ? 'Recurring Event' : 'Today\'s Event'}
                        </span>
                        {isRecurring && (
                          <span className="px-2 py-0.5 bg-purple-500/50 border border-purple-300/40 rounded-full text-purple-50 text-[9px] font-bold shadow-sm">
                            Recurring
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 leading-tight drop-shadow-sm break-words">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-purple-50/90 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed break-words">
                          {event.description}
                        </p>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-purple-100 text-[10px] sm:text-xs font-semibold">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
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

            {/* Food Specials - Only show the first one */}
            {displayFoodSpecial.map((special) => (
              <div key={special.id} className="group relative bg-orange-950/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border-l-4 border-orange-500 shadow-xl overflow-hidden">
                {/* Diagonal accent stripe */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 -rotate-45 translate-x-8 -translate-y-8"></div>
                <div className="relative flex items-start gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 bg-orange-600/70 rounded-lg flex-shrink-0 shadow-md">
                    <FaUtensils className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-orange-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-1.5">
                      Food Special
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 leading-tight drop-shadow-sm">
                      {special.title}
                    </h3>
                    {special.description && (
                      <p className="text-orange-50/90 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed break-words">
                        {special.description}
                      </p>
                    )}
                    {special.priceNotes && (
                      <p className="text-orange-200/80 text-[10px] sm:text-xs mb-2 font-semibold line-clamp-1 break-words">
                        {special.priceNotes}
                      </p>
                    )}
                    {special.timeWindow && (
                      <div className="flex items-center gap-1.5 text-orange-200 text-[10px] sm:text-xs font-semibold">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{special.timeWindow}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Drink Special */}
            {todaysDrinkSpecial && (
              <div className="group relative bg-slate-900/70 backdrop-blur-md rounded-2xl p-3 sm:p-4 border-l-4 border-blue-400 shadow-xl overflow-hidden">
                {/* Animated background circles */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-2 right-2 w-20 h-20 bg-blue-500 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-2 left-2 w-16 h-16 bg-cyan-500 rounded-full blur-xl"></div>
                </div>
                <div className="relative flex flex-col">
                  <div className="flex items-start gap-2 sm:gap-3 mb-2">
                    <div className="p-2 sm:p-2.5 bg-blue-500/60 rounded-xl flex-shrink-0 shadow-lg ring-2 ring-blue-400/30">
                      <FaBeer className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-blue-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-1.5">
                        Drink Special
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 leading-tight drop-shadow-sm">
                        {todaysDrinkSpecial.title}
                      </h3>
                    </div>
                  </div>
                  {todaysDrinkSpecial.description && (
                    <p className="text-blue-50/90 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed ml-0 sm:ml-[3.5rem] break-words">
                      {todaysDrinkSpecial.description}
                    </p>
                  )}
                  {todaysDrinkSpecial.priceNotes && (
                    <p className="text-blue-200/80 text-[10px] sm:text-xs mb-2 font-semibold ml-0 sm:ml-[3.5rem] line-clamp-1 break-words">
                      {todaysDrinkSpecial.priceNotes}
                    </p>
                  )}
                  {todaysDrinkSpecial.timeWindow && (
                    <div className="flex items-center gap-1.5 text-blue-200 text-[10px] sm:text-xs font-semibold ml-0 sm:ml-[3.5rem]">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{todaysDrinkSpecial.timeWindow}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Happy Hour */}
            {shouldShowHappyHour && (
              <div className="group relative bg-gradient-to-br from-green-900/70 via-emerald-800/60 to-teal-900/70 backdrop-blur-md rounded-2xl p-3 sm:p-4 border-l-4 border-green-400 shadow-xl overflow-hidden">
                {/* Decorative pattern overlay */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-2 right-2 w-20 h-20 bg-green-500 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-2 left-2 w-16 h-16 bg-emerald-500 rounded-full blur-xl"></div>
                </div>
                <div className="relative flex items-start gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 bg-green-500/60 rounded-xl flex-shrink-0 shadow-lg ring-2 ring-green-400/30">
                    <FaBeer className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-green-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider block mb-1.5">
                      Happy Hour
                    </span>
                    {happyHour.title && (
                      <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 leading-tight drop-shadow-sm break-words">
                        {happyHour.title}
                      </h3>
                    )}
                    {happyHour.description && (
                      <p className="text-green-50/90 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed break-words">
                        {happyHour.description}
                      </p>
                    )}
                    {happyHour.details && (
                      <p className="text-green-200/80 text-[10px] sm:text-xs mb-2 font-semibold line-clamp-1 break-words">
                        {happyHour.details}
                      </p>
                    )}
                    {happyHour.times && (
                      <div className="flex items-center gap-1.5 text-green-200 text-[10px] sm:text-xs font-semibold">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{happyHour.times}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Announcements are now shown as modals, not in the grid */}
          </div>
          ) : (
            <div className="mb-4 sm:mb-6 max-w-6xl mx-auto w-full">
              <div className="bg-gradient-to-br from-gray-900/70 via-gray-800/60 to-gray-900/70 backdrop-blur-md rounded-2xl p-6 sm:p-8 border-l-4 border-gray-500 shadow-xl text-center">
                <p className="text-gray-300 text-sm sm:text-base">
                  Check back soon for today&apos;s specials and events!
                </p>
              </div>
            </div>
          )}
          
          {/* Call to Action Buttons */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-6xl mx-auto w-full">
            <Link
              href="/private-events"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-semibold transition-all hover:scale-105 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] shadow-lg hover:shadow-xl sm:w-auto text-white"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Private Events & Dining
            </Link>
            <div
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-semibold transition-all shadow-lg bg-gray-600/50 cursor-not-allowed opacity-75 sm:w-auto text-white"
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
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-white/30 px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-semibold transition-all hover:scale-105 bg-white/10 backdrop-blur-sm hover:border-white/50 hover:bg-white/20 sm:w-auto text-white"
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

      {/* Private Events Section */}
      <section id="private-events" aria-label="Private events section" className="py-16 md:py-24 px-3 sm:px-4 md:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-gray-900 dark:to-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">Private Events & Private Dining</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-[var(--color-accent)] to-purple-600 mx-auto mb-8"></div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center mb-8">
            {/* Image Column */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-xl">
              <Image
                src="/pics/hero.png"
                alt="Monaghan's Bar private event space"
                fill
                className="object-cover"
                unoptimized={true}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
            </div>

            {/* Text Column */}
            <div className="space-y-6">
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                Host your special occasion at Monaghan&apos;s Bar. Perfect for Christmas parties, corporate events, private dining, post-wedding celebrations, birthdays, anniversaries, and memorial services.
              </p>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                Our flexible 2,400 sq ft space accommodates 50-120 guests with full-service bar, 8 HD TVs, and customizable catering options. Contact us to discuss your event needs and create a custom package.
              </p>
              <div className="pt-4">
                <Link
                  href="/private-events"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer font-semibold text-lg"
                >
                  <span>Learn More About Private Events</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" aria-label="Events section" className="py-16 md:py-24 px-3 sm:px-4 md:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">Upcoming Events</h2>
            <div className="w-24 h-1 bg-blue-600 dark:bg-blue-500 mx-auto mb-8"></div>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-blue-400 dark:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-blue-700 dark:text-blue-400 text-lg mb-2 font-semibold">No upcoming events</p>
                <p className="text-blue-600 dark:text-blue-500 text-sm">Check back soon for updates!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <div
                  key={`${event.id}-${event.startDateTime}`}
                  className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 dark:border-blue-400 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center justify-center text-center min-h-[200px]"
                >
                  <div className="flex flex-col items-center gap-3 mb-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{event.title}</h3>
                    </div>
                  </div>
                  {event.description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed text-sm">{event.description}</p>
                  )}
                  
                  <div className="space-y-2 pt-4 border-t border-blue-200 dark:border-blue-800 w-full">
                    <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400 font-medium">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    
                    <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400 font-medium">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400 font-medium">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div className="text-center mt-12 flex flex-wrap justify-center gap-4">
            <Link
              href="/events"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer"
            >
              <span>View All Events</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/private-events"
              className="group inline-flex items-center gap-2 px-6 py-3 border-2 border-white/30 hover:border-white/50 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Private Events</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
