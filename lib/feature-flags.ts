/**
 * Feature Flags System
 * 
 * Controls visibility and access to features in the admin panel.
 * Only admin can manage feature flags.
 */

import { prisma } from './prisma';

export type FeatureFlagKey =
  | 'calendars_events' // Calendar and events management
  | 'specials_management' // Food and drink specials
  | 'signage_management' // Digital signage management
  | 'menu_management' // Full menu management (beyond specials)
  | 'menu_import' // Menu import from external platforms
  | 'online_ordering' // Online ordering system
  | 'boh_connections' // BOH connections (KDS, POS integrations, printing)
  | 'staff_scheduling' // Staff scheduling and timeclock
  | 'reporting_analytics' // Reporting and analytics
  | 'social_media' // Social media management
  | 'homepage_management' // Homepage content management
  | 'activity_log' // Activity log
  | 'users_staff_management' // User and staff account management
  | 'purchase_orders' // Purchase orders and suppliers
  | 'ingredients_management'; // Ingredients management

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
    key: 'calendars_events',
    name: 'Calendars & Events',
    description: 'Calendar view and event management',
    category: 'content',
  },
  {
    key: 'specials_management',
    name: 'Specials Management',
    description: 'Food and drink specials management (up to 1 year in advance)',
    category: 'content',
  },
  {
    key: 'signage_management',
    name: 'Digital Signage',
    description: 'TV signage playlist, themes, and custom slides',
    category: 'content',
  },
  {
    key: 'menu_management',
    name: 'Menu Management',
    description: 'Full menu management beyond specials',
    category: 'operations',
  },
  {
    key: 'menu_import',
    name: 'Menu Import',
    description: 'Import menus from external platforms (Toast, Square, CSV, JSON, etc.)',
    category: 'operations',
  },
  {
    key: 'online_ordering',
    name: 'Online Ordering',
    description: 'Online ordering system for customers',
    category: 'operations',
  },
  {
    key: 'boh_connections',
    name: 'BOH Connections',
    description: 'Back of house connections (KDS, POS integrations, printing)',
    category: 'operations',
  },
  {
    key: 'staff_scheduling',
    name: 'Staff Scheduling',
    description: 'Staff scheduling and timeclock management',
    category: 'operations',
  },
  {
    key: 'reporting_analytics',
    name: 'Reporting & Analytics',
    description: 'Reporting dashboard and analytics',
    category: 'analytics',
  },
  {
    key: 'social_media',
    name: 'Social Media',
    description: 'Social media management and cross-posting',
    category: 'marketing',
  },
  {
    key: 'homepage_management',
    name: 'Homepage Management',
    description: 'Homepage content management',
    category: 'content',
  },
  {
    key: 'activity_log',
    name: 'Activity Log',
    description: 'Activity log and audit trail',
    category: 'administration',
  },
  {
    key: 'users_staff_management',
    name: 'Users & Staff Management',
    description: 'User and staff account management',
    category: 'administration',
  },
  {
    key: 'purchase_orders',
    name: 'Purchase Orders',
    description: 'Purchase orders and supplier management',
    category: 'operations',
  },
  {
    key: 'ingredients_management',
    name: 'Ingredients Management',
    description: 'Ingredients and inventory management',
    category: 'operations',
  },
];

/**
 * Initialize default feature flags in the database
 * Only creates flags that don't already exist
 */
export async function initializeFeatureFlags() {
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
        isEnabled:
          flag.key === 'calendars_events' ||
          flag.key === 'specials_management' ||
          flag.key === 'signage_management', // Enable core content + signage by default
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
 * Update a feature flag (only admin should call this)
 */
export async function updateFeatureFlag(
  key: FeatureFlagKey,
  isEnabled: boolean
): Promise<FeatureFlag> {
  await initializeFeatureFlags();
  
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

