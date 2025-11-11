# Monaghan's Dive Bar Website

A simple, fast website for a neighborhood dive bar with an owner-friendly CMS.

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
- `ADMIN_USERNAME` or `ADMIN_EMAIL` - **REQUIRED in production** - Username for admin login (can be simple like "jt" or email format)
- `ADMIN_PASSWORD` - **REQUIRED in production** - Password for admin login (use a strong password!)

### Admin Credentials

The admin panel is accessible at `/admin/login`. To set up admin access:

1. **Development:** Uses defaults (`admin` / `changeme`) if not set
2. **Production:** **MUST** set `ADMIN_USERNAME` (or `ADMIN_EMAIL`) and `ADMIN_PASSWORD` environment variables
   - The system will throw an error if these aren't set in production
   - A warning will be shown if the password is weak or still using defaults
   - Use a strong password (at least 8 characters recommended)
   - Username can be any text - no email format required (e.g., "jt", "admin", "owner")

Example production setup:
```bash
ADMIN_USERNAME="jt"
ADMIN_PASSWORD="your-strong-secure-password-here"
```

Or use `ADMIN_EMAIL` for backwards compatibility:
```bash
ADMIN_EMAIL="admin@monaghans.com"
ADMIN_PASSWORD="your-strong-secure-password-here"
```

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
   - `ADMIN_USERNAME` or `ADMIN_EMAIL` - **REQUIRED** - Your admin username/login (can be simple like "jt")
   - `ADMIN_PASSWORD` - **REQUIRED** - Strong password for admin login (change from default!)
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

- **CMS Dashboard** - `/admin` - Manage specials, events, announcements
- **Public Pages** - Home, Menu, Events, About, Contact, Announcements
- **Accessibility** - WCAG AA compliant, large tap targets, readable fonts
- **SEO** - Metadata, OG tags, sitemap
- **Mobile-Optimized** - Responsive layouts with collapsible filters, optimized spacing for mobile devices
- **Social Media Integration** - Facebook posting with collapsible search/sort/filter controls on mobile

## TODO / Roadmap

> **Note:** See [TODO.md](./TODO.md) for the complete roadmap with all phases and implementation progress.

## UX & Content Guidelines (apply throughout)

- Copy tone: friendly, local, no tech jargon
- Forms: one clear purpose per screen, hints under labels, sensible defaults
- Readability: 18px base, 1.6 line-height, max-width ~70ch
- Buttons: "Save & Preview," "Publish," "Save Draft"

---

## Progress Log

*Last updated: 2025-01-27*

### Recent Improvements
- ✅ **Mobile Layout Optimizations** - Improved mobile experience for social media filters and homepage highlights
  - Added collapsible toggle for search/sort/filter controls on mobile (hidden by default, expandable on demand)
  - Active filter count badge shows when filters are applied
  - Reduced vertical spacing on mobile for better content visibility
  - Responsive Today's Highlights section with centered layout for fewer items
  - Enhanced card padding when only 1-2 items are displayed
  - Optimized scroll container height calculations for mobile

### Completed
- ✅ Phase 0: Project initialized with Next.js, TypeScript, Tailwind, ESLint, Prettier
- ✅ Phase 1: Prisma schema defined with all models (Special, Event, Announcement, Setting, PostQueue, MenuSection, MenuItem, User, ActivityLog, FacebookPost)
- ✅ Database migrated and seeded with sample data
- ✅ Phase 2: Admin dashboard with calendar view, CRUD forms for Specials, Events, Announcements, Menu system
- ✅ Phase 3: Public site pages (Homepage, Events, Menu, Contact, About section)
- ✅ Phase 4: Theme & Readability (keyboard navigation, skip links, ARIA labels, screen-reader compatibility)
- ✅ Phase 5: Social media cross-posting with Facebook API integration
- ✅ Phase 6: Polish & Ops (404/500 error pages, privacy-safe analytics, deployment docs)
- ✅ Phase 8: Reporting & Insights (CMS analytics, pageviews, insights, extensible architecture)
- ✅ Phase 14 (Partial): Multi-user roles, audit log, Facebook posting

### In Progress / Partially Complete
- ⚠️ Phase 2: Pages CRUD and unsaved-changes prompts pending
- ⚠️ Phase 3: Sitemap/robots.txt pending (public announcements page not needed)

### Next Up
- Phase 3: Complete SEO (sitemap.xml, robots.txt)
- Phase 2: Pages CRUD and unsaved-changes prompts (if needed)
- Phase 7: Tests
- Phase 8: Facebook post analytics integration
- Phase 9: Online Ordering System

