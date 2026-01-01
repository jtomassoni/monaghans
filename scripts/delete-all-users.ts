#!/usr/bin/env tsx
/**
 * Delete all users from the database
 * 
 * Since authentication is done via env vars (ADMIN_USERS, OWNER_USERS),
 * User records in the database are just for tracking/display purposes.
 * They will be automatically recreated when users log in with env var credentials.
 * 
 * This script deletes:
 * - All User records
 * - All ActivityLog records (cascade delete)
 * - All Upload records (cascade delete)
 * 
 * Usage:
 *   tsx scripts/delete-all-users.ts
 * 
 * WARNING: This will delete all users and their associated data!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting all users...');
  console.log('   This will also delete:');
  console.log('   - ActivityLog entries (cascade)');
  console.log('   - Upload records (cascade)');
  console.log('');

  // Count users first
  const userCount = await prisma.user.count();
  console.log(`📊 Found ${userCount} user(s) to delete`);

  if (userCount === 0) {
    console.log('✅ No users to delete');
    return;
  }

  // List users before deletion
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  console.log('\n📋 Users to be deleted:');
  users.forEach((user, i) => {
    console.log(`   ${i + 1}. ${user.email} (${user.name || 'No name'}) - ${user.role}`);
  });

  // Delete all users (cascade will handle ActivityLog and Upload)
  const result = await prisma.user.deleteMany({});

  console.log(`\n✅ Deleted ${result.count} user(s)`);
  console.log('');
  console.log('ℹ️  Note: Users will be automatically recreated when they log in');
  console.log('   with credentials from ADMIN_USERS or OWNER_USERS env vars.');
}

main()
  .catch((error) => {
    console.error('❌ Error deleting users:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

