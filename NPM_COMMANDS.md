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
- Runs database migrations
- Compiles Next.js application
- Generates optimized production build

### `npm run build:fast`
Fast build that skips database migrations.
- Use when you only need to rebuild the app without running migrations
- Sets `SKIP_MIGRATIONS=true`

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
npm run build        # Build application
npm start            # Start production server
```

