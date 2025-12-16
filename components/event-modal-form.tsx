'use client';

import { useState, FormEvent, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';
import DateTimePicker from '@/components/date-time-picker';
import DatePicker from '@/components/date-picker';
import TimePicker from '@/components/time-picker';
import { parseDateTimeLocalAsCompanyTimezone, formatDateAsDateTimeLocal, getCompanyTimezoneSync } from '@/lib/timezone';

interface Event {
  id?: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  recurrenceRule: string;
  isAllDay: boolean;
  tags: string[];
  isActive: boolean;
}

interface EventModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event;
  occurrenceDate?: Date; // For recurring events: the specific occurrence date being edited/deleted
  onSuccess?: () => void;
  onDelete?: (eventId: string) => void; // Callback when event is deleted
  onEventAdded?: (event: any) => void; // Callback when event is created
  onEventUpdated?: (event: any) => void; // Callback when event is updated
  onExceptionAdded?: (eventId: string, updatedEvent: any) => void; // Callback when exception is added to recurring event
}

// Helper function to parse RRULE and extract recurrence info
function parseRRULE(rrule: string | null | undefined): { frequency: 'none' | 'weekly' | 'monthly'; days: string[]; monthDay?: number; until?: string } {
  if (!rrule) {
    return { frequency: 'none', days: [] };
  }

  const freqMatch = rrule.match(/FREQ=(\w+)/);
  const freq = freqMatch ? freqMatch[1].toLowerCase() : 'none';
  
  // Extract UNTIL date if present (format: UNTIL=20261231T235959Z or UNTIL=20261231)
  const untilMatch = rrule.match(/UNTIL=([^;]+)/);
  let untilDate: string | undefined;
  if (untilMatch) {
    const untilStr = untilMatch[1];
    // Handle both formats: 20261231T235959Z and 20261231
    if (untilStr.includes('T')) {
      // Parse ISO format: 20261231T235959Z
      const datePart = untilStr.split('T')[0];
      const year = datePart.substring(0, 4);
      const month = datePart.substring(4, 6);
      const day = datePart.substring(6, 8);
      untilDate = `${year}-${month}-${day}`;
    } else {
      // Parse date-only format: 20261231
      const year = untilStr.substring(0, 4);
      const month = untilStr.substring(4, 6);
      const day = untilStr.substring(6, 8);
      untilDate = `${year}-${month}-${day}`;
    }
  }
  
  if (freq === 'monthly') {
    // Check for BYMONTHDAY (day of month)
    const monthDayMatch = rrule.match(/BYMONTHDAY=(\d+)/);
    if (monthDayMatch) {
      return { frequency: 'monthly', days: [], monthDay: parseInt(monthDayMatch[1]), until: untilDate };
    }
    // Check for BYDAY (nth weekday of month)
    const bydayMatch = rrule.match(/BYDAY=([^;]+)/);
    if (bydayMatch) {
      // For monthly, we'll just return monthly with empty days (simplified)
      return { frequency: 'monthly', days: [], until: untilDate };
    }
  }
  
  if (freq === 'weekly') {
    const daysMatch = rrule.match(/BYDAY=([^;]+)/);
    const days = daysMatch ? daysMatch[1].split(',').map(d => {
      const dayMap: Record<string, string> = {
        'MO': 'Monday',
        'TU': 'Tuesday',
        'WE': 'Wednesday',
        'TH': 'Thursday',
        'FR': 'Friday',
        'SA': 'Saturday',
        'SU': 'Sunday'
      };
      return dayMap[d.trim()] || '';
    }).filter(Boolean) : [];
    return { frequency: 'weekly', days, until: untilDate };
  }

  return { frequency: 'none', days: [], until: untilDate };
}

// Helper function to build RRULE from user selections
function buildRRULE(frequency: string, days: string[], monthDay?: number, until?: string): string {
  if (frequency === 'none') {
    return '';
  }

  let rrule = '';
  
  if (frequency === 'weekly' && days.length > 0) {
    const dayMap: Record<string, string> = {
      'Monday': 'MO',
      'Tuesday': 'TU',
      'Wednesday': 'WE',
      'Thursday': 'TH',
      'Friday': 'FR',
      'Saturday': 'SA',
      'Sunday': 'SU'
    };
    const byday = days.map(d => dayMap[d] || '').filter(Boolean).join(',');
    rrule = `FREQ=WEEKLY;BYDAY=${byday}`;
  } else if (frequency === 'monthly' && monthDay) {
    rrule = `FREQ=MONTHLY;BYMONTHDAY=${monthDay}`;
  }

  // Add UNTIL clause if recurrence end date is specified
  if (until && rrule) {
    // Format date as YYYYMMDDT235959Z to ensure the entire day is included
    // This makes UNTIL inclusive of the last occurrence on that date
    const dateStr = until.replace(/-/g, '');
    rrule += `;UNTIL=${dateStr}T235959Z`;
  }

  return rrule;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function EventModalForm({ isOpen, onClose, event, occurrenceDate, onSuccess, onDelete, onEventAdded, onEventUpdated, onExceptionAdded }: EventModalFormProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteRecurringConfirm, setShowDeleteRecurringConfirm] = useState(false);
  
  // Helper function to convert datetime-local string to Date object treating it as company timezone
  // Uses centralized utility for consistency
  const parseAsMountainTime = (dateTimeLocal: string): Date => {
    if (!dateTimeLocal) return new Date();
    try {
      return parseDateTimeLocalAsCompanyTimezone(dateTimeLocal, getCompanyTimezoneSync());
    } catch (error) {
      console.error('Error parsing datetime-local:', error);
      return new Date();
    }
  };

  // Helper function to format date for datetime-local input (company timezone displayed as local)
  // Uses centralized utility for consistency
  const formatDateTimeLocal = (dateTime: string): string => {
    // If already in local format (no timezone), use as-is
    if (!dateTime.includes('Z') && !dateTime.includes('+') && !dateTime.includes('-', 10)) {
      return dateTime.slice(0, 16);
    }
    // Otherwise parse and convert to company timezone for display
    const date = new Date(dateTime);
    return formatDateAsDateTimeLocal(date, getCompanyTimezoneSync());
  };

  // Helper function to get today's date/time in datetime-local format (Mountain Time)
  const getTodayDateTime = (): string => {
    const now = new Date();
    const mtStr = now.toLocaleString('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const [datePart, timePart] = mtStr.split(', ');
    const [month, day, year] = datePart.split('/').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Helper function to get date/time 1 year from now in datetime-local format (Mountain Time)
  const getOneYearFromNow = (): string => {
    const now = new Date();
    const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const mtStr = oneYearLater.toLocaleString('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const [datePart, timePart] = mtStr.split(', ');
    const [month, day, year] = datePart.split('/').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Helper function to add 3 hours to a datetime string (in Mountain Time)
  const addThreeHours = (dateTime: string): string => {
    if (!dateTime) return '';
    // Parse as Mountain Time, add 3 hours in Mountain Time, then format back
    const parsed = parseAsMountainTime(dateTime);
    // Add 3 hours worth of milliseconds
    const threeHoursLater = new Date(parsed.getTime() + 3 * 60 * 60 * 1000);
    return formatDateTimeLocal(threeHoursLater.toISOString());
  };

  // Helper function to extract time from datetime string (HH:mm format)
  const extractTime = (dateTime: string): string => {
    if (!dateTime) return '';
    const timePart = dateTime.split('T')[1];
    if (timePart) {
      return timePart.slice(0, 5); // Extract HH:mm
    }
    return '';
  };

  // Helper function to combine date and time into datetime string
  const combineDateAndTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    return `${date}T${time}`;
  };
  
  // Parse existing RRULE if editing
  const initialRecurrence = parseRRULE(event?.recurrenceRule);
  
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'monthly'>(initialRecurrence.frequency);
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(initialRecurrence.days);
  const [monthDay, setMonthDay] = useState<number>(initialRecurrence.monthDay || new Date().getDate());
  // Recurrence date range (start and end dates for the recurrence pattern)
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<string>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    startDateTime: event?.startDateTime
      ? formatDateTimeLocal(event.startDateTime)
      : getTodayDateTime(),
    endDateTime: event?.endDateTime
      ? formatDateTimeLocal(event.endDateTime)
      : event ? '' : addThreeHours(getTodayDateTime()),
    isAllDay: event?.isAllDay ?? false,
    tags: event?.tags || [],
    isActive: event?.isActive ?? true,
  });

  const validateDateTime = (start: string, end: string | null, isAllDay: boolean): string | null => {
    if (!start) return null;
    if (!end) return null; // End date is optional
    
    if (isAllDay) {
      // For all-day events, compare date strings directly (YYYY-MM-DD format)
      // This avoids timezone conversion issues
      const startDateStr = start.split('T')[0];
      const endDateStr = end.split('T')[0];
      
      // Compare date strings directly - same day is valid for all-day events
      if (endDateStr < startDateStr) {
        return 'End date must be on or after start date';
      }
    } else {
      // For timed events, parse dates as Mountain Time to ensure consistent comparison
      // Note: Cross-day events are allowed (e.g., Tuesday 10am to Wednesday 2am)
      // This is common for bars/restaurants where the business day spans midnight
      const startDateMT = parseAsMountainTime(start);
      const endDateMT = parseAsMountainTime(end);
      
      // End must be after start (not equal)
      // This naturally handles cross-day events since the end date will be on the next calendar day
      if (endDateMT <= startDateMT) {
        return 'End date & time must be after start date & time';
      }
    }
    
    return null;
  };

  const [dateError, setDateError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!event?.id) return;
    
    setLoading(true);
    
    try {
      const isRecurring = !!event.recurrenceRule;
      const isSingleInstance = isRecurring && occurrenceDate;
      
      if (isSingleInstance) {
        // Delete single instance by adding to exceptions
        const occurrenceDateStr = format(occurrenceDate!, 'yyyy-MM-dd');
        const res = await fetch(`/api/events/${event.id}/exception`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: occurrenceDateStr }),
        });
        
        if (res.ok) {
          // Fetch updated event to get new exceptions list
          const updatedRes = await fetch(`/api/events/${event.id}`);
          if (updatedRes.ok) {
            const updatedEvent = await updatedRes.json();
            onExceptionAdded?.(event.id, updatedEvent);
          }
          showToast('Event occurrence deleted successfully', 'success');
          onSuccess?.();
          onClose();
        } else {
          const error = await res.json();
          showToast('Failed to delete occurrence', 'error', error.error || error.details || 'Please try again.');
        }
      } else {
        // Delete entire event
        const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
        
        if (res.ok) {
          showToast('Event deleted successfully', 'success');
          onDelete?.(event.id);
          onSuccess?.();
          onClose();
        } else {
          const error = await res.json();
          showToast('Failed to delete event', 'error', error.error || error.details || 'Please try again.');
        }
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteRecurringEvent = async () => {
    if (!event?.id) return;
    
    setLoading(true);
    
    try {
      // Delete entire recurring event
      const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      
      if (res.ok) {
        showToast('Recurring event deleted successfully', 'success');
        onDelete?.(event.id);
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast('Failed to delete recurring event', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteRecurringConfirm(false);
    }
  };

  useEffect(() => {
    if (event) {
      const parsed = parseRRULE(event.recurrenceRule);
      setRecurrenceType(parsed.frequency);
      setRecurrenceDays(parsed.days);
      if (parsed.monthDay) {
        setMonthDay(parsed.monthDay);
      } else if (parsed.frequency === 'monthly' && event.startDateTime) {
        // Extract day of month from start date
        const startDate = new Date(event.startDateTime);
        setMonthDay(startDate.getDate());
      }
      // Set recurrence dates from parsed RRULE
      if (parsed.frequency !== 'none') {
        // Recurrence starts on the event's start date
        setRecurrenceStartDate(event.startDateTime ? formatDateTimeLocal(event.startDateTime).split('T')[0] : '');
        // Recurrence ends on the UNTIL date if specified, otherwise empty (repeats forever)
        setRecurrenceEndDate(parsed.until || '');
      } else {
        setRecurrenceStartDate('');
        setRecurrenceEndDate('');
      }
      const newFormData = {
        title: event.title || '',
        description: event.description || '',
        startDateTime: event.startDateTime
          ? formatDateTimeLocal(event.startDateTime)
          : '',
        endDateTime: event.endDateTime
          ? formatDateTimeLocal(event.endDateTime)
          : '',
        isAllDay: event.isAllDay ?? false,
        tags: event.tags || [],
        isActive: event.isActive ?? true,
      };
      setFormData(newFormData);
      // Validate dates if both exist
      if (newFormData.startDateTime && newFormData.endDateTime) {
        const error = validateDateTime(newFormData.startDateTime, newFormData.endDateTime, newFormData.isAllDay);
        setDateError(error);
      } else {
        setDateError(null);
      }
    } else {
      const todayDateTime = getTodayDateTime();
      const todayDate = todayDateTime.split('T')[0];
      setRecurrenceType('none');
      setRecurrenceDays([]);
      setMonthDay(new Date().getDate());
      setRecurrenceStartDate('');
      setRecurrenceEndDate('');
      setFormData({
        title: '',
        description: '',
        startDateTime: todayDateTime,
        endDateTime: `${todayDate}T23:59`, // Default to same day for all-day events
        isAllDay: true, // Default to all-day for new events
        tags: [],
        isActive: true,
      });
      setDateError(null);
    }
  }, [event, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setShowDeleteRecurringConfirm(false);
    }
  }, [isOpen]);

  const toggleRecurrenceDay = (day: string) => {
    if (recurrenceDays.includes(day)) {
      setRecurrenceDays(recurrenceDays.filter(d => d !== day));
    } else {
      setRecurrenceDays([...recurrenceDays, day]);
    }
  };

  const handleStartDateTimeChange = (value: string) => {
    // Update recurrence start date if recurrence is enabled
    if ((recurrenceType === 'weekly' || recurrenceType === 'monthly') && value) {
      setRecurrenceStartDate(value.split('T')[0]);
    }
    // If weekly recurrence is selected and no days are selected, auto-select the day of the new start date
    if (recurrenceType === 'weekly' && recurrenceDays.length === 0 && value) {
      const startDateMT = parseAsMountainTime(value);
      const mtFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver',
        weekday: 'long'
      });
      const dayName = mtFormatter.format(startDateMT);
      const dayMap: Record<string, string> = {
        'Sunday': 'Sunday',
        'Monday': 'Monday',
        'Tuesday': 'Tuesday',
        'Wednesday': 'Wednesday',
        'Thursday': 'Thursday',
        'Friday': 'Friday',
        'Saturday': 'Saturday'
      };
      const mappedDayName = dayMap[dayName];
      if (mappedDayName && WEEKDAYS.includes(mappedDayName)) {
        setRecurrenceDays([mappedDayName]);
      }
    }
    // If creating a new event (no event.id) and not all-day, auto-update endDateTime to 3 hours later
    const newEndDateTime = !event?.id && value && !formData.isAllDay ? addThreeHours(value) : formData.endDateTime;
    const newFormData = { ...formData, startDateTime: value, endDateTime: newEndDateTime };
    setFormData(newFormData);
    if (newFormData.endDateTime) {
      const error = validateDateTime(value, newFormData.endDateTime, newFormData.isAllDay);
      setDateError(error);
    } else {
      setDateError(null);
    }
  };

  const handleEndDateTimeChange = (value: string) => {
    const newFormData = { ...formData, endDateTime: value };
    setFormData(newFormData);
    if (value && newFormData.startDateTime) {
      const error = validateDateTime(newFormData.startDateTime, value, newFormData.isAllDay);
      setDateError(error);
    } else {
      setDateError(null);
    }
  };

  const handleAllDayChange = (checked: boolean) => {
    let updatedEndDateTime = formData.endDateTime;
    
    // If switching to all-day, set end date to same day as start (if start exists)
    if (checked && formData.startDateTime) {
      const startDate = formData.startDateTime.split('T')[0];
      updatedEndDateTime = `${startDate}T23:59`;
    }
    // If switching from all-day to timed, add 3 hours to start time
    else if (!checked && formData.startDateTime && !formData.endDateTime) {
      updatedEndDateTime = addThreeHours(formData.startDateTime);
    }
    
    const newFormData = { ...formData, isAllDay: checked, endDateTime: updatedEndDateTime };
    setFormData(newFormData);
    if (newFormData.startDateTime && newFormData.endDateTime) {
      const error = validateDateTime(newFormData.startDateTime, newFormData.endDateTime, checked);
      setDateError(error);
    } else {
      setDateError(null);
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    // Validate dates before submission
    if (formData.endDateTime) {
      const error = validateDateTime(formData.startDateTime, formData.endDateTime, formData.isAllDay);
      if (error) {
        setDateError(error);
        showToast('Invalid date/time', 'error', error);
        return;
      }
    }
    
    setLoading(true);

    try {
      const url = event?.id ? `/api/events/${event.id}` : '/api/events';
      const method = event?.id ? 'PUT' : 'POST';

      // Build recurrence rule with end date if specified
      const untilDate = recurrenceEndDate ? recurrenceEndDate.replace(/-/g, '') : undefined;
      const recurrenceRule = buildRRULE(recurrenceType, recurrenceDays, recurrenceType === 'monthly' ? monthDay : undefined, untilDate);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          venueArea: 'bar', // Default value for API compatibility
          recurrenceRule,
          // Convert datetime-local strings to UTC, treating them as Mountain Time
          startDateTime: parseAsMountainTime(formData.startDateTime).toISOString(),
          endDateTime: formData.endDateTime ? parseAsMountainTime(formData.endDateTime).toISOString() : null,
        }),
      });

      if (res.ok) {
        const eventData = await res.json();
        showToast(
          event?.id ? 'Event updated successfully' : 'Event created successfully',
          'success'
        );
        
        // Call appropriate callback instead of refreshing
        if (event?.id) {
          onEventUpdated?.(eventData);
        } else {
          onEventAdded?.(eventData);
        }
        
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast(
          event?.id ? 'Failed to update event' : 'Failed to create event',
          'error',
          error.error || error.details || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving the event.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event?.id ? 'Edit Event' : 'Create Event'}
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Left Column */}
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 sm:p-4 backdrop-blur-sm space-y-2.5 sm:space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Event Status</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Control whether this event appears on your public calendar.
                  </p>
                </div>
                <StatusToggle
                  type="active"
                  value={formData.isActive}
                  onChange={(value) => setFormData({ ...formData, isActive: value })}
                  className="shrink-0"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="title" className="text-sm font-medium text-gray-900 dark:text-white">
                    Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    maxLength={60}
                    className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-3 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-h-[44px] touch-manipulation"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.title.length}/60 characters
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-white">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    maxLength={150}
                    className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none min-h-[60px] touch-manipulation"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.description.length}/150 characters
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 sm:p-4 backdrop-blur-sm space-y-2.5 sm:space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Schedule</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {!event?.id && (recurrenceType === 'weekly' || recurrenceType === 'monthly')
                      ? 'Set the time for this recurring event. The date range is controlled by the recurrence settings.'
                      : 'Choose the start and end for this event. Cross-day events are supported (e.g., Tuesday 10am to Wednesday 2am).'}
                  </p>
                </div>
                {(!event?.id && (recurrenceType === 'weekly' || recurrenceType === 'monthly')) ? null : (
                  <label
                    htmlFor="isAllDay"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs font-medium text-gray-900 dark:text-white shadow-inner cursor-pointer transition-colors hover:border-blue-400/70 focus-within:ring-2 focus-within:ring-blue-500/30 min-h-[44px] touch-manipulation"
                  >
                    <input
                      type="checkbox"
                      id="isAllDay"
                      checked={formData.isAllDay}
                      onChange={(e) => handleAllDayChange(e.target.checked)}
                      className="h-4 w-4 sm:h-3.5 sm:w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    All Day Event
                  </label>
                )}
              </div>

              {/* For new recurring events, show only time pickers */}
              {!event?.id && (recurrenceType === 'weekly' || recurrenceType === 'monthly') ? (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Start Time *
                    </label>
                    <TimePicker
                      value={extractTime(formData.startDateTime)}
                      onChange={(time) => {
                        // Use recurrence start date if set, otherwise use today's date
                        const date = recurrenceStartDate || getTodayDateTime().split('T')[0];
                        handleStartDateTimeChange(combineDateAndTime(date, time));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      End Time
                    </label>
                    <TimePicker
                      value={extractTime(formData.endDateTime)}
                      onChange={(time) => {
                        // Use recurrence start date if set, otherwise use today's date
                        const date = recurrenceStartDate || getTodayDateTime().split('T')[0];
                        handleEndDateTimeChange(combineDateAndTime(date, time));
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="relative isolate">
                    {formData.isAllDay ? (
                      <DatePicker
                        label="Start Date"
                        value={formData.startDateTime ? formData.startDateTime.split('T')[0] : ''}
                        onChange={(value) => handleStartDateTimeChange(value ? `${value}T00:00` : '')}
                        required
                        dateOnly={true}
                      />
                    ) : (
                      <DateTimePicker
                        label="Start Date & Time"
                        value={formData.startDateTime || ''}
                        onChange={handleStartDateTimeChange}
                        required
                      />
                    )}
                  </div>
                  <div className="relative isolate">
                    {formData.isAllDay ? (
                      <DatePicker
                        label="End Date"
                        value={formData.endDateTime ? formData.endDateTime.split('T')[0] : (formData.startDateTime ? formData.startDateTime.split('T')[0] : '')}
                        onChange={(value) => {
                          // For all-day events, use the selected date with end of day time, or same as start if not set
                          if (value) {
                            handleEndDateTimeChange(`${value}T23:59`);
                          } else if (formData.startDateTime) {
                            // If cleared, default to same as start date
                            const startDate = formData.startDateTime.split('T')[0];
                            handleEndDateTimeChange(`${startDate}T23:59`);
                          } else {
                            handleEndDateTimeChange('');
                          }
                        }}
                        min={formData.startDateTime ? formData.startDateTime.split('T')[0] : undefined}
                        dateOnly={true}
                      />
                    ) : (
                      <DateTimePicker
                        label="End Date & Time"
                        value={formData.endDateTime || ''}
                        onChange={handleEndDateTimeChange}
                        min={formData.startDateTime || undefined}
                      />
                    )}
                  </div>
                </div>
              )}
              {dateError && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {dateError}
                </p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 sm:p-4 backdrop-blur-sm space-y-2.5 sm:space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Recurrence</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Define how this event repeats across your calendar.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <label
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    recurrenceType === 'none'
                      ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500/80 dark:bg-blue-900/30 dark:text-blue-200 shadow-sm'
                      : 'border-gray-200/70 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-blue-400/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="recurrence"
                    checked={recurrenceType === 'none'}
                    onChange={() => {
                      setRecurrenceType('none');
                      setRecurrenceDays([]);
                      setRecurrenceStartDate('');
                      setRecurrenceEndDate('');
                    }}
                    className="sr-only"
                  />
                  One-time event
                </label>
                <label
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    recurrenceType === 'weekly'
                      ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500/80 dark:bg-blue-900/30 dark:text-blue-200 shadow-sm'
                      : 'border-gray-200/70 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-blue-400/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="recurrence"
                    checked={recurrenceType === 'weekly'}
                    onChange={() => {
                      setRecurrenceType('weekly');
                      // Set recurrence start date to the event start date or today
                      const startDate = formData.startDateTime 
                        ? formData.startDateTime.split('T')[0] 
                        : getTodayDateTime().split('T')[0];
                      setRecurrenceStartDate(startDate);
                      
                      // For new events, initialize recurrence start date if not set
                      if (!event?.id && !recurrenceStartDate) {
                        setRecurrenceStartDate(startDate);
                      }
                      
                      if (recurrenceDays.length === 0 && formData.startDateTime) {
                        // Parse the datetime-local string as Mountain Time to get correct day of week
                        const startDateMT = parseAsMountainTime(formData.startDateTime);
                        // Get the day of week in Mountain Time by formatting the date in MT timezone
                        const mtFormatter = new Intl.DateTimeFormat('en-US', {
                          timeZone: 'America/Denver',
                          weekday: 'long'
                        });
                        const dayName = mtFormatter.format(startDateMT);
                        // Map full day name to our day names (they should match, but ensure consistency)
                        const dayMap: Record<string, string> = {
                          'Sunday': 'Sunday',
                          'Monday': 'Monday',
                          'Tuesday': 'Tuesday',
                          'Wednesday': 'Wednesday',
                          'Thursday': 'Thursday',
                          'Friday': 'Friday',
                          'Saturday': 'Saturday'
                        };
                        const mappedDayName = dayMap[dayName];
                        if (mappedDayName && WEEKDAYS.includes(mappedDayName)) {
                          setRecurrenceDays([mappedDayName]);
                        }
                      }
                    }}
                    className="sr-only"
                  />
                  Weekly
                </label>
                <label
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    recurrenceType === 'monthly'
                      ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500/80 dark:bg-blue-900/30 dark:text-blue-200 shadow-sm'
                      : 'border-gray-200/70 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-blue-400/70'
                  }`}
                >
                  <input
                    type="radio"
                    name="recurrence"
                    checked={recurrenceType === 'monthly'}
                    onChange={() => {
                      setRecurrenceType('monthly');
                      // Set recurrence start date to the event start date or today
                      const startDate = formData.startDateTime 
                        ? formData.startDateTime.split('T')[0] 
                        : getTodayDateTime().split('T')[0];
                      setRecurrenceStartDate(startDate);
                      
                      // For new events, initialize recurrence start date if not set
                      if (!event?.id && !recurrenceStartDate) {
                        setRecurrenceStartDate(startDate);
                      }
                      
                      if (formData.startDateTime) {
                        const startDateMT = parseAsMountainTime(formData.startDateTime);
                        const dayOfMonth = startDateMT.getDate();
                        setMonthDay(dayOfMonth);
                      } else {
                        // Default to today's day of month
                        setMonthDay(new Date().getDate());
                      }
                    }}
                    className="sr-only"
                  />
                  Monthly
                </label>
              </div>

              {recurrenceType === 'weekly' && (
                <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-3 shadow-inner space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Repeat on</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {WEEKDAYS.map((day) => {
                      const isSelected = recurrenceDays.includes(day);
                      return (
                        <label
                          key={day}
                          className={`flex items-center justify-center rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                              : 'border-gray-200/70 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-900/40 hover:border-blue-400/70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecurrenceDay(day)}
                            className="sr-only"
                          />
                          {day}
                        </label>
                      );
                    })}
                  </div>
                  {recurrenceDays.length === 0 && (
                    <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      Select at least one day for the recurrence.
                    </p>
                  )}
                </div>
              )}

              {recurrenceType === 'monthly' && (
                <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-3 shadow-inner space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Repeat on day</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={monthDay}
                      onChange={(e) => setMonthDay(parseInt(e.target.value))}
                      className="rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}
                          {day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-600 dark:text-gray-300">of each month</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Event repeats on the {monthDay}
                    {monthDay === 1 || monthDay === 21 || monthDay === 31 ? 'st' : monthDay === 2 || monthDay === 22 ? 'nd' : monthDay === 3 || monthDay === 23 ? 'rd' : 'th'} of every month.
                  </p>
                </div>
              )}

              {(recurrenceType === 'weekly' || recurrenceType === 'monthly') && (
                <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-3 shadow-inner space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400 mb-2">Repeating Settings</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                      Set when this recurrence pattern starts and stops. This is separate from the event's start/end times above.
                    </p>
                  </div>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <DatePicker
                        label="Repeat From"
                        value={recurrenceStartDate || (formData.startDateTime ? formData.startDateTime.split('T')[0] : '')}
                        onChange={(value) => {
                          setRecurrenceStartDate(value || '');
                          // For new recurring events, update the datetime with the new date but keep the time
                          if (value && !event?.id && (recurrenceType === 'weekly' || recurrenceType === 'monthly')) {
                            const startTime = extractTime(formData.startDateTime) || '00:00';
                            const endTime = extractTime(formData.endDateTime) || '23:59';
                            handleStartDateTimeChange(combineDateAndTime(value, startTime));
                            if (formData.endDateTime) {
                              handleEndDateTimeChange(combineDateAndTime(value, endTime));
                            }
                          } else if (value && !formData.startDateTime) {
                            // For one-time events or when editing, update event start date if empty
                            handleStartDateTimeChange(value + 'T00:00');
                          }
                        }}
                        max={recurrenceEndDate || undefined}
                        required
                        dateOnly={true}
                      />
                    </div>
                    <div>
                      <DatePicker
                        label="Repeat Until"
                        value={recurrenceEndDate}
                        onChange={(value) => setRecurrenceEndDate(value || '')}
                        min={recurrenceStartDate || (formData.startDateTime ? formData.startDateTime.split('T')[0] : undefined)}
                        dateOnly={true}
                      />
                      {!recurrenceEndDate && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          Leave empty to repeat forever
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2 shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700">
            {event?.id && (
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:mr-auto order-3 sm:order-1">
                {event?.recurrenceRule && occurrenceDate ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={loading}
                      className="px-4 py-3 sm:px-3 sm:py-1.5 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm sm:text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer touch-manipulation min-h-[44px]"
                    >
                      Delete This Occurrence
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteRecurringConfirm(true)}
                      disabled={loading}
                      className="px-4 py-3 sm:px-3 sm:py-1.5 bg-red-700 dark:bg-red-700 hover:bg-red-800 dark:hover:bg-red-600 text-white rounded-lg text-sm sm:text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer touch-manipulation min-h-[44px]"
                    >
                      Delete Recurring Event
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                    className="px-4 py-3 sm:px-3 sm:py-1.5 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm sm:text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer touch-manipulation min-h-[44px]"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 sm:px-3 sm:py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm sm:text-xs font-semibold transition-colors cursor-pointer touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-3 sm:px-3 sm:py-1.5 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm sm:text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20 cursor-pointer touch-manipulation min-h-[44px]"
              >
                {loading ? (event?.id ? 'Saving...' : 'Creating...') : (event?.id ? 'Save' : 'Create')}
              </button>
            </div>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={event?.recurrenceRule && occurrenceDate ? 'Delete Event Occurrence' : 'Delete Event'}
        message={
          event?.recurrenceRule && occurrenceDate
            ? `Are you sure you want to delete this occurrence of "${event.title}"? This will only remove this specific instance, not the entire recurring event.`
            : `Are you sure you want to delete "${event?.title}"? This action cannot be undone.`
        }
        confirmText={loading ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        variant="danger"
      />
      <ConfirmationDialog
        isOpen={showDeleteRecurringConfirm}
        onClose={() => setShowDeleteRecurringConfirm(false)}
        onConfirm={handleDeleteRecurringEvent}
        title="Delete Recurring Event"
        message={`Are you sure you want to delete the entire recurring event "${event?.title}"? This will remove all occurrences, past and future. This action cannot be undone.`}
        confirmText={loading ? 'Deleting...' : 'Delete All'}
        cancelText="Cancel"
        variant="danger"
      />
    </Modal>
  );
}

