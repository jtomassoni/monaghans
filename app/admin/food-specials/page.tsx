import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Suspense } from 'react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DailySpecialsList from '../menu/daily-specials-list';
import NewFoodSpecialButton from './new-food-special-button';
import GalleryButton from './gallery-button';
import AdminPageHeader from '@/components/admin-page-header';

const LoadingFallback = () => (
  <div className="text-center py-16">
    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 dark:border-orange-400" />
    <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-400">
      Loading specials...
    </p>
  </div>
);

const transformSpecial = (special: any) => ({
  id: special.id,
  title: special.title,
  description: special.description || null,
  priceNotes: special.priceNotes || null,
  type: special.type,
  timeWindow: special.timeWindow || null,
  startDate: special.startDate?.toISOString() || null,
  endDate: special.endDate?.toISOString() || null,
  appliesOn: special.appliesOn || null, // JSON string array of weekdays for recurring specials
  image: special.image || null,
  isActive: special.isActive,
});

export default async function AdminFoodSpecials() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const specials = await prisma.special.findMany({
    where: { type: 'food' },
    orderBy: { createdAt: 'desc' },
  });

  const transformedSpecials = specials.map(transformSpecial);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <AdminPageHeader
        title="Food Specials"
        description="Manage daily food specials"
        action={
          <div className="flex gap-2">
            <GalleryButton />
            <NewFoodSpecialButton />
          </div>
        }
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        <div className="h-full overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<LoadingFallback />}>
              <DailySpecialsList initialSpecials={transformedSpecials} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

