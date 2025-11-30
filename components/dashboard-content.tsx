'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CalendarView from '@/components/admin-calendar';
import EventModalForm from '@/components/event-modal-form';
import SpecialModalForm from '@/components/special-modal-form';
import DrinkSpecialModalForm from '@/components/drink-special-modal-form';
import EventsList from '@/app/admin/specials-events-list';
import { FaCalendarAlt, FaList } from 'react-icons/fa';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDateTime: string;
  endDateTime: string | null;
  venueArea: string;
  recurrenceRule: string | null;
  exceptions: string | null;
  isAllDay: boolean;
  tags: string[] | null;
  image: string | null;
  isActive: boolean;
  eventType: 'event';
}

interface Event {
  id?: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  venueArea: string;
  recurrenceRule: string;
  isAllDay: boolean;
  tags: string[];
  image?: string;
  isActive: boolean;
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

interface CalendarAnnouncement {
  id: string;
  title: string;
  body: string;
  publishAt: string | null;
  expiresAt: string | null;
  isPublished: boolean;
  eventType: 'announcement';
}

interface DashboardContentProps {
  events: CalendarEvent[];
  specials: Special[];
  announcements?: CalendarAnnouncement[];
  isSuperadmin: boolean;
}

type ViewType = 'calendar' | 'list';

export default function DashboardContent({ events: initialEvents, specials, announcements = [], isSuperadmin }: DashboardContentProps) {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventOccurrenceDate, setEventOccurrenceDate] = useState<Date | undefined>(undefined);
  const [editingSpecial, setEditingSpecial] = useState<Special | null>(null);
  const [specialType, setSpecialType] = useState<'food' | 'drink'>('food');
  const [viewType, setViewType] = useState<ViewType>('calendar');
  
  // Track the last initialEvents IDs to prevent unnecessary updates
  const lastInitialEventsIdsRef = useRef<string>(JSON.stringify(initialEvents.map(e => e.id).sort()));

  // Update events when initialEvents changes (e.g., from server)
  // Only update if the actual IDs have changed, not just the array reference
  useEffect(() => {
    const currentInitialIds = JSON.stringify(initialEvents.map(e => e.id).sort());
    
    // Only update if the IDs are different (meaning actual data changed)
    if (currentInitialIds !== lastInitialEventsIdsRef.current) {
      lastInitialEventsIdsRef.current = currentInitialIds;
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  const handleEventClick = async (eventId: string, occurrenceDate?: Date) => {
    try {
      // Fetch full event data from API to ensure consistency
      const res = await fetch(`/api/events/${eventId}`);
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
          tags: eventData.tags ? (typeof eventData.tags === 'string' ? JSON.parse(eventData.tags) : eventData.tags) : [],
          image: eventData.image || undefined,
          isActive: eventData.isActive,
        });
        setEventOccurrenceDate(occurrenceDate);
        setEventModalOpen(true);
      } else {
        console.error('Failed to fetch event data');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      // Fallback to local event data if API fails
      const event = events.find((e) => e.id === eventId);
      if (event) {
        setEditingEvent({
          id: event.id,
          title: event.title,
          description: event.description || '',
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime || '',
          venueArea: event.venueArea,
          recurrenceRule: event.recurrenceRule || '',
          isAllDay: event.isAllDay,
          tags: event.tags || [],
          image: event.image || undefined,
          isActive: event.isActive,
        });
        setEventOccurrenceDate(occurrenceDate);
        setEventModalOpen(true);
      }
    }
  };

  const handleSpecialClick = async (specialId: string) => {
    const special = specials.find((s) => s.id === specialId);
    if (special) {
      const appliesOn = special.appliesOn ? JSON.parse(special.appliesOn) : [];
      setEditingSpecial({
        ...special,
        appliesOn: Array.isArray(appliesOn) ? appliesOn : [],
      } as any);
      setSpecialType(special.type); // Set the type so we know which modal to show
      setSpecialModalOpen(true);
    }
  };

  // Helper function to format date for datetime-local input (local time, not UTC)
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleNewEvent = (date?: Date, isAllDay?: boolean) => {
    const eventDate = date || new Date();
    const startDateTime = new Date(eventDate);
    
    if (isAllDay) {
      // For all-day events, set to start of day
      startDateTime.setHours(0, 0, 0, 0);
    } else {
      // Only set to 12pm if no specific time was provided (i.e., date has no time component set)
      if (!date || date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0) {
        startDateTime.setHours(12, 0, 0, 0);
      }
    }
    
    // Set endDateTime to 3 hours after startDateTime (or end of day for all-day events)
    const endDateTime = new Date(startDateTime);
    if (isAllDay) {
      endDateTime.setHours(23, 59, 59, 999);
    } else {
      endDateTime.setHours(endDateTime.getHours() + 3);
    }
    
    // Clear any previous event state and set up new event
    setEditingEvent({
      id: undefined, // Explicitly set to undefined to ensure it's a new event
      title: '',
      description: '',
      startDateTime: formatDateTimeLocal(startDateTime),
      endDateTime: formatDateTimeLocal(endDateTime),
      venueArea: 'bar',
      recurrenceRule: '',
      isAllDay: isAllDay || false,
      tags: [],
      image: undefined,
      isActive: true,
    });
    setEventOccurrenceDate(undefined); // Clear occurrence date for new events
    setEventModalOpen(true);
  };

  const handleNewSpecial = (type: 'food' | 'drink') => {
    setSpecialType(type);
    setEditingSpecial(null);
    setSpecialModalOpen(true);
  };

  const handleEventAdded = (newEvent: any) => {
    // Add new event to local state
    setEvents(prev => [...prev, {
      id: newEvent.id,
      title: newEvent.title,
      description: newEvent.description,
      startDateTime: newEvent.startDateTime,
      endDateTime: newEvent.endDateTime,
      venueArea: newEvent.venueArea || 'bar',
      recurrenceRule: newEvent.recurrenceRule,
      exceptions: newEvent.exceptions || null,
      isAllDay: newEvent.isAllDay,
      tags: newEvent.tags ? (typeof newEvent.tags === 'string' ? JSON.parse(newEvent.tags) : newEvent.tags) : null,
      image: newEvent.image || null,
      isActive: newEvent.isActive,
      eventType: 'event' as const,
    } as CalendarEvent]);
  };

  const handleEventUpdated = (updatedEvent: any) => {
    // Update event in local state
    setEvents(prev => prev.map(e => 
      e.id === updatedEvent.id ? {
        ...e,
        title: updatedEvent.title,
        description: updatedEvent.description,
        startDateTime: updatedEvent.startDateTime,
        endDateTime: updatedEvent.endDateTime,
        venueArea: updatedEvent.venueArea || 'bar',
        recurrenceRule: updatedEvent.recurrenceRule,
        exceptions: updatedEvent.exceptions || null,
        isAllDay: updatedEvent.isAllDay,
        tags: updatedEvent.tags ? (typeof updatedEvent.tags === 'string' ? JSON.parse(updatedEvent.tags) : updatedEvent.tags) : null,
        image: updatedEvent.image || null,
        isActive: updatedEvent.isActive,
      } : e
    ));
  };

  const handleModalSuccess = () => {
    // Refresh from server to get latest data
    router.refresh();
  };

  const handleEventDeleted = (eventId: string) => {
    // Remove event from local state
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleExceptionAdded = (eventId: string, updatedEvent: any) => {
    // Update event with new exceptions list
    setEvents(prev => prev.map(e => 
      e.id === eventId ? {
        ...e,
        exceptions: updatedEvent.exceptions || null,
      } : e
    ));
  };

  const handleSpecialDeleted = (specialId: string) => {
    // Refresh from server since we don't maintain local specials state
    router.refresh();
  };

  return (
    <>
      <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
          <div className="flex justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Calendar & Events
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
                Manage events, specials, and scheduled content
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* New Event Button */}
              <button
                onClick={() => handleNewEvent()}
                className="px-4 py-2.5 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-blue-400 dark:border-blue-500 touch-manipulation"
              >
                <span>➕</span>
                <span>New Event</span>
              </button>
              {/* View Type Toggle - Calendar/List */}
              <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                  onClick={() => setViewType('calendar')}
                  className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 ${
                    viewType === 'calendar'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <FaCalendarAlt className="w-3.5 h-3.5 pointer-events-none" />
                  <span className="pointer-events-none">Calendar</span>
                </button>
                <button
                  onClick={() => setViewType('list')}
                  className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 ${
                    viewType === 'list'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <FaList className="w-3.5 h-3.5 pointer-events-none" />
                  <span className="pointer-events-none">List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative z-10">
          {viewType === 'calendar' ? (
            /* Calendar View */
            <div className="flex-1 overflow-hidden p-3 sm:p-6 pb-3 sm:pb-6 min-h-0 flex flex-col">
              <CalendarView
                events={events}
                specials={specials}
                announcements={announcements}
                onEventClick={handleEventClick}
                onSpecialClick={handleSpecialClick}
                onNewEvent={handleNewEvent}
                onEventUpdate={handleModalSuccess}
                onEventAdded={handleEventAdded}
                onEventDeleted={handleEventDeleted}
              />
            </div>
          ) : (
            /* List View */
            <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
              <div className="max-w-6xl mx-auto">
                <EventsList 
                  initialEvents={events.map(e => ({
                    id: e.id,
                    title: e.title,
                    description: e.description,
                    startDateTime: e.startDateTime,
                    endDateTime: e.endDateTime,
                    venueArea: e.venueArea,
                    recurrenceRule: e.recurrenceRule,
                    isAllDay: e.isAllDay,
                    tags: e.tags,
                    image: e.image,
                    isActive: e.isActive,
                  }))}
                  showNewButtons={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <EventModalForm
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setEditingEvent(null);
          setEventOccurrenceDate(undefined);
        }}
        event={editingEvent || undefined}
        occurrenceDate={eventOccurrenceDate}
        onSuccess={handleModalSuccess}
        onEventAdded={handleEventAdded}
        onEventUpdated={handleEventUpdated}
        onDelete={handleEventDeleted}
        onExceptionAdded={handleExceptionAdded}
      />

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
            appliesOn: (editingSpecial.appliesOn ? (typeof editingSpecial.appliesOn === 'string' ? JSON.parse(editingSpecial.appliesOn) : editingSpecial.appliesOn) : []) as string[],
            timeWindow: editingSpecial.timeWindow || '',
            startDate: editingSpecial.startDate || '',
            endDate: editingSpecial.endDate || '',
            isActive: editingSpecial.isActive,
          } : undefined}
          onSuccess={handleModalSuccess}
          onDelete={handleSpecialDeleted}
        />
      ) : (
        <SpecialModalForm
          isOpen={specialModalOpen}
          onClose={() => {
            setSpecialModalOpen(false);
            setEditingSpecial(null);
          }}
          special={editingSpecial ? {
            ...editingSpecial,
            description: editingSpecial.description || '',
            priceNotes: editingSpecial.priceNotes || '',
            timeWindow: editingSpecial.timeWindow || '',
            startDate: editingSpecial.startDate || '',
            endDate: editingSpecial.endDate || '',
          } as any : undefined}
          defaultType={specialType}
          onSuccess={handleModalSuccess}
          onDelete={handleSpecialDeleted}
        />
      )}
    </>
  );
}
