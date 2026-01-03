/**
 * E2E Test Metadata System
 * 
 * Groups test specs by feature area and provides metadata for each test file.
 * This allows for organized test management and selective test execution.
 */

export type FeatureArea = 
  | 'content'
  | 'operations'
  | 'staff'
  | 'analytics'
  | 'administration'
  | 'ui-components'
  | 'auth';

export interface TestSpecMetadata {
  /** The spec file name (without .spec.ts extension) */
  specName: string;
  /** Full path to the spec file */
  specPath: string;
  /** Feature area this test belongs to */
  featureArea: FeatureArea;
  /** Human-readable description of what this test covers */
  description: string;
  /** Whether this test should run by default */
  enabled: boolean;
}

/**
 * Metadata for all test specs, organized by feature area
 */
export const TEST_SPEC_METADATA: Record<FeatureArea, TestSpecMetadata[]> = {
  content: [
    {
      specName: 'announcements',
      specPath: 'e2e/announcements.spec.ts',
      featureArea: 'content',
      description: 'Announcements management (create, edit, delete, publish)',
      enabled: true,
    },
    {
      specName: 'events',
      specPath: 'e2e/events.spec.ts',
      featureArea: 'content',
      description: 'Events management (create, edit, delete, recurring events)',
      enabled: true,
    },
    {
      specName: 'specials',
      specPath: 'e2e/specials.spec.ts',
      featureArea: 'content',
      description: 'Specials management (create, edit, delete, date ranges)',
      enabled: true,
    },
    {
      specName: 'specials-tv',
      specPath: 'e2e/specials-tv.spec.ts',
      featureArea: 'content',
      description: 'Specials TV display and signage',
      enabled: true,
    },
    {
      specName: 'homepage',
      specPath: 'e2e/homepage.spec.ts',
      featureArea: 'content',
      description: 'Public homepage display and content',
      enabled: true,
    },
    {
      specName: 'homepage-management',
      specPath: 'e2e/homepage-management.spec.ts',
      featureArea: 'content',
      description: 'Homepage content management (admin)',
      enabled: true,
    },
    {
      specName: 'calendar',
      specPath: 'e2e/calendar.spec.ts',
      featureArea: 'content',
      description: 'Calendar view and navigation',
      enabled: true,
    },
    {
      specName: 'datetime-flows',
      specPath: 'e2e/datetime-flows.spec.ts',
      featureArea: 'content',
      description: 'DateTime handling, timezones, and recurring events',
      enabled: true,
    },
    {
      specName: 'timezone-handling',
      specPath: 'e2e/timezone-handling.spec.ts',
      featureArea: 'content',
      description: 'Timezone conversion and display',
      enabled: true,
    },
  ],
  operations: [
    {
      specName: 'menu',
      specPath: 'e2e/menu.spec.ts',
      featureArea: 'operations',
      description: 'Public menu display',
      enabled: true,
    },
    {
      specName: 'menu-management',
      specPath: 'e2e/menu-management.spec.ts',
      featureArea: 'operations',
      description: 'Menu management (admin)',
      enabled: true,
    },
  ],
  staff: [
    // All staff management tests deleted - feature flag is OFF
  ],
  analytics: [
    // All analytics tests deleted - feature flag is OFF
  ],
  administration: [
    {
      specName: 'settings',
      specPath: 'e2e/settings.spec.ts',
      featureArea: 'administration',
      description: 'Application settings management',
      enabled: true,
    },
    {
      specName: 'owner-permissions',
      specPath: 'e2e/owner-permissions.spec.ts',
      featureArea: 'administration',
      description: 'Owner role permissions and restrictions',
      enabled: true,
    },
  ],
  'ui-components': [
    {
      specName: 'datepickers-forms',
      specPath: 'e2e/datepickers-forms.spec.ts',
      featureArea: 'ui-components',
      description: 'Date picker and form validation components',
      enabled: true,
    },
  ],
  auth: [
    // Auth tests are handled by setup files, but we can add login tests here if needed
  ],
};

/**
 * Get all test specs for a specific feature area
 */
export function getSpecsForFeature(featureArea: FeatureArea): TestSpecMetadata[] {
  return TEST_SPEC_METADATA[featureArea] || [];
}

/**
 * Get all enabled test specs
 */
export function getEnabledSpecs(): TestSpecMetadata[] {
  return Object.values(TEST_SPEC_METADATA)
    .flat()
    .filter(spec => spec.enabled);
}

/**
 * Get all test specs (enabled and disabled)
 */
export function getAllSpecs(): TestSpecMetadata[] {
  return Object.values(TEST_SPEC_METADATA).flat();
}

/**
 * Get metadata for a specific spec by name
 */
export function getSpecMetadata(specName: string): TestSpecMetadata | undefined {
  return getAllSpecs().find(spec => spec.specName === specName);
}

