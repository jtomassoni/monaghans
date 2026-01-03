/**
 * Global teardown for E2E tests
 * 
 * This runs after all tests complete to clean up any remaining test data
 * that might have been missed by individual test cleanup.
 */

import { cleanupByTitlePrefix } from './test-helpers';

async function globalTeardown() {
  console.log('\n🧹 Running global teardown: Cleaning up any remaining test data...');
  
  const prefixes = ['Test ', 'E2E Test ', 'test-', 'Food TV', 'Drink TV', 'Food Only'];
  let totalCleaned = 0;

  for (const prefix of prefixes) {
    // Clean up events
    const eventsCleaned = await cleanupByTitlePrefix('event', prefix, '.auth/admin.json');
    totalCleaned += eventsCleaned;
    if (eventsCleaned > 0) {
      console.log(`  ✅ Cleaned up ${eventsCleaned} event(s) with prefix "${prefix}"`);
    }

    // Clean up specials
    const specialsCleaned = await cleanupByTitlePrefix('special', prefix, '.auth/admin.json');
    totalCleaned += specialsCleaned;
    if (specialsCleaned > 0) {
      console.log(`  ✅ Cleaned up ${specialsCleaned} special(s) with prefix "${prefix}"`);
    }

    // Clean up announcements
    const announcementsCleaned = await cleanupByTitlePrefix('announcement', prefix, '.auth/admin.json');
    totalCleaned += announcementsCleaned;
    if (announcementsCleaned > 0) {
      console.log(`  ✅ Cleaned up ${announcementsCleaned} announcement(s) with prefix "${prefix}"`);
    }

    // Clean up menu sections (must be before menu items due to dependencies)
    const menuSectionsCleaned = await cleanupByTitlePrefix('menuSection', prefix, '.auth/admin.json');
    totalCleaned += menuSectionsCleaned;
    if (menuSectionsCleaned > 0) {
      console.log(`  ✅ Cleaned up ${menuSectionsCleaned} menu section(s) with prefix "${prefix}"`);
    }

    // Clean up menu items
    const menuItemsCleaned = await cleanupByTitlePrefix('menuItem', prefix, '.auth/admin.json');
    totalCleaned += menuItemsCleaned;
    if (menuItemsCleaned > 0) {
      console.log(`  ✅ Cleaned up ${menuItemsCleaned} menu item(s) with prefix "${prefix}"`);
    }
  }

  if (totalCleaned > 0) {
    console.log(`\n✅ Global teardown complete: Cleaned up ${totalCleaned} test item(s)`);
  } else {
    console.log('\n✅ Global teardown complete: No test data to clean up');
  }
}

export default globalTeardown;

