import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPermissions } from '@/lib/permissions';
import { FACEBOOK_PUBLIC_PAGE_KEY } from '@/lib/facebook-public-page';
import AdminPageHeader from '@/components/admin-page-header';
import FacebookPageForm from './facebook-page-form';

export const dynamic = 'force-dynamic';

export default async function FacebookSpecialsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/admin/login');
  const permissions = getPermissions(session.user.role);
  if (!permissions.canManageMenu && !permissions.canAccessAdmin) redirect('/admin');

  const setting = await prisma.setting.findUnique({ where: { key: FACEBOOK_PUBLIC_PAGE_KEY } });

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      <AdminPageHeader
        title="Facebook specials"
        description="Public page the hourly check reads"
      />
      <main className="flex-1 overflow-auto relative z-10">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <FacebookPageForm initialUrl={setting?.value || ''} />
        </div>
      </main>
    </div>
  );
}
