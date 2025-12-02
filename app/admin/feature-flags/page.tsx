import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import FeatureFlagsClient from './feature-flags-client';

export default async function FeatureFlagsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Only admin can access feature flags
  const userRole = session.user.role || 'admin';
  if (userRole !== 'admin') {
    redirect('/admin');
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2 sm:py-3 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
              Feature Flags
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              Toggle features on or off. Changes take effect immediately.
            </p>
          </div>
          <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Admin</span>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-hidden p-0 relative z-10">
        <div className="h-full">
          <FeatureFlagsClient />
        </div>
      </div>
    </div>
  );
}

