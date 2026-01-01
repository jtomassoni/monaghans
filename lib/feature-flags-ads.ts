import { prisma } from './prisma';

export type UserRole = 'admin' | 'owner';

export interface FeatureFlags {
  features: {
    digitalSignage: {
      enabled: boolean;
      ads?: {
        enabledByAdmin: boolean;
      };
    };
  };
}

const DEFAULT_FEATURES: FeatureFlags = {
  features: {
    digitalSignage: {
      enabled: false,
      ads: {
        enabledByAdmin: false,
      },
    },
  },
};

/**
 * Get feature flags, filtered by user role
 * Admin users receive full feature tree including ads.enabledByAdmin
 * Owner users receive feature tree WITHOUT ads.enabledByAdmin (field omitted entirely)
 * 
 * If the setting doesn't exist, it will be initialized with digitalSignage.enabled = true
 */
export async function getFeatureFlags(userRole: UserRole | null | undefined): Promise<FeatureFlags> {
  let setting = await prisma.setting.findUnique({
    where: { key: 'features' },
  });

  // If setting doesn't exist, initialize it with enabled: true (for fresh DB resets)
  if (!setting) {
    const initialFeatures: FeatureFlags = {
      features: {
        digitalSignage: {
          enabled: true, // Enable by default after DB reset
          ads: {
            enabledByAdmin: false,
          },
        },
      },
    };
    
    setting = await prisma.setting.create({
      data: {
        key: 'features',
        value: JSON.stringify(initialFeatures),
        description: 'Feature flags for digital signage and ads',
      },
    });
  }

  let features: FeatureFlags = DEFAULT_FEATURES;

  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      features = {
        features: {
          digitalSignage: {
            enabled: parsed?.features?.digitalSignage?.enabled ?? false,
            ...(userRole === 'admin' && parsed?.features?.digitalSignage?.ads
              ? { ads: { enabledByAdmin: parsed.features.digitalSignage.ads.enabledByAdmin ?? false } }
              : {}),
          },
        },
      };
    } catch (error) {
      console.error('Failed to parse features setting:', error);
      // Use defaults on parse error
    }
  }

  return features;
}

/**
 * Check if digital signage is enabled (top-level flag)
 */
export async function isDigitalSignageEnabled(): Promise<boolean> {
  const flags = await getFeatureFlags('admin'); // Use admin to get full flags
  return flags.features.digitalSignage.enabled;
}

/**
 * Check if ads are enabled by admin (admin-only flag)
 * Returns false for owners (they cannot see this flag)
 */
export async function isAdsEnabledByAdmin(userRole: UserRole | null | undefined): Promise<boolean> {
  if (userRole !== 'admin') {
    return false; // Owners cannot see or check this flag
  }
  const flags = await getFeatureFlags('admin');
  return flags.features.digitalSignage.ads?.enabledByAdmin ?? false;
}

/**
 * Check if user can manage ads settings (only admins)
 */
export function canManageAdsSettings(userRole: UserRole | null | undefined): boolean {
  return userRole === 'admin';
}

/**
 * Update feature flags (admin only for ads.enabledByAdmin)
 */
export async function updateFeatureFlags(
  updates: Partial<FeatureFlags['features']>,
  userRole: UserRole | null | undefined
): Promise<FeatureFlags> {
  // Get current features
  const current = await getFeatureFlags('admin'); // Get full flags for update

  // Build new features object
  const newFeatures: FeatureFlags['features'] = {
    ...current.features,
    ...updates,
  };

  // If user is not admin, prevent updating ads.enabledByAdmin
  if (userRole !== 'admin' && updates.digitalSignage?.ads) {
    // Remove ads from updates if user is not admin
    delete newFeatures.digitalSignage.ads;
    // Keep existing ads.enabledByAdmin value if it exists
    if (current.features.digitalSignage.ads) {
      newFeatures.digitalSignage.ads = current.features.digitalSignage.ads;
    }
  }

  // Save to database
  await prisma.setting.upsert({
    where: { key: 'features' },
    update: {
      value: JSON.stringify({ features: newFeatures }),
    },
    create: {
      key: 'features',
      value: JSON.stringify({ features: newFeatures }),
      description: 'Feature flags for digital signage and ads',
    },
  });

  // Return filtered flags based on role
  return getFeatureFlags(userRole);
}

