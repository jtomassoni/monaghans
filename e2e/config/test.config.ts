/**
 * E2E Test Configuration
 * 
 * Controls which test specs should run.
 * Set to false to skip a test spec.
 * 
 * IMPORTANT: Every feature flag in the app MUST have a corresponding entry here.
 * 
 * Naming: Test spec keys match test file names (without .spec.ts).
 * Format: feature_flag_name → test-spec-name
 * 
 * Tests are grouped by feature area for easy organization.
 */

export const testConfig = {
  // Content Feature Tests - calendars_events flag
  content: {
    announcements: true, // calendars_events - Announcements management
    events: true, // calendars_events - Events management
    calendar: true, // calendars_events - Calendar view and navigation
    'datetime-flows': true, // calendars_events - DateTime handling, timezones, recurring events
    'timezone-handling': true, // calendars_events - Timezone conversion and display
    
    specials: true, // specials_management - Specials management
    'specials-tv': true, // specials_management - Specials TV display
    
    signage: true, // Digital signage management (no feature flag - always available)
    
    homepage: true, // homepage_management - Public homepage display
    'homepage-management': true, // homepage_management - Homepage content management (admin)
  },
  
  // Operations Feature Tests
  operations: {
    menu: true, // Core product - Public menu display
    'menu-management': true, // Core product - Menu management (admin)
    
    'online-ordering': false, // online_ordering - Online ordering system (OFF - tests deleted)
    
    'purchase-orders': false, // purchase_orders - Purchase orders and supplier management (OFF - tests deleted)
  },
  
  // Staff Management Feature Tests - staff_management flag (OFF - all tests deleted)
  staff: {
    // All staff management tests deleted - feature flag is OFF
  },
  
  // Analytics Feature Tests (OFF - all tests deleted)
  analytics: {
    // All analytics tests deleted - feature flag is OFF
  },
  
  // Marketing Feature Tests (OFF - all tests deleted)
  marketing: {
    // All marketing tests deleted - feature flag is OFF
  },
  
  // Administration Feature Tests (not controlled by feature flags - managed via env vars)
  administration: {
    settings: true, // Application settings management
    'owner-permissions': true, // Owner role permissions and restrictions
  },
  
  // UI Components Feature Tests
  'ui-components': {
    'datepickers-forms': true, // Date picker and form validation components
  },
} as const;

/**
 * Get whether a specific test spec should run
 */
export function isTestEnabled(specName: string): boolean {
  for (const featureGroup of Object.values(testConfig)) {
    if (specName in featureGroup) {
      return (featureGroup as Record<string, boolean>)[specName] ?? true;
    }
  }
  return true; // Default to enabled if not found
}

/**
 * Get all enabled test spec names
 */
export function getEnabledTestSpecs(): string[] {
  const enabled: string[] = [];
  for (const featureGroup of Object.values(testConfig)) {
    for (const [specName, isEnabled] of Object.entries(featureGroup)) {
      if (isEnabled) {
        enabled.push(specName);
      }
    }
  }
  return enabled;
}

/**
 * Get all disabled test spec names
 */
export function getDisabledTestSpecs(): string[] {
  const disabled: string[] = [];
  for (const featureGroup of Object.values(testConfig)) {
    for (const [specName, isEnabled] of Object.entries(featureGroup)) {
      if (!isEnabled) {
        disabled.push(specName);
      }
    }
  }
  return disabled;
}

