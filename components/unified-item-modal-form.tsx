'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import DateTimePicker from '@/components/date-time-picker';
import DatePicker from '@/components/date-picker';
import FoodSpecialsGallerySelector from '@/components/food-specials-gallery-selector';
import ConfirmationDialog from '@/components/confirmation-dialog';
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
  venueArea?: string;
}

interface Special {
  id?: string;
  title: string;
  description: string;
  priceNotes: string;
  type: string;
  appliesOn: string[];
  timeWindow: string;
  startDate: string;
  endDate: string;
  image: string;
  isActive: boolean;
  recurrenceRule?: string;
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

type ItemType = 'event' | 'food' | 'drink' | 'announcement';
type UnifiedItem = Event | Special | Announcement;

interface UnifiedItemModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  item?: UnifiedItem;
  itemType?: ItemType;
  onSuccess?: () => void;
  onDelete?: (id: string) => void;
  onAnnouncementAdded?: (announcement: any) => void;
  onAnnouncementUpdated?: (announcement: any) => void;
}

// Helper function to convert UTC ISO string to datetime-local string (company timezone)
function convertUTCToMountainTimeLocal(utcISO: string): string {
  const utcDate = new Date(utcISO);
  return formatDateAsDateTimeLocal(utcDate, getCompanyTimezoneSync());
}

// Helper function to convert datetime-local string (interpreted as company timezone) to UTC ISO string
function convertMountainTimeToUTC(datetimeLocal: string): string {
  if (!datetimeLocal) return '';
  try {
    return parseDateTimeLocalAsCompanyTimezone(datetimeLocal, getCompanyTimezoneSync()).toISOString();
  } catch (error) {
    console.error('Error converting datetime:', error);
    return '';
  }
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Helper function to parse RRULE and extract recurrence info
function parseRRULE(rrule: string | null | undefined): { frequency: 'none' | 'weekly' | 'monthly'; days: string[]; monthDay?: number } {
  if (!rrule) {
    return { frequency: 'none', days: [] };
  }

  const freqMatch = rrule.match(/FREQ=(\w+)/);
  const freq = freqMatch ? freqMatch[1].toLowerCase() : 'none';
  
  if (freq === 'monthly') {
    const monthDayMatch = rrule.match(/BYMONTHDAY=(\d+)/);
    if (monthDayMatch) {
      return { frequency: 'monthly', days: [], monthDay: parseInt(monthDayMatch[1]) };
    }
    return { frequency: 'monthly', days: [] };
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

export default function UnifiedItemModalForm({ isOpen, onClose, item, itemType: initialItemType, onSuccess, onDelete, onAnnouncementAdded, onAnnouncementUpdated }: UnifiedItemModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  
  // Determine item type from existing item or initial type
  const getItemType = (): ItemType => {
    if (item) {
      // Check if it's an event (has startDateTime)
      if ('startDateTime' in item) {
        return 'event';
      }
      // Check if it's an announcement (has body and publishAt)
      if ('body' in item && 'publishAt' in item) {
        return 'announcement';
      }
      // Check if it's a special and get its type
      if ('type' in item) {
        return item.type === 'drink' ? 'drink' : 'food';
      }
    }
    return initialItemType || 'event';
  };

  const [currentItemType, setCurrentItemType] = useState<ItemType>(getItemType());

  // Format date for datetime-local input
  const formatDateTimeLocal = (dateTime: string): string => {
    if (!dateTime.includes('Z') && !dateTime.includes('+') && !dateTime.includes('-', 10)) {
      return dateTime.slice(0, 16);
    }
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Event form state
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    isAllDay: false,
    isActive: true,
    venueArea: 'bar',
  });

  // Event recurrence state
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'monthly'>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [monthDay, setMonthDay] = useState<number>(new Date().getDate());

  // Special form state
  const [specialData, setSpecialData] = useState({
    title: '',
    description: '',
    priceNotes: '',
    type: 'food' as 'food' | 'drink',
    appliesOn: [] as string[],
    timeWindow: '',
    startDate: '',
    endDate: '',
    image: '',
    isActive: true,
  });

  const [dateError, setDateError] = useState<string | null>(null);

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

  // Initialize form data when modal opens or item changes
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
        setEventData({
          title: event.title || '',
          description: event.description || '',
          startDateTime: event.startDateTime ? formatDateTimeLocal(event.startDateTime) : '',
          endDateTime: event.endDateTime ? formatDateTimeLocal(event.endDateTime) : '',
          isAllDay: event.isAllDay ?? false,
          isActive: event.isActive ?? true,
          venueArea: event.venueArea || 'bar',
        });
        setCurrentItemType('event');
      } else if ('body' in item && 'publishAt' in item) {
        // It's an announcement
        const announcement = item as Announcement;
        const hasCTA = !!(announcement.ctaText && announcement.ctaUrl);
        setShowCTA(hasCTA);
        setAnnouncementData({
          title: announcement.title || '',
          body: announcement.body || '',
          publishAt: announcement.publishAt
            ? convertUTCToMountainTimeLocal(announcement.publishAt)
            : '',
          expiresAt: announcement.expiresAt
            ? convertUTCToMountainTimeLocal(announcement.expiresAt)
            : '',
          crossPostFacebook: announcement.crossPostFacebook ?? false,
          crossPostInstagram: announcement.crossPostInstagram ?? false,
          ctaText: announcement.ctaText || '',
          ctaUrl: announcement.ctaUrl || '',
        });
        setCurrentItemType('announcement');
      } else {
        // It's a special
        const special = item as Special;
        setSpecialData({
          title: special.title || '',
          description: special.description || '',
          priceNotes: special.priceNotes || '',
          type: (special.type === 'drink' ? 'drink' : 'food') as 'food' | 'drink',
          appliesOn: Array.isArray(special.appliesOn) ? special.appliesOn : [],
          timeWindow: special.timeWindow || '',
          startDate: special.startDate || '',
          endDate: special.endDate || '',
          image: special.image || '',
          isActive: special.isActive ?? true,
        });
        setCurrentItemType(special.type === 'drink' ? 'drink' : 'food');
      }
    } else {
      // New item
      setCurrentItemType(initialItemType || 'event');
      setEventData({
        title: '',
        description: '',
        startDateTime: '',
        endDateTime: '',
        isAllDay: false,
        isActive: true,
        venueArea: 'bar',
      });
      setSpecialData({
        title: '',
        description: '',
        priceNotes: '',
        type: initialItemType === 'drink' ? 'drink' : 'food',
        appliesOn: [],
        timeWindow: '',
        startDate: '',
        endDate: '',
        image: '',
        isActive: true,
      });
      // Set default dates for announcement: top of current hour for publishAt, 24 hours from that for expiresAt
      const now = new Date();
      const publishAt = new Date(now);
      publishAt.setMinutes(0, 0, 0);
      const expiresAt = new Date(publishAt);
      expiresAt.setHours(expiresAt.getHours() + 24);
      setAnnouncementData({
        title: '',
        body: '',
        publishAt: publishAt.toISOString().slice(0, 16),
        expiresAt: expiresAt.toISOString().slice(0, 16),
        crossPostFacebook: false,
        crossPostInstagram: false,
        ctaText: '',
        ctaUrl: '',
      });
      setShowCTA(false);
      setRecurrenceType('none');
      setRecurrenceDays([]);
      setMonthDay(new Date().getDate());
      setDateError(null);
    }

  }, [item, initialItemType, isOpen, currentItemType]);

  // Check Facebook connection status when modal opens for announcements
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
  }, [isOpen, currentItemType, announcementData.crossPostFacebook]);

  // Clear appliesOn when switching to food type
  useEffect(() => {
    if (currentItemType === 'food' && specialData.appliesOn.length > 0) {
      setSpecialData(prev => ({ ...prev, appliesOn: [] }));
    }
  }, [currentItemType]);

  const validateDateTime = (start: string, end: string | null, isAllDay: boolean): string | null => {
    if (!start) return null;
    if (!end) return null;
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isAllDay) {
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      if (endDateOnly < startDateOnly) {
        return 'End date must be on or after start date';
      }
    } else {
      // Note: Cross-day events are allowed (e.g., Tuesday 10am to Wednesday 2am)
      // This is common for bars/restaurants where the business day spans midnight
      // The Date comparison naturally handles this since the end date will be on the next calendar day
      if (endDate <= startDate) {
        return 'End date & time must be after start date & time';
      }
    }
    
    return null;
  };

  const handleStartDateTimeChange = (value: string) => {
    const newFormData = { ...eventData, startDateTime: value };
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
    const newFormData = { ...eventData, isAllDay: checked };
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

  const toggleSpecialDay = (day: string) => {
    setSpecialData({
      ...specialData,
      appliesOn: specialData.appliesOn.includes(day)
        ? specialData.appliesOn.filter((d) => d !== day)
        : [...specialData.appliesOn, day],
    });
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

        const url = (item && 'startDateTime' in item && item.id) ? `/api/events/${item.id}` : '/api/events';
        const method = (item && 'startDateTime' in item && item.id) ? 'PUT' : 'POST';

        const recurrenceRule = buildRRULE(recurrenceType, recurrenceDays, recurrenceType === 'monthly' ? monthDay : undefined);

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...eventData,
            recurrenceRule,
            startDateTime: new Date(eventData.startDateTime).toISOString(),
            endDateTime: eventData.endDateTime ? new Date(eventData.endDateTime).toISOString() : null,
          }),
        });

        if (res.ok) {
          router.refresh();
          showToast(
            (item && 'startDateTime' in item && item.id) ? 'Event updated successfully' : 'Event created successfully',
            'success'
          );
          onSuccess?.();
          onClose();
        } else {
          const error = await res.json();
          showToast(
            (item && 'startDateTime' in item && item.id) ? 'Failed to update event' : 'Failed to create event',
            'error',
            error.error || error.details || 'Please check your input and try again.'
          );
        }
      } else if (currentItemType === 'announcement') {
        // Announcement
        // Validate expiration date is not more than 1 month after publish date
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

        const url = (item && 'body' in item && item.id) ? `/api/announcements/${item.id}` : '/api/announcements';
        const method = (item && 'body' in item && item.id) ? 'PUT' : 'POST';

        const announcementPayload = {
          ...announcementData,
          publishAt: announcementData.publishAt ? convertMountainTimeToUTC(announcementData.publishAt) : null,
          expiresAt: announcementData.expiresAt ? convertMountainTimeToUTC(announcementData.expiresAt) : null,
          isPublished: true,
        };

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(announcementPayload),
        });

        if (res.ok) {
          const data = await res.json();
          router.refresh();
          showToast(
            (item && 'body' in item && item.id) ? 'Announcement updated successfully' : 'Announcement created successfully',
            'success'
          );
          if (item && 'body' in item && item.id) {
            onAnnouncementUpdated?.(data);
          } else {
            onAnnouncementAdded?.(data);
          }
          onSuccess?.();
          onClose();
        } else {
          const error = await res.json();
          showToast(
            (item && 'body' in item && item.id) ? 'Failed to update announcement' : 'Failed to create announcement',
            'error',
            error.error || error.details || 'Please check your input and try again.'
          );
        }
      } else {
        // Special
        const url = (item && 'type' in item && item.id) ? `/api/specials/${item.id}` : '/api/specials';
        const method = (item && 'type' in item && item.id) ? 'PUT' : 'POST';

        const specialPayload = {
          ...specialData,
          type: currentItemType === 'drink' ? 'drink' : 'food',
        };

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(specialPayload),
        });

        if (res.ok) {
          router.refresh();
          showToast(
            (item && 'type' in item && item.id) ? 'Special updated successfully' : 'Special created successfully',
            'success'
          );
          onSuccess?.();
          onClose();
        } else {
          const error = await res.json();
          showToast(
            (item && 'type' in item && item.id) ? 'Failed to update special' : 'Failed to create special',
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
  const title = isEditing 
    ? `Edit ${currentItemType === 'event' ? 'Event' : currentItemType === 'drink' ? 'Drink Special' : currentItemType === 'announcement' ? 'Announcement' : 'Food Special'}`
    : 'Create New';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Item Type Selector - only show when creating new */}
        {!isEditing && (
          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm">
            <div>
              <label htmlFor="itemType" className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400 mb-3 block">
                Item Type *
              </label>
              <select
                id="itemType"
                value={currentItemType}
                onChange={(e) => setCurrentItemType(e.target.value as ItemType)}
                className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              >
                <option value="event">Event</option>
                <option value="food">Food Special</option>
                <option value="drink">Drink Special</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
          </div>
        )}

        {/* Basic Information Section */}
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
          {currentItemType !== 'announcement' && (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Status</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Control whether this item appears publicly.
                </p>
              </div>
              <StatusToggle
                type="active"
                value={currentItemType === 'event' ? eventData.isActive : specialData.isActive}
                onChange={(value) => {
                  if (currentItemType === 'event') {
                    setEventData({ ...eventData, isActive: value });
                  } else {
                    setSpecialData({ ...specialData, isActive: value });
                  }
                }}
                className="shrink-0"
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium text-gray-900 dark:text-white">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={currentItemType === 'event' ? eventData.title : specialData.title}
                onChange={(e) => {
                  if (currentItemType === 'event') {
                    setEventData({ ...eventData, title: e.target.value });
                  } else {
                    setSpecialData({ ...specialData, title: e.target.value });
                  }
                }}
                required
                className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-white">
                Description
              </label>
              <textarea
                id="description"
                value={currentItemType === 'event' ? eventData.description : specialData.description}
                onChange={(e) => {
                  if (currentItemType === 'event') {
                    setEventData({ ...eventData, description: e.target.value });
                  } else {
                    setSpecialData({ ...specialData, description: e.target.value });
                  }
                }}
                rows={3}
                className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Event-specific fields */}
        {currentItemType === 'event' && (
          <>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative isolate">
                  {eventData.isAllDay ? (
                    <DatePicker
                      label="Start Date"
                      value={eventData.startDateTime ? eventData.startDateTime.split('T')[0] : ''}
                      onChange={(value) => handleStartDateTimeChange(value ? `${value}T00:00` : '')}
                      required
                      dateOnly={true}
                      max={eventData.endDateTime ? eventData.endDateTime.split('T')[0] : undefined}
                    />
                  ) : (
                    <DateTimePicker
                      label="Start Date & Time"
                      value={eventData.startDateTime || ''}
                      onChange={handleStartDateTimeChange}
                      required
                      max={eventData.endDateTime || undefined}
                    />
                  )}
                </div>
                <div className="relative isolate">
                  {eventData.isAllDay ? (
                    <DatePicker
                      label="End Date"
                      value={eventData.endDateTime ? eventData.endDateTime.split('T')[0] : ''}
                      onChange={(value) => handleEndDateTimeChange(value ? `${value}T23:59` : '')}
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
                      if (recurrenceDays.length === 0 && eventData.startDateTime) {
                        const startDate = new Date(eventData.startDateTime);
                        const dayOfWeek = startDate.getDay();
                        const dayMap: Record<number, string> = {
                          0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
                          4: 'Thursday', 5: 'Friday', 6: 'Saturday'
                        };
                        const dayName = dayMap[dayOfWeek];
                        if (dayName && WEEKDAYS.includes(dayName)) {
                          setRecurrenceDays([dayName]);
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
                        const startDate = new Date(eventData.startDateTime);
                        setMonthDay(startDate.getDate());
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
            </div>
          </>
        )}

        {/* Special-specific fields */}
        {currentItemType !== 'event' && (
          <>
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Pricing & Details</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Set the price and additional information for this special.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="priceNotes" className="text-sm font-medium text-gray-900 dark:text-white">
                    Price {currentItemType === 'food' ? '(optional)' : ''}
                  </label>
                  <input
                    id="priceNotes"
                    type="text"
                    value={specialData.priceNotes}
                    onChange={(e) => setSpecialData({ ...specialData, priceNotes: e.target.value })}
                    placeholder={currentItemType === 'food' ? "e.g., $12.99 (or leave empty if prices are in description)" : "e.g., $3 drafts, Happy hour prices"}
                    className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  />
                  {currentItemType === 'food' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      If your special has multiple prices, you can list them in the Description field instead.
                    </p>
                  )}
                </div>

                {currentItemType === 'drink' && (
                  <div className="space-y-1.5">
                    <label htmlFor="timeWindow" className="text-sm font-medium text-gray-900 dark:text-white">
                      Time Window
                    </label>
                    <input
                      id="timeWindow"
                      type="text"
                      value={specialData.timeWindow}
                      onChange={(e) => setSpecialData({ ...specialData, timeWindow: e.target.value })}
                      placeholder="e.g., 11am-3pm, Happy Hour"
                      className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {currentItemType === 'drink' && (
              <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Weekly Schedule</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Select which days this special applies each week. Leave empty if using start/end dates.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-3 shadow-inner space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Applies On</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {WEEKDAYS.map((day) => {
                      const isSelected = specialData.appliesOn.includes(day);
                      return (
                        <label
                          key={day}
                          className={`flex items-center justify-center rounded-lg border px-2 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                              : 'border-gray-200/70 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-900/40 hover:border-blue-400/70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSpecialDay(day)}
                            className="sr-only"
                          />
                          {day}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                  {currentItemType === 'food' ? 'Date' : 'Timing'}
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {currentItemType === 'food' 
                    ? 'Select the date this daily special applies (full day).'
                    : 'Set when this special is available.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative isolate">
                  <DatePicker
                    label={currentItemType === 'food' ? 'Date *' : 'Start Date (optional)'}
                    value={currentItemType === 'food' ? (specialData.startDate || '') : (specialData.startDate || '')}
                    onChange={(value) => {
                      if (currentItemType === 'food') {
                        setSpecialData({ ...specialData, startDate: value || '', endDate: value || '' });
                      } else {
                        setSpecialData({ ...specialData, startDate: value || '' });
                      }
                    }}
                    required={currentItemType === 'food'}
                    dateOnly={true}
                    min={currentItemType === 'drink' ? undefined : undefined}
                  />
                </div>
                {currentItemType === 'drink' && (
                  <div className="relative isolate">
                    <DatePicker
                      label="End Date (optional)"
                      value={specialData.endDate || ''}
                      onChange={(value) => setSpecialData({ ...specialData, endDate: value || '' })}
                      min={specialData.startDate || undefined}
                      dateOnly={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {currentItemType === 'food' && (
              <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Image</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    Add an image to showcase this food special.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="image" className="text-sm font-medium text-gray-900 dark:text-white">
                    Image Path (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="image"
                      type="text"
                      value={specialData.image}
                      onChange={(e) => setSpecialData({ ...specialData, image: e.target.value })}
                      placeholder="/pics/food-specials/your-image.jpg"
                      className="flex-1 rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGallery(true)}
                      className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                      title="Select from gallery"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">Gallery</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Announcement-specific fields */}
        {currentItemType === 'announcement' && (
          <>
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Announcement Content</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
                  Create your announcement with title and content.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="announcement-title" className="text-sm font-medium text-gray-900 dark:text-white">
                    Title *
                  </label>
                  <input
                    id="announcement-title"
                    type="text"
                    value={announcementData.title}
                    onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="announcement-body" className="text-sm font-medium text-gray-900 dark:text-white">
                    Content *
                  </label>
                  <textarea
                    id="announcement-body"
                    value={announcementData.body}
                    onChange={(e) => setAnnouncementData({ ...announcementData, body: e.target.value })}
                    rows={3}
                    required
                    className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Supports markdown and HTML</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Schedule</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be within 1 month of publish date</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Social Media</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
                  Automatically share this announcement to your connected social media accounts.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="crossPostFacebook"
                  className={`inline-flex items-center gap-3 rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-inner cursor-pointer transition-colors ${
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
                  className="inline-flex items-center gap-3 rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 shadow-inner cursor-not-allowed opacity-50"
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

            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Call-to-Action</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
                  Add an optional button to your announcement.
                </p>
              </div>

              <label
                htmlFor="showCTA"
                className="inline-flex items-center gap-3 rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-inner cursor-pointer transition-colors hover:border-blue-400/70 focus-within:ring-2 focus-within:ring-blue-500/30"
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
                <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-3 shadow-inner space-y-3 border-l-4 border-l-blue-500 dark:border-l-blue-400">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Both fields are required for the CTA button to appear.</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="ctaText" className="text-sm font-medium text-gray-900 dark:text-white">
                        Button Text *
                      </label>
                      <input
                        id="ctaText"
                        type="text"
                        value={announcementData.ctaText}
                        onChange={(e) => setAnnouncementData({ ...announcementData, ctaText: e.target.value })}
                        placeholder="e.g., Learn More, Book Now, Order Here"
                        className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="ctaUrl" className="text-sm font-medium text-gray-900 dark:text-white">
                        Button URL *
                      </label>
                      <input
                        id="ctaUrl"
                        type="url"
                        value={announcementData.ctaUrl}
                        onChange={(e) => setAnnouncementData({ ...announcementData, ctaUrl: e.target.value })}
                        placeholder="https://example.com or /menu"
                        className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 pt-4">
          {isEditing && currentItemType === 'announcement' && item && 'body' in item && item.id && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteLoading || loading}
              className="px-3 py-1.5 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer"
            >
              Delete
            </button>
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
            disabled={
              loading ||
              (currentItemType === 'event' && !eventData.startDateTime) ||
              (currentItemType === 'food' && !specialData.startDate && !specialData.endDate) ||
              (currentItemType === 'drink' && specialData.appliesOn.length === 0 && !specialData.startDate && !specialData.endDate) ||
              (currentItemType === 'announcement' && (!announcementData.title || !announcementData.body || !announcementData.publishAt || !announcementData.expiresAt))
            }
            className="px-3 py-1.5 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            {loading 
              ? (item?.id ? 'Saving...' : 'Creating...')
              : (item?.id ? 'Save' : 'Create')}
          </button>
        </div>
      </form>

      <FoodSpecialsGallerySelector
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        onSelect={(imagePath) => {
          if (currentItemType === 'food' || currentItemType === 'drink') {
            setSpecialData({ ...specialData, image: imagePath });
          }
          setShowGallery(false);
        }}
        currentImagePath={currentItemType === 'food' || currentItemType === 'drink' ? specialData.image : undefined}
      />

      {currentItemType === 'announcement' && item && 'body' in item && item.id && (
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={async () => {
            setDeleteLoading(true);
            try {
              const res = await fetch(`/api/announcements/${item.id}`, {
                method: 'DELETE',
              });

              if (res.ok) {
                showToast('Announcement deleted successfully', 'success');
                if (item.id) {
                  onDelete?.(item.id);
                }
                onClose();
                onSuccess?.();
              } else {
                const error = await res.json();
                showToast('Failed to delete announcement', 'error', error.error || error.details || 'An error occurred');
              }
            } catch (error) {
              showToast('Failed to delete announcement', 'error', error instanceof Error ? error.message : 'An error occurred');
            } finally {
              setDeleteLoading(false);
              setShowDeleteConfirm(false);
            }
          }}
          title="Delete Announcement"
          message={`Are you sure you want to delete "${announcementData.title}"? This action cannot be undone.`}
          confirmText={deleteLoading ? 'Deleting...' : 'Delete'}
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </Modal>
  );
}

