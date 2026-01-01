# User Management in Production

## Overview

User authentication in this application is handled via **environment variables**, not database records. The `User` records in the database are primarily for:
- Display purposes (showing who is logged in)
- Activity logging (tracking who made changes)
- Upload tracking (who uploaded files)

## How Authentication Works

1. **Environment Variables**: Users are defined in env vars:
   - `ADMIN_USERS="username1:password1,username2:password2"`
   - `OWNER_USERS="username1:password1,username2:password2"`

2. **Auto-Creation**: When a user logs in with env var credentials, a `User` record is automatically created in the database if it doesn't exist.

3. **Role Sync**: If the role in env vars changes, the database record is updated on next login.

## Deleting Users

Since authentication is via env vars, you can safely delete all `User` records from the database. They will be automatically recreated when users log in.

### Automatic Cleanup on Next Deploy (Recommended)

The easiest way is to set an environment variable in Vercel that will automatically delete users on the next deployment:

1. **In Vercel Dashboard:**
   - Go to your project → Settings → Environment Variables
   - Add: `CLEANUP_USERS` = `true`
   - Deploy (or push a commit to trigger deployment)

2. **After deployment:**
   - Remove or set `CLEANUP_USERS` = `false` to prevent it from running again
   - Users will be automatically recreated when they log in

### Using the Delete Script Manually

```bash
# Delete all users (and their activity logs/uploads via cascade)
tsx scripts/delete-all-users.ts
```

### Manual SQL (if preferred)

```sql
-- Delete all users (cascade will handle ActivityLog and Upload)
DELETE FROM "User";
```

### What Gets Deleted

- ✅ All `User` records
- ✅ All `ActivityLog` entries (cascade delete)
- ✅ All `Upload` records (cascade delete)

### What Happens After

- Users will be **automatically recreated** when they log in with env var credentials
- The Users & Staff page will show an empty list until users log in
- No impact on authentication (it's all env var based)

## Users & Staff Tab

The "Users & Staff" tab in the admin panel will:
- Show an empty list if no users exist
- Automatically populate as users log in
- Display both User records and Employee records (staff management)

If you want to hide this tab entirely in production, you can:
1. Remove the link from `components/admin-nav.tsx`
2. Or add a feature flag to conditionally show it

## Best Practices

### Production
- ✅ Keep `ADMIN_USERS` and `OWNER_USERS` in environment variables (Vercel env vars)
- ✅ Delete database users periodically if they accumulate
- ✅ Users will auto-recreate on login, so deletion is safe

### Development
- Users created during development/testing can be cleaned up
- Seed script may create test users - these can be deleted

## Environment Variables

Set these in your Vercel project settings or `.env` file:

```bash
# Format: "username:password" or "user1:pass1,user2:pass2"
ADMIN_USERS="admin1:password123,admin2:password456"
OWNER_USERS="owner1:password123"
```

Or JSON format:
```bash
ADMIN_USERS='[{"username":"admin1","password":"pass123"},{"username":"admin2","password":"pass456"}]'
```

## Security Notes

- ⚠️ **Never commit** `ADMIN_USERS` or `OWNER_USERS` to git
- ✅ Store them in Vercel environment variables
- ✅ Use strong passwords
- ✅ Rotate passwords periodically
- ✅ Limit who has access to these env vars

