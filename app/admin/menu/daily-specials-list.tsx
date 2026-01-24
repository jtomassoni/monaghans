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
  appliesOn: string | null; // JSON array of weekdays for recurring specials
  image: string | null;
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
          timeWindow: null, // Specials are always all day
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
          appliesOn: specialData.appliesOn || null,
          image: specialData.image || null,
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
          appliesOn: specialData.appliesOn || null,
          timeWindow: null, // Specials are always all day
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
          image: specialData.image || null,
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
    if (days.length === 0) return '';
    if (days.length === 7) return 'Every day';
    
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const WEEKDAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
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
      <div className="flex-shrink-0 space-y-3 sm:space-y-4 pb-4 sm:pb-6">
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
      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 sm:mx-0 px-4 sm:px-0">
        {displayItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-8 sm:p-12 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
              <FaStar className="w-7 h-7 sm:w-8 sm:h-8 text-orange-400 dark:text-orange-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {specials.length === 0 
                ? 'No daily specials yet. Create your first one!'
                : 'No items match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="md:hidden space-y-3">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  className={`group/item relative w-full rounded-xl border-2 shadow-sm hover:shadow-lg transition-all duration-200 p-4 cursor-pointer ${
                    isPast(item) || !item.isActive
                      ? 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 opacity-70'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50/30 dark:hover:bg-gray-700/30'
                  }`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className={`text-base font-bold leading-tight ${
                            isPast(item) || !item.isActive
                              ? 'text-gray-400 dark:text-gray-500 line-through'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {item.title}
                          </h3>
                          <span className="px-2.5 py-1 text-xs rounded-full font-semibold capitalize flex-shrink-0 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                            {item.type}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {item.startDate && (
                        <span className="px-2.5 py-1 text-xs rounded-full font-medium flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(item.startDate)}
                          {item.endDate && item.endDate !== item.startDate && ` - ${formatDate(item.endDate)}`}
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
                    
                    {/* Footer Row */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t-2 border-gray-100 dark:border-gray-700/50">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        {item.priceNotes && (
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {item.priceNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                          }}
                          className="p-2.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-150 active:scale-95 touch-manipulation"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        {item.type === 'food' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(item);
                            }}
                            className="p-2.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-all duration-150 active:scale-95 touch-manipulation"
                            title="Duplicate"
                          >
                            <FaCopy className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          className="p-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-all duration-150 active:scale-95 touch-manipulation"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900/80 dark:to-gray-800/50 border-b-2 border-gray-200 dark:border-gray-700">
                    <tr>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => handleColumnSort('title')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Title</span>
                          {columnSort.field === 'title' ? (
                            columnSort.direction === 'asc' ? (
                              <FaSortUp className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : columnSort.direction === 'desc' ? (
                              <FaSortDown className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : (
                              <FaSort className="w-3.5 h-3.5 opacity-50" />
                            )
                          ) : (
                            <FaSort className="w-3.5 h-3.5 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => handleColumnSort('startDate')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Date</span>
                          {columnSort.field === 'startDate' ? (
                            columnSort.direction === 'asc' ? (
                              <FaSortUp className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : columnSort.direction === 'desc' ? (
                              <FaSortDown className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : (
                              <FaSort className="w-3.5 h-3.5 opacity-50" />
                            )
                          ) : (
                            <FaSort className="w-3.5 h-3.5 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => handleColumnSort('type')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Type</span>
                          {columnSort.field === 'type' ? (
                            columnSort.direction === 'asc' ? (
                              <FaSortUp className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : columnSort.direction === 'desc' ? (
                              <FaSortDown className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : (
                              <FaSort className="w-3.5 h-3.5 opacity-50" />
                            )
                          ) : (
                            <FaSort className="w-3.5 h-3.5 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => handleColumnSort('priceNotes')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Price</span>
                          {columnSort.field === 'priceNotes' ? (
                            columnSort.direction === 'asc' ? (
                              <FaSortUp className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : columnSort.direction === 'desc' ? (
                              <FaSortDown className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : (
                              <FaSort className="w-3.5 h-3.5 opacity-50" />
                            )
                          ) : (
                            <FaSort className="w-3.5 h-3.5 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={() => handleColumnSort('isActive')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Status</span>
                          {columnSort.field === 'isActive' ? (
                            columnSort.direction === 'asc' ? (
                              <FaSortUp className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : columnSort.direction === 'desc' ? (
                              <FaSortDown className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                            ) : (
                              <FaSort className="w-3.5 h-3.5 opacity-50" />
                            )
                          ) : (
                            <FaSort className="w-3.5 h-3.5 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                    {displayItems.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`group/row transition-all duration-150 ${
                          isPast(item) 
                            ? 'opacity-60' 
                            : 'hover:bg-orange-50/50 dark:hover:bg-gray-700/30 hover:shadow-sm'
                        } ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-sm font-semibold cursor-pointer transition-colors ${
                                isPast(item)
                                  ? 'text-gray-400 dark:text-gray-500 line-through'
                                  : 'text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400'
                              }`}
                              onClick={() => handleItemClick(item)}
                            >
                              {item.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {item.startDate ? (
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {formatDate(item.startDate)}
                                {item.endDate && item.endDate !== item.startDate && (
                                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                                    - {formatDate(item.endDate)}
                                  </span>
                                )}
                              </span>
                            ) : item.appliesOn ? (
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Every {formatDays(item.appliesOn)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500 italic">No date</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-md">
                            {item.description || <span className="text-gray-400 dark:text-gray-500 italic">-</span>}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {item.priceNotes || <span className="text-gray-400 dark:text-gray-500 italic">-</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getItemStatus({
                              isActive: item.isActive,
                              startDate: item.startDate,
                              endDate: item.endDate,
                            }).map((status) => (
                              <StatusBadge key={status} status={status} />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleItemClick(item)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                              title="Edit"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            {item.type === 'food' && (
                              <button
                                onClick={() => handleDuplicate(item)}
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
                                title="Duplicate"
                              >
                                <FaCopy className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95"
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
            </div>
          </>
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
          timeWindow: '', // Specials are always all day
          startDate: editingSpecial.startDate || '',
          endDate: editingSpecial.endDate || '',
          image: editingSpecial.image || '',
          isActive: editingSpecial.isActive,
        } : undefined}
        defaultType="food"
        onSuccess={handleModalSuccess}
        onDelete={handleSpecialDeleted}
      />
    </div>
  );
}

