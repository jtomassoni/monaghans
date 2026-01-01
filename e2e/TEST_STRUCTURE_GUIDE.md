# E2E Test Structure Guide

## Natural Workflow Cleanup

**Key Insight**: Most tests follow natural workflows (create → use → delete), which means they clean themselves up naturally. We should structure tests to leverage this.

## Test Structure Best Practices

### ✅ Preferred: Natural Workflow Tests

Structure tests to follow complete workflows when possible:

```typescript
test.describe('Announcements', () => {
  let createdId: string | null = null;
  
  test('should create, edit, and delete an announcement', async ({ page }) => {
    // 1. Create
    await page.goto('/admin/announcements');
    await page.click('button:has-text("New")');
    await page.fill('input[name="title"]', 'Test Announcement');
    await page.click('button[type="submit"]');
    
    // Capture ID for cleanup if needed
    const response = await page.waitForResponse(resp => 
      resp.url().includes('/api/announcements') && resp.request().method() === 'POST'
    );
    const data = await response.json();
    createdId = data.id;
    
    // 2. Edit (uses the created announcement)
    await page.click(`text=Test Announcement`);
    await page.fill('input[name="title"]', 'Test Announcement - Updated');
    await page.click('button[type="submit"]');
    
    // 3. Delete (cleans up the created announcement)
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm")');
    
    // Test is complete - data is cleaned up!
  });
});
```

### ✅ Alternative: Separate Tests with Shared State

If you need separate tests, use shared state to track what needs cleanup:

```typescript
test.describe('Announcements', () => {
  let tracker: TestDataTracker;
  
  test.beforeEach(() => {
    tracker = new TestDataTracker();
  });
  
  test.afterEach(async () => {
    // Safety net - cleans up if test failed or didn't complete workflow
    await tracker.cleanup();
  });
  
  test('should create an announcement', async ({ page }) => {
    // Create and track
    const id = await createAnnouncement(page);
    tracker.trackAnnouncement(id);
  });
  
  test('should edit an announcement', async ({ page }) => {
    // Uses seed data or creates new, edits it
    // If it creates new, track it for cleanup
  });
  
  test('should delete an announcement', async ({ page }) => {
    // Deletes seed data or test-created data
    // If it creates new to delete, that's perfect - self-cleaning!
  });
});
```

### ⚠️ When to Use TestDataTracker

Use `TestDataTracker` as a **safety net** for:

1. **Tests that only create** (don't test delete workflow):
   ```typescript
   test('should create event with complex recurrence', async ({ page }) => {
     // Creates event but doesn't test deletion
     // TestDataTracker ensures cleanup
   });
   ```

2. **Tests that might fail** before cleanup:
   ```typescript
   test('should handle edge case', async ({ page }) => {
     // Might fail before natural cleanup
     // TestDataTracker ensures cleanup even on failure
   });
   ```

3. **Tests that run in parallel** and can't share cleanup:
   ```typescript
   test('should handle concurrent operations', async ({ page }) => {
     // Creates data that other parallel tests might interfere with
     // TestDataTracker ensures isolated cleanup
   });
   ```

### ❌ Don't Rely on TestDataTracker Alone

**Avoid**: Using TestDataTracker as the primary cleanup mechanism when natural workflows work:

```typescript
// ❌ BAD: Creates and relies only on TestDataTracker
test('should create announcement', async ({ page }) => {
  const id = await createAnnouncement(page);
  tracker.trackAnnouncement(id);
  // No delete test - relies entirely on TestDataTracker
});

// ✅ GOOD: Creates and deletes as part of workflow
test('should create and delete announcement', async ({ page }) => {
  const id = await createAnnouncement(page);
  // ... test creation ...
  await deleteAnnouncement(page, id);
  // Self-cleaning! TestDataTracker is just safety net
});
```

## Test Patterns

### Pattern 1: Complete Workflow Test (Best)

```typescript
test('should manage announcement lifecycle', async ({ page }) => {
  // Create → Edit → Delete
  // Self-cleaning, TestDataTracker optional
});
```

### Pattern 2: Separate CRUD Tests (Good)

```typescript
test('should create announcement', async ({ page }) => {
  // Creates, tracks for cleanup
});

test('should edit announcement', async ({ page }) => {
  // Uses seed data or creates new
});

test('should delete announcement', async ({ page }) => {
  // Deletes seed data or test-created data
  // If creates new to delete, that's perfect!
});
```

### Pattern 3: Read-Only Tests (No Cleanup Needed)

```typescript
test('should display announcements', async ({ page }) => {
  // Only reads data, no cleanup needed
});
```

## What Can't Be Deleted?

From the codebase analysis, these entities have deletion restrictions:

1. **Admin Users**: Cannot be deleted (only non-admin users can be deleted)
2. **Menu Sections with Items**: Cannot be deleted until items are removed
3. **Assets in Use**: Cannot be deleted if used in slides/creatives
4. **Settings**: Can be updated but not deleted (recreated by seed)

For these cases, use TestDataTracker or structure tests to avoid creating restricted entities.

## Performance Impact

**Natural Workflow Cleanup**:
- ✅ Fast: Cleanup happens as part of test execution
- ✅ Reliable: Tests verify deletion works
- ✅ No overhead: No separate cleanup step needed

**TestDataTracker Cleanup**:
- ⚠️ Slower: Separate API calls after test
- ✅ Reliable: Safety net for failures
- ⚠️ Overhead: ~100-500ms per test

**Best Practice**: Use natural workflows when possible, TestDataTracker as safety net.

## Migration Strategy

For existing tests:

1. **Keep TestDataTracker** as safety net (already in place)
2. **Refactor tests** to follow natural workflows when possible
3. **Remove TestDataTracker** from tests that fully clean themselves up
4. **Keep TestDataTracker** for tests that only create or might fail

Example migration:

```typescript
// Before: Relies on TestDataTracker
test('should create announcement', async ({ page }) => {
  const id = await createAnnouncement(page);
  tracker.trackAnnouncement(id);
});

// After: Self-cleaning workflow
test('should create and delete announcement', async ({ page }) => {
  const id = await createAnnouncement(page);
  // ... verify creation ...
  await deleteAnnouncement(page, id);
  // No TestDataTracker needed!
});
```

## Summary

- **Primary**: Structure tests to follow natural workflows (create → use → delete)
- **Secondary**: Use TestDataTracker as safety net for edge cases
- **Result**: Faster tests, better coverage, self-cleaning data

