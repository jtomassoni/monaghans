import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UnifiedUsersStaffList from './unified-list';
import AdminPageHeader from '@/components/admin-page-header';

export default async function AdminUsersStaff() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  // Only admin and owner can access user/staff management
  const { getPermissions } = await import('@/lib/permissions');
  const permissions = getPermissions(session.user.role);
  if (!permissions.canManageUsers) {
    redirect('/admin');
  }

  // Fetch both users and employees
  const [users, employees] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        pin: true,
        role: true,
        hourlyWage: true,
        isActive: true,
        hireDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  // Serialize dates to strings for client component
  const serializedUsers = users.map(user => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));

  const serializedEmployees = employees.map(emp => ({
    ...emp,
    hireDate: emp.hireDate?.toISOString() || null,
    createdAt: emp.createdAt.toISOString(),
    updatedAt: emp.updatedAt.toISOString(),
  }));

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <AdminPageHeader
        title="Users & Staff"
        description="Manage admin users and staff members in one place"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <UnifiedUsersStaffList 
              initialUsers={serializedUsers} 
              initialEmployees={serializedEmployees}
              currentUserRole={session.user.role}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

