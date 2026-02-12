# NPM Commands Reference

Complete list of all available npm commands in this repository.

## Development

### `npm run dev`
Start the development server.
- Runs on `http://localhost:3000` (and shows IP address)
- Hot reload enabled
- Accessible from network (0.0.0.0)

---

## Building

### `npm run build`
Build the application for production.

**Build Process:**
1. **Generate Prisma Client** - Creates/updates Prisma Client types
2. **Database Schema Sync** (if `DATABASE_URL` is set):
   - First attempts `prisma migrate deploy` (applies pending migrations)
   - If migrations fail (e.g., P1002 timeout acquiring advisory lock), falls back to `prisma db push`
   - The fallback is safe and automatically syncs schema without requiring migration files
   - Regenerates Prisma Client after schema sync
3. **Validate Help Documentation** - Runs validation script (build fails if validation fails)
4. **Build Next.js Application** - Creates optimized production build

**Note:** The P1002 error (database timeout acquiring advisory lock) is expected in some environments (like Vercel) and is handled gracefully by falling back to `db push`. This does not indicate a problem.

### `npm run build:fast`
Fast build that skips database migrations.
- Use when you only need to rebuild the app without running migrations
- Sets `SKIP_MIGRATIONS=true`
- Skips database schema sync step

### `npm start`
Start the production server.
- Requires a production build (`npm run build` first)
- Runs the Next.js production server

---

## Database

### `npm run db:generate`
Generate Prisma Client.
- Runs `prisma generate`
- Updates Prisma Client types after schema changes
- Automatically runs on `npm install` (via postinstall hook)

### `npm run db:migrate`
Create and apply database migrations.
- Runs `prisma migrate dev`
- Creates new migration files based on schema changes
- Applies migrations to the database

### `npm run db:push`
Push schema changes directly to database (without migrations).
- Runs `prisma db push`
- Useful for prototyping (doesn't create migration files)
- ⚠️ Not recommended for production

### `npm run db:seed`
Seed the database with sample data.
- Runs `scripts/seed.ts`
- Populates database with test data for development/QA
- Clears existing data before seeding

### `npm run db:setup`
Set up local database.
- Runs `scripts/setup-local-db.ts`
- Initializes local development database

### `npm run db:reset`
Reset the database.
- Runs `scripts/reset-db.ts`
- Drops and recreates the database
- ⚠️ Destructive operation - use with caution

### `npm run db:studio`
Open Prisma Studio (database GUI).
- Runs `prisma studio`
- Visual database browser and editor
- Opens in browser at `http://localhost:5555`

### `npm run prisma:validate`
Validate Prisma schema.
- Runs `prisma validate`
- Checks schema syntax and configuration
- Useful for CI/CD validation

---

## Testing

### `npm run test:e2e`
Run end-to-end tests.
- Runs Playwright tests
- Executes all enabled test specs (see `e2e/config/test.config.ts`)
- Generates HTML report on failure

### `npm run test:e2e:ui`
Run e2e tests with Playwright UI.
- Opens Playwright Test UI
- Interactive test runner
- Great for debugging and watching tests

### `npm run test:e2e:headed`
Run e2e tests in headed mode (visible browser).
- Runs tests with visible browser windows
- Useful for debugging test failures
- Slower than headless mode

### `npm run test:setup`
Set up test database.
- Runs `scripts/setup-test-db.ts`
- Prepares database for e2e tests
- Creates test users and initial data

---

## Code Quality

### `npm run lint`
Run ESLint.
- Lints all TypeScript/JavaScript files
- Checks for code style and potential errors

### `npm run typecheck`
Run TypeScript type checking.
- Validates TypeScript types without emitting files
- Uses `tsconfig.typecheck.json`
- Non-incremental (full check)

### `npm run check`
Run both linting and type checking.
- Runs `npm run lint && npm run typecheck`
- Comprehensive code quality check
- Useful before committing

---

## Utility Scripts

### `npm run generate-specials`
Generate daily specials.
- Runs `scripts/generate-daily-specials.ts`
- Creates specials based on configuration

### `npm run set-social`
Set social media configuration.
- Runs `scripts/set-social-media.ts`
- Configures social media settings

### `npm run validate:docs`
Validate help documentation.
- Runs `scripts/validate-help-docs.ts`
- Checks that all routes have documentation
- Validates documentation freshness (warns if docs are >90 days old)
- Validates that docs match current feature implementations
- **Note:** This runs automatically during `npm run build` and will fail the build if validation fails

---

## Installation

### `npm install`
Install all dependencies.
- Installs production and development dependencies
- Automatically runs `prisma generate` (via postinstall hook)

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:fast` | Fast build (skip migrations) |
| `npm start` | Start production server |
| `npm run db:migrate` | Create/apply migrations |
| `npm run db:push` | Push schema changes |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test:e2e` | Run e2e tests |
| `npm run test:e2e:ui` | Run e2e tests with UI |
| `npm run lint` | Lint code |
| `npm run typecheck` | Type check |
| `npm run check` | Lint + type check |

---

## Common Workflows

### Starting Development
```bash
npm install          # Install dependencies
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed sample data (optional)
npm run dev          # Start dev server
```

### Running Tests
```bash
npm run test:setup   # Set up test database
npm run test:e2e     # Run e2e tests
```

### Before Committing
```bash
npm run check        # Lint + type check
npm run test:e2e     # Run tests
```

### Database Changes
```bash
# Edit prisma/schema.prisma
npm run db:migrate   # Create migration
npm run db:generate  # Update Prisma Client
```

### Production Build
```bash
npm run build        # Build application (includes migrations + validation)
npm start            # Start production server
```

### Troubleshooting Build Issues

**P1002 Database Timeout Error:**
- This error occurs when Prisma cannot acquire an advisory lock within 10 seconds
- Common in CI/CD environments (like Vercel) with connection pooling
- **Not a problem** - the build script automatically falls back to `prisma db push`
- The fallback ensures schema is synced even if migrations timeout
- Build will continue successfully after fallback

**Help Documentation Validation Failures:**
- If build fails with "Help documentation validation FAILED", run `npm run validate:docs` locally
- Fix any missing or outdated documentation
- Documentation warnings (>90 days old) don't fail the build, but should be addressed
