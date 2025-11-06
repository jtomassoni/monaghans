import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EventsList from '../specials-events-list';

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
  }));

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Events
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              Manage events and daily specials
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 px-6 relative z-10 min-h-0">
        <div className="max-w-6xl mx-auto flex-1 flex flex-col overflow-hidden min-h-0 w-full">
          <EventsList 
            initialEvents={transformedEvents}
          />
        </div>
      </div>
    </div>
  );
}

