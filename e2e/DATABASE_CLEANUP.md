# Database Cleanup for E2E Tests

## Overview

The e2e test suite ensures a clean, consistent database state by:

1. **Global Setup**: Conditionally runs the seed script before all tests (only if database is dirty)
2. **Test Data Cleanup**: Each test cleans up its own data using `TestDataTracker`

**OPTIMIZED APPROACH**: We no longer reset between test files. This saves 2-4 minutes per test run while maintaining reliability through targeted cleanup.

This ensures that:
- Every test run starts with a known database state (from seed script)
- Tests clean up only their own data (fast, targeted cleanup)
- Tests don't interfere with each other
- The database state matches what you'd get after running `npm run db:seed`

## How It Works

### 1. Global Setup (`e2e/global-setup.ts`)

Before any tests run, Playwright executes the global setup which:
- Runs `npm run db:seed` to clear all data and create fresh seed data
- Ensures the database is in a known state before any tests execute

This is configured in `playwright.config.ts`:
```typescript
globalSetup: require.resolve('./e2e/global-setup.ts'),
```

### 2. Test Data Cleanup (No Per-File Reset)

**OPTIMIZATION**: We no longer reset between test files. Instead:

- Each test uses `TestDataTracker` to track and clean up its own data
- Tests use prefixes like `"Test "` or `"E2E Test "` to identify their data
- Seed data remains untouched (uses descriptive names, no test prefixes)

**Standard approach** (recommended):

```typescript
import { test, expect } from '@playwright/test';
import { TestDataTracker } from './test-helpers';

test.describe('My Tests', () => {
  let tracker: TestDataTracker;
  
  test.beforeEach(() => {
    tracker = new TestDataTracker();
  });
  
  test.afterEach(async () => {
    await tracker.cleanup(); // Cleans up test-created data
  });
  
  test('my test', async ({ page }) => {
    // Create test data - tracker will clean it up
  });
});
```

**Why this is better**:
- **Faster**: No expensive seed script runs between files (~2-4 minutes saved)
- **Targeted**: Only cleans up test data, not all data
- **Reliable**: TestDataTracker ensures cleanup happens
- **Simple**: Standard Playwright pattern, no special fixtures needed

## Seed Script

The seed script (`scripts/seed.ts`) does the following:

1. **Clears all existing data** in the correct order (respecting foreign key constraints)
2. **Creates fresh seed data**:
   - Weekly recurring specials (Taco Tuesday, etc.)
   - Daily food specials for the next 30 days
   - Recurring events (Poker Night, Karaoke)
   - Announcements
   - Menu sections and items
   - Settings (hours, contact, map)
   - Feature flags

## Running Tests

### Local Development

```bash
# The seed script runs automatically before tests
npm run test:e2e
```

### CI/CD (Vercel)

The global setup runs automatically in CI. Make sure:
- `DATABASE_URL` or `TEST_DATABASE_URL` is set
- The seed script can access the database
- `npm run db:seed` works in your CI environment

## Manual Database Reset

If you need to manually reset the database to seed state:

```bash
npm run db:seed
```

Or programmatically:

```typescript
import { resetDatabaseToSeedState } from './e2e/db-reset';

await resetDatabaseToSeedState();
```

## Test Data Cleanup

**CRITICAL**: All tests must use `TestDataTracker` to clean up their own data:

```typescript
import { TestDataTracker } from './test-helpers';

let tracker: TestDataTracker;

test.beforeEach(() => {
  tracker = new TestDataTracker();
});

test.afterEach(async () => {
  await tracker.cleanup(); // Cleans up test-created data
});
```

**Why this is required**:
- Global setup only seeds once (or if database is dirty)
- No per-file resets means tests must clean up their own data
- `TestDataTracker` ensures reliable cleanup of test-created entities
- Seed data remains untouched (no test prefixes)

**Performance**: This approach is much faster than resetting between files while maintaining the same reliability.

## Troubleshooting

### Database not resetting between tests

- Check that `globalSetup` is configured in `playwright.config.ts`
- Verify the seed script runs successfully (check test output)
- Ensure `DATABASE_URL` or `TEST_DATABASE_URL` is set correctly

### Seed script fails

- Check database connection
- Verify all migrations have been run
- Check that the seed script has necessary permissions

### Tests interfering with each other

- Ensure you're using the `dbReset` fixture or calling `resetDatabaseOncePerFile()`
- Check that test data cleanup is working (TestDataTracker)
- Verify the seed script creates all necessary data

