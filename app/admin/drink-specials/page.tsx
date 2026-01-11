import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import DrinkSpecialsList from '../menu/drink-specials-list';
import NewDrinkSpecialButton from './new-drink-special-button';
import AdminPageHeader from '@/components/admin-page-header';

export default async function AdminDrinkSpecials() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const drinkSpecials = await prisma.special.findMany({
    where: {
      type: 'drink',
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform drink specials for the component
  const transformedDrinkSpecials = drinkSpecials.map((special) => ({
    id: special.id,
    title: special.title,
    description: special.description || null,
    priceNotes: special.priceNotes || null,
    type: special.type,
    appliesOn: special.appliesOn || null,
    timeWindow: special.timeWindow || null,
    startDate: special.startDate?.toISOString() || null,
    endDate: special.endDate?.toISOString() || null,
    isActive: special.isActive,
  }));

  const backgroundImage =
    "linear-gradient(135deg, rgba(15, 23, 42, 0.70), rgba(30, 41, 59, 0.65), rgba(79, 70, 229, 0.40)), url('/pics/happy-hour-cheers.png')";

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative bg-cover bg-center"
      style={{ backgroundImage }}
    >
      {/* Image overlay for readability */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/40" />
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/20 dark:from-amber-900/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/20 dark:from-rose-900/30 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <AdminPageHeader
        title="Drink Specials"
        description="Manage daily drink specials"
        helpFeature="specials"
        action={<NewDrinkSpecialButton />}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={<div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>}>
            <DrinkSpecialsList initialSpecials={transformedDrinkSpecials} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

