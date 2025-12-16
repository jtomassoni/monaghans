import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAllFeatureFlags } from '@/lib/feature-flags';
import { getMountainTimeNow, getMountainTimeToday } from '@/lib/timezone';
import { RRule } from 'rrule';
import { format } from 'date-fns';
import OverviewContent from './overview-content';

export default async function AdminOverview() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Fetch feature flags to optimize data fetching
  const featureFlags = await getAllFeatureFlags();
  const flagsMap = new Map(featureFlags.map(flag => [flag.key, flag.isEnabled]));
  
  const isOnlineOrderingEnabled = flagsMap.get('online_ordering') ?? false;
  const isStaffSchedulingEnabled = flagsMap.get('staff_scheduling') ?? false;
  const isCalendarsEventsEnabled = flagsMap.get('calendars_events') ?? false;
  const isSpecialsManagementEnabled = flagsMap.get('specials_management') ?? false;
  const isMenuManagementEnabled = flagsMap.get('menu_management') ?? false;
  const isActivityLogEnabled = flagsMap.get('activity_log') ?? false;
  const isUsersStaffManagementEnabled = flagsMap.get('users_staff_management') ?? false;

  // Use Mountain Time for date calculations to match events page
  const now = getMountainTimeNow();
  const today = getMountainTimeToday();
  
  // Look ahead 2 months for recurring events (matching events page)
  const futureDate = new Date(today);
  futureDate.setMonth(futureDate.getMonth() + 2);

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

  // Build promises array conditionally based on feature flags
  const promises: Promise<any>[] = [];
  const promiseIndices: Record<string, number> = {};

  // Events & Specials data (if calendars_events or specials_management enabled)
  if (isCalendarsEventsEnabled || isSpecialsManagementEnabled) {
    promiseIndices.eventsCount = promises.length;
    promises.push(prisma.event.count());
    promiseIndices.activeEventsCount = promises.length;
    promises.push(prisma.event.count({ where: { isActive: true } }));
    promiseIndices.specialsCount = promises.length;
    promises.push(prisma.special.count());
    promiseIndices.activeSpecialsCount = promises.length;
    promises.push(prisma.special.count({ where: { isActive: true } }));
    // We'll handle events separately to include recurring occurrences
    promiseIndices.upcomingEvents = -1; // Will be handled separately
  } else {
    promiseIndices.eventsCount = -1;
    promiseIndices.activeEventsCount = -1;
    promiseIndices.specialsCount = -1;
    promiseIndices.activeSpecialsCount = -1;
    promiseIndices.upcomingEvents = -1;
  }

  // Menu data (if menu_management enabled)
  if (isMenuManagementEnabled) {
    promiseIndices.menuSectionsCount = promises.length;
    promises.push(prisma.menuSection.count());
    promiseIndices.menuItemsCount = promises.length;
    promises.push(prisma.menuItem.count());
    promiseIndices.inactiveMenuItems = promises.length;
    promises.push(prisma.menuItem.count({ where: { isAvailable: false } }));
  } else {
    promiseIndices.menuSectionsCount = -1;
    promiseIndices.menuItemsCount = -1;
    promiseIndices.inactiveMenuItems = -1;
  }

  // Announcements (always fetch - no specific flag)
  promiseIndices.announcementsCount = promises.length;
  promises.push(prisma.announcement.count());
  promiseIndices.publishedAnnouncementsCount = promises.length;
  promises.push(prisma.announcement.count({ where: { isPublished: true } }));
  promiseIndices.unpublishedAnnouncements = promises.length;
  promises.push(
    prisma.announcement.findMany({
      where: {
        isPublished: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
  );

  // Users (if users_staff_management enabled and admin)
  if (isUsersStaffManagementEnabled && session.user.role === 'admin') {
    promiseIndices.usersCount = promises.length;
    promises.push(prisma.user.count());
  } else {
    promiseIndices.usersCount = -1;
  }

  // Activity log (if activity_log enabled)
  if (isActivityLogEnabled) {
    promiseIndices.recentActivities = promises.length;
    promises.push(
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
      })
    );
  } else {
    promiseIndices.recentActivities = -1;
  }

  // Orders data (if online_ordering enabled)
  if (isOnlineOrderingEnabled) {
    promiseIndices.todayOrdersCount = promises.length;
    promises.push(
      prisma.order.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      })
    );
    promiseIndices.pendingOrdersCount = promises.length;
    promises.push(
      prisma.order.count({
        where: {
          status: {
            notIn: ['completed', 'cancelled'],
          },
        },
      })
    );
    promiseIndices.kitchenOrdersCount = promises.length;
    promises.push(
      prisma.order.count({
        where: {
          status: {
            in: ['acknowledged', 'preparing', 'ready'],
          },
        },
      })
    );
    promiseIndices.todayRevenue = promises.length;
    promises.push(
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
      })
    );
    promiseIndices.weekRevenue = promises.length;
    promises.push(
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
      })
    );
    promiseIndices.recentOrders = promises.length;
    promises.push(
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
      })
    );
  } else {
    promiseIndices.todayOrdersCount = -1;
    promiseIndices.pendingOrdersCount = -1;
    promiseIndices.kitchenOrdersCount = -1;
    promiseIndices.todayRevenue = -1;
    promiseIndices.weekRevenue = -1;
    promiseIndices.recentOrders = -1;
  }

  // Staff data (if staff_scheduling enabled)
  if (isStaffSchedulingEnabled) {
    promiseIndices.activeEmployeesCount = promises.length;
    promises.push(
      prisma.employee.count({
        where: {
          isActive: true,
          deletedAt: null,
        },
      })
    );
    promiseIndices.clockedInCount = promises.length;
    promises.push(
      prisma.shift.count({
        where: {
          clockOut: null,
        },
      })
    );
    promiseIndices.todaySchedulesCount = promises.length;
    promises.push(
      prisma.schedule.count({
        where: {
          date: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      })
    );
  } else {
    promiseIndices.activeEmployeesCount = -1;
    promiseIndices.clockedInCount = -1;
    promiseIndices.todaySchedulesCount = -1;
  }

  // Execute all promises
  const results = await Promise.all(promises);
  
  // Handle events separately to include recurring occurrences (matching events page logic)
  let upcomingEvents: any[] = [];
  if (isCalendarsEventsEnabled || isSpecialsManagementEnabled) {
    // Fetch all active events (including recurring ones)
    const allEvents = await prisma.event.findMany({
      where: {
        isActive: true,
      },
      orderBy: { startDateTime: 'asc' },
    });
    
    // Helper function to get recurring event occurrences (simplified version for admin overview)
    const getRecurringEventOccurrences = (event: any, rangeStart: Date, rangeEnd: Date) => {
      if (!event.recurrenceRule) return [];
      
      try {
        const exceptions: string[] = event.exceptions ? JSON.parse(event.exceptions) : [];
        const startDate = new Date(event.startDateTime);
        
        // Use a simpler approach for admin overview - just use RRule directly
        const rule = RRule.fromString(event.recurrenceRule);
        const ruleOptions = {
          ...rule.options,
          dtstart: startDate,
        };
        const ruleWithDtstart = new RRule(ruleOptions);
        
        const searchStart = startDate > rangeStart ? startDate : rangeStart;
        const occurrences = ruleWithDtstart.between(searchStart, rangeEnd, true);
        
        // Filter out exceptions and create event objects
        return occurrences
          .filter(occurrence => {
            const occurrenceDateStr = format(occurrence, 'yyyy-MM-dd');
            return !exceptions.includes(occurrenceDateStr);
          })
          .map(occurrence => ({
            ...event,
            startDateTime: occurrence.toISOString(),
            endDateTime: event.endDateTime ? (() => {
              const duration = new Date(event.endDateTime).getTime() - new Date(event.startDateTime).getTime();
              return new Date(occurrence.getTime() + duration).toISOString();
            })() : null,
            isRecurringOccurrence: true,
          }));
      } catch (e) {
        return [];
      }
    };
    
    // Get upcoming one-time events
    const upcomingOneTimeEvents = allEvents.filter(event => {
      if (event.recurrenceRule) return false;
      const eventDate = new Date(event.startDateTime);
      return eventDate >= today;
    });
    
    // Get upcoming recurring occurrences
    const upcomingRecurringOccurrences = allEvents
      .filter(event => event.recurrenceRule)
      .flatMap(event => getRecurringEventOccurrences(event, today, futureDate))
      .filter(occurrence => {
        const occurrenceDate = new Date(occurrence.startDateTime);
        return occurrenceDate >= today;
      });
    
    // Combine and sort, then take first 3
    upcomingEvents = [...upcomingOneTimeEvents, ...upcomingRecurringOccurrences]
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
      .slice(0, 3);
  }

  // Extract results using indices
  const getResult = (index: number, defaultValue: any = 0) => 
    index >= 0 ? results[index] : defaultValue;

  const eventsCount = getResult(promiseIndices.eventsCount);
  const activeEventsCount = getResult(promiseIndices.activeEventsCount);
  const specialsCount = getResult(promiseIndices.specialsCount);
  const activeSpecialsCount = getResult(promiseIndices.activeSpecialsCount);
  const menuSectionsCount = getResult(promiseIndices.menuSectionsCount);
  const menuItemsCount = getResult(promiseIndices.menuItemsCount);
  const announcementsCount = getResult(promiseIndices.announcementsCount);
  const publishedAnnouncementsCount = getResult(promiseIndices.publishedAnnouncementsCount);
  const usersCount = getResult(promiseIndices.usersCount);
  // upcomingEvents is already handled above
  const recentActivities = getResult(promiseIndices.recentActivities, []);
  const inactiveMenuItems = getResult(promiseIndices.inactiveMenuItems);
  const unpublishedAnnouncements = getResult(promiseIndices.unpublishedAnnouncements, []);
  const todayOrdersCount = getResult(promiseIndices.todayOrdersCount);
  const pendingOrdersCount = getResult(promiseIndices.pendingOrdersCount);
  const kitchenOrdersCount = getResult(promiseIndices.kitchenOrdersCount);
  const todayRevenue = getResult(promiseIndices.todayRevenue, { _sum: { total: 0 } });
  const weekRevenue = getResult(promiseIndices.weekRevenue, { _sum: { total: 0 } });
  const recentOrders = getResult(promiseIndices.recentOrders, []);
  const activeEmployeesCount = getResult(promiseIndices.activeEmployeesCount);
  const clockedInCount = getResult(promiseIndices.clockedInCount);
  const todaySchedulesCount = getResult(promiseIndices.todaySchedulesCount);

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

  // Build stats array conditionally based on feature flags
  const stats = [];

  // Orders stat (only if online_ordering enabled)
  if (isOnlineOrderingEnabled) {
    stats.push({
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
    });
  }

  // Staff stat (only if staff_scheduling enabled)
  if (isStaffSchedulingEnabled) {
    stats.push({
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
    });
  }

  // Specials & Events stat (only if calendars_events or specials_management enabled)
  if (isCalendarsEventsEnabled || isSpecialsManagementEnabled) {
    stats.push({
      title: 'Specials & Events',
      total: eventsCount + specialsCount,
      active: activeEventsCount + activeSpecialsCount,
      iconName: 'FaCalendarAlt',
      href: '/admin?view=list',
      color: 'bg-blue-500/80 dark:bg-blue-600/80',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      details: `${eventsCount} events • ${specialsCount} specials`,
    });
  }

  // Menu stat (only if menu_management enabled)
  if (isMenuManagementEnabled) {
    stats.push({
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
    });
  }

  // Announcements stat (always show)
  stats.push({
    title: 'Announcements',
    total: announcementsCount,
    active: publishedAnnouncementsCount,
    iconName: 'FaBullhorn',
    href: '/admin/announcements',
    color: 'bg-yellow-500/80 dark:bg-yellow-600/80',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    unpublished: unpublishedAnnouncements.length,
  });

  // Users stat (only if users_staff_management enabled and admin)
  if (isUsersStaffManagementEnabled && session.user.role === 'admin') {
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
        featureFlags={{
          online_ordering: isOnlineOrderingEnabled,
          staff_scheduling: isStaffSchedulingEnabled,
          calendars_events: isCalendarsEventsEnabled,
          specials_management: isSpecialsManagementEnabled,
          menu_management: isMenuManagementEnabled,
          activity_log: isActivityLogEnabled,
          users_staff_management: isUsersStaffManagementEnabled,
        }}
      />
    </div>
  );
}
