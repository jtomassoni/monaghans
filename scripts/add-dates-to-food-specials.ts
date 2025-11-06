import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDatesToFoodSpecials() {
  try {
    // Get all food specials without dates
    const specialsWithoutDates = await prisma.special.findMany({
      where: {
        type: 'food',
        OR: [
          { startDate: null },
          { endDate: null },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (specialsWithoutDates.length === 0) {
      console.log('✅ All food specials already have dates.');
      return;
    }

    console.log(`Found ${specialsWithoutDates.length} food special(s) without dates.`);

    // Start from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentDate = new Date(today);

    for (const special of specialsWithoutDates) {
      // If the special already has one date but not the other, use that date
      // Otherwise, use today and increment for each subsequent special
      const startDate = special.startDate ? new Date(special.startDate) : new Date(currentDate);
      const endDate = special.endDate ? new Date(special.endDate) : new Date(currentDate);

      // Ensure both dates are set to the same day (food specials are single-day)
      const dateToUse = special.startDate ? new Date(special.startDate) : new Date(currentDate);
      dateToUse.setHours(0, 0, 0, 0);

      await prisma.special.update({
        where: { id: special.id },
        data: {
          startDate: dateToUse,
          endDate: dateToUse,
        },
      });

      console.log(`✓ Added date ${dateToUse.toLocaleDateString()} to "${special.title}"`);

      // Move to next day for the next special (if we're assigning new dates)
      if (!special.startDate) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log(`\n✅ Successfully added dates to ${specialsWithoutDates.length} food special(s).`);
  } catch (error) {
    console.error('Error adding dates to food specials:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addDatesToFoodSpecials()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

