import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load .env file
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️  .env file not found at:', envPath);
}

/**
 * Reset script for local development database
 * 
 * This script:
 * 1. Drops all tables (via Prisma migrate reset)
 * 2. Runs migrations to recreate schema
 * 3. Seeds the database with sample data
 * 
 * Usage:
 *   npm run db:reset
 * 
 * WARNING: This will delete all data in your database!
 */

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ Error: DATABASE_URL is not set');
  console.error('   Please set DATABASE_URL in your .env file');
  process.exit(1);
}

const safeUrl = dbUrl.replace(/:[^:@]+@/, ':****@');

async function resetDatabase() {
  console.log('🔄 Resetting database...');
  console.log(`📁 Database URL: ${safeUrl}`);
  console.log('');
  console.log('⚠️  WARNING: This will delete all data in your database!');
  console.log('');

  try {
    // Use Prisma migrate reset (drops database, recreates, runs migrations)
    console.log('🗑️  Dropping and recreating database...');
    execSync(`npx prisma migrate reset --schema=./prisma/schema.prisma --force --skip-seed`, {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });
    console.log('✅ Database reset complete');
    console.log('');

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync(`npx prisma generate --schema=./prisma/schema.prisma`, {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });
    console.log('✅ Prisma client generated');
    console.log('');

    // Seed the database
    console.log('🌱 Seeding database...');
    execSync(`tsx scripts/seed.ts`, {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });
    console.log('✅ Database seeded');
    console.log('');

    // Test connection
    console.log('🔍 Verifying database...');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
    await prisma.$connect();
    
    const userCount = await prisma.user.count();
    const specialCount = await prisma.special.count();
    const eventCount = await prisma.event.count();
    const menuSectionCount = await prisma.menuSection.count();
    
    await prisma.$disconnect();
    
    console.log('✅ Database verification:');
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Specials: ${specialCount}`);
    console.log(`   - Events: ${eventCount}`);
    console.log(`   - Menu Sections: ${menuSectionCount}`);
    console.log('');

    console.log('🎉 Database reset complete!');
    console.log('');
    console.log('📝 Your database has been reset and seeded with sample data.');
    console.log('   View database: npm run db:studio');

  } catch (error: any) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  }
}

resetDatabase()
  .catch((error) => {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  });

