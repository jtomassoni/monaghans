# E2E Test Data Management

## Overview

This document explains how test data is managed to ensure tests don't interfere with seed data used for manual QA.

## Seed Script for Manual QA

**Location**: `scripts/seed.ts`  
**Command**: `npm run db:seed`

The seed script:
- **Clears all existing data** (except users for auth)
- Creates comprehensive sample data:
  - Weekly recurring specials (food & drink)
  - Daily food specials for the next 30 days
  - Recurring events (Trivia Night, Live Music)
  - Announcements
  - Menu sections and items
  - Settings (hours, contact, map)

This is perfect for manual QA testing with realistic data.

## Test Data Cleanup

### Current Status

**Tests with cleanup** (using `TestDataTracker`):
- ✅ `events.spec.ts`
- ✅ `specials.spec.ts`
- ✅ `announcements.spec.ts`
- ✅ `menu-management.spec.ts`

**Tests that create data but need cleanup**:
- ⚠️ `datetime-flows.spec.ts` - Creates events but doesn't clean up
- ⚠️ `datepickers-forms.spec.ts` - Creates events but doesn't clean up
- ⚠️ Other tests may create data through UI interactions

### How Cleanup Works

1. **TestDataTracker**: Tracks entities created during tests
   - Default prefix: `"Test "` (configurable)
   - Tracks: events, specials, announcements, menu items, menu sections, users
   - Cleans up via API calls after each test

2. **Fallback cleanup**: Also cleans up by title prefix
   - Searches for items starting with the test prefix
   - Deletes any matching items (handles cases where tracking fails)

3. **Test data prefixes**:
   - `"Test "` - Default for most tests
   - `"E2E Test "` - Recommended for tests that might conflict
   - Seed data uses descriptive names (e.g., "Taco Tuesday", "Trivia Night")

### Ensuring Tests Don't Interfere with Seed Data

**Current approach**:
- Tests use prefixes like `"Test "` or `"E2E Test "`
- Seed data uses descriptive names
- Cleanup only targets test-prefixed items

**Recommendation**: 
- Use a consistent test prefix (e.g., `"E2E Test "`) for all test-created data
- Seed data should never start with test prefixes
- Tests should track all created entities and clean up in `afterEach`

## Workflow

### For Manual QA:
```bash
# 1. Seed the database with sample data
npm run db:seed

# 2. Manual testing in browser...
# All seed data remains intact
```

### For E2E Tests:
```bash
# 1. (Optional) Seed database first
npm run db:seed

# 2. Run tests - they create and clean up their own data
npm run test:e2e

# 3. After tests complete, seed data should still be intact
# (assuming tests properly clean up)
```

## Issues to Address

1. **Tests without cleanup**: Some tests create data but don't clean up
   - `datetime-flows.spec.ts` - Should add TestDataTracker
   - `datepickers-forms.spec.ts` - Should add TestDataTracker

2. **Inconsistent prefixes**: Some tests use different prefixes
   - Standardize on `"E2E Test "` prefix for all test data

3. **Missing tracking**: Tests that create data through UI may not track IDs
   - Need to extract IDs from API responses or page content
   - Or rely on prefix-based cleanup

## Recommendations

1. **Add cleanup to all tests that create data**:
   ```typescript
   let tracker: TestDataTracker;
   
   test.beforeEach(() => {
     tracker = new TestDataTracker('.auth/admin.json', 'E2E Test ');
   });
   
   test.afterEach(async () => {
     await tracker.cleanup();
   });
   ```

2. **Track created entities**:
   ```typescript
   // After creating via API
   const response = await fetch('/api/events', { ... });
   const event = await response.json();
   tracker.trackEvent(event.id);
   
   // Or after creating via UI (extract ID from response/page)
   ```

3. **Use consistent test prefix**: `"E2E Test "` for all test data

4. **Verify cleanup**: After running tests, verify seed data is still present

