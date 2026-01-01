import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Reset the database to seed state by running the seed script
 * 
 * This function can be called between test specs to ensure
 * the database returns to the clean seed state.
 * 
 * @param silent - If true, suppress console output
 */
export async function resetDatabaseToSeedState(silent: boolean = false) {
  if (!silent) {
    console.log('🔄 Resetting database to seed state...');
  }
  
  try {
    // Run the seed script to reset database
    execSync('npm run db:seed', {
      stdio: silent ? 'pipe' : 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        // Ensure we use the test database if TEST_DATABASE_URL is set
        DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    });
    
    if (!silent) {
      console.log('✅ Database reset to seed state');
    }
  } catch (error) {
    console.error('❌ Failed to reset database to seed state');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Check if database is in seed state by checking for seed data
 * 
 * This is a lightweight check that doesn't require running the full seed script.
 * It checks for the presence of known seed data markers.
 */
export async function isDatabaseInSeedState(): Promise<boolean> {
  try {
    // Check for seed data markers:
    // - Taco Tuesday special (weekly recurring)
    // - At least one menu section
    // - At least one setting
    
    const [tacoTuesday, menuSections, settings] = await Promise.all([
      prisma.special.findFirst({
        where: {
          title: {
            contains: 'Taco Tuesday',
          },
        },
      }),
      prisma.menuSection.count(),
      prisma.setting.count(),
    ]);
    
    // If we have Taco Tuesday, menu sections, and settings, we're likely in seed state
    return !!(tacoTuesday && menuSections > 0 && settings > 0);
  } catch (error) {
    console.error('Error checking database state:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

