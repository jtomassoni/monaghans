'use client';

import { useState, useEffect } from 'react';
import { showToast } from './toast';
import StatusToggle from './status-toggle';
import { FaInfoCircle } from 'react-icons/fa';

interface DigitalSignageSettingsProps {
  userRole: string;
}

interface DigitalSignageConfig {
  features: {
    digitalSignage: {
      enabled: boolean;
      ads?: {
        enabledByAdmin: boolean;
      };
    };
  };
}

export default function DigitalSignageSettings({ userRole }: DigitalSignageSettingsProps) {
  // Only show for admins
  if (userRole !== 'admin') {
    return null;
  }

  const [settings, setSettings] = useState<DigitalSignageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/features');
      if (!response.ok) {
        throw new Error('Failed to fetch digital signage settings');
      }
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching digital signage settings:', error);
      showToast('Failed to load digital signage settings', 'error');
      // Set defaults on error
      setSettings({
        features: {
          digitalSignage: {
            enabled: false,
            ads: {
              enabledByAdmin: false,
            },
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (path: string, value: boolean) => {
    if (!settings) return;

    setSaving(true);
    try {
      // Build update object
      const updates: any = {
        digitalSignage: {
          enabled: settings.features.digitalSignage.enabled,
        },
      };

      if (path === 'digitalSignage.enabled') {
        updates.digitalSignage.enabled = value;
        if (settings.features.digitalSignage.ads) {
          updates.digitalSignage.ads = {
            enabledByAdmin: settings.features.digitalSignage.ads.enabledByAdmin,
          };
        }
      } else if (path === 'ads.enabledByAdmin') {
        updates.digitalSignage.enabled = settings.features.digitalSignage.enabled;
        updates.digitalSignage.ads = {
          enabledByAdmin: value,
        };
      }

      const response = await fetch('/api/settings/features', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          features: updates,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update digital signage settings');
      }

      const updated = await response.json();
      setSettings(updated);
      showToast('Settings updated successfully', 'success');
    } catch (error) {
      console.error('Error updating digital signage settings:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to update settings',
        'error'
      );
      // Refresh settings on error
      fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  const digitalSignageEnabled = settings.features.digitalSignage.enabled;
  const adsEnabled = settings.features.digitalSignage.ads?.enabledByAdmin ?? false;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Digital Signage
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure digital signage display settings and advertising features
        </p>
      </div>

      <div className="space-y-6">
        {/* Digital Signage Enabled Toggle */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Signage Display Active
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Enable or disable the public signage display at /specials-tv. When disabled, the display page shows a "Digital Signage Disabled" message and the admin navigation link is hidden.
            </p>
          </div>
          <StatusToggle
            type="active"
            value={digitalSignageEnabled}
            onChange={(value) => updateSetting('digitalSignage.enabled', value)}
          />
        </div>

        {/* Ads Enabled Toggle (Admin Only) */}
        <div className={`flex items-center justify-between py-4 ${!digitalSignageEnabled ? 'opacity-75' : ''}`}>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Ads Enabled (Billing)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Enable advertising features for billing purposes. When enabled, ads will appear in the signage rotation.
            </p>
            {/* Show dependency requirement */}
            <div className={`flex items-start gap-2 px-3 py-2 rounded-md border ${
              !digitalSignageEnabled
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}>
              <FaInfoCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                !digitalSignageEnabled
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`} />
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-medium ${
                  !digitalSignageEnabled
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {!digitalSignageEnabled 
                    ? '⚠️ Requires: Signage Display Active must be enabled first'
                    : 'Requires: Signage Display Active'}
                </span>
              </div>
            </div>
          </div>
          <StatusToggle
            type="active"
            value={adsEnabled}
            onChange={(value) => {
              if (!digitalSignageEnabled && value) {
                showToast('Please enable "Signage Display Active" first', 'error');
                return;
              }
              updateSetting('ads.enabledByAdmin', value);
            }}
            className={saving || (!digitalSignageEnabled && !adsEnabled) ? 'opacity-50 pointer-events-none' : ''}
          />
        </div>
      </div>

      {saving && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Saving...
        </div>
      )}
    </div>
  );
}

