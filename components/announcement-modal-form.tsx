'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { showToast } from '@/components/toast';

interface Announcement {
  id?: string;
  title: string;
  body: string;
  publishAt: string | null;
  expiresAt?: string | null;
  isPublished: boolean;
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
}

export default function AnnouncementModalForm({ isOpen, onClose, announcement, onSuccess, onDelete }: AnnouncementModalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    body: announcement?.body || '',
    publishAt: announcement?.publishAt
      ? new Date(announcement.publishAt).toISOString().slice(0, 16)
      : '',
    expiresAt: announcement?.expiresAt
      ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
      : '',
    isPublished: announcement?.isPublished ?? false,
    crossPostFacebook: announcement?.crossPostFacebook ?? false,
    crossPostInstagram: announcement?.crossPostInstagram ?? false,
    ctaText: announcement?.ctaText || '',
    ctaUrl: announcement?.ctaUrl || '',
  });

  useEffect(() => {
    if (announcement) {
      const hasCTA = !!(announcement.ctaText && announcement.ctaUrl);
      setShowCTA(hasCTA);
      
      // Check if expired and auto-unpublish if needed
      const expiresAt = announcement.expiresAt ? new Date(announcement.expiresAt) : null;
      const now = new Date();
      const isExpired = expiresAt ? expiresAt < now : false;
      const shouldBePublished = announcement.isPublished && !isExpired;
      
      setFormData({
        title: announcement.title || '',
        body: announcement.body || '',
        publishAt: announcement.publishAt
          ? new Date(announcement.publishAt).toISOString().slice(0, 16)
          : '',
        expiresAt: announcement.expiresAt
          ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
          : '',
        isPublished: shouldBePublished,
        crossPostFacebook: announcement.crossPostFacebook ?? false,
        crossPostInstagram: announcement.crossPostInstagram ?? false,
        ctaText: announcement.ctaText || '',
        ctaUrl: announcement.ctaUrl || '',
      });
    } else {
      setShowCTA(false);
      // Set default dates: today for publishAt, tomorrow for expiresAt
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setFormData({
        title: '',
        body: '',
        publishAt: today.toISOString().slice(0, 16),
        expiresAt: tomorrow.toISOString().slice(0, 16),
        isPublished: false,
        crossPostFacebook: false,
        crossPostInstagram: false,
        ctaText: '',
        ctaUrl: '',
      });
    }
  }, [announcement, isOpen]);

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

    // Validate that expired announcements cannot be published
    if (formData.isPublished && formData.expiresAt) {
      const expireDate = new Date(formData.expiresAt);
      const now = new Date();
      
      if (expireDate < now) {
        showToast(
          'Cannot publish expired announcement',
          'error',
          `The expiration date (${expireDate.toLocaleDateString()} ${expireDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) has already passed. Please update the expiration date or uncheck Published.`
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
      // datetime-local inputs return values in format "YYYY-MM-DDTHH:mm" (local time, no timezone)
      // We need to preserve the local time when converting to ISO
      const publishAtISO = formData.publishAt && formData.publishAt.trim() 
        ? (() => {
            const date = new Date(formData.publishAt);
            // Check if date is valid
            if (isNaN(date.getTime())) return null;
            return date.toISOString();
          })()
        : null;
      
      const expiresAtISO = formData.expiresAt && formData.expiresAt.trim()
        ? (() => {
            const date = new Date(formData.expiresAt);
            // Check if date is valid
            if (isNaN(date.getTime())) return null;
            return date.toISOString();
          })()
        : null;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          publishAt: publishAtISO,
          expiresAt: expiresAtISO,
        }),
      });

      if (res.ok) {
        router.refresh();
        showToast(
          announcement?.id ? 'Announcement updated successfully' : 'Announcement created successfully',
          'success'
        );
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={announcement ? 'Edit Announcement' : 'New Announcement'}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="title" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div>
          <label htmlFor="body" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Content *
          </label>
          <textarea
            id="body"
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={6}
            required
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supports markdown and HTML</p>
        </div>

        <div>
          <label htmlFor="publishAt" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Publish Date & Time *
          </label>
          <input
            id="publishAt"
            type="datetime-local"
            value={formData.publishAt}
            onChange={(e) => setFormData({ ...formData, publishAt: e.target.value })}
            required
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div>
          <label htmlFor="expiresAt" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Expiration Date & Time *
          </label>
          <input
            id="expiresAt"
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => {
              const expiresAt = e.target.value;
              
              // Validate expiration date is not more than 1 month after publish date
              if (formData.publishAt && expiresAt) {
                const publishDate = new Date(formData.publishAt);
                const expireDate = new Date(expiresAt);
                const maxExpireDate = new Date(publishDate);
                maxExpireDate.setMonth(maxExpireDate.getMonth() + 1);
                
                if (expireDate > maxExpireDate) {
                  setTimeout(() => {
                    showToast(
                      'Expiration date cannot be more than 1 month after publish date',
                      'error',
                      `Maximum expiration date: ${maxExpireDate.toLocaleDateString()} ${maxExpireDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    );
                    setFormData({ ...formData, expiresAt: maxExpireDate.toISOString().slice(0, 16) });
                  }, 0);
                  return;
                }
              }
              
              // If expired, uncheck published
              const newExpireDate = expiresAt ? new Date(expiresAt) : null;
              const now = new Date();
              const isExpired = newExpireDate ? newExpireDate < now : false;
              const newIsPublished = isExpired ? false : formData.isPublished;
              
              setFormData({ ...formData, expiresAt, isPublished: newIsPublished });
              
              if (isExpired && formData.isPublished) {
                setTimeout(() => {
                  showToast(
                    'Announcement expired',
                    'info',
                    'The published status has been unchecked because the expiration date is in the past.'
                  );
                }, 0);
              }
            }}
            required
            max={formData.publishAt ? (() => {
              const maxDate = new Date(formData.publishAt);
              maxDate.setMonth(maxDate.getMonth() + 1);
              return maxDate.toISOString().slice(0, 16);
            })() : undefined}
            min={formData.publishAt || undefined}
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be within 1 month of publish date</p>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={showCTA}
              onChange={(e) => {
                setShowCTA(e.target.checked);
                if (!e.target.checked) {
                  setFormData({ ...formData, ctaText: '', ctaUrl: '' });
                }
              }}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Add Call-to-Action Button</span>
          </label>
          {showCTA && (
            <div className="space-y-3 pl-6 border-l-2 border-blue-500 dark:border-blue-400">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Both fields are required for the CTA button to appear.</p>
              <div>
                <label htmlFor="ctaText" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
                  Button Text *
                </label>
                <input
                  id="ctaText"
                  type="text"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                  placeholder="e.g., Learn More, Book Now, Order Here"
                  className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label htmlFor="ctaUrl" className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
                  Button URL *
                </label>
                <input
                  id="ctaUrl"
                  type="url"
                  value={formData.ctaUrl}
                  onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                  placeholder="https://example.com or /menu"
                  className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPublished}
              onChange={(e) => {
                const newIsPublished = e.target.checked;
                
                // If trying to publish, check if expired
                if (newIsPublished && formData.expiresAt) {
                  const expireDate = new Date(formData.expiresAt);
                  const now = new Date();
                  
                  if (expireDate < now) {
                    showToast(
                      'Cannot publish expired announcement',
                      'error',
                      `The expiration date has already passed. Please update the expiration date first.`
                    );
                    return; // Don't update the checkbox
                  }
                }
                
                setFormData({ ...formData, isPublished: newIsPublished });
              }}
              disabled={formData.expiresAt ? new Date(formData.expiresAt) < new Date() : false}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-900 dark:text-white">
              Published
              {formData.expiresAt && new Date(formData.expiresAt) < new Date() && (
                <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Cannot publish - expired)</span>
              )}
            </span>
          </label>
        </div>

        <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {announcement?.id && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteLoading || loading}
              className="px-4 py-2 bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-500/20 mr-auto"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
          >
            {loading ? (announcement?.id ? 'Saving...' : 'Creating...') : (announcement?.id ? 'Save' : 'Create')}
          </button>
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
    </Modal>
  );
}

