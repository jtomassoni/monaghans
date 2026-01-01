import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fast database reset using TRUNCATE instead of DELETE
 * 
 * This is much faster than the seed script because:
 * 1. TRUNCATE is faster than DELETE (no row-by-row deletion)
 * 2. We don't recreate all the seed data - just clear it
 * 3. Tests rely on TestDataTracker to clean up their own data
 * 
 * This should only be used when we need a complete reset.
 * For normal test runs, rely on TestDataTracker cleanup.
 */
export async function fastResetDatabase(silent: boolean = false) {
  if (!silent) {
    console.log('🔄 Fast resetting database (TRUNCATE)...');
  }
  
  try {
    // Use raw SQL TRUNCATE for speed
    // Order matters - child tables first
    const truncateQueries = [
      // Child/junction tables first
      'TRUNCATE TABLE "OrderItem" CASCADE',
      'TRUNCATE TABLE "POSSaleItem" CASCADE',
      'TRUNCATE TABLE "MenuItemIngredient" CASCADE',
      'TRUNCATE TABLE "PurchaseOrderItem" CASCADE',
      'TRUNCATE TABLE "SupplierPricing" CASCADE',
      'TRUNCATE TABLE "LeadNote" CASCADE',
      'TRUNCATE TABLE "LeadContact" CASCADE',
      'TRUNCATE TABLE "ActivityLog" CASCADE',
      'TRUNCATE TABLE "Shift" CASCADE',
      'TRUNCATE TABLE "Schedule" CASCADE',
      'TRUNCATE TABLE "EmployeeAvailability" CASCADE',
      'TRUNCATE TABLE "ShiftRequirement" CASCADE',
      'TRUNCATE TABLE "WeeklyScheduleTemplate" CASCADE',
      
      // Parent tables
      'TRUNCATE TABLE "Order" CASCADE',
      'TRUNCATE TABLE "POSSale" CASCADE',
      'TRUNCATE TABLE "POSIntegration" CASCADE',
      'TRUNCATE TABLE "PrivateDiningLead" CASCADE',
      'TRUNCATE TABLE "Event" CASCADE',
      'TRUNCATE TABLE "Special" CASCADE',
      'TRUNCATE TABLE "Announcement" CASCADE',
      'TRUNCATE TABLE "PostQueue" CASCADE',
      'TRUNCATE TABLE "FacebookPost" CASCADE',
      'TRUNCATE TABLE "MenuItem" CASCADE',
      'TRUNCATE TABLE "MenuSection" CASCADE',
      'TRUNCATE TABLE "Ingredient" CASCADE',
      'TRUNCATE TABLE "SupplierProduct" CASCADE',
      'TRUNCATE TABLE "SupplierConnection" CASCADE',
      'TRUNCATE TABLE "Supplier" CASCADE',
      'TRUNCATE TABLE "PurchaseOrder" CASCADE',
      'TRUNCATE TABLE "Employee" CASCADE',
      'TRUNCATE TABLE "FeatureFlag" CASCADE',
      'TRUNCATE TABLE "Setting" CASCADE',
    ];
    
    // Execute all truncates in parallel for speed
    await Promise.all(
      truncateQueries.map(query => 
        prisma.$executeRawUnsafe(query).catch((error: any) => {
          // Ignore errors for tables that don't exist
          if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
            return;
          }
          throw error;
        })
      )
    );
    
    // Try to truncate digital signage tables (may not exist)
    const signageQueries = [
      'TRUNCATE TABLE "Slide" CASCADE',
      'TRUNCATE TABLE "AdCreative" CASCADE',
      'TRUNCATE TABLE "AdCampaign" CASCADE',
      'TRUNCATE TABLE "Asset" CASCADE',
      'TRUNCATE TABLE "Upload" CASCADE',
    ];
    
    await Promise.allSettled(
      signageQueries.map(query => prisma.$executeRawUnsafe(query))
    );
    
    if (!silent) {
      console.log('✅ Database fast reset complete');
    }
  } catch (error) {
    console.error('❌ Fast reset failed, falling back to seed script');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Check if database needs reset by looking for test data
 */
export async function isDatabaseDirty(): Promise<boolean> {
  try {
    // Check for test-prefixed data
    const [testEvents, testSpecials, testAnnouncements] = await Promise.all([
      prisma.event.findFirst({
        where: {
          title: {
            startsWith: 'Test ',
          },
        },
      }),
      prisma.special.findFirst({
        where: {
          title: {
            startsWith: 'Test ',
          },
        },
      }),
      prisma.announcement.findFirst({
        where: {
          title: {
            startsWith: 'Test ',
          },
        },
      }),
    ]);
    
    return !!(testEvents || testSpecials || testAnnouncements);
  } catch (error) {
    // If check fails, assume dirty to be safe
    return true;
  } finally {
    await prisma.$disconnect();
  }
}

