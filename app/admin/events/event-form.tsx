'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusToggle from '@/components/status-toggle';
import DateTimePicker from '@/components/date-time-picker';
import DatePicker from '@/components/date-picker';

interface Event {
  id?: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  venueArea: string;
  recurrenceRule: string;
  isAllDay: boolean;
  tags: string[];
  isActive: boolean;
}

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

export default function EventForm({ event }: { event?: Event }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Parse existing RRULE if editing
  const initialRecurrence = parseRRULE(event?.recurrenceRule);
  
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'monthly'>(initialRecurrence.frequency);
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(initialRecurrence.days);
  
  // Helper to get 1 year from now for recurring events
  const getOneYearFromNow = () => {
    const now = new Date();
    const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    return oneYearLater.toISOString().slice(0, 16);
  };
  
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    startDateTime: event?.startDateTime
      ? new Date(event.startDateTime).toISOString().slice(0, 16)
      : '',
    endDateTime: event?.endDateTime
      ? new Date(event.endDateTime).toISOString().slice(0, 16)
      : '',
    venueArea: event?.venueArea || 'bar',
    recurrenceRule: event?.recurrenceRule || '',
    isAllDay: event?.isAllDay ?? false,
    tags: event?.tags || [],
    isActive: event?.isActive ?? true,
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = event?.id ? `/api/events/${event.id}` : '/api/events';
      const method = event?.id ? 'PUT' : 'POST';

      const recurrenceRule = buildRRULE(recurrenceType, recurrenceDays);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          recurrenceRule,
          startDateTime: new Date(formData.startDateTime).toISOString(),
          endDateTime: formData.endDateTime ? new Date(formData.endDateTime).toISOString() : null,
        }),
      });

      if (res.ok) {
        router.push('/admin/specials-events');
        router.refresh();
      } else {
        alert('Failed to save event');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{event ? 'Edit Event' : 'New Event'}</h1>
          <Link
            href="/admin/specials-events"
            className="px-4 py-2 bg-gray-500 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 rounded text-white transition-colors"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md">
          {/* Status Toggle */}
          <StatusToggle
            type="active"
            value={formData.isActive}
            onChange={(value) => setFormData({ ...formData, isActive: value })}
            label="Status"
          />

          <div>
            <label htmlFor="title" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
              <input
                type="checkbox"
                checked={formData.isAllDay}
                onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium">All Day Event</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {formData.isAllDay ? (
                <DatePicker
                  label="Start Date"
                  value={formData.startDateTime ? formData.startDateTime.split('T')[0] : ''}
                  onChange={(value) => setFormData({ ...formData, startDateTime: value ? `${value}T00:00` : '' })}
                  required
                  dateOnly={true}
                />
              ) : (
                <DateTimePicker
                  label="Start Date & Time"
                  value={formData.startDateTime}
                  onChange={(value) => setFormData({ ...formData, startDateTime: value })}
                  required
                />
              )}
            </div>
            <div>
              {formData.isAllDay ? (
                <DatePicker
                  label="End Date"
                  value={formData.endDateTime ? formData.endDateTime.split('T')[0] : ''}
                  onChange={(value) => setFormData({ ...formData, endDateTime: value ? `${value}T00:00` : '' })}
                  min={formData.startDateTime ? formData.startDateTime.split('T')[0] : undefined}
                  dateOnly={true}
                />
              ) : (
                <DateTimePicker
                  label="End Date & Time"
                  value={formData.endDateTime || ''}
                  onChange={(value) => setFormData({ ...formData, endDateTime: value })}
                  min={formData.startDateTime || undefined}
                />
              )}
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Repeats</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
                <input
                  type="radio"
                  name="recurrence"
                  value="none"
                  checked={recurrenceType === 'none'}
                  onChange={() => setRecurrenceType('none')}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm">One-time event</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
                <input
                  type="radio"
                  name="recurrence"
                  value="weekly"
                  checked={recurrenceType === 'weekly'}
                  onChange={() => {
                    setRecurrenceType('weekly');
                    // If creating new event (no event.id), default to 1 year from now
                    if (!event?.id && !formData.startDateTime) {
                      const oneYearLater = getOneYearFromNow();
                      const threeHoursLater = new Date(oneYearLater);
                      threeHoursLater.setHours(threeHoursLater.getHours() + 3);
                      setFormData({ ...formData, startDateTime: oneYearLater, endDateTime: threeHoursLater.toISOString().slice(0, 16) });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm">Weekly</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
                <input
                  type="radio"
                  name="recurrence"
                  value="monthly"
                  checked={recurrenceType === 'monthly'}
                  onChange={() => {
                    setRecurrenceType('monthly');
                    // If creating new event (no event.id), default to 1 year from now
                    if (!event?.id && !formData.startDateTime) {
                      const oneYearLater = getOneYearFromNow();
                      const threeHoursLater = new Date(oneYearLater);
                      threeHoursLater.setHours(threeHoursLater.getHours() + 3);
                      setFormData({ ...formData, startDateTime: oneYearLater, endDateTime: threeHoursLater.toISOString().slice(0, 16) });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm">Monthly</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="venueArea" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Venue Area
            </label>
            <select
              id="venueArea"
              value={formData.venueArea}
              onChange={(e) => setFormData({ ...formData, venueArea: e.target.value })}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="bar">Bar</option>
              <option value="stage">Stage</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/admin/specials-events"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
            >
              {loading ? (event?.id ? 'Saving...' : 'Creating...') : (event?.id ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

