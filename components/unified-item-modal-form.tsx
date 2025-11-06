'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
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

type ItemType = 'event' | 'food' | 'drink';
type UnifiedItem = Event | Special;

interface UnifiedItemModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  item?: UnifiedItem;
  itemType?: ItemType;
  onSuccess?: () => void;
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

export default function UnifiedItemModalForm({ isOpen, onClose, item, itemType: initialItemType, onSuccess }: UnifiedItemModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Determine item type from existing item or initial type
  const getItemType = (): ItemType => {
    if (item) {
      // Check if it's an event (has startDateTime)
      if ('startDateTime' in item) {
        return 'event';
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
      setRecurrenceType('none');
      setRecurrenceDays([]);
      setMonthDay(new Date().getDate());
      setDateError(null);
    }
  }, [item, initialItemType, isOpen]);

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
    ? `Edit ${currentItemType === 'event' ? 'Event' : currentItemType === 'drink' ? 'Drink Special' : 'Food Special'}`
    : 'New Item';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Item Type Selector - only show when creating new */}
        {!isEditing && (
          <div>
            <label className="block mb-1 text-sm font-medium">Item Type *</label>
            <div className="flex gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="itemType"
                  checked={currentItemType === 'event'}
                  onChange={() => setCurrentItemType('event')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Event</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="itemType"
                  checked={currentItemType === 'food'}
                  onChange={() => setCurrentItemType('food')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Food Special</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="itemType"
                  checked={currentItemType === 'drink'}
                  onChange={() => setCurrentItemType('drink')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Drink Special</span>
              </label>
            </div>
          </div>
        )}

        {/* Status Toggle */}
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
          label="Status"
        />

        {/* Title - Common Field */}
        <div>
          <label htmlFor="title" className="block mb-1 text-sm font-medium">
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
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>

        {/* Description - Common Field */}
        <div>
          <label htmlFor="description" className="block mb-1 text-sm font-medium">
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
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>

        {/* Event-specific fields */}
        {currentItemType === 'event' && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAllDay"
                  checked={eventData.isAllDay}
                  onChange={(e) => handleAllDayChange(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="isAllDay" className="cursor-pointer text-sm">
                  All Day Event
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
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
                <div>
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
                <p className="text-xs text-red-400 mt-1">{dateError}</p>
              )}

              <div>
                <label className="block mb-1 text-sm font-medium">
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
                      <span className="text-sm">One-time event</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
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
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Weekly</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
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
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Monthly</span>
                    </label>
                  </div>

                  {recurrenceType === 'weekly' && (
                    <div className="ml-4 p-3 bg-gray-800 rounded border border-gray-700">
                      <p className="text-xs text-gray-300 mb-2">Repeat on:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {WEEKDAYS.map((day) => (
                          <label key={day} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={recurrenceDays.includes(day)}
                              onChange={() => toggleRecurrenceDay(day)}
                              className="w-3.5 h-3.5"
                            />
                            <span className="text-xs">{day}</span>
                          </label>
                        ))}
                      </div>
                      {recurrenceDays.length === 0 && (
                        <p className="text-[10px] text-yellow-400 mt-1.5">Select at least one day</p>
                      )}
                    </div>
                  )}

                  {recurrenceType === 'monthly' && (
                    <div className="ml-4 p-3 bg-gray-800 rounded border border-gray-700">
                      <p className="text-xs text-gray-300 mb-2">Repeat on day of month:</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={monthDay}
                          onChange={(e) => setMonthDay(parseInt(e.target.value))}
                          className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <option key={day} value={day}>
                              {day}
                              {day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-400">of each month</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Special-specific fields */}
        {currentItemType !== 'event' && (
          <>
            <div>
              <label htmlFor="priceNotes" className="block mb-1 text-sm font-medium">
                Price Notes
              </label>
              <input
                id="priceNotes"
                type="text"
                value={specialData.priceNotes}
                onChange={(e) => setSpecialData({ ...specialData, priceNotes: e.target.value })}
                placeholder="e.g., $3 drafts, Happy hour prices"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              />
            </div>

            {currentItemType === 'drink' && (
              <div>
                <label className="block mb-1 text-sm font-medium">Applies On (optional for date-specific specials)</label>
                <div className="grid grid-cols-2 gap-2">
                  {WEEKDAYS.map((day) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={specialData.appliesOn.includes(day)}
                        onChange={() => toggleSpecialDay(day)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Select which days this special applies. Leave empty if using start/end dates.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="timeWindow" className="block mb-1 text-sm font-medium">
                Time Window
              </label>
              <input
                id="timeWindow"
                type="text"
                value={specialData.timeWindow}
                onChange={(e) => setSpecialData({ ...specialData, timeWindow: e.target.value })}
                placeholder="e.g., 11am-3pm, Happy Hour"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="startDate" className="block mb-1 text-sm font-medium">
                  Start Date (optional)
                </label>
                <DatePicker
                  value={specialData.startDate || ''}
                  onChange={(value) => setSpecialData({ ...specialData, startDate: value })}
                  dateOnly={true}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block mb-1 text-sm font-medium">
                  End Date (optional)
                </label>
                <DatePicker
                  value={specialData.endDate || ''}
                  onChange={(value) => setSpecialData({ ...specialData, endDate: value })}
                  min={specialData.startDate || undefined}
                  dateOnly={true}
                />
              </div>
            </div>

            <div>
              <label htmlFor="image" className="block mb-1 text-sm font-medium">
                Image Path (optional)
              </label>
              <input
                id="image"
                type="text"
                value={specialData.image}
                onChange={(e) => setSpecialData({ ...specialData, image: e.target.value })}
                placeholder="/uploads/special-image.jpg"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              loading ||
              (currentItemType === 'event' && !eventData.startDateTime) ||
              (currentItemType === 'food' && !specialData.startDate && !specialData.endDate) ||
              (currentItemType === 'drink' && specialData.appliesOn.length === 0 && !specialData.startDate && !specialData.endDate)
            }
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
          >
            {loading 
              ? (item?.id ? 'Saving...' : 'Creating...')
              : (item?.id ? 'Save' : 'Create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

