'use client';

import { useState, FormEvent, useEffect } from 'react';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';

interface Event {
  id: string;
  title: string;
  recurrenceRule: string | null;
  isActive: boolean;
}

interface DuplicateCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: Event[];
  onSuccess?: () => void;
}

export default function DuplicateCalendarModal({
  isOpen,
  onClose,
  events,
  onSuccess,
}: DuplicateCalendarModalProps) {
  const [loading, setLoading] = useState(false);
  const [sourceYear, setSourceYear] = useState<number>(new Date().getFullYear());
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear() + 1);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  // Filter to only recurring events
  const recurringEvents = events.filter(
    (e) => e.recurrenceRule && e.recurrenceRule.trim().length > 0 && e.isActive
  );

  useEffect(() => {
    if (isOpen) {
      // Reset to current year and next year
      const currentYear = new Date().getFullYear();
      setSourceYear(currentYear);
      setTargetYear(currentYear + 1);
      // Select all recurring events by default
      setSelectedEventIds(recurringEvents.map((e) => e.id));
      setSelectAll(true);
    }
  }, [isOpen, recurringEvents]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedEventIds(recurringEvents.map((e) => e.id));
    } else {
      setSelectedEventIds([]);
    }
  };

  const handleToggleEvent = (eventId: string) => {
    setSelectAll(false);
    if (selectedEventIds.includes(eventId)) {
      setSelectedEventIds(selectedEventIds.filter((id) => id !== eventId));
    } else {
      setSelectedEventIds([...selectedEventIds, eventId]);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (targetYear <= sourceYear) {
      showToast('Target year must be after source year', 'error');
      return;
    }

    if (selectedEventIds.length === 0) {
      showToast('Please select at least one event to duplicate', 'error');
      return;
    }

    setShowConfirm(true);
  };

  const confirmDuplicate = async () => {
    setLoading(true);
    setShowConfirm(false);

    try {
      const res = await fetch('/api/events/duplicate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceYear,
          targetYear,
          eventIds: selectedEventIds,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(
          `Successfully duplicated ${result.duplicated} event${result.duplicated !== 1 ? 's' : ''} to ${targetYear}${result.errors > 0 ? ` (${result.errors} error${result.errors !== 1 ? 's' : ''})` : ''}`,
          'success'
        );
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast(
          'Failed to duplicate calendar',
          'error',
          error.error || 'Please try again.'
        );
      }
    } catch (error) {
      showToast(
        'Duplicate failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred.'
      );
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear + i);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Duplicate Calendar to Following Year"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Duplicate recurring events from one year to another, preserving day-of-week, week-of-month, and monthly patterns.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="sourceYear"
                className="block mb-1 text-sm font-medium text-gray-900 dark:text-white"
              >
                Source Year
              </label>
              <select
                id="sourceYear"
                value={sourceYear}
                onChange={(e) => setSourceYear(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
                required
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="targetYear"
                className="block mb-1 text-sm font-medium text-gray-900 dark:text-white"
              >
                Target Year
              </label>
              <select
                id="targetYear"
                value={targetYear}
                onChange={(e) => setTargetYear(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
                required
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year} disabled={year <= sourceYear}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {recurringEvents.length === 0 ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
              No recurring events found. Only events with recurrence rules can be duplicated.
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4"
                />
                <label
                  htmlFor="selectAll"
                  className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                >
                  Select All ({recurringEvents.length} recurring events)
                </label>
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded p-2 space-y-2">
                {recurringEvents.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEventIds.includes(event.id)}
                      onChange={() => handleToggleEvent(event.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-900 dark:text-white flex-1">
                      {event.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
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
              disabled={loading || recurringEvents.length === 0}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
            >
              {loading ? 'Duplicating...' : 'Duplicate Calendar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDuplicate}
        title="Confirm Calendar Duplication"
        message={`Are you sure you want to duplicate ${selectedEventIds.length} event${selectedEventIds.length !== 1 ? 's' : ''} from ${sourceYear} to ${targetYear}? This will create new events based on their recurrence patterns.`}
        confirmText={loading ? 'Duplicating...' : 'Duplicate'}
        cancelText="Cancel"
      />
    </>
  );
}

