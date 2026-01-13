import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { getDisabledTestSpecs, getEnabledTestSpecs } from './e2e/config';

/**
 * Read environment variables from file (optional - for local development).
 * In CI environments, environment variables are provided via GitHub Actions/Vercel secrets.
 * https://github.com/motdotla/dotenv
 */
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('⚠️  Error loading .env file:', result.error.message);
  }
} else if (!process.env.CI) {
  // Only warn in local development, not in CI where env vars come from secrets
  console.warn('⚠️  .env file not found at:', envPath);
  console.warn('   Using environment variables from process.env');
  console.warn('   (In CI, environment variables come from GitHub Actions/Vercel secrets)');
}

// Validate DATABASE_URL is set (can come from .env file or environment variables)
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set.');
  if (process.env.CI) {
    console.error('   Please set DATABASE_URL as a GitHub Actions secret or Vercel environment variable.');
  } else {
    console.error('   Please set DATABASE_URL in your .env file or as an environment variable.');
  }
  console.error('   Example: DATABASE_URL="postgresql://user:password@host:port/database"');
  process.exit(1);
}

// Get enabled/disabled test specs from config
const enabledSpecs = getEnabledTestSpecs();
const disabledSpecs = getDisabledTestSpecs();

// Log test configuration status
if (disabledSpecs.length > 0) {
  console.log(`\n📋 Test Configuration:`);
  console.log(`   ✅ Enabled: ${enabledSpecs.length} test specs`);
  console.log(`   ⏭️  Skipped: ${disabledSpecs.length} test specs`);
  console.log(`   Skipped specs: ${disabledSpecs.join(', ')}\n`);
}

// Build testMatch patterns - Playwright accepts an array of glob patterns
const testMatchPatterns = disabledSpecs.length > 0
  ? enabledSpecs.map(spec => `**/${spec}.spec.ts`)
  : ['**/*.spec.ts'];

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Only run tests that are enabled in the config */
  testMatch: testMatchPatterns,
  /* Global setup - runs seed script before all tests */
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  /* Global teardown - cleans up any remaining test data */
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Parallelize tests - use multiple workers in CI for faster execution */
  /* Default to 4 workers in CI, or use PLAYWRIGHT_WORKERS env var if set */
  /* Tests are organized by feature area for optimal parallelization */
  workers: process.env.CI 
    ? (process.env.PLAYWRIGHT_WORKERS ? parseInt(process.env.PLAYWRIGHT_WORKERS) : 4)
    : undefined,
  /* Maximum number of test failures before stopping */
  maxFailures: undefined, // Temporarily removed limit to run full suite
  /* Reporter configuration - multiple reporters for better visibility */
  reporter: process.env.CI
    ? [
        [require.resolve('./e2e/performance-reporter.ts')], // Performance tracking (runs first for clean output)
        ['list', { printSteps: true }], // Detailed console output
        ['html', { open: 'never', outputFolder: 'playwright-report' }], // HTML report
        ['github'], // GitHub Actions annotations
      ]
    : [
        [require.resolve('./e2e/performance-reporter.ts')], // Performance tracking (runs first for clean output)
        ['html', { open: 'on-failure' }], 
        ['list']
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    /* Collect trace - always in CI for better debugging */
    trace: process.env.CI ? 'on' : 'on-first-retry',
    /* Screenshot on failure - always in CI for debugging */
    screenshot: process.env.CI ? 'only-on-failure' : 'only-on-failure',
    /* Video on failure in CI for better debugging */
    video: process.env.CI ? 'retain-on-failure' : 'retain-on-failure',
    /* Action timeout */
    actionTimeout: 15 * 1000,
    /* Navigation timeout */
    navigationTimeout: 30 * 1000,
  },
  /* Global test timeout */
  timeout: 60 * 1000,
  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project - authenticates both admin and owner
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared admin auth state (default for most tests)
        storageState: '.auth/admin.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-owner',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared owner auth state (for owner permission tests)
        storageState: '.auth/owner.json',
      },
      dependencies: ['setup'],
      testMatch: /.*owner.*\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      // DATABASE_URL is validated above, so it will be set here
      DATABASE_URL: process.env.DATABASE_URL!,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-secret-for-ci-only-do-not-use-in-production',
      // Support both singular and plural forms for user credentials
      // Read from .env file (which is loaded above) - supports both JSON and colon formats
      // CRITICAL: Always set ADMIN_USERS for the web server - required for authentication
      // Use TEST_ADMIN_USERS for test credentials, fallback to ADMIN_USER conversion or default
      ADMIN_USER: process.env.ADMIN_USER || '',
      // Convert ADMIN_USER JSON to colon format if needed, or use TEST_ADMIN_USERS/ADMIN_USERS
      ADMIN_USERS: (() => {
        // If TEST_ADMIN_USERS is set (for testing), use it
        if (process.env.TEST_ADMIN_USERS) return process.env.TEST_ADMIN_USERS;
        // If ADMIN_USERS is explicitly set, use it
        if (process.env.ADMIN_USERS) return process.env.ADMIN_USERS;
        // If ADMIN_USER is set, try to parse it and convert to colon format
        if (process.env.ADMIN_USER) {
          try {
            const parsed = JSON.parse(process.env.ADMIN_USER);
            if (parsed && typeof parsed === 'object' && parsed.username && parsed.password) {
              return `${parsed.username}:${parsed.password}`;
            }
          } catch {
            // Not JSON, might already be colon format
            return process.env.ADMIN_USER;
          }
        }
        // Fallback to default test credentials
        return 'jt:test';
      })(),
      OWNER_USER: process.env.OWNER_USER || '',
      // Same conversion for OWNER_USER, with TEST_OWNER_USERS support
      OWNER_USERS: (() => {
        if (process.env.TEST_OWNER_USERS) return process.env.TEST_OWNER_USERS;
        if (process.env.OWNER_USERS) return process.env.OWNER_USERS;
        if (process.env.OWNER_USER) {
          try {
            const parsed = JSON.parse(process.env.OWNER_USER);
            if (parsed && typeof parsed === 'object' && parsed.username && parsed.password) {
              return `${parsed.username}:${parsed.password}`;
            }
          } catch {
            return process.env.OWNER_USER;
          }
        }
        return 'owner:test';
      })(),
      ENABLE_ONLINE_ORDERING: process.env.ENABLE_ONLINE_ORDERING || 'false',
      ENABLE_SOCIAL_POSTING: process.env.ENABLE_SOCIAL_POSTING || 'false',
    },
  },
});

