import { PrismaClient } from '@prisma/client';

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

    // Start from today and assign dates going forward
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentDate = new Date(today);

    for (const special of specials) {
      // Set startDate and endDate to the same day (single day special)
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);

      await prisma.special.update({
        where: { id: special.id },
        data: {
          startDate,
          endDate,
        },
      });

      console.log(`✓ Assigned ${special.title} to ${startDate.toLocaleDateString()}`);

      // Move to next day for the next special
      currentDate.setDate(currentDate.getDate() + 1);
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

