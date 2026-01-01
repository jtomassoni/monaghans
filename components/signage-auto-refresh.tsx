'use client';

import { useEffect, useRef } from 'react';

type SignageAutoRefreshProps = {
  /**
   * Initial version timestamp from server-side render
   */
  initialVersion: number;
  /**
   * Polling interval in milliseconds (default: 1 hour)
   */
  pollIntervalMs?: number;
  /**
   * Whether to enable auto-refresh (default: true)
   */
  enabled?: boolean;
};

/**
 * Component that polls for signage updates and automatically refreshes the page
 * when changes are detected. Designed for digital signage displays that may not
 * have keyboard access.
 */
export default function SignageAutoRefresh({
  initialVersion,
  pollIntervalMs = 3600000, // 1 hour default (3600000 ms)
  enabled = true,
}: SignageAutoRefreshProps) {
  const currentVersionRef = useRef(initialVersion);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const checkForUpdates = async () => {
      // Prevent concurrent checks
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const response = await fetch('/api/signage/version', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          console.warn('[SignageAutoRefresh] Failed to check version:', response.statusText);
          isCheckingRef.current = false;
          return;
        }

        const data = await response.json();
        const newVersion = data.timestamp;

        // If version changed, reload the page
        if (newVersion && newVersion > currentVersionRef.current) {
          console.log('[SignageAutoRefresh] Update detected, reloading page...');
          // Use window.location.reload() for a full page refresh
          window.location.reload();
          return;
        }

        // Update current version
        currentVersionRef.current = newVersion;
      } catch (error) {
        // Silently handle errors (network issues, etc.) - don't spam console
        console.warn('[SignageAutoRefresh] Error checking for updates:', error);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Start polling
    pollIntervalRef.current = setInterval(checkForUpdates, pollIntervalMs);

    // Also check immediately after a short delay (to avoid checking during initial load)
    const initialCheckTimeout = setTimeout(checkForUpdates, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      clearTimeout(initialCheckTimeout);
    };
  }, [pollIntervalMs, enabled]);

  // This component doesn't render anything
  return null;
}

