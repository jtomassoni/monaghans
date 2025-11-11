'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Privacy-safe analytics component
 * Tracks pageviews only - no personal data, no cookies, no tracking IDs
 */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Only track public pages (not admin pages)
    if (pathname && !pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
      // Use sendBeacon for reliable tracking that doesn't block page unload
      const data = JSON.stringify({
        path: pathname,
        timestamp: new Date().toISOString(),
      });

      // Try sendBeacon first (more reliable), fallback to fetch
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/pageview', data);
      } else {
        fetch('/api/analytics/pageview', {
          method: 'POST',
          body: data,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {
          // Silently fail - analytics should never break the user experience
        });
      }
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}

