'use client';

import { useState, FormEvent } from 'react';
import { showToast } from '@/components/toast';

interface SettingsFormProps {
  initialTimezone: string;
  initialCalendarHours?: { startHour: number; endHour: number } | null;
}

// Common timezones for US businesses
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Mountain Time - Arizona (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

export default function SettingsForm({ initialTimezone, initialCalendarHours }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [calendarStartHour, setCalendarStartHour] = useState(initialCalendarHours?.startHour ?? 12);
  const [calendarEndHour, setCalendarEndHour] = useState(initialCalendarHours?.endHour ?? 26); // 26 = 2 AM next day

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Save timezone
      const timezoneRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'timezone',
          value: timezone,
          description: 'Company timezone for all date/time operations',
        }),
      });

      // Save calendar hours
      const calendarHoursRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'calendarHours',
          value: JSON.stringify({ startHour: calendarStartHour, endHour: calendarEndHour }),
          description: 'Calendar visible hours range (startHour: 0-23, endHour: 0-26 where 24+ is next day)',
        }),
      });

      if (timezoneRes.ok && calendarHoursRes.ok) {
        showToast('Settings saved successfully', 'success');
      } else {
        const error = await (timezoneRes.ok ? calendarHoursRes : timezoneRes).json();
        showToast('Failed to save settings', 'error', error.error || 'Please try again.');
      }
    } catch (error) {
      showToast('Request failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Timezone Setting */}
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400 mb-1">
              Company Timezone
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Set the timezone for your business location. This affects how dates and times are displayed and calculated throughout the system.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="timezone" className="text-sm font-medium text-gray-900 dark:text-white">
              Timezone *
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Current setting: <span className="font-medium">{TIMEZONES.find(tz => tz.value === timezone)?.label || timezone}</span>
            </p>
          </div>
        </div>

        {/* Calendar Hours Setting */}
        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-5 backdrop-blur-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400 mb-1">
              Calendar Display Hours
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Customize which hours are shown in the calendar week view. Most bar events are either all-day or start in the evenings, so you can hide early morning hours to focus on relevant times.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="calendarStartHour" className="text-sm font-medium text-gray-900 dark:text-white">
                Start Hour *
              </label>
              <select
                id="calendarStartHour"
                value={calendarStartHour}
                onChange={(e) => setCalendarStartHour(parseInt(e.target.value))}
                required
                className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
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

            <div className="space-y-2">
              <label htmlFor="calendarEndHour" className="text-sm font-medium text-gray-900 dark:text-white">
                End Hour *
              </label>
              <select
                id="calendarEndHour"
                value={calendarEndHour}
                onChange={(e) => setCalendarEndHour(parseInt(e.target.value))}
                required
                className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
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
                    // Next day hours (24 = midnight next day, 25 = 1 AM next day, 26 = 2 AM next day)
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
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The calendar will show hours from <span className="font-medium">
              {calendarStartHour === 0 ? '12 AM' : calendarStartHour < 12 ? `${calendarStartHour} AM` : calendarStartHour === 12 ? '12 PM' : `${calendarStartHour - 12} PM`}
            </span> to <span className="font-medium">
              {calendarEndHour < 24 
                ? (calendarEndHour === 0 ? '12 AM' : calendarEndHour < 12 ? `${calendarEndHour} AM` : calendarEndHour === 12 ? '12 PM' : `${calendarEndHour - 12} PM`)
                : `${calendarEndHour - 24} AM (next day)`
              }
            </span>
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

