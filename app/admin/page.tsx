import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardContent from '@/components/dashboard-content';
import { getBusinessHours } from '@/lib/schedule-helpers';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Fetch all events (including inactive) for both calendar and list views
  const events = await prisma.event.findMany({
    orderBy: { startDateTime: 'asc' },
  });

  // Fetch all specials (including inactive) for the calendar
  const specials = await prisma.special.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Fetch all announcements (including future ones) for the calendar
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Fetch business hours for calendar display
  const businessHours = await getBusinessHours();

  // Fetch calendar hours setting
  const calendarHoursSetting = await prisma.setting.findUnique({
    where: { key: 'calendarHours' },
  });

  let calendarHours: { startHour: number; endHour: number } | null = null;
  if (calendarHoursSetting?.value) {
    try {
      calendarHours = JSON.parse(calendarHoursSetting.value);
    } catch {
      // Invalid JSON, use default (null)
    }
  }

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
      businessHours={businessHours}
      calendarHours={calendarHours}
      isAdmin={session.user.role === 'admin'}
    />
  );
}
