import { PrismaClient } from '@prisma/client';
import { getMountainTimeToday, parseMountainTimeDate, getMountainTimeDateString, getCompanyTimezone } from '@/lib/timezone';

const prisma = new PrismaClient();

async function assignDailySpecialDates() {
  try {
    // Get all food specials without dates
    const specials = await prisma.special.findMany({
      where: {
        type: 'food',
        startDate: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (specials.length === 0) {
      console.log('No daily specials found without dates.');
      return;
    }

    console.log(`Found ${specials.length} daily specials without dates.`);

    const companyTimezone = await getCompanyTimezone();
    // Start from today in Mountain Time
    const today = getMountainTimeToday();
    let currentDate = new Date(today);

    for (const special of specials) {
      // Get date string in Mountain Time
      const dateStr = getMountainTimeDateString(currentDate, companyTimezone);
      
      // Use timezone-aware date parsing to ensure dates are in Mountain Time
      // For single-day specials, both startDate and endDate should be the same date
      const startDate = parseMountainTimeDate(dateStr, companyTimezone);
      const endDate = parseMountainTimeDate(dateStr, companyTimezone); // Same as startDate

      await prisma.special.update({
        where: { id: special.id },
        data: {
          startDate,
          endDate,
        },
      });

      console.log(`✓ Assigned ${special.title} to ${dateStr}`);

      // Move to next day for the next special
      currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    console.log(`\n✅ Successfully assigned dates to ${specials.length} daily specials.`);
  } catch (error) {
    console.error('Error assigning dates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

assignDailySpecialDates()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

