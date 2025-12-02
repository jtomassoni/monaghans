# Monaghan's Restaurant Management System

A comprehensive restaurant and bar management platform built with Next.js 16, TypeScript, and PostgreSQL. This project demonstrates complex real-world challenges including timezone handling, recurring event logic, role-based access control, and financial analytics.

## What Makes This Interesting

This isn't just another CRUD app. The codebase tackles several non-trivial problems:

- **Timezone Hell**: Consistent Mountain Time (America/Denver) handling across scheduling, events, and reporting, with proper DST transitions. All date operations go through `lib/timezone.ts` to prevent the classic "date shifts by a day" bug.

- **Recurring Events with RRULE**: Full RFC 5545 RRULE implementation for events that repeat daily, weekly, monthly, with exceptions and complex patterns. The calendar component (`components/admin-calendar.tsx`) handles expansion and display of recurring instances.

- **Schedule Auto-Generation**: Constraint-based scheduling algorithm that generates employee shifts based on requirements, availability, and role matching. See `app/api/schedules/auto-generate/route.ts`.

- **Financial Analytics**: Multi-dimensional cost analysis combining food costs, labor costs, and sales data to calculate profitability per menu item. Includes AI-powered insights for menu optimization.

- **Flexible Authentication**: Environment variable-based credentials supporting both JSON and colon-separated formats, with automatic user creation and role synchronization. See `lib/auth.ts` for the credential parsing logic.

- **Activity Logging**: Comprehensive audit trail system that tracks all user actions with change descriptions. Every API route uses `logActivity()` from `lib/api-helpers.ts`.

## Architecture

### Tech Stack

- **Next.js 16** (App Router) - Server components, API routes, and React Server Components
- **TypeScript** - Full type safety throughout
- **Prisma** - Type-safe database ORM with PostgreSQL
- **NextAuth.js v4** - JWT-based authentication with custom credential provider
- **Tailwind CSS 4** - Utility-first styling
- **Playwright** - E2E testing

### Project Structure

```
app/
├── admin/              # Admin dashboard (protected routes)
├── api/                # REST API endpoints (Next.js API routes)
│   ├── schedules/      # Scheduling CRUD + auto-generation
│   ├── reporting/      # Analytics endpoints (food cost, labor, profitability)
│   ├── events/         # Events with RRULE handling
│   └── ...
├── [slug]/            # Dynamic public pages
├── kitchen/           # Kitchen Display System (KDS)
└── order/             # Online ordering with Stripe

lib/
├── auth.ts            # NextAuth config with flexible credential parsing
├── permissions.ts     # Role-based access control helpers
├── timezone.ts        # Mountain Time utilities (the timezone solution)
├── schedule-helpers.ts # Shift time calculations, hours worked, labor costs
├── food-cost-helpers.ts
├── labor-cost-helpers.ts
├── profitability-helpers.ts
└── ai-insights-helpers.ts  # AI-powered menu/schedule optimization

components/
├── admin-calendar.tsx  # 1800+ line calendar with recurring event expansion
├── ordering-interface.tsx  # Online ordering UI
└── ...
```

### Key Patterns

**1. Timezone Consistency**
All date operations use `lib/timezone.ts` helpers:
- `parseMountainTimeDate()` - Parse YYYY-MM-DD strings as Mountain Time (not UTC)
- `getMountainTimeDateString()` - Get date string in Mountain Time
- `compareMountainTimeDates()` - Compare dates in Mountain Time

This prevents the classic bug where dates shift by a day due to timezone conversion. Every API route that deals with dates uses these helpers.

**2. Recurring Events**
Events use RRULE strings (RFC 5545) stored in the database. The calendar component expands these into individual instances for display, handling:
- Daily, weekly, monthly patterns
- Exceptions (dates to skip)
- End conditions (never, after N times, until date)
- Pattern metadata for calendar duplication

See `components/admin-calendar.tsx` for the expansion logic.

**3. Role-Based Access Control**
Permissions are checked at multiple levels:
- API routes use `requireAuth()` from `lib/api-helpers.ts`
- UI components check permissions via `getPermissions()` from `lib/permissions.ts`
- Middleware protects routes (see `middleware.ts`)

Roles: `admin`, `owner`, `manager`, `cook`, `bartender`, `barback`

**4. Activity Logging**
Every mutation logs to `ActivityLog` table:
```typescript
await logActivity(userId, 'create', 'Event', eventId, {
  title: event.title,
  startDateTime: event.startDateTime,
  // ... change description
});
```

**5. Feature Flags**
Database-driven feature flags control UI visibility:
- `boh_connections` - Back of house features
- `online_ordering` - Online ordering interface
- `pos_integration` - POS integration features

See `lib/feature-flags.ts` and `app/api/feature-flags/route.ts`.

## Interesting Technical Challenges

### 1. Timezone Handling

The system operates in Mountain Time (America/Denver) but runs on servers that could be anywhere. The challenge: ensure dates never shift by a day due to timezone conversion.

**Solution**: Custom timezone utilities in `lib/timezone.ts` that:
- Parse date strings as Mountain Time (not UTC)
- Handle DST transitions correctly
- Use `Intl.DateTimeFormat` with `timeZone: 'America/Denver'` for all formatting
- Compare dates using Mountain Time date strings, not UTC timestamps

**Example**:
```typescript
// ❌ Wrong: Date shifts by timezone
const date = new Date('2024-01-15'); // Could be Jan 14 or 15 depending on server TZ

// ✅ Right: Always Jan 15 in Mountain Time
const date = parseMountainTimeDate('2024-01-15');
```

### 2. Recurring Events with Exceptions

Events can repeat daily/weekly/monthly, but need to support exceptions (skip specific dates) and complex patterns (e.g., "first Monday of every month").

**Solution**: 
- Store RRULE strings in database (`recurrenceRule` field)
- Use `rrule` library to expand instances
- Store exceptions as JSON array of dates
- Calendar component expands and displays instances on-the-fly
- Pattern metadata (`dayOfWeek`, `weekOfMonth`, `monthDay`) enables calendar duplication

### 3. Schedule Auto-Generation

Generate employee schedules that satisfy:
- Shift requirements (how many cooks/bartenders/barbacks per shift)
- Employee availability
- Role matching (cook can't fill bartender shift)
- No double-booking

**Solution**: Constraint-based algorithm in `app/api/schedules/auto-generate/route.ts`:
1. Load requirements for date range
2. Load employee availability
3. For each unfilled requirement:
   - Find available employees with matching role
   - Assign based on fairness (round-robin)
   - Mark requirement as filled

### 4. Financial Analytics

Calculate profitability per menu item by combining:
- Food costs (sum of ingredient costs × quantities)
- Labor costs (prep time × average hourly wage)
- Sales data (from online orders + POS integration)

**Solution**: Multi-step calculation in `lib/profitability-helpers.ts`:
1. Calculate food cost per item (from ingredients)
2. Calculate labor cost per item (from prep time)
3. Get sales data (quantity sold, revenue)
4. Calculate profit margin = revenue - food cost - labor cost
5. Calculate prime cost = food cost + labor cost
6. Generate insights (high-volume low-margin items, etc.)

### 5. Flexible Authentication

Support multiple credential formats and auto-create users from environment variables.

**Solution**: `lib/auth.ts` parses credentials from env vars:
- Colon-separated: `ADMIN_USERS="user1:pass1,user2:pass2"`
- JSON single: `ADMIN_USER='{"username":"admin","password":"pass"}'`
- JSON array: `ADMIN_USERS='[{"username":"admin1","password":"pass1"}]'`

On login, if user doesn't exist in DB, create them with role from env var. On each request, refresh user data from DB to ensure permissions stay current.

## Database Schema Highlights

The Prisma schema (`prisma/schema.prisma`) includes:

- **Events**: RRULE strings, exceptions, pattern metadata
- **Schedules**: Links employees to shifts with dates/times
- **Shifts**: Actual clock in/out times (for payroll)
- **MenuItems** ↔ **Ingredients**: Many-to-many with quantities
- **Orders** → **OrderItems**: Online ordering with Stripe payment intents
- **ActivityLog**: Audit trail of all mutations
- **FeatureFlags**: Database-driven feature toggles

## API Design

RESTful API routes in `app/api/`:
- `GET /api/schedules?startDate=...&endDate=...` - List schedules with date filtering
- `POST /api/schedules/auto-generate` - Generate schedules from requirements
- `GET /api/reporting/profitability?startDate=...&endDate=...` - Profitability analysis
- `GET /api/events` - Events with recurring expansion
- All routes use `requireAuth()` middleware

## Testing

E2E tests with Playwright cover:
- Public pages (homepage, menu, events)
- Admin features (calendar, events, scheduling)
- Staff management (scheduling, availability, timeclock)
- Reporting and analytics

See `e2e/README.md` for test structure and `BUG_TODO.md` for known coverage gaps.

## Quick Start (For Developers)

```bash
npm install
cp .env.example .env  # Add DATABASE_URL, NEXTAUTH_SECRET, ADMIN_USERS
npm run db:migrate
npm run db:seed  # Optional
npm run dev
```

See `.env.example` for required environment variables. The system uses PostgreSQL (SQLite works locally but not on Vercel).

## Key Files to Explore

- `lib/timezone.ts` - The timezone solution (read this first)
- `lib/auth.ts` - Flexible credential parsing and user auto-creation
- `components/admin-calendar.tsx` - Recurring event expansion and display
- `app/api/schedules/auto-generate/route.ts` - Schedule generation algorithm
- `lib/profitability-helpers.ts` - Financial calculations
- `lib/permissions.ts` - Role-based access control

## Documentation

- **`FEATURES.md`** - Detailed feature documentation
- **`TODO.md`** - Roadmap and completed phases
- **`BUG_TODO.md`** - Known bugs and test coverage gaps
- **`PARTIALLY_BUILT_FEATURES.md`** - Features needing additional work
- **`e2e/README.md`** - Testing documentation

## License

Private - All rights reserved
