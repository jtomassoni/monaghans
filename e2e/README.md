# End-to-End Tests

This directory contains Playwright e2e tests for the Monaghan's application.

## Setup

1. Install dependencies (already done):
   ```bash
   npm install
   ```

2. Install Playwright browsers (already done):
   ```bash
   npx playwright install --with-deps chromium
   ```

3. Set up test database:
   ```bash
   npm run test:setup
   ```
   
   This script will:
   - Create a test database (uses `TEST_DATABASE_URL` env var if set, otherwise uses `DATABASE_URL`)
   - Run Prisma migrations
   - Create test users from `ADMIN_USERS` and `OWNER_USERS` env vars (defaults: "jt:test" and "owner:test")
   - Set up basic settings needed for tests

4. (Optional) Seed database with sample data for manual QA:
   ```bash
   npm run db:seed
   ```
   
   This creates comprehensive sample data (specials, events, announcements, menu items, etc.) useful for manual testing.
   **Note**: E2E tests clean up their own data and won't interfere with seed data. See `E2E_TEST_DATA_MANAGEMENT.md` for details.

4. Ensure environment variables are set:
   - `ADMIN_USERS` (default: "jt:test") - Format: "username1:password1,username2:password2"
   - `OWNER_USERS` (default: "owner:test") - Format: "username1:password1,username2:password2"
   - `DATABASE_URL` or `TEST_DATABASE_URL` (for test database)
   - `NEXTAUTH_SECRET` (required for NextAuth)
   - `NEXTAUTH_URL` (default: "http://localhost:3000")

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run specific test file
```bash
npx playwright test e2e/homepage.spec.ts
```

## Test Structure

### Public Pages
- `homepage.spec.ts` - Tests for public homepage (content display, navigation, specials, events, announcements)
- `menu.spec.ts` - Tests for public menu display page (sections, items, prices, filtering)

### Admin Features
- `calendar.spec.ts` - Tests for admin calendar (navigation, event creation, week/month views)
- `events.spec.ts` - Tests for events management (CRUD, recurring events, weekly/monthly patterns, editing, deletion)
- `specials.spec.ts` - Tests for specials management (food/drink specials CRUD, weekday filters, date ranges)
- `announcements.spec.ts` - Tests for announcements management (CRUD, publish/expiry dates, social media cross-posting)
- `menu-management.spec.ts` - Tests for menu management (sections, items, modifiers, availability toggles, CRUD)
- `scheduling.spec.ts` - Tests for scheduling functionality (shift creation/editing, requirements, week navigation, tabs)
- `availability.spec.ts` - Tests for availability management (viewing, filtering by employee/status, month navigation)
- `timeclock.spec.ts` - Tests for timeclock functionality (clock in/out interface, shift history, hours calculation, editing)
- `reporting.spec.ts` - Tests for reporting/analytics (food cost, labor cost, sales, profitability, AI insights, date filtering, export)
- `homepage-management.spec.ts` - Tests for homepage content management (hero, about section, image upload)
- `settings.spec.ts` - Tests for settings management (business hours, contact info, timezone, shift types, online ordering toggle)
- `ingredients.spec.ts` - Tests for ingredients management (CRUD, categories, costs, units, linking to menu items)
- `orders-kds.spec.ts` - Tests for orders and KDS (order list, status updates, filtering, KDS interface, search)
- `owner-permissions.spec.ts` - Tests for owner role permissions (access control, role restrictions)

### Setup
- `auth.setup.ts` - Authentication setup that runs before all tests (creates admin and owner sessions)

## Authentication

Tests use the authentication setup in `auth.setup.ts` which creates authenticated sessions for:
- **Admin**: Uses first user from `ADMIN_USERS` env var (default: "jt:test")
- **Owner**: Uses first user from `OWNER_USERS` env var (default: "owner:test")

The authenticated states are saved to:
- `.auth/admin.json` - Used by most tests requiring admin access
- `.auth/owner.json` - Used by owner permission tests

Most tests use the admin auth state, while `owner-permissions.spec.ts` tests owner role permissions.

## Configuration

Test configuration is in `playwright.config.ts` at the root of the project.

## Parallelization

The test suite is configured for parallel execution to speed up test runs:

### Local Development
- Tests run with full parallelization (all available CPU cores)
- No worker limit by default

### CI/CD
- **Default**: 4 workers running tests in parallel within a single job
- Configure via `PLAYWRIGHT_WORKERS` environment variable
- Tests are automatically distributed across workers

### Advanced: Sharding (Optional)
For even faster CI execution, you can enable Playwright sharding to split tests across multiple CI jobs:

1. **Manual sharding**: Use `--shard=1/3` flag when running tests
   ```bash
   npm run test:e2e -- --shard=1/3  # Run shard 1 of 3
   ```

2. **CI sharding**: See the commented example in `.github/workflows/e2e-tests.yml` for matrix-based sharding across multiple jobs

**Performance Impact:**
- 4 workers: ~4x faster than sequential (default)
- 3 shards with 2 workers each: ~6x faster than sequential (requires more CI resources)

**Note**: Each shard job needs its own database setup, so sharding uses more CI resources but can significantly reduce test time for large test suites.

