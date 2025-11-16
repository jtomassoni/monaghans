import { prisma } from '@/lib/prisma';
import OrderingInterface from '@/components/ordering-interface';
import { getMountainTimeToday, getMountainTimeTomorrow, parseMountainTimeDate, getMountainTimeDateString } from '@/lib/timezone';
import { startOfDay, endOfDay } from 'date-fns';

export default async function OrderPage() {
  // Use Mountain Time for date calculations
  const today = getMountainTimeToday();
  const tomorrowStart = getMountainTimeTomorrow();

  const [breakfastSections, dinnerSections, allFoodSpecials] = await Promise.all([
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
      },
      orderBy: { startDate: 'asc' },
    }),
  ]);

  // Filter food specials to only show those that apply today
  const dailySpecials = allFoodSpecials.filter((special) => {
    if (!special.startDate) return false;

    // Parse dates as Mountain Time dates (not UTC) to prevent day shifts
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    
    if (special.startDate) {
      const startDateValue = special.startDate as string | Date;
      startDateStr = typeof startDateValue === 'string' 
        ? startDateValue.split('T')[0] 
        : getMountainTimeDateString(startDateValue);
    }
    
    if (special.endDate) {
      const endDateValue = special.endDate as string | Date;
      endDateStr = typeof endDateValue === 'string' 
        ? endDateValue.split('T')[0] 
        : getMountainTimeDateString(endDateValue);
    }
    
    const startDate = startDateStr ? parseMountainTimeDate(startDateStr) : null;
    const endDate = endDateStr ? parseMountainTimeDate(endDateStr) : null;

    if (!startDate) return false;

    // Date-based special (no weekly recurring for food specials)
    // If only startDate is set, treat it as a single-day special
    // If both dates are set, use the date range
    const effectiveEndDate = endDate || startDate;
    const start = startOfDay(startDate);
    const end = endOfDay(effectiveEndDate);
    
    return today >= start && today <= end;
  });

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

