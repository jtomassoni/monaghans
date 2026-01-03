import { PrismaClient } from '@prisma/client';
import { getMountainTimeToday, parseMountainTimeDate, getMountainTimeDateString, getCompanyTimezone } from '@/lib/timezone';

const prisma = new PrismaClient();

// Food special templates - realistic bar food specials
const foodSpecials = [
  { title: 'Fish & Chips', description: 'Hand-battered cod with crispy fries and house tartar sauce', priceNotes: '$12.99' },
  { title: 'Buffalo Wings', description: '10 wings tossed in your choice of sauce', priceNotes: '$9.99' },
  { title: 'Bacon Cheeseburger', description: 'Angus beef patty with bacon, cheddar, lettuce, tomato, and onion', priceNotes: '$11.99' },
  { title: 'Nachos Grande', description: 'Loaded nachos with beef, jalapeños, cheese, sour cream, and guacamole', priceNotes: '$10.99' },
  { title: 'Chicken Quesadilla', description: 'Grilled chicken with cheese, peppers, and onions', priceNotes: '$9.99' },
  { title: 'Taco Platter', description: 'Three tacos with your choice of protein', priceNotes: '$10.99' },
  { title: 'BBQ Pulled Pork Sandwich', description: 'Slow-cooked pulled pork with coleslaw on a brioche bun', priceNotes: '$11.99' },
  { title: 'Chicken Tenders', description: 'Five crispy chicken tenders with your choice of dipping sauce', priceNotes: '$9.99' },
  { title: 'Caesar Salad', description: 'Romaine lettuce with grilled chicken, parmesan, and house caesar dressing', priceNotes: '$10.99' },
  { title: 'Philly Cheesesteak', description: 'Shaved beef with peppers, onions, and melted provolone', priceNotes: '$12.99' },
  { title: 'Chili Cheese Fries', description: 'Crispy fries topped with house chili and melted cheese', priceNotes: '$8.99' },
  { title: 'Fried Shrimp Basket', description: 'Golden fried shrimp with fries and coleslaw', priceNotes: '$13.99' },
  { title: 'Mac & Cheese', description: 'Creamy macaroni and cheese with your choice of add-ons', priceNotes: '$9.99' },
  { title: 'Reuben Sandwich', description: 'Corned beef, sauerkraut, swiss cheese, and thousand island on rye', priceNotes: '$12.99' },
  { title: 'Chicken Wrap', description: 'Grilled chicken with lettuce, tomato, and chipotle mayo', priceNotes: '$9.99' },
  { title: 'Potato Skins', description: 'Loaded potato skins with bacon, cheese, and sour cream', priceNotes: '$8.99' },
  { title: 'Cobb Salad', description: 'Mixed greens with grilled chicken, bacon, egg, avocado, and blue cheese', priceNotes: '$11.99' },
  { title: 'Brisket Sandwich', description: 'Slow-smoked brisket with pickles and BBQ sauce', priceNotes: '$12.99' },
  { title: 'Mozzarella Sticks', description: 'Fried mozzarella with marinara sauce', priceNotes: '$7.99' },
  { title: 'BLT Sandwich', description: 'Crispy bacon, lettuce, and tomato on toasted bread', priceNotes: '$9.99' },
  { title: 'Chicken Fajitas', description: 'Sizzling chicken fajitas with peppers, onions, and tortillas', priceNotes: '$13.99' },
  { title: 'Sliders', description: 'Three mini burgers with cheese, pickles, and special sauce', priceNotes: '$10.99' },
  { title: 'Fish Tacos', description: 'Two grilled fish tacos with cabbage slaw and chipotle aioli', priceNotes: '$10.99' },
  { title: 'Chicken Fried Steak', description: 'Breaded steak with country gravy and mashed potatoes', priceNotes: '$12.99' },
  { title: 'Queso & Chips', description: 'House queso dip with crispy tortilla chips', priceNotes: '$7.99' },
  { title: 'Monte Cristo Sandwich', description: 'Ham, turkey, and swiss cheese grilled to perfection', priceNotes: '$11.99' },
  { title: 'Chicken Parmesan', description: 'Breaded chicken with marinara and melted mozzarella', priceNotes: '$13.99' },
  { title: 'Loaded Baked Potato', description: 'Baked potato with your choice of toppings', priceNotes: '$8.99' },
  { title: 'Hot Dog', description: 'All-beef hot dog with your choice of toppings', priceNotes: '$6.99' },
  { title: 'French Dip Sandwich', description: 'Roast beef on a hoagie roll with au jus', priceNotes: '$11.99' },
  { title: 'Chicken Salad Sandwich', description: 'House-made chicken salad on your choice of bread', priceNotes: '$9.99' },
  { title: 'Onion Rings', description: 'Crispy beer-battered onion rings', priceNotes: '$7.99' },
  { title: 'Chili', description: 'Bowl of our famous house chili', priceNotes: '$6.99' },
  { title: 'Grilled Chicken Sandwich', description: 'Marinated grilled chicken with lettuce, tomato, and mayo', priceNotes: '$10.99' },
  { title: 'Fries & Gravy', description: 'Crispy fries smothered in rich gravy', priceNotes: '$7.99' },
];

// Time windows for different meal periods
const timeWindows = [
  'All Day',
  '11am-3pm',
  '4pm-9pm',
  '5pm-9pm',
  'All Day',
  '11am-2pm',
  '3pm-6pm',
];

async function generateDailySpecials() {
  console.log('🍽️  Generating 30 daily food specials for the next month...');

  const companyTimezone = await getCompanyTimezone();
  const today = getMountainTimeToday();
  
  // Generate specials for the next 30 days
  const specials = [];
  const usedIndices = new Set<number>();
  
  for (let i = 0; i < 30; i++) {
    // Calculate date in company timezone by adding days to today
    const date = new Date(today);
    date.setTime(today.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = getMountainTimeDateString(date, companyTimezone);
    
    // Pick a random special that we haven't used yet (or reset if we've used them all)
    let specialIndex;
    if (usedIndices.size >= foodSpecials.length) {
      usedIndices.clear();
    }
    
    do {
      specialIndex = Math.floor(Math.random() * foodSpecials.length);
    } while (usedIndices.has(specialIndex));
    
    usedIndices.add(specialIndex);
    
    const foodSpecial = foodSpecials[specialIndex];
    // Use timezone-aware date parsing to ensure dates are in Mountain Time
    // For single-day specials, both startDate and endDate should be the same date
    // This ensures the calendar UI correctly identifies them as single-day specials
    const startDate = parseMountainTimeDate(dateStr, companyTimezone);
    // Set endDate to the same date string to ensure it produces the same date string
    // when the calendar UI reads it back (prevents day rollover issues)
    const endDate = parseMountainTimeDate(dateStr, companyTimezone);
    
    const timeWindow = timeWindows[Math.floor(Math.random() * timeWindows.length)];
    
    try {
      const special = await prisma.special.create({
        data: {
          title: foodSpecial.title,
          description: foodSpecial.description,
          priceNotes: foodSpecial.priceNotes,
          type: 'food',
          appliesOn: JSON.stringify([]), // Empty array for date-specific specials
          timeWindow: timeWindow,
          startDate: startDate,
          endDate: endDate,
          isActive: true,
        },
      });
      
      specials.push(special);
      console.log(`✅ Created special for ${dateStr}: ${foodSpecial.title}`);
    } catch (error) {
      console.error(`❌ Failed to create special for ${dateStr}:`, error);
    }
  }
  
  console.log(`\n✅ Successfully created ${specials.length} daily food specials!`);
  return specials;
}

generateDailySpecials()
  .catch((error) => {
    console.error('Error generating daily specials:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

