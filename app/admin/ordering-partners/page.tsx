import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions } from '@/lib/permissions';
import AdminPageHeader from '@/components/admin-page-header';
import OrderingPartnersClient from './ordering-partners-client';

export default async function AdminOrderingPartnersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const permissions = getPermissions(session.user.role);
  if (!permissions.canAccessReporting) {
    redirect('/admin');
  }

  const role = session.user.role;
  if (role !== 'admin' && role !== 'owner') {
    redirect('/admin');
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-200/15 dark:from-orange-900/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl" />
      </div>
      <AdminPageHeader
        title="Online Ordering Links"
        description="Tracked Toast pickup redirect links — click counts by channel"
      />
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <OrderingPartnersClient isAdmin={role === 'admin'} />
        </div>
      </div>
    </div>
  );
}
