/**
 * Optimized test fixtures for e2e tests
 * 
 * OPTIMIZATION: We no longer reset between test files.
 * Instead, we rely on:
 * 1. Global setup runs seed script once before all tests
 * 2. TestDataTracker cleans up test-created data after each test
 * 
 * This is much faster because:
 * - No expensive seed script runs between test files
 * - Tests clean up only their own data (targeted cleanup)
 * - Seed script only runs once at the start (or if database is dirty)
 * 
 * Usage: Import `test` and `expect` from this file (same as '@playwright/test')
 * 
 * Example:
 * ```typescript
 * import { test, expect } from './fixtures';
 * import { TestDataTracker } from './test-helpers';
 * 
 * test.describe('My Tests', () => {
 *   let tracker: TestDataTracker;
 *   
 *   test.beforeEach(() => {
 *     tracker = new TestDataTracker();
 *   });
 *   
 *   test.afterEach(async () => {
 *     await tracker.cleanup(); // Cleans up test data
 *   });
 *   
 *   test('my test', async ({ page }) => {
 *     // Database is in seed state, test creates data, cleanup handles it
 *   });
 * });
 * ```
 */

import { test as base } from '@playwright/test';

// No longer resetting between files - rely on TestDataTracker cleanup
// This is much faster and more efficient
export const test = base;

export { expect } from '@playwright/test';

