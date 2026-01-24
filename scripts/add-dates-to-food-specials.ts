import { PrismaClient } from '@prisma/client';
import { getMountainTimeToday, parseMountainTimeDate, getMountainTimeDateString, getCompanyTimezone } from '@/lib/timezone';

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

    const companyTimezone = await getCompanyTimezone();
    // Start from today in Mountain Time
    const today = getMountainTimeToday();
    let currentDate = new Date(today);

    for (const special of specialsWithoutDates) {
      let dateStr: string;
      
      // If the special already has one date but not the other, use that date
      if (special.startDate) {
        const existingDate = special.startDate instanceof Date 
          ? special.startDate 
          : new Date(special.startDate);
        dateStr = getMountainTimeDateString(existingDate, companyTimezone);
      } else {
        // Use current date and increment for each subsequent special
        dateStr = getMountainTimeDateString(currentDate, companyTimezone);
      }

      // Use timezone-aware date parsing to ensure dates are in Mountain Time
      // For single-day specials, both startDate and endDate should be the same date
      const dateToUse = parseMountainTimeDate(dateStr, companyTimezone);

      await prisma.special.update({
        where: { id: special.id },
        data: {
          startDate: dateToUse,
          endDate: dateToUse, // Same as startDate to ensure single-day special
        },
      });

      console.log(`✓ Added date ${dateStr} to "${special.title}"`);

      // Move to next day for the next special (if we're assigning new dates)
      if (!special.startDate) {
        currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);
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

