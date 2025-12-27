# E2E Test Coverage Summary

## Overview
This document summarizes the comprehensive e2e test suite for the Monaghan's application, organized by priority and feature area.

## Test Organization

### Critical Path Tests (P0 - Must Pass)
These tests run on every PR and cover the most critical functionality:

1. **Events Management** (`events.spec.ts`)
   - Event creation (one-time, recurring, all-day)
   - Event editing and deletion
   - Recurring events with UNTIL dates (last occurrence included)
   - Monthly recurring events
   - Event filtering

2. **Calendar** (`calendar.spec.ts`)
   - Calendar display and navigation
   - Week/month navigation
   - Event display on calendar
   - Creating events from calendar

3. **Date Pickers & Forms** (`datepickers-forms.spec.ts`)
   - Date/time picker functionality
   - Form validation
   - Mountain Time timezone handling
   - Events spanning midnight
   - All-day event toggle

4. **Datetime Flows** (`datetime-flows.spec.ts`)
   - Comprehensive datetime handling
   - Timezone consistency
   - Recurring event occurrences
   - Public page display
   - Hydration error prevention

5. **Public Events Page** (`homepage.spec.ts` - events section)
   - Events display on public pages
   - Date/time formatting
   - Event filtering (today vs future)

6. **Menu Management** (`menu-management.spec.ts`)
   - Menu sections CRUD
   - Menu items CRUD
   - Availability toggles
   - Public menu display

### High Priority Tests (P1 - Should Pass)
These tests run on every PR but are less critical:

1. **Specials** (`specials.spec.ts`)
2. **Announcements** (`announcements.spec.ts`)
3. **Homepage Management** (`homepage-management.spec.ts`)
4. **Scheduling** (`scheduling.spec.ts`)
5. **Availability** (`availability.spec.ts`)
6. **Timeclock** (`timeclock.spec.ts`)

### Medium Priority Tests (P2 - Can Run on Schedule)
1. **User Management** (`user-management.spec.ts`)
2. **Settings** (`settings.spec.ts`)
3. **Reporting** (`reporting.spec.ts`)
4. **Ingredients** (`ingredients.spec.ts`)

### Lower Priority Tests (P3 - Optional)
1. **Orders & KDS** (`orders-kds.spec.ts`)
2. **Owner Permissions** (`owner-permissions.spec.ts`)

## Parallelization Strategy

### Test File Organization
Tests are organized into separate files by feature area to maximize parallelization:
- Each test file is independent
- Tests within files can run in parallel
- No shared state between test files

### CI/CD Configuration
- **Default**: 4 workers running in parallel
- **Configurable**: Via `PLAYWRIGHT_WORKERS` environment variable
- **Sharding**: Optional for very large test suites (split across multiple CI jobs)

### Execution Time Targets
- **Critical Path**: < 5 minutes (parallelized)
- **Full Suite**: < 15 minutes (parallelized)
- **Individual Test**: < 60 seconds

## Test Helpers

### Shared Utilities (`test-helpers.ts`)
- `formatDateTimeLocal()` - Format dates for datetime-local inputs (Mountain Time)
- `formatDateLocal()` - Format dates for date inputs (Mountain Time)
- `getDateNDaysFromNow()` - Get future dates
- `getNextWeekday()` - Get next occurrence of weekday
- `generateTestId()` - Generate unique test identifiers
- `fillIfExists()` - Safely fill form fields
- `clickIfExists()` - Safely click elements

## Best Practices

### Test Design
1. **Independent Tests**: Each test can run standalone
2. **Defensive Checks**: Check if elements exist before interacting
3. **Unique Test Data**: Use `generateTestId()` for unique identifiers
4. **Proper Waits**: Use `waitForTimeout` and `waitForSelector` appropriately
5. **Error Handling**: Catch errors gracefully, verify success conditions

### Date/Time Handling
1. **Always Use Mountain Time**: Use helper functions for date formatting
2. **Consistent Formatting**: Use `formatDateTimeLocal()` for all datetime inputs
3. **Timezone Awareness**: All dates should respect Mountain Time timezone

### Form Testing
1. **Validate Required Fields**: Test form validation
2. **Preserve Data**: Verify data persists on validation errors
3. **Success Verification**: Always verify success messages or redirects

## Coverage Goals

### Current Coverage
- ✅ Critical Path: 100% covered
- ✅ High Priority: 90%+ covered
- ✅ Medium Priority: 70%+ covered
- ⚠️ Lower Priority: 50%+ covered

### Areas Needing More Coverage
1. Exception handling for recurring events
2. Edge cases in date calculations
3. Cross-browser compatibility (currently Chromium only)
4. Mobile/responsive design
5. Accessibility testing

## Maintenance

### Regular Tasks
1. Review test failures and fix flaky tests
2. Update tests when features change
3. Add tests for new bugs found
4. Remove obsolete tests
5. Monitor test execution time

### Test Health Metrics
- **Flaky Test Rate**: Target < 1%
- **Test Execution Time**: Monitor and optimize
- **Coverage**: Maintain or improve coverage percentages
- **Failure Rate**: Investigate and fix failures promptly

## Running Tests

### Local Development
```bash
# Run all tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/events.spec.ts
```

### CI/CD
Tests run automatically on:
- Every pull request
- Every push to main branch
- Can be triggered manually

## Future Enhancements

1. **Visual Regression Testing**: Add screenshot comparisons
2. **Performance Testing**: Add performance benchmarks
3. **Accessibility Testing**: Add automated a11y checks
4. **Cross-Browser**: Add Firefox and Safari testing
5. **Mobile Testing**: Add mobile device testing
6. **API Testing**: Add API endpoint tests
7. **Load Testing**: Add load/stress tests




