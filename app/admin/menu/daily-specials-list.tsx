'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SpecialModalForm from '@/components/special-modal-form';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import StatusBadge from '@/components/status-badge';
import { getItemStatus } from '@/lib/status-helpers';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { FaStar } from 'react-icons/fa';

interface DailySpecial {
  id: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  type: string;
  timeWindow: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

interface DailySpecialsListProps {
  initialSpecials: DailySpecial[];
}

export default function DailySpecialsList({ initialSpecials }: DailySpecialsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [specials, setSpecials] = useState(initialSpecials);
  const [filteredItems, setFilteredItems] = useState<DailySpecial[]>([]);
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<DailySpecial | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    setSpecials(initialSpecials);
  }, [initialSpecials]);

  const sortOptions: SortOption<DailySpecial>[] = [
    { 
      label: 'Date (Newest First)', 
      value: 'date', 
      sortFn: (a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
        return bDate - aDate;
      }
    },
    { 
      label: 'Date (Oldest First)', 
      value: 'date', 
      sortFn: (a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
        return aDate - bDate;
      }
    },
    { label: 'Title (A-Z)', value: 'title' },
  ];

  const filterOptions: FilterOption<DailySpecial>[] = [
    { label: 'Active Only', value: 'active', filterFn: (item) => item.isActive },
    { label: 'Food Only', value: 'food', filterFn: (item) => item.type === 'food' },
    { label: 'Drink Only', value: 'drink', filterFn: (item) => item.type === 'drink' },
  ];

  const handleItemClick = async (item: DailySpecial) => {
    try {
      const res = await fetch(`/api/specials/${item.id}`);
      if (res.ok) {
        const specialData = await res.json();
        setEditingSpecial({
          id: specialData.id,
          title: specialData.title,
          description: specialData.description || null,
          priceNotes: specialData.priceNotes || null,
          type: specialData.type,
          timeWindow: specialData.timeWindow || null,
          startDate: specialData.startDate 
            ? (typeof specialData.startDate === 'string' 
                ? specialData.startDate 
                : new Date(specialData.startDate).toISOString().split('T')[0])
            : null,
          endDate: specialData.endDate
            ? (typeof specialData.endDate === 'string'
                ? specialData.endDate
                : new Date(specialData.endDate).toISOString().split('T')[0])
            : null,
          isActive: specialData.isActive,
        });
        setSpecialModalOpen(true);
      }
    } catch (error) {
      showToast('Failed to load special', 'error');
    }
  };

  const handleNewItem = () => {
    setEditingSpecial(null);
    setSpecialModalOpen(true);
  };

  const handleModalSuccess = () => {
    router.refresh();
  };

  const handleSpecialDeleted = (specialId: string) => {
    setSpecials(specials.filter((s) => s.id !== specialId));
    router.refresh();
  };

  function handleDelete(item: DailySpecial) {
    setDeleteConfirmation({ id: item.id, title: item.title });
  }

  async function confirmDelete() {
    if (!deleteConfirmation) return;

    try {
      const res = await fetch(`/api/specials/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSpecials(specials.filter((s) => s.id !== deleteConfirmation.id));
        showToast('Special deleted successfully', 'success');
      } else {
        const error = await res.json();
        showToast('Failed to delete special', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setDeleteConfirmation(null);
    }
  }

  const isPast = (item: DailySpecial) => {
    // For daily specials, check if the date has passed (using Mountain Time)
    const dateToCheck = item.endDate ? new Date(item.endDate) : (item.startDate ? new Date(item.startDate) : null);
    if (!dateToCheck) return false;
    
    // Get today's date in Mountain Time
    const now = new Date();
    const mtToday = now.toLocaleDateString('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const mtDate = dateToCheck.toLocaleDateString('en-US', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Compare dates in Mountain Time
    return mtDate < mtToday;
  };


  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    // Format date in Mountain Time to prevent timezone shifts
    return new Date(dateString).toLocaleDateString('en-US', {
      timeZone: 'America/Denver',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Listen for custom event to open new special modal
  useEffect(() => {
    const handleOpenNewSpecial = () => {
      setEditingSpecial(null);
      setSpecialModalOpen(true);
    };
    window.addEventListener('openNewSpecial', handleOpenNewSpecial);
    return () => window.removeEventListener('openNewSpecial', handleOpenNewSpecial);
  }, []);

  // Check for newSpecial=true query parameter to open new special modal
  useEffect(() => {
    const shouldOpenNew = searchParams.get('newSpecial');
    if (shouldOpenNew === 'true') {
      setEditingSpecial(null);
      setSpecialModalOpen(true);
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('newSpecial');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-4 pb-4 px-2">
        <SearchSortFilter
          items={specials}
          onFilteredItemsChange={setFilteredItems}
          searchFields={['title', 'description', 'priceNotes']}
          searchPlaceholder="Search daily specials..."
          sortOptions={sortOptions}
          filterOptions={filterOptions}
          defaultSort={sortOptions[0]}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-12 text-center shadow-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
              <FaStar className="w-8 h-8 text-orange-400 dark:text-orange-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {specials.length === 0 
                ? 'No daily specials yet. Create your first one!'
                : 'No items match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`group/item relative w-full rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 p-4 flex justify-between items-start gap-4 cursor-pointer ${
                  isPast(item)
                    ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 opacity-75'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div
                  className="flex-1 min-w-0"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className={`text-sm font-semibold truncate ${
                      isPast(item) 
                        ? 'text-gray-500 dark:text-gray-500 line-through' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {item.title}
                    </h3>
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium capitalize flex-shrink-0 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                      Daily Special
                    </span>
                    {item.startDate && (
                      <span className="px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(item.startDate)}
                      </span>
                    )}
                    {getItemStatus({
                      isActive: item.isActive,
                      startDate: item.startDate,
                      endDate: item.endDate,
                    }).map((status) => (
                      <StatusBadge key={status} status={status} />
                    ))}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">{item.description}</p>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                    {item.priceNotes && (
                      <p className="truncate font-semibold text-gray-700 dark:text-gray-300">Price: {item.priceNotes}</p>
                    )}
                    {item.timeWindow && (
                      <p className="truncate">Time: {item.timeWindow}</p>
                    )}
                    {item.endDate && item.endDate !== item.startDate && (
                      <p className="truncate">
                        Ends: {formatDate(item.endDate)}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Edit button - appears centered on hover */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                    className="pointer-events-auto px-4 py-2 text-sm bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 z-10 border border-blue-400 dark:border-blue-500"
                    title="Click anywhere to edit"
                  >
                    Edit
                  </button>
                </div>
                
                {/* Delete button - always visible */}
                <div className="flex-shrink-0 z-20 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                    className="px-3 py-1.5 text-xs bg-red-500/90 dark:bg-red-600/90 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 border border-red-400 dark:border-red-500"
                    title="Delete special"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={confirmDelete}
        title="Delete Daily Special"
        message={`Are you sure you want to delete "${deleteConfirmation?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Modal */}
      <SpecialModalForm
        isOpen={specialModalOpen}
        onClose={() => {
          setSpecialModalOpen(false);
          setEditingSpecial(null);
        }}
        special={editingSpecial ? {
          id: editingSpecial.id,
          title: editingSpecial.title,
          description: editingSpecial.description || '',
          priceNotes: editingSpecial.priceNotes || '',
          type: editingSpecial.type as 'food' | 'drink',
          appliesOn: [], // Daily specials (food type) don't use appliesOn
          timeWindow: editingSpecial.timeWindow || '',
          startDate: editingSpecial.startDate || '',
          endDate: editingSpecial.endDate || '',
          isActive: editingSpecial.isActive,
        } : undefined}
        defaultType="food"
        onSuccess={handleModalSuccess}
        onDelete={handleSpecialDeleted}
      />
    </div>
  );
}

