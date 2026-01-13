'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AnnouncementModalForm from '@/components/announcement-modal-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import { showToast } from '@/components/toast';
import StatusBadge from '@/components/status-badge';
import { getItemStatus } from '@/lib/status-helpers';

interface Announcement {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  publishAt: string | null;
  expiresAt?: string | null;
  heroImage: string;
  crossPostFacebook: boolean;
  crossPostInstagram: boolean;
  ctaText?: string;
  ctaUrl?: string;
}

export default function AdminAnnouncementsList({
  initialAnnouncements,
}: {
  initialAnnouncements: Announcement[];
}) {
  const searchParams = useSearchParams();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [filteredItems, setFilteredItems] = useState<Announcement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | undefined>();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    setAnnouncements(initialAnnouncements);
    // Initialize filteredItems with all announcements
    // SearchSortFilter will update filteredItems when items prop changes
    setFilteredItems(initialAnnouncements);
  }, [initialAnnouncements]);

  const sortOptions: SortOption<Announcement>[] = [
    {
      label: 'Publish Date (Newest First)',
      value: 'publishAt',
      sortFn: (a, b) => {
        const aDate = a.publishAt ? new Date(a.publishAt).getTime() : 0;
        const bDate = b.publishAt ? new Date(b.publishAt).getTime() : 0;
        return bDate - aDate;
      },
    },
    {
      label: 'Publish Date (Oldest First)',
      value: 'publishAt',
      sortFn: (a, b) => {
        const aDate = a.publishAt ? new Date(a.publishAt).getTime() : 0;
        const bDate = b.publishAt ? new Date(b.publishAt).getTime() : 0;
        return aDate - bDate;
      },
    },
    {
      label: 'Expiration Date (Newest First)',
      value: 'expiresAt',
      sortFn: (a, b) => {
        const aDate = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        return bDate - aDate;
      },
    },
    {
      label: 'Expiration Date (Oldest First)',
      value: 'expiresAt',
      sortFn: (a, b) => {
        const aDate = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      },
    },
    { label: 'Title (A-Z)', value: 'title' },
    { label: 'Title (Z-A)', value: 'title', sortFn: (a, b) => b.title.localeCompare(a.title) },
  ];

  const filterOptions: FilterOption<Announcement>[] = [
    { label: 'Published Only', value: 'published', filterFn: (item) => item.isPublished },
    { label: 'Draft Only', value: 'draft', filterFn: (item) => !item.isPublished },
    {
      label: 'Active (Currently Live)',
      value: 'active',
      filterFn: (item) => {
        if (!item.isPublished) return false;
        const now = new Date();
        const publishAt = item.publishAt ? new Date(item.publishAt) : null;
        const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
        const isPublished = !publishAt || publishAt <= now;
        const notExpired = !expiresAt || expiresAt >= now;
        return isPublished && notExpired;
      },
    },
    {
      label: 'Expired',
      value: 'expired',
      filterFn: (item) => {
        if (!item.expiresAt) return false;
        const now = new Date();
        const expiresAt = new Date(item.expiresAt);
        return expiresAt < now;
      },
    },
    {
      label: 'Scheduled (Future)',
      value: 'scheduled',
      filterFn: (item) => {
        if (!item.publishAt) return false;
        const now = new Date();
        const publishAt = new Date(item.publishAt);
        return publishAt > now;
      },
    },
  ];

  useEffect(() => {
    const handleOpenModal = () => {
      setEditingAnnouncement(undefined);
      setIsModalOpen(true);
    };
    window.addEventListener('openAnnouncementModal', handleOpenModal);
    return () => {
      window.removeEventListener('openAnnouncementModal', handleOpenModal);
    };
  }, []);

  async function handleDelete(id: string) {
    const announcement = announcements.find((a) => a.id === id);
    if (announcement) {
      setDeleteConfirmation({ id, title: announcement.title });
    }
  }

  async function confirmDelete() {
    if (!deleteConfirmation) return;

    try {
      const res = await fetch(`/api/announcements/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (res.ok) {
        const updatedAnnouncements = announcements.filter((a) => a.id !== deleteConfirmation.id);
        setAnnouncements(updatedAnnouncements);
        showToast('Announcement deleted successfully', 'success');
      } else {
        showToast('Failed to delete announcement', 'error');
      }
    } catch (error) {
      showToast('Failed to delete announcement', 'error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setDeleteConfirmation(null);
    }
  }

  async function handleEdit(id: string) {
    try {
      const res = await fetch(`/api/announcements/${id}`);
      if (res.ok) {
        const announcement = await res.json();
        setEditingAnnouncement({
          id: announcement.id,
          title: announcement.title || '',
          body: announcement.body || '',
          heroImage: announcement.heroImage || '',
          publishAt: announcement.publishAt ? new Date(announcement.publishAt).toISOString() : null,
          expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString() : null,
          isPublished: announcement.isPublished ?? false,
          crossPostFacebook: announcement.crossPostFacebook ?? false,
          crossPostInstagram: announcement.crossPostInstagram ?? false,
          ctaText: announcement.ctaText || '',
          ctaUrl: announcement.ctaUrl || '',
        });
        setIsModalOpen(true);
      }
    } catch (error) {
      showToast('Failed to load announcement', 'error', error instanceof Error ? error.message : 'An error occurred');
    }
  }

  // Check for announcement ID in URL query params and open modal if present
  useEffect(() => {
    const announcementId = searchParams.get('id');
    if (announcementId) {
      handleEdit(announcementId);
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.replaceState({}, '', url.toString());
    }
    // Check for new=true query parameter to open new announcement modal
    const shouldOpenNew = searchParams.get('new');
    if (shouldOpenNew === 'true') {
      setEditingAnnouncement(undefined);
      setIsModalOpen(true);
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleNew() {
    setEditingAnnouncement(undefined);
    setIsModalOpen(true);
  }

  function handleModalClose() {
    setIsModalOpen(false);
    setEditingAnnouncement(undefined);
  }

  async function handleSuccess() {
    // Fetch fresh data from API
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const freshData = await res.json();
        setAnnouncements(freshData);
      }
    } catch (error) {
      console.error('Failed to refresh announcements:', error);
    }
  }

  return (
    <>
      <AnnouncementModalForm
        isOpen={isModalOpen}
        onClose={handleModalClose}
        announcement={editingAnnouncement}
        onSuccess={handleSuccess}
        onDelete={(id) => {
          const updatedAnnouncements = announcements.filter((a) => a.id !== id);
          setAnnouncements(updatedAnnouncements);
          handleModalClose();
        }}
      />
      <ConfirmationDialog
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={confirmDelete}
        title="Delete Announcement"
        message={`Are you sure you want to delete "${deleteConfirmation?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
      <div className="space-y-4">
        {/* Search, Sort, Filter - Always visible */}
        <SearchSortFilter
          items={announcements}
          onFilteredItemsChange={setFilteredItems}
          searchFields={['title', 'body']}
          searchPlaceholder="Search announcements..."
          sortOptions={sortOptions}
          filterOptions={filterOptions}
          defaultSort={sortOptions[0]}
        />

        {/* Announcements List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {announcements.length === 0 
                ? 'No announcements yet. Create your first one!'
                : 'No announcements match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((announcement) => (
                <div
                  key={announcement.id}
                  className="group/item relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 p-4 flex justify-between items-start gap-4 cursor-pointer"
                >
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => handleEdit(announcement.id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{announcement.title}</h3>
                      {getItemStatus({
                        isPublished: announcement.isPublished,
                        publishAt: announcement.publishAt,
                        expiresAt: announcement.expiresAt,
                      }).map((status) => (
                        <StatusBadge key={status} status={status} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{announcement.body}</p>
                  </div>
                  
                  {/* Action buttons - always visible */}
                  <div className="flex-shrink-0 z-20 relative flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(announcement.id);
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 border border-blue-400 dark:border-blue-500 cursor-pointer"
                      title="Edit announcement"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(announcement.id);
                      }}
                      className="px-3 py-1.5 text-xs bg-red-500/90 dark:bg-red-600/90 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 border border-red-400 dark:border-red-500 cursor-pointer"
                      title="Delete announcement"
                    >
                      Delete
                    </button>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

