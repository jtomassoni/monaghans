'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';

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
}

export default function SpecialModalForm({ isOpen, onClose, special, defaultType, onSuccess }: SpecialModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: special?.title || '',
    description: special?.description || '',
    priceNotes: special?.priceNotes || '',
    type: special?.type || defaultType || 'food',
    appliesOn: special?.appliesOn || [],
    timeWindow: special?.timeWindow || '',
    date: special?.startDate || '', // For food type, use single date field
    startDate: special?.startDate || '', // For drink type
    endDate: special?.endDate || '',
    isActive: special?.isActive ?? true,
  });

  useEffect(() => {
    if (special) {
      setFormData({
        title: special.title || '',
        description: special.description || '',
        priceNotes: special.priceNotes || '',
        type: special.type || 'food',
        appliesOn: special.appliesOn || [],
        timeWindow: special.timeWindow || '',
        date: special.startDate || '', // For food type, use single date
        startDate: special.startDate || '', // For drink type
        endDate: special.endDate || '',
        isActive: special.isActive ?? true,
      });
    } else {
      setFormData({
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
      });
    }
  }, [special, defaultType, isOpen]);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={special ? 'Edit Special' : 'New Special'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <label htmlFor="type" className="block mb-2">
            Type *
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            required
          >
            {SPECIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-400 mt-2">Select whether this is a food or drink special</p>
        </div>

        {formData.type === 'drink' && (
          <div>
            <label className="block mb-2">Applies On (optional for date-specific specials)</label>
            <div className="grid grid-cols-2 gap-2">
              {WEEKDAYS.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
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
            <p className="text-sm text-gray-400 mt-2">
              Select which days this special applies. Leave empty if using start/end dates.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="timeWindow" className="block mb-2">
            Time Window
          </label>
          <input
            id="timeWindow"
            type="text"
            value={formData.timeWindow}
            onChange={(e) => setFormData({ ...formData, timeWindow: e.target.value })}
            placeholder="e.g., 11am-3pm, Happy Hour"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          />
        </div>

        {formData.type === 'food' ? (
          <div>
            <label htmlFor="date" className="block mb-2">
              Date (optional)
            </label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value, startDate: e.target.value, endDate: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
            <p className="text-sm text-gray-400 mt-2">Select the date this daily special applies</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block mb-2">
                Start Date (optional)
              </label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block mb-2">
                End Date (optional)
              </label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Active</span>
          </label>
        </div>

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
              (formData.type === 'food' && !formData.date) ||
              (formData.type === 'drink' && formData.appliesOn.length === 0 && !formData.startDate && !formData.endDate)
            }
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
          >
            {loading ? (special?.id ? 'Saving...' : 'Creating...') : (special?.id ? 'Save' : 'Create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

