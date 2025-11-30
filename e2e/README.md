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
   - Create test users from `SUPERADMIN_USERS` and `OWNER_USERS` env vars (defaults: "jt:test" and "owner:test")
   - Set up basic settings needed for tests

4. Ensure environment variables are set:
   - `SUPERADMIN_USERS` (default: "jt:test") - Format: "username1:password1,username2:password2"
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

- `auth.setup.ts` - Authentication setup that runs before all tests
- `homepage.spec.ts` - Tests for public homepage
- `menu.spec.ts` - Tests for menu display page
- `calendar.spec.ts` - Tests for admin calendar (superadmin)
- `events.spec.ts` - Tests for events management (superadmin)
- `specials.spec.ts` - Tests for specials management (superadmin)
- `announcements.spec.ts` - Tests for announcements management (superadmin)
- `menu-management.spec.ts` - Tests for menu management (superadmin)
- `scheduling.spec.ts` - Tests for scheduling functionality (superadmin)
- `reporting.spec.ts` - Tests for reporting/analytics (superadmin)
- `owner-permissions.spec.ts` - Tests for owner role permissions

## Authentication

Tests use the authentication setup in `auth.setup.ts` which creates authenticated sessions for:
- **Superadmin**: Uses first user from `SUPERADMIN_USERS` env var (default: "jt:test")
- **Owner**: Uses first user from `OWNER_USERS` env var (default: "owner:test")

The authenticated states are saved to:
- `.auth/superadmin.json` - Used by most tests requiring admin access
- `.auth/owner.json` - Used by owner permission tests

Most tests use the superadmin auth state, while `owner-permissions.spec.ts` tests owner role permissions.

## Configuration

Test configuration is in `playwright.config.ts` at the root of the project.

