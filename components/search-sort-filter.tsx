'use client';

import { useState, useMemo } from 'react';
import { FaSearch, FaSort, FaFilter } from 'react-icons/fa';

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
  searchFields?: (keyof T)[];
  searchPlaceholder?: string;
  sortOptions?: SortOption<T>[];
  filterOptions?: FilterOption<T>[];
  defaultSort?: SortOption<T>;
}

export default function SearchSortFilter<T extends Record<string, any>>({
  items,
  onFilteredItemsChange,
  searchFields = [],
  searchPlaceholder = 'Search...',
  sortOptions = [],
  filterOptions = [],
  defaultSort,
}: SearchSortFilterProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption<T> | null>(defaultSort || null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredAndSorted = useMemo(() => {
    let result = [...items];

    // Apply search filter
    if (searchQuery.trim() && searchFields.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
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

  // Notify parent of filtered results
  useMemo(() => {
    onFilteredItemsChange(filteredAndSorted);
  }, [filteredAndSorted, onFilteredItemsChange]);

  const selectedSortIndex = useMemo(() => {
    if (!sortBy) return 0;
    const index = sortOptions.findIndex(opt => opt.value === sortBy.value && opt.label === sortBy.label);
    return index >= 0 ? index + 1 : 0;
  }, [sortBy, sortOptions]);

  return (
    <div className="space-y-3 mb-4">
      {/* Search and Sort Row */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Search Bar */}
        <div className="flex-1 min-w-[280px] relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
          />
        </div>

        {/* Sort Dropdown */}
        {sortOptions.length > 0 && (
          <div className="relative">
            <FaSort className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
            <select
              value={selectedSortIndex}
              onChange={(e) => {
                const index = parseInt(e.target.value);
                if (index === 0) {
                  setSortBy(null);
                } else {
                  setSortBy(sortOptions[index - 1] || null);
                }
              }}
              className="pl-10 pr-8 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm appearance-none transition-all duration-200 min-w-[200px]"
            >
              <option value="0">Sort by...</option>
              {sortOptions.map((option, index) => (
                <option key={`${String(option.value)}-${index}`} value={index + 1}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Filter Buttons */}
      {filterOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium mr-1">
            <FaFilter className="w-4 h-4" />
            <span>Filter:</span>
          </div>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 hover:bg-blue-700'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            All
          </button>
          {filterOptions.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm ${
                activeFilter === filter.value
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 hover:bg-blue-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Results Count */}
      {(searchQuery || activeFilter !== 'all' || sortBy) && (
        <div className="text-sm text-gray-600 font-medium pt-1">
          Showing {filteredAndSorted.length} of {items.length} items
        </div>
      )}
    </div>
  );
}

