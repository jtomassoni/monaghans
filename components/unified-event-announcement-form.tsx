'use client';

import { useState, FormEvent, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';
import DateTimePicker from '@/components/date-time-picker';
import DatePicker from '@/components/date-picker';
import { FaCalendarAlt, FaBullhorn } from 'react-icons/fa';
import { formatDateAsDateTimeLocal, parseDateTimeLocalAsCompanyTimezone, getCompanyTimezoneSync } from '@/lib/timezone';

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

interface Announcement {
  id?: string;
  title: string;
  body: string;
  publishAt: string | null;
  expiresAt?: string | null;
  isPublished?: boolean;
  crossPostFacebook: boolean;
  crossPostInstagram: boolean;
  ctaText?: string;
  ctaUrl?: string;
}

type ItemType = 'event' | 'announcement';

interface UnifiedEventAnnouncementFormProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Event | Announcement;
  itemType?: ItemType; // For new items, specify the type
  defaultDate?: Date; // Default date when creating from calendar
  defaultIsAllDay?: boolean; // For events created from calendar
  onSuccess?: () => void;
  onDelete?: (id: string, type: ItemType) => void;
  onEventAdded?: (event: any) => void;
  onEventUpdated?: (event: any) => void;
  onAnnouncementAdded?: (announcement: any) => void;
  onAnnouncementUpdated?: (announcement: any) => void;
  occurrenceDate?: Date; // For recurring events
}

// Helper functions from event-modal-form.tsx
function parseRRULE(rrule: string | null | undefined): { frequency: 'none' | 'weekly' | 'monthly'; days: string[]; monthDay?: number; until?: string } {
  if (!rrule) {
    return { frequency: 'none', days: [] };
  }

  const freqMatch = rrule.match(/FREQ=(\w+)/);
  const freq = freqMatch ? freqMatch[1].toLowerCase() : 'none';
  
  const untilMatch = rrule.match(/UNTIL=([^;]+)/);
  let untilDate: string | undefined;
  if (untilMatch) {
    const untilStr = untilMatch[1];
    if (untilStr.includes('T')) {
      const datePart = untilStr.split('T')[0];
      const year = datePart.substring(0, 4);
      const month = datePart.substring(4, 6);
      const day = datePart.substring(6, 8);
      untilDate = `${year}-${month}-${day}`;
    } else {
      const year = untilStr.substring(0, 4);
      const month = untilStr.substring(4, 6);
      const day = untilStr.substring(6, 8);
      untilDate = `${year}-${month}-${day}`;
    }
  }
  
  if (freq === 'monthly') {
    const monthDayMatch = rrule.match(/BYMONTHDAY=(\d+)/);
    if (monthDayMatch) {
      return { frequency: 'monthly', days: [], monthDay: parseInt(monthDayMatch[1]), until: untilDate };
    }
    return { frequency: 'monthly', days: [], until: untilDate };
  }
  
  if (freq === 'weekly') {
    const daysMatch = rrule.match(/BYDAY=([^;]+)/);
    const days = daysMatch ? daysMatch[1].split(',').map(d => {
      const dayMap: Record<string, string> = {
        'MO': 'Monday', 'TU': 'Tuesday', 'WE': 'Wednesday', 'TH': 'Thursday',
        'FR': 'Friday', 'SA': 'Saturday', 'SU': 'Sunday'
      };
      return dayMap[d.trim()] || '';
    }).filter(Boolean) : [];
    return { frequency: 'weekly', days, until: untilDate };
  }

  return { frequency: 'none', days: [], until: untilDate };
}

function buildRRULE(frequency: string, days: string[], monthDay?: number, until?: string): string {
  if (frequency === 'none') {
    return '';
  }

  let rrule = '';
  
  if (frequency === 'weekly' && days.length > 0) {
    const dayMap: Record<string, string> = {
      'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE', 'Thursday': 'TH',
      'Friday': 'FR', 'Saturday': 'SA', 'Sunday': 'SU'
    };
    const byday = days.map(d => dayMap[d] || '').filter(Boolean).join(',');
    rrule = `FREQ=WEEKLY;BYDAY=${byday}`;
  } else if (frequency === 'monthly' && monthDay) {
    rrule = `FREQ=MONTHLY;BYMONTHDAY=${monthDay}`;
  }

  if (until && rrule) {
    // Format date as YYYYMMDDT235959Z to ensure the entire day is included
    // This makes UNTIL inclusive of the last occurrence on that date
    const dateStr = until.replace(/-/g, '');
    rrule += `;UNTIL=${dateStr}T235959Z`;
  }

  return rrule;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Helper function to convert UTC ISO string to datetime-local string (Mountain Time)
function convertUTCToMountainTimeLocal(utcISO: string): string {
  const utcDate = new Date(utcISO);
  return formatDateAsDateTimeLocal(utcDate, getCompanyTimezoneSync());
}

// Helper function to convert datetime-local string (interpreted as company timezone) to UTC ISO string
function convertMountainTimeToUTC(datetimeLocal: string): string {
  try {
    const date = parseDateTimeLocalAsCompanyTimezone(datetimeLocal, getCompanyTimezoneSync());
    return date.toISOString();
  } catch (error) {
    console.error('Error converting datetime-local to UTC:', error);
    return new Date().toISOString();
  }
}

// Helper function to parse datetime-local string as company timezone
function parseAsMountainTime(dateTimeLocal: string): Date {
  if (!dateTimeLocal) return new Date();
  try {
    return parseDateTimeLocalAsCompanyTimezone(dateTimeLocal, getCompanyTimezoneSync());
  } catch (error) {
    console.error('Error parsing datetime-local:', error);
    return new Date();
  }
}

// Helper function to format date for datetime-local input (company timezone displayed as local)
function formatDateTimeLocal(dateTime: string): string {
  if (!dateTime.includes('Z') && !dateTime.includes('+') && !dateTime.includes('-', 10)) {
    return dateTime.slice(0, 16);
  }
  const date = new Date(dateTime);
  return formatDateAsDateTimeLocal(date, getCompanyTimezoneSync());
}

// Helper function to get today's date/time in datetime-local format (Mountain Time)
function getTodayDateTime(): string {
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
}

// Helper function to add 3 hours to a datetime string (in Mountain Time)
function addThreeHours(dateTime: string): string {
  if (!dateTime) return '';
  const parsed = parseAsMountainTime(dateTime);
  const threeHoursLater = new Date(parsed.getTime() + 3 * 60 * 60 * 1000);
  return formatDateTimeLocal(threeHoursLater.toISOString());
}

export default function UnifiedEventAnnouncementForm({
  isOpen,
  onClose,
  item,
  itemType: initialItemType,
  defaultDate,
  defaultIsAllDay,
  onSuccess,
  onDelete,
  onEventAdded,
  onEventUpdated,
  onAnnouncementAdded,
  onAnnouncementUpdated,
  occurrenceDate,
}: UnifiedEventAnnouncementFormProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteRecurringConfirm, setShowDeleteRecurringConfirm] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);

  // Determine item type
  const getItemType = (): ItemType => {
    if (item) {
      if ('startDateTime' in item) {
        return 'event';
      }
      if ('body' in item) {
        return 'announcement';
      }
    }
    return initialItemType || 'event';
  };

  const [currentItemType, setCurrentItemType] = useState<ItemType>(getItemType());

  // Event form state
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    isAllDay: false,
    tags: [] as string[],
    isActive: true,
  });

  // Event recurrence state
  const initialRecurrence = parseRRULE((item as Event)?.recurrenceRule);
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'monthly'>(initialRecurrence.frequency);
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(initialRecurrence.days);
  const [monthDay, setMonthDay] = useState<number>(initialRecurrence.monthDay || new Date().getDate());
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<string>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');

  // Announcement form state
  const [announcementData, setAnnouncementData] = useState({
    title: '',
    body: '',
    publishAt: '',
    expiresAt: '',
    crossPostFacebook: false,
    crossPostInstagram: false,
    ctaText: '',
    ctaUrl: '',
  });

  const [dateError, setDateError] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (item) {
      if ('startDateTime' in item) {
        // It's an event
        const event = item as Event;
        const parsed = parseRRULE(event.recurrenceRule);
        setRecurrenceType(parsed.frequency);
        setRecurrenceDays(parsed.days);
        if (parsed.monthDay) {
          setMonthDay(parsed.monthDay);
        }
        if (parsed.frequency !== 'none') {
          setRecurrenceStartDate(event.startDateTime ? formatDateTimeLocal(event.startDateTime).split('T')[0] : '');
          setRecurrenceEndDate(parsed.until || '');
        }
        setEventData({
          title: event.title || '',
          description: event.description || '',
          startDateTime: event.startDateTime ? formatDateTimeLocal(event.startDateTime) : '',
          endDateTime: event.endDateTime ? formatDateTimeLocal(event.endDateTime) : '',
          isAllDay: event.isAllDay ?? false,
          tags: event.tags || [],
          isActive: event.isActive ?? true,
        });
        setCurrentItemType('event');
      } else if ('body' in item) {
        // It's an announcement
        const announcement = item as Announcement;
        const hasCTA = !!(announcement.ctaText && announcement.ctaUrl);
        setShowCTA(hasCTA);
        setAnnouncementData({
          title: announcement.title || '',
          body: announcement.body || '',
          publishAt: announcement.publishAt ? convertUTCToMountainTimeLocal(announcement.publishAt) : '',
          expiresAt: announcement.expiresAt ? convertUTCToMountainTimeLocal(announcement.expiresAt) : '',
          crossPostFacebook: announcement.crossPostFacebook ?? false,
          crossPostInstagram: announcement.crossPostInstagram ?? false,
          ctaText: announcement.ctaText || '',
          ctaUrl: announcement.ctaUrl || '',
        });
        setCurrentItemType('announcement');
      }
    } else {
      // New item
      setCurrentItemType(initialItemType || 'event');
      
      if (initialItemType === 'announcement') {
        const now = new Date();
        const publishAt = new Date(now);
        publishAt.setMinutes(0, 0, 0);
        const expiresAt = new Date(publishAt);
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        setAnnouncementData({
          title: '',
          body: '',
          publishAt: formatDateTimeLocal(publishAt.toISOString()),
          expiresAt: formatDateTimeLocal(expiresAt.toISOString()),
          crossPostFacebook: false,
          crossPostInstagram: false,
          ctaText: '',
          ctaUrl: '',
        });
        setShowCTA(false);
      } else {
        // Event
        const eventDate = defaultDate || new Date();
        const startDateTime = new Date(eventDate);
        
        if (defaultIsAllDay) {
          startDateTime.setHours(0, 0, 0, 0);
        } else {
          if (!defaultDate || (defaultDate.getHours() === 0 && defaultDate.getMinutes() === 0 && defaultDate.getSeconds() === 0 && defaultDate.getMilliseconds() === 0)) {
            startDateTime.setHours(12, 0, 0, 0);
          }
        }
        
        let startDateTimeStr: string;
        let endDateTimeStr: string;
        
        if (defaultIsAllDay) {
          // For all-day events, format dates directly to avoid timezone shifts
          // Get the date components in Mountain Time
          const mtFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Denver',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          const startParts = mtFormatter.formatToParts(startDateTime);
          const startYear = startParts.find(p => p.type === 'year')!.value;
          const startMonth = startParts.find(p => p.type === 'month')!.value;
          const startDay = startParts.find(p => p.type === 'day')!.value;
          
          // Use the same date for both start and end (all-day event)
          startDateTimeStr = `${startYear}-${startMonth}-${startDay}T00:00`;
          endDateTimeStr = `${startYear}-${startMonth}-${startDay}T23:59`;
        } else {
          const endDateTime = new Date(startDateTime);
          endDateTime.setHours(endDateTime.getHours() + 3);
          startDateTimeStr = formatDateTimeLocal(startDateTime.toISOString());
          endDateTimeStr = formatDateTimeLocal(endDateTime.toISOString());
        }
        
        setEventData({
          title: '',
          description: '',
          startDateTime: startDateTimeStr,
          endDateTime: endDateTimeStr,
          isAllDay: defaultIsAllDay || false,
          tags: [],
          isActive: true,
        });
        setRecurrenceType('none');
        setRecurrenceDays([]);
        setMonthDay(new Date().getDate());
        setRecurrenceStartDate('');
        setRecurrenceEndDate('');
      }
      setDateError(null);
    }
  }, [item, initialItemType, defaultDate, defaultIsAllDay, isOpen]);

  // Check Facebook connection status
  useEffect(() => {
    if (isOpen && currentItemType === 'announcement') {
      fetch('/api/social/facebook/status')
        .then(res => res.json())
        .then(data => {
          const connected = data.connected === true && !data.expired;
          setFacebookConnected(connected);
          if (!connected && announcementData.crossPostFacebook) {
            setAnnouncementData(prev => ({ ...prev, crossPostFacebook: false }));
          }
        })
        .catch(() => {
          setFacebookConnected(false);
          if (announcementData.crossPostFacebook) {
            setAnnouncementData(prev => ({ ...prev, crossPostFacebook: false }));
          }
        });
    }
  }, [isOpen, currentItemType]);

  const validateDateTime = (start: string, end: string | null, isAllDay: boolean): string | null => {
    if (!start) return null;
    if (!end) return null;
    
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

  const handleStartDateTimeChange = (value: string) => {
    if ((recurrenceType === 'weekly' || recurrenceType === 'monthly') && value) {
      setRecurrenceStartDate(value.split('T')[0]);
    }
    if (recurrenceType === 'weekly' && recurrenceDays.length === 0 && value) {
      const startDateMT = parseAsMountainTime(value);
      const mtFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver',
        weekday: 'long'
      });
      const dayName = mtFormatter.format(startDateMT);
      const dayMap: Record<string, string> = {
        'Sunday': 'Sunday', 'Monday': 'Monday', 'Tuesday': 'Tuesday', 'Wednesday': 'Wednesday',
        'Thursday': 'Thursday', 'Friday': 'Friday', 'Saturday': 'Saturday'
      };
      const mappedDayName = dayMap[dayName];
      if (mappedDayName && WEEKDAYS.includes(mappedDayName)) {
        setRecurrenceDays([mappedDayName]);
      }
    }
    const newEndDateTime = !item?.id && value && !eventData.isAllDay ? addThreeHours(value) : eventData.endDateTime;
    const newFormData = { ...eventData, startDateTime: value, endDateTime: newEndDateTime };
    setEventData(newFormData);
    if (newFormData.endDateTime) {
      const error = validateDateTime(value, newFormData.endDateTime, newFormData.isAllDay);
      setDateError(error);
    } else {
      setDateError(null);
    }
  };

  const handleEndDateTimeChange = (value: string) => {
    const newFormData = { ...eventData, endDateTime: value };
    setEventData(newFormData);
    if (value && newFormData.startDateTime) {
      const error = validateDateTime(newFormData.startDateTime, value, newFormData.isAllDay);
      setDateError(error);
    } else {
      setDateError(null);
    }
  };

  const handleAllDayChange = (checked: boolean) => {
    let updatedEndDateTime = eventData.endDateTime;
    
    if (checked && eventData.startDateTime) {
      const startDate = eventData.startDateTime.split('T')[0];
      updatedEndDateTime = `${startDate}T23:59`;
    } else if (!checked && eventData.startDateTime && !eventData.endDateTime) {
      updatedEndDateTime = addThreeHours(eventData.startDateTime);
    }
    
    const newFormData = { ...eventData, isAllDay: checked, endDateTime: updatedEndDateTime };
    setEventData(newFormData);
    if (newFormData.startDateTime && newFormData.endDateTime) {
      const error = validateDateTime(newFormData.startDateTime, newFormData.endDateTime, checked);
      setDateError(error);
    } else {
      setDateError(null);
    }
  };

  const toggleRecurrenceDay = (day: string) => {
    if (recurrenceDays.includes(day)) {
      setRecurrenceDays(recurrenceDays.filter(d => d !== day));
    } else {
      setRecurrenceDays([...recurrenceDays, day]);
    }
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    
    setLoading(true);
    
    try {
      if (currentItemType === 'event') {
        const event = item as Event;
        const isRecurring = !!event.recurrenceRule;
        const isSingleInstance = isRecurring && occurrenceDate;
        
        if (isSingleInstance) {
          const occurrenceDateStr = format(occurrenceDate!, 'yyyy-MM-dd');
          const res = await fetch(`/api/events/${event.id}/exception`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: occurrenceDateStr }),
          });
          
          if (res.ok) {
            const updatedRes = await fetch(`/api/events/${event.id}`);
            if (updatedRes.ok) {
              const updatedEvent = await updatedRes.json();
              onEventUpdated?.(updatedEvent);
            }
            showToast('Event occurrence deleted successfully', 'success');
            onSuccess?.();
            onClose();
          } else {
            const error = await res.json();
            showToast('Failed to delete occurrence', 'error', error.error || error.details || 'Please try again.');
          }
        } else {
          const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
          
          if (res.ok) {
            showToast('Event deleted successfully', 'success');
            onDelete?.(event.id!, 'event');
            onSuccess?.();
            onClose();
          } else {
            const error = await res.json();
            showToast('Failed to delete event', 'error', error.error || error.details || 'Please try again.');
          }
        }
      } else {
        // Announcement
        const res = await fetch(`/api/announcements/${item.id}`, { method: 'DELETE' });
        
        if (res.ok) {
          showToast('Announcement deleted successfully', 'success');
          onDelete?.(item.id!, 'announcement');
          onSuccess?.();
          onClose();
        } else {
          const error = await res.json();
          showToast('Failed to delete announcement', 'error', error.error || error.details || 'An error occurred');
        }
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setShowDeleteRecurringConfirm(false);
    }
  };

  const handleDeleteRecurringEvent = async () => {
    if (!item?.id || currentItemType !== 'event') return;
    
    setLoading(true);
    
    try {
      const res = await fetch(`/api/events/${item.id}`, { method: 'DELETE' });
      
      if (res.ok) {
        showToast('Recurring event deleted successfully', 'success');
        onDelete?.(item.id, 'event');
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    setLoading(true);

    try {
      if (currentItemType === 'event') {
        // Validate dates
        if (eventData.endDateTime) {
          const error = validateDateTime(eventData.startDateTime, eventData.endDateTime, eventData.isAllDay);
          if (error) {
            setDateError(error);
            showToast('Invalid date/time', 'error', error);
            setLoading(false);
            return;
          }
        }

        const url = (item as Event)?.id ? `/api/events/${(item as Event).id}` : '/api/events';
        const method = (item as Event)?.id ? 'PUT' : 'POST';

        const untilDate = recurrenceEndDate ? recurrenceEndDate.replace(/-/g, '') : undefined;
        const recurrenceRule = buildRRULE(recurrenceType, recurrenceDays, recurrenceType === 'monthly' ? monthDay : undefined, untilDate);

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...eventData,
            venueArea: 'bar',
            recurrenceRule,
            startDateTime: parseAsMountainTime(eventData.startDateTime).toISOString(),
            endDateTime: eventData.endDateTime ? parseAsMountainTime(eventData.endDateTime).toISOString() : null,
          }),
        });

        if (res.ok) {
          const eventData = await res.json();
          showToast(
            (item as Event)?.id ? 'Event updated successfully' : 'Event created successfully',
            'success'
          );
          
          if ((item as Event)?.id) {
            onEventUpdated?.(eventData);
          } else {
            onEventAdded?.(eventData);
          }
          
          onSuccess?.();
          onClose();
        } else {
          const error = await res.json();
          showToast(
            (item as Event)?.id ? 'Failed to update event' : 'Failed to create event',
            'error',
            error.error || error.details || 'Please check your input and try again.'
          );
        }
      } else {
        // Announcement
        // Validate expiration date
        if (announcementData.publishAt && announcementData.expiresAt) {
          const publishDate = new Date(announcementData.publishAt);
          const expireDate = new Date(announcementData.expiresAt);
          const maxExpireDate = new Date(publishDate);
          maxExpireDate.setMonth(maxExpireDate.getMonth() + 1);
          
          if (expireDate > maxExpireDate) {
            showToast(
              'Expiration date cannot be more than 1 month after publish date',
              'error',
              `Maximum expiration date: ${maxExpireDate.toLocaleDateString()} ${maxExpireDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            );
            setLoading(false);
            return;
          }
        }

        const url = (item as Announcement)?.id
          ? `/api/announcements/${(item as Announcement).id}`
          : '/api/announcements';
        const method = (item as Announcement)?.id ? 'PUT' : 'POST';

        const publishAtISO = announcementData.publishAt && announcementData.publishAt.trim() 
          ? convertMountainTimeToUTC(announcementData.publishAt)
          : null;
        
        const expiresAtISO = announcementData.expiresAt && announcementData.expiresAt.trim()
          ? convertMountainTimeToUTC(announcementData.expiresAt)
          : null;

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...announcementData,
            publishAt: publishAtISO,
            expiresAt: expiresAtISO,
            isPublished: true,
          }),
        });

        if (res.ok) {
          const announcementData = await res.json();
          showToast(
            (item as Announcement)?.id ? 'Announcement updated successfully' : 'Announcement created successfully',
            'success'
          );
          
          if ((item as Announcement)?.id) {
            onAnnouncementUpdated?.(announcementData);
          } else {
            onAnnouncementAdded?.(announcementData);
          }
          
          onSuccess?.();
          onClose();
        } else {
          const error = await res.json();
          showToast(
            (item as Announcement)?.id ? 'Failed to update announcement' : 'Failed to create announcement',
            'error',
            error.error || error.details || 'Please check your input and try again.'
          );
        }
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving.'
      );
    } finally {
      setLoading(false);
    }
  }

  const isEditing = item !== undefined;
  const event = item && 'startDateTime' in item ? (item as Event) : null;
  const announcement = item && 'body' in item ? (item as Announcement) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? currentItemType === 'event'
            ? 'Edit Event'
            : 'Edit Announcement'
          : 'Create Event or Announcement'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Selector - only show when creating new */}
        {!isEditing && (
          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400 mb-3">Item Type</p>
              <div className="flex flex-wrap gap-3">
                <label
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    currentItemType === 'event'
                      ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-500/80 dark:bg-blue-900/30 dark:text-blue-200 shadow-sm'
                      : 'border-gray-200/70 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-blue-400/70'
                  }`}
                >
                  <FaCalendarAlt className="w-4 h-4" />
                  <input
                    type="radio"
                    name="itemType"
                    checked={currentItemType === 'event'}
                    onChange={() => setCurrentItemType('event')}
                    className="sr-only"
                  />
                  Event
                </label>
                <label
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    currentItemType === 'announcement'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-600 dark:border-yellow-500/80 dark:bg-yellow-900/30 dark:text-yellow-200 shadow-sm'
                      : 'border-gray-200/70 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 hover:border-yellow-400/70'
                  }`}
                >
                  <FaBullhorn className="w-4 h-4" />
                  <input
                    type="radio"
                    name="itemType"
                    checked={currentItemType === 'announcement'}
                    onChange={() => setCurrentItemType('announcement')}
                    className="sr-only"
                  />
                  Announcement
                </label>
              </div>
            </div>
          </div>
        )}

        {currentItemType === 'event' ? (
          // Event Form (reuse existing event form structure)
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column */}
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Event Status</p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        Control whether this event appears on your public calendar.
                      </p>
                    </div>
                    <StatusToggle
                      type="active"
                      value={eventData.isActive}
                      onChange={(value) => setEventData({ ...eventData, isActive: value })}
                      className="shrink-0"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="event-title" className="text-sm font-medium text-gray-900 dark:text-white">
                        Title *
                      </label>
                      <input
                        id="event-title"
                        type="text"
                        value={eventData.title}
                        onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                        required
                        className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="event-description" className="text-sm font-medium text-gray-900 dark:text-white">
                        Description
                      </label>
                      <textarea
                        id="event-description"
                        value={eventData.description}
                        onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                        rows={2}
                        className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Schedule</p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        Choose the start and end for this event.
                      </p>
                    </div>
                    <label
                      htmlFor="isAllDay"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-white shadow-inner cursor-pointer transition-colors hover:border-blue-400/70 focus-within:ring-2 focus-within:ring-blue-500/30"
                    >
                      <input
                        type="checkbox"
                        id="isAllDay"
                        checked={eventData.isAllDay}
                        onChange={(e) => handleAllDayChange(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      All Day Event
                    </label>
                  </div>

                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    <div className="relative isolate">
                      {eventData.isAllDay ? (
                        <DatePicker
                          label="Start Date"
                          value={eventData.startDateTime ? eventData.startDateTime.split('T')[0] : ''}
                          onChange={(value) => handleStartDateTimeChange(value ? `${value}T00:00` : '')}
                          required
                          dateOnly={true}
                        />
                      ) : (
                        <DateTimePicker
                          label="Start Date & Time"
                          value={eventData.startDateTime || ''}
                          onChange={handleStartDateTimeChange}
                          required
                        />
                      )}
                    </div>
                    <div className="relative isolate">
                      {eventData.isAllDay ? (
                        <DatePicker
                          label="End Date"
                          value={eventData.endDateTime ? eventData.endDateTime.split('T')[0] : (eventData.startDateTime ? eventData.startDateTime.split('T')[0] : '')}
                          onChange={(value) => {
                            if (value) {
                              handleEndDateTimeChange(`${value}T23:59`);
                            } else if (eventData.startDateTime) {
                              const startDate = eventData.startDateTime.split('T')[0];
                              handleEndDateTimeChange(`${startDate}T23:59`);
                            } else {
                              handleEndDateTimeChange('');
                            }
                          }}
                          min={eventData.startDateTime ? eventData.startDateTime.split('T')[0] : undefined}
                          dateOnly={true}
                        />
                      ) : (
                        <DateTimePicker
                          label="End Date & Time"
                          value={eventData.endDateTime || ''}
                          onChange={handleEndDateTimeChange}
                          min={eventData.startDateTime || undefined}
                        />
                      )}
                    </div>
                  </div>
                  {dateError && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                      {dateError}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column - Recurrence */}
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
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
                          if (eventData.startDateTime) {
                            setRecurrenceStartDate(eventData.startDateTime.split('T')[0]);
                          }
                          if (recurrenceDays.length === 0 && eventData.startDateTime) {
                            const startDateMT = parseAsMountainTime(eventData.startDateTime);
                            const mtFormatter = new Intl.DateTimeFormat('en-US', {
                              timeZone: 'America/Denver',
                              weekday: 'long'
                            });
                            const dayName = mtFormatter.format(startDateMT);
                            const dayMap: Record<string, string> = {
                              'Sunday': 'Sunday', 'Monday': 'Monday', 'Tuesday': 'Tuesday', 'Wednesday': 'Wednesday',
                              'Thursday': 'Thursday', 'Friday': 'Friday', 'Saturday': 'Saturday'
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
                          if (eventData.startDateTime) {
                            setRecurrenceStartDate(eventData.startDateTime.split('T')[0]);
                          }
                          if (eventData.startDateTime) {
                            const startDate = new Date(eventData.startDateTime);
                            const dayOfMonth = startDate.getDate();
                            setMonthDay(dayOfMonth);
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
                    </div>
                  )}

                  {(recurrenceType === 'weekly' || recurrenceType === 'monthly') && (
                    <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-3 shadow-inner space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400 mb-2">Repeating Settings</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                          Set when this recurrence pattern starts and stops.
                        </p>
                      </div>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                        <div>
                          <DatePicker
                            label="Repeat From"
                            value={recurrenceStartDate || (eventData.startDateTime ? eventData.startDateTime.split('T')[0] : '')}
                            onChange={(value) => {
                              setRecurrenceStartDate(value || '');
                              if (value && !eventData.startDateTime) {
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
                            min={recurrenceStartDate || (eventData.startDateTime ? eventData.startDateTime.split('T')[0] : undefined)}
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
          </>
        ) : (
          // Announcement Form (reuse existing announcement form structure)
          <>
            <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Announcement Content</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                  Create your announcement with title and content.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="announcement-title" className="text-sm font-medium text-gray-900 dark:text-white">
                    Title *
                  </label>
                  <input
                    id="announcement-title"
                    type="text"
                    value={announcementData.title}
                    onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                    required
                    className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="announcement-body" className="text-sm font-medium text-gray-900 dark:text-white">
                    Content *
                  </label>
                  <textarea
                    id="announcement-body"
                    value={announcementData.body}
                    onChange={(e) => setAnnouncementData({ ...announcementData, body: e.target.value })}
                    rows={6}
                    required
                    className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Supports markdown and HTML</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Schedule</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                  Set when this announcement should be published and expire.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative isolate">
                  <DateTimePicker
                    label="Publish Date & Time"
                    value={announcementData.publishAt}
                    onChange={(value) => setAnnouncementData({ ...announcementData, publishAt: value })}
                    required
                  />
                </div>

                <div className="relative isolate">
                  <DateTimePicker
                    label="Expiration Date & Time"
                    value={announcementData.expiresAt}
                    onChange={(value) => {
                      if (announcementData.publishAt && value) {
                        const publishDate = new Date(announcementData.publishAt);
                        const expireDate = new Date(value);
                        const maxExpireDate = new Date(publishDate);
                        maxExpireDate.setMonth(maxExpireDate.getMonth() + 1);
                        
                        if (expireDate > maxExpireDate) {
                          showToast(
                            'Expiration date cannot be more than 1 month after publish date',
                            'error',
                            `Maximum expiration date: ${maxExpireDate.toLocaleDateString()} ${maxExpireDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          );
                          const maxValue = maxExpireDate.toISOString().slice(0, 16);
                          setAnnouncementData({ ...announcementData, expiresAt: maxValue });
                          return;
                        }
                      }
                      
                      setAnnouncementData({ ...announcementData, expiresAt: value });
                    }}
                    min={announcementData.publishAt || undefined}
                    max={announcementData.publishAt ? (() => {
                      const maxDate = new Date(announcementData.publishAt);
                      maxDate.setMonth(maxDate.getMonth() + 1);
                      return maxDate.toISOString().slice(0, 16);
                    })() : undefined}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Must be within 1 month of publish date</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Social Media</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                  Automatically share this announcement to your connected social media accounts.
                </p>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="crossPostFacebook"
                  className={`inline-flex items-center gap-3 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white shadow-inner cursor-pointer transition-colors ${
                    facebookConnected ? 'hover:border-blue-400/70 focus-within:ring-2 focus-within:ring-blue-500/30' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="crossPostFacebook"
                    checked={announcementData.crossPostFacebook}
                    onChange={(e) => setAnnouncementData({ ...announcementData, crossPostFacebook: e.target.checked })}
                    disabled={!facebookConnected}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Cross-post to Facebook
                    {!facebookConnected && ' (Connect Facebook in Settings)'}
                  </span>
                </label>
                <label
                  htmlFor="crossPostInstagram"
                  className="inline-flex items-center gap-3 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 shadow-inner cursor-not-allowed opacity-50"
                >
                  <input
                    type="checkbox"
                    id="crossPostInstagram"
                    checked={announcementData.crossPostInstagram}
                    onChange={(e) => setAnnouncementData({ ...announcementData, crossPostInstagram: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled
                  />
                  <span>Cross-post to Instagram (coming soon)</span>
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Call-to-Action</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                  Add an optional button to your announcement.
                </p>
              </div>

              <label
                htmlFor="showCTA"
                className="inline-flex items-center gap-3 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white shadow-inner cursor-pointer transition-colors hover:border-blue-400/70 focus-within:ring-2 focus-within:ring-blue-500/30"
              >
                <input
                  type="checkbox"
                  id="showCTA"
                  checked={showCTA}
                  onChange={(e) => {
                    setShowCTA(e.target.checked);
                    if (!e.target.checked) {
                      setAnnouncementData({ ...announcementData, ctaText: '', ctaUrl: '' });
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Add Call-to-Action Button
              </label>

              {showCTA && (
                <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-4 shadow-inner space-y-4 border-l-4 border-l-blue-500 dark:border-l-blue-400">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Both fields are required for the CTA button to appear.</p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="ctaText" className="text-sm font-medium text-gray-900 dark:text-white">
                        Button Text *
                      </label>
                      <input
                        id="ctaText"
                        type="text"
                        value={announcementData.ctaText}
                        onChange={(e) => setAnnouncementData({ ...announcementData, ctaText: e.target.value })}
                        placeholder="e.g., Learn More, Book Now, Order Here"
                        className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="ctaUrl" className="text-sm font-medium text-gray-900 dark:text-white">
                        Button URL *
                      </label>
                      <input
                        id="ctaUrl"
                        type="url"
                        value={announcementData.ctaUrl}
                        onChange={(e) => setAnnouncementData({ ...announcementData, ctaUrl: e.target.value })}
                        placeholder="https://example.com or /menu"
                        className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 pt-4">
          {item?.id && (
            <div className="flex flex-wrap gap-2 mr-auto">
              {currentItemType === 'event' && event?.recurrenceRule && occurrenceDate ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer"
                  >
                    Delete This Occurrence
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteRecurringConfirm(true)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-700 dark:bg-red-700 hover:bg-red-800 dark:hover:bg-red-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer"
                  >
                    Delete Recurring Event
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            {loading ? (item?.id ? 'Saving...' : 'Creating...') : (item?.id ? 'Save' : 'Create')}
          </button>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={
          currentItemType === 'event' && event?.recurrenceRule && occurrenceDate
            ? 'Delete Event Occurrence'
            : currentItemType === 'event'
            ? 'Delete Event'
            : 'Delete Announcement'
        }
        message={
          currentItemType === 'event' && event?.recurrenceRule && occurrenceDate
            ? `Are you sure you want to delete this occurrence of "${event.title}"? This will only remove this specific instance, not the entire recurring event.`
            : currentItemType === 'event'
            ? `Are you sure you want to delete "${event?.title}"? This action cannot be undone.`
            : `Are you sure you want to delete "${announcement?.title}"? This action cannot be undone.`
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

