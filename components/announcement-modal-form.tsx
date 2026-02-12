'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import DateTimePicker from '@/components/date-time-picker';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';

import { formatDateAsDateTimeLocal, parseDateTimeLocalAsCompanyTimezone, getCompanyTimezoneSync, getMountainTimeToday } from '@/lib/timezone';

// Helper function to convert UTC ISO string to datetime-local string (company timezone)
// Used when loading dates from the database to display in the form
function convertUTCToMountainTimeLocal(utcISO: string): string {
  const utcDate = new Date(utcISO);
  return formatDateAsDateTimeLocal(utcDate, getCompanyTimezoneSync());
}

// Helper function to convert datetime-local string (interpreted as company timezone) to UTC ISO string
// datetime-local format: "YYYY-MM-DDTHH:mm" (no timezone)
// We interpret this as company timezone and convert to UTC
function convertMountainTimeToUTC(datetimeLocal: string): string {
  try {
    const date = parseDateTimeLocalAsCompanyTimezone(datetimeLocal, getCompanyTimezoneSync());
    return date.toISOString();
  } catch (error) {
    console.error('Error converting datetime-local to UTC:', error);
    // Fallback to current time if parsing fails
    return new Date().toISOString();
  }
}

interface Announcement {
  id?: string;
  title: string;
  body: string;
  publishAt: string | null;
  expiresAt?: string | null;
  isPublished?: boolean; // Optional for backward compatibility, but always set to true now
  crossPostFacebook: boolean;
  crossPostInstagram: boolean;
  ctaText?: string;
  ctaUrl?: string;
}

interface AnnouncementModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  announcement?: Announcement;
  onSuccess?: () => void;
  onDelete?: (id: string) => void;
  onAnnouncementAdded?: (announcement: any) => void; // Callback when announcement is created
  onAnnouncementUpdated?: (announcement: any) => void; // Callback when announcement is updated
  /** When true, render form content only (no Modal wrapper). Used when embedding in another modal. */
  embed?: boolean;
}

export default function AnnouncementModalForm({ isOpen, onClose, announcement, onSuccess, onDelete, onAnnouncementAdded, onAnnouncementUpdated, embed }: AnnouncementModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    body: announcement?.body || '',
    publishAt: announcement?.publishAt
      ? convertUTCToMountainTimeLocal(announcement.publishAt)
      : '',
    expiresAt: announcement?.expiresAt
      ? convertUTCToMountainTimeLocal(announcement.expiresAt)
      : '',
    crossPostFacebook: announcement?.crossPostFacebook ?? false,
    crossPostInstagram: announcement?.crossPostInstagram ?? false,
    ctaText: announcement?.ctaText || '',
    ctaUrl: announcement?.ctaUrl || '',
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  useEffect(() => {
    let newFormData;
    if (announcement) {
      const hasCTA = !!(announcement.ctaText && announcement.ctaUrl);
      setShowCTA(hasCTA);
      
      newFormData = {
        title: announcement.title || '',
        body: announcement.body || '',
        publishAt: announcement.publishAt
          ? convertUTCToMountainTimeLocal(announcement.publishAt)
          : '',
        expiresAt: announcement.expiresAt
          ? convertUTCToMountainTimeLocal(announcement.expiresAt)
          : '',
        crossPostFacebook: announcement.crossPostFacebook ?? false,
        crossPostInstagram: announcement.crossPostInstagram ?? false,
        ctaText: announcement.ctaText || '',
        ctaUrl: announcement.ctaUrl || '',
      };
    } else {
      setShowCTA(false);
      // Default: publish today at 12:00 PM (noon) Mountain Time; expire 24 hours later
      const todayNoonMT = new Date(getMountainTimeToday().getTime() + 12 * 60 * 60 * 1000);
      const publishAtStr = formatDateAsDateTimeLocal(todayNoonMT, getCompanyTimezoneSync());
      const expiresAtDate = new Date(todayNoonMT.getTime() + 24 * 60 * 60 * 1000);
      const expiresAtStr = formatDateAsDateTimeLocal(expiresAtDate, getCompanyTimezoneSync());

      newFormData = {
        title: '',
        body: '',
        publishAt: publishAtStr,
        expiresAt: expiresAtStr,
        crossPostFacebook: false,
        crossPostInstagram: false,
        ctaText: '',
        ctaUrl: '',
      };
    }
    setFormData(newFormData);
    setInitialFormData(newFormData);
    
    // Check Facebook connection status when modal opens
    if (isOpen) {
      fetch('/api/social/facebook/status')
        .then(res => res.json())
        .then(data => {
          const connected = data.connected === true && !data.expired;
          setFacebookConnected(connected);
          // Uncheck Facebook if not connected
          if (!connected && newFormData.crossPostFacebook) {
            setFormData(prev => ({ ...prev, crossPostFacebook: false }));
            setInitialFormData(prev => ({ ...prev, crossPostFacebook: false }));
          }
        })
        .catch(() => {
          setFacebookConnected(false);
          // Uncheck Facebook if error checking status
          if (newFormData.crossPostFacebook) {
            setFormData(prev => ({ ...prev, crossPostFacebook: false }));
            setInitialFormData(prev => ({ ...prev, crossPostFacebook: false }));
          }
        });
    }
  }, [announcement, isOpen]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData) ||
                  showCTA !== !!(announcement?.ctaText && announcement?.ctaUrl);
  
  // Warn user before leaving page with unsaved changes
  useUnsavedChangesWarning(isDirty && isOpen);

  function handleCancel() {
    if (isDirty) {
      // Reset form to initial state
      if (announcement) {
        const hasCTA = !!(announcement.ctaText && announcement.ctaUrl);
        setShowCTA(hasCTA);
        
        const newFormData = {
          title: announcement.title || '',
          body: announcement.body || '',
          publishAt: announcement.publishAt
            ? new Date(announcement.publishAt).toISOString().slice(0, 16)
            : '',
          expiresAt: announcement.expiresAt
            ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
            : '',
          crossPostFacebook: announcement.crossPostFacebook ?? false,
          crossPostInstagram: announcement.crossPostInstagram ?? false,
          ctaText: announcement.ctaText || '',
          ctaUrl: announcement.ctaUrl || '',
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      } else {
        setShowCTA(false);
        const now = new Date();
        const publishAt = new Date(now);
        publishAt.setMinutes(0, 0, 0); // Round to top of current hour
        const expiresAt = new Date(publishAt);
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        const newFormData = {
          title: '',
          body: '',
          publishAt: publishAt.toISOString().slice(0, 16),
          expiresAt: expiresAt.toISOString().slice(0, 16),
          crossPostFacebook: false,
          crossPostInstagram: false,
          ctaText: '',
          ctaUrl: '',
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

    // Validate expiration date is not more than 1 month after publish date
    if (formData.publishAt && formData.expiresAt) {
      const publishDate = new Date(formData.publishAt);
      const expireDate = new Date(formData.expiresAt);
      const maxExpireDate = new Date(publishDate);
      maxExpireDate.setMonth(maxExpireDate.getMonth() + 1);
      
      if (expireDate > maxExpireDate) {
        showToast(
          'Expiration date cannot be more than 1 month after publish date',
          'error',
          `Maximum expiration date: ${maxExpireDate.toLocaleDateString()} ${maxExpireDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        );
        setLoading(false);
        return;
      }
    }


    try {
      const url = announcement?.id
        ? `/api/announcements/${announcement.id}`
        : '/api/announcements';
      const method = announcement?.id ? 'PUT' : 'POST';

      // Convert datetime-local strings to ISO strings
      // datetime-local inputs return values in format "YYYY-MM-DDTHH:mm" (no timezone)
      // We interpret these as Mountain Time and convert to UTC
      const publishAtISO = formData.publishAt && formData.publishAt.trim() 
        ? convertMountainTimeToUTC(formData.publishAt)
        : null;
      
      const expiresAtISO = formData.expiresAt && formData.expiresAt.trim()
        ? convertMountainTimeToUTC(formData.expiresAt)
        : null;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          publishAt: publishAtISO,
          expiresAt: expiresAtISO,
          isPublished: true, // Always published since scheduling is handled by publishAt/expiresAt
        }),
      });

      if (res.ok) {
        const announcementData = await res.json();
        showToast(
          announcement?.id ? 'Announcement updated successfully' : 'Announcement created successfully',
          'success'
        );
        
        // Call appropriate callback instead of refreshing
        if (announcement?.id) {
          onAnnouncementUpdated?.(announcementData);
        } else {
          onAnnouncementAdded?.(announcementData);
        }
        
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        showToast(
          announcement?.id ? 'Failed to update announcement' : 'Failed to create announcement',
          'error',
          error.error || error.details || 'Please check your input and try again.'
        );
      }
    } catch (error) {
      showToast(
        'Request failed',
        'error',
        error instanceof Error ? error.message : 'An error occurred while saving the announcement.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!announcement?.id || !onDelete) return;
    
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Announcement deleted successfully', 'success');
        onDelete(announcement.id);
        onClose();
        onSuccess?.();
      } else {
        const error = await res.json();
        showToast('Failed to delete announcement', 'error', error.error || error.details || 'An error occurred');
      }
    } catch (error) {
      showToast('Failed to delete announcement', 'error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  const formContent = (
    <>
      <form onSubmit={handleSubmit} className={embed ? 'flex flex-col min-h-0 flex-1' : 'space-y-3'}>
        <div className={embed ? 'flex-1 min-h-0 overflow-y-auto' : ''}>
        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Announcement Content</p>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
              Create your announcement with title and content.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium text-gray-900 dark:text-white">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-h-[44px] touch-manipulation"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="body" className="text-sm font-medium text-gray-900 dark:text-white">
                Content *
              </label>
              <textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={3}
                required
                className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-h-[44px] touch-manipulation"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Supports markdown and HTML</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Schedule</p>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
              Set when this announcement should be published and expire.
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative isolate">
              <DateTimePicker
                label="Publish Date & Time"
                value={formData.publishAt}
                onChange={(value) => setFormData({ ...formData, publishAt: value })}
                required
              />
            </div>

            <div className="relative isolate">
              <DateTimePicker
                label="Expiration Date & Time"
                value={formData.expiresAt}
                onChange={(value) => {
                  // Validate expiration date is not more than 1 month after publish date
                  if (formData.publishAt && value) {
                    const publishDate = new Date(formData.publishAt);
                    const expireDate = new Date(value);
                    const maxExpireDate = new Date(publishDate);
                    maxExpireDate.setMonth(maxExpireDate.getMonth() + 1);
                    
                    if (expireDate > maxExpireDate) {
                      showToast(
                        'Expiration date cannot be more than 1 month after publish date',
                        'error',
                        `Maximum expiration date: ${maxExpireDate.toLocaleDateString()} ${maxExpireDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      );
                      const maxValue = maxExpireDate.toISOString().slice(0, 16);
                      setFormData({ ...formData, expiresAt: maxValue });
                      return;
                    }
                  }
                  
                  setFormData({ ...formData, expiresAt: value });
                }}
                min={formData.publishAt || undefined}
                max={formData.publishAt ? (() => {
                  const maxDate = new Date(formData.publishAt);
                  maxDate.setMonth(maxDate.getMonth() + 1);
                  return maxDate.toISOString().slice(0, 16);
                })() : undefined}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be within 1 month of publish date</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Social Media</p>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
              Automatically share this announcement to your connected social media accounts.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="crossPostFacebook"
              className={`inline-flex items-center gap-3 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-inner cursor-pointer transition-colors ${
                facebookConnected ? 'hover:border-blue-400/70 focus-within:ring-2 focus-within:ring-blue-500/30' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <input
                type="checkbox"
                id="crossPostFacebook"
                checked={formData.crossPostFacebook}
                onChange={(e) => setFormData({ ...formData, crossPostFacebook: e.target.checked })}
                disabled={!facebookConnected}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Cross-post to Facebook
                {!facebookConnected && ' (Connect Facebook in Settings)'}
              </span>
            </label>
            <label
              htmlFor="crossPostInstagram"
              className="inline-flex items-center gap-3 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 shadow-inner cursor-not-allowed opacity-50"
            >
              <input
                type="checkbox"
                id="crossPostInstagram"
                checked={formData.crossPostInstagram}
                onChange={(e) => setFormData({ ...formData, crossPostInstagram: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled
              />
              <span>Cross-post to Instagram (coming soon)</span>
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-4 backdrop-blur-sm space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Call-to-Action</p>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300 max-w-sm">
              Add an optional button to your announcement.
            </p>
          </div>

          <label
            htmlFor="showCTA"
            className="inline-flex items-center gap-3 rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white shadow-inner cursor-pointer transition-colors hover:border-blue-400/70 focus-within:ring-2 focus-within:ring-blue-500/30"
          >
            <input
              type="checkbox"
              id="showCTA"
              checked={showCTA}
              onChange={(e) => {
                setShowCTA(e.target.checked);
                if (!e.target.checked) {
                  setFormData({ ...formData, ctaText: '', ctaUrl: '' });
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Add Call-to-Action Button
          </label>

          {showCTA && (
            <div className="rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 p-3 shadow-inner space-y-3 border-l-4 border-l-blue-500 dark:border-l-blue-400">
              <p className="text-xs text-gray-500 dark:text-gray-400">Both fields are required for the CTA button to appear.</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="ctaText" className="text-sm font-medium text-gray-900 dark:text-white">
                    Button Text *
                  </label>
                  <input
                    id="ctaText"
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="e.g., Learn More, Book Now, Order Here"
                    className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-h-[44px] touch-manipulation"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ctaUrl" className="text-sm font-medium text-gray-900 dark:text-white">
                    Button URL *
                  </label>
                  <input
                    id="ctaUrl"
                    type="url"
                    value={formData.ctaUrl}
                    onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                    placeholder="https://example.com or /menu"
                    className="w-full rounded-2xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 px-4 py-2.5 text-sm text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all min-h-[44px] touch-manipulation"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        <div className={`rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/40 shadow-sm shadow-black/5 p-3 backdrop-blur-sm flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2 ${embed ? 'sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 -mx-4 sm:-mx-5 px-4 sm:px-5 -mb-4 sm:-mb-5 pb-4 sm:pb-5 shrink-0' : ''}`}>
          {announcement?.id && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteLoading || loading}
              className="px-4 py-3 sm:px-4 sm:py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 cursor-pointer touch-manipulation min-h-[44px] order-3 sm:order-1"
            >
              Delete
            </button>
          )}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!!(deleteLoading || loading)}
              className="px-4 py-3 sm:px-4 sm:py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer touch-manipulation min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 sm:px-4 sm:py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20 cursor-pointer touch-manipulation min-h-[44px]"
            >
              {loading ? (announcement?.id ? 'Saving...' : 'Creating...') : (announcement?.id ? 'Save' : 'Create')}
            </button>
          </div>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message={`Are you sure you want to delete "${announcement?.title}"? This action cannot be undone.`}
        confirmText={deleteLoading ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );

  if (embed) return <div className="min-w-0 overflow-y-auto">{formContent}</div>;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={announcement ? 'Edit Announcement' : 'New Announcement'}
    >
      {formContent}
    </Modal>
  );
}

