'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FaCalendarAlt, 
  FaStar, 
  FaUtensils, 
  FaBullhorn,
  FaClock,
  FaEdit,
  FaPlus,
  FaTrash,
  FaUsers,
  FaShoppingCart,
  FaUserCog,
  FaDollarSign,
  FaFire,
} from 'react-icons/fa';
import QuickActions from '@/components/quick-actions';
import AnnouncementModalForm from '@/components/announcement-modal-form';
import EventModalForm from '@/components/event-modal-form';
import SpecialModalForm from '@/components/special-modal-form';

interface OverviewContentProps {
  stats: Array<{
    title: string;
    total: number;
    active: number;
    iconName: string;
    href: string;
    color: string;
    bgColor: string;
    textColor: string;
    details?: string;
    inactive?: number;
    unpublished?: number;
    revenue?: number;
    kitchenOrders?: number;
    clockedIn?: number;
    shiftsToday?: number;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    startDateTime: Date | string;
    venueArea?: string | null;
    formattedDateTime: string;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    description: string;
    createdAt: Date | string;
    formattedDateTime: string;
    user: {
      name: string | null;
      email: string;
    };
  }>;
  publishedAnnouncementsCount: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    total: number;
    createdAt: Date | string;
    formattedDateTime: string;
  }>;
  todayRevenue: number;
  weekRevenue: number;
  clockedInCount: number;
  featureFlags: {
    online_ordering: boolean;
    staff_management: boolean;
  };
}

export default function OverviewContent({
  stats,
  upcomingEvents,
  recentActivities,
  publishedAnnouncementsCount,
  recentOrders,
  todayRevenue,
  weekRevenue,
  clockedInCount,
  featureFlags,
}: OverviewContentProps) {
  const router = useRouter();
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [specialModalOpen, setSpecialModalOpen] = useState(false);

  // Listen for modal open events
  useEffect(() => {
    const handleOpenAnnouncement = () => {
      setAnnouncementModalOpen(true);
    };
    const handleOpenEvent = () => {
      setEventModalOpen(true);
    };
    const handleOpenSpecial = () => {
      setSpecialModalOpen(true);
    };

    window.addEventListener('openAnnouncementModal', handleOpenAnnouncement);
    window.addEventListener('openNewEvent', handleOpenEvent);
    window.addEventListener('openNewSpecial', handleOpenSpecial);

    return () => {
      window.removeEventListener('openAnnouncementModal', handleOpenAnnouncement);
      window.removeEventListener('openNewEvent', handleOpenEvent);
      window.removeEventListener('openNewSpecial', handleOpenSpecial);
    };
  }, []);

  const handleModalSuccess = () => {
    router.refresh();
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

  const getDefaultEventData = () => {
    const now = new Date();
    const startDateTime = new Date(now);
    startDateTime.setHours(12, 0, 0, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 3);
    return {
      title: '',
      description: '',
      startDateTime: formatDateTimeLocal(startDateTime),
      endDateTime: formatDateTimeLocal(endDateTime),
      venueArea: 'bar',
      recurrenceRule: '',
      isAllDay: false,
      tags: [],
      isActive: true,
    };
  };

  // Icon mapping for stats
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    FaCalendarAlt,
    FaUtensils,
    FaBullhorn,
    FaUsers,
    FaShoppingCart,
    FaUserCog,
  };

  // Helper to get status color
  const getOrderStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'text-yellow-600 dark:text-yellow-400',
      confirmed: 'text-blue-600 dark:text-blue-400',
      acknowledged: 'text-purple-600 dark:text-purple-400',
      preparing: 'text-orange-600 dark:text-orange-400',
      ready: 'text-green-600 dark:text-green-400',
      completed: 'text-gray-600 dark:text-gray-400',
      cancelled: 'text-red-600 dark:text-red-400',
    };
    return statusColors[status] || 'text-gray-600 dark:text-gray-400';
  };

  return (
    <>
      <div className="flex-1 overflow-hidden p-3 sm:p-4 relative z-10">
        <div className="max-w-7xl mx-auto h-full flex flex-col gap-3">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-shrink-0">
            {stats.map((stat) => {
              const Icon = iconMap[stat.iconName];
              return (
                <Link
                  key={stat.title}
                  href={stat.href}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] p-4 group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${stat.color} text-white border border-white/20`}>
                      {stat.title === 'Orders' ? stat.active : 
                       stat.title === 'Staff' ? stat.active :
                       stat.title === 'Specials & Events' || stat.title === 'Announcements' ? stat.active : 
                       stat.title === 'Menu' ? stat.active : 
                       stat.total} {stat.title === 'Orders' ? 'Pending' : 
                                   stat.title === 'Staff' ? 'Clocked In' :
                                   stat.title === 'Specials & Events' || stat.title === 'Announcements' ? 'Active' : 
                                   stat.title === 'Menu' ? 'Items' : 
                                   'Total'}
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {stat.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {stat.details ? (
                      <span>{stat.details}</span>
                    ) : (
                      <span>{stat.total} {stat.total === 1 ? 'item' : 'items'} total</span>
                    )}
                    {stat.title === 'Specials & Events' && (
                      <span className="text-gray-400 dark:text-gray-500"> • {stat.active} active</span>
                    )}
                    {stat.title === 'Announcements' && (
                      <span className="text-gray-400 dark:text-gray-500"> • {publishedAnnouncementsCount} published</span>
                    )}
                    {stat.inactive !== undefined && stat.inactive > 0 && (
                      <span className="text-orange-600 dark:text-orange-400"> • {stat.inactive} unavailable</span>
                    )}
                    {stat.unpublished !== undefined && stat.unpublished > 0 && (
                      <span className="text-orange-600 dark:text-orange-400"> • {stat.unpublished} unpublished</span>
                    )}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* Revenue & Quick Stats Row - Conditionally render based on feature flags */}
          {(featureFlags.online_ordering || featureFlags.staff_management) && (
            <div className={`grid grid-cols-1 ${featureFlags.online_ordering && featureFlags.staff_management ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3 flex-shrink-0`}>
              {/* Today's Revenue - Only if online_ordering enabled */}
              {featureFlags.online_ordering && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaDollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Today's Revenue
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${todayRevenue.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This week: ${weekRevenue.toFixed(2)}
                    </p>
                  </div>

                  {/* Kitchen Status */}
                  <Link
                    href="/admin/orders?status=acknowledged,preparing,ready"
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] p-4 group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaFire className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        Kitchen Status
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.find(s => s.title === 'Orders')?.kitchenOrders || 0}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Orders in kitchen
                    </p>
                  </Link>
                </>
              )}

              {/* Staff Status - Only if staff_management enabled */}
              {featureFlags.staff_management && (
                <Link
                  href="/admin/staff?tab=clock"
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] p-4 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <FaClock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Staff Status
                    </h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {clockedInCount}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Currently clocked in
                  </p>
                </Link>
              )}
            </div>
          )}

          {/* Three Column Layout for Orders, Events, and Activity - Conditionally render */}
          {(featureFlags.online_ordering || true) && (
            <div className={`grid grid-cols-1 ${(() => {
              const enabledCount = [
                featureFlags.online_ordering,
                true, // events/specials always enabled (core product)
                true // activity log always enabled
              ].filter(Boolean).length;
              if (enabledCount === 1) return 'lg:grid-cols-1';
              if (enabledCount === 2) return 'lg:grid-cols-2';
              return 'lg:grid-cols-3';
            })()} gap-3 flex-shrink-0`}>
              {/* Recent Orders - Only if online_ordering enabled */}
              {featureFlags.online_ordering && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <FaShoppingCart className="w-4 h-4 text-green-600 dark:text-green-400" />
                      Recent Orders
                    </h2>
                    <Link
                      href="/admin/orders"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All
                    </Link>
                  </div>
                  {recentOrders.length > 0 ? (
                    <div className="space-y-2">
                      {recentOrders.map((order: any) => (
                        <Link
                          key={order.id}
                          href={`/admin/orders?order=${order.id}`}
                          className="block p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 truncate">
                                  {order.orderNumber}
                                </h3>
                                <span className={`text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                {order.customerName} • ${order.total.toFixed(2)}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                {order.formattedDateTime}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                      No pending orders
                    </p>
                  )}
                </div>
              )}

              {/* Upcoming Events - Always enabled (core product) */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <FaClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Upcoming Events
                    </h2>
                    <Link
                      href="/admin?view=list"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All
                    </Link>
                  </div>
                  {upcomingEvents.length > 0 ? (
                    <div className="space-y-2">
                      {upcomingEvents.map((event: any, index: number) => (
                        <Link
                          key={`${event.id}-${event.startDateTime}-${index}`}
                          href={`/admin?view=list&id=${event.id}`}
                          className="block p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                {event.title}
                              </h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                {event.formattedDateTime}
                                {event.venueArea && (
                                  <span className="ml-1.5 text-gray-500 dark:text-gray-500">• {event.venueArea}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                      No upcoming events
                    </p>
                  )}
                </div>

              {/* Recent Activity - Always enabled */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <FaEdit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Recent Activity
                    </h2>
                    <Link
                      href="/admin/activity"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      View All
                      <FaEdit className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity: any) => (
                        <div
                          key={activity.id}
                          className="py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="flex items-start gap-1.5">
                            {activity.action === 'create' && <FaPlus className="w-2.5 h-2.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />}
                            {activity.action === 'update' && <FaEdit className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />}
                            {activity.action === 'delete' && <FaTrash className="w-2.5 h-2.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-900 dark:text-white">
                                <span className="font-semibold">{activity.user.name || activity.user.email}</span>{' '}
                                <span className="text-gray-600 dark:text-gray-400">{activity.description}</span>
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                {activity.formattedDateTime}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 py-2">No recent activity</p>
                    )}
                  </div>
                </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex-shrink-0">
            <QuickActions />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnnouncementModalForm
        isOpen={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <EventModalForm
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        event={getDefaultEventData()}
        onSuccess={handleModalSuccess}
      />

      <SpecialModalForm
        isOpen={specialModalOpen}
        onClose={() => setSpecialModalOpen(false)}
        defaultType="food"
        onSuccess={handleModalSuccess}
      />
    </>
  );
}

