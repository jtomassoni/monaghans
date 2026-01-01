import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isFeatureEnabled } from '@/lib/feature-flags';
import StaffContent from './staff-content';
import AdminPageHeader from '@/components/admin-page-header';

export default async function AdminStaff() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Check if staff management feature is enabled
  const isStaffManagementEnabled = await isFeatureEnabled('staff_management');
  if (!isStaffManagementEnabled) {
    redirect('/admin');
  }

  // Fetch initial data - include all employees (active and inactive)
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null }, // Only exclude soft-deleted employees
    orderBy: [{ name: 'asc' }],
  });

  // Get current week's schedules
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const schedules = await prisma.schedule.findMany({
    where: {
      date: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          role: true,
          hourlyWage: true,
        },
      },
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' },
    ],
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
        title="Staff & Scheduling"
        description="Manage employees and schedules"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <StaffContent 
            initialEmployees={employees}
            initialSchedules={schedules}
          />
        </div>
      </div>
    </div>
  );
}

