'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import {
  TV_GAME_TEAM_KEYS,
  TV_GAME_TEAMS,
  isTvGameEvent,
  tvGameTeamFromEvent,
  type TvGameTeamKey,
} from '@/lib/tv-game-schedule';

type ImportResult = {
  team: TvGameTeamKey;
  seasonLabel: string | null;
  fetched: number;
  created: number;
  updated: number;
  skippedManual: number;
  unchanged: number;
  deactivated: number;
  events: any[];
};

interface TvGamesImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingEvents?: Array<{ tags?: unknown; isActive?: boolean }>;
  onImported?: (events: any[]) => void;
}

export default function TvGamesImportModal({
  isOpen,
  onClose,
  existingEvents = [],
  onImported,
}: TvGamesImportModalProps) {
  const [loadingTeam, setLoadingTeam] = useState<TvGameTeamKey | null>(null);
  const [removeMissing, setRemoveMissing] = useState(false);
  const [lastResults, setLastResults] = useState<Partial<Record<TvGameTeamKey, ImportResult>>>({});

  const counts = useMemo(() => {
    const result: Record<TvGameTeamKey, number> = { avalanche: 0, nuggets: 0 };
    for (const event of existingEvents) {
      if (!isTvGameEvent(event) || event.isActive === false) continue;
      const team = tvGameTeamFromEvent(event);
      if (team) result[team] += 1;
    }
    return result;
  }, [existingEvents]);

  const runImport = async (teamKey: TvGameTeamKey) => {
    setLoadingTeam(teamKey);
    try {
      const res = await fetch('/api/events/tv-games/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamKey, removeMissing }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || `Failed to refresh ${TV_GAME_TEAMS[teamKey].shortName} schedule`, 'error');
        return;
      }

      const result = data as ImportResult;
      setLastResults((prev) => ({ ...prev, [teamKey]: result }));
      if (result.events?.length) {
        onImported?.(result.events);
      }

      const team = TV_GAME_TEAMS[teamKey];
      const parts = [
        `${result.created} added`,
        `${result.updated} updated`,
        result.skippedManual ? `${result.skippedManual} left alone (edited)` : null,
        result.deactivated ? `${result.deactivated} deactivated` : null,
      ].filter(Boolean);

      showToast(
        `${team.shortName} schedule refreshed`,
        'success',
        parts.join(' · ')
      );
    } catch {
      showToast(`Failed to refresh ${TV_GAME_TEAMS[teamKey].shortName} schedule`, 'error');
    } finally {
      setLoadingTeam(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Games We'll Have On"
      maxWidth="sm:max-w-lg"
      helpFeature="events"
      helpSlug="tv-games-import"
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Pull the Avalanche or Nuggets season from ESPN into the calendar as
          regular events labeled that we&apos;ll have the game on. Use refresh
          anytime schedules change. Games you&apos;ve already edited by hand are
          left alone.
        </p>

        <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={removeMissing}
            onChange={(e) => setRemoveMissing(e.target.checked)}
          />
          <span>
            Deactivate games that disappear from the ESPN schedule (only
            untouched imports — never hand-edited ones).
          </span>
        </label>

        <ul className="space-y-3">
          {TV_GAME_TEAM_KEYS.map((teamKey) => {
            const team = TV_GAME_TEAMS[teamKey];
            const busy = loadingTeam === teamKey;
            const result = lastResults[teamKey];
            const onCalendar = counts[teamKey];

            return (
              <li
                key={teamKey}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {team.label}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {onCalendar > 0
                        ? `${onCalendar} active on calendar`
                        : 'Not imported yet'}
                      {result?.seasonLabel ? ` · ESPN ${result.seasonLabel}` : ''}
                    </p>
                    {result && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last run: {result.fetched} fetched · {result.created} added ·{' '}
                        {result.updated} updated · {result.skippedManual} edited skipped
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!!loadingTeam}
                    onClick={() => runImport(teamKey)}
                    className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? 'Working…' : onCalendar > 0 ? 'Refresh' : 'Import season'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          After import, open any game on the calendar to edit title, time, or
          description like a normal event. Refresh will not overwrite those
          changes.
        </p>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
