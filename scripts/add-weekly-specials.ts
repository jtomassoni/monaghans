import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Weekly recurring food specials
const weeklySpecials = [
  {
    title: 'Philly Cheesesteak',
    description: 'Classic shaved beef with peppers, onions, and melted provolone on a hoagie roll',
    priceNotes: '$12.99',
    appliesOn: ['Monday'],
    timeWindow: '11am-9pm',
  },
  {
    title: 'Club Sandwich',
    description: 'Triple-decker with turkey, bacon, lettuce, tomato, and mayo on toasted bread',
    priceNotes: '$11.99',
    appliesOn: ['Tuesday'],
    timeWindow: '11am-9pm',
  },
  {
    title: 'French Dip',
    description: 'Tender roast beef on a hoagie roll with au jus for dipping',
    priceNotes: '$11.99',
    appliesOn: ['Wednesday'],
    timeWindow: '11am-9pm',
  },
  {
    title: 'Chicken Fried Steak',
    description: 'Breaded steak with country gravy, served with mashed potatoes and green beans',
    priceNotes: '$13.99',
    appliesOn: ['Thursday'],
    timeWindow: '11am-9pm',
  },
  {
    title: 'Fish & Chips',
    description: 'Hand-battered cod with crispy fries and house tartar sauce',
    priceNotes: '$12.99',
    appliesOn: ['Friday'],
    timeWindow: '11am-9pm',
  },
  {
    title: 'BBQ Pulled Pork Sandwich',
    description: 'Slow-cooked pulled pork with coleslaw on a brioche bun',
    priceNotes: '$11.99',
    appliesOn: ['Saturday'],
    timeWindow: '11am-9pm',
  },
  {
    title: 'Buffalo Wings',
    description: '10 wings tossed in your choice of sauce with celery and blue cheese',
    priceNotes: '$9.99',
    appliesOn: ['Sunday'],
    timeWindow: '11am-9pm',
  },
];

async function addWeeklySpecials() {
  console.log('🍽️  Adding weekly recurring food specials...');

  for (const special of weeklySpecials) {
    try {
      // Check if this special already exists for this day
      const existing = await prisma.special.findFirst({
        where: {
          title: special.title,
          type: 'food',
          appliesOn: JSON.stringify(special.appliesOn),
        },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${special.title} - already exists`);
        continue;
      }

      await prisma.special.create({
        data: {
          title: special.title,
          description: special.description,
          priceNotes: special.priceNotes,
          type: 'food',
          appliesOn: JSON.stringify(special.appliesOn),
          timeWindow: special.timeWindow,
          isActive: true,
        },
      });

      console.log(`✅ Created weekly special: ${special.title} (${special.appliesOn.join(', ')})`);
    } catch (error) {
      console.error(`❌ Failed to create ${special.title}:`, error);
    }
  }

  console.log('\n✅ Successfully added weekly food specials!');
}

addWeeklySpecials()
  .catch((error) => {
    console.error('Error adding weekly specials:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

