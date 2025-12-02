'use client';

import { useState, useEffect, useMemo } from 'react';
import { FeatureFlag } from '@/lib/feature-flags';
import { FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { showToast } from '@/components/toast';

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
        throw new Error('Failed to update feature flag');
      }

      // Show success toast
      const flagName = flags.find(f => f.key === key)?.name || 'Feature flag';
      showToast(
        `${flagName} ${newValue ? 'enabled' : 'disabled'}`,
        'success'
      );
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

  // Group flags by category (memoized to prevent unnecessary recalculations)
  const flagsByCategory = useMemo(() => {
    return flags.reduce((acc, flag) => {
      const category = flag.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(flag);
      return acc;
    }, {} as Record<string, FeatureFlag[]>);
  }, [flags]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">Loading feature flags...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-2">
        {/* Error Message (toast handles success) */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-xs text-red-800 dark:text-red-200 mb-2">
            {error}
          </div>
        )}

        {/* Two Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {Object.entries(flagsByCategory).map(([category, categoryFlags]) => (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 px-2.5 py-1.5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-[10px] font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                  {CATEGORY_LABELS[category] || category}
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {categoryFlags.map((flag) => (
                  <div
                    key={flag.key}
                    className="px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                            {flag.name}
                          </h3>
                          <span className={`px-1 py-0.5 text-[9px] font-medium rounded-full ${
                            flag.isEnabled
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {flag.isEnabled ? 'On' : 'Off'}
                          </span>
                        </div>
                        {flag.description && (
                          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 leading-tight">
                            {flag.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleFlag(flag.key, flag.isEnabled)}
                        disabled={saving}
                        className={`flex-shrink-0 transition-opacity ${
                          saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                        }`}
                        aria-label={`${flag.isEnabled ? 'Disable' : 'Enable'} ${flag.name}`}
                      >
                        {flag.isEnabled ? (
                          <FaToggleOn className="w-6 h-6 text-green-500 dark:text-green-400" />
                        ) : (
                          <FaToggleOff className="w-6 h-6 text-gray-400 dark:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {flags.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No feature flags found
          </div>
        )}
      </div>
    </div>
  );
}

