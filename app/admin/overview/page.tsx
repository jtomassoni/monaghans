import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OverviewContent from './overview-content';

export default async function AdminOverview() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);

  // Fetch comprehensive data
  const [
    eventsCount,
    activeEventsCount,
    specialsCount,
    activeSpecialsCount,
    menuSectionsCount,
    menuItemsCount,
    announcementsCount,
    publishedAnnouncementsCount,
    usersCount,
    upcomingEvents,
    recentActivities,
    inactiveMenuItems,
    unpublishedAnnouncements,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { isActive: true } }),
    prisma.special.count(),
    prisma.special.count({ where: { isActive: true } }),
    prisma.menuSection.count(),
    prisma.menuItem.count(),
    prisma.announcement.count(),
    prisma.announcement.count({ where: { isPublished: true } }),
    session.user.role === 'superadmin' ? prisma.user.count() : Promise.resolve(0),
    // Upcoming events (next 7 days, limit to 3 for overview)
    prisma.event.findMany({
      where: {
        isActive: true,
        startDateTime: {
          gte: now,
          lte: nextWeek,
        },
      },
      orderBy: { startDateTime: 'asc' },
      take: 3,
    }),
    // Recent activities (only 3 for overview)
    (prisma as any).activityLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    // Inactive menu items
    prisma.menuItem.count({ where: { isAvailable: false } }),
    // Unpublished announcements
    prisma.announcement.findMany({
      where: {
        isPublished: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDateTime = (date: Date) => {
    return `${formatDate(date)} at ${formatTime(date)}`;
  };

  // Format dates on server side before passing to client component
  const formattedUpcomingEvents = upcomingEvents.map((event: any) => ({
    ...event,
    formattedDateTime: formatDateTime(event.startDateTime),
  }));

  const formattedRecentActivities = recentActivities.map((activity: any) => ({
    ...activity,
    formattedDateTime: formatDateTime(activity.createdAt),
  }));

  const stats = [
    {
      title: 'Specials & Events',
      total: eventsCount + specialsCount,
      active: activeEventsCount + activeSpecialsCount,
      iconName: 'FaCalendarAlt',
      href: '/admin/specials-events',
      color: 'bg-blue-500/80 dark:bg-blue-600/80',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      details: `${eventsCount} events • ${specialsCount} specials`,
    },
    {
      title: 'Menu',
      total: menuSectionsCount + menuItemsCount,
      active: menuItemsCount - inactiveMenuItems,
      iconName: 'FaUtensils',
      href: '/admin/menu',
      color: 'bg-blue-500/80 dark:bg-blue-600/80',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      inactive: inactiveMenuItems,
      details: `${menuSectionsCount} sections • ${menuItemsCount} items`,
    },
    {
      title: 'Announcements',
      total: announcementsCount,
      active: publishedAnnouncementsCount,
      iconName: 'FaBullhorn',
      href: '/admin/announcements',
      color: 'bg-yellow-500/80 dark:bg-yellow-600/80',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      unpublished: unpublishedAnnouncements.length,
    },
  ];

  if (session.user.role === 'superadmin') {
    stats.push({
      title: 'Users',
      total: usersCount,
      active: usersCount,
      iconName: 'FaUsers',
      href: '/admin/users',
      color: 'bg-gray-500/80 dark:bg-gray-600/80',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      textColor: 'text-gray-600 dark:text-gray-400',
      details: `${usersCount} users`,
    });
  }

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
              Overview
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              Dashboard overview and quick insights
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <OverviewContent
        stats={stats}
        upcomingEvents={formattedUpcomingEvents}
        recentActivities={formattedRecentActivities}
        publishedAnnouncementsCount={publishedAnnouncementsCount}
      />
    </div>
  );
}
