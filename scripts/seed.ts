import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.postQueue.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.special.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuSection.deleteMany();
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

  // Create default settings
  const hours = await prisma.setting.create({
    data: {
      key: 'hours',
      value: JSON.stringify({
        monday: { open: '08:00', close: '02:00' },
        tuesday: { open: '08:00', close: '02:00' },
        wednesday: { open: '08:00', close: '02:00' },
        thursday: { open: '08:00', close: '02:00' },
        friday: { open: '08:00', close: '02:00' },
        saturday: { open: '08:00', close: '02:00' },
        sunday: { open: '08:00', close: '02:00' },
      }),
      description: 'Business hours by day of week',
    },
  });

  const contact = await prisma.setting.create({
    data: {
      key: 'contact',
      value: JSON.stringify({
        address: '3889 S King St',
        city: 'Denver',
        state: 'CO',
        zip: '80236',
        phone: '(303) 789-7208',
        email: '',
      }),
      description: 'Contact information',
    },
  });

  const mapEmbed = await prisma.setting.create({
    data: {
      key: 'mapEmbed',
      value: JSON.stringify({
        url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3068.634792669536!2d-105.02968172346767!3d39.65251697160148!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c7f5e5e5e5e5e%3A0x5e5e5e5e5e5e5e5e!2sMonaghan%27s%20Bar%20and%20Grill!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus',
        enabled: true,
      }),
      description: 'Google Maps embed URL',
    },
  });

  console.log('✅ Created settings:', { hours, contact, mapEmbed });

  // Create menu sections and items
  const startersSection = await prisma.menuSection.create({
    data: {
      name: 'Starters',
      menuType: 'dinner',
      displayOrder: 1,
      items: {
        create: [
          { name: 'Wings (Hot, Sweet Chili, BBQ)', description: 'Served with Blue Cheese or Ranch', priceNotes: 'Full: $14, Half: $8', displayOrder: 1 },
          { name: 'Grande Nachos', description: 'Beef, Beans, Cheese, Onion, Tomato, Jalapenos', price: '$14', priceNotes: 'Sub Chicken: +$2, Smothered Green Chili: +$3', displayOrder: 2 },
          { name: 'Chips and Salsa', price: '$7', displayOrder: 3 },
          { name: 'Chili Cheese Fries or Tots', priceNotes: 'Full: $10, Half: $7.50', displayOrder: 4 },
          { name: 'Basket of Fries', priceNotes: 'Full: $7, Half: $4.50', displayOrder: 5 },
          { name: 'Basket of Onion Rings or Tots', priceNotes: 'Full: $8, Half: $5', displayOrder: 6 },
          { name: 'Cheese Quesadilla', price: '$8', priceNotes: 'Add Beef or Chicken: +$2', displayOrder: 7 },
          { name: 'Fried Mushrooms/Mozzarella Sticks/Jalapeno Poppers', price: '$8', displayOrder: 8 },
          { name: 'Monaghan\'s Green Chili', description: 'Served with Tortillas or Chips', priceNotes: 'Bowl: $8, Cup: $6, Side: $1.50, Smothered: +$3.50', displayOrder: 9 },
        ],
      },
    },
  });

  const burgersSection = await prisma.menuSection.create({
    data: {
      name: 'Burgers, Sandwiches, and More',
      description: 'Served with Lettuce, Tomato, Onion, Pickle, and Fries. Substitute Rings, Tots or Salad: +$2',
      menuType: 'dinner',
      displayOrder: 2,
      items: {
        create: [
          { name: 'Smothered Monaghan\'s Burger', description: 'Smothered in Green Chili and Cheese', price: '$14', displayOrder: 1 },
          { name: 'Mexican Hamburger', price: '$14', displayOrder: 2 },
          { name: 'Patty Melt', price: '$14', displayOrder: 3 },
          { name: 'Cheeseburger', description: 'Add-On Toppings Below', price: '$13', displayOrder: 4 },
          { name: 'Hamburger', description: 'Add-On Toppings Below', price: '$12', displayOrder: 5 },
          { name: 'Chicken, Bacon, and Swiss Sandwich', price: '$14', displayOrder: 6 },
          { name: 'Bacon, Lettuce, and Tomato', price: '$12', priceNotes: 'Add Guacamole: +$2', displayOrder: 7 },
          { name: 'Grilled Cheese, Texas Style', price: '$10', priceNotes: 'Add Ham or Bacon: +$2', displayOrder: 8 },
          { name: 'Chicken Strips and Fries', price: '$12', displayOrder: 9 },
          { name: 'Fish and Chips', price: '$12', displayOrder: 10 },
        ],
      },
    },
  });

  const mexicanSection = await prisma.menuSection.create({
    data: {
      name: 'Mexican',
      menuType: 'dinner',
      displayOrder: 3,
      items: {
        create: [
          { name: 'Taco Platter', description: 'Two Ground Beef Tacos. Side of Rice, Beans, and Salsa', price: '$10', priceNotes: 'Chicken: +$2', displayOrder: 1 },
          { name: 'Burrito', price: '$10', priceNotes: 'Bean and Cheese: $10, Add Beef or Chicken: +$2', displayOrder: 2 },
          { name: 'Chili Relleno', description: 'Deep Fried Egg Roll Wrapper, Stuffed with Anaheim Chiles, Monterey Jack, Smothered in Green Chili. Topped with Cheese, Lettuce, Tomato, and Onion.', price: '$12', priceNotes: 'SUB Beans: +$0.50, Beef: +$2, Beef and Bean: +$3, Add Side of Rice and Beans: +$3', displayOrder: 3 },
          { name: 'Taco Salad', description: 'Deep Fried Crispy Tortilla Bowl With Meat (Beef or Chicken), Beans, Lettuce, Cheese, Tomatoes, and Onions.', price: '$13', priceNotes: 'Choose: Salsa, Sour Cream, Green Chili, Ranch, Blue Cheese, or Italian Dressing', displayOrder: 4 },
        ],
      },
    },
  });

  const saladsSection = await prisma.menuSection.create({
    data: {
      name: 'Salads',
      menuType: 'dinner',
      displayOrder: 4,
      items: {
        create: [
          { name: 'Grilled Chicken Salad', price: '$12', displayOrder: 1 },
          { name: 'Side Salad', price: '$6', priceNotes: 'Add Rice and Beans: +$3', displayOrder: 2 },
        ],
      },
    },
  });

  const addOnsSection = await prisma.menuSection.create({
    data: {
      name: 'Add-Ons',
      menuType: 'dinner',
      displayOrder: 5,
      items: {
        create: [
          { name: 'Cheese', description: 'American, Cheddar, Pepper Jack, Swiss, Blue Cheese, Cream Cheese', price: '$1.50', displayOrder: 1 },
          { name: 'Bacon', price: '$3.50', displayOrder: 2 },
          { name: 'Fried Egg', price: '$2.50', displayOrder: 3 },
          { name: 'Smothered Green Chili', price: '$3.50', displayOrder: 4 },
          { name: 'Anaheim Chilis', price: '$2', displayOrder: 5 },
          { name: 'Guacamole', price: '$2.50', displayOrder: 6 },
          { name: 'Whole Roasted Jalapenos', price: '$2', displayOrder: 7 },
          { name: 'Sautéed Onions', price: '$1.50', displayOrder: 8 },
          { name: 'Sour Cream', price: '$1', displayOrder: 9 },
        ],
      },
    },
  });

  const saucesSection = await prisma.menuSection.create({
    data: {
      name: 'Sauces',
      description: 'Salsa, Ranch, Blue Cheese, Italian, BBQ, Buffalo, Honey Mustard, Sweet Chili',
      menuType: 'dinner',
      displayOrder: 6,
      items: {
        create: [
          { name: 'All Sauces', price: '+$0.75', displayOrder: 1 },
        ],
      },
    },
  });

  console.log('✅ Created menu sections:', { startersSection, burgersSection, mexicanSection, saladsSection, addOnsSection, saucesSection });

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

