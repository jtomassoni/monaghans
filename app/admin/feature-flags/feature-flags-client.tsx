'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FeatureFlag, FeatureFlagKey, FEATURE_FLAG_DEPENDENCIES } from '@/lib/feature-flags';
import { FaToggleOn, FaToggleOff, FaInfoCircle } from 'react-icons/fa';
import { showToast } from '@/components/toast';
import { clearFeatureFlagsCache } from '@/lib/use-feature-flags';

const CATEGORY_LABELS: Record<string, string> = {
  content: 'Content',
  operations: 'Operations',
  analytics: 'Analytics',
  marketing: 'Marketing',
  administration: 'Administration',
  other: 'Other',
};

export default function FeatureFlagsClient() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feature-flags');
      if (!response.ok) {
        throw new Error('Failed to fetch feature flags');
      }
      const data = await response.json();
      setFlags(data.flags);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    const flagKey = key as FeatureFlagKey;
    
    // Check dependencies if enabling
    if (newValue) {
      const dependencies = FEATURE_FLAG_DEPENDENCIES[flagKey] || [];
      const enabledFlags = new Set(flags.filter(f => f.isEnabled).map(f => f.key));
      const missingDependencies = dependencies.filter(dep => !enabledFlags.has(dep));
      
      if (missingDependencies.length > 0) {
        const missingNames = missingDependencies
          .map(dep => flags.find(f => f.key === dep)?.name || dep)
          .join(', ');
        const errorMessage = `Cannot enable "${flags.find(f => f.key === key)?.name || key}". Required dependencies: ${missingNames}`;
        setError(errorMessage);
        showToast(errorMessage, 'error');
        return;
      }
    } else {
      // When disabling, the backend will auto-disable dependent flags
      // So we allow it and let the backend handle the cascade
      // Just show a warning if there are enabled dependent flags
      const dependentFlags = flags.filter(flag => {
        const deps = FEATURE_FLAG_DEPENDENCIES[flag.key as FeatureFlagKey] || [];
        return flag.isEnabled && deps.includes(flagKey);
      });
      
      if (dependentFlags.length > 0) {
        const dependentNames = dependentFlags.map(f => f.name).join(', ');
        // Don't block, just warn - backend will auto-disable them
        showToast(`Disabling will also disable: ${dependentNames}`, 'info');
      }
    }
    
    // Optimistically update the flag immediately
    setFlags(prevFlags => 
      prevFlags.map(flag => 
        flag.key === key ? { ...flag, isEnabled: newValue } : flag
      )
    );
    
    // Clear previous error
    setError(null);

    try {
      setSaving(true);

      const response = await fetch('/api/feature-flags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: [{ key, isEnabled: newValue }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          throw new Error('You do not have permission to update feature flags. Only admin can toggle flags.');
        }
        throw new Error(errorData.error || 'Failed to update feature flag');
      }

      // Refresh flags to get any auto-enabled dependencies
      await fetchFlags();
      
      // Clear the feature flags cache so other components refresh
      clearFeatureFlagsCache();
      
      // Show success toast
      const flagName = flags.find(f => f.key === key)?.name || 'Feature flag';
      const deps = FEATURE_FLAG_DEPENDENCIES[flagKey] || [];
      const message = newValue 
        ? `${flagName} enabled${deps.length > 0 ? ' (dependencies auto-enabled)' : ''}`
        : `${flagName} disabled`;
      showToast(message, 'success');
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('featureFlagsUpdated'));
    } catch (err) {
      // Revert on error
      setFlags(prevFlags => 
        prevFlags.map(flag => 
          flag.key === key ? { ...flag, isEnabled: currentValue } : flag
        )
      );
      const errorMessage = err instanceof Error ? err.message : 'Failed to update feature flag';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Sort flags so parents come before children (topological sort)
  const sortFlagsByDependencies = (flags: FeatureFlag[]): FeatureFlag[] => {
    const sorted: FeatureFlag[] = [];
    const visited = new Set<string>();
    const inProgress = new Set<string>();

    const visit = (flag: FeatureFlag) => {
      if (inProgress.has(flag.key)) {
        // Circular dependency - just add it
        return;
      }
      if (visited.has(flag.key)) {
        return;
      }

      inProgress.add(flag.key);
      
      // Visit dependencies first
      const deps = FEATURE_FLAG_DEPENDENCIES[flag.key as FeatureFlagKey] || [];
      for (const depKey of deps) {
        const depFlag = flags.find(f => f.key === depKey);
        if (depFlag && !visited.has(depKey)) {
          visit(depFlag);
        }
      }

      inProgress.delete(flag.key);
      if (!visited.has(flag.key)) {
        visited.add(flag.key);
        sorted.push(flag);
      }
    };

    // Visit all flags
    for (const flag of flags) {
      if (!visited.has(flag.key)) {
        visit(flag);
      }
    }

    // Add any flags that weren't visited (shouldn't happen, but safety check)
    for (const flag of flags) {
      if (!visited.has(flag.key)) {
        sorted.push(flag);
      }
    }

    return sorted;
  };

  // Get dependency depth for visual nesting
  const getDependencyDepth = (flagKey: FeatureFlagKey): number => {
    const deps = FEATURE_FLAG_DEPENDENCIES[flagKey] || [];
    if (deps.length === 0) return 0;
    
    // Get max depth of dependencies + 1
    return Math.max(...deps.map(dep => getDependencyDepth(dep))) + 1;
  };

  // Group flags by category and sort within each category
  const flagsByCategory = useMemo(() => {
    const grouped = flags.reduce((acc, flag) => {
      const category = flag.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(flag);
      return acc;
    }, {} as Record<string, FeatureFlag[]>);

    // Sort each category's flags by dependencies
    for (const category in grouped) {
      grouped[category] = sortFlagsByDependencies(grouped[category]);
    }

    return grouped;
  }, [flags]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading feature flags...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-1.5 text-xs text-red-800 dark:text-red-200 mb-2 mx-4 sm:mx-6 mt-2">
          {error}
        </div>
      )}

      {/* Scrollable Content with Section Headers */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 py-3">
          {/* Ultra-Compact Table Layout */}
          <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-tight">Feature Flag</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center w-[10%]">Status</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-tight text-center w-[8%]">Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(flagsByCategory).map(([category, categoryFlags], categoryIndex) => (
                  <React.Fragment key={category}>
                    <tr>
                      <td colSpan={3} className="px-0 py-0">
                        <div className={`py-2 bg-gray-100 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 ${categoryIndex > 0 ? 'border-t' : ''}`}>
                          <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                            {CATEGORY_LABELS[category] || category}
                          </h2>
                        </div>
                      </td>
                    </tr>
                    {/* Feature Flags for this category */}
                    {categoryFlags.map((flag) => {
                      const depth = getDependencyDepth(flag.key as FeatureFlagKey);
                      const dependencies = FEATURE_FLAG_DEPENDENCIES[flag.key as FeatureFlagKey] || [];
                      const hasDependencies = dependencies.length > 0;
                      const parentFlag = hasDependencies && dependencies.length > 0
                        ? flags.find(f => dependencies.includes(f.key as FeatureFlagKey))
                        : null;
                      const isDisabledByParent = FEATURE_FLAG_DEPENDENCIES[flag.key as FeatureFlagKey]?.some(dep => 
                        !flags.find(f => f.key === dep)?.isEnabled
                      ) && !flag.isEnabled;
                      
                      return (
                        <tr
                          key={flag.key}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                            depth > 0 ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          {/* Flag Name Column */}
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-start gap-1.5">
                              {depth > 0 && (
                                <span className="text-blue-500 dark:text-blue-400 text-sm mt-0.5 flex-shrink-0">└</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-sm font-medium leading-snug ${
                                    isDisabledByParent
                                      ? 'text-gray-400 dark:text-gray-500 line-through'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {flag.name}
                                  </span>
                                </div>
                                {flag.description && (
                                  <p className={`text-xs leading-snug mt-0.5 ${
                                    isDisabledByParent
                                      ? 'text-gray-400 dark:text-gray-500'
                                      : 'text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {flag.description}
                                  </p>
                                )}
                                {hasDependencies && parentFlag && (
                                  <span className={`text-xs block leading-snug mt-0.5 ${
                                    !parentFlag.isEnabled
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {!parentFlag.isEnabled ? '⚠ ' : ''}Requires: {parentFlag.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          {/* Status Column */}
                          <td className="px-3 py-2 align-top text-center">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded leading-tight ${
                              flag.isEnabled
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : isDisabledByParent
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {isDisabledByParent
                                ? 'Parent Off'
                                : flag.isEnabled ? 'On' : 'Off'}
                            </span>
                          </td>
                          
                          {/* Toggle Column */}
                          <td className="px-3 py-2 align-top text-center">
                            <button
                              onClick={() => {
                                const deps = FEATURE_FLAG_DEPENDENCIES[flag.key as FeatureFlagKey] || [];
                                const hasDisabledParent = deps.some(dep => !flags.find(f => f.key === dep)?.isEnabled);
                                if (hasDisabledParent && !flag.isEnabled) {
                                  const disabledParent = flags.find(f => deps.includes(f.key as FeatureFlagKey) && !f.isEnabled);
                                  showToast(`Cannot enable: ${disabledParent?.name || 'parent flag'} must be enabled first`, 'error');
                                  return;
                                }
                                toggleFlag(flag.key, flag.isEnabled);
                              }}
                              disabled={saving || FEATURE_FLAG_DEPENDENCIES[flag.key as FeatureFlagKey]?.some(dep => 
                                !flags.find(f => f.key === dep)?.isEnabled
                              )}
                              className={`transition-all w-7 h-7 flex items-center justify-center rounded ${
                                saving 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
                              } ${
                                FEATURE_FLAG_DEPENDENCIES[flag.key as FeatureFlagKey]?.some(dep => 
                                  !flags.find(f => f.key === dep)?.isEnabled
                                ) ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              aria-label={`${flag.isEnabled ? 'Disable' : 'Enable'} ${flag.name}`}
                              type="button"
                              title={`${flag.name}${flag.description ? ': ' + flag.description : ''}`}
                            >
                              {flag.isEnabled ? (
                                <FaToggleOn className="w-5 h-5 text-green-500 dark:text-green-400" />
                              ) : (
                                <FaToggleOff className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
                </tbody>
              </table>
            </div>
            
            {flags.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                No feature flags found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

