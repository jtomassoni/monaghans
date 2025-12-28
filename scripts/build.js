#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
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
}

// Run the build commands
try {
  // Generate Prisma Client (required for build)
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Optionally run migrations (skip if SKIP_MIGRATIONS is set or if migrations fail)
  if (!process.env.SKIP_MIGRATIONS) {
    try {
      console.log('Running Prisma migrations...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        timeout: 30000 // 30 second timeout
      });
    } catch (migrationError) {
      console.warn('⚠️  Migration failed or timed out. Continuing with build...');
      console.warn('   (Migrations can be run separately with: npm run db:migrate)');
      console.warn('   (To skip migrations in future builds, set SKIP_MIGRATIONS=true)');
    }
  } else {
    console.log('Skipping migrations (SKIP_MIGRATIONS is set)');
  }
  
  console.log('Building Next.js application...');
  execSync('npx next build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

