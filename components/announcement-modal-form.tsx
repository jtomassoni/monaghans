'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modal';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { showToast } from '@/components/toast';
import StatusToggle from '@/components/status-toggle';
import DateTimePicker from '@/components/date-time-picker';

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
}

export default function AnnouncementModalForm({ isOpen, onClose, announcement, onSuccess, onDelete }: AnnouncementModalFormProps) {
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
      ? new Date(announcement.publishAt).toISOString().slice(0, 16)
      : '',
    expiresAt: announcement?.expiresAt
      ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
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
    } else {
      setShowCTA(false);
      // Set default dates: top of current hour for publishAt, 24 hours from that for expiresAt
      const now = new Date();
      const publishAt = new Date(now);
      publishAt.setMinutes(0, 0, 0); // Round to top of current hour
      const expiresAt = new Date(publishAt);
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      newFormData = {
        title: '',
        body: '',
        publishAt: publishAt.toISOString().slice(0, 16),
        expiresAt: expiresAt.toISOString().slice(0, 16),
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
          isPublished: true, // Always published since scheduling is handled by publishAt/expiresAt
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
          <DateTimePicker
            label="Publish Date & Time"
            value={formData.publishAt}
            onChange={(value) => setFormData({ ...formData, publishAt: value })}
            required
          />
        </div>

        <div>
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

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2 mb-4">
            <label className={`flex items-center gap-2 ${facebookConnected ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <input
                type="checkbox"
                checked={formData.crossPostFacebook}
                onChange={(e) => setFormData({ ...formData, crossPostFacebook: e.target.checked })}
                disabled={!facebookConnected}
                className="w-4 h-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:cursor-not-allowed"
              />
              <span className={`text-sm font-medium ${facebookConnected ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                Cross-post to Facebook
                {!facebookConnected && ' (Connect Facebook in Settings)'}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
              <input
                type="checkbox"
                checked={formData.crossPostInstagram}
                onChange={(e) => setFormData({ ...formData, crossPostInstagram: e.target.checked })}
                className="w-4 h-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                disabled
              />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Cross-post to Instagram (coming soon)
              </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Automatically share this announcement to your connected social media accounts
            </p>
          </div>

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
            onClick={handleCancel}
            disabled={!!(deleteLoading || loading)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

