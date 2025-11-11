import { prisma } from '@/lib/prisma';
import OrderingInterface from '@/components/ordering-interface';
import { getMountainTimeToday, getMountainTimeTomorrow } from '@/lib/timezone';

export default async function OrderPage() {
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Order Online</h1>
          <p className="text-sm text-gray-400">Select items to add to your cart</p>
        </div>

        {/* Ordering Interface */}
        <OrderingInterface 
          breakfastSections={breakfastSections} 
          dinnerSections={dinnerSections}
          dailySpecials={dailySpecials}
        />
      </div>
    </main>
  );
}

