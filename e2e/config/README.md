# E2E Test Configuration

This directory contains the configuration system for managing which e2e tests run.

## Structure

- **`test.config.ts`** - Single configuration file with all test specs grouped by feature area
- **`index.ts`** - Central export for test configuration functions

Note: Test metadata (feature area, description) now lives in each test spec file itself as an exported `testMetadata` object.

## Feature Areas

Tests are organized into the following feature areas in `test.config.ts`:

- **Content** - Announcements, events, specials, homepage, calendar, timezone handling
- **Operations** - Menu, ingredients, orders, KDS
- **Staff** - Scheduling, timeclock, availability
- **Analytics** - Reporting
- **Administration** - Settings, permissions
- **UI Components** - Date pickers, forms

## Enabling/Disabling Tests

To enable or disable a test spec, edit `test.config.ts`:

```typescript
// e2e/config/test.config.ts
export const testConfig = {
  content: {
    announcements: true,  // ✅ Test will run
    events: false,       // ⏭️  Test will be skipped
    // ...
  },
  // ...
} as const;
```

## How It Works

1. All test configs are in a single `test.config.ts` file, grouped by feature area
2. The `index.ts` file exports helper functions to query the config
3. `playwright.config.ts` reads the config and filters tests using `testMatch` patterns
4. Disabled tests are completely excluded from test execution

## Example: Disabling a Test

To disable the `scheduling` test:

1. Open `e2e/config/test.config.ts`
2. Find the `staff` section
3. Change `scheduling: true` to `scheduling: false`
4. Run tests - the scheduling spec will be skipped

## Viewing Test Status

When you run tests, the config system will log:
- Number of enabled test specs
- Number of skipped test specs
- List of skipped spec names

## Adding New Tests

When adding a new test spec:

1. **Add metadata export** to your new test file:
   ```typescript
   // e2e/my-new-test.spec.ts
   import { test, expect } from '@playwright/test';
   import { TestMetadata } from './test-metadata';

   export const testMetadata: TestMetadata = {
     specName: 'my-new-test',
     featureArea: 'content', // or appropriate area
     description: 'What this test covers',
   };
   ```

2. **Add config flag** to the appropriate feature group in `e2e/config/test.config.ts`:
   ```typescript
   export const testConfig = {
     content: {
       // ... existing tests
       'my-new-test': true,
     },
     // ...
   } as const;
   ```

3. The test will automatically be included in test execution

