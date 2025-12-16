'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusToggle from '@/components/status-toggle';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';
import DatePicker from '@/components/date-picker';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';

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
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SPECIAL_TYPES = ['food', 'drink'];

export default function SpecialForm({ special }: { special?: Special }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    title: special?.title || '',
    description: special?.description || '',
    priceNotes: special?.priceNotes || '',
    type: special?.type || 'food',
    appliesOn: special?.appliesOn || [],
    timeWindow: special?.timeWindow || '',
    startDate: special?.startDate || '',
    endDate: special?.endDate || '',
    image: special?.image || '',
    isActive: special?.isActive ?? true,
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  useEffect(() => {
    if (special) {
      const newFormData = {
        title: special.title || '',
        description: special.description || '',
        priceNotes: special.priceNotes || '',
        type: special.type || 'food',
        appliesOn: special.appliesOn || [],
        timeWindow: special.timeWindow || '',
        startDate: special.startDate || '',
        endDate: special.endDate || '',
        image: special.image || '',
        isActive: special.isActive ?? true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    } else {
      const newFormData = {
        title: '',
        description: '',
        priceNotes: '',
        type: 'food',
        appliesOn: [],
        timeWindow: '',
        startDate: '',
        endDate: '',
        image: '',
        isActive: true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [special]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  
  // Warn user before leaving page with unsaved changes
  useUnsavedChangesWarning(isDirty);

  function handleCancel(e: React.MouseEvent) {
    if (isDirty) {
      e.preventDefault();
      // Reset form to initial state
      if (special) {
        const newFormData = {
          title: special.title || '',
          description: special.description || '',
          priceNotes: special.priceNotes || '',
          type: special.type || 'food',
          appliesOn: special.appliesOn || [],
          timeWindow: special.timeWindow || '',
          startDate: special.startDate || '',
          endDate: special.endDate || '',
          image: special.image || '',
          isActive: special.isActive ?? true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      } else {
        const newFormData = {
          title: '',
          description: '',
          priceNotes: '',
          type: 'food',
          appliesOn: [],
          timeWindow: '',
          startDate: '',
          endDate: '',
          image: '',
          isActive: true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      }
    }
    // If clean, let Link navigate normally
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = special?.id ? `/api/specials/${special.id}` : '/api/specials';
      const method = special?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(special?.id ? 'Special updated successfully' : 'Special created successfully', 'success');
        router.push('/admin?view=list');
        router.refresh();
      } else {
        const error = await res.json();
        showToast('Failed to save special', 'error', error.error || error.details || 'Please check your input and try again.');
      }
    } catch (error) {
      showToast('Request failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
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
        showToast('Special deleted successfully', 'success');
        router.push('/admin?view=list');
        router.refresh();
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

  // Clear appliesOn when switching to food type (food specials aren't recurring)
  useEffect(() => {
    if (formData.type === 'food' && formData.appliesOn.length > 0) {
      setFormData((prev) => ({ ...prev, appliesOn: [] }));
    }
  }, [formData.type, formData.appliesOn.length]);

  function toggleDay(day: string) {
    setFormData({
      ...formData,
      appliesOn: formData.appliesOn.includes(day)
        ? formData.appliesOn.filter((d) => d !== day)
        : [...formData.appliesOn, day],
    });
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">{special ? 'Edit Special' : 'New Special'}</h1>
          <Link
            href="/admin?view=list"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-6 rounded-lg">
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
              Price Notes {formData.type === 'food' ? '(optional)' : ''}
            </label>
            <input
              id="priceNotes"
              type="text"
              value={formData.priceNotes}
              onChange={(e) => setFormData({ ...formData, priceNotes: e.target.value })}
              placeholder={formData.type === 'food' ? "e.g., $12.99 (or leave empty if prices are in description)" : "e.g., $3 drafts, Happy hour prices"}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
            {formData.type === 'food' && (
              <p className="text-xs text-gray-400 mt-1">
                If your special has multiple prices, you can list them in the Description field instead.
              </p>
            )}
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
            <DatePicker
              label="Date"
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: value, endDate: value })}
              required
              dateOnly={true}
            />
            <p className="text-sm text-gray-400 mt-2">Select the date this daily special applies</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label htmlFor="image" className="block mb-2">
              Image Path (optional)
            </label>
            <input
              id="image"
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="/uploads/special-image.jpg"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {special?.id && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 mr-auto"
              >
                Delete
              </button>
            )}
            <Link
              href="/admin?view=list"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={
                loading ||
                (special?.id && !isDirty) ||
                (formData.type === 'food' && !formData.startDate) ||
                (formData.type === 'drink' && formData.appliesOn.length === 0 && !formData.startDate && !formData.endDate)
              }
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
            >
              {loading ? (special?.id ? 'Saving...' : 'Creating...') : (special?.id ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
        {special?.id && (
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
        )}
      </div>
    </div>
  );
}

