# Run Migration in Production

## Quick Fix - Run Migration Now

### Option 1: Via Vercel CLI
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

### Option 2: Via Vercel Dashboard
1. Go to your Vercel project settings
2. Open the "Functions" or "Deployments" tab
3. Use the "Run Command" feature or create a one-time deployment with:
   ```bash
   npx prisma migrate deploy
   ```

### Option 3: Direct Database Access
If you have direct access to your production database, run this SQL:
```sql
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "dismissable" BOOLEAN NOT NULL DEFAULT true;
```

### Option 4: Add to Build Script (Already Done)
The build script has been updated to automatically run migrations. Just redeploy:
```bash
git add package.json
git commit -m "Add migration to build script"
git push
```

## What Changed
- Updated `package.json` build script to run `prisma migrate deploy` before building
- This ensures all pending migrations run automatically on each deployment

