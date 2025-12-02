'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FaUser, FaEnvelope, FaShieldAlt } from 'react-icons/fa';

export default function AdminProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Profile</h1>
          
          <div className="space-y-6">
            {/* User Avatar/Initial */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {session.user.name || 'Admin User'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {session.user.role === 'admin' ? 'Administrator' : session.user.role === 'owner' ? 'Owner' : 'User'}
                </p>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <FaEnvelope className="text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-gray-900 dark:text-white">{session.user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <FaShieldAlt className="text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {session.user.role || 'admin'}
                  </p>
                </div>
              </div>

              {session.user.id && (
                <div className="flex items-start gap-4">
                  <FaUser className="text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">User ID</p>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {session.user.id}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

