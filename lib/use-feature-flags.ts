'use client';

import { useState, useEffect } from 'react';
import { FeatureFlagKey } from './feature-flags';

interface FeatureFlagsState {
  flags: Record<FeatureFlagKey, boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Client-side hook to fetch and use feature flags
 * Caches flags in memory for the session
 */
let cachedFlags: Record<FeatureFlagKey, boolean> | null = null;
let flagsPromise: Promise<Record<FeatureFlagKey, boolean>> | null = null;

export function useFeatureFlags(): FeatureFlagsState {
  // Initialize with default disabled flags for safety
  const defaultFlags: Record<FeatureFlagKey, boolean> = {
    calendars_events: true, // Default enabled
    specials_management: true, // Default enabled
    menu_management: false,
    online_ordering: false,
    boh_connections: false,
    staff_scheduling: false,
    reporting_analytics: false,
    social_media: false,
    homepage_management: false,
    activity_log: false,
    users_staff_management: false,
    purchase_orders: false,
    ingredients_management: false,
  };

  const [flags, setFlags] = useState<Record<FeatureFlagKey, boolean>>(
    cachedFlags || defaultFlags
  );
  const [loading, setLoading] = useState(!cachedFlags);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have cached flags, use them
    if (cachedFlags) {
      setFlags(cachedFlags);
      setLoading(false);
      return;
    }

    // If there's already a request in flight, wait for it
    if (flagsPromise) {
      flagsPromise
        .then((fetchedFlags) => {
          setFlags(fetchedFlags);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
          // On error, use default flags
          setFlags(defaultFlags);
        });
      return;
    }

    // Fetch flags
    flagsPromise = fetch('/api/feature-flags')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch feature flags');
        }
        const data = await res.json();
        const flagsMap: Record<FeatureFlagKey, boolean> = { ...defaultFlags };
        data.flags.forEach((flag: { key: FeatureFlagKey; isEnabled: boolean }) => {
          flagsMap[flag.key] = flag.isEnabled;
        });
        cachedFlags = flagsMap;
        return flagsMap;
      })
      .catch((err) => {
        flagsPromise = null;
        throw err;
      });

    flagsPromise
      .then((fetchedFlags) => {
        setFlags(fetchedFlags);
        setLoading(false);
        flagsPromise = null;
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
        flagsPromise = null;
        // On error, use default flags
        setFlags(defaultFlags);
      });
  }, []);

  return { flags, loading, error };
}

/**
 * Check if a specific feature is enabled
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { flags } = useFeatureFlags();
  return flags[key] ?? false;
}

