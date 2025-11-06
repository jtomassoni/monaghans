import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FaHistory, FaUser, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export default async function ActivityLogPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const activities = await prisma.activityLog.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <FaPlus className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'update':
        return <FaEdit className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'delete':
        return <FaTrash className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <FaEdit className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
      case 'update':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
      case 'delete':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    return entityType
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

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
            <FaHistory className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Activity Log
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              All actions taken in the CMS
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-md">
            {activities.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getActionIcon(activity.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {activity.user.name || activity.user.email}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action)}`}>
                                {activity.action}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {getEntityTypeLabel(activity.entityType)}
                              </span>
                              {activity.entityName && (
                                <span className="font-medium text-gray-900 dark:text-white">
                                  "{activity.entityName}"
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {activity.description}
                            </p>
                            {activity.changes && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                                {(() => {
                                  try {
                                    const changes = JSON.parse(activity.changes);
                                    return Object.entries(changes).map(([field, change]: [string, any]) => (
                                      <div key={field} className="mt-1">
                                        <span className="font-medium">{field}:</span>{' '}
                                        <span className="line-through text-red-600 dark:text-red-400">{String(change.before || '')}</span>
                                        {' → '}
                                        <span className="text-green-600 dark:text-green-400">{String(change.after || '')}</span>
                                      </div>
                                    ));
                                  } catch {
                                    return null;
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(activity.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <FaHistory className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No activity logged yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

