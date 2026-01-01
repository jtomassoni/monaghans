# E2E Test Database Optimization

## Performance Optimizations

### 1. **Removed Per-File Resets** ✅

**Before**: Database was reset (via seed script) before every test file
- **Time cost**: ~5-10 seconds per test file × 24 files = 2-4 minutes
- **Problem**: Seed script is expensive (deletes all data, recreates everything)

**After**: Database is only seeded once at the start (global setup)
- **Time saved**: ~2-4 minutes per test run
- **How it works**: 
  - Global setup runs seed script once before all tests
  - Tests use `TestDataTracker` to clean up their own data
  - Only reset if database is detected as dirty

### 2. **Conditional Seed Execution** ✅

**Before**: Always ran seed script in global setup

**After**: Only runs seed if database is dirty (has test data)
- Checks for test-prefixed data before seeding
- Skips expensive seed operation if database is already clean
- **Time saved**: ~10-30 seconds when database is already clean

### 3. **Fast Reset Option** (Available but not used by default)

Created `db-reset-fast.ts` with TRUNCATE-based reset:
- **TRUNCATE** is ~10x faster than DELETE
- Doesn't recreate seed data (just clears)
- Useful for manual resets or CI optimization

## Current Approach

### Test Execution Flow

1. **Global Setup** (runs once before all tests):
   - Checks if database is dirty
   - If dirty: Runs seed script to establish clean state
   - If clean: Skips seed (saves time)

2. **Test Execution**:
   - **Primary**: Tests follow natural workflows (create → use → delete) and clean themselves up
   - **Secondary**: `TestDataTracker` acts as safety net for:
     - Tests that only create (don't test delete)
     - Tests that fail before cleanup
     - Edge cases where deletion isn't part of workflow
   - Seed data remains untouched

### Why This Works

**Reliability**: 
- Tests follow natural workflows (create → use → delete) and clean themselves up
- `TestDataTracker` is a safety net for edge cases
- Tests use prefixes like "Test " or "E2E Test " to identify their data
- Seed data uses descriptive names (no test prefixes)

**Performance**:
- No expensive seed script runs between files
- Natural workflow cleanup is fast (happens during test execution)
- `TestDataTracker` cleanup is only needed for edge cases
- Parallel test execution isn't blocked by resets

**Simplicity**:
- Tests structure themselves to clean up naturally
- `TestDataTracker` is optional (safety net only)
- No special fixtures or setup required
- Works with standard Playwright test structure

**Key Insight**: Most app entities can be deleted, so tests that follow natural workflows (create → edit → delete) naturally clean themselves up. `TestDataTracker` is just a safety net.

## Further Optimization Options

### Option 1: Database Snapshots (CI Only)

For CI/CD environments, could use database snapshots:
- Create snapshot after seed
- Restore snapshot instead of seeding
- **Time saved**: ~5-10 seconds per restore vs ~30-60 seconds per seed

**Implementation**:
```typescript
// In CI, after seed:
await prisma.$executeRawUnsafe('CREATE DATABASE test_snapshot AS TEMPLATE test_db');

// Before tests:
await prisma.$executeRawUnsafe('DROP DATABASE test_db');
await prisma.$executeRawUnsafe('CREATE DATABASE test_db TEMPLATE test_snapshot');
```

### Option 2: Parallel Seed Data Creation

Optimize seed script to create data in parallel:
- Currently creates data sequentially
- Could parallelize independent data creation
- **Time saved**: ~10-20 seconds

### Option 3: Use TRUNCATE in Seed Script

Replace `deleteMany()` with `TRUNCATE` in seed script:
- Much faster for clearing data
- **Time saved**: ~5-10 seconds per seed

## Performance Metrics

### Current Performance (Optimized)

- **Global setup**: ~30-60 seconds (only if dirty)
- **Per test cleanup**: ~100-500ms (TestDataTracker)
- **Total overhead**: ~1-2 minutes for full test suite

### Previous Performance (Unoptimized)

- **Global setup**: ~30-60 seconds (always)
- **Per-file reset**: ~5-10 seconds × 24 files = 2-4 minutes
- **Total overhead**: ~3-5 minutes for full test suite

### Improvement

- **Time saved**: ~2-3 minutes per test run
- **CI/CD impact**: Significant reduction in deployment time
- **Local development**: Faster feedback loop

## Best Practices

1. **Structure tests to follow natural workflows** (Primary):
   ```typescript
   test('should create, edit, and delete announcement', async ({ page }) => {
     // Create → Edit → Delete
     // Self-cleaning! No TestDataTracker needed
   });
   ```

2. **Use TestDataTracker as safety net** (Secondary):
   ```typescript
   let tracker: TestDataTracker;
   test.beforeEach(() => { tracker = new TestDataTracker(); });
   test.afterEach(async () => { await tracker.cleanup(); });
   ```
   Only needed for:
   - Tests that only create (don't test delete)
   - Tests that might fail before cleanup
   - Edge cases where deletion isn't part of workflow

3. **Use consistent test prefixes**:
   - Default: `"Test "`
   - For e2e: `"E2E Test "`
   - Don't use seed data names

4. **Track entities when needed**:
   - Track entities you create but don't delete
   - Optional if test follows complete workflow

5. **Don't rely on between-file resets**:
   - Tests should be independent
   - Clean up your own data (preferably as part of workflow)
   - Don't assume clean state between files

## Troubleshooting

### Tests failing due to leftover data

- Check that `TestDataTracker` is being used
- Verify cleanup is running in `afterEach`
- Check for test data with wrong prefixes

### Database not resetting when needed

- Global setup checks for dirty database
- If seed isn't running, database might be clean
- Manually run `npm run db:seed` if needed

### Slow test execution

- Check if seed script is running multiple times
- Verify TestDataTracker cleanup is working
- Consider using fast reset for manual cleanup

