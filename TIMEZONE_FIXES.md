# Timezone & Date/Time Handling - Comprehensive QA Fixes

## Overview
This document outlines all the fixes made to ensure robust date/time/timezone handling across the application. The changes ensure consistency whether the app runs on Vercel (UTC), local development (any timezone), or when accessed by users in different timezones.

## Critical Issues Fixed

### 1. **date-time-picker.tsx - Browser Local Time Bug** ✅ FIXED
**Problem**: The component was using `new Date(year, month - 1, day, hours, minutes, 0)` which creates dates in the browser's local timezone, not the company timezone. This caused dates to shift when users in different timezones used the app.

**Solution**: 
- Updated to use `parseDateTimeLocalAsCompanyTimezone()` utility
- All datetime-local strings are now interpreted as company timezone (America/Denver by default)
- Added proper timezone-aware formatting for display

### 2. **Events API - Server Timezone Parsing** ✅ FIXED
**Problem**: The API was using `new Date(body.startDateTime)` which parses dates in the server's timezone (UTC on Vercel), causing date shifts.

**Solution**:
- Updated `/app/api/events/route.ts` and `/app/api/events/[id]/route.ts` to detect datetime-local format
- Uses `parseDateTimeLocalAsCompanyTimezone()` for datetime-local strings
- Properly handles both ISO strings (already UTC) and datetime-local strings

### 3. **Inconsistent Timezone Utilities** ✅ FIXED
**Problem**: Multiple implementations of date parsing scattered across components, each with slightly different logic.

**Solution**:
- Centralized all timezone logic in `lib/timezone.ts`
- Added new utilities:
  - `parseDateTimeLocalAsCompanyTimezone()` - Parse datetime-local as company timezone
  - `formatDateAsDateTimeLocal()` - Format UTC dates to datetime-local in company timezone
  - `getCompanyTimezoneToday()` - Get today in company timezone
  - `getCompanyTimezoneDateString()` - Get date string in company timezone
  - `parseCompanyTimezoneDate()` - Parse date string as company timezone

### 4. **Form Components - Duplicate Logic** ✅ FIXED
**Problem**: `event-modal-form.tsx`, `announcement-modal-form.tsx`, and `unified-event-announcement-form.tsx` each had their own date parsing logic.

**Solution**:
- All form components now use centralized utilities from `lib/timezone.ts`
- Removed duplicate parsing/formatting functions
- Consistent behavior across all forms

## Enhanced Utilities

### New Functions in `lib/timezone.ts`

1. **`parseDateTimeLocalAsCompanyTimezone(datetimeLocal, timezone?)`**
   - Parses "YYYY-MM-DDTHH:mm" strings as company timezone
   - Handles DST transitions automatically
   - Works across all timezones (not just Mountain Time)

2. **`formatDateAsDateTimeLocal(date, timezone?)`**
   - Converts UTC Date objects to datetime-local format in company timezone
   - Used for displaying dates in form inputs

3. **`getCompanyTimezoneToday(timezone?)`**
   - Gets today's date at midnight in company timezone
   - More robust than previous implementation

4. **`getCompanyTimezoneDateString(date, timezone?)`**
   - Gets YYYY-MM-DD string from Date in company timezone
   - Prevents day shifts due to timezone conversion

5. **`parseCompanyTimezoneDate(dateStr, timezone?)`**
   - Parses YYYY-MM-DD strings as company timezone midnight
   - More robust offset detection

## Files Modified

### Core Utilities
- ✅ `lib/timezone.ts` - Enhanced with new utilities and better timezone support

### Components
- ✅ `components/date-time-picker.tsx` - Fixed to use company timezone
- ✅ `components/event-modal-form.tsx` - Uses centralized utilities
- ✅ `components/announcement-modal-form.tsx` - Uses centralized utilities
- ✅ `components/unified-event-announcement-form.tsx` - Uses centralized utilities

### API Routes
- ✅ `app/api/events/route.ts` - Proper datetime parsing
- ✅ `app/api/events/[id]/route.ts` - Proper datetime parsing

## Testing Checklist

### Critical Scenarios to Test

1. **Cross-Timezone User Access**
   - [ ] User in EST creates an event at 8:00 PM
   - [ ] User in PST views the same event
   - [ ] Event should show correct time in company timezone (Mountain Time)

2. **Date Boundary Testing**
   - [ ] Create event at 11:59 PM Mountain Time
   - [ ] Create event at 12:00 AM Mountain Time
   - [ ] Verify dates don't shift when saved/loaded

3. **DST Transitions**
   - [ ] Create event during DST transition (March/November)
   - [ ] Verify times are correct before and after transition
   - [ ] Test events that span DST boundaries

4. **Form Input/Output**
   - [ ] Create new event via form
   - [ ] Edit existing event
   - [ ] Verify datetime-local inputs show correct company timezone
   - [ ] Verify saved times match what was entered

5. **Server Timezone Independence**
   - [ ] Test on Vercel (UTC server)
   - [ ] Test locally in different timezones
   - [ ] Verify consistent behavior

6. **Date Comparisons**
   - [ ] Today's specials show correctly
   - [ ] Upcoming events filter correctly
   - [ ] Date range queries work correctly

## Key Principles

1. **Always Store in UTC**: All dates in the database are stored as UTC (Prisma DateTime)
2. **Parse as Company Timezone**: When receiving datetime-local strings from forms, parse as company timezone
3. **Display in Company Timezone**: When displaying dates to users, show in company timezone
4. **Use Centralized Utilities**: Never use `new Date()` constructor with local time components for business logic

## Migration Notes

- All existing dates in the database remain unchanged (they're already in UTC)
- The fixes are backward compatible
- No database migrations needed
- Existing API responses remain the same format

## Future Improvements

1. **Timezone Configuration**: Currently defaults to 'America/Denver', but can be configured via settings
2. **Client-Side Timezone Detection**: Could show user's local timezone alongside company timezone
3. **Better DST Handling**: Current implementation handles DST, but could be optimized further
4. **Timezone-Aware Testing**: Add automated tests for timezone edge cases

## Common Pitfalls to Avoid

1. ❌ **Don't use**: `new Date(year, month, day, hours, minutes)` - uses browser local time
2. ❌ **Don't use**: `new Date(dateString)` without timezone context - ambiguous
3. ✅ **Do use**: `parseDateTimeLocalAsCompanyTimezone()` for form inputs
4. ✅ **Do use**: `formatDateAsDateTimeLocal()` for form displays
5. ✅ **Do use**: `getCompanyTimezoneToday()` for "today" comparisons

## Support

If you encounter any date/time issues:
1. Check that you're using the centralized utilities from `lib/timezone.ts`
2. Verify the timezone is set correctly in settings
3. Check browser console for timezone-related errors
4. Verify dates are being stored/retrieved as UTC in the database




