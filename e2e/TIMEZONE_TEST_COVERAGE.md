# Timezone Test Coverage

## Overview
This document outlines the comprehensive e2e test coverage for timezone and date/time handling functionality.

## Test Files

### 1. `timezone-handling.spec.ts` (NEW)
Comprehensive timezone-specific tests covering:
- ✅ Event creation and homepage hero display verification
- ✅ Calendar display with correct timezone
- ✅ Date preservation when editing events (no timezone shift)
- ✅ Date boundary handling (11:59 PM to 12:00 AM)
- ✅ Public events page display with timezone
- ✅ Recurring events with correct timezone across occurrences
- ✅ Homepage hero section timezone verification
- ✅ Calendar timezone display verification
- ✅ Datetime-local input timezone preservation

### 2. `datetime-flows.spec.ts` (UPDATED)
Enhanced existing tests with better timezone handling:
- ✅ One-time event creation with Mountain Time
- ✅ Recurring weekly events with UNTIL dates
- ✅ Public events page display
- ✅ Today's events on homepage
- ✅ Upcoming events on homepage
- ✅ Events spanning midnight
- ✅ Monthly recurring events
- ✅ Event filtering (today vs future)
- ✅ Recurring event occurrences on calendar
- ✅ UNTIL date handling (last occurrence included)
- ✅ Server/client date formatting consistency (no hydration errors)
- ✅ All-day events

### 3. `datepickers-forms.spec.ts`
Form and date picker tests:
- ✅ Date picker open/close
- ✅ Valid date/time input acceptance
- ✅ Event creation form date picker
- ✅ All-day toggle
- ✅ Recurrence end date picker
- ✅ Required field validation
- ✅ Form data preservation on errors
- ✅ Mountain Time date formatting consistency
- ✅ Events spanning midnight

### 4. `events.spec.ts`
Event management tests:
- ✅ Event navigation
- ✅ Events list display
- ✅ One-time event creation
- ✅ Recurring weekly event creation
- ✅ Recurring weekly with UNTIL date
- ✅ Monthly recurring event creation
- ✅ All-day event creation
- ✅ Event editing
- ✅ Event deletion
- ✅ Tag filtering

### 5. `homepage.spec.ts` (UPDATED)
Homepage display tests with timezone verification:
- ✅ Homepage content display
- ✅ Menu navigation
- ✅ Today's specials
- ✅ Events display
- ✅ **Today's events in hero section with correct timezone** (NEW)
- ✅ **No hydration errors related to dates/times** (NEW)
- ✅ Announcements
- ✅ Business hours
- ✅ Contact information
- ✅ Events page navigation
- ✅ Contact page navigation

## Test Scenarios Covered

### Timezone Consistency
- ✅ Events created in Mountain Time display correctly
- ✅ Dates don't shift when editing events
- ✅ Datetime-local inputs preserve timezone
- ✅ Calendar shows events in correct timezone
- ✅ Homepage hero shows today's events correctly

### Date Boundaries
- ✅ Events at 11:59 PM handled correctly
- ✅ Events crossing midnight (11:59 PM to 12:01 AM)
- ✅ Day transitions don't cause date shifts

### Recurring Events
- ✅ Weekly recurring events maintain timezone
- ✅ Monthly recurring events maintain timezone
- ✅ UNTIL dates include last occurrence
- ✅ Recurring occurrences display correctly

### Public Pages
- ✅ Homepage displays events correctly
- ✅ Events page displays events correctly
- ✅ Date/time formatting is consistent
- ✅ No hydration errors

### Form Handling
- ✅ Datetime-local inputs work correctly
- ✅ Date pickers preserve timezone
- ✅ Form validation works with timezone-aware dates
- ✅ All-day events handled correctly

## Running the Tests

### Run all timezone-related tests:
```bash
npx playwright test e2e/timezone-handling.spec.ts
npx playwright test e2e/datetime-flows.spec.ts
npx playwright test e2e/datepickers-forms.spec.ts
npx playwright test e2e/homepage.spec.ts
```

### Run specific test:
```bash
npx playwright test e2e/timezone-handling.spec.ts -g "should create event and verify it displays correctly on homepage hero"
```

### Run with UI:
```bash
npx playwright test e2e/timezone-handling.spec.ts --ui
```

## Test Helpers

All tests use helpers from `test-helpers.ts`:
- `formatDateTimeLocal()` - Formats dates in Mountain Time for datetime-local inputs
- `formatDateLocal()` - Formats dates in Mountain Time for date inputs
- `getDateNDaysFromNow()` - Gets date N days from now
- `getNextMonday()`, `getNextWednesday()`, etc. - Gets next occurrence of weekday
- `fillIfExists()`, `clickIfExists()` - Safe element interaction

## Key Test Principles

1. **Always use Mountain Time**: All test dates are formatted in Mountain Time (America/Denver)
2. **Verify Display**: Tests verify that events display correctly on public pages
3. **Check Preservation**: Tests verify dates don't shift when editing
4. **Boundary Testing**: Tests cover edge cases like midnight boundaries
5. **No Hydration Errors**: Tests verify no React hydration mismatches

## Known Limitations

- Tests may be affected by actual events in the database
- Some tests check for structural elements rather than specific content
- Time-dependent tests may behave differently at different times of day
- DST transition tests would need to run at specific times

## Future Enhancements

1. **Mock Time**: Use Playwright's time mocking to test specific dates/times
2. **Timezone Simulation**: Test with different browser timezone settings
3. **DST Testing**: Add specific tests for DST transition dates
4. **Performance**: Add tests for date/time calculation performance
5. **Edge Cases**: Add more boundary tests (year transitions, leap years, etc.)




