'use client';

import { FormEvent, useEffect, useState } from 'react';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import ConfirmationDialog from '@/components/confirmation-dialog';
import DateTimePicker, { type DateTimeOption } from '@/components/date-time-picker';
import {
  parseDateTimeLocalAsCompanyTimezone,
  formatDateAsDateTimeLocal,
  getCompanyTimezoneSync,
} from '@/lib/timezone';
import {
  footballGameDescription,
  footballGameTitle,
  houseMealFromEvent,
  opponentFromFootballTitle,
  withFootballGameTags,
} from '@/lib/football-games';
import { findNflTeam, NFL_TEAMS } from '@/lib/nfl-teams';
import { MatchupSplit } from '@/components/matchup-brand';

export type FootballGameFormEvent = {
  id?: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  tags?: string[];
  isActive: boolean;
};

interface FootballGameModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  event?: FootballGameFormEvent;
  onSuccess?: () => void;
  onDelete?: (eventId: string) => void;
  onEventAdded?: (event: any) => void;
  onEventUpdated?: (event: any) => void;
  embed?: boolean;
  /** YYYY-MM-DD used when creating from a calendar day. Kickoff stays 2:00 PM. */
  defaultDate?: string;
}

const FOOTBALL_KICKOFF_TIMES: DateTimeOption[] = [
  { hours: 11, minutes: 0, label: '11:00 AM' },
  { hours: 14, minutes: 0, label: '2:00 PM' },
  { hours: 18, minutes: 0, label: '6:00 PM' },
];

function isFootballKickoffTime(value: string): boolean {
  const time = value.slice(11, 16);
  return FOOTBALL_KICKOFF_TIMES.some(
    (option) =>
      `${String(option.hours).padStart(2, '0')}:${String(option.minutes).padStart(2, '0')}` ===
      time
  );
}

function getDefaultKickoff(): string {
  const now = new Date();
  const mtParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);

  const year = parseInt(mtParts.find((p) => p.type === 'year')!.value);
  const month = parseInt(mtParts.find((p) => p.type === 'month')!.value);
  const day = parseInt(mtParts.find((p) => p.type === 'day')!.value);
  const weekday = mtParts.find((p) => p.type === 'weekday')!.value;
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentDay = dayMap[weekday] ?? 0;
  const daysUntilSunday = (7 - currentDay) % 7;
  const target = new Date(Date.UTC(year, month - 1, day + daysUntilSunday));
  const yyyy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(target.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T14:00`;
}

function formatIncomingDateTime(value: string): string {
  if (!value) return getDefaultKickoff();
  if (
    !value.includes('Z') &&
    !value.includes('+') &&
    !value.includes('-', 10)
  ) {
    return value.slice(0, 16);
  }
  return formatDateAsDateTimeLocal(new Date(value), getCompanyTimezoneSync());
}

export default function FootballGameModalForm({
  isOpen,
  onClose,
  event,
  onSuccess,
  onDelete,
  onEventAdded,
  onEventUpdated,
  embed,
  defaultDate,
}: FootballGameModalFormProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [houseMeal, setHouseMeal] = useState('TBD');
  const [startDateTime, setStartDateTime] = useState(() =>
    defaultDate ? `${defaultDate}T14:00` : getDefaultKickoff()
  );
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (event?.id) {
      const parsed = opponentFromFootballTitle(event.title || '');
      setOpponent(findNflTeam(parsed)?.name ?? parsed);
      setHouseMeal(houseMealFromEvent(event));
      setStartDateTime(formatIncomingDateTime(event.startDateTime));
      setIsActive(event.isActive ?? true);
    } else {
      const kickoff = defaultDate ? `${defaultDate}T14:00` : getDefaultKickoff();
      setOpponent('');
      setHouseMeal('TBD');
      setStartDateTime(kickoff);
      setIsActive(true);
    }
    setShowDeleteConfirm(false);
  }, [event, isOpen, defaultDate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const opponentName = findNflTeam(opponent)?.name ?? opponent.trim();
    const title = footballGameTitle(opponentName);
    if (!opponentName) {
      showToast(
        'Opponent is required',
        'error',
        'Choose who the Broncos are playing.'
      );
      return;
    }
    if (!houseMeal.trim()) {
      showToast(
        'House meal is required',
        'error',
        'Add what the house is providing for the pot luck buffet.'
      );
      return;
    }
    if (!startDateTime || !isFootballKickoffTime(startDateTime)) {
      showToast(
        'Choose a kickoff time',
        'error',
        'Kickoff is 11:00 AM, 2:00 PM, or 6:00 PM.'
      );
      return;
    }

    setLoading(true);
    try {
      const url = event?.id ? `/api/events/${event.id}` : '/api/events';
      const method = event?.id ? 'PUT' : 'POST';
      const start = parseDateTimeLocalAsCompanyTimezone(
        startDateTime,
        getCompanyTimezoneSync()
      );
      const end = new Date(start.getTime() + 3.5 * 60 * 60 * 1000);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: footballGameDescription(houseMeal),
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          venueArea: 'bar',
          recurrenceRule: null,
          isAllDay: false,
          tags: withFootballGameTags(event?.tags, houseMeal),
          isActive,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        showToast(
          event?.id
            ? 'Failed to update football game'
            : 'Failed to add football game',
          'error',
          error.error || error.details || 'Please try again.'
        );
        return;
      }

      const eventData = await res.json();
      showToast(
        event?.id ? 'Football game updated' : 'Football game added',
        'success'
      );
      if (event?.id) {
        onEventUpdated?.(eventData);
      } else {
        onEventAdded?.(eventData);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error
          ? error.message
          : 'An error occurred while saving the game.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!event?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Football game deleted', 'success');
        onDelete?.(event.id);
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json().catch(() => ({}));
        showToast(
          'Failed to delete football game',
          'error',
          error.error || 'Please try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error
          ? error.message
          : 'An error occurred while deleting the game.'
      );
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  const opponentTeam = findNflTeam(opponent);
  const customOpponent =
    opponent.trim() && !opponentTeam ? opponent.trim() : '';
  const teams = [...NFL_TEAMS].sort((a, b) =>
    `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`)
  );

  const formContent = (
    <>
      <form
        onSubmit={handleSubmit}
        className={embed ? 'flex flex-col min-h-0 flex-1' : 'space-y-3'}
      >
        <div className={embed ? 'flex-1 min-h-0 overflow-y-auto' : ''}>
          <div className="rounded-2xl border border-orange-200/80 dark:border-orange-900/50 bg-gradient-to-br from-orange-50/90 to-slate-50 dark:from-slate-900/60 dark:to-slate-950 shadow-sm p-3 sm:p-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-400">
                    Broncos Game Day
                  </p>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                    Homepage highlights the house meal, kickoff, and who the
                    Broncos are playing.
                  </p>
                </div>
                <StatusToggle
                  type="active"
                  value={isActive}
                  onChange={setIsActive}
                  className="shrink-0"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="football-opponent"
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  Opponent *
                </label>
                <select
                  id="football-opponent"
                  value={opponentTeam?.name ?? opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all min-h-[44px]"
                >
                  <option value="">Select a team</option>
                  {customOpponent && (
                    <option value={customOpponent}>{customOpponent}</option>
                  )}
                  {teams.map((team) => (
                    <option key={team.name} value={team.name}>
                      {team.city} {team.name}
                    </option>
                  ))}
                </select>
                {opponentTeam && <MatchupSplit team={opponentTeam} />}
              </div>

              <DateTimePicker
                label="Kickoff"
                value={startDateTime}
                onChange={setStartDateTime}
                timeOptions={FOOTBALL_KICKOFF_TIMES}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kickoff is 11:00 AM, 2:00 PM, or 6:00 PM. Ends 3.5 hours later
                on the calendar. You can change the end time after saving.
              </p>

              <div className="space-y-1">
                <label
                  htmlFor="football-house-meal"
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  House meal *
                </label>
                <input
                  id="football-house-meal"
                  type="text"
                  value={houseMeal}
                  onChange={(e) => setHouseMeal(e.target.value)}
                  required
                  maxLength={40}
                  placeholder="Tacos, lasagna, chili…"
                  className="w-full rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all min-h-[44px]"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  What the kitchen puts out for the pot luck. Guests are invited
                  to bring a side or dessert to share.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2 shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700 ${embed ? 'sticky bottom-0 bg-white dark:bg-gray-800 z-10 -mx-4 sm:-mx-5 px-4 sm:px-5 -mb-4 sm:-mb-5 pb-4 sm:pb-5' : ''}`}
        >
          {event?.id && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-3 py-2 sm:px-2.5 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm sm:text-xs font-semibold disabled:opacity-50 w-full sm:w-auto sm:mr-auto order-3 sm:order-1 min-h-[44px]"
            >
              Delete
            </button>
          )}
          <div className="flex flex-col sm:flex-row gap-1.5 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 sm:px-2.5 sm:py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm sm:text-xs font-semibold min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 sm:px-2.5 sm:py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm sm:text-xs font-semibold disabled:opacity-50 min-h-[44px]"
            >
              {loading
                ? 'Saving...'
                : event?.id
                  ? 'Save Game'
                  : 'Add Football Game'}
            </button>
          </div>
        </div>
      </form>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete football game"
        message={`Delete "${footballGameTitle(findNflTeam(opponent)?.name ?? opponent)}"? It will be removed from the calendar and hero.`}
        confirmText={loading ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );

  if (embed)
    return <div className="min-w-0 overflow-y-auto">{formContent}</div>;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event?.id ? 'Edit Football Game' : 'Add Football Game'}
      helpFeature="events"
      helpSlug="creating-events"
    >
      {formContent}
    </Modal>
  );
}
