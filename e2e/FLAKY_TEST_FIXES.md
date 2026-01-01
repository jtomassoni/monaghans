# Flaky Test Detection and Fixes

## Overview

This document describes the improvements made to detect and fix flaky tests in the e2e test suite.

## Changes Made

### 1. Deterministic Wait Helpers (`test-helpers.ts`)

Added new helper functions to replace non-deterministic `waitForTimeout()` calls:

- **`waitForNetworkIdle(page, timeout)`**: Waits for network to be idle (no pending requests)
- **`waitForSuccessMessage(page, timeout)`**: Waits for success toast/notification with multiple selector fallbacks
- **`waitForFormSubmission(page, options)`**: Comprehensive form submission wait that:
  - Waits for network idle
  - Waits for success message
  - Optionally waits for modal to close
- **`waitForElementWithRetry(page, selector, options)`**: Retries element waits with configurable retries
- **`ensureSeedDataExists(page, type, minCount)`**: Verifies seed data exists before tests that depend on it

### 2. Fixed Flaky Tests

#### `menu-management.spec.ts:123` - Create Menu Item
- **Issue**: Used `waitForTimeout(2000)` then checked for toast with only 3s timeout
- **Fix**: Replaced with `waitForFormSubmission()` which waits for network idle + success message deterministically

#### `announcements.spec.ts:118` - Edit Announcement
- **Issue**: Multiple `waitForTimeout()` calls and retry loops
- **Fix**: 
  - Added `ensureSeedDataExists()` check
  - Replaced timeout-based waits with `waitForNetworkIdle()`
  - Replaced retry loop with `waitForFormSubmission()`

#### `events.spec.ts:193` - Recurring Event with UNTIL
- **Issue**: Multiple `waitForTimeout()` calls and non-deterministic event checking
- **Fix**:
  - Replaced timeout waits with `waitForFormSubmission()`
  - Improved event appearance checking with retry logic
  - Better scrolling and waiting strategy

### 3. Flaky Test Detection Script

Created `e2e/detect-flaky-tests.ts` to automatically detect flaky tests by running them multiple times.

## Usage

### Running Flaky Test Detection

```bash
# Run all tests 5 times (default)
tsx e2e/detect-flaky-tests.ts

# Run specific test file 5 times
tsx e2e/detect-flaky-tests.ts e2e/announcements.spec.ts

# Run specific test file 10 times
tsx e2e/detect-flaky-tests.ts e2e/events.spec.ts 10
```

The script will:
1. Run the specified tests multiple times
2. Track pass/fail rates for each test
3. Identify flaky tests (tests that don't pass 100% of the time)
4. Report flaky tests sorted by failure rate

### Using Deterministic Wait Helpers

Instead of:
```typescript
await page.waitForTimeout(2000);
const success = await toast.isVisible({ timeout: 3000 });
```

Use:
```typescript
const success = await waitForFormSubmission(page, {
  waitForNetworkIdle: true,
  waitForSuccess: true,
  waitForModalClose: true,
  timeout: 10000,
});
```

### Ensuring Seed Data Exists

For tests that depend on seed data:
```typescript
test('should edit existing item', async ({ page }) => {
  // Check seed data exists before test
  const hasSeedData = await ensureSeedDataExists(page, 'announcement', 1);
  if (!hasSeedData) {
    console.warn('⚠️  No seed data found - test may fail');
  }
  
  // ... rest of test
});
```

## Best Practices

1. **Avoid `waitForTimeout()`**: Use deterministic waits like `waitForNetworkIdle()` or `waitForFormSubmission()`
2. **Use `waitForFormSubmission()`**: For any form submission, use this helper instead of manual timeout + success check
3. **Check seed data**: If your test depends on seed data existing, use `ensureSeedDataExists()` in `beforeEach` or at test start
4. **Use retries wisely**: `waitForElementWithRetry()` is better than manual retry loops
5. **Test in parallel**: Run tests multiple times to catch flakiness before merging

## Test Isolation

Tests should:
- Use `TestDataTracker` to clean up their own data
- Not depend on other tests' data
- Use deterministic waits instead of timeouts
- Check for seed data if they depend on it

## Monitoring

Run the flaky test detection script periodically (e.g., in CI or before releases) to catch new flaky tests:

```bash
# In CI or pre-release
tsx e2e/detect-flaky-tests.ts
```

If flaky tests are detected, the script exits with code 1, which can fail CI builds.

## CI/CD Error Output

### Enhanced Error Messages

All helper functions now provide detailed error messages for CI/CD environments:

- **Context**: What the test was trying to do
- **URL**: Current page URL when error occurred
- **Timing**: How long operations took
- **Diagnostics**: Common causes and solutions
- **Artifacts**: References to screenshots/videos

### Error Format

Errors now include:
```
❌ [Operation] failed: [context]
   Time elapsed: [ms]
   URL: [url]
   This usually means:
   - [Common cause 1]
   - [Common cause 2]
   Check screenshot/video for visual context
```

### Capturing Errors

Use `captureErrors()` at the start of tests to capture console errors and network failures:

```typescript
import { captureErrors, formatErrorsForCI } from './test-helpers';

test('my test', async ({ page }) => {
  const errors = captureErrors(page);
  
  // ... test code ...
  
  // If test fails, errors are automatically included
  // Or manually check:
  if (errors.consoleErrors.length > 0 || errors.networkFailures.length > 0) {
    throw new Error(`Test failed with errors:${formatErrorsForCI(errors.consoleErrors, errors.networkFailures)}`);
  }
});
```

### CI Artifacts

The Playwright config is set to capture:
- **Screenshots**: On every failure (`only-on-failure`)
- **Videos**: On failure in CI (`retain-on-failure`)
- **Traces**: Always in CI (`on`) for full debugging

These artifacts are automatically uploaded in Vercel CI and can be downloaded from the test report.

