'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';
import StatusToggle from '@/components/status-toggle';
import DatePicker from '@/components/date-picker';

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
  isActive: boolean;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SPECIAL_TYPES = ['food', 'drink'];

interface SpecialModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  special?: Special;
  defaultType?: 'food' | 'drink';
  onSuccess?: () => void;
  onDelete?: (specialId: string) => void;
}

export default function SpecialModalForm({ isOpen, onClose, special, defaultType, onSuccess, onDelete }: SpecialModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Helper function to format date to YYYY-MM-DD format (in Mountain Time)
  const formatDateForInput = (date: any): string => {
    if (!date) return '';
    
    // Convert to Date object if needed
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // If it's already in YYYY-MM-DD format, return as is (assuming it's already Mountain Time)
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date;
      }
      // Parse ISO string or other date string
      dateObj = new Date(date);
    } else {
      return '';
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Format in Mountain Time to get the correct date
    const mtStr = dateObj.toLocaleDateString('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = mtStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    title: special?.title || '',
    description: special?.description || '',
    priceNotes: special?.priceNotes || '',
    type: special?.type || defaultType || 'food',
    appliesOn: special?.appliesOn || [],
    timeWindow: special?.timeWindow || '',
    date: formatDateForInput(special?.startDate) || '', // For food type, use single date field
    startDate: formatDateForInput(special?.startDate) || '', // For drink type
    endDate: formatDateForInput(special?.endDate) || '',
    isActive: special?.isActive ?? true,
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  useEffect(() => {
    if (special) {
      const formattedStartDate = formatDateForInput(special.startDate);
      const formattedEndDate = formatDateForInput(special.endDate);
      
      const newFormData = {
        title: special.title || '',
        description: special.description || '',
        priceNotes: special.priceNotes || '',
        type: special.type || 'food',
        appliesOn: special.appliesOn || [],
        timeWindow: special.timeWindow || '',
        date: formattedStartDate, // For food type, use single date
        startDate: formattedStartDate, // For drink type
        endDate: formattedEndDate,
        isActive: special.isActive ?? true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    } else {
      const newFormData = {
        title: '',
        description: '',
        priceNotes: '',
        type: defaultType || 'food',
        appliesOn: [],
        timeWindow: '',
        date: '',
        startDate: '',
        endDate: '',
        isActive: true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [special, defaultType, isOpen]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  function handleCancel() {
    if (isDirty) {
      // Reset form to initial state
      if (special) {
        const formattedStartDate = formatDateForInput(special.startDate);
        const formattedEndDate = formatDateForInput(special.endDate);
        
        const newFormData = {
          title: special.title || '',
          description: special.description || '',
          priceNotes: special.priceNotes || '',
          type: special.type || 'food',
          appliesOn: special.appliesOn || [],
          timeWindow: special.timeWindow || '',
          date: formattedStartDate,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          isActive: special.isActive ?? true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      } else {
        const newFormData = {
          title: '',
          description: '',
          priceNotes: '',
          type: defaultType || 'food',
          appliesOn: [],
          timeWindow: '',
          date: '',
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

  // Clear appliesOn when switching to food type (food specials aren't recurring)
  useEffect(() => {
    if (formData.type === 'food' && formData.appliesOn.length > 0) {
      setFormData((prev) => ({ ...prev, appliesOn: [] }));
    }
  }, [formData.type, formData.appliesOn.length]);

  // Sync date field with startDate/endDate when type changes
  useEffect(() => {
    if (formData.type === 'food') {
      // When switching to food, use date or startDate
      const dateValue = formData.date || formData.startDate;
      if (dateValue) {
        setFormData((prev) => ({ ...prev, date: dateValue, startDate: dateValue, endDate: dateValue }));
      }
    }
  }, [formData.type]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = special?.id ? `/api/specials/${special.id}` : '/api/specials';
      const method = special?.id ? 'PUT' : 'POST';

      // For food type, set both startDate and endDate to the same date
      const submitData = {
        ...formData,
        startDate: formData.type === 'food' ? formData.date : formData.startDate,
        endDate: formData.type === 'food' ? formData.date : formData.endDate,
      };
      // Remove the date field before submitting
      const { date, ...dataToSubmit } = submitData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      if (res.ok) {
        router.refresh();
        showToast(
          special?.id ? 'Special updated successfully' : 'Special created successfully',
          'success'
        );
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast(
          special?.id ? 'Failed to update special' : 'Failed to create special',
          'error',
          error.error || error.details || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving the special.'
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: string) {
    setFormData({
      ...formData,
      appliesOn: formData.appliesOn.includes(day)
        ? formData.appliesOn.filter((d) => d !== day)
        : [...formData.appliesOn, day],
    });
  }

  async function handleDelete() {
    if (!special?.id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/specials/${special.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Special deleted successfully', 'success');
        onDelete?.(special.id);
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast('Failed to delete special', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={special ? 'Edit Special' : 'New Special'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <StatusToggle
          type="active"
          value={formData.isActive}
          onChange={(value) => setFormData({ ...formData, isActive: value })}
          label="Status"
        />

        <div>
          <label htmlFor="title" className="block mb-1.5 text-sm font-medium">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>

        <div>
          <label htmlFor="description" className="block mb-1.5 text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>

        <div>
          <label htmlFor="priceNotes" className="block mb-1.5 text-sm font-medium">
            Price Notes
          </label>
          <input
            id="priceNotes"
            type="text"
            value={formData.priceNotes}
            onChange={(e) => setFormData({ ...formData, priceNotes: e.target.value })}
            placeholder="e.g., $3 drafts, Happy hour prices"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>

        <div>
          <label htmlFor="type" className="block mb-1.5 text-sm font-medium">
            Type *
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            required
          >
            {SPECIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Select whether this is a food or drink special</p>
        </div>

        {formData.type === 'drink' && (
          <div>
            <label className="block mb-1.5 text-sm font-medium">Applies On (optional for date-specific specials)</label>
            <div className="grid grid-cols-2 gap-2">
              {WEEKDAYS.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={formData.appliesOn.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="w-4 h-4"
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Select which days this special applies. Leave empty if using start/end dates.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="timeWindow" className="block mb-1.5 text-sm font-medium">
            Time Window
          </label>
          <input
            id="timeWindow"
            type="text"
            value={formData.timeWindow}
            onChange={(e) => setFormData({ ...formData, timeWindow: e.target.value })}
            placeholder="e.g., 11am-3pm, Happy Hour"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>

        {formData.type === 'food' ? (
          <div>
            <DatePicker
              label="Date"
              value={formData.date}
              onChange={(value) => setFormData({ ...formData, date: value, startDate: value, endDate: value })}
              required
              dateOnly={true}
            />
            <p className="text-xs text-gray-400 mt-1">Select the date this daily special applies</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <DatePicker
                label="Start Date (optional)"
                value={formData.startDate}
                onChange={(value) => setFormData({ ...formData, startDate: value })}
                dateOnly={true}
              />
            </div>
            <div>
              <DatePicker
                label="End Date (optional)"
                value={formData.endDate}
                onChange={(value) => setFormData({ ...formData, endDate: value })}
                min={formData.startDate || undefined}
                dateOnly={true}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {special?.id && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="px-3 py-1.5 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 mr-auto"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              loading ||
              (special?.id && !isDirty) ||
              (formData.type === 'food' && !formData.date) ||
              (formData.type === 'drink' && formData.appliesOn.length === 0 && !formData.startDate && !formData.endDate)
            }
            className="px-3 py-1.5 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
          >
            {loading ? (special?.id ? 'Saving...' : 'Creating...') : (special?.id ? 'Save' : 'Create')}
          </button>
        </div>
      </form>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Special"
        message={`Are you sure you want to delete "${special?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Modal>
  );
}

