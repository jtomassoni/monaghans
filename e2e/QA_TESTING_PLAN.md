# Comprehensive QA Testing Plan for Monaghan's Application

## Overview
This document outlines the complete QA testing strategy for the Monaghan's application, covering all critical user flows, edge cases, and regression scenarios. Each section maps to specific e2e test files.

## Test Categories

### 1. CRITICAL: Events Management & Calendar
**Priority: P0 - Application Core Functionality**

#### 1.1 Event Creation & Management
- [ ] Create one-time event with specific date/time
- [ ] Create one-time event with end time
- [ ] Create all-day event
- [ ] Create recurring weekly event (single day)
- [ ] Create recurring weekly event (multiple days)
- [ ] Create recurring weekly event with UNTIL date (verify last occurrence included)
- [ ] Create recurring monthly event (specific day of month)
- [ ] Edit one-time event
- [ ] Edit recurring event (series vs single occurrence)
- [ ] Delete one-time event
- [ ] Delete single occurrence of recurring event
- [ ] Delete entire recurring event series
- [ ] Add exception to recurring event
- [ ] Remove exception from recurring event

#### 1.2 Calendar Display & Navigation
- [ ] Calendar displays current week/month
- [ ] Navigate to previous week/month
- [ ] Navigate to next week/month
- [ ] Navigate to "Today"
- [ ] Switch between week and month views
- [ ] Calendar shows all events correctly
- [ ] Recurring events appear on all correct dates
- [ ] Events with UNTIL date show last occurrence
- [ ] Events span multiple days display correctly
- [ ] Events at different times display in correct slots
- [ ] Calendar handles timezone correctly (Mountain Time)

#### 1.3 Date/Time Pickers & Forms
- [ ] Date picker opens and closes correctly
- [ ] Date picker allows date selection
- [ ] Time picker allows time selection
- [ ] DateTime-local inputs accept valid dates
- [ ] DateTime-local inputs reject invalid dates
- [ ] Form validation works for required fields
- [ ] Form shows error messages appropriately
- [ ] Form preserves data on validation errors
- [ ] Form handles timezone conversion correctly
- [ ] All-day toggle works correctly
- [ ] Recurrence end date picker works
- [ ] Date pickers format dates in Mountain Time

#### 1.4 Public Events Display
- [ ] Public events page loads correctly
- [ ] Events are grouped by month
- [ ] Events display with correct date formatting (Mountain Time)
- [ ] Events display with correct time formatting
- [ ] Recurring events show all occurrences
- [ ] Events are sorted chronologically
- [ ] Today's events appear on homepage
- [ ] Upcoming events appear on homepage
- [ ] Events that started today but before current time still appear
- [ ] No hydration errors on events page
- [ ] Date formatting is consistent server/client

### 2. CRITICAL: Menu Management
**Priority: P0 - Core Business Functionality**

#### 2.1 Menu Structure
- [ ] Create menu section
- [ ] Edit menu section
- [ ] Delete menu section
- [ ] Reorder menu sections
- [ ] Menu sections display in correct order on public menu

#### 2.2 Menu Items
- [ ] Create menu item
- [ ] Edit menu item
- [ ] Delete menu item
- [ ] Menu item with price displays correctly
- [ ] Menu item with price notes displays correctly
- [ ] Menu item with description displays correctly
- [ ] Menu item availability toggle works
- [ ] Unavailable items don't show on public menu
- [ ] Menu items display in correct sections
- [ ] Menu items can be reordered within sections

#### 2.3 Public Menu Display
- [ ] Public menu page loads
- [ ] All sections display
- [ ] All available items display
- [ ] Prices display correctly
- [ ] Descriptions display correctly
- [ ] Menu filters work (if applicable)
- [ ] Menu search works (if applicable)

### 3. CRITICAL: Specials Management
**Priority: P0 - Core Business Functionality**

#### 3.1 Food Specials
- [ ] Create food special
- [ ] Create food special with specific weekdays
- [ ] Create food special with date range
- [ ] Create food special with time window
- [ ] Edit food special
- [ ] Delete food special
- [ ] Food special displays on correct days
- [ ] Food special displays during correct time window
- [ ] Food special respects date range

#### 3.2 Drink Specials
- [ ] Create drink special
- [ ] Create drink special with specific weekdays
- [ ] Create drink special with date range
- [ ] Create drink special with time window
- [ ] Edit drink special
- [ ] Delete drink special
- [ ] Drink special displays on correct days
- [ ] Drink special displays during correct time window
- [ ] Drink special respects date range

#### 3.3 Public Display
- [ ] Today's specials appear on homepage
- [ ] Specials display with correct pricing
- [ ] Specials display with correct descriptions
- [ ] Specials respect active/inactive status

### 4. CRITICAL: Announcements
**Priority: P0 - Communication Channel**

#### 4.1 Announcement Management
- [ ] Create announcement
- [ ] Edit announcement
- [ ] Delete announcement
- [ ] Publish announcement
- [ ] Unpublish announcement
- [ ] Set publish date (future)
- [ ] Set expiry date
- [ ] Announcement respects publish date
- [ ] Announcement respects expiry date

#### 4.2 Public Display
- [ ] Published announcements appear on homepage
- [ ] Unpublished announcements don't appear
- [ ] Future-dated announcements don't appear early
- [ ] Expired announcements don't appear
- [ ] Announcements display with correct content
- [ ] Announcements display with images (if applicable)

### 5. HIGH: Homepage Management
**Priority: P1 - Brand Presence**

#### 5.1 Content Management
- [ ] Edit hero section
- [ ] Edit about section
- [ ] Upload hero image
- [ ] Upload about section image
- [ ] Changes reflect on public homepage
- [ ] Images display correctly
- [ ] Text formatting works correctly

### 6. HIGH: Scheduling & Availability
**Priority: P1 - Operations**

#### 6.1 Scheduling
- [ ] Create shift
- [ ] Edit shift
- [ ] Delete shift
- [ ] Assign employee to shift
- [ ] View schedule by week
- [ ] Navigate between weeks
- [ ] Schedule displays correctly
- [ ] Shift requirements display

#### 6.2 Availability
- [ ] View employee availability
- [ ] Filter by employee
- [ ] Filter by status
- [ ] Navigate between months
- [ ] Availability displays correctly

### 7. HIGH: Timeclock
**Priority: P1 - Operations**

#### 7.1 Clock In/Out
- [ ] Employee can clock in
- [ ] Employee can clock out
- [ ] Clock in/out times recorded correctly
- [ ] Cannot clock in twice
- [ ] Cannot clock out without clocking in
- [ ] Timeclock interface displays correctly

#### 7.2 Shift History
- [ ] View shift history
- [ ] Hours calculated correctly
- [ ] Edit shift times
- [ ] Delete shift record

### 8. MEDIUM: User Management
**Priority: P2 - Administration**

#### 8.1 User CRUD
- [ ] Create user
- [ ] Edit user
- [ ] Delete user
- [ ] Assign role (admin/owner/employee)
- [ ] Activate/deactivate user
- [ ] Filter users
- [ ] Search users

#### 8.2 Permissions
- [ ] Admin can access admin features
- [ ] Owner can access owner features
- [ ] Employee cannot access admin features
- [ ] Role restrictions work correctly

### 9. MEDIUM: Settings
**Priority: P2 - Configuration**

#### 9.1 Business Settings
- [ ] Update business hours
- [ ] Update contact information
- [ ] Update timezone setting
- [ ] Update shift types
- [ ] Toggle online ordering
- [ ] Settings persist correctly
- [ ] Settings reflect on public pages

### 10. MEDIUM: Reporting & Analytics
**Priority: P2 - Business Intelligence**

#### 10.1 Reports
- [ ] View food cost report
- [ ] View labor cost report
- [ ] View sales report
- [ ] View profitability report
- [ ] Filter reports by date range
- [ ] Export reports (if applicable)
- [ ] AI insights display (if applicable)

### 11. MEDIUM: Ingredients Management
**Priority: P2 - Inventory**

#### 11.1 Ingredients
- [ ] Create ingredient
- [ ] Edit ingredient
- [ ] Delete ingredient
- [ ] Assign category
- [ ] Set cost
- [ ] Set unit
- [ ] Link to menu items

### 12. LOW: Orders & KDS
**Priority: P3 - Optional Features**

#### 12.1 Orders
- [ ] View order list
- [ ] Update order status
- [ ] Filter orders
- [ ] Search orders

#### 12.2 KDS
- [ ] KDS interface displays
- [ ] Orders appear on KDS
- [ ] Update order status from KDS

## Cross-Cutting Concerns

### Date/Time Handling (CRITICAL)
- [ ] All dates use Mountain Time timezone
- [ ] Date pickers show Mountain Time
- [ ] Date displays format correctly
- [ ] Time displays format correctly
- [ ] Events spanning midnight handled correctly
- [ ] Recurring events respect timezone
- [ ] UNTIL dates include last occurrence
- [ ] No timezone conversion errors
- [ ] No hydration mismatches from dates

### Form Validation
- [ ] Required fields validated
- [ ] Invalid dates rejected
- [ ] Invalid times rejected
- [ ] Error messages display
- [ ] Forms don't submit invalid data

### UI/UX Consistency
- [ ] Date pickers consistent across forms
- [ ] Time pickers consistent across forms
- [ ] Calendar displays consistently
- [ ] Event cards display consistently
- [ ] No layout shifts
- [ ] Responsive design works

### Performance
- [ ] Pages load within acceptable time
- [ ] Calendar renders quickly
- [ ] Event lists load quickly
- [ ] No memory leaks
- [ ] No excessive re-renders

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (basic)
- [ ] Focus indicators visible
- [ ] Form labels associated correctly

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Validation errors display clearly
- [ ] 404 pages work
- [ ] 500 errors handled

## Test Execution Strategy

### Parallelization
- Tests organized by feature area for optimal parallelization
- Independent tests that don't share state
- Setup/teardown handled per test file
- Database state managed per test

### Test Data Management
- Tests use isolated test data
- Cleanup after tests
- No reliance on specific existing data
- Tests create their own data when needed

### CI/CD Integration
- Tests run on every PR
- Tests run on main branch
- Failures block deployment
- Test reports generated
- Screenshots/videos on failure

## Regression Test Priority

### Must Run on Every PR (Critical Path)
1. Events creation (one-time and recurring)
2. Calendar display and navigation
3. Public events page display
4. Menu item creation and display
5. Public menu display
6. Date/time picker functionality
7. Timezone handling

### Should Run on Every PR (High Priority)
1. Specials creation and display
2. Announcements creation and display
3. Homepage content display
4. Form validation
5. Event editing and deletion

### Can Run on Schedule (Lower Priority)
1. Full user management suite
2. Full reporting suite
3. Full settings suite
4. Full ingredients suite

## Success Criteria

### Coverage Goals
- 100% of critical paths covered
- 90%+ of high priority paths covered
- 70%+ of medium priority paths covered
- 50%+ of low priority paths covered

### Quality Goals
- All critical tests pass before merge
- < 1% flaky test rate
- Tests complete in < 10 minutes (parallelized)
- Clear failure messages
- Actionable test reports

## Maintenance

### Regular Review
- Review test coverage quarterly
- Update tests when features change
- Remove obsolete tests
- Add tests for new bugs found

### Test Health
- Monitor flaky tests
- Fix or remove flaky tests
- Keep test execution time reasonable
- Maintain test data freshness

