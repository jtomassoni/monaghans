import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';
import DrinkSpecialsList from '../menu/drink-specials-list';
import NewDrinkSpecialButton from './new-drink-special-button';

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
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 pt-14 md:pt-0 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="hidden md:flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Drink Specials
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              Manage daily drink specials
            </p>
          </div>
          <NewDrinkSpecialButton />
        </div>
        {/* Mobile: Show action button only */}
        <div className="md:hidden flex justify-end">
          <NewDrinkSpecialButton />
        </div>
      </div>

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

