# Monaghan's Restaurant Management System

A comprehensive restaurant and bar management platform with scheduling, menu management, ordering, events, specials, and analytics.

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or pnpm installed

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your configuration values (especially `NEXTAUTH_SECRET`).

3. **Setup database:**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes (dev only)
- `npm run db:seed` - Seed sample data
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
monaghans/
├── app/              # Next.js App Router pages
├── components/        # React components
├── prisma/           # Prisma schema and migrations
├── scripts/          # Utility scripts (seed, etc.)
├── public/           # Static assets
└── lib/              # Shared utilities
```

## Environment Variables

See `.env.example` for all required environment variables. Key ones:

- `DATABASE_URL` - Database connection string (SQLite for dev, Postgres for production)
- `NEXTAUTH_SECRET` - Secret for NextAuth.js (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for dev)
- `ADMIN_USERS` - **REQUIRED in production** - Admin credentials in format "username1:password1,username2:password2"
- `OWNER_USERS` - Owner credentials in format "username1:password1" (optional but recommended)

### Role-Based User Credentials

The admin panel is accessible at `/admin/login`. The system uses role-based credentials:

**Format:** `ROLE_USERS="username1:password1,username2:password2"`

**Available roles:**
- `ADMIN_USERS` - Full system access (required in production)
- `OWNER_USERS` - Owner-level access
- `MANAGER_USERS` - Manager-level access
- `COOK_USERS`, `BARTENDER_USERS`, `BARBACK_USERS` - Staff-level access

**Example production setup:**
```bash
ADMIN_USERS="jt:your-strong-password-here,admin:another-strong-password"
OWNER_USERS="owner:owner-password"
```

**Important:**
- At least one role-level credential must be set in production
- Use strong passwords (at least 8 characters recommended)
- Usernames can be any text - no email format required (e.g., "jt", "admin", "owner")
- Multiple users per role can be defined, separated by commas

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` - **IMPORTANT**: Use a Postgres database URL (SQLite won't work on Vercel)
     - Option 1: Use Vercel Postgres (recommended)
     - Option 2: Use external Postgres (e.g., Neon, Supabase, Railway)
   - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your production URL (e.g., `https://your-domain.vercel.app`)
   - `ADMIN_USERS` - **REQUIRED** - Admin credentials (format: "username:password" or "user1:pass1,user2:pass2")
   - `OWNER_USERS` - Owner credentials (optional but recommended)
4. After first deploy, run migrations:
   ```bash
   npx vercel env pull .env.local
   npm run db:migrate
   npm run db:seed
   ```
   Or use Vercel CLI: `vercel db:migrate` if using Vercel Postgres
5. Redeploy!

**Note:** SQLite (`file:./dev.db`) only works locally. Production requires Postgres.

### Database Backups

For production, set up regular backups:

```bash
# Export database
sqlite3 prisma/dev.db .dump > backup.sql

# Or for Postgres:
pg_dump $DATABASE_URL > backup.sql
```

## Features

### Core Functionality

**Content Management**
- Calendar dashboard with week/month views for events, specials, and announcements
- Events management with recurring event support (RRULE)
- Food and drink specials with weekday scheduling
- Rich text announcements with social media cross-posting
- Homepage content customization

**Staff & Scheduling**
- Employee shift scheduling with role-based assignments
- Shift requirements and weekly schedule templates
- Auto-generation based on availability and requirements
- Employee availability tracking and time-off requests
- Timeclock system with break tracking
- Payroll and labor cost calculations

**Menu & Operations**
- Complete menu management with sections, items, modifiers, and ingredients
- Ingredient tracking with cost analysis and supplier links
- Food cost and profitability analysis
- Kitchen display system (KDS) for order management
- Order management system (backend ready)

**Inventory & Suppliers**
- Supplier management with product catalogs
- Purchase order creation and tracking
- Product-to-ingredient matching

**Analytics & Reporting**
- Sales analytics and performance metrics
- Food cost and labor cost reports
- Profitability analysis by menu item
- AI-powered menu and schedule optimization recommendations
- Automated insights and reporting

**Additional Features**
- Facebook integration for social media posting
- Role-based access control (admin, owner, manager, cook, bartender, barback)
- User and employee management
- Activity logging and audit trails
- Dark mode support
- Mobile responsive design
- WCAG AA accessibility compliance
- SEO optimization
- Mountain Time (America/Denver) timezone handling

### Coming Soon

The following features have UI and data models but require additional API integrations:
- Additional POS integrations (Toast, Clover, Lightspeed, TouchBistro)
- Automated supplier catalog sync (Sysco, US Foods, Costco)
- Network printer integration
- Email/SMS order notifications
- Public online ordering interface
- Instagram cross-posting
- Specials performance tracking

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js
- **Payments:** Stripe
- **Deployment:** Vercel

## Testing

End-to-end tests are available using Playwright. See `e2e/README.md` for details.

```bash
npm run test:e2e          # Run all tests
npm run test:e2e:ui       # Run tests in UI mode
npm run test:e2e:headed   # Run tests with browser visible
```

## License

Private - All rights reserved

