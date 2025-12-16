import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getMountainTimeNow, getMountainTimeToday, getCompanyTimezoneDateString } from '@/lib/timezone';
import { RRule } from 'rrule';
import { format } from 'date-fns';

// Create formatters once to ensure consistent formatting between server and client
// This prevents hydration mismatches
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  hour: 'numeric',
  minute: '2-digit',
});

function formatDateInMountainTime(date: Date): string {
  return dateFormatter.format(date);
}

function formatTimeInMountainTime(date: Date): string {
  return timeFormatter.format(date);
}

// Force dynamic rendering to prevent caching - we need fresh data for events
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventsPage() {
  // Use Mountain Time for date comparison to match the homepage
  const now = getMountainTimeNow();
  const today = getMountainTimeToday();
  
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

  // Get upcoming events (one-time events + recurring occurrences, starting from today)
  // Use today instead of now to include events happening today even if they've already started
  // Limit to 2 months ahead for better UX and SEO - showing too many repetitive events isn't helpful
  const futureDate = new Date(today);
  futureDate.setMonth(futureDate.getMonth() + 2); // Look ahead 2 months for recurring events

  const upcomingOneTimeEvents = allEvents.filter(event => {
    if (event.recurrenceRule) return false;
    const eventDate = new Date(event.startDateTime);
    // Include events starting today or later
    return eventDate >= today;
  });

  const upcomingRecurringOccurrences = allEvents
    .filter(event => event.recurrenceRule)
    .flatMap(event => getRecurringEventOccurrences(event, today, futureDate))
    .filter(occurrence => {
      // Filter to only include occurrences that are today or in the future
      const occurrenceDate = new Date(occurrence.startDateTime);
      return occurrenceDate >= today;
    });

  // Combine all upcoming events and sort by start time
  const allUpcomingEvents = [...upcomingOneTimeEvents, ...upcomingRecurringOccurrences]
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

  // Group events by month
  const eventsByMonth = new Map<string, typeof allUpcomingEvents>();
  
  allUpcomingEvents.forEach((event) => {
    const eventDate = new Date(event.startDateTime);
    // Get date string in Mountain Time, then format with date-fns
    const dateStr = getCompanyTimezoneDateString(eventDate, 'America/Denver');
    const [year, month] = dateStr.split('-');
    const monthKey = `${year}-${month}`;
    
    // For month label, use Intl.DateTimeFormat for timezone-aware formatting
    const monthLabelFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      month: 'long',
      year: 'numeric',
    });
    const monthLabel = monthLabelFormatter.format(eventDate);
    
    if (!eventsByMonth.has(monthKey)) {
      eventsByMonth.set(monthKey, []);
    }
    eventsByMonth.get(monthKey)!.push(event);
  });

  // Get current month key for highlighting
  const nowDateStr = getCompanyTimezoneDateString(now, 'America/Denver');
  const [nowYear, nowMonth] = nowDateStr.split('-');
  const currentMonthKey = `${nowYear}-${nowMonth}`;
  
  // Calculate the cutoff month (2 months from now)
  const cutoffDate = new Date(today);
  cutoffDate.setMonth(cutoffDate.getMonth() + 2);
  const cutoffDateStr = getCompanyTimezoneDateString(cutoffDate, 'America/Denver');
  const [cutoffYear, cutoffMonth] = cutoffDateStr.split('-');
  const cutoffMonthKey = `${cutoffYear}-${cutoffMonth}`;

  // Filter to only show events from current month through 2 months ahead
  // Sort months chronologically
  const sortedMonths = Array.from(eventsByMonth.entries())
    .filter(([monthKey]) => monthKey <= cutoffMonthKey)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Upcoming Events</h1>
          <div className="w-24 h-1 bg-purple-500 mx-auto mb-8"></div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Join us for live music, trivia nights, and special events. Check back regularly for updates.
          </p>
        </div>

        {/* Events List */}
        {sortedMonths.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No upcoming events</p>
              <p className="text-gray-500 text-sm">Check back soon for updates!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {sortedMonths.map(([monthKey, monthEvents]) => {
              // Parse the month key (yyyy-MM) and format it nicely
              const [year, month] = monthKey.split('-');
              const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
              const monthLabel = format(monthDate, 'MMMM yyyy');
              const isCurrentMonth = monthKey === currentMonthKey;
              
              return (
                <div key={monthKey} className="space-y-6">
                  {/* Month Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                    <div className="flex items-center gap-3">
                      <h2 className={`text-2xl md:text-3xl font-bold ${isCurrentMonth ? 'text-purple-400' : 'text-white'}`}>
                        {monthLabel}
                      </h2>
                      <span className="px-3 py-1 bg-purple-500/20 border border-purple-400/40 rounded-full text-purple-300 text-sm font-semibold">
                        {monthEvents.length} {monthEvents.length === 1 ? 'event' : 'events'}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                  </div>
                  
                  {/* Events Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {monthEvents.map((event) => {
                      // Check if event is recurring - either has recurrenceRule or is an expanded occurrence
                      const isRecurring = !!(event.recurrenceRule || (event as any).isRecurringOccurrence);
                      
                      // Get event date for styling
                      const eventDate = new Date(event.startDateTime);
                      // Format day and weekday in Mountain Time using Intl.DateTimeFormat
                      const dayFormatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/Denver',
                        day: 'numeric',
                      });
                      const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/Denver',
                        weekday: 'short',
                      });
                      const eventDay = dayFormatter.format(eventDate);
                      const eventWeekday = weekdayFormatter.format(eventDate);
                      
                      return (
                        <div
                          key={`${event.id}-${event.startDateTime}`}
                          className="group relative bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-900/80 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1"
                        >
                          {/* Recurring Badge */}
                          {isRecurring && (
                            <div className="absolute top-4 right-4">
                              <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-400/40 rounded-full text-purple-300 text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
                                Recurring
                              </span>
                            </div>
                          )}
                          
                          {/* Date Badge */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex flex-col items-center justify-center w-16 h-16 bg-purple-500/10 border border-purple-400/30 rounded-xl">
                              <span className="text-xs font-semibold text-purple-300 uppercase leading-tight">{eventWeekday}</span>
                              <span className="text-2xl font-bold text-white">{eventDay}</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors mb-1 pr-8">
                                {event.title}
                              </h3>
                            </div>
                          </div>
                          
                          {/* Description */}
                          {event.description && (
                            <p className="text-gray-300 mb-5 leading-relaxed text-sm line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          
                          {/* Event Details */}
                          <div className="space-y-3 pt-4 border-t border-gray-800/50">
                            <div className="flex items-center gap-3 text-gray-300">
                              <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm font-medium">
                                {formatTimeInMountainTime(new Date(event.startDateTime))}
                                {event.endDateTime &&
                                  ` - ${formatTimeInMountainTime(new Date(event.endDateTime))}`}
                              </span>
                            </div>
                            
                            {event.venueArea && (
                              <div className="flex items-center gap-3 text-gray-300">
                                <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-sm font-medium">{event.venueArea}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back Button */}
        <div className="text-center mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/private-events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 cursor-pointer font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Private Events
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}


