'use client';

import { useState, FormEvent, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';
import DateTimePicker from '@/components/date-time-picker';
import DatePicker from '@/components/date-picker';

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
function parseRRULE(rrule: string | null | undefined): { frequency: 'none' | 'weekly' | 'monthly'; days: string[]; monthDay?: number } {
  if (!rrule) {
    return { frequency: 'none', days: [] };
  }

  const freqMatch = rrule.match(/FREQ=(\w+)/);
  const freq = freqMatch ? freqMatch[1].toLowerCase() : 'none';
  
  if (freq === 'monthly') {
    // Check for BYMONTHDAY (day of month)
    const monthDayMatch = rrule.match(/BYMONTHDAY=(\d+)/);
    if (monthDayMatch) {
      return { frequency: 'monthly', days: [], monthDay: parseInt(monthDayMatch[1]) };
    }
    // Check for BYDAY (nth weekday of month)
    const bydayMatch = rrule.match(/BYDAY=([^;]+)/);
    if (bydayMatch) {
      // For monthly, we'll just return monthly with empty days (simplified)
      return { frequency: 'monthly', days: [] };
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
    return { frequency: 'weekly', days };
  }

  return { frequency: 'none', days: [] };
}

// Helper function to build RRULE from user selections
function buildRRULE(frequency: string, days: string[], monthDay?: number): string {
  if (frequency === 'none') {
    return '';
  }

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
    return `FREQ=WEEKLY;BYDAY=${byday}`;
  }

  if (frequency === 'monthly' && monthDay) {
    return `FREQ=MONTHLY;BYMONTHDAY=${monthDay}`;
  }

  return '';
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function EventModalForm({ isOpen, onClose, event, occurrenceDate, onSuccess, onDelete, onEventAdded, onEventUpdated, onExceptionAdded }: EventModalFormProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Helper function to convert datetime-local string to Date object treating it as Mountain Time
  // datetime-local format: "YYYY-MM-DDTHH:mm" (no timezone info)
  const parseAsMountainTime = (dateTimeLocal: string): Date => {
    if (!dateTimeLocal) return new Date();
    
    // Parse the datetime-local string
    const [datePart, timePart] = dateTimeLocal.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
    
    // Create a test date to determine if DST is active on that date
    // We'll test both possible offsets and see which one gives us the correct Mountain Time
    // MT is UTC-7 (MST) or UTC-6 (MDT)
    for (let offsetHours = 6; offsetHours <= 7; offsetHours++) {
      const candidateUTC = new Date(Date.UTC(year, month - 1, day, hours + offsetHours, minutes, 0));
      const mtStr = candidateUTC.toLocaleString('en-US', { 
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const [candidateDate, candidateTime] = mtStr.split(', ');
      const targetDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
      const targetTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      
      if (candidateDate === targetDate && candidateTime === targetTime) {
        return candidateUTC;
      }
    }
    
    // Fallback: use UTC-7 (MST) - most common case
    return new Date(Date.UTC(year, month - 1, day, hours + 7, minutes, 0));
  };

  // Helper function to format date for datetime-local input (Mountain Time displayed as local)
  const formatDateTimeLocal = (dateTime: string): string => {
    // If already in local format (no timezone), use as-is
    if (!dateTime.includes('Z') && !dateTime.includes('+') && !dateTime.includes('-', 10)) {
      return dateTime.slice(0, 16);
    }
    // Otherwise parse and convert to Mountain Time for display
    const date = new Date(dateTime);
    // Format as Mountain Time
    const mtStr = date.toLocaleString('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Parse the formatted string: "MM/DD/YYYY, HH:MM"
    const [datePart, timePart] = mtStr.split(', ');
    const [month, day, year] = datePart.split('/').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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
  
  // Parse existing RRULE if editing
  const initialRecurrence = parseRRULE(event?.recurrenceRule);
  
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'monthly'>(initialRecurrence.frequency);
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(initialRecurrence.days);
  const [monthDay, setMonthDay] = useState<number>(initialRecurrence.monthDay || new Date().getDate());
  
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
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isAllDay) {
      // For all-day events, compare dates only (ignore time)
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      if (endDateOnly < startDateOnly) {
        return 'End date must be on or after start date';
      }
    } else {
      // For timed events, compare full datetime
      if (endDate <= startDate) {
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
      setRecurrenceType('none');
      setRecurrenceDays([]);
      setMonthDay(new Date().getDate());
      setFormData({
        title: '',
        description: '',
        startDateTime: todayDateTime,
        endDateTime: addThreeHours(todayDateTime),
        isAllDay: false,
        tags: [],
        isActive: true,
      });
      setDateError(null);
    }
  }, [event, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
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
    const newFormData = { ...formData, isAllDay: checked };
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

      const recurrenceRule = buildRRULE(recurrenceType, recurrenceDays, recurrenceType === 'monthly' ? monthDay : undefined);

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
      <form onSubmit={handleSubmit} className="space-y-4">
        <StatusToggle
          type="active"
          value={formData.isActive}
          onChange={(value) => setFormData({ ...formData, isActive: value })}
          label="Status"
        />

        <div>
          <label htmlFor="title" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={formData.isAllDay}
              onChange={(e) => handleAllDayChange(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isAllDay" className="cursor-pointer text-sm text-gray-900 dark:text-white">
              All Day Event
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
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
            <div>
              {formData.isAllDay ? (
                <DatePicker
                  label="End Date"
                  value={formData.endDateTime ? formData.endDateTime.split('T')[0] : ''}
                  onChange={(value) => handleEndDateTimeChange(value ? `${value}T23:59` : '')}
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
          {dateError && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{dateError}</p>
          )}

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Repeats
          </label>
          <div className="space-y-2">
            <div className="flex gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence"
                  checked={recurrenceType === 'none'}
                  onChange={() => {
                    setRecurrenceType('none');
                    setRecurrenceDays([]);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900 dark:text-white">One-time event</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence"
                  checked={recurrenceType === 'weekly'}
                  onChange={() => {
                    setRecurrenceType('weekly');
                    // If creating new event (no event.id), default to 1 year from now
                    if (!event?.id) {
                      const oneYearLater = getOneYearFromNow();
                      const newEndDateTime = !formData.isAllDay ? addThreeHours(oneYearLater) : formData.endDateTime;
                      setFormData({ ...formData, startDateTime: oneYearLater, endDateTime: newEndDateTime });
                    }
                    // If no days selected and startDateTime exists, default to the day of the week
                    if (recurrenceDays.length === 0 && formData.startDateTime) {
                      const startDate = new Date(formData.startDateTime);
                      const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
                      const dayMap: Record<number, string> = {
                        0: 'Sunday',
                        1: 'Monday',
                        2: 'Tuesday',
                        3: 'Wednesday',
                        4: 'Thursday',
                        5: 'Friday',
                        6: 'Saturday'
                      };
                      const dayName = dayMap[dayOfWeek];
                      if (dayName && WEEKDAYS.includes(dayName)) {
                        setRecurrenceDays([dayName]);
                      }
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900 dark:text-white">Weekly</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="recurrence"
                  checked={recurrenceType === 'monthly'}
                  onChange={() => {
                    setRecurrenceType('monthly');
                    // If creating new event (no event.id), default to 1 year from now
                    if (!event?.id) {
                      const oneYearLater = getOneYearFromNow();
                      const newEndDateTime = !formData.isAllDay ? addThreeHours(oneYearLater) : formData.endDateTime;
                      setFormData({ ...formData, startDateTime: oneYearLater, endDateTime: newEndDateTime });
                    }
                    // If monthDay hasn't been set from existing RRULE and startDateTime exists, default to the day of month
                    if (formData.startDateTime) {
                      const startDate = new Date(formData.startDateTime);
                      const dayOfMonth = startDate.getDate();
                      setMonthDay(dayOfMonth);
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900 dark:text-white">Monthly</span>
              </label>
            </div>

            {recurrenceType === 'weekly' && (
              <div className="ml-4 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">Repeat on:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {WEEKDAYS.map((day) => (
                    <label key={day} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recurrenceDays.includes(day)}
                        onChange={() => toggleRecurrenceDay(day)}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-xs text-gray-900 dark:text-white">{day}</span>
                    </label>
                  ))}
                </div>
                {recurrenceDays.length === 0 && (
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1.5">Select at least one day</p>
                )}
              </div>
            )}

            {recurrenceType === 'monthly' && (
              <div className="ml-4 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">Repeat on day of month:</p>
                <div className="flex items-center gap-2">
                  <select
                    value={monthDay}
                    onChange={(e) => setMonthDay(parseInt(e.target.value))}
                    className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}
                        {day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-600 dark:text-gray-400">of each month</span>
                </div>
                <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1.5">
                  Event will repeat on the {monthDay}
                  {monthDay === 1 || monthDay === 21 || monthDay === 31 ? 'st' : monthDay === 2 || monthDay === 22 ? 'nd' : monthDay === 3 || monthDay === 23 ? 'rd' : 'th'} day of every month
                </p>
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {event?.id && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 mr-auto"
            >
              {event?.recurrenceRule && occurrenceDate ? 'Delete This Occurrence' : 'Delete'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
          >
            {loading ? (event?.id ? 'Saving...' : 'Creating...') : (event?.id ? 'Save' : 'Create')}
          </button>
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
    </Modal>
  );
}

