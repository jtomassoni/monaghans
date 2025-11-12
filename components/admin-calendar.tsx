'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { RRule } from 'rrule';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  getHours,
  getMinutes,
  isSameWeek,
  isWithinInterval
} from 'date-fns';
import { FaMicrophone, FaBrain, FaCalendarAlt, FaUtensils, FaBeer, FaTable, FaCalendarWeek, FaDice, FaBullhorn } from 'react-icons/fa';
import { FaFootball } from 'react-icons/fa6';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

// Helper function to parse YYYY-MM-DD date strings as Mountain Time (not UTC)
// This prevents dates from shifting by a day due to timezone conversion
function parseMountainTimeDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date as if it's Mountain Time midnight
  // We'll use Intl to find what UTC time corresponds to MT midnight
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Try different UTC hours to find which one gives us MT midnight
  for (let offsetHours = 6; offsetHours <= 7; offsetHours++) {
    const candidate = new Date(Date.UTC(year, month - 1, day, offsetHours, 0, 0));
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
    
    const targetDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
    
    if (candidateDate === targetDate && candidateTime === '00:00:00') {
      return candidate;
    }
  }
  
  // Fallback: use UTC-7 (MST)
  return new Date(Date.UTC(year, month - 1, day, 7, 0, 0));
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDateTime: string;
  endDateTime: string | null;
  venueArea: string;
  recurrenceRule: string | null;
  exceptions: string | null;
  isAllDay: boolean;
  tags: string[] | null;
  isActive: boolean;
  eventType: 'event';
}

interface CalendarSpecial {
  id: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  type: 'food' | 'drink';
  appliesOn: string | null;
  timeWindow: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  eventType: 'special';
}

interface CalendarAnnouncement {
  id: string;
  title: string;
  body: string;
  publishAt: string | null;
  expiresAt: string | null;
  isPublished: boolean;
  eventType: 'announcement';
}

type CalendarItem = (CalendarEvent | CalendarSpecial | CalendarAnnouncement) & { date: Date };

interface CalendarViewProps {
  events: CalendarEvent[];
  specials: CalendarSpecial[];
  announcements?: CalendarAnnouncement[];
  onEventClick?: (eventId: string, occurrenceDate?: Date) => void;
  onSpecialClick?: (specialId: string) => void;
  onNewEvent?: (date: Date, isAllDay?: boolean) => void;
  onEventUpdate?: () => void;
  onEventAdded?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: string) => void; // Callback when event is deleted
}

type ViewMode = 'month' | 'week';

export default function CalendarView({ events, specials, announcements = [], onEventClick, onSpecialClick, onNewEvent, onEventUpdate, onEventAdded, onEventDeleted }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{ day: Date; hour: number } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const yearPickerRef = useRef<HTMLDivElement>(null);
  const [calendarHeight, setCalendarHeight] = useState(600);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragPreview, setDragPreview] = useState<{ top: number; day: Date } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(events);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Update local events when props change
  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  // Handle event deletion by removing from local state
  useEffect(() => {
    if (onEventDeleted) {
      // This will be called from parent when event is deleted
    }
  }, [onEventDeleted]);

  // Listen for new events being added
  useEffect(() => {
    if (onEventAdded) {
      // This will be called from parent when event is created
    }
  }, [onEventAdded]);

  useEffect(() => {
    const updateHeight = () => {
      if (calendarRef.current) {
        const rect = calendarRef.current.getBoundingClientRect();
        setCalendarHeight(rect.height);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [viewMode]);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        monthPickerRef.current && 
        !monthPickerRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-month-trigger]')
      ) {
        setShowMonthPicker(false);
      }
      if (
        yearPickerRef.current && 
        !yearPickerRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-year-trigger]')
      ) {
        setShowYearPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);

  // Generate all calendar items
  const getAllItems = useMemo(() => {
    const items: CalendarItem[] = [];
    const rangeStart = viewMode === 'week' ? weekStart : calendarStart;
    const rangeEnd = viewMode === 'week' ? weekEnd : calendarEnd;

    // Process events - use localEvents to ensure we have the latest data
    localEvents.forEach((event) => {
      if (!event.isActive) return;

      const startDate = new Date(event.startDateTime);
      const endDate = event.endDateTime ? new Date(event.endDateTime) : null;

      if (event.recurrenceRule) {
        // Debug: Log recurring event processing
        console.log('Processing recurring event:', {
          title: event.title,
          recurrenceRule: event.recurrenceRule,
          startDate: startDate.toISOString(),
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
        });
        
        try {
          // Parse exceptions if they exist
          const exceptions: string[] = event.exceptions ? JSON.parse(event.exceptions) : [];
          
          // Extract the original time components in Mountain Time first
          // This ensures recurring events always show at the same time of day
          const originalStartMT = new Date(event.startDateTime);
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
          const originalStartMTParts = mtFormatter.formatToParts(originalStartMT);
          const originalHours = parseInt(originalStartMTParts.find(p => p.type === 'hour')!.value);
          const originalMinutes = parseInt(originalStartMTParts.find(p => p.type === 'minute')!.value);
          const originalSeconds = parseInt(originalStartMTParts.find(p => p.type === 'second')?.value || '0');
          
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
          
          // For monthly events with BYMONTHDAY, we need to handle timezone issues
          // The problem: BYMONTHDAY is set to the local day (e.g., 18), but RRule uses UTC internally
          // Solution: Update BYMONTHDAY to match the UTC day that corresponds to the local target day
          let ruleToUse = event.recurrenceRule;
          let dtstartDate: Date;
          
          if (event.recurrenceRule.includes('BYMONTHDAY')) {
            // Extract the day-of-month from the RRULE (this is the local day the user wants)
            const monthDayMatch = event.recurrenceRule.match(/BYMONTHDAY=(\d+)/);
            if (monthDayMatch) {
              const targetDay = parseInt(monthDayMatch[1]);
              
              // Get year/month from the local displayed date (what user sees)
              const localYear = startDate.getFullYear();
              const localMonth = startDate.getMonth();
              
              // The key: We need to find what UTC day-of-month, when displayed in local time,
              // shows as the target day. We'll sample multiple times throughout the local day
              // to find the UTC day that corresponds to it.
              
              // Check at local midday (most reliable)
              const localTargetMidday = new Date(localYear, localMonth, targetDay, 12, 0, 0);
              const utcMiddayDay = localTargetMidday.getUTCDate();
              const utcTargetYear = localTargetMidday.getUTCFullYear();
              const utcTargetMonth = localTargetMidday.getUTCMonth();
              
              // Use the UTC day from midday (most representative of the day)
              const utcCorrespondingDay = utcMiddayDay;
              
              // Update the RRULE to use the UTC day instead of the local day
              // This ensures RRule calculates occurrences correctly in UTC
              ruleToUse = event.recurrenceRule.replace(/BYMONTHDAY=\d+/, `BYMONTHDAY=${utcCorrespondingDay}`);
              
              // Create dtstart at UTC noon on the corresponding UTC day
              // This ensures BYMONTHDAY matches dtstart correctly
              dtstartDate = new Date(Date.UTC(utcTargetYear, utcTargetMonth, utcCorrespondingDay, 12, 0, 0));
            } else {
              dtstartDate = startDate;
            }
          } else if (event.recurrenceRule.includes('FREQ=WEEKLY')) {
            // For weekly events, ensure dtstart represents the correct day of week
            // RRule uses the day of the week from dtstart (in UTC) to determine which days to repeat on
            // We need to ensure dtstart is a Monday in UTC if BYDAY=MO, Tuesday if BYDAY=TU, etc.
            
            // Extract the target day of week from BYDAY in the RRULE
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
            
            // Check what day of week this UTC date is (RRule uses UTC day of week)
            const candidateUTCDayOfWeek = candidateDtstart.getUTCDay();
            
            // Determine the target UTC day of week
            // If BYDAY is specified, use that; otherwise use the Mountain Time day of week
            let targetUTCDayOfWeek: number;
            if (bydayMatch) {
              const bydayStr = bydayMatch[1].split(',')[0].trim(); // Take first day if multiple
              targetUTCDayOfWeek = dayMap[bydayStr] ?? startMTDayOfWeek;
            } else {
              targetUTCDayOfWeek = startMTDayOfWeek;
            }
            
            // If the UTC day of week doesn't match, adjust the date
            if (candidateUTCDayOfWeek !== targetUTCDayOfWeek) {
              // Calculate the difference in days
              let dayDiff = targetUTCDayOfWeek - candidateUTCDayOfWeek;
              // Handle wrap-around
              if (dayDiff < -3) dayDiff += 7;
              if (dayDiff > 3) dayDiff -= 7;
              
              // Adjust the UTC date to have the correct day of week
              const adjustedUTC = new Date(candidateDtstart);
              adjustedUTC.setUTCDate(adjustedUTC.getUTCDate() + dayDiff);
              
              // Now verify this adjusted date, when displayed in Mountain Time, shows the correct day
              const adjustedMTParts = mtFormatter.formatToParts(adjustedUTC);
              const adjustedMTYear = parseInt(adjustedMTParts.find(p => p.type === 'year')!.value);
              const adjustedMTMonth = parseInt(adjustedMTParts.find(p => p.type === 'month')!.value) - 1;
              const adjustedMTDay = parseInt(adjustedMTParts.find(p => p.type === 'day')!.value);
              const adjustedMTDayOfWeek = new Date(adjustedMTYear, adjustedMTMonth, adjustedMTDay).getDay();
              
              // If the Mountain Time day of week matches, use this adjusted date
              if (adjustedMTDayOfWeek === startMTDayOfWeek) {
                // Preserve the original time in Mountain Time
                dtstartDate = createMountainTimeDate(adjustedMTYear, adjustedMTMonth, adjustedMTDay, originalHours, originalMinutes, originalSeconds);
              } else {
                // Fallback: use the candidate as-is
                dtstartDate = candidateDtstart;
              }
            } else {
              dtstartDate = candidateDtstart;
            }
          } else {
            // For other cases, use the date as-is (already converted to local by JavaScript)
            dtstartDate = startDate;
          }
          
          // Create RRule with updated BYMONTHDAY and dtstart
          let rule: RRule;
          try {
            rule = RRule.fromString(ruleToUse);
          } catch (parseError) {
            console.error('Failed to parse RRule:', ruleToUse, parseError);
            // Fallback: show just the initial event if it's in range
            if (isWithinInterval(startDate, { start: rangeStart, end: rangeEnd })) {
              const eventDay = startOfDay(startDate);
              items.push({
                ...event,
                date: eventDay,
              });
            }
            return; // Skip processing this event
          }
          
          const ruleOptions = {
            ...rule.options,
            dtstart: dtstartDate,
          };
          const ruleWithDtstart = new RRule(ruleOptions);
          
          // Use between with inclusive=true to include start date if it's in range
          // For recurring events, we want to find all occurrences in the visible range
          // If the event starts in the future (beyond rangeEnd), we won't find any occurrences
          // If the event starts before rangeStart, we search from rangeStart
          // If the event starts within the range, we search from startDate
          const searchStart = startDate > rangeStart ? (startDate > rangeEnd ? rangeStart : startDate) : rangeStart;
          const occurrences = ruleWithDtstart.between(searchStart, rangeEnd, true).filter(occ => occ >= startDate);
          
          // Debug logging for recurring events
          console.log('Recurring event occurrences:', {
            title: event.title,
            recurrenceRule: ruleToUse,
            searchStart: searchStart.toISOString(),
            rangeEnd: rangeEnd.toISOString(),
            dtstart: dtstartDate.toISOString(),
            occurrencesCount: occurrences.length,
            occurrences: occurrences.map(o => o.toISOString()).slice(0, 5), // First 5 for debugging
          });
          
          if (occurrences.length === 0) {
            console.warn('Recurring event has no occurrences in range:', {
              title: event.title,
              recurrenceRule: ruleToUse,
              startDate: startDate.toISOString(),
              rangeStart: rangeStart.toISOString(),
              rangeEnd: rangeEnd.toISOString(),
              dtstart: dtstartDate.toISOString(),
              searchStart: searchStart.toISOString(),
            });
          }
          
          // Always include the initial event occurrence if it's in the visible range
          // This ensures the first occurrence appears even if RRule calculation misses it
          if (isWithinInterval(startDate, { start: rangeStart, end: rangeEnd })) {
            const startDateStr = format(startDate, 'yyyy-MM-dd');
            if (!exceptions.includes(startDateStr)) {
              // Check if the initial occurrence wasn't already added by the RRule
              const alreadyIncluded = occurrences.some(occ => 
                format(occ, 'yyyy-MM-dd') === startDateStr
              );
              if (!alreadyIncluded) {
                occurrences.unshift(startDate);
              }
            }
          }
          
          occurrences.forEach((occurrence) => {
            // Skip if this occurrence is in the exceptions list
            const occurrenceDateStr = format(occurrence, 'yyyy-MM-dd');
            if (exceptions.includes(occurrenceDateStr)) {
              return;
            }
            
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
                  eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, targetDay, originalHours, originalMinutes, originalSeconds || 0);
                } else {
                  // Use the occurrence date but preserve the original time in Mountain Time
                  eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds || 0);
                }
              } else {
                // Use the occurrence date but preserve the original time in Mountain Time
                eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds || 0);
              }
            } else if (event.recurrenceRule && event.recurrenceRule.includes('FREQ=WEEKLY')) {
              // For weekly events, ensure the occurrence appears on the correct day of week in Mountain Time
              // Get the target day of week from BYDAY or from the original start date
              const bydayMatch = event.recurrenceRule.match(/BYDAY=([^;]+)/);
              const dayMap: Record<string, number> = {
                'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
              };
              
              // Get the original start date's day of week in Mountain Time
              const originalStartMTParts = mtFormatter.formatToParts(new Date(event.startDateTime));
              const originalMTYear = parseInt(originalStartMTParts.find(p => p.type === 'year')!.value);
              const originalMTMonth = parseInt(originalStartMTParts.find(p => p.type === 'month')!.value) - 1;
              const originalMTDay = parseInt(originalStartMTParts.find(p => p.type === 'day')!.value);
              const targetMTDayOfWeek = new Date(originalMTYear, originalMTMonth, originalMTDay).getDay();
              
              // Check what day of week the occurrence represents in Mountain Time
              const occurrenceMTDayOfWeek = new Date(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay).getDay();
              
              // If the day of week doesn't match, adjust to the target day
              if (occurrenceMTDayOfWeek !== targetMTDayOfWeek) {
                // Calculate the difference
                let dayDiff = targetMTDayOfWeek - occurrenceMTDayOfWeek;
                // Handle wrap-around
                if (dayDiff < -3) dayDiff += 7;
                if (dayDiff > 3) dayDiff -= 7;
                
                const adjustedDay = occurrenceMTDay + dayDiff;
                eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, adjustedDay, originalHours, originalMinutes, originalSeconds || 0);
              } else {
                // Use the occurrence date but preserve the original time components in Mountain Time
                eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds || 0);
              }
            } else {
              // For other recurring events, use the occurrence date
              // but preserve the original time components in Mountain Time
              eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds || 0);
            }
            
            // Calculate end time by preserving the time from the original event in Mountain Time
            let eventEnd: Date | null = null;
            if (endDate) {
              const originalEndMT = new Date(event.endDateTime!);
              const originalEndMTParts = mtFormatter.formatToParts(originalEndMT);
              const originalEndHours = parseInt(originalEndMTParts.find(p => p.type === 'hour')!.value);
              const originalEndMinutes = parseInt(originalEndMTParts.find(p => p.type === 'minute')!.value);
              const originalEndSeconds = parseInt(originalEndMTParts.find(p => p.type === 'second')?.value || '0');
              
              // Get the event start date components in Mountain Time to use for end date
              const eventStartMTParts = mtFormatter.formatToParts(eventStart);
              const eventStartMTYear = parseInt(eventStartMTParts.find(p => p.type === 'year')!.value);
              const eventStartMTMonth = parseInt(eventStartMTParts.find(p => p.type === 'month')!.value);
              const eventStartMTDay = parseInt(eventStartMTParts.find(p => p.type === 'day')!.value);
              
              eventEnd = createMountainTimeDate(eventStartMTYear, eventStartMTMonth - 1, eventStartMTDay, originalEndHours, originalEndMinutes, originalEndSeconds || 0);
            }

            // Normalize to start of day to ensure correct day assignment
            const eventDay = startOfDay(eventStart);

            items.push({
              ...event,
              date: eventDay,
              startDateTime: eventStart.toISOString(),
              endDateTime: eventEnd?.toISOString() || null,
            });
          });
        } catch (e) {
          console.error('Error processing recurring event:', {
            title: event.title,
            recurrenceRule: event.recurrenceRule,
            error: e instanceof Error ? e.message : String(e),
            stack: e instanceof Error ? e.stack : undefined,
          });
          // Fallback: show just the initial event if it's in range
          if (isWithinInterval(startDate, { start: rangeStart, end: rangeEnd })) {
            // Normalize to start of day to ensure correct day assignment
            const eventDay = startOfDay(startDate);
            items.push({
              ...event,
              date: eventDay,
            });
          }
        }
      } else {
        if (isWithinInterval(startDate, { start: rangeStart, end: rangeEnd })) {
          // Normalize to start of day to ensure correct day assignment
          const eventDay = startOfDay(startDate);
          items.push({
            ...event,
            date: eventDay,
          });
        }
      }
    });

    // Process specials (daily specials - food type with dates, and drink specials)
    specials.forEach((special) => {
      if (!special.isActive) return;

      // Handle food specials (with dates)
      if (special.type === 'food') {
        // Parse dates as Mountain Time dates (not UTC) to prevent day shifts
        const startDate = special.startDate ? parseMountainTimeDate(special.startDate.split('T')[0]) : null;
        const endDate = special.endDate ? parseMountainTimeDate(special.endDate.split('T')[0]) : null;

        if (startDate) {
          // Normalize to start of day in Mountain Time to prevent timezone issues
          const normalizedStartDate = startOfDay(startDate);
          const normalizedEndDate = endDate ? startOfDay(endDate) : normalizedStartDate;
          
          // If only startDate is provided, treat it as a single-day special
          const effectiveEndDate = normalizedEndDate;
          
          let date = new Date(Math.max(normalizedStartDate.getTime(), rangeStart.getTime()));
          const rangeEndDate = new Date(Math.min(effectiveEndDate.getTime(), rangeEnd.getTime()));
          
          while (date <= rangeEndDate) {
            if (isWithinInterval(date, { start: rangeStart, end: rangeEnd })) {
              items.push({
                ...special,
                date: startOfDay(new Date(date)),
              });
            }
            date = addDays(date, 1);
          }
        }
      }
      
      // Handle drink specials (with weekly recurring days or date ranges)
      if (special.type === 'drink') {
        const appliesOn = special.appliesOn ? (typeof special.appliesOn === 'string' ? JSON.parse(special.appliesOn) : special.appliesOn) : [];
        // Parse dates as Mountain Time dates (not UTC) to prevent day shifts
        const startDateStr = special.startDate ? special.startDate.split('T')[0] : null;
        const endDateStr = special.endDate ? special.endDate.split('T')[0] : null;
        const startDate = startDateStr ? parseMountainTimeDate(startDateStr) : null;
        const endDate = endDateStr ? parseMountainTimeDate(endDateStr) : null;
        
        // If weekly recurring days are set
        if (appliesOn.length > 0) {
          // Show on matching days of the week within the visible range
          let date = new Date(rangeStart);
          const weekdayMap: Record<string, number> = {
            'Monday': 1,
            'Tuesday': 2,
            'Wednesday': 3,
            'Thursday': 4,
            'Friday': 5,
            'Saturday': 6,
            'Sunday': 0,
          };
          
          while (date <= rangeEnd) {
            const dayOfWeek = date.getDay();
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
            
            if (appliesOn.includes(dayName) && isWithinInterval(date, { start: rangeStart, end: rangeEnd })) {
              items.push({
                ...special,
                date: startOfDay(new Date(date)),
              });
            }
            date = addDays(date, 1);
          }
        } else if (startDate) {
          // If date range is set (no weekly recurring)
          // Normalize to start of day in Mountain Time to prevent timezone issues
          const normalizedStartDate = startOfDay(startDate);
          const normalizedEndDate = endDate ? startOfDay(endDate) : normalizedStartDate;
          
          let date = new Date(Math.max(normalizedStartDate.getTime(), rangeStart.getTime()));
          const rangeEndDate = new Date(Math.min(normalizedEndDate.getTime(), rangeEnd.getTime()));
          
          while (date <= rangeEndDate) {
            if (isWithinInterval(date, { start: rangeStart, end: rangeEnd })) {
              items.push({
                ...special,
                date: startOfDay(new Date(date)),
              });
            }
            date = addDays(date, 1);
          }
        }
      }
    });

    // Process announcements
    announcements.forEach((announcement) => {
      if (!announcement.publishAt || !announcement.expiresAt) return;

      // Parse dates and get their Mountain Time date components
      // Dates from Prisma are UTC DateTime, interpret them in Mountain Time
      const publishDateUTC = new Date(announcement.publishAt);
      const expireDateUTC = new Date(announcement.expiresAt);
      
      // Use formatToParts to get date components reliably in Mountain Time
      const publishFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const expireFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      const publishParts = publishFormatter.formatToParts(publishDateUTC);
      const expireParts = expireFormatter.formatToParts(expireDateUTC);
      
      const publishYear = parseInt(publishParts.find(p => p.type === 'year')!.value);
      const publishMonth = parseInt(publishParts.find(p => p.type === 'month')!.value);
      const publishDay = parseInt(publishParts.find(p => p.type === 'day')!.value);
      
      const expireYear = parseInt(expireParts.find(p => p.type === 'year')!.value);
      const expireMonth = parseInt(expireParts.find(p => p.type === 'month')!.value);
      const expireDay = parseInt(expireParts.find(p => p.type === 'day')!.value);
      
      // Create Date objects representing MT midnight for these dates
      const startDateMT = parseMountainTimeDate(`${publishYear}-${String(publishMonth).padStart(2, '0')}-${String(publishDay).padStart(2, '0')}`);
      const endDateMT = parseMountainTimeDate(`${expireYear}-${String(expireMonth).padStart(2, '0')}-${String(expireDay).padStart(2, '0')}`);
      
      // Create date range from start to end (inclusive) in Mountain Time
      let date = new Date(Math.max(startDateMT.getTime(), rangeStart.getTime()));
      const rangeEndDate = new Date(Math.min(endDateMT.getTime(), rangeEnd.getTime()));
      
      while (date <= rangeEndDate) {
        if (isWithinInterval(date, { start: rangeStart, end: rangeEnd })) {
          items.push({
            ...announcement,
            date: startOfDay(new Date(date)),
          });
        }
        date = addDays(date, 1);
      }
    });

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [localEvents, specials, announcements, currentDate, calendarStart, calendarEnd, weekStart, weekEnd, viewMode]);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, CalendarItem[]> = {};
    getAllItems.forEach((item) => {
      const dateKey = format(item.date, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    return grouped;
  }, [getAllItems]);

  const getItemsForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const allItems = itemsByDate[dateKey] || [];
    
    const foodSpecials = allItems.filter(item => item.eventType === 'special' && item.type === 'food');
    const drinkSpecials = allItems.filter(item => item.eventType === 'special' && item.type === 'drink');
    const announcements = allItems.filter(item => item.eventType === 'announcement');
    const eventItems = allItems.filter(item => item.eventType === 'event');
    
    const sortedEvents = eventItems.sort((a, b) => {
      const aIsBroncos = a.title.toLowerCase().includes('broncos');
      const bIsBroncos = b.title.toLowerCase().includes('broncos');
      const aIsPoker = a.title.toLowerCase().includes('poker');
      const bIsPoker = b.title.toLowerCase().includes('poker');
      const aIsKaraoke = a.title.toLowerCase().includes('karaoke') || a.title.toLowerCase().includes('kareoke');
      const bIsKaraoke = b.title.toLowerCase().includes('karaoke') || b.title.toLowerCase().includes('kareoke');
      const aIsRecurring = !!a.recurrenceRule;
      const bIsRecurring = !!b.recurrenceRule;
      
      if (aIsBroncos && !bIsBroncos) return -1;
      if (!aIsBroncos && bIsBroncos) return 1;
      if (aIsPoker && !bIsPoker) return -1;
      if (!aIsPoker && bIsPoker) return 1;
      if (aIsKaraoke && !bIsKaraoke) return -1;
      if (!aIsKaraoke && bIsKaraoke) return 1;
      if (aIsRecurring && !bIsRecurring) return -1;
      if (!aIsRecurring && bIsRecurring) return 1;
      
      return 0;
    });
    
    const prioritized: CalendarItem[] = [];
    
    if (foodSpecials.length > 0) {
      prioritized.push(foodSpecials[0]);
    }
    
    if (drinkSpecials.length > 0) {
      prioritized.push(drinkSpecials[0]);
    }
    
    if (announcements.length > 0) {
      prioritized.push(...announcements.slice(0, viewMode === 'week' ? 5 : 2));
    }
    
    const maxEvents = viewMode === 'week' ? 10 : 2;
    prioritized.push(...sortedEvents.slice(0, maxEvents));
    
    return prioritized;
  };

  const getItemColor = (item: CalendarItem) => {
    if (item.eventType === 'special') {
      return item.type === 'food' 
        ? 'bg-orange-500/80 dark:bg-orange-600/80 border-orange-400 dark:border-orange-500' 
        : 'bg-blue-500/80 dark:bg-blue-600/80 border-blue-400 dark:border-blue-500';
    }
    if (item.eventType === 'announcement') {
      return item.isPublished
        ? 'bg-yellow-500/80 dark:bg-yellow-600/80 border-yellow-400 dark:border-yellow-500'
        : 'bg-gray-500/60 dark:bg-gray-600/60 border-gray-400 dark:border-gray-500';
    }
    // For events, assign colors based on icon type (same logic as getItemIcon)
    const title = item.title.toLowerCase();
    if (title.includes('broncos')) {
      return 'bg-green-500/80 dark:bg-green-600/80 border-green-400 dark:border-green-500';
    }
    if (title.includes('poker')) {
      return 'bg-red-500/80 dark:bg-red-600/80 border-red-400 dark:border-red-500';
    }
    if (title.includes('karaoke') || title.includes('kareoke')) {
      return 'bg-pink-500/80 dark:bg-pink-600/80 border-pink-400 dark:border-pink-500';
    }
    if (title.includes('trivia')) {
      return 'bg-indigo-500/80 dark:bg-indigo-600/80 border-indigo-400 dark:border-indigo-500';
    }
    // Default calendar icon events get teal/cyan color
    return 'bg-cyan-500/80 dark:bg-cyan-600/80 border-cyan-400 dark:border-cyan-500';
  };

  const getItemIcon = (item: CalendarItem) => {
    if (item.eventType === 'special') {
      return item.type === 'food' ? <FaUtensils className="inline-block w-2.5 h-2.5" /> : <FaBeer className="inline-block w-2.5 h-2.5" />;
    }
    if (item.eventType === 'announcement') {
      return <FaBullhorn className="inline-block w-2.5 h-2.5" />;
    }
    const title = item.title.toLowerCase();
    if (title.includes('broncos')) return <FaFootball className="inline-block w-2.5 h-2.5" />;
    if (title.includes('poker')) return <FaDice className="inline-block w-2.5 h-2.5" />;
    if (title.includes('karaoke') || title.includes('kareoke')) return <FaMicrophone className="inline-block w-2.5 h-2.5" />;
    if (title.includes('trivia')) return <FaBrain className="inline-block w-2.5 h-2.5" />;
    return <FaCalendarAlt className="inline-block w-2.5 h-2.5" />;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
    setShowMonthPicker(false);
  };

  const handleYearSelect = (year: number) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
    setShowYearPicker(false);
  };

  const getCurrentYear = () => currentDate.getFullYear();
  const getCurrentMonth = () => currentDate.getMonth();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getYearRange = () => {
    const currentYear = getCurrentYear();
    const years = [];
    for (let i = currentYear - 12; i <= currentYear + 12; i++) {
      years.push(i);
    }
    return years;
  };

  // Drag and drop handlers for week view
  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    if (event.isAllDay) return; // Don't allow dragging all-day events
    setIsDragging(true);
    setHasDragged(false);
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
    
    // Create a custom drag image that maintains original size
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Preserve the original dimensions and positioning
    dragImage.style.position = 'fixed';
    dragImage.style.left = `${rect.left}px`;
    dragImage.style.top = `${rect.top}px`;
    dragImage.style.width = `${rect.width}px`;
    dragImage.style.height = `${rect.height}px`;
    dragImage.style.margin = '0';
    dragImage.style.padding = '0';
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(2deg)';
    dragImage.style.pointerEvents = 'none';
    dragImage.style.zIndex = '10000';
    
    document.body.appendChild(dragImage);
    
    // Calculate offset from mouse position to element position
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
    
    // Clean up after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, day: Date, hourHeight: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHasDragged(true);
    
    if (!draggedEvent) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / hourHeight);
    const minutes = Math.floor((y % hourHeight) / hourHeight * 60);
    const clampedHour = Math.max(0, Math.min(23, hour));
    const clampedMinutes = Math.floor(minutes / 30) * 30; // Snap to 30-minute intervals (:00 or :30)
    
    setDragPreview({
      top: clampedHour * hourHeight + (clampedMinutes / 60) * hourHeight,
      day: day
    });
  };

  const handleDrop = async (e: React.DragEvent, day: Date, hourHeight: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedEvent) {
      setIsDragging(false);
      setDragPreview(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / hourHeight);
    const minutes = Math.floor((y % hourHeight) / hourHeight * 60);
    const clampedHour = Math.max(0, Math.min(23, hour));
    const clampedMinutes = Math.floor(minutes / 30) * 30; // Snap to 30-minute intervals (:00 or :30)

    // Calculate new start date/time
    const originalStart = new Date(draggedEvent.startDateTime);
    const originalEnd = draggedEvent.endDateTime ? new Date(draggedEvent.endDateTime) : null;
    const duration = originalEnd ? originalEnd.getTime() - originalStart.getTime() : 60 * 60 * 1000; // Default 1 hour

    const newStart = new Date(day);
    newStart.setHours(clampedHour, clampedMinutes, 0, 0);
    
    const newEnd = new Date(newStart.getTime() + duration);

    try {
      // Update the event
      const res = await fetch(`/api/events/${draggedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draggedEvent.title,
          description: draggedEvent.description || '',
          startDateTime: newStart.toISOString(),
          endDateTime: newEnd.toISOString(),
          venueArea: draggedEvent.venueArea || 'bar',
          recurrenceRule: draggedEvent.recurrenceRule || null,
          isAllDay: false,
          tags: draggedEvent.tags || [],
          isActive: draggedEvent.isActive,
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        
        // Update local state immediately for smooth UX
        setLocalEvents(prevEvents => 
          prevEvents.map(event => 
            event.id === draggedEvent.id 
              ? {
                  ...event,
                  startDateTime: updatedEvent.startDateTime,
                  endDateTime: updatedEvent.endDateTime,
                } as CalendarEvent
              : event
          )
        );
        
        // Also notify parent if callback exists
        if (onEventUpdate) {
          onEventUpdate();
        }
        
        // Don't refresh - local state update is enough for smooth UX
      } else {
        console.error('Failed to update event');
        // On error, show toast but don't reload
        // The error is already logged, user can try again
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      // On error, show toast but don't reload
      // The error is already logged, user can try again
    }

    setIsDragging(false);
    setDraggedEvent(null);
    setDragPreview(null);
    setHasDragged(false);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedEvent(null);
    setDragPreview(null);
    setHasDragged(false);
  };

  const renderMonthView = () => {
    const days = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }

    // Calculate day height more conservatively to ensure it fits
    const availableHeight = calendarHeight > 0 ? calendarHeight - 120 : 400; // Account for header and padding
    const dayHeight = Math.max(50, Math.floor(availableHeight / 6)); // 6 rows max, ensure it fits

    return (
      <>
        <div className="grid grid-cols-7 gap-2 mb-3 px-2 pt-2 pb-3 border-b border-gray-200 dark:border-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 px-2" style={{ minHeight: `${dayHeight * 6}px` }}>
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const items = getItemsForDate(day);
            const dateKey = format(day, 'yyyy-MM-dd');
            const hasAnyItems = (itemsByDate[dateKey]?.length || 0) > 0;
            const isHovered = hoveredDay && isSameDay(day, hoveredDay);

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`rounded-lg p-2 relative transition-all duration-300 flex flex-col border ${
                  isCurrentMonth 
                    ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500' 
                    : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-60'
                } ${
                  isToday 
                    ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 shadow-md' 
                    : ''
                } ${
                  isHovered && isCurrentMonth
                    ? 'scale-[1.02] z-10 shadow-md'
                    : ''
                } overflow-hidden`}
                style={{ minHeight: `${dayHeight}px` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className={`text-xs font-bold transition-all duration-200 ${
                      isCurrentMonth 
                        ? isToday 
                          ? 'text-blue-400 dark:text-blue-400' 
                          : 'text-gray-900 dark:text-white' 
                        : 'text-gray-400 dark:text-gray-500'
                    } ${isToday ? 'scale-110' : ''}`}
                  >
                    {format(day, 'd')}
                  </div>
                  {isCurrentMonth && onNewEvent && hasAnyItems && (
                    <button
                      onClick={() => onNewEvent(day)}
                      className={`w-4 h-4 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-full text-white text-[10px] font-bold transition-all duration-200 hover:scale-110 shadow-lg ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                      title="Add new event"
                    >
                      +
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {items.map((item, itemIdx) => {
                    const event = item.eventType === 'event' ? item as CalendarEvent : null;
                    const announcement = item.eventType === 'announcement' ? item as CalendarAnnouncement : null;
                    const isRecurring = event && !!event.recurrenceRule;
                    
                    // Build tooltip with event details
                    const tooltipParts: string[] = [item.title];
                    if (announcement) {
                      if (announcement.publishAt) {
                        const publishDate = format(new Date(announcement.publishAt), 'MMM d, yyyy h:mm a');
                        tooltipParts.push(`Publish: ${publishDate}`);
                      }
                      if (announcement.expiresAt) {
                        const expireDate = format(new Date(announcement.expiresAt), 'MMM d, yyyy h:mm a');
                        tooltipParts.push(`Expires: ${expireDate}`);
                      }
                      tooltipParts.push(`Status: ${announcement.isPublished ? 'Published' : 'Draft'}`);
                    }
                    if (event) {
                      if (!event.isAllDay) {
                        const startTime = format(new Date(event.startDateTime), 'h:mm a');
                        const endTime = event.endDateTime ? format(new Date(event.endDateTime), 'h:mm a') : null;
                        tooltipParts.push(`Time: ${startTime}${endTime ? ` - ${endTime}` : ''}`);
                      }
                      if (event.description) {
                        tooltipParts.push(`Description: ${event.description}`);
                      }
                      if (event.venueArea && event.venueArea !== 'bar') {
                        tooltipParts.push(`Venue: ${event.venueArea.charAt(0).toUpperCase() + event.venueArea.slice(1)}`);
                      }
                      if (event.tags && event.tags.length > 0) {
                        tooltipParts.push(`Tags: ${event.tags.join(', ')}`);
                      }
                      if (isRecurring) {
                        tooltipParts.push('🔄 Recurring Event');
                      }
                    }
                    
                    return (
                      <div
                        key={`${item.id}-${format(item.date, 'yyyy-MM-dd')}-${itemIdx}`}
                        className={`text-[10px] px-1.5 py-1 rounded border shadow-sm cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${getItemColor(item)} text-white`}
                        title={tooltipParts.join('\n')}
                        onClick={() => {
                          if (item.eventType === 'event') {
                            if (onEventClick) {
                              // For recurring events, pass the occurrence date
                              const event = item as CalendarEvent;
                              const occurrenceDate = event.recurrenceRule ? item.date : undefined;
                              onEventClick(item.id, occurrenceDate);
                            }
                          } else if (item.eventType === 'special') {
                            if (onSpecialClick) {
                              onSpecialClick(item.id);
                            }
                          } else if (item.eventType === 'announcement') {
                            // Open announcement in new tab or navigate
                            window.open(`/admin/announcements?id=${item.id}`, '_blank');
                          }
                        }}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[10px]">{getItemIcon(item)}</span>
                          <span className="flex-1 truncate font-medium">
                            {item.title}
                            {isRecurring && <span className="ml-0.5 opacity-75">🔄</span>}
                          </span>
                        </div>
                        {event && !event.isAllDay && (
                          <div className="text-[9px] opacity-85 truncate pl-3">
                            {format(new Date(event.startDateTime), 'h:mm a')}
                            {event.endDateTime && ` - ${format(new Date(event.endDateTime), 'h:mm a')}`}
                          </div>
                        )}
                        {event && event.description && (
                          <div className="text-[9px] opacity-75 line-clamp-1 truncate pl-3">
                            {event.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isCurrentMonth && onNewEvent && !hasAnyItems && (
                  <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    <button
                      onClick={() => onNewEvent(day)}
                      className="w-8 h-8 flex items-center justify-center bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-full text-white text-lg font-bold transition-all duration-300 hover:scale-110 border border-blue-400 dark:border-blue-500 pointer-events-auto"
                      title="Add new event"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderWeekView = () => {
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const availableHeight = calendarHeight > 0 ? calendarHeight - 120 : 500;
    const hourHeight = Math.max(30, Math.floor(availableHeight / 24));

    // Get all-day items for a day (specials, announcements, and all-day events)
    const getAllDayItems = (day: Date): CalendarItem[] => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const allItems = itemsByDate[dayKey] || [];
      
      return allItems.filter((item) => {
        if (item.eventType === 'special' || item.eventType === 'announcement') {
          return true;
        }
        if (item.eventType === 'event') {
          const event = item as CalendarEvent;
          return event.isAllDay;
        }
        return false;
      });
    };

    // Get items for each day with their time positions (excluding all-day items)
    const getItemsWithPosition = (day: Date) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const allItems = itemsByDate[dayKey] || [];
      
      // Filter out all-day items
      const timedItems = allItems.filter((item) => {
        if (item.eventType === 'special' || item.eventType === 'announcement') {
          return false; // These are all-day, exclude from timed view
        }
        if (item.eventType === 'event') {
          const event = item as CalendarEvent;
          return !event.isAllDay; // Only include timed events
        }
        return true;
      });
      
      return timedItems.map((item) => {
        // Only events should be in timedItems after filtering
        const event = item as CalendarEvent;
        const eventDate = new Date(event.startDateTime);
        const hours = getHours(eventDate);
        const minutes = getMinutes(eventDate);
        const top = (hours * hourHeight) + (minutes / 60 * hourHeight);
        
        let height = hourHeight;
        if (event.endDateTime) {
          const endDate = new Date(event.endDateTime);
          const endHours = getHours(endDate);
          const endMinutes = getMinutes(endDate);
          const endTop = (endHours * hourHeight) + (endMinutes / 60 * hourHeight);
          height = Math.max(hourHeight * 0.5, endTop - top);
        }
        
        return { item, top, height };
      }).sort((a, b) => a.top - b.top);
    };

    return (
      <>
        <div className="flex mb-0 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="w-14 flex-shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-3 py-3 border-r border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"></div>
          <div className="grid grid-cols-7 flex-1">
            {weekDays.map((day, dayIndex) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={format(day, 'EEE')} 
                  className={`text-center py-3 transition-all duration-200 border-r border-gray-300 dark:border-gray-700 last:border-r-0 ${
                    isToday 
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-x border-blue-400 dark:border-blue-500' 
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>{format(day, 'EEE')}</div>
                  <div className={`text-lg font-bold transition-all duration-200 ${
                    isToday 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* All-day events bar */}
        <div className="flex border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="w-14 flex-shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-3 py-2 border-r border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center">
            All Day
          </div>
          <div className="grid grid-cols-7 flex-1">
            {weekDays.map((day, dayIndex) => {
              const allDayItems = getAllDayItems(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={`min-h-[60px] p-1.5 border-r border-gray-300 dark:border-gray-700 last:border-r-0 flex flex-col gap-1 relative group ${
                    isToday 
                      ? 'bg-blue-50/30 dark:bg-blue-900/20 border-x border-blue-400 dark:border-blue-500' 
                      : 'bg-white dark:bg-gray-800'
                  } ${onNewEvent ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors' : ''}`}
                  onClick={() => {
                    if (onNewEvent) {
                      const dayStart = startOfDay(day);
                      onNewEvent(dayStart, true);
                    }
                  }}
                >
                  {allDayItems.length === 0 ? (
                    <div className="text-xs text-gray-400 dark:text-gray-600 text-center py-1 flex items-center justify-center h-full">
                      <span className={`${onNewEvent ? 'group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors' : ''}`}>
                        {onNewEvent ? 'Click to add event' : '—'}
                      </span>
                    </div>
                  ) : (
                    allDayItems.map((item, itemIdx) => {
                      const event = item.eventType === 'event' ? item as CalendarEvent : null;
                      const announcement = item.eventType === 'announcement' ? item as CalendarAnnouncement : null;
                      const isRecurring = event && !!event.recurrenceRule;
                      
                      // Build tooltip
                      const tooltipParts: string[] = [item.title];
                      if (announcement) {
                        if (announcement.publishAt) {
                          const publishDate = format(new Date(announcement.publishAt), 'MMM d, yyyy h:mm a');
                          tooltipParts.push(`Publish: ${publishDate}`);
                        }
                        if (announcement.expiresAt) {
                          const expireDate = format(new Date(announcement.expiresAt), 'MMM d, yyyy h:mm a');
                          tooltipParts.push(`Expires: ${expireDate}`);
                        }
                        tooltipParts.push(`Status: ${announcement.isPublished ? 'Published' : 'Draft'}`);
                      }
                      if (event) {
                        if (event.description) {
                          tooltipParts.push(`Description: ${event.description}`);
                        }
                        if (event.venueArea && event.venueArea !== 'bar') {
                          tooltipParts.push(`Venue: ${event.venueArea.charAt(0).toUpperCase() + event.venueArea.slice(1)}`);
                        }
                        if (event.tags && event.tags.length > 0) {
                          tooltipParts.push(`Tags: ${event.tags.join(', ')}`);
                        }
                        if (isRecurring) {
                          tooltipParts.push('🔄 Recurring Event');
                        }
                      }
                      
                      return (
                        <div
                          key={`${item.id}-${format(item.date, 'yyyy-MM-dd')}-${itemIdx}`}
                          className={`text-[10px] px-2 py-1 rounded border shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${getItemColor(item)} text-white`}
                          title={tooltipParts.join('\n')}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.eventType === 'event') {
                              if (onEventClick) {
                                const event = item as CalendarEvent;
                                const occurrenceDate = event.recurrenceRule ? item.date : undefined;
                                onEventClick(item.id, occurrenceDate);
                              }
                            } else if (item.eventType === 'special') {
                              if (onSpecialClick) {
                                onSpecialClick(item.id);
                              }
                            } else if (item.eventType === 'announcement') {
                              window.open(`/admin/announcements?id=${item.id}`, '_blank');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] flex-shrink-0">{getItemIcon(item)}</span>
                            <span className="flex-1 truncate font-medium">
                              {item.title}
                              {isRecurring && <span className="ml-0.5 opacity-75">🔄</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  
                  {/* Add button on hover when items exist */}
                  {onNewEvent && allDayItems.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const dayStart = startOfDay(day);
                          onNewEvent(dayStart, true);
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-full text-white text-xs font-bold transition-all duration-200 hover:scale-110 border border-blue-400 dark:border-blue-500 pointer-events-auto shadow-lg"
                        title="Add all-day event"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="flex bg-white dark:bg-gray-800" style={{ minHeight: `${hourHeight * 24}px` }}>
            {/* Time column */}
            <div className="flex flex-col sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 pr-1.5 pl-1.5 z-10 shadow-sm w-14 flex-shrink-0">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div 
                  key={hour} 
                  className="text-xs text-gray-600 dark:text-gray-400 font-medium py-1 flex items-center justify-end border-b border-gray-200 dark:border-gray-700"
                  style={{ minHeight: `${hourHeight}px` }}
                >
                  <span className="leading-none tabular-nums">{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span>
                </div>
              ))}
            </div>
            
            {/* Day columns */}
            <div className="grid grid-cols-7 flex-1">
              {weekDays.map((day, dayIndex) => {
                const itemsWithPosition = getItemsWithPosition(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className={`relative border-r border-gray-300 dark:border-gray-700 last:border-r-0 ${
                      isToday 
                        ? 'bg-blue-50/30 dark:bg-blue-900/20 border-x border-blue-400 dark:border-blue-500' 
                        : 'bg-white dark:bg-gray-800'
                    } ${isDragging ? 'bg-blue-50/50 dark:bg-blue-900/30' : ''}`}
                    style={{ minHeight: `${hourHeight * 24}px` }}
                    onDragOver={(e) => handleDragOver(e, day, hourHeight)}
                    onDrop={(e) => handleDrop(e, day, hourHeight)}
                  >
                  {/* Hour dividers with clickable time slots */}
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const isHovered = hoveredTimeSlot?.day && isSameDay(day, hoveredTimeSlot.day) && hoveredTimeSlot.hour === hour;
                    const hourStart = new Date(day);
                    hourStart.setHours(hour, 0, 0, 0);
                    
                    return (
                      <div
                        key={hour}
                        className={`absolute left-0 right-0 transition-all duration-150 cursor-pointer border-b border-gray-200 dark:border-gray-700 ${
                          isHovered ? 'bg-blue-50/80 dark:bg-blue-900/40' : 'hover:bg-gray-50/70 dark:hover:bg-gray-700/50'
                        }`}
                        style={{ 
                          top: `${hour * hourHeight}px`,
                          height: `${hourHeight}px`
                        }}
                        onMouseEnter={() => setHoveredTimeSlot({ day, hour })}
                        onMouseLeave={() => setHoveredTimeSlot(null)}
                        onClick={() => {
                          if (onNewEvent) {
                            onNewEvent(hourStart);
                          }
                        }}
                      >
                        {/* Add button on hover */}
                        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                        }`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onNewEvent) {
                                onNewEvent(hourStart);
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-full text-white text-sm font-semibold border border-blue-400 dark:border-blue-500 hover:scale-110 transition-all duration-200 z-20"
                            title={`Add event at ${hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Current time indicator line */}
                  {isToday && (
                    <div
                      className="absolute left-0 right-0 z-[20] pointer-events-none"
                      style={{
                        top: `${(getHours(currentTime) * hourHeight) + (getMinutes(currentTime) / 60 * hourHeight)}px`,
                      }}
                    >
                      <div className="relative">
                        {/* Red line */}
                        <div className="absolute left-0 right-0 h-0.5 bg-red-500 dark:bg-red-400 shadow-sm" />
                        {/* Small dot on the left */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full -translate-x-1/2 shadow-sm" />
                      </div>
                    </div>
                  )}
                  
                  {/* Drag preview */}
                  {dragPreview && isDragging && draggedEvent && isSameDay(dragPreview.day, day) && (
                    <div
                      className="absolute left-2 right-2 px-2.5 py-1.5 rounded-md border-2 border-dashed border-blue-500 dark:border-blue-400 bg-blue-100/40 dark:bg-blue-900/40 z-20 pointer-events-none"
                      style={{
                        top: `${dragPreview.top}px`,
                        height: `${draggedEvent.endDateTime ? (new Date(draggedEvent.endDateTime).getTime() - new Date(draggedEvent.startDateTime).getTime()) / (1000 * 60 * 60) * hourHeight : hourHeight}px`,
                        minHeight: `${hourHeight * 0.6}px`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 h-full opacity-70">
                        <span className="text-xs flex-shrink-0">{getItemIcon(draggedEvent as CalendarItem)}</span>
                        <span className="text-xs font-medium truncate flex-1 leading-tight text-gray-800 dark:text-gray-200">
                          {draggedEvent.title}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Events positioned by time */}
                  {itemsWithPosition.map(({ item, top, height }, itemIdx) => {
                    // Only timed events are in itemsWithPosition
                    const event = item as CalendarEvent;
                    const isBeingDragged = draggedEvent && event.id === draggedEvent.id;
                    const isNewEvent = newEventIds.has(event.id);
                    const isRecurring = !!event.recurrenceRule;
                    
                    // Build tooltip with event details
                    const tooltipParts: string[] = [item.title];
                    const startTime = format(new Date(event.startDateTime), 'h:mm a');
                    const endTime = event.endDateTime ? format(new Date(event.endDateTime), 'h:mm a') : null;
                    tooltipParts.push(`Time: ${startTime}${endTime ? ` - ${endTime}` : ''}`);
                    if (event.description) {
                      tooltipParts.push(`Description: ${event.description}`);
                    }
                    if (event.venueArea && event.venueArea !== 'bar') {
                      tooltipParts.push(`Venue: ${event.venueArea.charAt(0).toUpperCase() + event.venueArea.slice(1)}`);
                    }
                    if (event.tags && event.tags.length > 0) {
                      tooltipParts.push(`Tags: ${event.tags.join(', ')}`);
                    }
                    if (isRecurring) {
                      tooltipParts.push('🔄 Recurring Event');
                    }
                    
                    return (
                      <div
                        key={`${item.id}-${format(item.date, 'yyyy-MM-dd')}-${itemIdx}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, event)}
                        onDragEnd={handleDragEnd}
                        className={`absolute left-2 right-2 px-2.5 py-1.5 rounded-md cursor-move transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${getItemColor(item)} text-white z-10 shadow-md border ${
                          isBeingDragged ? 'opacity-30 scale-95' : 'opacity-100'
                        } ${isNewEvent ? 'animate-in fade-in slide-in-from-top-2 duration-500' : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          minHeight: `${hourHeight * 0.6}px`,
                          transition: isBeingDragged ? 'all 0.2s ease-out' : isNewEvent ? 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          animation: isNewEvent ? 'slideInScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                        }}
                        title={tooltipParts.join('\n')}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Don't open modal if user was dragging
                          if (hasDragged) return;
                          if (onEventClick) {
                            const occurrenceDate = event.recurrenceRule ? item.date : undefined;
                            onEventClick(item.id, occurrenceDate);
                          }
                        }}
                      >
                        <div className="flex flex-col gap-0.5 h-full justify-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs flex-shrink-0">{getItemIcon(item)}</span>
                            <span className="text-xs font-medium truncate flex-1 leading-tight">
                              {item.title}
                              {isRecurring && <span className="ml-1 opacity-75">🔄</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] opacity-90">
                            <span>{format(new Date(event.startDateTime), 'h:mm a')}</span>
                            {event.endDateTime && (
                              <>
                                <span>-</span>
                                <span>{format(new Date(event.endDateTime), 'h:mm a')}</span>
                              </>
                            )}
                            {event.venueArea && event.venueArea !== 'bar' && (
                              <>
                                <span>•</span>
                                <span className="capitalize truncate">{event.venueArea}</span>
                              </>
                            )}
                          </div>
                          {event.description && height > hourHeight * 0.8 && (
                            <div className="text-[10px] opacity-80 line-clamp-1 truncate">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </>
    );
  };


  return (
    <div className="flex flex-col h-full min-h-0" ref={calendarRef}>
        {/* Calendar Header */}
      <div className="mb-3 flex-shrink-0 px-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2 justify-center flex-1 min-w-0">
            <button
              onClick={() => navigateDate('prev')}
              className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex-shrink-0 cursor-pointer active:scale-95 z-10 relative"
              aria-label="Previous"
            >
              <HiChevronLeft className="w-5 h-5 pointer-events-none" />
            </button>
            <div className="relative px-2 sm:px-4 min-w-[200px] sm:min-w-[240px] flex items-center justify-center flex-shrink-0">
              {viewMode === 'month' ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    data-month-trigger
                    onClick={() => {
                      setShowMonthPicker(!showMonthPicker);
                      setShowYearPicker(false);
                    }}
                    className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer active:scale-95 z-10 relative px-1 py-1"
                  >
                    {format(currentDate, 'MMMM')}
                  </button>
                  <button
                    data-year-trigger
                    onClick={() => {
                      setShowYearPicker(!showYearPicker);
                      setShowMonthPicker(false);
                    }}
                    className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer active:scale-95 z-10 relative px-1 py-1"
                  >
                    {format(currentDate, 'yyyy')}
                  </button>
                </div>
              ) : viewMode === 'week' ? (
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center sm:whitespace-nowrap px-2">
                  {`${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
                </h2>
              ) : (
                <button
                  data-year-trigger
                  onClick={() => {
                    setShowYearPicker(!showYearPicker);
                    setShowMonthPicker(false);
                  }}
                  className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer active:scale-95 z-10 relative px-1 py-1"
                >
                  {format(currentDate, 'yyyy')}
                </button>
              )}

              {/* Month Picker */}
              {showMonthPicker && viewMode === 'month' && (
                <div
                  ref={monthPickerRef}
                  className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((month, index) => (
                      <button
                        key={month}
                        onClick={() => handleMonthSelect(index)}
                        className={`px-3 py-2.5 sm:py-2 rounded-lg transition-all duration-200 text-sm font-medium cursor-pointer active:scale-95 z-10 relative ${
                          index === getCurrentMonth()
                            ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {month.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Year Picker */}
              {showYearPicker && (
                <div
                  ref={yearPickerRef}
                  className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2"
                >
                  <div className="grid grid-cols-4 gap-2">
                    {getYearRange().map((year) => (
                      <button
                        key={year}
                        onClick={() => handleYearSelect(year)}
                        className={`px-3 py-2.5 sm:py-2 rounded-lg transition-all duration-200 text-sm font-medium cursor-pointer active:scale-95 ${
                          year === getCurrentYear()
                            ? 'bg-blue-500/90 dark:bg-blue-600/90 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => navigateDate('next')}
              className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex-shrink-0 cursor-pointer active:scale-95 z-10 relative"
              aria-label="Next"
            >
              <HiChevronRight className="w-5 h-5 pointer-events-none" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 sm:py-1.5 text-xs bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-all duration-200 hover:scale-105 text-white font-semibold flex-shrink-0 cursor-pointer active:scale-95 z-10 relative border border-blue-400 dark:border-blue-500"
            >
              Today
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2.5 sm:py-2 rounded-md transition-all duration-200 flex items-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 z-10 relative ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <FaTable className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Month</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2.5 sm:py-2 rounded-md transition-all duration-200 flex items-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 z-10 relative ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <FaCalendarWeek className="w-3.5 h-3.5 pointer-events-none" />
              <span className="pointer-events-none">Week</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
      </div>
    </div>
  );
}

