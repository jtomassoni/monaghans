import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import MenuDisplay from '@/components/menu-display';
import { getMountainTimeToday, getMountainTimeTomorrow } from '@/lib/timezone';

export default async function MenuPage() {
  // Use Mountain Time for date calculations
  const today = getMountainTimeToday();
  const tomorrowStart = getMountainTimeTomorrow();

  const [breakfastSections, dinnerSections, dailySpecials] = await Promise.all([
    prisma.menuSection.findMany({
      where: {
        isActive: true,
        menuType: { in: ['breakfast', 'both'] },
      },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.menuSection.findMany({
      where: {
        isActive: true,
        menuType: { in: ['dinner', 'both'] },
      },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.special.findMany({
      where: {
        isActive: true,
        type: 'food',
        startDate: {
          lte: tomorrowStart,
        },
        endDate: {
          gte: today,
        },
      },
      orderBy: { startDate: 'asc' },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-16 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Our Menu</h1>
          <p className="text-sm text-gray-400 mb-4">*Prices subject to change</p>
          <Link
            href="/order"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-[var(--color-accent)]/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Order Online
          </Link>
        </div>

        {/* Menu Content */}
        <MenuDisplay 
          breakfastSections={breakfastSections} 
          dinnerSections={dinnerSections}
          dailySpecials={dailySpecials}
        />

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}


