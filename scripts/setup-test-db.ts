import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Use test database URL from env, or use the regular DATABASE_URL
// Note: The schema.prisma uses PostgreSQL, so make sure your DATABASE_URL points to a PostgreSQL database
// For testing, you can either:
// 1. Use your dev database (set DATABASE_URL to your dev PostgreSQL URL)
// 2. Create a separate test PostgreSQL database and set TEST_DATABASE_URL
const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!TEST_DB_URL) {
  console.error('❌ Error: DATABASE_URL or TEST_DATABASE_URL must be set');
  console.error('   Please set DATABASE_URL in your .env file or set TEST_DATABASE_URL');
  console.error('   Example: DATABASE_URL="postgresql://user:password@localhost:5432/monaghans_test"');
  process.exit(1);
}

async function setupTestDatabase() {
  console.log('🧪 Setting up test database...');
  // TEST_DB_URL is validated above, so it's guaranteed to be defined here
  const dbUrl = TEST_DB_URL!;
  console.log(`📁 Using database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`); // Hide password in logs

  // Set test database URL for Prisma
  process.env.DATABASE_URL = dbUrl;

  // Note: Schema uses PostgreSQL, so SQLite won't work unless schema is modified
  if (dbUrl.startsWith('file:')) {
    console.warn('⚠️  Warning: Schema is configured for PostgreSQL, but DATABASE_URL points to SQLite');
    console.warn('   Tests may fail. Consider using a PostgreSQL database for tests.');
  }

  // Run Prisma migrations to create the database schema
  console.log('📦 Running Prisma migrations...');
  try {
    execSync(`npx prisma migrate deploy --schema=./prisma/schema.prisma`, {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });
  } catch (error) {
    // If migrations fail, try db push instead
    console.log('⚠️  Migrations failed, trying db push...');
    execSync(`npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss`, {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });
  }

  // Create Prisma client with test database
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    console.log('👤 Creating test users...');
    
    // Parse role-based credentials from environment variables
    function parseUserCredentials(envVar: string | undefined): Array<{username: string, password: string}> {
      if (!envVar) return [];
      return envVar
        .split(',')
        .map(pair => {
          const [username, password] = pair.split(':').map(s => s.trim());
          if (username && password) {
            return { username, password };
          }
          return null;
        })
        .filter((cred): cred is {username: string, password: string} => cred !== null);
    }

    // Get credentials from env vars (defaults for testing)
    const superadminUsers = parseUserCredentials(process.env.SUPERADMIN_USERS || 'jt:test');
    const ownerUsers = parseUserCredentials(process.env.OWNER_USERS || 'owner:test');

    // Create superadmin users
    for (const cred of superadminUsers) {
      const testUser = await prisma.user.upsert({
        where: { email: cred.username },
        update: {
          name: 'Test Superadmin',
          role: 'superadmin',
          isActive: true,
        },
        create: {
          email: cred.username,
          name: 'Test Superadmin',
          role: 'superadmin',
          isActive: true,
        },
      });
      console.log(`✅ Created superadmin user: ${testUser.email}`);
    }

    // Create owner users
    for (const cred of ownerUsers) {
      const testUser = await prisma.user.upsert({
        where: { email: cred.username },
        update: {
          name: 'Test Owner',
          role: 'owner',
          isActive: true,
        },
        create: {
          email: cred.username,
          name: 'Test Owner',
          role: 'owner',
          isActive: true,
        },
      });
      console.log(`✅ Created owner user: ${testUser.email}`);
    }

    // Create some basic settings that might be needed
    console.log('⚙️  Creating test settings...');
    
    await prisma.setting.upsert({
      where: { key: 'hours' },
      update: {
        value: JSON.stringify({
          monday: { open: '08:00', close: '02:00' },
          tuesday: { open: '08:00', close: '02:00' },
          wednesday: { open: '08:00', close: '02:00' },
          thursday: { open: '08:00', close: '02:00' },
          friday: { open: '08:00', close: '02:00' },
          saturday: { open: '08:00', close: '02:00' },
          sunday: { open: '08:00', close: '02:00' },
        }),
        description: 'Business hours by day of week',
      },
      create: {
        key: 'hours',
        value: JSON.stringify({
          monday: { open: '08:00', close: '02:00' },
          tuesday: { open: '08:00', close: '02:00' },
          wednesday: { open: '08:00', close: '02:00' },
          thursday: { open: '08:00', close: '02:00' },
          friday: { open: '08:00', close: '02:00' },
          saturday: { open: '08:00', close: '02:00' },
          sunday: { open: '08:00', close: '02:00' },
        }),
        description: 'Business hours by day of week',
      },
    });

    await prisma.setting.upsert({
      where: { key: 'contact' },
      update: {
        value: JSON.stringify({
          address: '3889 S King St',
          city: 'Denver',
          state: 'CO',
          zip: '80236',
          phone: '(303) 789-7208',
          email: '',
        }),
        description: 'Contact information',
      },
      create: {
        key: 'contact',
        value: JSON.stringify({
          address: '3889 S King St',
          city: 'Denver',
          state: 'CO',
          zip: '80236',
          phone: '(303) 789-7208',
          email: '',
        }),
        description: 'Contact information',
      },
    });

    console.log('✅ Created test settings');

    console.log('🎉 Test database setup complete!');
    console.log(`🔗 Database URL: ${dbUrl}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Make sure your .env file has SUPERADMIN_USERS and OWNER_USERS set');
    console.log('   2. Run: npm run test:e2e');
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupTestDatabase()
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

