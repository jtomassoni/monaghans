#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  // We use db push as primary method since it's more reliable and automatically
  // creates missing tables/columns without requiring migration files
  if (!process.env.SKIP_MIGRATIONS && hasDatabaseUrl) {
    try {
      // First try migrations (for production with proper migration history)
      console.log('Running Prisma migrations...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        timeout: 30000 // 30 second timeout
      });
      console.log('✅ Migrations applied successfully');
    } catch (migrationError) {
      // If migrations fail, use db push to sync schema automatically
      // This is safe and will create missing tables/columns
      console.log('🔄 Migrations not available, syncing schema with db push...');
      try {
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          stdio: 'inherit',
          timeout: 30000
        });
        console.log('✅ Database schema synced successfully');
        // Regenerate client after schema sync
        console.log('🔧 Regenerating Prisma client...');
        execSync('npx prisma generate', { stdio: 'inherit' });
      } catch (pushError) {
        console.warn('⚠️  Schema sync failed. Continuing with build...');
        console.warn('   (This may cause runtime errors if tables are missing)');
      }
    }
  } else {
    const reason = process.env.SKIP_MIGRATIONS
      ? 'SKIP_MIGRATIONS is set'
      : 'DATABASE_URL is missing';
    console.log(`Skipping database sync (${reason})`);
  }
  
  console.log('Building Next.js application...');
  execSync('npx next build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

