import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardContent from '@/components/dashboard-content';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Fetch all active events and specials for the calendar
  const events = await prisma.event.findMany({
    where: {
      isActive: true,
    },
    orderBy: { startDateTime: 'asc' },
  });

  const specials = await prisma.special.findMany({
    where: {
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch all announcements (including future ones) for the calendar
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Serialize dates and parse JSON fields
  const serializedEvents = events.map((event) => ({
    ...event,
    startDateTime: event.startDateTime.toISOString(),
    endDateTime: event.endDateTime?.toISOString() || null,
    tags: event.tags ? JSON.parse(event.tags) : null,
    image: (event as any).image || null,
    eventType: 'event' as const,
  }));

  const serializedSpecials = specials.map((special) => {
    const specialType = (special as any).type as string;
    return {
      ...special,
      type: (specialType === 'food' || specialType === 'drink' ? specialType : 'food') as 'food' | 'drink',
      startDate: special.startDate?.toISOString() || null,
      endDate: special.endDate?.toISOString() || null,
      eventType: 'special' as const,
    };
  });

  const serializedAnnouncements = announcements.map((announcement) => ({
    ...announcement,
    publishAt: announcement.publishAt?.toISOString() || null,
    expiresAt: announcement.expiresAt?.toISOString() || null,
    eventType: 'announcement' as const,
  }));

  return (
    <DashboardContent
      events={serializedEvents}
      specials={serializedSpecials}
      announcements={serializedAnnouncements}
      isSuperadmin={session.user.role === 'superadmin'}
    />
  );
}
