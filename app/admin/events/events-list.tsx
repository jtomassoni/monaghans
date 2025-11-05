'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';

interface Event {
  id: string;
  title: string;
  description: string | null;
  startDateTime: string;
  endDateTime: string | null;
  venueArea: string;
  isActive: boolean;
}

export default function AdminEventsList({ initialEvents }: { initialEvents: Event[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [filteredEvents, setFilteredEvents] = useState(initialEvents);
  const [showAll, setShowAll] = useState(false);
  const itemsToShow = 3;

  useEffect(() => {
    setEvents(initialEvents);
    setFilteredEvents(initialEvents);
  }, [initialEvents]);

  const sortOptions: SortOption<Event>[] = [
    { label: 'Date (Newest First)', value: 'startDateTime', sortFn: (a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime() },
    { label: 'Date (Oldest First)', value: 'startDateTime', sortFn: (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime() },
    { label: 'Title (A-Z)', value: 'title' },
    { label: 'Title (Z-A)', value: 'title', sortFn: (a, b) => b.title.localeCompare(a.title) },
    { label: 'Venue', value: 'venueArea' },
  ];

  const filterOptions: FilterOption<Event>[] = [
    { label: 'Active Only', value: 'active', filterFn: (e) => e.isActive },
    { label: 'Inactive Only', value: 'inactive', filterFn: (e) => !e.isActive },
    { label: 'Bar Area', value: 'bar', filterFn: (e) => e.venueArea === 'bar' },
    { label: 'Stage Area', value: 'stage', filterFn: (e) => e.venueArea === 'stage' },
  ];

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = events.filter((e) => e.id !== id);
        setEvents(updated);
        showToast('Event deleted successfully', 'success');
      } else {
        const error = await res.json();
        showToast('Failed to delete event', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred while deleting the event.');
    }
  }

  async function handleToggleActive(id: string, currentStatus: boolean, title: string) {
    try {
      const event = events.find((e) => e.id === id);
      if (!event) return;

      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, isActive: !currentStatus }),
      });

      if (res.ok) {
        const updated = events.map((e) => (e.id === id ? { ...e, isActive: !currentStatus } : e));
        setEvents(updated);
        showToast(
          `Event ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
          'success',
          `"${title}" is now ${!currentStatus ? 'active' : 'inactive'}.`
        );
      } else {
        const error = await res.json();
        showToast('Failed to update event', 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Update failed', 'error', error instanceof Error ? error.message : 'An error occurred while updating the event.');
    }
  }

  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, itemsToShow);

  return (
    <div className="space-y-4">
      <SearchSortFilter
        items={events}
        onFilteredItemsChange={setFilteredEvents}
        searchFields={['title', 'description', 'venueArea']}
        searchPlaceholder="Search events by title, description, or venue..."
        sortOptions={sortOptions}
        filterOptions={filterOptions}
        defaultSort={sortOptions[0]}
      />

      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            {events.length === 0 
              ? 'No events yet. Create your first one!'
              : 'No events match your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {displayedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-4 flex justify-between items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${
                        event.isActive 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {event.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-1">{event.description}</p>
                  )}
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p className="truncate">
                      {new Date(event.startDateTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    {event.venueArea && (
                      <p className="truncate">
                        Venue: <span className="capitalize">{event.venueArea === 'bar' ? 'Bar Area' : event.venueArea === 'stage' ? 'Stage Area' : event.venueArea}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(event.id, event.isActive, event.title)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                      event.isActive
                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-sm shadow-green-500/20'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                    }`}
                    title={event.isActive ? 'Click to deactivate this event' : 'Click to activate this event'}
                  >
                    {event.isActive ? '✓ Active' : '○ Inactive'}
                  </button>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 shadow-sm shadow-blue-500/20"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id, event.title)}
                    className="px-3 py-1.5 text-xs bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 shadow-sm shadow-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filteredEvents.length > itemsToShow && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 hover:text-blue-700 w-full py-3 cursor-pointer transition-colors font-medium"
            >
              {showAll ? 'Show Less' : `Show All (${filteredEvents.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

