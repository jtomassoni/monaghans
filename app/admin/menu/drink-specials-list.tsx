'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DrinkSpecialModalForm from '@/components/drink-special-modal-form';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import StatusBadge from '@/components/status-badge';
import { getItemStatus } from '@/lib/status-helpers';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { FaBeer } from 'react-icons/fa';

interface DrinkSpecial {
  id: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  type: string;
  appliesOn: string | null; // JSON array of weekdays
  timeWindow: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

interface DrinkSpecialsListProps {
  initialSpecials: DrinkSpecial[];
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_ABBREVIATIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DrinkSpecialsList({ initialSpecials }: DrinkSpecialsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [specials, setSpecials] = useState(initialSpecials);
  const [filteredItems, setFilteredItems] = useState<DrinkSpecial[]>([]);
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<DrinkSpecial | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    setSpecials(initialSpecials);
  }, [initialSpecials]);

  const sortOptions: SortOption<DrinkSpecial>[] = [
    { label: 'Title (A-Z)', value: 'title' },
    { label: 'Title (Z-A)', value: 'title', sortFn: (a, b) => b.title.localeCompare(a.title) },
  ];

  const filterOptions: FilterOption<DrinkSpecial>[] = [
    { label: 'Active Only', value: 'active', filterFn: (item) => item.isActive === true },
    { label: 'Weekly Recurring', value: 'weekly', filterFn: (item) => {
      if (!item.appliesOn) return false;
      try {
        const appliesOn = typeof item.appliesOn === 'string' ? JSON.parse(item.appliesOn) : item.appliesOn;
        return Array.isArray(appliesOn) && appliesOn.length > 0;
      } catch {
        return false;
      }
    }},
    { label: 'Date Specific', value: 'date', filterFn: (item) => item.startDate !== null },
  ];

  const handleItemClick = async (item: DrinkSpecial) => {
    try {
      const res = await fetch(`/api/specials/${item.id}`);
      if (res.ok) {
        const specialData = await res.json();
        const appliesOn = specialData.appliesOn ? JSON.parse(specialData.appliesOn) : [];
        setEditingSpecial({
          id: specialData.id,
          title: specialData.title,
          description: specialData.description || null,
          priceNotes: specialData.priceNotes || null,
          type: specialData.type,
          appliesOn: specialData.appliesOn,
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

  function handleDelete(item: DrinkSpecial) {
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

  const getAppliesOnDays = (appliesOn: string | null): string[] => {
    if (!appliesOn) return [];
    try {
      return JSON.parse(appliesOn);
    } catch {
      return [];
    }
  };

  const formatDays = (appliesOn: string | null): string => {
    const days = getAppliesOnDays(appliesOn);
    if (days.length === 0) return 'No days set';
    if (days.length === 7) return 'Every day';
    
    // Sort days by weekday order
    const sortedDays = days.sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
    
    // Check for consecutive days
    if (sortedDays.length === 5 && sortedDays.join(',') === 'Monday,Tuesday,Wednesday,Thursday,Friday') {
      return 'Weekdays';
    }
    if (sortedDays.length === 2 && sortedDays.join(',') === 'Saturday,Sunday') {
      return 'Weekends';
    }
    
    return sortedDays.map(day => WEEKDAY_ABBREVIATIONS[WEEKDAYS.indexOf(day)]).join(', ');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
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
    window.addEventListener('openNewDrinkSpecial', handleOpenNewSpecial);
    return () => window.removeEventListener('openNewDrinkSpecial', handleOpenNewSpecial);
  }, []);

  // Check for newDrinkSpecial=true query parameter
  useEffect(() => {
    const shouldOpenNew = searchParams.get('newDrinkSpecial');
    if (shouldOpenNew === 'true') {
      setEditingSpecial(null);
      setSpecialModalOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('newDrinkSpecial');
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
          searchPlaceholder="Search drink specials..."
          sortOptions={sortOptions}
          filterOptions={filterOptions}
          defaultSort={sortOptions[0]}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-12 text-center shadow-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <FaBeer className="w-8 h-8 text-blue-400 dark:text-blue-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {specials.length === 0 
                ? 'No drink specials yet. Create your first one!'
                : 'No items match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => {
              const appliesOnDays = getAppliesOnDays(item.appliesOn);
              const isWeeklyRecurring = appliesOnDays.length > 0;
              
              return (
                <div
                  key={item.id}
                  className={`group/item relative w-full rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 p-4 flex justify-between items-start gap-4 cursor-pointer ${
                    !item.isActive
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
                        !item.isActive 
                          ? 'text-gray-500 dark:text-gray-500' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {item.title}
                      </h3>
                      <span className="px-2 py-0.5 text-xs rounded-full font-medium capitalize flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        Drink Special
                      </span>
                      {isWeeklyRecurring && (
                        <span className="px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Weekly
                        </span>
                      )}
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
                      {isWeeklyRecurring && (
                        <p className="truncate">
                          <span className="font-semibold">Days: </span>{formatDays(item.appliesOn)}
                        </p>
                      )}
                      {item.startDate && item.endDate && item.startDate !== item.endDate && (
                        <p className="truncate">
                          Date Range: {formatDate(item.startDate)} - {formatDate(item.endDate)}
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
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={confirmDelete}
        title="Delete Drink Special"
        message={`Are you sure you want to delete "${deleteConfirmation?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Modal */}
      <DrinkSpecialModalForm
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
          type: 'drink' as const,
          appliesOn: editingSpecial.appliesOn ? JSON.parse(editingSpecial.appliesOn) : [],
          timeWindow: editingSpecial.timeWindow || '',
          startDate: editingSpecial.startDate || '',
          endDate: editingSpecial.endDate || '',
          isActive: editingSpecial.isActive,
        } : undefined}
        onSuccess={handleModalSuccess}
        onDelete={handleSpecialDeleted}
      />
    </div>
  );
}

