import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import EventsList from '../specials-events-list';
import EventsHeader from '../events/events-header';

export default async function AdminSpecialsEvents() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const events = await prisma.event.findMany({
    orderBy: { startDateTime: 'asc' },
  });

  // Transform events to match the component's expected types
  const transformedEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description || null,
    startDateTime: event.startDateTime.toISOString(),
    endDateTime: event.endDateTime?.toISOString() || null,
    venueArea: event.venueArea,
    recurrenceRule: event.recurrenceRule || null,
    isAllDay: event.isAllDay,
    tags: event.tags ? JSON.parse(event.tags) : null,
    image: (event as any).image || null,
    isActive: event.isActive,
    eventType: 'event' as const,
  }));

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 pt-16 md:pt-3 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-[1]">
        <EventsHeader />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>}>
            <EventsList 
              initialEvents={transformedEvents}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

