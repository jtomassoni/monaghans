'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaTrash, FaTimes, FaSave, FaCheck, FaImage, FaCopy } from 'react-icons/fa';
import Modal from '@/components/modal';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';
import StatusToggle from '@/components/status-toggle';
import DatePicker from '@/components/date-picker';
import FoodSpecialsGallerySelector from '@/components/food-specials-gallery-selector';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';
import { getMountainTimeDateString, getMountainTimeToday, parseMountainTimeDate } from '@/lib/timezone';

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
  image?: string;
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
  /** Callback when user clicks Duplicate (food specials). Parent should set special to the copy and keep modal open. */
  onDuplicate?: (copy: Partial<Special>) => void;
  /** When true, render form content only (no Modal wrapper). Used when embedding in another modal. */
  embed?: boolean;
}

interface GalleryImage {
  filename: string;
  path: string;
  inUse?: boolean;
}

export default function SpecialModalForm({ isOpen, onClose, special, defaultType, onSuccess, onDelete, onDuplicate, embed }: SpecialModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const isFoodOnly = defaultType === 'food';
  const resolveType = (currentSpecial?: Special): 'food' | 'drink' => {
    if (isFoodOnly) return 'food';
    const type = currentSpecial?.type ?? defaultType ?? 'food';
    return type === 'drink' ? 'drink' : 'food';
  };
  const getDefaultPriceNotes = (resolvedType: 'food' | 'drink') => (resolvedType === 'food' ? '$14' : '');
  const resolvedType = resolveType(special);
  
  // Helper function to format date to YYYY-MM-DD format (in Mountain Time)
  const formatDateForInput = (date: any): string => {
    if (!date) return '';
    
    // If it's already in YYYY-MM-DD format, return as is (assuming it's already Mountain Time)
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    
    // Convert to Date object if needed
    let dateObj: Date;
    if (date instanceof Date) {
      // Date object from Prisma is in UTC - we need to get the Mountain Time date string
      // This handles the case where a Date object represents a UTC timestamp
      // that needs to be converted to Mountain Time for display
      dateObj = date;
    } else if (typeof date === 'string') {
      // If it's an ISO string with time, parse it
      // But if it's just a date string, we need to be careful
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // It's already a date string, but we need to ensure it's interpreted as Mountain Time
        // Parse it using parseMountainTimeDate to get the correct Date object
        dateObj = parseMountainTimeDate(date);
      } else {
        // Parse ISO string - this will be in UTC, so we need to convert to Mountain Time
        const tempDate = new Date(date);
        // Get the date string in Mountain Time from this UTC date
        const mtDateStr = getMountainTimeDateString(tempDate);
        // Parse it back as Mountain Time to ensure consistency
        dateObj = parseMountainTimeDate(mtDateStr);
      }
    } else {
      return '';
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Use getMountainTimeDateString to get the correct date string in Mountain Time
    // This ensures we always get the date as it appears in Mountain Time, not UTC
    return getMountainTimeDateString(dateObj);
  };

  const todayStrDefault = getMountainTimeDateString(getMountainTimeToday());
  const [formData, setFormData] = useState({
    title: special?.title || '',
    description: special?.description || '',
    priceNotes: special?.priceNotes || getDefaultPriceNotes(resolvedType),
    type: resolvedType,
    appliesOn: special?.appliesOn || [],
    timeWindow: resolvedType === 'food' ? '' : (special?.timeWindow || ''), // Always empty for food
    date: formatDateForInput(special?.startDate) || (special ? '' : todayStrDefault), // For food type; default today for new
    startDate: formatDateForInput(special?.startDate) || (special ? '' : todayStrDefault), // For drink type
    endDate: formatDateForInput(special?.endDate) || (special ? '' : todayStrDefault),
    image: special?.image ?? '', // Use nullish coalescing to preserve null, but default to empty string
    isActive: special?.isActive ?? true,
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  const normalizeAppliesOn = (val: unknown): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    if (special) {
      const formattedStartDate = formatDateForInput(special.startDate);
      const formattedEndDate = formatDateForInput(special.endDate);
      const nextType = resolveType(special);
      
      const newFormData = {
        title: special.title || '',
        description: special.description || '',
        priceNotes: special.priceNotes || getDefaultPriceNotes(nextType),
        type: nextType,
        appliesOn: normalizeAppliesOn((special as any).appliesOn),
        timeWindow: nextType === 'food' ? '' : (special.timeWindow || ''), // Always empty for food
        date: formattedStartDate, // For food type, use single date
        startDate: formattedStartDate, // For drink type
        endDate: formattedEndDate,
        image: special.image ?? '', // Use nullish coalescing to preserve null, but default to empty string
        isActive: special.isActive ?? true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    } else {
      const nextType = resolveType();
      const todayStr = getMountainTimeDateString(getMountainTimeToday());
      const newFormData = {
        title: '',
        description: '',
        priceNotes: getDefaultPriceNotes(nextType),
        type: nextType,
        appliesOn: [],
        timeWindow: nextType === 'food' ? '' : '', // Always empty for food
        date: todayStr,
        startDate: todayStr,
        endDate: todayStr,
        image: '',
        isActive: true,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [special, defaultType, isOpen]);

  const fetchGalleryImages = () => {
    setGalleryLoading(true);
    fetch('/api/food-specials-gallery')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGalleryImages(Array.isArray(data) ? data : []))
      .catch(() => setGalleryImages([]))
      .finally(() => setGalleryLoading(false));
  };

  // Load gallery images when form is open and we're on food special
  useEffect(() => {
    if (isOpen && (isFoodOnly || formData.type === 'food')) {
      fetchGalleryImages();
    }
  }, [isOpen, isFoodOnly, formData.type]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  
  // Warn user before leaving page with unsaved changes
  useUnsavedChangesWarning(isDirty && isOpen);

  function handleCancel() {
    if (isDirty) {
      // Reset form to initial state
      if (special) {
        const formattedStartDate = formatDateForInput(special.startDate);
        const formattedEndDate = formatDateForInput(special.endDate);
        const nextType = resolveType(special);
        
        const newFormData = {
          title: special.title || '',
          description: special.description || '',
          priceNotes: special.priceNotes || getDefaultPriceNotes(nextType),
          type: nextType,
          appliesOn: special.appliesOn || [],
          timeWindow: '', // Always empty - specials are all day
          date: formattedStartDate,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          image: special.image ?? '', // Use nullish coalescing to preserve null, but default to empty string
          isActive: special.isActive ?? true,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      } else {
        const nextType = resolveType();
        const todayStr = getMountainTimeDateString(getMountainTimeToday());
        const newFormData = {
          title: '',
          description: '',
          priceNotes: getDefaultPriceNotes(nextType),
          type: nextType,
          appliesOn: [],
          timeWindow: nextType === 'food' ? '' : '', // Always empty for food
          date: todayStr,
          startDate: todayStr,
          endDate: todayStr,
          image: '',
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

      // For food type, set both startDate and endDate to the same date, and ensure timeWindow is empty
      const isFood = isFoodOnly || formData.type === 'food';
      const submitData = {
        ...formData,
        type: isFoodOnly ? 'food' : formData.type,
        timeWindow: isFoodOnly ? '' : formData.timeWindow, // Always empty for food
        startDate: isFood ? formData.date : formData.startDate,
        endDate: isFood ? formData.date : formData.endDate,
        // Always include image for food specials - send null if empty string to ensure it's saved
        image: isFood ? (formData.image?.trim() || null) : undefined,
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

  const formContent = (
    <>
      <form onSubmit={handleSubmit} className={embed ? 'flex flex-col min-h-0 flex-1 min-w-0' : (isFoodOnly ? 'space-y-2.5 sm:space-y-4' : 'space-y-3 sm:space-y-6')}>
        <div className={embed ? 'flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden' : ''}>
        <div className={`rounded-lg sm:rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 ${isFoodOnly ? 'p-3 sm:p-4 space-y-2.5 sm:space-y-4' : 'p-3 sm:p-6 space-y-3 sm:space-y-6'} backdrop-blur-sm`}>
          {!isFoodOnly && (
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Special Status</p>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  Control whether this special appears on your public menu.
                </p>
              </div>
              <StatusToggle
                type="active"
                value={formData.isActive}
                onChange={(value) => setFormData({ ...formData, isActive: value })}
                className="shrink-0 self-start sm:self-auto"
              />
            </div>
          )}

          <div className={isFoodOnly ? "space-y-2.5" : "space-y-3"}>
            <div className="space-y-1">
              <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-white">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                maxLength={60}
                className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-base text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-h-[44px] touch-manipulation"
                placeholder="Enter special title"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.title.length}/60 characters
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="description" className="block text-sm font-semibold text-gray-900 dark:text-white">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={isFoodOnly ? 3 : 4}
                maxLength={150}
                className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-base text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-y min-h-[80px] touch-manipulation"
                placeholder="Describe your special..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.description.length}/150 characters
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="priceNotes" className="block text-sm font-semibold text-gray-900 dark:text-white">
                Price {isFoodOnly ? '(optional)' : ''}
              </label>
              <input
                id="priceNotes"
                type="text"
                value={formData.priceNotes}
                onChange={(e) => setFormData({ ...formData, priceNotes: e.target.value })}
                placeholder={isFoodOnly ? "e.g., $12.99" : "e.g., $3 drafts, Happy hour prices"}
                maxLength={50}
                className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-base text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-h-[44px] touch-manipulation"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.priceNotes.length}/50 characters
              </p>
              {isFoodOnly && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  If your special has multiple prices, you can list them in the Description field instead.
                </p>
              )}
            </div>

            {/* Date before Image when embedded (mobile-friendly: reach date without scrolling past gallery) */}
            {embed && (isFoodOnly || formData.type === 'food') && (
              <div className="space-y-1">
                <DatePicker
                  label="Date *"
                  value={formData.date}
                  onChange={(value) => setFormData({ ...formData, date: value, startDate: value, endDate: value })}
                  required
                  dateOnly={true}
                />
              </div>
            )}

            {/* Inline gallery - only for food specials: pick a pic right in the form */}
            {(isFoodOnly || formData.type === 'food') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                    Image
                  </label>
                  {formData.image && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-3">
                  {galleryLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-gray-500 dark:text-gray-400">
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
                      <span className="text-sm">Loading gallery…</span>
                    </div>
                  ) : galleryImages.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No images in gallery yet.</p>
                      <button
                        type="button"
                        onClick={() => setShowGallery(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium"
                      >
                        <FaImage className="w-4 h-4" />
                        Upload image
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {galleryImages.map((img) => {
                          const isSelected = formData.image === img.path;
                          return (
                            <button
                              key={img.path}
                              type="button"
                              onClick={() => setFormData({ ...formData, image: img.path })}
                              className={`relative rounded-lg overflow-hidden border-2 transition-all text-left flex flex-col ${isSelected ? 'border-orange-500 ring-2 ring-orange-500/30 shadow-md' : 'border-gray-200 dark:border-gray-600 hover:border-orange-400 dark:hover:border-orange-600'}`}
                            >
                              <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                                <Image
                                  src={img.path}
                                  alt={img.filename}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 33vw, 96px"
                                  unoptimized={img.path.startsWith('/')}
                                />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-orange-500/25 flex items-center justify-center">
                                    <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">✓</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 truncate px-1 py-1 bg-white dark:bg-gray-800/80" title={img.filename}>
                                {img.filename}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowGallery(true)}
                        className="mt-2 w-full text-center text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 py-1.5"
                      >
                        Upload new image
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Only show type dropdown if not food-only */}
        {!isFoodOnly && (
          <div className="rounded-lg sm:rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 sm:p-6 backdrop-blur-sm space-y-3 sm:space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Special Type</p>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                Select whether this is a food or drink special.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="type" className="block text-sm font-semibold text-gray-900 dark:text-white">
                Type *
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as 'food' | 'drink';
                  setFormData({ 
                    ...formData, 
                    type: newType,
                    priceNotes: newType === 'food' ? (formData.priceNotes || '$14') : (newType === 'drink' ? '' : formData.priceNotes),
                    timeWindow: newType === 'food' ? '' : formData.timeWindow,
                  });
                }}
                className="w-full rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-3 py-2.5 text-base text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-h-[44px] touch-manipulation"
                required
              >
                {SPECIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {formData.type === 'drink' && (
          <div className="rounded-lg sm:rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 sm:p-6 backdrop-blur-sm space-y-3 sm:space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Weekly Schedule</p>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                Select which days this special applies each week. Leave empty if using start/end dates.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-3 shadow-inner space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Applies On</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WEEKDAYS.map((day) => {
                  const isSelected = formData.appliesOn.includes(day);
                  return (
                    <label
                      key={day}
                      className={`flex items-center justify-center rounded-lg border px-2 py-2.5 text-xs font-semibold transition-all cursor-pointer touch-manipulation min-h-[44px] ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                          : 'border-gray-200/70 dark:border-gray-700/60 text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-900/40 hover:border-blue-400/70 active:scale-95'
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
        )}

        <div className={`rounded-lg sm:rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 ${isFoodOnly ? 'p-3 sm:p-4 space-y-2.5 sm:space-y-3' : 'p-3 sm:p-6 space-y-3 sm:space-y-6'} backdrop-blur-sm`}>
          {!isFoodOnly && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                {formData.type === 'food' ? 'Date' : 'Timing'}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                {formData.type === 'food' 
                  ? 'Select the date this daily special applies (full day).'
                  : 'Set when this special is available.'}
              </p>
            </div>
          )}

          <div className={isFoodOnly ? "space-y-2.5" : "space-y-3"}>
            {/* Time window removed - specials are always all day */}

            {/* Food date: when embed, shown above Image in first card; when !embed, show here */}
            {(isFoodOnly || formData.type === 'food') && !embed ? (
              <div className="space-y-1 w-full max-w-full min-w-0 overflow-hidden">
                <DatePicker
                  label="Date *"
                  value={formData.date}
                  onChange={(value) => setFormData({ ...formData, date: value, startDate: value, endDate: value })}
                  required
                  dateOnly={true}
                />
                {!isFoodOnly && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 break-words">This special applies for the full day</p>
                )}
              </div>
            ) : (isFoodOnly || formData.type === 'food') ? null : (
              <div className="grid gap-3 md:grid-cols-2 w-full max-w-full min-w-0 overflow-hidden">
                <div className="relative isolate w-full max-w-full min-w-0 overflow-hidden">
                  <DatePicker
                    label="Start Date (optional)"
                    value={formData.startDate}
                    onChange={(value) => setFormData({ ...formData, startDate: value })}
                    dateOnly={true}
                  />
                </div>
                <div className="relative isolate w-full max-w-full min-w-0 overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>
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
          </div>
        </div>
        </div>

        <div className={`fixed bottom-0 left-0 right-0 sm:relative sm:bottom-auto sm:left-auto sm:right-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:border-t-0 sm:bg-transparent sm:dark:bg-transparent z-20 sm:z-auto shadow-lg sm:shadow-none ${embed ? 'sm:sticky sm:bottom-0 sm:left-0 sm:right-0 sm:border-t sm:bg-white sm:dark:bg-gray-800 sm:shadow-lg shrink-0 py-3' : ''}`}>
          <div className={`grid grid-cols-2 sm:grid-cols-none sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-2 sm:gap-3 px-4 sm:px-0 py-3 sm:py-0 pt-4 sm:pt-6 pb-[env(safe-area-inset-bottom)] sm:pb-0 mt-0 sm:mt-4 sm:mt-6`}>
            {special?.id && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer touch-manipulation min-h-[48px] w-full sm:w-auto sm:min-h-[44px] sm:text-sm sm:font-semibold sm:px-5 sm:py-2.5 order-4 sm:order-none"
              >
                <FaTrash className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>Delete</span>
              </button>
            )}
            {special?.id && (isFoodOnly || formData.type === 'food') && onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  const todayStr = getMountainTimeDateString(getMountainTimeToday());
                  onDuplicate({
                    id: '',
                    title: `${formData.title} (Copy)`,
                    description: formData.description,
                    priceNotes: formData.priceNotes,
                    type: 'food',
                    appliesOn: formData.appliesOn,
                    timeWindow: formData.timeWindow,
                    startDate: todayStr,
                    endDate: todayStr,
                    image: formData.image || undefined,
                    isActive: false,
                  });
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-500 text-white rounded-lg text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer touch-manipulation min-h-[48px] w-full sm:w-auto sm:min-h-[44px] sm:text-sm sm:font-semibold sm:px-5 sm:py-2.5 order-3 sm:order-none"
              >
                <FaCopy className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>Duplicate</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-base font-bold transition-all duration-200 cursor-pointer touch-manipulation min-h-[48px] w-full sm:w-auto sm:min-h-[44px] sm:text-sm sm:font-semibold sm:px-5 sm:py-2.5 order-2 sm:order-none"
            >
              <FaTimes className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                (special?.id && !isDirty) ||
                (formData.type === 'food' && !formData.date) ||
                (formData.type === 'drink' && formData.appliesOn.length === 0 && !formData.startDate && !formData.endDate)
              }
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer touch-manipulation min-h-[48px] w-full sm:w-auto sm:min-h-[44px] sm:text-sm sm:font-semibold sm:px-5 sm:py-2.5 order-1 sm:order-none"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{special?.id ? 'Saving...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  {special?.id ? <FaSave className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <FaCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                  <span>{special?.id ? 'Save' : 'Create'}</span>
                </>
              )}
            </button>
          </div>
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

      <FoodSpecialsGallerySelector
        isOpen={showGallery}
        onClose={() => {
          setShowGallery(false);
          fetchGalleryImages(); // Refresh inline gallery after upload/select
        }}
        onSelect={(imagePath) => {
          setFormData((prev) => ({ ...prev, image: imagePath }));
          setShowGallery(false);
        }}
        currentImagePath={formData.image}
      />
    </>
  );

  if (embed) return <div className="min-w-0 overflow-y-auto">{formContent}</div>;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={special ? 'Edit Special' : 'New Special'}
    >
      {formContent}
    </Modal>
  );
}

