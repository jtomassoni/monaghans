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
import { FaMicrophone, FaBrain, FaCalendarAlt, FaUtensils, FaBeer, FaTable, FaCalendarWeek, FaDice, FaBullhorn, FaClock, FaCalendarDay } from 'react-icons/fa';
import { FaFootball } from 'react-icons/fa6';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { parseMountainTimeDate, getMountainTimeDateString, getMountainTimeToday } from '@/lib/timezone';

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

interface BusinessHours {
  [key: string]: {
    open: string; // "10:00"
    close: string; // "02:00" (next day)
  };
}

interface CalendarViewProps {
  events: CalendarEvent[];
  specials: CalendarSpecial[];
  announcements?: CalendarAnnouncement[];
  businessHours?: BusinessHours;
  calendarHours?: { startHour: number; endHour: number } | null;
  onEventClick?: (eventId: string, occurrenceDate?: Date) => void;
  onSpecialClick?: (specialId: string) => void;
  onAnnouncementClick?: (announcementId: string) => void;
  onNewEvent?: (date: Date, isAllDay?: boolean) => void;
  onNewAnnouncement?: (date: Date) => void;
  onEventUpdate?: () => void;
  onEventAdded?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: string) => void; // Callback when event is deleted
}

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarView({ events, specials, announcements = [], businessHours, calendarHours, onEventClick, onSpecialClick, onAnnouncementClick, onNewEvent, onNewAnnouncement, onEventUpdate, onEventAdded, onEventDeleted }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{ day: Date; hour: number } | null>(null);
  // Default to 'week' to avoid hydration mismatch - will update in useEffect
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
  const [showHoursConfig, setShowHoursConfig] = useState(false);
  const [localCalendarHours, setLocalCalendarHours] = useState<{ startHour: number; endHour: number } | null>(calendarHours || null);
  const hoursConfigRef = useRef<HTMLDivElement>(null);

  // Set initial view mode based on screen size (after mount to avoid hydration issues)
  useEffect(() => {
    // On mobile, default to day view for better UX
    if (window.innerWidth < 768) {
      setViewMode('day');
    } else {
      setViewMode('week');
    }
  }, []);

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
      if (
        hoursConfigRef.current && 
        !hoursConfigRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-hours-trigger]')
      ) {
        setShowHoursConfig(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update local calendar hours when prop changes
  useEffect(() => {
    setLocalCalendarHours(calendarHours || null);
  }, [calendarHours]);

  // Save calendar hours setting
  const handleSaveHours = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'calendarHours',
          value: JSON.stringify(localCalendarHours),
          description: 'Calendar visible hours range (startHour: 0-23, endHour: 0-26 where 24+ is next day)',
        }),
      });

      if (res.ok) {
        setShowHoursConfig(false);
        // Refresh the page to get updated calendar hours
        window.location.reload();
      } else {
        console.error('Failed to save calendar hours');
      }
    } catch (error) {
      console.error('Error saving calendar hours:', error);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);

  // Get today's date in Mountain Time for comparison
  const todayMT = getMountainTimeToday();
  
  // Check if we're currently viewing today/this week/this month
  // Compare using date strings to avoid timezone issues
  const isViewingCurrentPeriod = useMemo(() => {
    const currentDateStr = getMountainTimeDateString(currentDate);
    const todayMTStr = getMountainTimeDateString(todayMT);
    
    if (viewMode === 'day') {
      // For day view, check if the dates match
      return currentDateStr === todayMTStr;
    } else if (viewMode === 'week') {
      // For week view, check if today falls within the current week
      const currentWeekStart = startOfWeek(currentDate);
      const currentWeekEnd = endOfWeek(currentDate);
      return todayMT >= currentWeekStart && todayMT <= currentWeekEnd;
    } else if (viewMode === 'month') {
      // For month view, check if we're viewing the current month
      return isSameMonth(currentDate, todayMT);
    }
    return false;
  }, [viewMode, currentDate, todayMT]);

  // Get button text based on view mode
  const getTodayButtonText = () => {
    if (viewMode === 'day') {
      return 'Today';
    } else if (viewMode === 'week') {
      return 'This Week';
    } else {
      return 'This Month';
    }
  };

  // Generate all calendar items
  const getAllItems = useMemo(() => {
    const items: CalendarItem[] = [];
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (viewMode === 'day') {
      rangeStart = dayStart;
      rangeEnd = dayEnd;
    } else if (viewMode === 'week') {
      rangeStart = weekStart;
      rangeEnd = endOfDay(weekEnd);
    } else {
      rangeStart = calendarStart;
      rangeEnd = endOfDay(calendarEnd);
    }

    // Process events - use localEvents to ensure we have the latest data
    localEvents.forEach((event) => {
      if (!event.isActive) return;

      const startDate = new Date(event.startDateTime);
      const endDate = event.endDateTime ? new Date(event.endDateTime) : null;

      if (event.recurrenceRule) {
        // Debug: Log recurring event processing (development only)
        if (process.env.NODE_ENV === 'development') {
          console.log('Processing recurring event:', {
            title: event.title,
            recurrenceRule: event.recurrenceRule,
            startDate: startDate.toISOString(),
            rangeStart: rangeStart.toISOString(),
            rangeEnd: rangeEnd.toISOString(),
          });
        }
        
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
            // For weekly events, ensure dtstart is on one of the days specified in BYDAY
            // RRule uses the day of the week from dtstart (in UTC) to determine which days to repeat on
            
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
            
            // Check what day of week this UTC date is (RRule uses UTC day of week)
            const candidateUTCDayOfWeek = candidateDtstart.getUTCDay();
            
            // If BYDAY is specified, check if the start date's day matches any of the specified days
            if (bydayMatch) {
              const bydayStr = bydayMatch[1];
              const targetDays = bydayStr.split(',').map(d => dayMap[d.trim()]).filter(d => d !== undefined);
              
              // Check if the start date's day of week (in MT) matches any of the target days
              const startDateMatches = targetDays.includes(startMTDayOfWeek);
              
              // Check if the UTC day of week matches any of the target days
              const utcDayMatches = targetDays.includes(candidateUTCDayOfWeek);
              
              if (!startDateMatches || !utcDayMatches) {
                // The start date doesn't match any of the BYDAY days
                // Find the first target day that comes after or on the start date
                // Sort target days and find the next one
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
              } else {
                // The start date already matches one of the BYDAY days, use it as-is
                dtstartDate = candidateDtstart;
              }
            } else {
              // No BYDAY specified, use the start date as-is
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
          // If the event starts in the future (beyond rangeEnd), we still need to search the visible range
          // to find occurrences that fall within the visible range (even if the event hasn't started yet)
          // However, we should only show occurrences that are >= the event's start date
          const searchStart = rangeStart;
          // Get all occurrences in the visible range
          const allOccurrences = ruleWithDtstart.between(searchStart, rangeEnd, true);
          // Filter out occurrences that are before the original start date (to respect the event's start)
          // Compare at start of day to avoid timezone/time component issues
          const occurrences = allOccurrences.filter(occ => {
            const occStartOfDay = startOfDay(occ);
            const eventStartOfDay = startOfDay(startDate);
            return occStartOfDay >= eventStartOfDay;
          });
          
          // Debug logging for recurring events (development only)
          if (process.env.NODE_ENV === 'development') {
            console.log('Recurring event occurrences:', {
              title: event.title,
              recurrenceRule: ruleToUse,
              searchStart: searchStart.toISOString(),
              rangeEnd: rangeEnd.toISOString(),
              dtstart: dtstartDate.toISOString(),
              occurrencesCount: occurrences.length,
              occurrences: occurrences.map(o => o.toISOString()).slice(0, 5), // First 5 for debugging
            });
          }
          
          if (occurrences.length === 0 && process.env.NODE_ENV === 'development') {
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
                const targetDays = bydayStr.split(',').map(d => dayMap[d.trim()]).filter(d => d !== undefined);
                
                // Check if the occurrence's day of week matches any of the target days
                if (targetDays.includes(occurrenceMTDayOfWeek)) {
                  // The occurrence is on one of the target days, use it as-is
                  eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, occurrenceMTDay, originalHours, originalMinutes, originalSeconds || 0);
                } else {
                  // The occurrence is not on a target day (timezone issue), find the nearest target day
                  const sortedTargetDays = [...targetDays].sort((a, b) => a - b);
                  let targetDay = sortedTargetDays.find(d => d >= occurrenceMTDayOfWeek) || sortedTargetDays[0];
                  
                  // Calculate days to add to get to the target day
                  let dayDiff = targetDay - occurrenceMTDayOfWeek;
                  if (dayDiff < 0) dayDiff += 7; // Wrap around to next week
                  
                  const adjustedDay = occurrenceMTDay + dayDiff;
                  eventStart = createMountainTimeDate(occurrenceMTYear, occurrenceMTMonth - 1, adjustedDay, originalHours, originalMinutes, originalSeconds || 0);
                }
              } else {
                // No BYDAY specified, use the occurrence date as-is
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
    // Show all specials (active and inactive) for historical and future reference
    specials.forEach((special) => {
      // Handle food specials (with dates)
      if (special.type === 'food') {
        // Parse dates as Mountain Time dates (not UTC) to prevent day shifts
        // Handle both string and Date object formats
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
  }, [localEvents, specials, announcements, currentDate, calendarStart, calendarEnd, weekStart, weekEnd, dayStart, dayEnd, viewMode]);

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
      // Food specials: Warm, appetizing amber/terracotta color
      if (item.type === 'food') {
        return 'bg-amber-600/85 dark:bg-amber-700/85 border-amber-500 dark:border-amber-600';
      }
      // Drink specials: Cool, refreshing teal color (better than blue for beverages)
      const isInactive = !item.isActive;
      if (isInactive) {
        return 'bg-teal-500/40 dark:bg-teal-600/40 border-teal-400/50 dark:border-teal-500/50 opacity-60';
      }
      return 'bg-teal-500/85 dark:bg-teal-600/85 border-teal-400 dark:border-teal-500';
    }
    if (item.eventType === 'announcement') {
      // Announcements: Distinct amber/gold that's easier to read than yellow
      return item.isPublished
        ? 'bg-amber-500/85 dark:bg-amber-600/85 border-amber-400 dark:border-amber-500'
        : 'bg-gray-500/60 dark:bg-gray-600/60 border-gray-400 dark:border-gray-500';
    }
    // For events, assign colors based on icon type and recurrence status
    const title = item.title.toLowerCase();
    const isRecurring = item.eventType === 'event' && (item as CalendarEvent).recurrenceRule !== null;
    
    // Sports events: Vibrant emerald green
    if (title.includes('broncos')) {
      return isRecurring
        ? 'bg-emerald-600/85 dark:bg-emerald-700/85 border-emerald-500 dark:border-emerald-600'
        : 'bg-emerald-500/85 dark:bg-emerald-600/85 border-emerald-400 dark:border-emerald-500';
    }
    // Poker events: Deeper, richer red
    if (title.includes('poker')) {
      return isRecurring
        ? 'bg-red-600/85 dark:bg-red-700/85 border-red-500 dark:border-red-600'
        : 'bg-red-500/85 dark:bg-red-600/85 border-red-400 dark:border-red-500';
    }
    // Karaoke: Bright, fun fuchsia/magenta
    if (title.includes('karaoke') || title.includes('kareoke')) {
      return isRecurring
        ? 'bg-fuchsia-600/85 dark:bg-fuchsia-700/85 border-fuchsia-500 dark:border-fuchsia-600'
        : 'bg-fuchsia-500/85 dark:bg-fuchsia-600/85 border-fuchsia-400 dark:border-fuchsia-500';
    }
    // Trivia: Bright indigo
    if (title.includes('trivia')) {
      return isRecurring
        ? 'bg-indigo-600/85 dark:bg-indigo-700/85 border-indigo-500 dark:border-indigo-600'
        : 'bg-indigo-500/85 dark:bg-indigo-600/85 border-indigo-400 dark:border-indigo-500';
    }
    // Default calendar icon events: Soft blue for singular, slightly deeper for recurring
    return isRecurring
      ? 'bg-blue-600/85 dark:bg-blue-700/85 border-blue-500 dark:border-blue-600'
      : 'bg-blue-500/85 dark:bg-blue-600/85 border-blue-400 dark:border-blue-500';
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
    } else if (viewMode === 'day') {
      setCurrentDate(direction === 'prev' ? addDays(currentDate, -1) : addDays(currentDate, 1));
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
                            // Open announcement modal if handler exists, otherwise navigate
                            if (onAnnouncementClick) {
                              onAnnouncementClick(item.id);
                            } else {
                              window.open(`/admin/announcements?id=${item.id}`, '_blank');
                            }
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

  // Calculate visible hours based on calendar hours setting or business hours
  const getVisibleHours = useMemo(() => {
    // If calendar hours setting is configured, use it (prefer local state for immediate updates)
    const hoursToUse = localCalendarHours || calendarHours;
    if (hoursToUse && hoursToUse.startHour !== undefined && hoursToUse.endHour !== undefined) {
      const hours: number[] = [];
      const startHour = hoursToUse.startHour;
      const endHour = hoursToUse.endHour;
      
      // If endHour is >= 24, it means we're showing hours into the next day
      if (endHour >= 24) {
        // Add hours from startHour to 24 (end of day)
        for (let hour = startHour; hour < 24; hour++) {
          hours.push(hour);
        }
        // Add hours from 24 to endHour for next day (24 = midnight next day, 25 = 1 AM next day, etc.)
        for (let hour = 24; hour <= endHour; hour++) {
          hours.push(hour);
        }
      } else {
        // Normal case: both hours are on the same day
        if (startHour <= endHour) {
          // Simple range within same day
          for (let hour = startHour; hour <= endHour; hour++) {
            hours.push(hour);
          }
        } else {
          // Wrapped around (e.g., 22 to 2)
          // Add hours from startHour to 24
          for (let hour = startHour; hour < 24; hour++) {
            hours.push(hour);
          }
          // Add hours from 0 to endHour
          for (let hour = 0; hour <= endHour; hour++) {
            hours.push(hour);
          }
        }
      }
      
      return hours;
    }

    // Fallback to business hours logic if calendar hours not set
    if (!businessHours || Object.keys(businessHours).length === 0) {
      // Default: show all 24 hours
      return Array.from({ length: 24 }, (_, i) => i);
    }

    // Find the earliest open time and latest close time across all days
    let earliestOpen = 24;
    let latestClose = 0;
    let hasOvernightHours = false;
    
    Object.values(businessHours).forEach((dayHours) => {
      if (!dayHours.open || !dayHours.close) return;
      
      const [openHour] = dayHours.open.split(':').map(Number);
      const [closeHour] = dayHours.close.split(':').map(Number);
      
      // If close hour is less than open hour, it's next day (e.g., 02:00)
      if (closeHour < openHour) {
        hasOvernightHours = true;
        latestClose = Math.max(latestClose, closeHour + 24);
      } else {
        latestClose = Math.max(latestClose, closeHour);
      }
      
      earliestOpen = Math.min(earliestOpen, openHour);
    });

    // Add buffer: start 2 hours before open, end 1 hour after close
    const startHour = Math.max(0, earliestOpen - 2);
    const endHour = latestClose + 1;
    
    // Generate array of visible hours
    const hours: number[] = [];
    
    // Add hours from startHour to 24 (end of day)
    for (let hour = startHour; hour < 24; hour++) {
      hours.push(hour);
    }
    
    // If we have overnight hours, add hours from 0 to endHour (wrapped around)
    if (hasOvernightHours && endHour > 24) {
      for (let hour = 0; hour <= (endHour - 24); hour++) {
        hours.push(hour);
      }
    } else if (!hasOvernightHours) {
      // If no overnight hours, just add up to endHour
      for (let hour = 0; hour <= Math.min(23, endHour); hour++) {
        if (!hours.includes(hour)) {
          hours.push(hour);
        }
      }
    }
    
    return hours;
  }, [businessHours, calendarHours, localCalendarHours]);

  const renderWeekView = () => {
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const availableHeight = calendarHeight > 0 ? calendarHeight - 120 : 500;
    const visibleHoursCount = getVisibleHours.length || 24;
    const hourHeight = Math.max(30, Math.floor(availableHeight / visibleHoursCount));

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
        const eventHour = getHours(eventDate);
        const minutes = getMinutes(eventDate);
        
        // Find the index of this hour in visible hours, or use the closest visible hour
        const hourIndex = getVisibleHours.findIndex(h => h % 24 === eventHour);
        if (hourIndex === -1) {
          // Hour not visible, skip this event (or position at start/end)
          return null;
        }
        
        const top = (hourIndex * hourHeight) + (minutes / 60 * hourHeight);
        
        let height = hourHeight;
        if (event.endDateTime) {
          const endDate = new Date(event.endDateTime);
          const endHours = getHours(endDate);
          const endMinutes = getMinutes(endDate);
          const endHourIndex = getVisibleHours.findIndex(h => h % 24 === endHours);
          if (endHourIndex !== -1) {
            const endTop = (endHourIndex * hourHeight) + (endMinutes / 60 * hourHeight);
            height = Math.max(hourHeight * 0.5, endTop - top);
          }
        }
        
        return { item, top, height };
      }).filter((item): item is { item: CalendarItem; top: number; height: number } => item !== null).sort((a, b) => a.top - b.top);
    };

    return (
      <>
        <div className="flex mb-0 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="w-12 sm:w-14 flex-shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-2 sm:px-3 py-2 sm:py-3 border-r border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"></div>
          <div className="grid grid-cols-7 flex-1">
            {weekDays.map((day, dayIndex) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={format(day, 'EEE')} 
                  className={`text-center py-2 sm:py-3 transition-all duration-200 border-r border-gray-300 dark:border-gray-700 last:border-r-0 ${
                    isToday 
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-x border-blue-400 dark:border-blue-500' 
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1 ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>{format(day, 'EEE')}</div>
                  <div className={`text-base sm:text-lg font-bold transition-all duration-200 ${
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
          <div className="w-12 sm:w-14 flex-shrink-0 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-2 sm:px-3 py-2 border-r border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center">
            <span className="hidden sm:inline">All Day</span>
            <span className="sm:hidden">All</span>
          </div>
          <div className="grid grid-cols-7 flex-1">
            {weekDays.map((day, dayIndex) => {
              const allDayItems = getAllDayItems(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className={`min-h-[50px] sm:min-h-[60px] p-1 sm:p-1.5 border-r border-gray-300 dark:border-gray-700 last:border-r-0 flex flex-col gap-0.5 sm:gap-1 relative group ${
                    isToday 
                      ? 'bg-blue-50/30 dark:bg-blue-900/20 border-x border-blue-400 dark:border-blue-500' 
                      : 'bg-white dark:bg-gray-800'
                  } ${onNewEvent ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors touch-manipulation' : ''}`}
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
                          className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${getItemColor(item)} text-white touch-manipulation min-h-[32px] sm:min-h-0 flex items-center`}
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
                              // Open announcement modal if handler exists, otherwise navigate
                              if (onAnnouncementClick) {
                                onAnnouncementClick(item.id);
                              } else {
                                window.open(`/admin/announcements?id=${item.id}`, '_blank');
                              }
                            }
                          }}
                        >
                          <div className="flex items-center gap-0.5 sm:gap-1 w-full min-w-0">
                            <span className="text-[9px] sm:text-[10px] flex-shrink-0">{getItemIcon(item)}</span>
                            <span className="flex-1 truncate font-medium text-[9px] sm:text-[10px]">
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
          <div className="flex bg-white dark:bg-gray-800" style={{ minHeight: `${hourHeight * visibleHoursCount}px` }}>
            {/* Time column */}
            <div className="flex flex-col sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 pr-1 sm:pr-1.5 pl-1 sm:pl-1.5 z-10 shadow-sm w-12 sm:w-14 flex-shrink-0">
              {getVisibleHours.map((hour, index) => {
                const displayHour = hour % 24;
                return (
                  <div 
                    key={`${hour}-${index}`} 
                    className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium py-1 flex items-center justify-end border-b border-gray-200 dark:border-gray-700"
                    style={{ minHeight: `${hourHeight}px` }}
                  >
                    <span className="leading-none tabular-nums">{displayHour === 0 ? '12 AM' : displayHour < 12 ? `${displayHour} AM` : displayHour === 12 ? '12 PM' : `${displayHour - 12} PM`}</span>
                  </div>
                );
              })}
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
                    style={{ minHeight: `${hourHeight * visibleHoursCount}px` }}
                    onDragOver={(e) => handleDragOver(e, day, hourHeight)}
                    onDrop={(e) => handleDrop(e, day, hourHeight)}
                  >
                  {/* Hour dividers with clickable time slots */}
                  {getVisibleHours.map((hour, index) => {
                    const displayHour = hour % 24;
                    const isHovered = hoveredTimeSlot?.day && isSameDay(day, hoveredTimeSlot.day) && hoveredTimeSlot.hour === displayHour;
                    const hourStart = new Date(day);
                    hourStart.setHours(displayHour, 0, 0, 0);
                    
                    return (
                      <div
                        key={`${hour}-${index}`}
                        className={`absolute left-0 right-0 transition-all duration-150 cursor-pointer border-b border-gray-200 dark:border-gray-700 ${
                          isHovered ? 'bg-blue-50/80 dark:bg-blue-900/40' : 'hover:bg-gray-50/70 dark:hover:bg-gray-700/50'
                        }`}
                        style={{ 
                          top: `${index * hourHeight}px`,
                          height: `${hourHeight}px`
                        }}
                        onMouseEnter={() => setHoveredTimeSlot({ day, hour: displayHour })}
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
                            className="w-9 h-9 sm:w-7 sm:h-7 min-h-[44px] sm:min-h-0 flex items-center justify-center bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-full text-white text-base sm:text-sm font-semibold border border-blue-400 dark:border-blue-500 hover:scale-110 transition-all duration-200 z-20 touch-manipulation"
                            title={`Add event at ${displayHour === 0 ? '12 AM' : displayHour < 12 ? `${displayHour} AM` : displayHour === 12 ? '12 PM' : `${displayHour - 12} PM`}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Current time indicator line */}
                  {isToday && (() => {
                    const currentHour = getHours(currentTime);
                    const currentHourIndex = getVisibleHours.findIndex(h => h % 24 === currentHour);
                    if (currentHourIndex === -1) return null;
                    return (
                      <div
                        key="current-time"
                        className="absolute left-0 right-0 z-[20] pointer-events-none"
                        style={{
                          top: `${(currentHourIndex * hourHeight) + (getMinutes(currentTime) / 60 * hourHeight)}px`,
                        }}
                      >
                        <div className="relative">
                          {/* Red line */}
                          <div className="absolute left-0 right-0 h-0.5 bg-red-500 dark:bg-red-400 shadow-sm" />
                          {/* Small dot on the left */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full -translate-x-1/2 shadow-sm" />
                        </div>
                      </div>
                    );
                  })()}
                  
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
                        className={`absolute left-1 sm:left-2 right-1 sm:right-2 px-2 sm:px-2.5 py-1.5 sm:py-1.5 rounded-md cursor-move transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${getItemColor(item)} text-white z-10 shadow-md border touch-manipulation ${
                          isBeingDragged ? 'opacity-30 scale-95' : 'opacity-100'
                        } ${isNewEvent ? 'animate-in fade-in slide-in-from-top-2 duration-500' : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          minHeight: `${Math.max(hourHeight * 0.6, 36)}px`,
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
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <span className="text-[10px] sm:text-xs flex-shrink-0">{getItemIcon(item)}</span>
                            <span className="text-[10px] sm:text-xs font-medium truncate flex-1 leading-tight">
                              {item.title}
                              {isRecurring && <span className="ml-0.5 sm:ml-1 opacity-75">🔄</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] opacity-90">
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
                            <div className="text-[9px] sm:text-[10px] opacity-80 line-clamp-1 truncate">
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

  const renderDayView = () => {
    const day = currentDate;
    const availableHeight = calendarHeight > 0 ? calendarHeight - 120 : 500;
    const visibleHoursCount = getVisibleHours.length || 24;
    const hourHeight = Math.max(30, Math.floor(availableHeight / visibleHoursCount));

    // Get all-day items for the day
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

    // Get items for the day with their time positions (excluding all-day items)
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
        const eventHour = getHours(eventDate);
        const minutes = getMinutes(eventDate);
        
        // Find the index of this hour in visible hours, or use the closest visible hour
        const hourIndex = getVisibleHours.findIndex(h => h % 24 === eventHour);
        if (hourIndex === -1) {
          // Hour not visible, skip this event (or position at start/end)
          return null;
        }
        
        const top = (hourIndex * hourHeight) + (minutes / 60 * hourHeight);
        
        let height = hourHeight;
        if (event.endDateTime) {
          const endDate = new Date(event.endDateTime);
          const endHours = getHours(endDate);
          const endMinutes = getMinutes(endDate);
          const endHourIndex = getVisibleHours.findIndex(h => h % 24 === endHours);
          if (endHourIndex !== -1) {
            const endTop = (endHourIndex * hourHeight) + (endMinutes / 60 * hourHeight);
            height = Math.max(hourHeight * 0.5, endTop - top);
          }
        }
        
        return { item, top, height };
      }).filter((item): item is { item: CalendarItem; top: number; height: number } => item !== null).sort((a, b) => a.top - b.top);
    };

    const allDayItems = getAllDayItems(day);
    const itemsWithPosition = getItemsWithPosition(day);
    const isToday = isSameDay(day, new Date());

    return (
      <>
        {/* Day Header */}
        <div className="flex mb-0 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="w-12 sm:w-14 flex-shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-2 sm:px-3 py-2 sm:py-3 border-r border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"></div>
          <div className={`flex-1 text-center py-2 sm:py-3 transition-all duration-200 ${
            isToday 
              ? 'bg-blue-50 dark:bg-blue-900/30 border-x border-blue-400 dark:border-blue-500' 
              : 'bg-white dark:bg-gray-800'
          }`}>
            <div className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5 sm:mb-1 ${
              isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`}>{format(day, 'EEEE')}</div>
            <div className={`text-base sm:text-lg font-bold transition-all duration-200 ${
              isToday 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {format(day, 'd')}
            </div>
          </div>
        </div>

        {/* All-day events bar */}
        <div className="flex border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="w-12 sm:w-14 flex-shrink-0 text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-2 sm:px-3 py-2 border-r border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center">
            <span className="hidden sm:inline">All Day</span>
            <span className="sm:hidden">All</span>
          </div>
          <div className={`flex-1 min-h-[50px] sm:min-h-[60px] p-1 sm:p-1.5 border-r border-gray-300 dark:border-gray-700 last:border-r-0 flex flex-col gap-0.5 sm:gap-1 relative group ${
            isToday 
              ? 'bg-blue-50/30 dark:bg-blue-900/20 border-x border-blue-400 dark:border-blue-500' 
              : 'bg-white dark:bg-gray-800'
          } ${onNewEvent ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors touch-manipulation' : ''}`}
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
                    className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${getItemColor(item)} text-white touch-manipulation min-h-[32px] sm:min-h-0 flex items-center`}
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
                        if (onAnnouncementClick) {
                          onAnnouncementClick(item.id);
                        } else {
                          window.open(`/admin/announcements?id=${item.id}`, '_blank');
                        }
                      }
                    }}
                  >
                    <div className="flex items-center gap-0.5 sm:gap-1 w-full min-w-0">
                      <span className="text-[9px] sm:text-[10px] flex-shrink-0">{getItemIcon(item)}</span>
                      <span className="flex-1 truncate font-medium text-[9px] sm:text-[10px]">
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
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="flex bg-white dark:bg-gray-800" style={{ minHeight: `${hourHeight * visibleHoursCount}px` }}>
            {/* Time column */}
            <div className="flex flex-col sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 pr-1 sm:pr-1.5 pl-1 sm:pl-1.5 z-10 shadow-sm w-12 sm:w-14 flex-shrink-0">
              {getVisibleHours.map((hour, index) => {
                const displayHour = hour % 24;
                return (
                  <div 
                    key={`${hour}-${index}`} 
                    className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium py-1 flex items-center justify-end border-b border-gray-200 dark:border-gray-700"
                    style={{ minHeight: `${hourHeight}px` }}
                  >
                    <span className="leading-none tabular-nums">{displayHour === 0 ? '12 AM' : displayHour < 12 ? `${displayHour} AM` : displayHour === 12 ? '12 PM' : `${displayHour - 12} PM`}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Day column */}
            <div className={`flex-1 relative ${
              isToday 
                ? 'bg-blue-50/30 dark:bg-blue-900/20 border-x border-blue-400 dark:border-blue-500' 
                : 'bg-white dark:bg-gray-800'
            } ${isDragging ? 'bg-blue-50/50 dark:bg-blue-900/30' : ''}`}
            style={{ minHeight: `${hourHeight * visibleHoursCount}px` }}
            onDragOver={(e) => handleDragOver(e, day, hourHeight)}
            onDrop={(e) => handleDrop(e, day, hourHeight)}
            >
              {/* Hour dividers with clickable time slots */}
              {getVisibleHours.map((hour, index) => {
                const displayHour = hour % 24;
                const isHovered = hoveredTimeSlot?.day && isSameDay(day, hoveredTimeSlot.day) && hoveredTimeSlot.hour === displayHour;
                const hourStart = new Date(day);
                hourStart.setHours(displayHour, 0, 0, 0);
                
                return (
                  <div
                    key={`${hour}-${index}`}
                    className={`absolute left-0 right-0 transition-all duration-150 cursor-pointer border-b border-gray-200 dark:border-gray-700 ${
                      isHovered ? 'bg-blue-50/80 dark:bg-blue-900/40' : 'hover:bg-gray-50/70 dark:hover:bg-gray-700/50'
                    }`}
                    style={{ 
                      top: `${index * hourHeight}px`,
                      height: `${hourHeight}px`
                    }}
                    onMouseEnter={() => setHoveredTimeSlot({ day, hour: displayHour })}
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
                        className="w-9 h-9 sm:w-7 sm:h-7 min-h-[44px] sm:min-h-0 flex items-center justify-center bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-full text-white text-base sm:text-sm font-semibold border border-blue-400 dark:border-blue-500 hover:scale-110 transition-all duration-200 z-20 touch-manipulation"
                        title={`Add event at ${displayHour === 0 ? '12 AM' : displayHour < 12 ? `${displayHour} AM` : displayHour === 12 ? '12 PM' : `${displayHour - 12} PM`}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {/* Current time indicator line */}
              {isToday && (() => {
                const currentHour = getHours(currentTime);
                const currentHourIndex = getVisibleHours.findIndex(h => h % 24 === currentHour);
                if (currentHourIndex === -1) return null;
                return (
                  <div
                    key="current-time"
                    className="absolute left-0 right-0 z-[20] pointer-events-none"
                    style={{
                      top: `${(currentHourIndex * hourHeight) + (getMinutes(currentTime) / 60 * hourHeight)}px`,
                    }}
                  >
                    <div className="relative">
                      {/* Red line */}
                      <div className="absolute left-0 right-0 h-0.5 bg-red-500 dark:bg-red-400 shadow-sm" />
                      {/* Small dot on the left */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full -translate-x-1/2 shadow-sm" />
                    </div>
                  </div>
                );
              })()}
              
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
                    className={`absolute left-2 right-2 px-2 sm:px-2.5 py-1.5 sm:py-1.5 rounded-md cursor-move transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${getItemColor(item)} text-white z-10 shadow-md border touch-manipulation ${
                      isBeingDragged ? 'opacity-30 scale-95' : 'opacity-100'
                    } ${isNewEvent ? 'animate-in fade-in slide-in-from-top-2 duration-500' : ''}`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      minHeight: `${Math.max(hourHeight * 0.6, 36)}px`,
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
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <span className="text-[10px] sm:text-xs flex-shrink-0">{getItemIcon(item)}</span>
                        <span className="text-[10px] sm:text-xs font-medium truncate flex-1 leading-tight">
                          {item.title}
                          {isRecurring && <span className="ml-0.5 sm:ml-1 opacity-75">🔄</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] opacity-90">
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
                        <div className="text-[9px] sm:text-[10px] opacity-80 line-clamp-1 truncate">
                          {event.description}
                        </div>
                      )}
                    </div>
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
      <div className="mb-2 sm:mb-3 flex-shrink-0 px-1 sm:px-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 w-full">
          {/* Navigation Controls - Simplified for Mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 justify-center flex-1 min-w-0 w-full sm:w-auto">
            <button
              onClick={() => navigateDate('prev')}
              className="w-9 h-9 sm:w-9 sm:h-9 min-h-[40px] sm:min-h-0 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex-shrink-0 cursor-pointer active:scale-95 z-10 relative touch-manipulation"
              aria-label="Previous"
            >
              <HiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" />
            </button>
            <div className="relative px-2 sm:px-4 min-w-[140px] sm:min-w-[240px] flex items-center justify-center flex-shrink-0">
              {viewMode === 'month' ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    data-month-trigger
                    onClick={() => {
                      setShowMonthPicker(!showMonthPicker);
                      setShowYearPicker(false);
                    }}
                    className="text-base sm:text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer active:scale-95 z-10 relative px-1 py-1 min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
                  >
                    {format(currentDate, 'MMMM')}
                  </button>
                  <button
                    data-year-trigger
                    onClick={() => {
                      setShowYearPicker(!showYearPicker);
                      setShowMonthPicker(false);
                    }}
                    className="text-base sm:text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer active:scale-95 z-10 relative px-1 py-1 min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
                  >
                    {format(currentDate, 'yyyy')}
                  </button>
                </div>
              ) : viewMode === 'week' ? (
                <h2 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-white text-center sm:whitespace-nowrap px-1 sm:px-2">
                  {`${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
                </h2>
              ) : viewMode === 'day' ? (
                <h2 className="text-xs sm:text-xl font-bold text-gray-900 dark:text-white text-center sm:whitespace-nowrap px-1 sm:px-2">
                  <span className="hidden sm:inline">{format(currentDate, 'EEEE, MMMM d, yyyy')}</span>
                  <span className="sm:hidden">{format(currentDate, 'EEE, MMM d')}</span>
                </h2>
              ) : (
                <button
                  data-year-trigger
                  onClick={() => {
                    setShowYearPicker(!showYearPicker);
                    setShowMonthPicker(false);
                  }}
                  className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer active:scale-95 z-10 relative px-1 py-1 min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
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
              className="w-9 h-9 sm:w-9 sm:h-9 min-h-[40px] sm:min-h-0 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex-shrink-0 cursor-pointer active:scale-95 z-10 relative touch-manipulation"
              aria-label="Next"
            >
              <HiChevronRight className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" />
            </button>
            <button
              onClick={() => setCurrentDate(todayMT)}
              disabled={isViewingCurrentPeriod}
              className={`px-2.5 sm:px-4 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 text-xs rounded-lg transition-all duration-200 font-semibold flex-shrink-0 z-10 relative border touch-manipulation ${
                isViewingCurrentPeriod
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 border-gray-400 dark:border-gray-600 cursor-not-allowed opacity-60'
                  : 'bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 hover:scale-105 text-white border-blue-400 dark:border-blue-500 cursor-pointer active:scale-95'
              }`}
            >
              <span className="hidden sm:inline">{getTodayButtonText()}</span>
              <span className="sm:hidden">{viewMode === 'day' ? 'Now' : viewMode === 'week' ? 'Week' : 'Month'}</span>
            </button>
          </div>

          {/* View Mode Switcher and Hours Config */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Hours Config Button - Hidden on mobile, only show on desktop */}
            {viewMode === 'week' && (
              <div className="relative hidden sm:block">
                <button
                  data-hours-trigger
                  onClick={() => setShowHoursConfig(!showHoursConfig)}
                  className="px-3 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white touch-manipulation"
                  title="Configure visible hours"
                >
                  <FaClock className="w-3.5 h-3.5 pointer-events-none" />
                  <span className="pointer-events-none">Visible Hours</span>
                </button>

                {/* Hours Config Dropdown */}
                {showHoursConfig && (
                  <div
                    ref={hoursConfigRef}
                    className="absolute top-full right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[280px]"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Calendar Hours
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                      Customize which hours are shown in the calendar
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Start Hour
                        </label>
                        <select
                          value={localCalendarHours?.startHour ?? 12}
                          onChange={(e) => setLocalCalendarHours({
                            startHour: parseInt(e.target.value),
                            endHour: localCalendarHours?.endHour ?? 26
                          })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                        >
                          {Array.from({ length: 24 }, (_, i) => {
                            const displayHour = i === 0 ? 12 : i < 12 ? i : i === 12 ? 12 : i - 12;
                            const period = i < 12 ? 'AM' : 'PM';
                            return (
                              <option key={i} value={i}>
                                {displayHour} {period}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          End Hour
                        </label>
                        <select
                          value={localCalendarHours?.endHour ?? 26}
                          onChange={(e) => setLocalCalendarHours({
                            startHour: localCalendarHours?.startHour ?? 12,
                            endHour: parseInt(e.target.value)
                          })}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                        >
                          {Array.from({ length: 27 }, (_, i) => {
                            if (i < 24) {
                              const displayHour = i === 0 ? 12 : i < 12 ? i : i === 12 ? 12 : i - 12;
                              const period = i < 12 ? 'AM' : 'PM';
                              return (
                                <option key={i} value={i}>
                                  {displayHour} {period}
                                </option>
                              );
                            } else {
                              const nextDayHour = i - 24;
                              const displayHour = nextDayHour === 0 ? 12 : nextDayHour;
                              return (
                                <option key={i} value={i}>
                                  {displayHour} AM (next day)
                                </option>
                              );
                            }
                          })}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setLocalCalendarHours(null);
                          setShowHoursConfig(false);
                          // Reset to default (use business hours)
                          try {
                            await fetch('/api/settings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                key: 'calendarHours',
                                value: '',
                                description: 'Calendar visible hours range',
                              }),
                            });
                            window.location.reload();
                          } catch (error) {
                            console.error('Error resetting calendar hours:', error);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-gray-500 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleSaveHours}
                        className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Mode Switcher - Day, Week, Month (Month hidden on mobile) */}
            <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 sm:p-1 border border-gray-200 dark:border-gray-700 flex-shrink-0">
              {/* Day view - Available on all devices */}
              <button
                onClick={() => setViewMode('day')}
                className={`px-2.5 sm:px-4 py-2 sm:py-2 min-h-[40px] sm:min-h-0 rounded-md transition-all duration-200 flex items-center justify-center gap-1 sm:gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 z-10 relative touch-manipulation ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <FaCalendarDay className="w-3 h-3 sm:w-3.5 sm:h-3.5 pointer-events-none" />
                <span className="pointer-events-none">Day</span>
              </button>
              {/* Week view - Available on all devices */}
              <button
                onClick={() => setViewMode('week')}
                className={`px-2.5 sm:px-4 py-2 sm:py-2 min-h-[40px] sm:min-h-0 rounded-md transition-all duration-200 flex items-center justify-center gap-1 sm:gap-1.5 text-xs font-semibold cursor-pointer active:scale-95 z-10 relative touch-manipulation ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <FaCalendarWeek className="w-3 h-3 sm:w-3.5 sm:h-3.5 pointer-events-none" />
                <span className="pointer-events-none">Week</span>
              </button>
              {/* Month view - Desktop only */}
              <button
                onClick={() => setViewMode('month')}
                className={`hidden sm:flex px-4 py-2 rounded-md transition-all duration-200 items-center justify-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 z-10 relative touch-manipulation ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <FaTable className="w-3.5 h-3.5 pointer-events-none" />
                <span className="pointer-events-none">Month</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
}

