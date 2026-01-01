'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RRule } from 'rrule';
import { format } from 'date-fns';
import { showToast } from '@/components/toast';
import SearchSortFilter, { SortOption, FilterOption } from '@/components/search-sort-filter';
import ConfirmationDialog from '@/components/confirmation-dialog';
import EventModalForm from '@/components/event-modal-form';
import SpecialModalForm from '@/components/special-modal-form';
import DrinkSpecialModalForm from '@/components/drink-special-modal-form';
import AnnouncementModalForm from '@/components/announcement-modal-form';
import StatusBadge from '@/components/status-badge';
import { getItemStatus } from '@/lib/status-helpers';
import DuplicateCalendarModal from '@/components/duplicate-calendar-modal';
import { FaCopy } from 'react-icons/fa';

interface Event {
  id: string;
  title: string;
  description: string | null;
  startDateTime: string;
  endDateTime: string | null;
  venueArea: string | null;
  recurrenceRule: string | null;
  exceptions?: string | null;
  isAllDay: boolean;
  tags: string[] | null;
  image: string | null;
  isActive: boolean;
  eventType: 'event';
}

interface Special {
  id: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  type: 'food' | 'drink';
  appliesOn: string | null;
  timeWindow: string | null;
  startDate: string | null;
  endDate: string | null;
  image: string | null;
  isActive: boolean;
  eventType: 'special';
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  publishAt: string | null;
  expiresAt: string | null;
  isPublished: boolean;
  eventType: 'announcement';
}

type ListItem = Event | Special | Announcement;

interface EventsListProps {
  initialEvents: Event[];
  initialSpecials?: Special[];
  initialAnnouncements?: Announcement[];
  showNewButtons?: boolean;
}

export default function EventsList({ 
  initialEvents, 
  initialSpecials = [],
  initialAnnouncements = [],
  showNewButtons = true 
}: EventsListProps) {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState(initialEvents);
  const [specials, setSpecials] = useState(initialSpecials);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [filteredItems, setFilteredItems] = useState<ListItem[]>([]);
  
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingSpecial, setEditingSpecial] = useState<Special | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [specialType, setSpecialType] = useState<'food' | 'drink'>('food');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string; type: 'event' | 'special' | 'announcement' } | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  useEffect(() => {
    setEvents(initialEvents);
    setSpecials(initialSpecials);
    setAnnouncements(initialAnnouncements);
  }, [initialEvents, initialSpecials, initialAnnouncements]);

  // Combine all items for unified list
  const allItems: ListItem[] = [...events, ...specials, ...announcements];

  useEffect(() => {
    // Initialize filteredItems with all items whenever items change
    setFilteredItems(allItems);
  }, [events, specials, announcements]);

  // Helper function to get date for sorting
  const getItemDate = (item: ListItem): Date => {
    if (item.eventType === 'event') {
      const event = item as Event;
      if (!event.recurrenceRule) {
        return new Date(event.startDateTime);
      }
      try {
        // Use Mountain Time for consistent date comparisons
        const now = new Date();
        const startDate = new Date(event.startDateTime);
        
        // Parse exceptions if they exist
        const exceptions: string[] = event.exceptions ? JSON.parse(event.exceptions) : [];
        
        // Get the next occurrence, checking exceptions
        const rule = RRule.fromString(event.recurrenceRule);
        const ruleOptions = {
          ...rule.options,
          dtstart: startDate,
        };
        const ruleWithDtstart = new RRule(ruleOptions);
        
        // Get next occurrence (use false to exclude current time - we want future occurrences)
        let nextOccurrence = ruleWithDtstart.after(now, false);
        let attempts = 0;
        while (nextOccurrence && attempts < 10) {
          const occurrenceDateStr = format(nextOccurrence, 'yyyy-MM-dd');
          if (!exceptions.includes(occurrenceDateStr)) {
            break;
          }
          nextOccurrence = ruleWithDtstart.after(nextOccurrence, false);
          attempts++;
        }
        
        // If no next occurrence found, return a far future date so it sorts at the end
        // This ensures recurring events without future occurrences don't get mixed with past events
        if (!nextOccurrence) {
          const farFuture = new Date();
          farFuture.setFullYear(farFuture.getFullYear() + 100);
          return farFuture;
        }
        
        return nextOccurrence;
      } catch (e) {
        return new Date(event.startDateTime);
      }
    } else if (item.eventType === 'special') {
      const special = item as Special;
      return special.startDate ? new Date(special.startDate) : new Date(0);
    } else {
      const announcement = item as Announcement;
      return announcement.publishAt ? new Date(announcement.publishAt) : new Date(0);
    }
  };

  // Helper to get status priority: Active (0), Scheduled (1), Past (2)
  const getStatusPriority = (item: ListItem): number => {
    const statuses = getItemStatus({
      isActive: item.eventType === 'event' ? (item as Event).isActive : 
                item.eventType === 'special' ? (item as Special).isActive : undefined,
      isPublished: item.eventType === 'announcement' ? (item as Announcement).isPublished : undefined,
      startDateTime: item.eventType === 'event' ? (item as Event).startDateTime : undefined,
      endDateTime: item.eventType === 'event' ? (item as Event).endDateTime : undefined,
      startDate: item.eventType === 'special' ? (item as Special).startDate : undefined,
      endDate: item.eventType === 'special' ? (item as Special).endDate : undefined,
      publishAt: item.eventType === 'announcement' ? (item as Announcement).publishAt : undefined,
      expiresAt: item.eventType === 'announcement' ? (item as Announcement).expiresAt : undefined,
    });
    
    // Check for statuses in priority order
    if (statuses.includes('active') || statuses.includes('published')) return 0; // Active/Published first
    if (statuses.includes('scheduled')) return 1; // Scheduled second
    if (statuses.includes('past')) return 2; // Past third
    return 3; // Everything else (inactive, draft, etc.)
  };

  const sortOptions: SortOption<ListItem>[] = [
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
        const aDate = getItemDate(a).getTime();
        const bDate = getItemDate(b).getTime();
        return aDate - bDate;
      }
    },
    { 
      label: 'Date (Newest First)', 
      value: 'date', 
      sortFn: (a, b) => {
        const aDate = getItemDate(a).getTime();
        const bDate = getItemDate(b).getTime();
        return bDate - aDate;
      }
    },
    { 
      label: 'Date (Oldest First)', 
      value: 'date-oldest', 
      sortFn: (a, b) => {
        const aDate = getItemDate(a).getTime();
        const bDate = getItemDate(b).getTime();
        return aDate - bDate;
      }
    },
    { label: 'Title (A-Z)', value: 'title' },
    { label: 'Title (Z-A)', value: 'title', sortFn: (a, b) => b.title.localeCompare(a.title) },
    { 
      label: 'Type', 
      value: 'type', 
      sortFn: (a, b) => {
        const typeOrder = { event: 1, special: 2, announcement: 3 };
        return typeOrder[a.eventType] - typeOrder[b.eventType];
      }
    },
  ];

  const filterOptions: FilterOption<ListItem>[] = [
    { label: 'Events Only', value: 'events', filterFn: (item) => item.eventType === 'event' },
    { label: 'Specials Only', value: 'specials', filterFn: (item) => item.eventType === 'special' },
    { label: 'Announcements Only', value: 'announcements', filterFn: (item) => item.eventType === 'announcement' },
    { label: 'Active Only', value: 'active', filterFn: (item) => {
      if (item.eventType === 'event' || item.eventType === 'special') {
        return (item as Event | Special).isActive;
      }
      return (item as Announcement).isPublished;
    }},
    { label: 'Inactive Only', value: 'inactive', filterFn: (item) => {
      if (item.eventType === 'event' || item.eventType === 'special') {
        return !(item as Event | Special).isActive;
      }
      return !(item as Announcement).isPublished;
    }},
  ];

  const handleItemClick = async (item: ListItem) => {
    if (item.eventType === 'event') {
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
            eventType: 'event',
          });
          setEventModalOpen(true);
        }
      } catch (error) {
        showToast('Failed to load event', 'error');
      }
    } else if (item.eventType === 'special') {
      const special = item as Special;
      setSpecialType(special.type);
      setEditingSpecial(special);
      setSpecialModalOpen(true);
    } else if (item.eventType === 'announcement') {
      try {
        const res = await fetch(`/api/announcements/${item.id}`);
        if (res.ok) {
          const announcementData = await res.json();
          setEditingAnnouncement({
            id: announcementData.id,
            title: announcementData.title,
            body: announcementData.body,
            publishAt: announcementData.publishAt,
            expiresAt: announcementData.expiresAt,
            isPublished: announcementData.isPublished,
            eventType: 'announcement',
          });
          setAnnouncementModalOpen(true);
        }
      } catch (error) {
        showToast('Failed to load announcement', 'error');
      }
    }
  };

  const handleDuplicate = async (item: ListItem) => {
    if (item.eventType === 'event') {
      try {
        const res = await fetch(`/api/events/${item.id}`);
        if (res.ok) {
          const eventData = await res.json();
          setEditingEvent({
            id: '', // No ID means it's a new event
            title: `${eventData.title} (Copy)`,
            description: eventData.description || '',
            startDateTime: eventData.startDateTime,
            endDateTime: eventData.endDateTime || '',
            venueArea: eventData.venueArea || 'bar',
            recurrenceRule: eventData.recurrenceRule || '',
            isAllDay: eventData.isAllDay || false,
            tags: eventData.tags ? JSON.parse(eventData.tags) : [],
            image: eventData.image || null,
            isActive: false, // Start as inactive so user can review before activating
            eventType: 'event',
          });
          setEventModalOpen(true);
        }
      } catch (error) {
        showToast('Failed to duplicate event', 'error');
      }
    } else if (item.eventType === 'special') {
      const special = item as Special;
      setSpecialType(special.type);
      setEditingSpecial({
        id: '', // No ID means it's a new special
        title: `${special.title} (Copy)`,
        description: special.description || null,
        priceNotes: special.priceNotes || null,
        type: special.type,
        appliesOn: special.appliesOn,
        timeWindow: special.timeWindow || null,
        startDate: special.startDate || null,
        endDate: special.endDate || null,
        image: special.image || null,
        isActive: false, // Start as inactive so user can review before activating
        eventType: 'special',
      });
      setSpecialModalOpen(true);
    } else {
      // Announcements don't support duplication
      showToast('Announcements cannot be duplicated', 'info');
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

  // Check for id query parameter to open modal
  useEffect(() => {
    const itemId = searchParams.get('id');
    if (itemId && !eventModalOpen && !specialModalOpen && !announcementModalOpen) {
      // Find the item in any of the lists
      const existingItem = allItems.find(item => item.id === itemId);
      if (existingItem) {
        handleItemClick(existingItem);
      }
      // Clean up URL by removing the query parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, eventModalOpen, specialModalOpen, announcementModalOpen]);

  const handleModalSuccess = () => {
    // No longer need to refresh - state is managed locally
  };

  function handleDelete(item: ListItem) {
    setDeleteConfirmation({ id: item.id, title: item.title, type: item.eventType });
  }

  async function confirmDelete() {
    if (!deleteConfirmation) return;

    try {
      let endpoint = '';
      if (deleteConfirmation.type === 'event') {
        endpoint = `/api/events/${deleteConfirmation.id}`;
      } else if (deleteConfirmation.type === 'special') {
        endpoint = `/api/specials/${deleteConfirmation.id}`;
      } else {
        endpoint = `/api/announcements/${deleteConfirmation.id}`;
      }

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        if (deleteConfirmation.type === 'event') {
          setEvents(events.filter((e) => e.id !== deleteConfirmation.id));
        } else if (deleteConfirmation.type === 'special') {
          setSpecials(specials.filter((s) => s.id !== deleteConfirmation.id));
        } else {
          setAnnouncements(announcements.filter((a) => a.id !== deleteConfirmation.id));
        }
        showToast(`${deleteConfirmation.type === 'event' ? 'Event' : deleteConfirmation.type === 'special' ? 'Special' : 'Announcement'} deleted successfully`, 'success');
      } else {
        const error = await res.json();
        showToast(`Failed to delete ${deleteConfirmation.type}`, 'error', error.error || error.details || 'Please try again.');
      }
    } catch (error) {
      showToast('Delete failed', 'error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setDeleteConfirmation(null);
    }
  }

  const formatDate = (item: ListItem) => {
    if (item.eventType === 'event') {
      const event = item as Event;
      return new Date(event.startDateTime).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (item.eventType === 'special') {
      const special = item as Special;
      if (special.startDate) {
        return new Date(special.startDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
      return 'No date set';
    } else {
      const announcement = item as Announcement;
      if (announcement.publishAt) {
        return new Date(announcement.publishAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
      }
      return 'Not scheduled';
    }
  };

  const isPast = (item: ListItem) => {
    // Get start of tomorrow (midnight) for comparison
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    if (item.eventType === 'event') {
      const event = item as Event;
      const endDate = event.endDateTime ? new Date(event.endDateTime) : new Date(event.startDateTime);
      // Only mark as past if end date is before tomorrow (i.e., today's events are not past)
      return endDate < tomorrow;
    } else if (item.eventType === 'special') {
      const special = item as Special;
      if (special.endDate) {
        // For specials, compare end date to start of tomorrow
        const endDate = new Date(special.endDate);
        endDate.setHours(23, 59, 59, 999); // End of the day
        return endDate < tomorrow;
      }
      return false;
    } else {
      const announcement = item as Announcement;
      if (announcement.expiresAt) {
        // For announcements, compare expiry to start of tomorrow
        return new Date(announcement.expiresAt) < tomorrow;
      }
      return false;
    }
  };

  const isRecurring = (item: ListItem) => {
    return item.eventType === 'event' && (item as Event).recurrenceRule && (item as Event).recurrenceRule!.trim().length > 0;
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
          items={allItems}
          onFilteredItemsChange={setFilteredItems}
          searchFields={['title', 'description', 'body', 'venueArea', 'priceNotes']}
          searchPlaceholder="Search events, specials, and announcements..."
          sortOptions={sortOptions}
          filterOptions={filterOptions}
          defaultSort={sortOptions[0]} // "Next" - Active → Scheduled → Past
          onSortChange={() => {
            // Reset any column sorting when user selects a sort option from dropdown
            // (Not applicable here since this list doesn't have column sorting)
          }}
        />

        {/* Unified List */}
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {allItems.length === 0 
                ? 'No items yet. Create your first event, special, or announcement!'
                : 'No items match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => {
              const itemType = item.eventType === 'event' ? 'Event' : item.eventType === 'special' ? (item as Special).type === 'food' ? 'Food Special' : 'Drink Special' : 'Announcement';
              const typeColor = item.eventType === 'event' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600'
                : item.eventType === 'special'
                ? (item as Special).type === 'food'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600'
                  : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-600'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600';

              return (
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
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize flex-shrink-0 ${typeColor} border`}>
                        {itemType}
                      </span>
                    </div>
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
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
                    {((item.eventType === 'event' && (item as Event).description) || 
                      (item.eventType === 'special' && (item as Special).description) ||
                      (item.eventType === 'announcement' && (item as Announcement).body)) && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">
                        {item.eventType === 'announcement' 
                          ? (item as Announcement).body 
                          : (item.eventType === 'event' 
                            ? (item as Event).description 
                            : (item as Special).description)}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <p className="truncate">Date: {formatDate(item)}</p>
                      {item.eventType === 'event' && (item as Event).venueArea && (
                        <p className="truncate">
                          Venue: <span className="capitalize">{(item as Event).venueArea === 'bar' ? 'Bar Area' : (item as Event).venueArea === 'stage' ? 'Stage Area' : (item as Event).venueArea}</span>
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
                  
                  {/* Action buttons - always visible */}
                  <div className="flex-shrink-0 z-20 relative flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {item.eventType !== 'announcement' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(item);
                        }}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
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
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={`Delete ${itemType.toLowerCase()}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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
        title={`Delete ${deleteConfirmation?.type === 'event' ? 'Event' : deleteConfirmation?.type === 'special' ? 'Special' : 'Announcement'}`}
        message={`Are you sure you want to delete "${deleteConfirmation?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Event Modal */}
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
            eventType: 'event',
          }]);
        }}
        onEventUpdated={(updatedEvent) => {
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
          setEvents(prev => prev.filter(e => e.id !== eventId));
        }}
      />

      {/* Special Modal */}
      {specialType === 'drink' ? (
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
          onDelete={(specialId) => {
            setSpecials(prev => prev.filter(s => s.id !== specialId));
          }}
        />
      ) : (
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
            type: editingSpecial.type,
            appliesOn: editingSpecial.appliesOn ? JSON.parse(editingSpecial.appliesOn) : [],
            timeWindow: editingSpecial.timeWindow || '',
            startDate: editingSpecial.startDate || '',
            endDate: editingSpecial.endDate || '',
            isActive: editingSpecial.isActive,
          } : undefined}
          defaultType={specialType}
          onSuccess={handleModalSuccess}
          onDelete={(specialId) => {
            setSpecials(prev => prev.filter(s => s.id !== specialId));
          }}
        />
      )}

      {/* Announcement Modal */}
      <AnnouncementModalForm
        isOpen={announcementModalOpen}
        onClose={() => {
          setAnnouncementModalOpen(false);
          setEditingAnnouncement(null);
        }}
        announcement={editingAnnouncement ? {
          id: editingAnnouncement.id,
          title: editingAnnouncement.title,
          body: editingAnnouncement.body,
          publishAt: editingAnnouncement.publishAt,
          expiresAt: editingAnnouncement.expiresAt,
          isPublished: editingAnnouncement.isPublished,
          crossPostFacebook: false,
          crossPostInstagram: false,
        } : undefined}
        onSuccess={handleModalSuccess}
        onDelete={(announcementId) => {
          setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
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
