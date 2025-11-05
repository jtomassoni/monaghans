import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.postQueue.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.special.deleteMany();
  await prisma.page.deleteMany();
  await prisma.setting.deleteMany();

  // Create sample specials
  const tuesdaySpecial = await prisma.special.create({
    data: {
      title: 'Taco Tuesday',
      description: 'All tacos $2.50 every Tuesday',
      priceNotes: '$2.50 per taco',
      appliesOn: JSON.stringify(['Tuesday']),
      timeWindow: '4pm-10pm',
      isActive: true,
    },
  });

  const happyHour = await prisma.special.create({
    data: {
      title: 'Happy Hour',
      description: 'Half-price drafts and well drinks',
      priceNotes: '50% off drafts, well drinks',
      appliesOn: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
      timeWindow: '4pm-6pm',
      isActive: true,
    },
  });

  console.log('✅ Created specials:', { tuesdaySpecial, happyHour });

  // Create sample events
  const triviaNight = await prisma.event.create({
    data: {
      title: 'Trivia Night',
      description: 'Weekly trivia with prizes!',
      startDateTime: new Date('2024-01-09T19:00:00'), // Next Tuesday
      endDateTime: new Date('2024-01-09T21:00:00'),
      venueArea: 'bar',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
      isAllDay: false,
      tags: JSON.stringify(['trivia', 'weekly']),
      isActive: true,
    },
  });

  const liveMusic = await prisma.event.create({
    data: {
      title: 'Live Music: Local Band',
      description: 'Local band playing covers and originals',
      startDateTime: new Date('2024-01-13T20:00:00'), // Saturday
      endDateTime: new Date('2024-01-13T23:00:00'),
      venueArea: 'stage',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=SA',
      isAllDay: false,
      tags: JSON.stringify(['live-music', 'weekly']),
      isActive: true,
    },
  });

  console.log('✅ Created events:', { triviaNight, liveMusic });

  // Create sample announcement
  const announcement = await prisma.announcement.create({
    data: {
      title: 'Welcome to Monaghan\'s!',
      body: 'We\'re excited to have you here. Come grab a cold drink and enjoy the warm atmosphere.',
      publishAt: new Date(),
      isPublished: true,
      crossPostFacebook: false,
      crossPostInstagram: false,
    },
  });

  console.log('✅ Created announcement:', announcement);

  // Create default pages
  const aboutPage = await prisma.page.create({
    data: {
      slug: 'about',
      title: 'About Monaghan\'s',
      content: '# About Us\n\nMonaghan\'s has been serving the neighborhood since 1985. We\'re a family-owned dive bar committed to good drinks, good food, and good company.\n\nStop by and say hello!',
      isActive: true,
    },
  });

  const menuPage = await prisma.page.create({
    data: {
      slug: 'menu',
      title: 'Menu',
      content: '# Our Menu\n\n## Beer\n- Drafts: $4-6\n- Bottles: $3-5\n\n## Cocktails\n- Well drinks: $6\n- Premium: $8-12\n\n## Bar Food\n- Tacos: $3-4\n- Wings: $8\n- Nachos: $7\n\n*Prices subject to change*',
      isActive: true,
    },
  });

  const contactPage = await prisma.page.create({
    data: {
      slug: 'contact',
      title: 'Contact Us',
      content: '# Get in Touch\n\n**Address:** 123 Main Street, Your City, ST 12345\n\n**Phone:** (555) 123-4567\n\n**Hours:**\n- Monday - Thursday: 4pm - 12am\n- Friday - Saturday: 4pm - 2am\n- Sunday: 2pm - 10pm',
      isActive: true,
    },
  });

  console.log('✅ Created pages:', { aboutPage, menuPage, contactPage });

  // Create default settings
  const hours = await prisma.setting.create({
    data: {
      key: 'hours',
      value: JSON.stringify({
        monday: { open: '16:00', close: '00:00' },
        tuesday: { open: '16:00', close: '00:00' },
        wednesday: { open: '16:00', close: '00:00' },
        thursday: { open: '16:00', close: '00:00' },
        friday: { open: '16:00', close: '02:00' },
        saturday: { open: '16:00', close: '02:00' },
        sunday: { open: '14:00', close: '22:00' },
      }),
      description: 'Business hours by day of week',
    },
  });

  const contact = await prisma.setting.create({
    data: {
      key: 'contact',
      value: JSON.stringify({
        address: '123 Main Street',
        city: 'Your City',
        state: 'ST',
        zip: '12345',
        phone: '(555) 123-4567',
        email: 'info@monaghans.com',
      }),
      description: 'Contact information',
    },
  });

  const mapEmbed = await prisma.setting.create({
    data: {
      key: 'mapEmbed',
      value: JSON.stringify({
        url: 'https://www.google.com/maps/embed?pb=...',
        enabled: true,
      }),
      description: 'Google Maps embed URL',
    },
  });

  console.log('✅ Created settings:', { hours, contact, mapEmbed });

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

