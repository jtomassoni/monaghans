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

  // Date ranges for today
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // Date ranges for this week
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

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
    // Orders data
    todayOrdersCount,
    pendingOrdersCount,
    kitchenOrdersCount,
    todayRevenue,
    weekRevenue,
    recentOrders,
    // Staff data
    activeEmployeesCount,
    clockedInCount,
    todaySchedulesCount,
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
    // Orders: Today's count
    prisma.order.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    }),
    // Orders: Pending (not completed or cancelled)
    prisma.order.count({
      where: {
        status: {
          notIn: ['completed', 'cancelled'],
        },
      },
    }),
    // Orders: In kitchen (acknowledged, preparing, ready)
    prisma.order.count({
      where: {
        status: {
          in: ['acknowledged', 'preparing', 'ready'],
        },
      },
    }),
    // Revenue: Today's total
    prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
        paymentStatus: 'paid',
      },
      _sum: {
        total: true,
      },
    }),
    // Revenue: This week's total
    prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
        paymentStatus: 'paid',
      },
      _sum: {
        total: true,
      },
    }),
    // Recent orders (last 5)
    prisma.order.findMany({
      where: {
        status: {
          notIn: ['completed', 'cancelled'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerName: true,
        total: true,
        createdAt: true,
      },
    }),
    // Staff: Active employees
    prisma.employee.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    }),
    // Staff: Currently clocked in
    prisma.shift.count({
      where: {
        clockOut: null,
      },
    }),
    // Staff: Today's scheduled shifts
    prisma.schedule.count({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
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
      title: 'Orders',
      total: todayOrdersCount,
      active: pendingOrdersCount,
      iconName: 'FaShoppingCart',
      href: '/admin/orders',
      color: 'bg-green-500/80 dark:bg-green-600/80',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      details: `$${(todayRevenue._sum.total || 0).toFixed(2)} today • ${kitchenOrdersCount} in kitchen`,
      revenue: todayRevenue._sum.total || 0,
      kitchenOrders: kitchenOrdersCount,
    },
    {
      title: 'Staff',
      total: activeEmployeesCount,
      active: clockedInCount,
      iconName: 'FaUsers',
      href: '/admin/staff',
      color: 'bg-purple-500/80 dark:bg-purple-600/80',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      details: `${clockedInCount} clocked in • ${todaySchedulesCount} shifts today`,
      clockedIn: clockedInCount,
      shiftsToday: todaySchedulesCount,
    },
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
      color: 'bg-orange-500/80 dark:bg-orange-600/80',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-600 dark:text-orange-400',
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
      iconName: 'FaUserCog',
      href: '/admin/users',
      color: 'bg-gray-500/80 dark:bg-gray-600/80',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      textColor: 'text-gray-600 dark:text-gray-400',
      details: `${usersCount} users`,
    });
  }

  // Format recent orders
  const formattedRecentOrders = recentOrders.map((order: any) => ({
    ...order,
    formattedDateTime: formatDateTime(order.createdAt),
  }));

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 pt-16 md:pt-3 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Overview
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              Real-time operations, orders, staff, and revenue overview
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
        recentOrders={formattedRecentOrders}
        todayRevenue={todayRevenue._sum.total || 0}
        weekRevenue={weekRevenue._sum.total || 0}
        clockedInCount={clockedInCount}
      />
    </div>
  );
}
