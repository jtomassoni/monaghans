'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RRule } from 'rrule';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import ConfirmationDialog from '@/components/confirmation-dialog';
import EventModalForm from '@/components/event-modal-form';
import StatusBadge from '@/components/status-badge';
import { getItemStatus } from '@/lib/status-helpers';
import DuplicateCalendarModal from '@/components/duplicate-calendar-modal';

interface Event {
  id: string;
  title: string;
  description: string | null;
  startDateTime: string;
  endDateTime: string | null;
  venueArea: string | null;
  recurrenceRule: string | null;
  isAllDay: boolean;
  tags: string[] | null;
  image: string | null;
  isActive: boolean;
}

interface EventsListProps {
  initialEvents: Event[];
  showNewButtons?: boolean;
}

export default function EventsList({ 
  initialEvents, 
  showNewButtons = true 
}: EventsListProps) {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState(initialEvents);
  const [filteredItems, setFilteredItems] = useState<Event[]>([]);
  
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  useEffect(() => {
    setEvents(initialEvents);
    // Initialize filteredItems with all events
    setFilteredItems(initialEvents);
  }, [initialEvents]);

  // Helper function to get the next occurrence date for sorting
  const getNextOccurrenceDate = (event: Event): Date => {
    if (!event.recurrenceRule) {
      return new Date(event.startDateTime);
    }
    
    try {
      const now = new Date();
      const startDate = new Date(event.startDateTime);
      
      // For recurring events, find the next occurrence from now
      const rule = RRule.fromString(event.recurrenceRule);
      const ruleOptions = {
        ...rule.options,
        dtstart: startDate,
      };
      const ruleWithDtstart = new RRule(ruleOptions);
      
      // Get the next occurrence after now
      const nextOccurrence = ruleWithDtstart.after(now, true);
      return nextOccurrence || startDate; // Fallback to start date if no next occurrence
    } catch (e) {
      // If RRule parsing fails, return start date
      return new Date(event.startDateTime);
    }
  };

  const sortOptions: SortOption<Event>[] = [
    { 
      label: 'Date (Newest First)', 
      value: 'date', 
      sortFn: (a, b) => {
        const aDate = getNextOccurrenceDate(a).getTime();
        const bDate = getNextOccurrenceDate(b).getTime();
        return bDate - aDate;
      }
    },
    { 
      label: 'Date (Oldest First)', 
      value: 'date', 
      sortFn: (a, b) => {
        const aDate = getNextOccurrenceDate(a).getTime();
        const bDate = getNextOccurrenceDate(b).getTime();
        return aDate - bDate;
      }
    },
    { label: 'Title (A-Z)', value: 'title' },
    { label: 'Title (Z-A)', value: 'title', sortFn: (a, b) => b.title.localeCompare(a.title) },
  ];

  const filterOptions: FilterOption<Event>[] = [
    { label: 'Active Only', value: 'active', filterFn: (item) => item.isActive },
    { label: 'Inactive Only', value: 'inactive', filterFn: (item) => !item.isActive },
  ];

  const handleItemClick = async (item: Event) => {
    try {
      const res = await fetch(`/api/events/${item.id}`);
      if (res.ok) {
        const eventData = await res.json();
        setEditingEvent({
          id: eventData.id,
          title: eventData.title,
          description: eventData.description || '',
          startDateTime: eventData.startDateTime,
          endDateTime: eventData.endDateTime || '',
          venueArea: eventData.venueArea || 'bar',
          recurrenceRule: eventData.recurrenceRule || '',
          isAllDay: eventData.isAllDay || false,
          tags: eventData.tags ? JSON.parse(eventData.tags) : [],
          image: eventData.image || null,
          isActive: eventData.isActive,
        });
        setEventModalOpen(true);
      }
    } catch (error) {
      showToast('Failed to load event', 'error');
    }
  };

  const handleNewItem = () => {
    setEditingEvent(null);
    setEventModalOpen(true);
  };

  // Listen for custom event to open new event modal
  useEffect(() => {
    const handleOpenNewEvent = () => {
      setEditingEvent(null);
      setEventModalOpen(true);
    };
    window.addEventListener('openNewEvent', handleOpenNewEvent);
    return () => window.removeEventListener('openNewEvent', handleOpenNewEvent);
  }, []);

  // Listen for custom event to open duplicate calendar modal
  useEffect(() => {
    const handleOpenDuplicateCalendar = () => {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      const hasEvents = events.some((event) => {
        const eventDate = new Date(event.startDateTime);
        return eventDate >= oneYearFromNow;
      });
      if (hasEvents) {
        setDuplicateModalOpen(true);
      }
    };
    window.addEventListener('openDuplicateCalendar', handleOpenDuplicateCalendar);
    return () => window.removeEventListener('openDuplicateCalendar', handleOpenDuplicateCalendar);
  }, [events]);

  // Check for newEvent=true query parameter to open new event modal
  useEffect(() => {
    const shouldOpenNew = searchParams.get('newEvent');
    if (shouldOpenNew === 'true') {
      setEditingEvent(null);
      setEventModalOpen(true);
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('newEvent');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Check for id query parameter to open event modal
  useEffect(() => {
    const eventId = searchParams.get('id');
    if (eventId && !eventModalOpen) {
      // Find the event in the list or fetch it
      const existingEvent = events.find(e => e.id === eventId);
      if (existingEvent) {
        handleItemClick(existingEvent);
      } else {
        // If not found in list, fetch it
        handleItemClick({ id: eventId } as Event);
      }
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, eventModalOpen]);

  const handleModalSuccess = () => {
    // No longer need to refresh - state is managed locally
  };

  function handleDelete(item: Event) {
    setDeleteConfirmation({ id: item.id, title: item.title });
  }

  async function confirmDelete() {
    if (!deleteConfirmation) return;

    try {
      const res = await fetch(`/api/events/${deleteConfirmation.id}`, { method: 'DELETE' });
      if (res.ok) {
        const updatedEvents = events.filter((e) => e.id !== deleteConfirmation.id);
        setEvents(updatedEvents);
        showToast('Event deleted successfully', 'success');
      } else {
        const error = await res.json();
        showToast('Failed to delete event', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setDeleteConfirmation(null);
    }
  }

  async function handleToggleActive(item: Event) {
    try {
      const res = await fetch(`/api/events/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: !item.isActive }),
      });

      if (res.ok) {
        setEvents(events.map((e) => (e.id === item.id ? { ...e, isActive: !item.isActive } : e)));
        showToast(
          `Event ${!item.isActive ? 'activated' : 'deactivated'} successfully`,
          'success'
        );
      } else {
        const error = await res.json();
        showToast('Failed to update event', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Update failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    }
  }

  const formatDate = (item: Event) => {
    return new Date(item.startDateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isPast = (item: Event) => {
    const endDate = item.endDateTime ? new Date(item.endDateTime) : new Date(item.startDateTime);
    return endDate < new Date();
  };

  const isRecurring = (item: Event) => {
    return item.recurrenceRule && item.recurrenceRule.trim().length > 0;
  };

  // Check if there are any events scheduled at least one year from now
  const hasEventsOneYearFromNow = () => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return events.some((event) => {
      const eventDate = new Date(event.startDateTime);
      return eventDate >= oneYearFromNow;
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Search, Sort, Filter - Always visible */}
        <SearchSortFilter
          items={events}
          onFilteredItemsChange={setFilteredItems}
          searchFields={['title', 'description', 'venueArea']}
          searchPlaceholder="Search events..."
          sortOptions={sortOptions}
          filterOptions={filterOptions}
          defaultSort={sortOptions[0]}
        />

        {/* Events List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {events.length === 0 
                ? 'No events yet. Create your first one!'
                : 'No events match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`group/item relative bg-white dark:bg-gray-800 rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 p-4 flex justify-between items-start gap-4 cursor-pointer ${
                  isPast(item)
                    ? 'border-gray-200 dark:border-gray-700 opacity-75'
                    : 'border-gray-200 dark:border-gray-700'
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
                      Event
                    </span>
                    {isRecurring(item) && (
                      <span className="px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Recurring
                      </span>
                    )}
                    {getItemStatus(item).map((status) => (
                      <StatusBadge key={status} status={status} />
                    ))}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">{item.description}</p>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                    <p className="truncate">Date: {formatDate(item)}</p>
                    {item.venueArea && (
                      <p className="truncate">
                        Venue: <span className="capitalize">{item.venueArea === 'bar' ? 'Bar Area' : item.venueArea === 'stage' ? 'Stage Area' : item.venueArea}</span>
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
                    className="pointer-events-auto px-4 py-2 text-sm bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 z-10 border border-blue-400 dark:border-blue-500 cursor-pointer"
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
                    className="px-3 py-1.5 text-xs bg-red-500/90 dark:bg-red-600/90 hover:bg-red-600 dark:hover:bg-red-700 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 border border-red-400 dark:border-red-500 cursor-pointer"
                    title="Delete event"
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
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteConfirmation?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Modal */}
      <EventModalForm
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setEditingEvent(null);
        }}
        event={editingEvent ? {
          id: editingEvent.id,
          title: editingEvent.title,
          description: editingEvent.description || '',
          startDateTime: editingEvent.startDateTime,
          endDateTime: editingEvent.endDateTime || '',
          recurrenceRule: editingEvent.recurrenceRule || '',
          isAllDay: editingEvent.isAllDay,
          tags: editingEvent.tags || [],
          isActive: editingEvent.isActive,
        } : undefined}
        onSuccess={handleModalSuccess}
        onEventAdded={(newEvent) => {
          // Add new event to local state
          setEvents(prev => [...prev, {
            id: newEvent.id,
            title: newEvent.title,
            description: newEvent.description || null,
            startDateTime: newEvent.startDateTime,
            endDateTime: newEvent.endDateTime || null,
            venueArea: newEvent.venueArea || null,
            recurrenceRule: newEvent.recurrenceRule || null,
            isAllDay: newEvent.isAllDay,
            tags: newEvent.tags ? (typeof newEvent.tags === 'string' ? JSON.parse(newEvent.tags) : newEvent.tags) : null,
            image: newEvent.image || null,
            isActive: newEvent.isActive,
          }]);
        }}
        onEventUpdated={(updatedEvent) => {
          // Update event in local state
          setEvents(prev => prev.map(e => 
            e.id === updatedEvent.id ? {
              ...e,
              title: updatedEvent.title,
              description: updatedEvent.description || null,
              startDateTime: updatedEvent.startDateTime,
              endDateTime: updatedEvent.endDateTime || null,
              venueArea: updatedEvent.venueArea || null,
              recurrenceRule: updatedEvent.recurrenceRule || null,
              isAllDay: updatedEvent.isAllDay,
              tags: updatedEvent.tags ? (typeof updatedEvent.tags === 'string' ? JSON.parse(updatedEvent.tags) : updatedEvent.tags) : null,
              image: updatedEvent.image || null,
              isActive: updatedEvent.isActive,
            } : e
          ));
        }}
        onDelete={(eventId) => {
          // Remove event from local state
          setEvents(prev => prev.filter(e => e.id !== eventId));
        }}
      />

      {/* Duplicate Calendar Modal */}
      {showNewButtons && (
        <DuplicateCalendarModal
          isOpen={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          events={events}
          onSuccess={() => {
            // Refresh events list after duplication
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
