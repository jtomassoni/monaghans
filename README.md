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

> **Note:** This is a living document tracking all planned features and improvements.

### Phase 0 — Repo Hygiene ✅

- [x] Initialize Next.js project with TypeScript, App Router
- [x] Configure ESLint and Prettier
- [x] Setup Tailwind CSS + shadcn/ui
- [x] Add .env.example with placeholders (DATABASE_URL, NEXTAUTH_SECRET, EMAIL_SERVER*, SOCIAL_* stubs)
- [x] Add README.md with run, build, deploy instructions for non-technical collaborator
- [x] Add scripts/seed.ts to seed sample specials/events
- [x] Verify: `npm run dev` boots; lint passes; sample data script runs

**Status:** ✅ Complete

---

### Phase 1 — Data Model (Prisma) ✅

- [x] Install Prisma + SQLite driver
- [x] Define model: `Special` (title, description, price notes, appliesOn weekdays, time window, start/end optional, image)
- [x] Define model: `Event` (title, description, start/end, venue area, recurrence RRULE string, exceptions array, isAllDay, tags)
- [x] Define model: `Announcement` (title, body rich text, heroImage, publishAt, crossPost flags)
- [x] Define model: `Page` (slug, title, content rich text/MDX-like, images)
- [x] Define model: `Setting` (hours JSON, address, phone, Google Map embed, theme options, ordering toggle)
- [x] Define model: `PostQueue` (channel, payload JSON, status, scheduledAt)
- [x] Create initial migration
- [x] Create seed script with realistic sample data
- [x] Verify: Prisma migrate runs; seed creates realistic samples

**Status:** ✅ Complete

---

### Phase 2 — Admin UX (Owner-friendly)

- [ ] Build `/admin` dashboard: cards for "Today's Specials," "This Week's Events," "Draft Announcements," quick links
- [ ] Build CRUD forms for Specials with plain language help text and live previews
- [ ] Build CRUD forms for Events with plain language help text
- [ ] Build recurrence builder:
  - Radio/cards: "One-time / Daily / Weekly / Monthly (nth weekday)"
  - End conditions: "never / after N times / until date"
  - Preview list of first 6 occurrences
  - Allow date exceptions (add/remove)
- [ ] Build image picker that saves to `/public/uploads` with filename sanitizer
- [ ] Build CRUD forms for Announcements
- [ ] Build CRUD forms for Pages
- [ ] Add guardrails: confirm dialogs, unsaved-changes prompts
- [ ] Verify: Owner can add/edit specials & events without knowing tech; previews match output

**Acceptance Criteria:** Owner can create/edit all content types; forms are intuitive; previews work.

---

### Phase 3 — Public Site

- [ ] Build homepage `/`: friendly hero ("Cold drinks, warm people"), Today's Specials, Tonight's Events, Hours + Map, phone & directions buttons
- [ ] Build `/events`: calendar/list toggle; filter by week/day; shows recurrences expanded
- [ ] Build `/menu`: simple sections (Beer, Cocktails, Shots, Bar Food); editable via CMS pages
- [ ] Build `/about`: photo + short story; accessible typography
- [ ] Build `/contact`: embedded map, hours, call button, accessibility notes (ramp, parking)
- [ ] Build `/announcements`: list + detail pages
- [ ] Implement SEO: title/description per page, OG tags, sitemap.xml, robots.txt
- [ ] Verify: Pages load fast; lighthouse a11y ≥ 90; mobile tap targets comfortable

**Acceptance Criteria:** All public pages render correctly; SEO metadata present; accessibility score ≥ 90.

---

### Phase 4 — Theme & Readability

- [ ] Design high-contrast palette (dark background, off-white text, vivid accent)
- [ ] Implement "Senior-friendly" size toggle (sm/md/lg)
- [ ] Ensure large buttons for "Call," "Map," "Tonight's Specials"
- [ ] Add keyboard navigation: landmarks, skip-links
- [ ] Test screen-reader compatibility
- [ ] Verify: WCAG AA contrast; text resizes without breaking layout

**Acceptance Criteria:** WCAG AA compliance; size toggle works; layout remains usable at all sizes.

---

### Phase 5 — Social Cross-Posting Stubs

- [ ] Add CMS toggles to "Also post to Facebook/Instagram" in Announcements and Specials forms
- [ ] Create preview modal (shows caption, link, image)
- [ ] Implement PostQueue insertion with status='staged'
- [ ] Build admin page to view queue: `/admin/posts`
- [ ] Add "Simulate Post" button that changes status to sent and logs payload
- [ ] Add clear TODOs + env placeholders for real API integration
- [ ] Verify: Owner can stage posts and see what would go out

**Acceptance Criteria:** Owner can toggle cross-posting; preview shows what would be posted; queue viewable.

---

### Phase 6 — Polish & Ops

- [ ] Create friendly 404 page
- [ ] Create friendly 500 error page
- [ ] Add basic analytics (pageviews only, privacy-safe)
- [ ] Setup Vercel deployment config (`vercel.json` if needed)
- [ ] Document environment variables in README
- [ ] Add backup instructions: prisma migrate diff + DB export notes
- [ ] Verify: Deployed MVP link works; README lets non-tech owner run it

**Acceptance Criteria:** Error pages are friendly; analytics working; deployment docs clear.

---

### Phase 7 — Tests

- [ ] Setup Playwright
- [ ] Write smoke test: homepage loads
- [ ] Write smoke test: create/edit special
- [ ] Write smoke test: create recurring event
- [ ] Write smoke test: announcements list renders
- [ ] Verify: CI passes on PR (or tests run locally)

**Acceptance Criteria:** Core user flows covered by tests; tests pass.

---

### Phase 8 — Reporting & Insights

- [ ] Build reporting dashboard for CMS content analytics
  - Track views, engagement, and performance of specials, events, and announcements
  - Show trends over time (daily, weekly, monthly)
- [ ] Build Facebook post analytics integration
  - Track engagement metrics for cross-posted content
  - Compare performance across different post types
  - Show reach, likes, comments, shares
- [ ] Build basic insights notifications
  - Show actionable insights when user logs in (e.g., "Last week you sold 125% more cheesesteak than the week before, a small price increase won't hurt sales and will continue upward growth for that special item")
  - Highlight trends and opportunities
- [ ] Create export functionality for reports (CSV, PDF)

**Acceptance Criteria:** Owners can see performance metrics for all content; insights are actionable and easy to understand.

---

### Phase 9 — Online Ordering System

- [ ] Build customer-facing online ordering interface
  - Menu display with categories
  - Item selection with modifiers (size, toppings, etc.)
  - Shopping cart functionality
  - Checkout flow with customer information
- [ ] Implement payment processing (Stripe integration)
- [ ] Build order confirmation system (email/SMS)
- [ ] Create order management dashboard in admin
  - View all orders (pending, in-progress, completed, cancelled)
  - Update order status
  - View order details and customer information
  - Order history and search

**Acceptance Criteria:** Customers can place orders online; owners can manage orders in admin dashboard.

---

### Phase 10 — Back of House Connection

- [ ] **Thermal Printer Integration**
  - Find and connect to network thermal printers
  - Send print jobs automatically when orders are placed
  - Support multiple printer types (kitchen, bar, receipt)
  - Print order tickets with item details, modifiers, and special instructions
- [ ] **Order Management System**
  - Real-time order tracking
  - Kitchen display system (KDS) integration
  - Order status updates (received, preparing, ready, completed)
  - Order timing and performance metrics

**Acceptance Criteria:** Orders automatically print to kitchen/bar printers; staff can manage orders in real-time.

---

### Phase 11 — Menu Analysis & Optimization

- [ ] **Sales Analytics**
  - Track items sold by time of day
  - Track items sold by day of week
  - Identify best-selling items and slow movers
  - Sales trends and patterns
- [ ] **Ingredient Optimization**
  - Build ingredient tracking system
  - Map menu items to their ingredients
  - Identify ingredient overlap and consolidation opportunities
  - Detect redundant prep items (e.g., marinara sauce vs. tomato-based pasta sauce should share base ingredients)
  - Optimize for ingredient turnover and reduce waste
- [ ] **Profitability Analysis**
  - Calculate profit margins per item
  - Identify high-volume, low-margin items (e.g., "customers love lasagna, but only making $1 per plate")
  - Suggest menu adjustments to support popular low-margin items
- [ ] **Drink Special Optimization**
  - Analyze drink special performance by day of week
  - Suggest optimal specials based on historical data
  - Track profitability of drink specials

**Acceptance Criteria:** Owners can see detailed menu analytics; system identifies optimization opportunities.

---

### Phase 12 — AI-Powered Analytics & Insights

- [ ] **AI Menu Optimization**
  - Use AI to analyze menu performance and suggest optimizations
  - Identify how to optimize menu to support popular low-margin items
  - Suggest ingredient consolidation strategies
  - Recommend menu changes based on sales patterns
- [ ] **Automated Insights**
  - Generate daily/weekly insights automatically
  - Highlight opportunities for price adjustments
  - Suggest menu item combinations that work well together
  - Identify trends before they become obvious
- [ ] **Predictive Analytics**
  - Forecast demand for menu items
  - Predict ingredient needs based on historical data
  - Suggest ordering quantities

**Acceptance Criteria:** AI provides actionable insights; owners receive automated recommendations for menu optimization.

---

### Phase 13 — Supplier API Integration

- [ ] **Supplier Integration**
  - Integrate with major supplier APIs:
    - Sysco
    - US Foods
    - Costco
    - Other major suppliers
- [ ] **Automated Ordering**
  - Place orders directly through supplier APIs
  - Track inventory levels
  - Auto-generate purchase orders based on ingredient needs
- [ ] **Cost Analysis**
  - Track ingredient costs from different suppliers
  - Compare prices across suppliers
  - Show granular cost analysis (e.g., "Is the lettuce you're buying worth it?")
  - Calculate true cost per menu item including all ingredients

**Acceptance Criteria:** Owners can place orders through supplier APIs; system tracks costs and suggests best suppliers.

---

### Phase 14 — Advanced Features (Icebox)

- [ ] Full Meta Graph posting + scheduled posts
- [ ] Multi-user roles & audit log
- [ ] External storage (S3/R2) and image CDN
- [ ] SMS notifications for orders
- [ ] Customer loyalty program
- [ ] Table reservation system
- [ ] Live menu updates (real-time availability)

---

## UX & Content Guidelines (apply throughout)

- Copy tone: friendly, local, no tech jargon
- Forms: one clear purpose per screen, hints under labels, sensible defaults
- Readability: 18px base, 1.6 line-height, max-width ~70ch
- Buttons: "Save & Preview," "Publish," "Save Draft"

---

## Progress Log

*Last updated: 2025-11-10*

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
- ✅ Phase 1: Prisma schema defined with all models (Special, Event, Announcement, Page, Setting, PostQueue)
- ✅ Database migrated and seeded with sample data

### In Progress
- Phase 2: Building admin dashboard and CRUD forms

### Next Up
- Phase 3: Public site pages
- Phase 8: Reporting & Insights
- Phase 9: Online Ordering System

