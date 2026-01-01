# E2E Test Configuration System

## Overview

A metadata and configuration system has been created to organize e2e tests by feature area and control which tests run.

## Structure

```
e2e/
├── config/
│   ├── test.config.ts            # Single config file with all tests grouped by feature
│   ├── test-metadata.ts          # Metadata system grouping specs by feature (reference)
│   ├── index.ts                  # Central export for config functions
│   └── README.md                  # Configuration documentation
└── *.spec.ts                      # Test spec files
```

## Feature Areas

Tests are organized into 6 feature areas:

### 1. Content (`content.config.ts`)
- `announcements` - Announcements management
- `events` - Events management
- `specials` - Specials management
- `specials-tv` - Specials TV display
- `homepage` - Public homepage
- `homepage-management` - Homepage admin
- `calendar` - Calendar view
- `datetime-flows` - DateTime handling
- `timezone-handling` - Timezone conversion

### 2. Operations (`operations.config.ts`)
- `menu` - Public menu display
- `menu-management` - Menu admin
- `ingredients` - Ingredients management
- `orders-kds` - KDS and order management

### 3. Staff (`staff.config.ts`)
- `scheduling` - Staff scheduling
- `timeclock` - Timeclock functionality
- `availability` - Employee availability

### 4. Analytics (`analytics.config.ts`)
- `reporting` - Reporting dashboard

### 5. Administration (`administration.config.ts`)
- `settings` - Application settings
- `user-management` - User accounts
- `owner-permissions` - Owner role permissions

### 6. UI Components (`ui-components.config.ts`)
- `datepickers-forms` - Date pickers and forms

## How to Enable/Disable Tests

### Edit the Config File

Open `e2e/config/test.config.ts` and set the boolean for the test you want to enable/disable:

```typescript
// e2e/config/test.config.ts
export const testConfig = {
  staff: {
    scheduling: true,   // ✅ Will run
    timeclock: false,   // ⏭️  Will be skipped
    availability: true, // ✅ Will run
  },
  // ...
} as const;
```

### Using Helper Functions

You can also use the helper functions programmatically:

```typescript
import { isTestEnabled, getEnabledTestSpecs, getDisabledTestSpecs } from './e2e/config';

// Check if a specific test is enabled
if (isTestEnabled('scheduling')) {
  // ...
}

// Get all enabled specs
const enabled = getEnabledTestSpecs();

// Get all disabled specs
const disabled = getDisabledTestSpecs();
```

## How It Works

1. **Config File**: Single `test.config.ts` file with all tests grouped by feature area
2. **Helper Functions**: Functions to query enabled/disabled status
3. **Playwright Config**: Reads the config and filters tests using `testMatch` patterns
4. **Test Execution**: Only enabled tests are included in the test run

## Example: Disabling a Test

To disable the `scheduling` test:

1. Open `e2e/config/test.config.ts`
2. Find the `staff` section
3. Change `scheduling: true` to `scheduling: false`
4. Save the file
5. Run tests - the scheduling spec will be skipped

When you run tests, you'll see:
```
📋 Test Configuration:
   ✅ Enabled: 20 test specs
   ⏭️  Skipped: 1 test specs
   Skipped specs: scheduling
```

## Adding New Tests

When adding a new test spec:

1. **Add metadata** to `e2e/config/test-metadata.ts` (optional, for reference):
   ```typescript
   {
     specName: 'my-new-test',
     specPath: 'e2e/my-new-test.spec.ts',
     featureArea: 'content', // or appropriate area
     description: 'What this test covers',
     enabled: true,
   }
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

## Benefits

- ✅ **Organized**: Tests grouped by feature area
- ✅ **Flexible**: Easy to enable/disable individual tests
- ✅ **Transparent**: Clear visibility of which tests are running
- ✅ **Maintainable**: Centralized configuration
- ✅ **Fast**: Disabled tests are completely excluded (not just skipped)

## Metadata System

The `test-metadata.ts` file provides additional metadata about each test:
- Feature area grouping
- Descriptions
- File paths
- Default enabled status

This metadata can be used for:
- Test reporting
- Documentation generation
- Test organization tools
- CI/CD pipeline configuration

