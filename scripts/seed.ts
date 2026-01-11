import { PrismaClient } from '@prisma/client';
import { getMountainTimeToday, parseMountainTimeDate, getMountainTimeDateString, getCompanyTimezone } from '@/lib/timezone';
import { createAssetFromUpload } from '@/lib/asset-processor';

const prisma = new PrismaClient();

/**
 * Safely delete from a table, ignoring errors if the table doesn't exist
 */
async function safeDeleteMany(deleteFn: () => Promise<any>, tableName: string) {
  try {
    await deleteFn();
  } catch (error: any) {
    // Ignore errors about tables not existing (P2021)
    if (error?.code === 'P2021') {
      console.log(`⚠️  Table ${tableName} does not exist, skipping...`);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log('🌱 Seeding database...');
  console.log('🗑️  Clearing all existing data...');

  // Delete in order to respect foreign key constraints (child tables first)
  // Order matters due to foreign key relationships
  
  // Delete child/junction tables first
  await safeDeleteMany(() => prisma.orderItem.deleteMany(), 'OrderItem');
  await safeDeleteMany(() => prisma.pOSSaleItem.deleteMany(), 'POSSaleItem');
  await safeDeleteMany(() => prisma.menuItemIngredient.deleteMany(), 'MenuItemIngredient');
  await safeDeleteMany(() => prisma.purchaseOrderItem.deleteMany(), 'PurchaseOrderItem');
  await safeDeleteMany(() => prisma.supplierPricing.deleteMany(), 'SupplierPricing');
  await safeDeleteMany(() => prisma.leadNote.deleteMany(), 'LeadNote');
  await safeDeleteMany(() => prisma.leadContact.deleteMany(), 'LeadContact');
  await safeDeleteMany(() => prisma.activityLog.deleteMany(), 'ActivityLog');
  await safeDeleteMany(() => prisma.shift.deleteMany(), 'Shift');
  await safeDeleteMany(() => prisma.schedule.deleteMany(), 'Schedule');
  await safeDeleteMany(() => prisma.employeeAvailability.deleteMany(), 'EmployeeAvailability');
  await safeDeleteMany(() => prisma.shiftRequirement.deleteMany(), 'ShiftRequirement');
  await safeDeleteMany(() => prisma.weeklyScheduleTemplate.deleteMany(), 'WeeklyScheduleTemplate');
  
  // Delete parent tables
  await safeDeleteMany(() => prisma.order.deleteMany(), 'Order');
  await safeDeleteMany(() => prisma.pOSSale.deleteMany(), 'POSSale');
  await safeDeleteMany(() => prisma.pOSIntegration.deleteMany(), 'POSIntegration');
  await safeDeleteMany(() => prisma.privateDiningLead.deleteMany(), 'PrivateDiningLead');
  await safeDeleteMany(() => prisma.event.deleteMany(), 'Event');
  await safeDeleteMany(() => prisma.special.deleteMany(), 'Special');
  await safeDeleteMany(() => prisma.announcement.deleteMany(), 'Announcement');
  await safeDeleteMany(() => prisma.postQueue.deleteMany(), 'PostQueue');
  await safeDeleteMany(() => prisma.facebookPost.deleteMany(), 'FacebookPost');
  await safeDeleteMany(() => prisma.menuItem.deleteMany(), 'MenuItem');
  await safeDeleteMany(() => prisma.menuSection.deleteMany(), 'MenuSection');
  await safeDeleteMany(() => prisma.ingredient.deleteMany(), 'Ingredient');
  await safeDeleteMany(() => prisma.supplierProduct.deleteMany(), 'SupplierProduct');
  await safeDeleteMany(() => prisma.supplierConnection.deleteMany(), 'SupplierConnection');
  await safeDeleteMany(() => prisma.supplier.deleteMany(), 'Supplier');
  await safeDeleteMany(() => prisma.purchaseOrder.deleteMany(), 'PurchaseOrder');
  await safeDeleteMany(() => prisma.employee.deleteMany(), 'Employee');
  await safeDeleteMany(() => prisma.featureFlag.deleteMany(), 'FeatureFlag');
  
  // Delete digital signage tables (child tables first)
  // Note: These models may not exist if migrations haven't been run, so we use safeDeleteMany
  try {
    await safeDeleteMany(() => (prisma as any).slide.deleteMany(), 'Slide');
    await safeDeleteMany(() => (prisma as any).adCreative.deleteMany(), 'AdCreative');
    await safeDeleteMany(() => (prisma as any).adCampaign.deleteMany(), 'AdCampaign');
    await safeDeleteMany(() => (prisma as any).asset.deleteMany(), 'Asset');
    await safeDeleteMany(() => (prisma as any).upload.deleteMany(), 'Upload');
  } catch (error) {
    console.log('⚠️  Some digital signage tables may not exist yet, continuing...');
  }
  
  // Delete independent tables (Settings and Users - keep users for auth, but clear activity logs)
  // Note: We're keeping User table for authentication, but clearing ActivityLog
  // Note: We delete settings but will recreate signageConfig with custom slides later
  await safeDeleteMany(() => prisma.setting.deleteMany(), 'Setting');
  
  console.log('✅ All existing data cleared');
  console.log('');

  // Create test users for e2e tests (from env vars)
  console.log('👤 Creating test users...');
  
  // Parse credentials from env vars (same format as auth.setup.ts)
  function parseUserCredentials(envVar: string | undefined): Array<{username: string, password: string}> {
    if (!envVar) return [];
    return envVar
      .split(',')
      .map(pair => {
        const [username, password] = pair.split(':').map(s => s.trim());
        if (username && password) {
          return { username, password };
        }
        return null;
      })
      .filter((cred): cred is {username: string, password: string} => cred !== null);
  }

  const adminUsers = parseUserCredentials(process.env.ADMIN_USERS || 'jt:test');
  const ownerUsers = parseUserCredentials(process.env.OWNER_USERS || 'owner:test');

  // Create admin users
  for (const cred of adminUsers) {
    try {
      await prisma.user.upsert({
        where: { email: cred.username },
        update: {
          name: 'Test Admin',
          role: 'admin',
          isActive: true,
        },
        create: {
          email: cred.username,
          name: 'Test Admin',
          role: 'admin',
          isActive: true,
        },
      });
      console.log(`✅ Created/updated admin user: ${cred.username}`);
    } catch (error: any) {
      console.error(`❌ Failed to create admin user ${cred.username}:`, error.message);
    }
  }

  // Create owner users
  for (const cred of ownerUsers) {
    try {
      await prisma.user.upsert({
        where: { email: cred.username },
        update: {
          name: 'Test Owner',
          role: 'owner',
          isActive: true,
        },
        create: {
          email: cred.username,
          name: 'Test Owner',
          role: 'owner',
          isActive: true,
        },
      });
      console.log(`✅ Created/updated owner user: ${cred.username}`);
    } catch (error: any) {
      console.error(`❌ Failed to create owner user ${cred.username}:`, error.message);
    }
  }

  // Get system user for uploads (use first admin if available)
  let systemUser = await prisma.user.findFirst({
    where: {
      role: {
        in: ['owner', 'admin'],
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!systemUser) {
    // Fallback: create a seed user for uploads
    try {
      systemUser = await prisma.user.create({
        data: {
          email: 'seed@monaghans.local',
          name: 'Seed User',
          role: 'admin',
          isActive: true,
        },
      });
      console.log('✅ Created seed user for uploads');
    } catch (error: any) {
      console.error('❌ Failed to create seed user:', error.message);
      // Continue anyway - we'll handle this in custom slides section
    }
  } else {
    console.log('✅ Using existing user for uploads');
  }

  // Create weekly recurring specials (food and drink)
  console.log('');
  console.log('🍽️  Creating weekly recurring specials...');
  
  const weeklySpecials = [
    // Food specials
    {
      title: 'Chicken Fried Steak and Eggs',
      description: 'Breaded steak with country gravy, served with two eggs and hash browns',
      priceNotes: '$12.99',
      type: 'food',
      appliesOn: ['Sunday'],
      timeWindow: 'All Day',
    },
    {
      title: 'Taco Tuesday',
      description: 'All tacos $2.50 every Tuesday',
      priceNotes: '$2.50 per taco',
      type: 'food',
      appliesOn: ['Tuesday'],
      timeWindow: 'All Day',
    },
    // Drink specials
    {
      title: 'Whiskey Wednesday',
      description: 'Half-price whiskey shots and whiskey cocktails',
      priceNotes: '50% off all whiskey',
      type: 'drink',
      appliesOn: ['Wednesday'],
      timeWindow: 'All Day',
    },
    {
      title: 'Tequila Thursday',
      description: 'Tequila shots and margaritas special',
      priceNotes: '$5 tequila shots, $6 margaritas',
      type: 'drink',
      appliesOn: ['Thursday'],
      timeWindow: 'All Day',
    },
    {
      title: 'Taco Tuesday Drink Special',
      description: '$1 off all Mexican beers: Modelo, Tecate, Corona, Dos Equis',
      priceNotes: '$1 off Mexican beers',
      type: 'drink',
      appliesOn: ['Tuesday'],
      timeWindow: 'All Day',
    },
  ];

  const createdWeeklySpecials = [];
  for (const special of weeklySpecials) {
    try {
      const created = await prisma.special.create({
        data: {
          title: special.title,
          description: special.description,
          priceNotes: special.priceNotes,
          type: special.type,
          appliesOn: JSON.stringify(special.appliesOn),
          timeWindow: special.timeWindow,
          image: null, // No default image - use gallery to assign images
          isActive: true,
        },
      });
      createdWeeklySpecials.push(created);
      console.log(`✅ Created weekly special: ${created.title} (${special.appliesOn.join(', ')})`);
    } catch (error) {
      console.error(`❌ Failed to create weekly special "${special.title}":`, error);
    }
  }

  // Generate daily food specials for the upcoming month
  console.log('');
  console.log('🍽️  Generating daily food specials for the next 30 days...');
  
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
    { title: 'French Dip Sandwich', description: 'Roast beef on a hoagie roll with au jus', priceNotes: '$11.99' },
    { title: 'Grilled Chicken Sandwich', description: 'Marinated grilled chicken with lettuce, tomato, and mayo', priceNotes: '$10.99' },
  ];

  const timeWindows = ['All Day', '11am-3pm', '4pm-9pm', '5pm-9pm', '11am-2pm', '3pm-6pm'];
  
  // Use company timezone for all date operations
  const companyTimezone = await getCompanyTimezone();
  const today = getMountainTimeToday();
  const todayStr = getMountainTimeDateString(today);
  
  // First, identify all Tuesdays in the next 30 days to skip them
  // (Taco Tuesday weekly recurring special will cover those days)
  const tuesdayDates = new Set<string>();
  
  // Find the next Tuesday in company timezone
  const todayParts = today.toLocaleDateString('en-US', { 
    weekday: 'long',
    timeZone: companyTimezone
  });
  const weekdayMap: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  const todayDayOfWeek = weekdayMap[todayParts] ?? 0;
  const daysUntilNextTuesday = todayDayOfWeek === 2 ? 0 : (2 - todayDayOfWeek + 7) % 7 || 7; // 2 = Tuesday
  
  // Get today's date string in company timezone
  const todayDateStr = getMountainTimeDateString(today, companyTimezone);
  const [todayYear, todayMonth, todayDay] = todayDateStr.split('-').map(Number);
  
  // Calculate first Tuesday by adding days to today's date string
  const firstTuesdayDateStr = (() => {
    const firstTuesday = new Date(today);
    firstTuesday.setTime(today.getTime() + daysUntilNextTuesday * 24 * 60 * 60 * 1000);
    return getMountainTimeDateString(firstTuesday, companyTimezone);
  })();
  
  // Collect all Tuesday dates in the next 30 days
  for (let i = 0; i < 5; i++) { // Up to 5 Tuesdays in ~30 days
    // Calculate Tuesday date by adding weeks to first Tuesday
    const tuesdayDate = parseMountainTimeDate(firstTuesdayDateStr, companyTimezone);
    tuesdayDate.setTime(tuesdayDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
    const tuesdayDateStr = getMountainTimeDateString(tuesdayDate, companyTimezone);
    
    // Skip if beyond 30 days
    const tuesdayDateParsed = parseMountainTimeDate(tuesdayDateStr, companyTimezone);
    const daysDiff = Math.floor((tuesdayDateParsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) break;
    
    // Store as date string (YYYY-MM-DD) in company timezone
    tuesdayDates.add(tuesdayDateStr);
  }
  
  const dailySpecials = [];
  const usedIndices = new Set<number>();
  const usedDates = new Set<string>(); // Track which dates we've used to avoid duplicates
  
  for (let i = 0; i < 30; i++) {
    // Calculate date in company timezone by adding days to today
    const date = new Date(today);
    date.setTime(today.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = getMountainTimeDateString(date, companyTimezone);
    
    // Skip Tuesdays - Taco Tuesday covers those days
    if (tuesdayDates.has(dateStr)) {
      continue;
    }
    
    // Skip if we've already used this date (shouldn't happen, but safety check)
    if (usedDates.has(dateStr)) {
      continue;
    }
    usedDates.add(dateStr);
    
    // Pick a random special that we haven't used recently
    // Use a rotating pattern to avoid too many repeats
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
          endDate: endDate, // Same as startDate to ensure single-day special
          image: null, // No default image - use gallery to assign images
          isActive: true,
        },
      });
      
      dailySpecials.push(special);
    } catch (error) {
      console.error(`❌ Failed to create special for ${dateStr}:`, error);
    }
  }
  
  console.log(`✅ Created ${dailySpecials.length} daily food specials for the next 30 days`);
  console.log(`✅ Created ${createdWeeklySpecials.length} weekly recurring specials (including Taco Tuesday)`);

  // Create sample events with upcoming dates
  // Reuse the 'today' variable already declared above, just reset hours
  today.setHours(0, 0, 0, 0);
  
  // Find next Monday for Poker Night
  const nextMonday = new Date(today);
  const daysUntilMonday = (1 - today.getDay() + 7) % 7 || 7; // 1 = Monday
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(19, 0, 0, 0); // 7 PM

  const pokerNight = await prisma.event.create({
    data: {
      title: 'Poker Night',
      description: 'Weekly poker tournament',
      startDateTime: nextMonday,
      endDateTime: new Date(nextMonday.getTime() + 4 * 60 * 60 * 1000), // 4 hours later (11 PM)
      venueArea: 'bar',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
      isAllDay: false,
      tags: JSON.stringify(['poker', 'weekly']),
      isActive: true,
    },
  });

  // Find next Friday for Karaoke
  const nextFriday = new Date(today);
  const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7; // 5 = Friday
  nextFriday.setDate(today.getDate() + daysUntilFriday);
  nextFriday.setHours(19, 0, 0, 0); // 7 PM

  const karaoke = await prisma.event.create({
    data: {
      title: 'Karaoke',
      description: 'Sing your favorite songs!',
      startDateTime: nextFriday,
      endDateTime: new Date(nextFriday.getTime() + 4 * 60 * 60 * 1000), // 4 hours later (11 PM)
      venueArea: 'stage',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=FR,SA',
      isAllDay: false,
      tags: JSON.stringify(['karaoke', 'weekly']),
      isActive: true,
    },
  });

  const createdEvents = [pokerNight, karaoke];
  console.log('✅ Created events:', { pokerNight, karaoke });

  // Create sample announcement
  console.log('');
  console.log('📢 Creating announcement...');
  let createdAnnouncements = [];
  try {
    const publishDate = new Date();
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7); // Expires 1 week from now
    
    const announcement = await prisma.announcement.create({
      data: {
        title: 'Welcome to Monaghan\'s!',
        body: 'We\'re excited to have you here. Come grab a cold drink and enjoy the warm atmosphere.',
        publishAt: publishDate,
        expiresAt: expireDate, // Required for calendar display
        isPublished: true,
        crossPostFacebook: false,
        crossPostInstagram: false,
      },
    });

    createdAnnouncements = [announcement];
    console.log('✅ Created announcement:', announcement);
  } catch (error: any) {
    console.error('❌ Failed to create announcement:', error.message || error);
    console.error('   Stack:', error.stack);
    // Continue seeding even if announcement creation fails
  }

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

  const createdSettings = [hours, contact, mapEmbed];
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

  const createdMenuSections = [startersSection, burgersSection, mexicanSection, saladsSection, addOnsSection, saucesSection];
  console.log('✅ Created menu sections:', { startersSection, burgersSection, mexicanSection, saladsSection, addOnsSection, saucesSection });

  // Create custom slides (image-based and text-based)
  console.log('');
  console.log('🖼️  Creating custom slides...');
  
  try {
    // Get the system user we created earlier (or find existing one)
    if (!systemUser) {
      systemUser = await prisma.user.findFirst({
        orderBy: {
          createdAt: 'asc',
        },
      });
    }

    if (!systemUser) {
      console.error('❌ No user found to associate with upload. Skipping custom slide creation.');
      console.error('   💡 Tip: Create a user first, or the seed script will create one automatically.');
    } else {
      console.log(`   👤 Using user: ${systemUser.email} (${systemUser.role})`);
      // Get or create signageConfig
      const signageConfig = await prisma.setting.findUnique({
        where: { key: 'signageConfig' },
      });

      const defaultConfig = {
        includeFoodSpecials: true,
        includeDrinkSpecials: true,
        includeHappyHour: true,
        includeEvents: true,
        eventsTileCount: 6,
        slideDurationSec: 10,
        fadeDurationSec: 0.8,
        customSlides: [],
      };

      let config: any = defaultConfig;
      if (signageConfig?.value) {
        try {
          config = typeof signageConfig.value === 'string' 
            ? JSON.parse(signageConfig.value) 
            : signageConfig.value;
          if (!Array.isArray(config.customSlides)) {
            config.customSlides = [];
          }
        } catch {
          config = defaultConfig;
        }
      }

      // 1. Create text-based slide
      console.log('   Creating text-based slide: Daily Specials Info...');
      try {
        const textSlideEntry = {
          id: 'seed-daily-specials-info',
          label: 'Custom',
          title: 'Daily Specials',
          subtitle: 'Check Out Our Specials',
          body: 'We offer rotating daily specials on food and drinks!\n\n• Fresh Food Specials Every Day\n• Drink Specials & Happy Hour\n• Weekly Events & Entertainment\n• Private Event Space Available',
          accent: 'accent' as const,
          footer: 'Ask your server about today\'s specials!',
          position: 2,
          isEnabled: true,
          slideType: 'text' as const,
        };

        config.customSlides.push(textSlideEntry);
        console.log('   ✅ Added text-based custom slide');
      } catch (error) {
        console.error('   ❌ Failed to create text-based slide:', error);
      }

      // Sort slides by position
      config.customSlides.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

      console.log(`   💾 Saving signageConfig with ${config.customSlides.length} custom slide(s)...`);
      console.log(`   📋 Custom slides:`, config.customSlides.map((s: any) => ({ id: s.id, title: s.title, type: s.slideType })));

      // Update the setting
      const savedSetting = await prisma.setting.upsert({
        where: { key: 'signageConfig' },
        update: {
          value: JSON.stringify(config),
        },
        create: {
          key: 'signageConfig',
          value: JSON.stringify(config),
          description: 'Digital signage configuration',
        },
      });

      // Verify it was saved
      const verifySetting = await prisma.setting.findUnique({
        where: { key: 'signageConfig' },
      });
      
      if (verifySetting) {
        const verifyConfig = JSON.parse(verifySetting.value as string);
        console.log(`   ✅ Verified: signageConfig saved with ${verifyConfig.customSlides?.length || 0} custom slide(s)`);
      } else {
        console.error('   ❌ ERROR: signageConfig was not saved!');
      }

      console.log(`✅ Created ${config.customSlides.length} custom slide(s) in signageConfig settings`);
    }
  } catch (error) {
    console.error('❌ Failed to create custom slides:', error);
  }

  // Summary
  console.log('');
  console.log('📊 Seeding Summary:');
  console.log(`   ✅ ${createdWeeklySpecials.length} weekly recurring specials (including Taco Tuesday food + drink)`);
  console.log(`   ✅ ${dailySpecials.length} daily food specials for the next 30 days (excluding Tuesdays)`);
  console.log(`   ✅ ${createdEvents.length} recurring events (Poker Night, Karaoke)`);
  console.log(`   ✅ ${createdAnnouncements.length} announcement${createdAnnouncements.length !== 1 ? 's' : ''}`);
  console.log(`   ✅ ${createdSettings.length} settings (hours, contact, map)`);
  console.log(`   ✅ ${createdMenuSections.length} menu sections with items`);
  console.log('');
  console.log('🎉 Database seeding completed! All old data has been cleared and replaced with fresh seed data.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

