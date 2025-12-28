'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Comprehensive analytics component for SEO tracking
 * - Google Analytics 4 (GA4) for comprehensive SEO metrics
 * - Privacy-safe internal tracking as fallback
 * Tracks: pageviews, user engagement, search queries, and custom events
 */
export default function Analytics() {
  const pathname = usePathname();
  // Google Analytics 4 Measurement ID
  const ga4MeasurementId = 'G-ZXF5XYV2RY';

  useEffect(() => {
    // Only track public pages (not admin pages)
    if (pathname && !pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
      // Track pageview in internal analytics (privacy-safe)
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

      // Track in Google Analytics 4
      if (typeof window !== 'undefined' && (window as any).gtag) {
        try {
          // Get search params from window.location to avoid Suspense boundary requirement
          const queryString = window.location.search || '';
          const fullPath = pathname + queryString;
          
          // Track pageview
          (window as any).gtag('config', ga4MeasurementId, {
            page_path: fullPath,
            page_title: document.title || '',
          });

          // Track pageview event for better SEO insights
          (window as any).gtag('event', 'page_view', {
            page_path: fullPath,
            page_title: document.title || '',
            page_location: window.location.href,
          });
        } catch (error) {
          // Silently fail - analytics should never break the user experience
          console.error('GA4 tracking error:', error);
        }
      }
    }
  }, [pathname, ga4MeasurementId]);

  return null; // This component doesn't render anything
}

/**
 * Helper function to track custom events for SEO analysis
 * Usage: trackEvent('menu_view', { menu_type: 'food' })
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  // Google Analytics 4 Measurement ID
  const ga4MeasurementId = 'G-ZXF5XYV2RY';
  
  // Track in GA4
  if ((window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
  }

  // Also track in internal analytics for redundancy
  const data = JSON.stringify({
    event: eventName,
    params: eventParams,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/event', data);
  } else {
    fetch('/api/analytics/event', {
      method: 'POST',
      body: data,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Silently fail
    });
  }
}

