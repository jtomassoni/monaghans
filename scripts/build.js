#!/usr/bin/env node
// Build script for Next.js application

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Quieter Prisma CLI in CI (version nags; build still works on current Prisma 6)
if (!process.env.PRISMA_HIDE_UPDATE_MESSAGE) {
  process.env.PRISMA_HIDE_UPDATE_MESSAGE = '1';
}

// Load .env file (optional; ignore permission errors so builds can proceed)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;
      
      // Parse KEY=VALUE format
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        envVars[key] = value;
      }
    });
    
    // Set environment variables
    Object.assign(process.env, envVars);
  } catch (err) {
    console.warn('⚠️  Could not read .env, skipping. Reason:', err.message);
  }
}

// Run the build commands
try {
  // Generate Prisma Client (required for build)
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  // Sync database schema (skip if SKIP_MIGRATIONS is set)
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  /** On Vercel, skip migrate deploy by default (avoids P3009 when prod DB has a failed migration row). Set PRISMA_MIGRATE_DEPLOY=true to force migrate deploy after fixing migrations. */
  const forceMigrateDeploy = process.env.PRISMA_MIGRATE_DEPLOY === 'true';
  const useMigrateDeploy = !isVercel || forceMigrateDeploy;

  if (!process.env.SKIP_MIGRATIONS && hasDatabaseUrl) {
    const runDbPush = () => {
      execSync('npx prisma db push --accept-data-loss --skip-generate', {
        stdio: 'inherit',
        timeout: 30000,
      });
      console.log('✅ Database schema synced successfully');
      console.log('🔧 Regenerating Prisma client...');
      execSync('npx prisma generate', { stdio: 'inherit' });
    };

    if (!useMigrateDeploy) {
      console.log(
        'Database sync (Vercel): using prisma db push (set PRISMA_MIGRATE_DEPLOY=true to run migrate deploy instead).'
      );
      try {
        runDbPush();
      } catch (pushError) {
        console.warn('⚠️  Schema sync failed. Continuing with build...');
        console.warn('   (This may cause runtime errors if tables are missing)');
      }
    } else {
      try {
        console.log('Running Prisma migrations...');
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          timeout: 30000,
        });
        console.log('✅ Migrations applied successfully');
      } catch (migrationError) {
        console.log('🔄 migrate deploy failed; syncing schema with db push...');
        try {
          runDbPush();
        } catch (pushError) {
          console.warn('⚠️  Schema sync failed. Continuing with build...');
          console.warn('   (This may cause runtime errors if tables are missing)');
        }
      }
    }
  } else {
    const reason = process.env.SKIP_MIGRATIONS
      ? 'SKIP_MIGRATIONS is set'
      : 'DATABASE_URL is missing';
    console.log(`Skipping database sync (${reason})`);
  }
  
  // Validate help documentation (FAIL BUILD if validation fails)
  console.log('Validating help documentation...');
  try {
    execSync('tsx scripts/validate-help-docs.ts', { stdio: 'inherit' });
    console.log('✅ Help documentation validation passed');
  } catch (validationError) {
    console.error('❌ Help documentation validation FAILED');
    console.error('Build cannot proceed until documentation issues are resolved.');
    console.error('Run "npm run validate:docs" to see detailed errors.');
    process.exit(1);
  }
  
  console.log('Building Next.js application...');
  execSync('npx next build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

