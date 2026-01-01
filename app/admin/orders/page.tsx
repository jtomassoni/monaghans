import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OrdersList from './orders-list';
import AdminPageHeader from '@/components/admin-page-header';

export default async function AdminOrders() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const orders = await prisma.order.findMany({
    include: {
      items: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <AdminPageHeader
        title="Orders"
        description="Manage customer orders and track status. Online ordering interface coming soon."
        badge={
          <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-full">
            Backend Ready
          </span>
        }
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-2 sm:p-3 relative z-10">
        <div className="max-w-7xl mx-auto">
          <OrdersList initialOrders={orders} />
        </div>
      </div>
    </div>
  );
}

