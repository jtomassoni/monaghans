# Database Setup Guide

This guide will help you set up your local PostgreSQL database for development.

## Quick Start

1. **Set your DATABASE_URL in `.env`** (see recommended formats below)
2. **Run the setup script:**
   ```bash
   npm run db:setup
   ```
3. **Done!** Your database is ready to use.

## Recommended DATABASE_URL Formats for macOS

### Option 1: Using your macOS username (Recommended)
This uses peer authentication (no password needed for local connections):
```
DATABASE_URL=postgresql://jamestomassoni@localhost:5432/monaghans
```

### Option 2: Using the default postgres user
If you have a default postgres user:
```
DATABASE_URL=postgresql://postgres@localhost:5432/monaghans
```

### Option 3: With a password
If your PostgreSQL user has a password:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/monaghans
```

## Available Commands

### `npm run db:setup`
Sets up a new local database:
- Creates the database if it doesn't exist
- Runs Prisma migrations
- Generates Prisma client
- Tests the connection

### `npm run db:reset`
**WARNING: This deletes all data!**
Resets your database to a clean state:
- Drops all tables
- Recreates the schema
- Seeds with sample data

### `npm run db:seed`
Seeds the database with sample data (specials, events, menu items, etc.)

### `npm run db:migrate`
Runs Prisma migrations in development mode

### `npm run db:push`
Pushes schema changes to the database (faster than migrations, but doesn't track history)

### `npm run db:studio`
Opens Prisma Studio - a visual database browser

## Troubleshooting

### PostgreSQL is not running
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL (adjust version number as needed)
brew services start postgresql@14
# or
brew services start postgresql@15
```

### Database doesn't exist
The `db:setup` script will create it automatically. Or manually:
```bash
createdb monaghans
```

### Connection refused
1. Make sure PostgreSQL is running (see above)
2. Check your DATABASE_URL format
3. Try using your macOS username instead of "user" or "postgres"

### Authentication failed
1. Try using your macOS username: `postgresql://jamestomassoni@localhost:5432/monaghans`
2. If that doesn't work, try the postgres user: `postgresql://postgres@localhost:5432/monaghans`
3. Check if you need to set a password in PostgreSQL

### Find your PostgreSQL version
```bash
psql --version
# or
brew services list | grep postgresql
```

## Testing Your Connection

You can test your DATABASE_URL with:
```bash
node test-db-connection.js "postgresql://your-username@localhost:5432/monaghans"
```

## First Time Setup Checklist

- [ ] PostgreSQL is installed and running
- [ ] DATABASE_URL is set in `.env` file
- [ ] Run `npm run db:setup`
- [ ] Verify with `npm run db:studio` (opens database browser)


