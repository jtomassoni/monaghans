'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FaSearch, FaSort, FaFilter, FaChevronDown, FaChevronUp } from 'react-icons/fa';

export type SortOption<T> = {
  label: string;
  value: keyof T | string;
  sortFn?: (a: T, b: T) => number;
};

export type FilterOption<T> = {
  label: string;
  value: string;
  filterFn: (item: T) => boolean;
};

interface SearchSortFilterProps<T> {
  items: T[];
  onFilteredItemsChange: (filtered: T[]) => void;
  searchFields?: (keyof T | string)[];
  searchPlaceholder?: string;
  sortOptions?: SortOption<T>[];
  filterOptions?: FilterOption<T>[];
  defaultSort?: SortOption<T>;
  actionButton?: React.ReactNode;
  onSortChange?: () => void;
}

// Helper function to get nested property values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => {
    return current && current[prop] !== undefined ? current[prop] : null;
  }, obj);
}

export default function SearchSortFilter<T extends Record<string, any>>({
  items,
  onFilteredItemsChange,
  searchFields = [],
  searchPlaceholder = 'Search...',
  sortOptions = [],
  filterOptions = [],
  defaultSort,
  actionButton,
  onSortChange,
}: SearchSortFilterProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption<T> | null>(defaultSort || null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredAndSorted = useMemo(() => {
    let result = [...items];

    // Apply search filter
    if (searchQuery.trim() && searchFields.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = typeof field === 'string' && field.includes('.')
            ? getNestedValue(item, field)
            : item[field as keyof T];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply filter options
    if (activeFilter !== 'all') {
      const filter = filterOptions.find((f) => f.value === activeFilter);
      if (filter) {
        result = result.filter(filter.filterFn);
      }
    }

    // Apply sorting
    if (sortBy) {
      if (sortBy.sortFn) {
        result.sort(sortBy.sortFn);
      } else {
        const field = sortBy.value as keyof T;
        result.sort((a, b) => {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return aVal.localeCompare(bVal);
          }
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return aVal - bVal;
          }
          // Check if values are Date objects (as strings from ISO)
          const aDate = typeof aVal === 'string' ? new Date(aVal) : null;
          const bDate = typeof bVal === 'string' ? new Date(bVal) : null;
          if (aDate && bDate && !isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
            return aDate.getTime() - bDate.getTime();
          }
          return String(aVal).localeCompare(String(bVal));
        });
      }
    }

    return result;
  }, [items, searchQuery, sortBy, activeFilter, searchFields, filterOptions]);

  // Store callback in ref to avoid including it in dependency array
  const callbackRef = useRef(onFilteredItemsChange);
  useEffect(() => {
    callbackRef.current = onFilteredItemsChange;
  }, [onFilteredItemsChange]);

  // Store previous filtered items to compare
  const prevFilteredRef = useRef<T[]>([]);
  
  // Compare arrays by serializing IDs (or item references if no ID)
  const getArraySignature = (arr: T[]): string => {
    return arr.map(item => {
      // Try to use id if available, otherwise use the whole item serialized
      const id = (item as any).id;
      return id !== undefined ? String(id) : JSON.stringify(item);
    }).join('|');
  };

  // Notify parent of filtered results only when they actually change
  useEffect(() => {
    const prevFiltered = prevFilteredRef.current;
    const currentFiltered = filteredAndSorted;
    
    // Compare using serialized signatures
    const prevSignature = getArraySignature(prevFiltered);
    const currentSignature = getArraySignature(currentFiltered);
    
    if (prevSignature !== currentSignature) {
      prevFilteredRef.current = currentFiltered;
      callbackRef.current(currentFiltered);
    }
  }, [filteredAndSorted]);

  const selectedSortIndex = useMemo(() => {
    if (!sortBy) return 0;
    const index = sortOptions.findIndex(opt => opt.value === sortBy.value && opt.label === sortBy.label);
    return index >= 0 ? index + 1 : 0;
  }, [sortBy, sortOptions]);

  // Check if any filters are active
  const hasSearch = searchQuery.trim() !== '';
  const hasFilter = activeFilter !== 'all';
  const hasSort = sortBy !== null && defaultSort && (sortBy.value !== defaultSort.value || sortBy.label !== defaultSort.label);
  const hasActiveFilters = hasSearch || hasFilter || hasSort;
  const activeFilterCount = [
    hasSearch ? 1 : 0,
    hasFilter ? 1 : 0,
    hasSort ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2 sm:space-y-2.5">
      {/* Top Row: Action Button and Toggle Button (Mobile) */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center">
        {/* Action Button - Always visible */}
        {actionButton && (
          <div className="flex-shrink-0 w-full sm:w-auto order-1 sm:order-none">
            {actionButton}
          </div>
        )}
        
        {/* Toggle Button for Search/Sort/Filter - Mobile only */}
        {(searchFields.length > 0 || sortOptions.length > 0 || filterOptions.length > 0) && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium touch-manipulation sm:hidden ${
              hasActiveFilters ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''
            } ${isExpanded ? '' : 'w-full'}`}
          >
            <FaSearch className="w-4 h-4" />
            <span>Search & Filter</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 bg-blue-500 dark:bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                {activeFilterCount}
              </span>
            )}
            {isExpanded ? (
              <FaChevronUp className="w-3 h-3 ml-auto" />
            ) : (
              <FaChevronDown className="w-3 h-3 ml-auto" />
            )}
          </button>
        )}
      </div>

      {/* Search, Sort, and Filter Controls - Always visible on desktop, collapsible on mobile */}
      <div className={`space-y-2 sm:space-y-2.5 ${isExpanded ? 'block' : 'hidden'} sm:block`}>
          {/* Search and Sort Row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center">
            {/* Search Bar */}
            {searchFields.length > 0 && (
              <div className="flex-1 min-w-0 relative">
                <FaSearch className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm transition-all duration-200 text-sm touch-manipulation"
                />
              </div>
            )}

            {/* Sort Dropdown */}
            {sortOptions.length > 0 && (
              <div className="relative w-full sm:w-auto sm:min-w-[160px]">
                <FaSort className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none z-10" />
                <select
                  value={selectedSortIndex}
                  onChange={(e) => {
                    const index = parseInt(e.target.value);
                    if (index === 0) {
                      setSortBy(null);
                    } else {
                      setSortBy(sortOptions[index - 1] || null);
                    }
                    // Call onSortChange callback if provided
                    if (onSortChange) {
                      onSortChange();
                    }
                  }}
                  className="w-full pl-9 sm:pl-10 pr-7 sm:pr-8 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm appearance-none transition-all duration-200 text-sm touch-manipulation"
                >
                  <option value="0">Sort by...</option>
                  {sortOptions.map((option, index) => (
                    <option key={`${String(option.value)}-${index}`} value={index + 1}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Filter Row */}
          {filterOptions.length > 0 && (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Filter Label - Hidden on mobile, shown on desktop */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium flex-shrink-0">
                <FaFilter className="w-4 h-4" />
                <span>Filter:</span>
              </div>
              
              {/* Filter Dropdown */}
              <div className="relative flex-1 min-w-0">
                <FaFilter className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none z-10 sm:hidden" />
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full pl-3 sm:pl-4 pr-7 sm:pr-8 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm appearance-none transition-all duration-200 text-sm touch-manipulation"
                >
                  <option value="all">All Items</option>
                  {filterOptions.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Results Count - Always visible when filters are active */}
      {hasActiveFilters && (
        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
          Showing {filteredAndSorted.length} of {items.length}
        </div>
      )}
    </div>
  );
}

