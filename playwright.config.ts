import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Please set it in your .env file.');
  console.error('   Example: DATABASE_URL="postgresql://user:password@host:port/database"');
  process.exit(1);
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter configuration - multiple reporters for better visibility */
  reporter: process.env.CI
    ? [
        ['list', { printSteps: true }], // Detailed console output
        ['html', { open: 'never', outputFolder: 'playwright-report' }], // HTML report
        ['github'], // GitHub Actions annotations
      ]
    : [['html', { open: 'on-failure' }], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    /* Collect trace - always in CI for better debugging */
    trace: process.env.CI ? 'on' : 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure in CI, on retry locally */
    video: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
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
    // Setup project - authenticates both superadmin and owner
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared superadmin auth state (default for most tests)
        storageState: '.auth/superadmin.json',
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
      SUPERADMIN_USERS: process.env.SUPERADMIN_USERS || 'jt:test',
      OWNER_USERS: process.env.OWNER_USERS || 'owner:test',
      ENABLE_ONLINE_ORDERING: process.env.ENABLE_ONLINE_ORDERING || 'false',
      ENABLE_SOCIAL_POSTING: process.env.ENABLE_SOCIAL_POSTING || 'false',
    },
  },
});

