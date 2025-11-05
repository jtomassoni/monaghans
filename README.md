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

## Support

For questions or issues, check the `todo.md` file for current progress and known issues.

