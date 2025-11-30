# Feature List

## Overview

Monaghan's is a comprehensive restaurant/bar management system designed for owners and managers to handle scheduling, menu management, ordering, events, specials, and analytics. The system includes employee scheduling with shift management, availability tracking, timeclock functionality, menu/ordering systems, POS integration, supplier management, and social media cross-posting.

## Core Features

### 1. Scheduling

- **Status:** Working (with potential date/timezone issues)
- **Description:** Employee shift scheduling system with support for open/close shifts, role-based scheduling (cook, bartender, barback), shift requirements, weekly templates, and auto-generation based on requirements and availability.
- **Key User Flows:**
  - Create/edit/delete scheduled shifts for employees
  - Set shift requirements (how many of each role needed per day/shift)
  - Create weekly schedule templates (default requirements by day of week)
  - Auto-generate schedules based on requirements and employee availability
  - View weekly schedule grid with shift assignments
  - Mark requirements as "filled" when staffing is complete
- **Key Files/Routes:**
  - `app/admin/staff/schedule-tab.tsx` - Main scheduling UI
  - `app/api/schedules/route.ts` - Schedule CRUD API
  - `app/api/schedules/auto-generate/route.ts` - Auto-generation logic
  - `app/api/shift-requirements/route.ts` - Requirements management
  - `app/api/weekly-templates/route.ts` - Template management
  - `lib/schedule-helpers.ts` - Shift time calculation logic

### 2. Calendar Views

- **Status:** Working (with complex timezone handling)
- **Description:** Calendar system for displaying events, specials, and announcements. Supports month and week views with drag-and-drop event positioning. Handles recurring events with RRULE support.
- **Views:** Week view (default), Month view (available but not primary)
- **Key User Flows:**
  - Navigate between weeks/months
  - View events, specials, and announcements on calendar
  - Click events to edit
  - Drag events to new dates/times
  - Create new events by clicking on calendar
  - Handle recurring events with complex timezone logic
- **Key Files/Routes:**
  - `components/admin-calendar.tsx` - Main calendar component (1800+ lines)
  - `app/admin/page.tsx` - Admin dashboard with calendar
  - `components/dashboard-content.tsx` - Calendar wrapper

### 3. Availability / Time Off

- **Status:** Working
- **Description:** Employee availability tracking system. Employees can mark themselves as available/unavailable for specific dates and shift types (open/close). Supports all-day unavailability and shift-specific availability.
- **Key User Flows:**
  - View availability submissions by month
  - Filter by employee and status (available/unavailable)
  - Employees submit availability (via portal or admin)
  - Availability is checked when auto-generating schedules
  - Availability is checked when manually assigning shifts
- **Key Files/Routes:**
  - `app/admin/staff/availability-tab.tsx` - Availability viewing interface
  - `app/api/availability/route.ts` - Availability CRUD API
  - `app/portal/page.tsx` - Employee portal for submitting availability
  - `prisma/schema.prisma` - EmployeeAvailability model

### 4. Timeclock

- **Status:** Working
- **Description:** Clock in/out system for employees to track actual worked hours. Supports break time tracking and calculates hours worked and labor costs.
- **Key User Flows:**
  - Employee clocks in (creates new Shift record)
  - Employee clocks out (updates Shift with clockOut time)
  - System prevents clocking in if already clocked in
  - System prevents clocking out if not clocked in
  - View clock in/out history
  - Edit clock times (admin)
  - Calculate hours worked and labor costs
- **Key Files/Routes:**
  - `app/api/timeclock/clock/route.ts` - Clock in/out API endpoint
  - `app/api/shifts/route.ts` - Shift history API
  - `app/admin/staff/clock-in-out-tab.tsx` - Timeclock interface
  - `app/timeclock/page.tsx` - Public timeclock page
  - `lib/schedule-helpers.ts` - Hours/cost calculation functions

### 5. Users / Roles / Auth

- **Status:** Working
- **Description:** User management with role-based access control. Roles include: superadmin, owner, manager, cook, bartender, barback. NextAuth integration for authentication.
- **Key User Flows:**
  - User login/logout
  - Create/edit/delete users
  - Assign roles to users
  - Role-based permission checks throughout app
  - Activity logging for user actions
- **Key Files/Routes:**
  - `lib/auth.ts` - Authentication configuration
  - `lib/permissions.ts` - Permission checking logic
  - `app/admin/users/` - User management pages
  - `app/api/users/route.ts` - User API
  - `app/api/auth/route.ts` - Auth API

### 6. Events Management

- **Status:** Working (with complex recurring event logic)
- **Description:** Event management system with support for one-time and recurring events. Uses RRULE for recurrence patterns. Supports exceptions, venue areas, tags, and images.
- **Key User Flows:**
  - Create/edit/delete events
  - Set up recurring events (daily, weekly, monthly)
  - Add exceptions to recurring events
  - View events on calendar
  - Drag events to new dates/times
  - Filter events by tags
- **Key Files/Routes:**
  - `app/admin/events/` - Event management pages
  - `app/api/events/route.ts` - Event API
  - `components/event-modal-form.tsx` - Event form component
  - `components/admin-calendar.tsx` - Calendar display with recurring event handling

### 7. Menu Management

- **Status:** Working
- **Description:** Full menu management system with sections, items, modifiers, ingredients, and availability tracking. Supports food cost analysis and menu optimization.
- **Key User Flows:**
  - Create/edit/delete menu sections
  - Create/edit/delete menu items
  - Add modifiers to items
  - Link ingredients to menu items
  - Set item availability
  - View food cost analysis
  - Menu optimization suggestions
- **Key Files/Routes:**
  - `app/admin/menu/` - Menu management pages
  - `app/api/menu-items/route.ts` - Menu item API
  - `app/api/menu-sections/route.ts` - Menu section API
  - `lib/menu-optimization-helpers.ts` - Optimization logic

### 8. Specials Management

- **Status:** Working
- **Description:** Food and drink specials management with support for weekday-based specials, date ranges, time windows, and images.
- **Key User Flows:**
  - Create/edit/delete food specials
  - Create/edit/delete drink specials
  - Set specials to apply on specific weekdays
  - Set date ranges for specials
  - View specials on calendar
  - Display specials on homepage
- **Key Files/Routes:**
  - `app/admin/food-specials/page.tsx` - Food specials management
  - `app/admin/drink-specials/page.tsx` - Drink specials management
  - `app/api/specials/route.ts` - Specials API

### 9. Reporting / Analytics

- **Status:** Working
- **Description:** Comprehensive reporting system with food cost analysis, labor cost analysis, sales analytics, profitability analysis, and AI-powered insights.
- **Key User Flows:**
  - View food cost reports
  - View labor cost reports
  - View sales analytics
  - View profitability analysis
  - View AI insights and recommendations
  - Export reports (basic JSON export, CSV/PDF pending)
- **Key Files/Routes:**
  - `app/admin/reporting/` - Reporting pages
  - `app/api/reporting/` - Reporting API endpoints
  - `lib/food-cost-helpers.ts` - Food cost calculations
  - `lib/labor-cost-helpers.ts` - Labor cost calculations
  - `lib/profitability-helpers.ts` - Profitability analysis
  - `lib/ai-insights-helpers.ts` - AI insights generation

### 10. Social Media Integration

- **Status:** Working
- **Description:** Facebook and Instagram integration for cross-posting announcements, events, and specials. Includes post scheduling and analytics.
- **Key User Flows:**
  - Connect Facebook/Instagram accounts
  - Cross-post announcements to social media
  - Schedule posts
  - View post analytics
  - Test post functionality
- **Key Files/Routes:**
  - `app/admin/social/page.tsx` - Social media management
  - `app/api/social/facebook/` - Facebook API integration
  - `lib/facebook-helpers.ts` - Facebook helper functions

### 11. Settings / Configuration

- **Status:** Working
- **Description:** System settings management including business hours, address, phone, theme options, and other configuration.
- **Key User Flows:**
  - Update business hours
  - Update business information
  - Configure shift types
  - Manage other system settings
- **Key Files/Routes:**
  - `app/admin/settings/` - Settings pages
  - `app/api/settings/route.ts` - Settings API
  - `prisma/schema.prisma` - Setting model

### 12. Announcements

- **Status:** Working
- **Description:** Announcement management system with rich text content, images, publish/expiry dates, and social media cross-posting.
- **Key User Flows:**
  - Create/edit/delete announcements
  - Set publish and expiry dates
  - Cross-post to social media
  - View announcements on homepage
- **Key Files/Routes:**
  - `app/admin/announcements/` - Announcement management
  - `app/api/announcements/route.ts` - Announcement API

### 13. Employee Management

- **Status:** Working
- **Description:** Employee management system with roles, hourly wages, PIN codes for timeclock, hire dates, and soft deletion.
- **Key User Flows:**
  - Create/edit/delete employees
  - Set employee roles and wages
  - Assign PIN codes for timeclock
  - Activate/deactivate employees
  - Soft delete employees
- **Key Files/Routes:**
  - `app/admin/staff/employees-tab.tsx` - Employee management UI
  - `app/api/employees/route.ts` - Employee API

### 14. Payroll / Labor Cost Tracking

- **Status:** Working
- **Description:** Payroll tracking system that calculates hours worked and labor costs from shift data. Supports editing clock times and break minutes.
- **Key User Flows:**
  - View payroll reports by period
  - Filter by role
  - Edit clock times (admin)
  - View total hours and costs
  - Export payroll data
- **Key Files/Routes:**
  - `app/admin/staff/payroll-tab.tsx` - Payroll interface
  - `app/api/shifts/route.ts` - Shift API (used for payroll)

### 15. Ingredient Management

- **Status:** Working
- **Description:** Ingredient master list with categories, units, costs, suppliers, and par levels. Links to menu items for food cost analysis.
- **Key User Flows:**
  - Create/edit/delete ingredients
  - Set ingredient costs
  - Link ingredients to menu items
  - Set par levels
  - Track current stock (basic)
- **Key Files/Routes:**
  - `app/admin/ingredients/` - Ingredient management
  - `app/api/ingredients/route.ts` - Ingredient API

### 16. Activity Log

- **Status:** Working
- **Description:** Activity logging system that tracks all user actions (create, update, delete) across entities. Includes user, action type, entity type, and change descriptions.
- **Key User Flows:**
  - View activity log
  - Filter by user, action, or entity type
  - View change history
- **Key Files/Routes:**
  - `app/admin/activity/page.tsx` - Activity log viewer
  - `app/api/activity/route.ts` - Activity log API
  - `lib/api-helpers.ts` - logActivity function

## Partially Built Features

See `PARTIALLY_BUILT_FEATURES.md` for details on features that have UI and data models but are missing core functionality or API integrations:

- POS Integration
- Supplier API Integration  
- Network Printing
- Email/SMS Notifications
- Online Ordering (currently disabled in UI, backend exists)

## Unclear Features

### Recurring Event End Conditions
- **Status:** Unclear
- **Description:** Event recurrence builder mentions "end conditions: never / after N times / until date" but implementation status is unclear
- **Location:** `components/event-modal-form.tsx`
- **Notes:** Basic recurrence works, but end conditions may not be fully implemented

