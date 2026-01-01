import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Global setup that runs before all tests
 * 
 * This runs the seed script to establish a clean database state
 * before any tests run. The seed script:
 * 1. Clears all existing data
 * 2. Creates fresh seed data (specials, events, announcements, menu items, etc.)
 * 
 * This ensures every test run starts with a known, consistent database state.
 * 
 * Optimization: Only runs seed if database is dirty (has test data from previous run)
 */
async function globalSetup() {
  console.log('🌱 Running global setup: Seeding database...');
  console.log('   This ensures all tests start with a clean, known database state.');
  console.log('   All existing data (manual test data, previous automation data, etc.) will be cleared.');
  console.log('');
  
  try {
    // Always run seed script to ensure clean state
    // This clears ALL data (manual test data, previous automation data, etc.)
    // and creates fresh seed data
    execSync('npm run db:seed', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        // Ensure we use the test database if TEST_DATABASE_URL is set
        DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    });
    
    console.log('');
    console.log('✅ Global setup complete: Database seeded and ready for tests');
    console.log('');
  } catch (error) {
    console.error('❌ Global setup failed: Error seeding database');
    console.error(error);
    throw error;
  }
}

export default globalSetup;

