'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaTrash, FaTimes, FaSave, FaCheck } from 'react-icons/fa';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';
import StatusToggle from '@/components/status-toggle';
import DatePicker from '@/components/date-picker';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';

interface DrinkSpecial {
  id?: string;
  title: string;
  description: string;
  priceNotes?: string; // Optional for backwards compatibility
  type: 'drink';
  appliesOn: string[];
  timeWindow?: string; // Optional for backwards compatibility
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DrinkSpecialModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  special?: DrinkSpecial;
  onSuccess?: () => void;
  onDelete?: (specialId: string) => void;
}

export default function DrinkSpecialModalForm({ isOpen, onClose, special, onSuccess, onDelete }: DrinkSpecialModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    title: special?.title || '',
    description: special?.description || '',
    appliesOn: special?.appliesOn || [],
    startDate: special?.startDate || '',
    endDate: special?.endDate || '',
    isActive: special?.isActive ?? true,
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  useEffect(() => {
    if (special) {
      const newFormData = {
        title: special.title || '',
        description: special.description || '',
        appliesOn: special.appliesOn || [],
        startDate: special.startDate || '',
        endDate: special.endDate || '',
        isActive: special.isActive ?? true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    } else {
      const newFormData = {
        title: '',
        description: '',
        appliesOn: [],
        startDate: '',
        endDate: '',
        isActive: true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [special, isOpen]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  
  // Warn user before leaving page with unsaved changes
  useUnsavedChangesWarning(isDirty && isOpen);

  function handleCancel() {
    if (isDirty) {
      // Reset form to initial state
      if (special) {
        const newFormData = {
          title: special.title || '',
          description: special.description || '',
          appliesOn: special.appliesOn || [],
          startDate: special.startDate || '',
          endDate: special.endDate || '',
          isActive: special.isActive ?? true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      } else {
        const newFormData = {
          title: '',
          description: '',
          appliesOn: [],
          startDate: '',
          endDate: '',
          isActive: true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      }
    } else {
      // Close form if clean
      onClose();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = special?.id ? `/api/specials/${special.id}` : '/api/specials';
      const method = special?.id ? 'PUT' : 'POST';

      // If weekly recurring is set, don't send dates (ongoing forever)
      const submitData = {
        ...formData,
        type: 'drink',
        priceNotes: '', // Set to empty string for drink specials
        timeWindow: '', // Set to empty string for drink specials
        appliesOn: JSON.stringify(formData.appliesOn),
        startDate: formData.appliesOn.length > 0 ? null : (formData.startDate || null),
        endDate: formData.appliesOn.length > 0 ? null : (formData.endDate || null),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        router.refresh();
        showToast(
          special?.id ? 'Drink special updated successfully' : 'Drink special created successfully',
          'success'
        );
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast(
          special?.id ? 'Failed to update drink special' : 'Failed to create drink special',
          'error',
          error.error || error.details || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving the drink special.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!special?.id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/specials/${special.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Drink special deleted successfully', 'success');
        onDelete?.(special.id);
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast('Failed to delete drink special', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  function toggleDay(day: string) {
    const newAppliesOn = formData.appliesOn.includes(day)
      ? formData.appliesOn.filter((d) => d !== day)
      : [...formData.appliesOn, day];
    
    // If selecting weekly days, clear date range (ongoing forever)
    setFormData({
      ...formData,
      appliesOn: newAppliesOn,
      startDate: newAppliesOn.length > 0 ? '' : formData.startDate,
      endDate: newAppliesOn.length > 0 ? '' : formData.endDate,
    });
  }

  const hasWeeklyRecurring = formData.appliesOn.length > 0;
  const hasDateRange = formData.startDate && formData.endDate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={special ? 'Edit Drink Special' : 'New Drink Special'}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Special Status</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                Control whether this special appears on your public menu.
              </p>
            </div>
            <StatusToggle
              type="active"
              value={formData.isActive}
              onChange={(value) => setFormData({ ...formData, isActive: value })}
              className="shrink-0"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-gray-900 dark:text-white">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="e.g., $3 Drafts, Happy Hour"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-white">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="Describe the drink special..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Weekly Schedule</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
              {hasWeeklyRecurring 
                ? 'This special will run every selected day, ongoing forever.'
                : 'Select which days this special applies each week. Leave empty to use date range instead.'}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-4 shadow-inner space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Applies On</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WEEKDAYS.map((day) => {
                const isSelected = formData.appliesOn.includes(day);
                return (
                  <label
                    key={day}
                    className={`flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                        : 'border-gray-200/70 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-900/40 hover:border-blue-400/70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDay(day)}
                      className="sr-only"
                    />
                    {day}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Date Range (alternative to weekly recurring) */}
        {!hasWeeklyRecurring && (
          <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-6 backdrop-blur-sm space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Date Range</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                Use this for one-time or date-specific specials. Leave empty if using weekly recurring days.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative isolate">
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(value) => setFormData({ ...formData, startDate: value })}
                  dateOnly={true}
                />
              </div>
              <div className="relative isolate">
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(value) => setFormData({ ...formData, endDate: value })}
                  min={formData.startDate || undefined}
                  dateOnly={true}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          {special?.id && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              <FaTrash className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
          >
            <FaTimes className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            disabled={
              loading ||
              (special?.id && !isDirty) ||
              (!hasWeeklyRecurring && !hasDateRange)
            }
            title={!hasWeeklyRecurring && !hasDateRange ? 'Please select weekly days or a date range' : ''}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{special?.id ? 'Saving...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                {special?.id ? <FaSave className="w-3.5 h-3.5" /> : <FaCheck className="w-3.5 h-3.5" />}
                <span>{special?.id ? 'Save' : 'Create'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Drink Special"
        message={`Are you sure you want to delete "${special?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Modal>
  );
}

