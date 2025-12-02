'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CalendarView from '@/components/admin-calendar';
import EventModalForm from '@/components/event-modal-form';
import SpecialModalForm from '@/components/special-modal-form';
import DrinkSpecialModalForm from '@/components/drink-special-modal-form';
import AnnouncementModalForm from '@/components/announcement-modal-form';
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

interface Announcement {
  id?: string;
  title: string;
  body: string;
  publishAt: string | null;
  expiresAt?: string | null;
  isPublished?: boolean;
  crossPostFacebook: boolean;
  crossPostInstagram: boolean;
  ctaText?: string;
  ctaUrl?: string;
}

interface BusinessHours {
  [key: string]: {
    open: string; // "10:00"
    close: string; // "02:00" (next day)
  };
}

interface DashboardContentProps {
  events: CalendarEvent[];
  specials: Special[];
  announcements?: CalendarAnnouncement[];
  businessHours?: BusinessHours;
  calendarHours?: { startHour: number; endHour: number } | null;
  isAdmin: boolean;
}

type ViewType = 'calendar' | 'list';

export default function DashboardContent({ events: initialEvents, specials, announcements = [], businessHours, calendarHours, isAdmin }: DashboardContentProps) {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventOccurrenceDate, setEventOccurrenceDate] = useState<Date | undefined>(undefined);
  const [editingSpecial, setEditingSpecial] = useState<Special | null>(null);
  const [specialType, setSpecialType] = useState<'food' | 'drink'>('food');
  const [viewType, setViewType] = useState<ViewType>('calendar');
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [localAnnouncements, setLocalAnnouncements] = useState<CalendarAnnouncement[]>(announcements);
  
  // Track the last initialEvents IDs to prevent unnecessary updates
  const lastInitialEventsIdsRef = useRef<string>(JSON.stringify(initialEvents.map(e => e.id).sort()));
  const lastInitialAnnouncementsIdsRef = useRef<string>(JSON.stringify(announcements.map(a => a.id).sort()));

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

  // Update announcements when props change
  useEffect(() => {
    const currentInitialIds = JSON.stringify(announcements.map(a => a.id).sort());
    
    if (currentInitialIds !== lastInitialAnnouncementsIdsRef.current) {
      lastInitialAnnouncementsIdsRef.current = currentInitialIds;
      setLocalAnnouncements(announcements);
    }
  }, [announcements]);

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

  const handleAnnouncementClick = async (announcementId: string) => {
    try {
      const res = await fetch(`/api/announcements/${announcementId}`);
      if (res.ok) {
        const announcementData = await res.json();
        setEditingAnnouncement({
          id: announcementData.id,
          title: announcementData.title,
          body: announcementData.body,
          publishAt: announcementData.publishAt,
          expiresAt: announcementData.expiresAt,
          isPublished: announcementData.isPublished,
          crossPostFacebook: announcementData.crossPostFacebook || false,
          crossPostInstagram: announcementData.crossPostInstagram || false,
          ctaText: announcementData.ctaText,
          ctaUrl: announcementData.ctaUrl,
        });
        setAnnouncementModalOpen(true);
      } else {
        console.error('Failed to fetch announcement data');
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
      // Fallback to local announcement data if API fails
      const announcement = localAnnouncements.find((a) => a.id === announcementId);
      if (announcement) {
        setEditingAnnouncement({
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          publishAt: announcement.publishAt,
          expiresAt: announcement.expiresAt || null,
          isPublished: announcement.isPublished,
          crossPostFacebook: false,
          crossPostInstagram: false,
        });
        setAnnouncementModalOpen(true);
      }
    }
  };

  const handleNewAnnouncement = (date?: Date) => {
    const announcementDate = date || new Date();
    const publishAt = new Date(announcementDate);
    publishAt.setMinutes(0, 0, 0); // Round to top of hour
    
    const expiresAt = new Date(publishAt);
    expiresAt.setHours(expiresAt.getHours() + 24); // Default to 24 hours later
    
    setEditingAnnouncement({
      id: undefined,
      title: '',
      body: '',
      publishAt: formatDateTimeLocal(publishAt),
      expiresAt: formatDateTimeLocal(expiresAt),
      isPublished: true,
      crossPostFacebook: false,
      crossPostInstagram: false,
    });
    setAnnouncementModalOpen(true);
  };

  const handleAnnouncementAdded = (newAnnouncement: any) => {
    // Add new announcement to local state
    setLocalAnnouncements(prev => [...prev, {
      id: newAnnouncement.id,
      title: newAnnouncement.title,
      body: newAnnouncement.body,
      publishAt: newAnnouncement.publishAt,
      expiresAt: newAnnouncement.expiresAt,
      isPublished: newAnnouncement.isPublished,
      eventType: 'announcement' as const,
    }]);
  };

  const handleAnnouncementUpdated = (updatedAnnouncement: any) => {
    // Update announcement in local state
    setLocalAnnouncements(prev => prev.map(a => 
      a.id === updatedAnnouncement.id ? {
        ...a,
        title: updatedAnnouncement.title,
        body: updatedAnnouncement.body,
        publishAt: updatedAnnouncement.publishAt,
        expiresAt: updatedAnnouncement.expiresAt,
        isPublished: updatedAnnouncement.isPublished,
      } : a
    ));
  };

  const handleAnnouncementDeleted = (announcementId: string) => {
    // Remove announcement from local state
    setLocalAnnouncements(prev => prev.filter(a => a.id !== announcementId));
  };

  return (
    <>
      <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        {/* Header - Simplified for Mobile */}
        <div className="flex-shrink-0 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-40">
          <div className="flex items-center justify-between gap-2 min-h-[44px]">
            {/* Title - Hidden on mobile, shown on desktop */}
            <h1 className="hidden sm:block text-2xl font-bold text-gray-900 dark:text-white">
              Calendar & Events
            </h1>
            <div className="sm:hidden flex-1"></div>
            
            {/* Mobile: Two buttons for Event and Announcement, Desktop: Separate buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0" style={{ position: 'relative', zIndex: 60 }}>
              {/* Mobile: Event and Announcement buttons */}
              <div className="sm:hidden flex items-center gap-1.5">
                <button
                  onClick={() => handleNewEvent()}
                  className="px-2.5 py-2 min-h-[40px] bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-semibold text-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-1 touch-manipulation shadow-md"
                  style={{ zIndex: 61 }}
                >
                  <span className="text-sm">➕</span>
                  <span>Event</span>
                </button>
                <button
                  onClick={() => handleNewAnnouncement()}
                  className="px-2.5 py-2 min-h-[40px] bg-yellow-500 dark:bg-yellow-600 hover:bg-yellow-600 dark:hover:bg-yellow-700 rounded-lg text-white font-semibold text-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-1 touch-manipulation shadow-md"
                  style={{ zIndex: 61 }}
                >
                  <span className="text-sm">📢</span>
                  <span>Announce</span>
                </button>
              </div>
              
              {/* Desktop: Separate buttons */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => handleNewEvent()}
                  className="px-4 py-2.5 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-blue-400 dark:border-blue-500 touch-manipulation"
                >
                  <span>➕</span>
                  <span>New Event</span>
                </button>
                <button
                  onClick={() => handleNewAnnouncement()}
                  className="px-4 py-2.5 bg-yellow-500/90 dark:bg-yellow-600/90 hover:bg-yellow-600 dark:hover:bg-yellow-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-yellow-400 dark:border-yellow-500 touch-manipulation"
                >
                  <span>📢</span>
                  <span>New Announcement</span>
                </button>
              </div>
              
              {/* View Type Toggle - Hidden on mobile, shown on desktop */}
              <div className="hidden sm:flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                  onClick={() => setViewType('calendar')}
                  className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 ${
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
                  className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95 ${
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
            <div className="flex-1 overflow-hidden p-2 sm:p-6 pb-2 sm:pb-6 min-h-0 flex flex-col">
              <CalendarView
                events={events}
                specials={specials}
                announcements={localAnnouncements}
                businessHours={businessHours}
                calendarHours={calendarHours}
                onEventClick={handleEventClick}
                onSpecialClick={handleSpecialClick}
                onAnnouncementClick={handleAnnouncementClick}
                onNewEvent={handleNewEvent}
                onNewAnnouncement={handleNewAnnouncement}
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
                    eventType: 'event' as const,
                  }))}
                  initialSpecials={specials.map(s => ({
                    id: s.id,
                    title: s.title,
                    description: s.description,
                    priceNotes: s.priceNotes,
                    type: s.type,
                    appliesOn: s.appliesOn,
                    timeWindow: s.timeWindow,
                    startDate: s.startDate,
                    endDate: s.endDate,
                    image: s.image,
                    isActive: s.isActive,
                    eventType: 'special' as const,
                  }))}
                  initialAnnouncements={localAnnouncements.map(a => ({
                    id: a.id,
                    title: a.title,
                    body: a.body,
                    publishAt: a.publishAt,
                    expiresAt: a.expiresAt,
                    isPublished: a.isPublished,
                    eventType: 'announcement' as const,
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

      <AnnouncementModalForm
        isOpen={announcementModalOpen}
        onClose={() => {
          setAnnouncementModalOpen(false);
          setEditingAnnouncement(null);
        }}
        announcement={editingAnnouncement || undefined}
        onSuccess={handleModalSuccess}
        onDelete={handleAnnouncementDeleted}
        onAnnouncementAdded={handleAnnouncementAdded}
        onAnnouncementUpdated={handleAnnouncementUpdated}
      />
    </>
  );
}
