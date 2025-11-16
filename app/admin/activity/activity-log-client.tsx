'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaHistory, FaEdit, FaTrash, FaPlus, FaSearch, FaSortUp, FaSortDown, FaSignInAlt, FaClock } from 'react-icons/fa';

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
    const iconClass = "w-4 h-4 flex-shrink-0";
    switch (action) {
      case 'create':
        return <FaPlus className={`${iconClass} text-green-600 dark:text-green-400`} />;
      case 'update':
        return <FaEdit className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
      case 'delete':
        return <FaTrash className={`${iconClass} text-red-600 dark:text-red-400`} />;
      case 'login':
        return <FaSignInAlt className={`${iconClass} text-purple-600 dark:text-purple-400`} />;
      case 'clockIn':
      case 'clockOut':
        return <FaClock className={`${iconClass} text-teal-600 dark:text-teal-400`} />;
      default:
        return <FaEdit className={`${iconClass} text-gray-600 dark:text-gray-400`} />;
    }
  };

  const getActionIconBg = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'update':
        return 'bg-blue-100 dark:bg-blue-900/30';
      case 'delete':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'login':
        return 'bg-purple-100 dark:bg-purple-900/30';
      case 'clockIn':
      case 'clockOut':
        return 'bg-teal-100 dark:bg-teal-900/30';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getActionBorderColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'border-l-green-500 dark:border-l-green-400';
      case 'update':
        return 'border-l-blue-500 dark:border-l-blue-400';
      case 'delete':
        return 'border-l-red-500 dark:border-l-red-400';
      case 'login':
        return 'border-l-purple-500 dark:border-l-purple-400';
      case 'clockIn':
      case 'clockOut':
        return 'border-l-teal-500 dark:border-l-teal-400';
      default:
        return 'border-l-gray-400 dark:border-l-gray-600';
    }
  };


  const getEntityTypeLabel = (entityType: string) => {
    return entityType
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  const formatActivityMessage = (activity: Activity) => {
    const userName = activity.user 
      ? (activity.user.name || activity.user.email) 
      : '(deleted user)';
    
    const entityTypeLabel = getEntityTypeLabel(activity.entityType);
    
    // Special handling for login actions
    if (activity.action === 'login') {
      return (
        <>
          <span className="font-semibold text-gray-900 dark:text-white">{userName}</span>
          <span className="text-gray-600 dark:text-gray-400"> logged in</span>
        </>
      );
    }
    
    // Special handling for clock in/out actions
    if (activity.action === 'clockIn' || activity.action === 'clockOut') {
      const actionText = activity.action === 'clockIn' ? 'clocked in' : 'clocked out';
      return (
        <>
          <span className="font-semibold text-gray-900 dark:text-white">{userName}</span>
          <span className="text-gray-600 dark:text-gray-400"> {actionText}</span>
        </>
      );
    }
    
    // For other actions, create a natural sentence
    const actionVerb = activity.action === 'create' ? 'created' 
      : activity.action === 'update' ? 'updated' 
      : activity.action === 'delete' ? 'deleted'
      : activity.action;
    
    if (activity.entityName) {
      return (
        <>
          <span className="font-semibold text-gray-900 dark:text-white">{userName}</span>
          <span className="text-gray-600 dark:text-gray-400"> {actionVerb} </span>
          <span className="font-medium text-gray-900 dark:text-white">{entityTypeLabel}</span>
          <span className="text-gray-600 dark:text-gray-400"> </span>
          <span className="font-medium text-gray-900 dark:text-white">&quot;{activity.entityName}&quot;</span>
        </>
      );
    }
    
    return (
      <>
        <span className="font-semibold text-gray-900 dark:text-white">{userName}</span>
        <span className="text-gray-600 dark:text-gray-400"> {actionVerb} </span>
        <span className="font-medium text-gray-900 dark:text-white">{entityTypeLabel}</span>
      </>
    );
  };

  // Extract useful additional info from description (like role, status, etc.)
  const extractAdditionalInfo = (activity: Activity): string | null => {
    if (!activity.description || activity.action === 'login') return null;
    
    const desc = activity.description.toLowerCase();
    
    // Extract hours worked from clock out descriptions
    if (activity.action === 'clockOut') {
      const hoursMatch = activity.description.match(/worked\s+([\d.]+)\s+hours?/i);
      if (hoursMatch) {
        return `Worked ${hoursMatch[1]} hours`;
      }
      // If no hours match, return null to avoid showing redundant info
      return null;
    }
    
    // Extract role information if present
    const roleMatch = activity.description.match(/role\s+["']?([^"']+)["']?/i);
    if (roleMatch) {
      return `Role: ${roleMatch[1]}`;
    }
    
    // Extract status information if present
    const statusMatch = activity.description.match(/status\s+["']?([^"']+)["']?/i);
    if (statusMatch) {
      return `Status: ${statusMatch[1]}`;
    }
    
    // If description contains useful keywords, show it
    if (desc.includes('role') || desc.includes('status') || desc.includes('changed') || desc.includes('from') || desc.includes('to')) {
      // Check if it's not just repeating the main message
      const entityName = activity.entityName?.toLowerCase() || '';
      const entityType = getEntityTypeLabel(activity.entityType).toLowerCase();
      
      // If description is mostly just repeating entity name/type, it's redundant
      if (desc.includes(entityName) && desc.includes(entityType) && desc.split(' ').length < 10) {
        // Likely redundant, but extract key info if possible
        return null;
      }
      
      return activity.description;
    }
    
    return null;
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
      <div className="flex-shrink-0 px-6 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FaHistory className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Activity Log
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
                All actions taken in the CMS
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex-shrink-0 px-6 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm relative z-10">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-3.5 h-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm transition-all duration-200 text-sm"
            />
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm transition-all duration-200 text-sm font-medium"
            title={`Sort by date ${sortOrder === 'desc' ? '(Newest first)' : '(Oldest first)'}`}
          >
            {sortOrder === 'desc' ? (
              <FaSortDown className="w-3.5 h-3.5" />
            ) : (
              <FaSortUp className="w-3.5 h-3.5" />
            )}
            <span>Date {sortOrder === 'desc' ? '↓' : '↑'}</span>
          </button>
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-semibold">
            {total} {total === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 relative z-10">
        <div className="max-w-7xl mx-auto space-y-2">
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading...</p>
            </div>
          ) : activities.length > 0 ? (
            <>
              {activities.map((activity) => {
                const additionalInfo = extractAdditionalInfo(activity);
                return (
                  <div
                    key={activity.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl border-l-4 ${getActionBorderColor(activity.action)} border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 group`}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Icon with background */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${getActionIconBg(activity.action)} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                          {getActionIcon(activity.action)}
                        </div>
                        
                        {/* Content - Main row */}
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 flex items-center gap-2.5 flex-wrap">
                            <div className="text-sm text-gray-900 dark:text-white leading-relaxed">
                              {formatActivityMessage(activity)}
                            </div>
                            {!activity.user && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 whitespace-nowrap">
                                deleted user
                              </span>
                            )}
                            {activity.user && activity.user.isActive === false && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 whitespace-nowrap">
                                inactive
                              </span>
                            )}
                          </div>
                          
                          {/* Timestamp */}
                          <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium">
                            {formatDateTime(activity.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional details row - only show if it adds useful information */}
                      {(additionalInfo || activity.changes) && activity.action !== 'login' && (
                        <div className="ml-14 mt-2 space-y-1">
                          {additionalInfo && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                              {additionalInfo}
                            </div>
                          )}
                          {activity.changes && (
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              {(() => {
                                try {
                                  const changes = JSON.parse(activity.changes);
                                  const changeCount = Object.keys(changes).length;
                                  return (
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                                      {changeCount} {changeCount === 1 ? 'field changed' : 'fields changed'}
                                    </span>
                                  );
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-12 text-center">
              <FaHistory className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No activities found matching your search' : 'No activity logged yet'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Showing <span className="font-semibold text-gray-900 dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-gray-900 dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, total)}</span> of <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 px-3 py-1.5 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
