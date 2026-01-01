/**
 * Feature Flags System
 * 
 * Controls visibility and access to features in the admin panel.
 * Only admin can manage feature flags.
 */

import { prisma } from './prisma';

export type FeatureFlagKey =
  | 'online_ordering' // Online ordering system
  | 'boh_connections' // BOH connections (KDS, POS integrations, printing)
  | 'staff_management' // Staff management suite (employees, scheduling, availability, timeclock, payroll)
  | 'reporting_analytics' // Reporting and analytics
  | 'social_media' // Social media management
  | 'purchase_orders' // Purchase orders and suppliers
  | 'ingredients_management'; // Ingredients management

// Feature flag dependencies - flags that require other flags to be enabled
export const FEATURE_FLAG_DEPENDENCIES: Record<FeatureFlagKey, FeatureFlagKey[]> = {
  online_ordering: [],
  boh_connections: [],
  staff_management: [],
  reporting_analytics: [],
  social_media: [], // Social media is standalone (calendars & events is always enabled)
  purchase_orders: [],
  ingredients_management: [],
};

export interface FeatureFlag {
  key: FeatureFlagKey;
  name: string;
  description: string;
  category: string;
  isEnabled: boolean;
}

// Default feature flags configuration
const DEFAULT_FEATURE_FLAGS: Omit<FeatureFlag, 'isEnabled'>[] = [
  {
    key: 'online_ordering',
    name: 'Online Ordering',
    description: 'Enables the Orders page at /admin/orders and the customer ordering interface. When OFF, order management and customer ordering are disabled.',
    category: 'operations',
  },
  {
    key: 'boh_connections',
    name: 'BOH Connections',
    description: 'Enables Kitchen Display System (KDS) at /admin/kds and POS Integrations at /admin/pos-integrations. When OFF, BOH connection features are hidden from navigation.',
    category: 'operations',
  },
  {
    key: 'staff_management',
    name: 'Staff Management',
    description: 'Enables the Staff Management page at /admin/staff for employees, scheduling, availability, timeclock, and payroll. When OFF, staff management is hidden from navigation.',
    category: 'operations',
  },
  {
    key: 'reporting_analytics',
    name: 'Reporting & Analytics',
    description: 'Enables the Reporting page at /admin/reporting with analytics dashboard. When OFF, reporting and analytics are hidden from navigation.',
    category: 'analytics',
  },
  {
    key: 'social_media',
    name: 'Social Media',
    description: 'Enables the Social Media page at /admin/social for social media management and cross-posting. When OFF, social media features are hidden.',
    category: 'marketing',
  },
  {
    key: 'purchase_orders',
    name: 'Purchase Orders',
    description: 'Enables the Purchase Orders page at /admin/purchase-orders for purchase orders and supplier management. When OFF, purchase order features are hidden from navigation.',
    category: 'operations',
  },
  {
    key: 'ingredients_management',
    name: 'Ingredients Management',
    description: 'Enables the Ingredients page at /admin/ingredients for ingredients and inventory management. When OFF, ingredients management is hidden from navigation.',
    category: 'operations',
  },
];

/**
 * Initialize default feature flags in the database
 * Only creates flags that don't already exist
 */
export async function initializeFeatureFlags() {
  // Handle migration from old flags to new ones (do this first, before initializing)
  // If old staff_scheduling exists, migrate to staff_management
  const oldStaffScheduling = await prisma.featureFlag.findUnique({
    where: { key: 'staff_scheduling' },
  }).catch(() => null);
  
  if (oldStaffScheduling) {
    // Migrate staff_scheduling to staff_management
    await prisma.featureFlag.upsert({
      where: { key: 'staff_management' },
      update: {
        isEnabled: oldStaffScheduling.isEnabled,
      },
      create: {
        key: 'staff_management',
        name: 'Staff Management',
        description: 'Enables the Staff Management page at /admin/staff for employees, scheduling, availability, timeclock, and payroll. When OFF, staff management is hidden from navigation.',
        category: 'operations',
        isEnabled: oldStaffScheduling.isEnabled,
      },
    });
    
    // Delete old flag
    await prisma.featureFlag.deleteMany({
      where: { key: 'staff_scheduling' },
    }); // deleteMany doesn't throw if no records found
  }
  
  // Remove old users_staff_management flag if it exists
  await prisma.featureFlag.deleteMany({
    where: { key: 'users_staff_management' },
  }); // deleteMany doesn't throw if no records found
  
  // Delete old signage flags (no longer using feature flags for signage)
  await prisma.featureFlag.deleteMany({
    where: { key: 'digital_signage_enabled' },
  });
  await prisma.featureFlag.deleteMany({
    where: { key: 'digital_signage_ads_enabled' },
  });
  await prisma.featureFlag.deleteMany({
    where: { key: 'signage_management' },
  });
  
  // Remove activity_log flag if it exists (activity log is always enabled, not a feature flag)
  await prisma.featureFlag.deleteMany({
    where: { key: 'activity_log' },
  });
  
  // Remove core product flags (always enabled, not feature flags)
  await prisma.featureFlag.deleteMany({
    where: { key: 'calendars_events' },
  });
  await prisma.featureFlag.deleteMany({
    where: { key: 'specials_management' },
  });
  await prisma.featureFlag.deleteMany({
    where: { key: 'homepage_management' },
  });
  
  // Remove menu_import flag if it exists (menu import feature removed)
  await prisma.featureFlag.deleteMany({
    where: { key: 'menu_import' },
  });
  
  // Remove menu_management flag if it exists (menu management is always enabled, not a feature flag)
  await prisma.featureFlag.deleteMany({
    where: { key: 'menu_management' },
  });
  
  // Initialize all feature flags
  for (const flag of DEFAULT_FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        // Update name/description if they changed, but don't change isEnabled
        name: flag.name,
        description: flag.description,
        category: flag.category,
      },
      create: {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        category: flag.category,
        isEnabled: false, // All flags default to disabled
      },
    });
  }
}

/**
 * Get all feature flags
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  // Ensure flags are initialized
  await initializeFeatureFlags();
  
  const flags = await prisma.featureFlag.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  return flags.map(flag => ({
    key: flag.key as FeatureFlagKey,
    name: flag.name,
    description: flag.description || '',
    category: flag.category || 'other',
    isEnabled: flag.isEnabled,
  }));
}

/**
 * Get a single feature flag by key
 */
export async function getFeatureFlag(key: FeatureFlagKey): Promise<FeatureFlag | null> {
  await initializeFeatureFlags();
  
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
  });

  if (!flag) return null;

  return {
    key: flag.key as FeatureFlagKey,
    name: flag.name,
    description: flag.description || '',
    category: flag.category || 'other',
    isEnabled: flag.isEnabled,
  };
}

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const flag = await getFeatureFlag(key);
  return flag?.isEnabled ?? false;
}

/**
 * Check if a feature flag's dependencies are met
 */
export function checkFeatureFlagDependencies(
  key: FeatureFlagKey,
  enabledFlags: Set<FeatureFlagKey>
): { canEnable: boolean; missingDependencies: FeatureFlagKey[] } {
  const dependencies = FEATURE_FLAG_DEPENDENCIES[key] || [];
  const missingDependencies = dependencies.filter(dep => !enabledFlags.has(dep));
  
  return {
    canEnable: missingDependencies.length === 0,
    missingDependencies,
  };
}

/**
 * Update a feature flag (only admin should call this)
 * Automatically handles dependencies - if enabling, ensures dependencies are enabled
 * If disabling, warns about dependent features
 */
export async function updateFeatureFlag(
  key: FeatureFlagKey,
  isEnabled: boolean
): Promise<FeatureFlag> {
  await initializeFeatureFlags();
  
  // Get all current flags to check dependencies
  const allFlags = await getAllFeatureFlags();
  const enabledFlags = new Set(
    allFlags.filter(f => f.isEnabled).map(f => f.key)
  );
  
  if (isEnabled) {
    // Check if dependencies are met
    const { canEnable, missingDependencies } = checkFeatureFlagDependencies(key, enabledFlags);
    
    if (!canEnable) {
      // Auto-enable dependencies
      for (const dep of missingDependencies) {
        await prisma.featureFlag.update({
          where: { key: dep },
          data: { isEnabled: true },
        });
      }
    }
  } else {
    // Check if any other flags depend on this one
    const dependentFlags = allFlags.filter(flag => {
      const deps = FEATURE_FLAG_DEPENDENCIES[flag.key] || [];
      return flag.isEnabled && deps.includes(key);
    });
    
    // Auto-disable dependent flags
    for (const dependentFlag of dependentFlags) {
      await prisma.featureFlag.update({
        where: { key: dependentFlag.key },
        data: { isEnabled: false },
      });
    }
  }
  
  const flag = await prisma.featureFlag.update({
    where: { key },
    data: { isEnabled },
  });

  return {
    key: flag.key as FeatureFlagKey,
    name: flag.name,
    description: flag.description || '',
    category: flag.category || 'other',
    isEnabled: flag.isEnabled,
  };
}

/**
 * Update multiple feature flags at once
 */
export async function updateFeatureFlags(
  updates: Array<{ key: FeatureFlagKey; isEnabled: boolean }>
): Promise<FeatureFlag[]> {
  await initializeFeatureFlags();
  
  const results = await Promise.all(
    updates.map(({ key, isEnabled }) =>
      prisma.featureFlag.update({
        where: { key },
        data: { isEnabled },
      })
    )
  );

  return results.map(flag => ({
    key: flag.key as FeatureFlagKey,
    name: flag.name,
    description: flag.description || '',
    category: flag.category || 'other',
    isEnabled: flag.isEnabled,
  }));
}

/**
 * Get feature flags grouped by category
 */
export async function getFeatureFlagsByCategory(): Promise<Record<string, FeatureFlag[]>> {
  const flags = await getAllFeatureFlags();
  const grouped: Record<string, FeatureFlag[]> = {};

  for (const flag of flags) {
    if (!grouped[flag.category]) {
      grouped[flag.category] = [];
    }
    grouped[flag.category].push(flag);
  }

  return grouped;
}

