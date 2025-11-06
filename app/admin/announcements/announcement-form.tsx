'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusToggle from '@/components/status-toggle';
import { showToast } from '@/components/toast';
import ConfirmationDialog from '@/components/confirmation-dialog';
import DateTimePicker from '@/components/date-time-picker';

interface Announcement {
  id?: string;
  title: string;
  body: string;
  heroImage: string;
  publishAt: string;
  isPublished: boolean;
  crossPostFacebook: boolean;
  crossPostInstagram: boolean;
}

export default function AnnouncementForm({ announcement }: { announcement?: Announcement }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    body: announcement?.body || '',
    heroImage: announcement?.heroImage || '',
    publishAt: announcement?.publishAt
      ? new Date(announcement.publishAt).toISOString().slice(0, 16)
      : '',
    isPublished: announcement?.isPublished ?? false,
    crossPostFacebook: announcement?.crossPostFacebook ?? false,
    crossPostInstagram: announcement?.crossPostInstagram ?? false,
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  useEffect(() => {
    if (announcement) {
      const newFormData = {
        title: announcement.title || '',
        body: announcement.body || '',
        heroImage: announcement.heroImage || '',
        publishAt: announcement.publishAt
          ? new Date(announcement.publishAt).toISOString().slice(0, 16)
          : '',
        isPublished: announcement.isPublished ?? false,
        crossPostFacebook: announcement.crossPostFacebook ?? false,
        crossPostInstagram: announcement.crossPostInstagram ?? false,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    } else {
      const newFormData = {
        title: '',
        body: '',
        heroImage: '',
        publishAt: '',
        isPublished: false,
        crossPostFacebook: false,
        crossPostInstagram: false,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [announcement]);

  // Check if form is dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  function handleCancel(e: React.MouseEvent) {
    if (isDirty) {
      e.preventDefault();
      // Reset form to initial state
      if (announcement) {
        const newFormData = {
          title: announcement.title || '',
          body: announcement.body || '',
          heroImage: announcement.heroImage || '',
          publishAt: announcement.publishAt
            ? new Date(announcement.publishAt).toISOString().slice(0, 16)
            : '',
          isPublished: announcement.isPublished ?? false,
          crossPostFacebook: announcement.crossPostFacebook ?? false,
          crossPostInstagram: announcement.crossPostInstagram ?? false,
        };
        setFormData(newFormData);
        setInitialFormData(newFormData);
      } else {
        const newFormData = {
          title: '',
          body: '',
          heroImage: '',
          publishAt: '',
          isPublished: false,
          crossPostFacebook: false,
          crossPostInstagram: false,
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
      const url = announcement?.id
        ? `/api/announcements/${announcement.id}`
        : '/api/announcements';
      const method = announcement?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          publishAt: formData.publishAt ? new Date(formData.publishAt).toISOString() : null,
        }),
      });

      if (res.ok) {
        showToast(announcement?.id ? 'Announcement updated successfully' : 'Announcement created successfully', 'success');
        router.push('/admin/announcements');
        router.refresh();
      } else {
        const error = await res.json();
        showToast('Failed to save announcement', 'error', error.error || error.details || 'Please check your input and try again.');
      }
    } catch (error) {
      showToast('Request failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!announcement?.id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Announcement deleted successfully', 'success');
        router.push('/admin/announcements');
        router.refresh();
      } else {
        const error = await res.json();
        showToast('Failed to delete announcement', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">
            {announcement ? 'Edit Announcement' : 'New Announcement'}
          </h1>
          <Link
            href="/admin/announcements"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-6 rounded-lg">
          <StatusToggle
            type="published"
            value={formData.isPublished}
            onChange={(value) => setFormData({ ...formData, isPublished: value })}
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
            <label htmlFor="body" className="block mb-2">
              Content *
            </label>
            <textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={10}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
            <p className="text-sm text-gray-400 mt-1">Supports markdown and HTML</p>
          </div>

          <div>
            <label htmlFor="heroImage" className="block mb-2">
              Hero Image Path (optional)
            </label>
            <input
              id="heroImage"
              type="text"
              value={formData.heroImage}
              onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
              placeholder="/uploads/announcement-image.jpg"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          <div>
            <DateTimePicker
              label="Publish Date & Time (optional)"
              value={formData.publishAt}
              onChange={(value) => setFormData({ ...formData, publishAt: value })}
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            {announcement?.id && (
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
              href="/admin/announcements"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!!(loading || (announcement?.id && !isDirty))}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
            >
              {loading ? (announcement?.id ? 'Saving...' : 'Creating...') : (announcement?.id ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
        {announcement?.id && (
          <ConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Delete Announcement"
            message={`Are you sure you want to delete "${announcement?.title}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="danger"
          />
        )}
      </div>
    </div>
  );
}

