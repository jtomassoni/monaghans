# Bug & Todo Backlog

## Summary

This document tracks bugs and test coverage gaps in the Monaghan's restaurant management system. **Priority focus: Scheduling and calendar date/time correctness**, as these are critical for daily operations and prone to timezone-related bugs.

> **Note:** Half-built features have been moved to [HALF_BUILT_FEATURES.md](./HALF_BUILT_FEATURES.md)

The system handles complex date/time operations including:
- Employee scheduling with shift times
- Recurring events with RRULE
- Mountain Time (America/Denver) timezone handling
- Date parsing and conversion across multiple components
- Calendar navigation and event positioning

## Recently Fixed (2024)

The following bugs have been fixed:

### Timezone & Date Handling Fixes

- ✅ **[ID-001]** Date String Comparison Timezone Risk - Fixed in schedule-tab.tsx, auto-generate route
- ✅ **[ID-002]** Schedule Date Matching - Fixed to use compareMountainTimeDates
- ✅ **[ID-004]** Week Start Calculation - Fixed to use Mountain Time-aware functions
- ✅ **[ID-005]** Date Parsing Fallback DST Issue - Fixed to detect DST correctly
- ✅ **[ID-006]** Schedule Auto-Generation Date Parsing - Fixed to use parseMountainTimeDate
- ✅ **[ID-007]** Availability Date Loading - Fixed to use Mountain Time
- ✅ **[ID-010]** Debug Console Logs - Gated behind development check
- ✅ **[ID-011]** Duplicate parseMountainTimeDate in admin-calendar.tsx - Replaced duplicate function with import from `lib/timezone.ts`
- ✅ **[ID-012]** API Routes Use Local Timezone for Date Parsing - Already fixed, all routes use `parseMountainTimeDate`
- ✅ **[ID-013]** Week Days Generation May Not Preserve Mountain Time Normalization - Already fixed, uses `getMountainTimeDateString` and `parseMountainTimeDate`
- ✅ **[ID-014]** Portal Page Uses toISOString for Date Comparisons - Already fixed, uses `getMountainTimeDateString` and `compareMountainTimeDates`
- ✅ **[ID-015]** Reporting Routes Use toISOString for Date String Comparisons - Already fixed, uses `getMountainTimeDateString`
- ✅ **[ID-016]** Availability Tab Uses Local Timezone for Month Calculations - Fixed `getMonthStart`, `getMonthEnd`, and month navigation to use Mountain Time
- ✅ **[ID-017]** Announcement Modal Form Has Hardcoded UTC-7 Fallback - Fixed to detect DST and use appropriate offset (UTC-6 for MDT, UTC-7 for MST)
- ✅ **[ID-018]** Event Modal Form Has Hardcoded UTC-7 Fallback - Fixed to detect DST and use appropriate offset (UTC-6 for MDT, UTC-7 for MST)
- ✅ **[ID-019]** Reporting Routes Use Local Timezone for Date Range Setup - Fixed all 7 reporting routes to use Mountain Time for date ranges:
  - `app/api/reporting/schedule-optimization/route.ts`
  - `app/api/reporting/sales-analytics/route.ts`
  - `app/api/reporting/labor-cost/route.ts`
  - `app/api/reporting/ai-insights/route.ts`
  - `app/api/reporting/specials-optimization/route.ts`
  - `app/api/reporting/menu-optimization/route.ts`
  - `app/api/reporting/profitability/route.ts`

## Open Bugs

_No open bugs at this time. All timezone-related bugs have been resolved._

## Test Coverage Gaps

### Scheduling & Calendar Testing

- **Area:** Scheduling and Calendar functionality
- **Current Situation:** No automated tests exist for scheduling or calendar features. Critical date/time logic is untested.
- **Risks:**
  - Date/timezone bugs may go undetected
  - Recurring event logic may break silently
  - Schedule date matching may fail in edge cases
  - Month/year boundary transitions untested
- **Suggested E2E Scenarios:**
  - Create a shift on a specific date and verify it appears on the correct day
  - Edit a shift and verify the date doesn't change
  - Navigate month-to-month and verify date alignment
  - Create a recurring weekly event and verify it appears on correct days
  - Create a recurring monthly event and verify it appears on correct day each month
  - Test schedule auto-generation with availability constraints
  - Test week navigation and verify schedules persist correctly
  - Test date parsing with various timezone contexts
  - Test DST transition edge cases
  - Test month boundary edge cases (Jan 31 → Feb, Feb 28/29 → Mar)

### Availability Testing

- **Area:** Employee availability system
- **Current Situation:** No tests for availability submission, checking, or filtering.
- **Risks:**
  - Availability may not be checked correctly during schedule generation
  - Date filtering may fail across timezone boundaries
- **Suggested E2E Scenarios:**
  - Submit availability for a date and verify it's saved correctly
  - Submit all-day unavailability and verify it blocks all shifts
  - Submit shift-specific availability and verify it only affects that shift
  - Test availability checking during auto-generation
  - Test availability filtering by employee and status
  - Test month navigation with availability data

### Timeclock Testing

- **Area:** Clock in/out system
- **Current Situation:** No tests for timeclock functionality.
- **Risks:**
  - Clock in/out may fail silently
  - Hours calculation may be incorrect
  - Break time may not be calculated correctly
- **Suggested E2E Scenarios:**
  - Clock in and verify shift is created
  - Clock out and verify hours are calculated correctly
  - Attempt to clock in when already clocked in (should fail)
  - Attempt to clock out when not clocked in (should fail)
  - Edit clock times and verify hours recalculate
  - Test break time calculation
  - Test cross-midnight shifts

## Future Playwright E2E Plan

### High-Priority Flows

The following flows should be tested with Playwright E2E tests:

1. **Scheduling Flow**
   - Create a shift on a specific date
   - Edit a shift and verify the new date/time persists
   - Delete a shift and verify it's removed
   - Navigate week-to-week and verify shifts persist correctly
   - Create shift requirement and verify it displays
   - Auto-generate schedules and verify they're created correctly

2. **Calendar Navigation**
   - Navigate month-to-month and check date alignment
   - Navigate week-to-week and verify events appear correctly
   - Create event on a specific date and verify it appears on correct day
   - Drag event to new date and verify it updates correctly
   - Create recurring weekly event and verify occurrences appear
   - Create recurring monthly event and verify it appears on correct day each month

3. **Availability Flow**
   - Submit availability for a date
   - Submit all-day unavailability
   - Submit shift-specific availability
   - Filter availability by employee
   - Filter availability by status
   - Navigate months and verify availability persists

4. **Timeclock Flow**
   - Clock in and verify shift is created
   - Clock out and verify hours are calculated
   - Attempt invalid clock operations (double clock in, clock out without clock in)
   - Edit clock times and verify recalculation

5. **Date/Timezone Edge Cases**
   - Test date parsing with various input formats
   - Test DST transition dates (spring forward, fall back)
   - Test month boundary transitions (Jan 31 → Feb, Feb 28/29 → Mar)
   - Test year boundary transitions (Dec 31 → Jan 1)
   - Test cross-midnight shift calculations
   - Test recurring events across DST transitions

6. **Auth & Routing**
   - Login with different roles
   - Verify role-based access control
   - Verify protected routes redirect to login
   - Verify logout functionality

### Suggested Suite Structure

- `e2e/calendar.spec.ts` - Calendar navigation, event creation, recurring events
- `e2e/scheduling.spec.ts` - Shift creation, editing, deletion, requirements, auto-generation
- `e2e/availability.spec.ts` - Availability submission, filtering, checking
- `e2e/timeclock.spec.ts` - Clock in/out, hours calculation, break time
- `e2e/date-timezone.spec.ts` - Date parsing, timezone conversion, edge cases
- `e2e/auth-routing.spec.ts` - Authentication, role-based access, routing

### Test Data Requirements

- Test users with different roles (admin, owner, manager, employee)
- Test employees with different roles (cook, bartender, barback)
- Test events (one-time and recurring)
- Test schedules across multiple weeks
- Test availability entries across multiple months
- Test dates around DST transitions (March and November)
- Test dates at month/year boundaries

### Implementation Notes

- **DO NOT** install Playwright or create test files yet - this is just the plan
- Tests should use Mountain Time for all date assertions
- Tests should verify date correctness across timezone boundaries
- Tests should cover edge cases (DST, month boundaries, year boundaries)
- Tests should verify UI state matches database state
- Tests should verify API responses match UI display
