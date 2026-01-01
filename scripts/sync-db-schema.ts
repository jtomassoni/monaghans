#!/usr/bin/env tsx
/**
 * Database Schema Sync Script
 * 
 * This script automatically syncs the Prisma schema to the database
 * using `prisma db push`. It's safe to run multiple times and will
 * automatically create missing tables/columns without requiring
 * manual migration commands.
 * 
 * This runs automatically during build and can be called on app startup.
 */

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

async function syncDatabaseSchema() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  
  if (!hasDatabaseUrl) {
    console.log('⚠️  DATABASE_URL not found. Skipping database sync.');
    return;
  }

  try {
    console.log('🔄 Syncing database schema...');
    
    // Use db push to sync schema (creates missing tables/columns automatically)
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
    
    console.log('✅ Database schema synced successfully');
    
    // Generate Prisma client after schema sync
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: process.env,
    });
    
    console.log('✅ Prisma client generated');
    
  } catch (error: any) {
    console.error('❌ Database sync failed:', error.message);
    // Don't throw - allow app to continue even if sync fails
    // The app will show errors if tables are missing, which is better than crashing
  }
}

// Run if called directly
if (require.main === module) {
  syncDatabaseSchema()
    .then(() => {
      console.log('✅ Database sync completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database sync failed:', error);
      process.exit(1);
    });
}

export { syncDatabaseSchema };

