'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SpecialModalForm from '@/components/special-modal-form';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import StatusBadge from '@/components/status-badge';
import { getItemStatus } from '@/lib/status-helpers';
import { getMountainTimeDateString, getMountainTimeToday, parseMountainTimeDate } from '@/lib/timezone';
import { startOfDay, endOfDay } from 'date-fns';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { FaStar, FaSort, FaSortUp, FaSortDown, FaEdit, FaCopy, FaTrash } from 'react-icons/fa';

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

type SortField = 'title' | 'startDate' | 'type' | 'isActive' | 'priceNotes';
type SortDirection = 'asc' | 'desc' | null;

export default function DailySpecialsList({ initialSpecials }: DailySpecialsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [specials, setSpecials] = useState(initialSpecials);
  const [filteredItems, setFilteredItems] = useState<DailySpecial[]>([]);
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<DailySpecial | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);
  const [columnSort, setColumnSort] = useState<{ field: SortField; direction: SortDirection }>({ field: 'startDate', direction: null });

  useEffect(() => {
    setSpecials(initialSpecials);
  }, [initialSpecials]);

  // Get today's date string in Mountain Time for sorting
  const todayStr = getMountainTimeDateString(getMountainTimeToday());
  const now = getMountainTimeToday();

  // Helper function to get the next occurrence date for a special
  const getSpecialDate = (special: DailySpecial): Date => {
    // For date-based specials, use startDate (or endDate if it's a range)
    if (special.startDate) {
      const startDate = parseMountainTimeDate(special.startDate.split('T')[0]);
      const endDate = special.endDate ? parseMountainTimeDate(special.endDate.split('T')[0]) : null;
      
      // If the special is currently active (today is within the range), return today
      const effectiveEndDate = endDate || startDate;
      const start = startOfDay(startDate);
      const end = endOfDay(effectiveEndDate);
      
      if (now >= start && now <= end) {
        return now; // Currently active, show it first
      }
      
      // If startDate is in the future, return it
      if (startDate > now) {
        return startDate;
      }
      
      // If past, return the end date (or start date if no end date)
      return endDate || startDate;
    }
    
    // For weekly recurring specials (appliesOn), find the next occurrence
    // Note: appliesOn is not in the interface, but we'll handle it if it exists
    const appliesOn = (special as any).appliesOn;
    if (appliesOn && Array.isArray(appliesOn) && appliesOn.length > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayMap: Record<string, number> = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      
      // Find the next matching day
      let checkDate = new Date(now);
      for (let i = 0; i < 14; i++) { // Check up to 2 weeks ahead
        const dayName = dayNames[checkDate.getDay()];
        if (appliesOn.includes(dayName)) {
          // Check if within date range if set
          if (special.startDate || special.endDate) {
            const startDate = special.startDate ? parseMountainTimeDate(special.startDate.split('T')[0]) : null;
            const endDate = special.endDate ? parseMountainTimeDate(special.endDate.split('T')[0]) : null;
            
            if (startDate && checkDate < startOfDay(startDate)) {
              checkDate.setDate(checkDate.getDate() + 1);
              continue;
            }
            if (endDate && checkDate > endOfDay(endDate)) {
              // Past the end date, return far future
              const farFuture = new Date();
              farFuture.setFullYear(farFuture.getFullYear() + 100);
              return farFuture;
            }
          }
          return startOfDay(checkDate);
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }
      
      // No match found in next 2 weeks, return far future
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 100);
      return farFuture;
    }
    
    // No date information, return far future to sort at end
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);
    return farFuture;
  };

  // Helper to get status priority: Active (0), Scheduled (1), Past (2)
  const getStatusPriority = (special: DailySpecial): number => {
    const statuses = getItemStatus({
      isActive: special.isActive,
      startDate: special.startDate,
      endDate: special.endDate,
    });
    
    // Check for statuses in priority order
    if (statuses.includes('active')) return 0; // Active first
    if (statuses.includes('scheduled')) return 1; // Scheduled second
    if (statuses.includes('past')) return 2; // Past third
    return 3; // Everything else (inactive, etc.)
  };

  const sortOptions: SortOption<DailySpecial>[] = [
    { 
      label: 'Next', 
      value: 'next', 
      sortFn: (a, b) => {
        // PRIORITY 1: Status (Active → Scheduled → Past)
        const aStatusPriority = getStatusPriority(a);
        const bStatusPriority = getStatusPriority(b);
        
        if (aStatusPriority !== bStatusPriority) {
          return aStatusPriority - bStatusPriority;
        }
        
        // PRIORITY 2: Within the same status, sort chronologically
        const aDate = getSpecialDate(a).getTime();
        const bDate = getSpecialDate(b).getTime();
        return aDate - bDate;
      }
    },
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
      value: 'date-oldest', 
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

  const handleDuplicate = async (item: DailySpecial) => {
    try {
      const res = await fetch(`/api/specials/${item.id}`);
      if (res.ok) {
        const specialData = await res.json();
        // Create a duplicate without the ID
        setEditingSpecial({
          id: '', // No ID means it's a new special
          title: `${specialData.title} (Copy)`,
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
          isActive: false, // Start as inactive so user can review before activating
        });
        setSpecialModalOpen(true);
      }
    } catch (error) {
      showToast('Failed to duplicate special', 'error');
    }
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
    // Use startDate if endDate is not set or equals startDate (single-day specials)
    const dateToCheck = item.endDate && item.endDate !== item.startDate 
      ? item.endDate 
      : (item.startDate || null);
    
    if (!dateToCheck) return false;
    
    // Get today's date string in Mountain Time (YYYY-MM-DD format)
    const mtToday = getMountainTimeToday();
    const mtTodayStr = getMountainTimeDateString(mtToday);
    
    // Parse the special's date and get its date string in Mountain Time
    const specialDate = new Date(dateToCheck);
    const specialDateStr = getMountainTimeDateString(specialDate);
    
    // Only mark as past if the date is strictly before today (not today)
    return specialDateStr < mtTodayStr;
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

  const handleColumnSort = (field: SortField) => {
    setColumnSort((prev) => {
      if (prev.field === field) {
        // Cycle through: asc -> desc -> null -> asc
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        if (prev.direction === 'desc') return { field, direction: null };
        return { field, direction: 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  // Apply column sorting to filtered items
  const displayItems = useMemo(() => {
    if (!columnSort.direction) return filteredItems;
    
    const sorted = [...filteredItems].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (columnSort.field) {
        case 'title':
          aVal = a.title?.toLowerCase() || '';
          bVal = b.title?.toLowerCase() || '';
          break;
        case 'startDate':
          aVal = a.startDate ? new Date(a.startDate).getTime() : 0;
          bVal = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        case 'type':
          aVal = a.type?.toLowerCase() || '';
          bVal = b.type?.toLowerCase() || '';
          break;
        case 'isActive':
          aVal = a.isActive ? 1 : 0;
          bVal = b.isActive ? 1 : 0;
          break;
        case 'priceNotes':
          aVal = a.priceNotes?.toLowerCase() || '';
          bVal = b.priceNotes?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return columnSort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return columnSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredItems, columnSort]);

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
          defaultSort={sortOptions[0]} // "Next" - today, tomorrow, day after
          onSortChange={() => {
            // Reset table header column sorting when user selects a sort option from dropdown
            setColumnSort({ field: 'startDate', direction: null });
          }}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {displayItems.length === 0 ? (
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
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full border-collapse bg-white dark:bg-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleColumnSort('title')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Title</span>
                      {columnSort.field === 'title' ? (
                        columnSort.direction === 'asc' ? (
                          <FaSortUp className="w-3 h-3" />
                        ) : columnSort.direction === 'desc' ? (
                          <FaSortDown className="w-3 h-3" />
                        ) : (
                          <FaSort className="w-3 h-3 opacity-50" />
                        )
                      ) : (
                        <FaSort className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleColumnSort('startDate')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Date</span>
                      {columnSort.field === 'startDate' ? (
                        columnSort.direction === 'asc' ? (
                          <FaSortUp className="w-3 h-3" />
                        ) : columnSort.direction === 'desc' ? (
                          <FaSortDown className="w-3 h-3" />
                        ) : (
                          <FaSort className="w-3 h-3 opacity-50" />
                        )
                      ) : (
                        <FaSort className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleColumnSort('type')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Type</span>
                      {columnSort.field === 'type' ? (
                        columnSort.direction === 'asc' ? (
                          <FaSortUp className="w-3 h-3" />
                        ) : columnSort.direction === 'desc' ? (
                          <FaSortDown className="w-3 h-3" />
                        ) : (
                          <FaSort className="w-3 h-3 opacity-50" />
                        )
                      ) : (
                        <FaSort className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    Description
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleColumnSort('priceNotes')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Price</span>
                      {columnSort.field === 'priceNotes' ? (
                        columnSort.direction === 'asc' ? (
                          <FaSortUp className="w-3 h-3" />
                        ) : columnSort.direction === 'desc' ? (
                          <FaSortDown className="w-3 h-3" />
                        ) : (
                          <FaSort className="w-3 h-3 opacity-50" />
                        )
                      ) : (
                        <FaSort className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleColumnSort('isActive')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      {columnSort.field === 'isActive' ? (
                        columnSort.direction === 'asc' ? (
                          <FaSortUp className="w-3 h-3" />
                        ) : columnSort.direction === 'desc' ? (
                          <FaSortDown className="w-3 h-3" />
                        ) : (
                          <FaSort className="w-3 h-3 opacity-50" />
                        )
                      ) : (
                        <FaSort className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                      isPast(item) ? 'opacity-75' : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 ${
                            isPast(item)
                              ? 'text-gray-500 dark:text-gray-500 line-through'
                              : 'text-gray-900 dark:text-white'
                          }`}
                          onClick={() => handleItemClick(item)}
                        >
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.startDate && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {formatDate(item.startDate)}
                          </span>
                        )}
                        {item.endDate && item.endDate !== item.startDate && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            - {formatDate(item.endDate)}
                          </span>
                        )}
                        {!item.startDate && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">No date</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full font-medium capitalize bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-xs">
                        {item.description || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white font-medium">
                        {item.priceNotes || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 flex-wrap">
                        {getItemStatus({
                          isActive: item.isActive,
                          startDate: item.startDate,
                          endDate: item.endDate,
                        }).map((status) => (
                          <StatusBadge key={status} status={status} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleItemClick(item)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        {item.type === 'food' && (
                          <button
                            onClick={() => handleDuplicate(item)}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <FaCopy className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

