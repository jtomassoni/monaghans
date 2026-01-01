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
 * Setup script for local development database
 * 
 * This script:
 * 1. Creates the database if it doesn't exist
 * 2. Runs Prisma migrations
 * 3. Seeds the database with sample data
 * 
 * Usage:
 *   npm run db:setup
 * 
 * The DATABASE_URL should be set in your .env file.
 * For macOS, common formats:
 *   - postgresql://jamestomassoni@localhost:5432/monaghans (no password, uses peer auth)
 *   - postgresql://postgres@localhost:5432/monaghans (default postgres user)
 *   - postgresql://postgres:password@localhost:5432/monaghans (with password)
 */

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ Error: DATABASE_URL is not set');
  console.error('   Please set DATABASE_URL in your .env file');
  console.error('');
  console.error('   For macOS, try one of these:');
  console.error('   - postgresql://jamestomassoni@localhost:5432/monaghans');
  console.error('   - postgresql://postgres@localhost:5432/monaghans');
  console.error('   - postgresql://postgres:yourpassword@localhost:5432/monaghans');
  process.exit(1);
}

// Parse database connection details
function parseDatabaseUrl(url: string) {
  const match = url.match(/postgresql:\/\/(?:([^:]+)(?::([^@]+))?@)?([^:]+)(?::(\d+))?\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  const [, username, password, host, port, database] = match;
  return {
    username: username || 'postgres',
    password,
    host: host || 'localhost',
    port: port || '5432',
    database: database.split('?')[0], // Remove query params
  };
}

async function setupLocalDatabase() {
  console.log('🗄️  Setting up local database...');
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }
  
  const safeUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`📁 Database URL: ${safeUrl}`);
  console.log('');

  try {
    const dbInfo = parseDatabaseUrl(dbUrl);
    console.log(`📊 Database: ${dbInfo.database}`);
    console.log(`👤 User: ${dbInfo.username}`);
    console.log(`🌐 Host: ${dbInfo.host}:${dbInfo.port}`);
    console.log('');

    // Check if PostgreSQL is running
    console.log('🔍 Checking PostgreSQL connection...');
    try {
      const testPrisma = new PrismaClient({
        datasources: {
          db: {
            url: `postgresql://${dbInfo.username}${dbInfo.password ? ':' + dbInfo.password : ''}@${dbInfo.host}:${dbInfo.port}/postgres`,
          },
        },
      });
      await testPrisma.$connect();
      await testPrisma.$disconnect();
      console.log('✅ PostgreSQL is running');
    } catch (error: any) {
      console.error('❌ Cannot connect to PostgreSQL server');
      console.error('');
      console.error('   Make sure PostgreSQL is running:');
      console.error('   brew services start postgresql@14');
      console.error('   (or your PostgreSQL version)');
      console.error('');
      console.error('   Error:', error.message);
      process.exit(1);
    }

    // Try to create database (ignore error if it already exists)
    console.log(`📦 Creating database "${dbInfo.database}" if it doesn't exist...`);
    try {
      const createDbPrisma = new PrismaClient({
        datasources: {
          db: {
            url: `postgresql://${dbInfo.username}${dbInfo.password ? ':' + dbInfo.password : ''}@${dbInfo.host}:${dbInfo.port}/postgres`,
          },
        },
      });
      await createDbPrisma.$executeRawUnsafe(`CREATE DATABASE "${dbInfo.database}"`);
      await createDbPrisma.$disconnect();
      console.log(`✅ Database "${dbInfo.database}" created`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  Database "${dbInfo.database}" already exists`);
      } else {
        console.log(`⚠️  Could not create database (might already exist): ${error.message}`);
      }
    }

    // Run Prisma migrations
    console.log('');
    console.log('📦 Running Prisma migrations...');
    try {
      execSync(`npx prisma migrate deploy --schema=./prisma/schema.prisma`, {
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: 'inherit',
      });
      console.log('✅ Migrations completed');
    } catch (error) {
      console.log('⚠️  Migrations failed, trying db push...');
      execSync(`npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss`, {
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: 'inherit',
      });
      console.log('✅ Schema pushed to database');
    }

    // Generate Prisma client
    console.log('');
    console.log('🔧 Generating Prisma client...');
    execSync(`npx prisma generate --schema=./prisma/schema.prisma`, {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });
    console.log('✅ Prisma client generated');

    // Test connection
    console.log('');
    console.log('🔍 Testing database connection...');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT version()`;
    await prisma.$disconnect();
    console.log('✅ Database connection successful');
    console.log('');

    console.log('🎉 Local database setup complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   - Run seed script: npm run db:seed');
    console.log('   - Or reset database: npm run db:reset');
    console.log('   - View database: npm run db:studio');

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupLocalDatabase()
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

