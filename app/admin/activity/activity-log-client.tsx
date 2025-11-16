'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaHistory, FaEdit, FaTrash, FaPlus, FaSearch, FaSortUp, FaSortDown } from 'react-icons/fa';

interface Activity {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  changes: string | null;
  description: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    isActive: boolean | null;
  } | null;
}

interface ActivityLogResponse {
  activities: Activity[];
  total: number;
}

const ITEMS_PER_PAGE = 25;

export default function ActivityLogClient() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
        sortOrder,
      });
      
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }

      const response = await fetch(`/api/activity?${params.toString()}`);
      const data: ActivityLogResponse = await response.json();
      setActivities(data.activities);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortOrder, debouncedSearchQuery]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDateTime = (date: Date | string) => {
    return `${formatDate(date)} at ${formatTime(date)}`;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FaPlus className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />;
      case 'update':
        return <FaEdit className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />;
      case 'delete':
        return <FaTrash className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />;
      default:
        return <FaEdit className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
      case 'update':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
      case 'delete':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    return entityType
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 px-6 py-2 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <FaHistory className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Activity Log
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              All actions taken in the CMS
            </p>
          </div>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex-shrink-0 px-6 py-2 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm relative z-10">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm transition-all duration-200 text-sm"
            />
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm transition-all duration-200 text-sm"
            title={`Sort by date ${sortOrder === 'desc' ? '(Newest first)' : '(Oldest first)'}`}
          >
            {sortOrder === 'desc' ? (
              <FaSortDown className="w-4 h-4" />
            ) : (
              <FaSortUp className="w-4 h-4" />
            )}
            <span>Date {sortOrder === 'desc' ? '↓' : '↑'}</span>
          </button>
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {total} total
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Loading...</p>
              </div>
            ) : activities.length > 0 ? (
              <>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="flex-shrink-0">
                          {getActionIcon(activity.action)}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {activity.user ? (activity.user.name || activity.user.email) : '(deleted user)'}
                          </span>
                          {!activity.user && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                              (deleted)
                            </span>
                          )}
                          {activity.user && activity.user.isActive === false && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                              (inactive)
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(activity.action)}`}>
                            {activity.action}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {getEntityTypeLabel(activity.entityType)}
                          </span>
                          {activity.entityName && (
                            <>
                              <span className="text-gray-500 dark:text-gray-500">•</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                "{activity.entityName}"
                              </span>
                            </>
                          )}
                          <span className="text-gray-500 dark:text-gray-500">•</span>
                          <span className="text-gray-600 dark:text-gray-400 truncate">
                            {activity.description}
                          </span>
                          {activity.changes && (
                            <span className="text-gray-500 dark:text-gray-500 text-xs">
                              {(() => {
                                try {
                                  const changes = JSON.parse(activity.changes);
                                  const changeCount = Object.keys(changes).length;
                                  return `(${changeCount} ${changeCount === 1 ? 'change' : 'changes'})`;
                                } catch {
                                  return null;
                                }
                              })()}
                            </span>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                          {formatDateTime(activity.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Prev
                      </button>
                      <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center">
                <FaHistory className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No activities found matching your search' : 'No activity logged yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
