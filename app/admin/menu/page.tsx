import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import MenuTabs from './menu-tabs';

export default async function AdminMenu() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/admin/login');
  }

  const [sections, specials, drinkSpecials, allItems] = await Promise.all([
    prisma.menuSection.findMany({
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.special.findMany({
      where: {
        type: 'food',
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.special.findMany({
      where: {
        type: 'drink',
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.menuItem.findMany({
      include: {
        section: {
          select: {
            id: true,
            name: true,
            menuType: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    }),
  ]);

  // Transform specials for the component
  const transformedSpecials = specials.map((special) => ({
    id: special.id,
    title: special.title,
    description: special.description || null,
    priceNotes: special.priceNotes || null,
    type: special.type,
    timeWindow: special.timeWindow || null,
    startDate: special.startDate?.toISOString() || null,
    endDate: special.endDate?.toISOString() || null,
    isActive: special.isActive,
  }));

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

  // Transform items for the component
  const transformedItems = allItems.map((item) => ({
    id: item.id,
    sectionId: item.sectionId,
    name: item.name,
    description: item.description || null,
    price: item.price || null,
    priceNotes: item.priceNotes || null,
    modifiers: item.modifiers || null,
    isAvailable: item.isAvailable,
    displayOrder: item.displayOrder,
    section: {
      id: item.section.id,
      name: item.section.name,
      menuType: item.section.menuType,
    },
  }));

  // Transform sections for the items list
  const sectionsForItems = sections.map((section) => ({
    id: section.id,
    name: section.name,
  }));

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/15 dark:from-amber-900/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/15 dark:from-rose-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 pt-16 md:pt-3 border-b border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Menu
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
              Manage menu sections, items, and daily specials
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-h-0">
        <div className="max-w-6xl mx-auto flex-1 flex flex-col overflow-hidden min-h-0 w-full">
          <MenuTabs 
            sections={sections} 
            specials={transformedSpecials}
            drinkSpecials={transformedDrinkSpecials}
            items={transformedItems}
            sectionsForItems={sectionsForItems}
          />
        </div>
      </div>
    </div>
  );
}

