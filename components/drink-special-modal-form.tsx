'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';
import StatusToggle from '@/components/status-toggle';
import DatePicker from '@/components/date-picker';

interface DrinkSpecial {
  id?: string;
  title: string;
  description: string;
  priceNotes: string;
  type: 'drink';
  appliesOn: string[];
  timeWindow: string;
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
    priceNotes: special?.priceNotes || '',
    appliesOn: special?.appliesOn || [],
    timeWindow: special?.timeWindow || '',
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
        priceNotes: special.priceNotes || '',
        appliesOn: special.appliesOn || [],
        timeWindow: special.timeWindow || '',
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
        priceNotes: '',
        appliesOn: [],
        timeWindow: '',
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

  function handleCancel() {
    if (isDirty) {
      // Reset form to initial state
      if (special) {
        const newFormData = {
          title: special.title || '',
          description: special.description || '',
          priceNotes: special.priceNotes || '',
          appliesOn: special.appliesOn || [],
          timeWindow: special.timeWindow || '',
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
          priceNotes: '',
          appliesOn: [],
          timeWindow: '',
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <StatusToggle
          type="active"
          value={formData.isActive}
          onChange={(value) => setFormData({ ...formData, isActive: value })}
          label="Status"
        />

        <div>
          <label htmlFor="title" className="block mb-2">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            placeholder="e.g., $3 Drafts, Happy Hour"
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            placeholder="Describe the drink special..."
          />
        </div>

        <div>
          <label htmlFor="priceNotes" className="block mb-2">
            Price Notes
          </label>
          <input
            id="priceNotes"
            type="text"
            value={formData.priceNotes}
            onChange={(e) => setFormData({ ...formData, priceNotes: e.target.value })}
            placeholder="e.g., $3 drafts, Happy hour prices"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          />
        </div>

        <div>
          <label htmlFor="timeWindow" className="block mb-2">
            Time Window
          </label>
          <input
            id="timeWindow"
            type="text"
            value={formData.timeWindow}
            onChange={(e) => setFormData({ ...formData, timeWindow: e.target.value })}
            placeholder="e.g., 4pm-9pm, All Day, Happy Hour"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          />
        </div>

        {/* Weekly Recurring Pattern */}
        <div>
          <label className="block mb-2">Weekly Recurring Days</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {WEEKDAYS.map((day) => (
              <label key={day} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.appliesOn.includes(day)}
                  onChange={() => toggleDay(day)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {hasWeeklyRecurring 
              ? 'This special will run every selected day, ongoing forever.'
              : 'Select which days this special applies each week. Leave empty to use date range instead.'}
          </p>
        </div>

        {/* Date Range (alternative to weekly recurring) */}
        {!hasWeeklyRecurring && (
          <div>
            <label className="block mb-2">Date Range (optional, alternative to weekly recurring)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(value) => setFormData({ ...formData, startDate: value })}
                  dateOnly={true}
                />
              </div>
              <div>
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(value) => setFormData({ ...formData, endDate: value })}
                  min={formData.startDate || undefined}
                  dateOnly={true}
                />
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Use this for one-time or date-specific specials. Leave empty if using weekly recurring days.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {special?.id && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 mr-auto"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              loading ||
              (special?.id && !isDirty) ||
              (!hasWeeklyRecurring && !hasDateRange)
            }
            title={!hasWeeklyRecurring && !hasDateRange ? 'Please select weekly days or a date range' : ''}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
          >
            {loading ? (special?.id ? 'Saving...' : 'Creating...') : (special?.id ? 'Save' : 'Create')}
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

