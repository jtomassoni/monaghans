'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusToggle from '@/components/status-toggle';

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
        router.push('/admin/announcements');
        router.refresh();
      } else {
        alert('Failed to save announcement');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
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
            <label htmlFor="publishAt" className="block mb-2">
              Publish Date & Time (optional)
            </label>
            <input
              id="publishAt"
              type="datetime-local"
              value={formData.publishAt}
              onChange={(e) => setFormData({ ...formData, publishAt: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          <StatusToggle
            type="published"
            value={formData.isPublished}
            onChange={(value) => setFormData({ ...formData, isPublished: value })}
            label="Status"
          />

          <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/admin/announcements"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-500/20"
            >
              {loading ? (announcement?.id ? 'Saving...' : 'Creating...') : (announcement?.id ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

