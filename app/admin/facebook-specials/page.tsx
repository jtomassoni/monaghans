import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPermissions } from '@/lib/permissions';
import { FACEBOOK_PUBLIC_PAGE_KEY } from '@/lib/facebook-public-page';
import { groupPollsByDay, readPollResults } from '@/lib/facebook-special-poll';
import { loadSpecialsReader } from '@/lib/facebook-specials-reader';
import { getCompanyTimezone } from '@/lib/timezone';
import AdminPageHeader from '@/components/admin-page-header';
import FacebookSpecialsPanel from './facebook-specials-panel';

export const dynamic = 'force-dynamic';

export default async function FacebookSpecialsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/admin/login');
  const permissions = getPermissions(session.user.role);
  if (!permissions.canManageMenu && !permissions.canAccessAdmin) redirect('/admin');

  const query = await searchParams;
  const [setting, reader, polls, timeZone] = await Promise.all([
    prisma.setting.findUnique({ where: { key: FACEBOOK_PUBLIC_PAGE_KEY } }),
    loadSpecialsReader(),
    prisma.facebookSpecialPoll.findMany({ orderBy: { ranAt: 'desc' }, take: 500 }),
    getCompanyTimezone(),
  ]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      <AdminPageHeader
        title="Facebook specials"
        description="Account, page, and hourly check history"
      />
      <main className="flex-1 overflow-auto relative z-10">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <FacebookSpecialsPanel
            initialUrl={setting?.value || ''}
            account={reader ? { name: reader.name, expiresAt: reader.expiresAt } : null}
            timeZone={timeZone}
            notice={query.connected ? 'connected' : query.error || null}
            days={groupPollsByDay(
              polls.map((poll) => ({
                id: poll.id,
                ranAt: poll.ranAt.toISOString(),
                ok: poll.ok,
                summary: poll.summary,
                results: readPollResults(poll.results),
              })),
              timeZone
            )}
          />
        </div>
      </main>
    </div>
  );
}
