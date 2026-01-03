# Test Cleanup Requirements

## Overview

All E2E tests that create data must:
1. **Track created entities** using `TestDataTracker`
2. **Test edit functionality** for items they create
3. **Test delete functionality** for items they create
4. **Clean up after themselves** in `afterEach` hooks

## Current Status

### ✅ Tests with Proper Cleanup

- `announcements.spec.ts` - Uses TestDataTracker, tests edit/delete
- `events.spec.ts` - Uses TestDataTracker, tests edit/delete
- `specials.spec.ts` - Uses TestDataTracker, tests edit/delete
- `menu-management.spec.ts` - Uses TestDataTracker, tests edit/delete

### ⚠️ Tests Updated (Need Edit/Delete Tests)

- `datetime-flows.spec.ts` - ✅ Now tracks events, but needs edit/delete tests
- `timezone-handling.spec.ts` - ✅ Now tracks events, but needs edit/delete tests

### 🔍 Items Without Update/Delete Methods (Need Review)

The following entities may not have update/delete API endpoints. Please review:

1. **Ingredients** - Check if `/api/ingredients/[id]` supports PUT/DELETE
2. **Settings** - Check if `/api/settings` supports individual item updates/deletes
3. **Feature Flags** - Check if `/api/feature-flags` supports individual updates/deletes
4. **Signage Assets** - Check if `/api/signage/assets/[id]` supports DELETE
5. **Signage Campaigns** - Check if `/api/signage/campaigns/[id]` supports DELETE
6. **Signage Creatives** - Check if `/api/signage/creatives/[id]` supports DELETE
7. **Signage Slides** - Check if `/api/signage/slides/[id]` supports DELETE
8. **Uploads** - Check if uploads can be deleted
9. **Activity Logs** - Check if activity logs can be deleted (probably read-only)

## Implementation Guide

### For Tests That Create Data

```typescript
import { TestDataTracker, setupAutoTracking } from './test-helpers';

test.describe('My Tests', () => {
  let tracker: TestDataTracker;

  test.beforeEach(() => {
    tracker = new TestDataTracker('.auth/admin.json', 'Test ');
  });

  test.afterEach(async () => {
    await tracker.cleanup();
  });

  test('should create and manage item', async ({ page }) => {
    // Set up automatic tracking
    setupAutoTracking(page, tracker);

    // Create item
    // ... creation code ...

    // Test edit
    // ... edit code ...

    // Test delete
    // ... delete code ...
  });
});
```

### For Tests That Only Verify Existence

Tests that don't create data (e.g., checking homepage displays correctly) don't need tracking, but if they create any test data, they must clean it up.

## Global Cleanup

A global cleanup function runs after all tests to catch any remaining test data with prefixes:
- `Test `
- `E2E Test `
- `test-` (for generateTestId patterns)

This is a safety net, but tests should clean up their own data.

## Action Items

1. ✅ Add tracking to `datetime-flows.spec.ts` - DONE
2. ✅ Add tracking to `timezone-handling.spec.ts` - DONE
3. ⏳ Add edit/delete tests to `datetime-flows.spec.ts` - TODO
4. ⏳ Add edit/delete tests to `timezone-handling.spec.ts` - TODO
5. ⏳ Review items without update/delete methods - TODO
6. ⏳ Add cleanup for menu sections/items in all tests - TODO
7. ⏳ Add cleanup for specials (food and drink) in all tests - TODO

