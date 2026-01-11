'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { FeatureKey } from '@/lib/help-keywords';
import { routeToFeatureKey } from '@/lib/route-helpers';

interface HelpContextType {
  currentFeature: FeatureKey | null;
  currentRoute: string | null;
  setCurrentFeature: (feature: FeatureKey | null) => void;
  setCurrentRoute: (route: string | null) => void;
  getHelpUrl: (feature?: FeatureKey, slug?: string) => string;
  getHelpModalProps: (feature?: FeatureKey, slug?: string) => {
    feature: FeatureKey;
    slug?: string;
  };
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

interface HelpProviderProps {
  children: ReactNode;
}

/**
 * Help Provider - Context for help system
 * Tracks current page/feature context and provides help content based on context
 */
export function HelpProvider({ children }: HelpProviderProps) {
  const pathname = usePathname();
  const [currentFeature, setCurrentFeature] = useState<FeatureKey | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);

  // Auto-detect feature from route
  useEffect(() => {
    if (pathname) {
      setCurrentRoute(pathname);
      
      // Try to extract feature from route
      const feature = routeToFeatureKey(pathname);
      if (feature) {
        setCurrentFeature(feature as FeatureKey);
      } else {
        // Fallback: check if it's an admin route
        if (pathname.startsWith('/admin')) {
          const routeParts = pathname.split('/').filter(Boolean);
          if (routeParts.length >= 2) {
            const adminSection = routeParts[1];
            const sectionToFeature: Record<string, FeatureKey> = {
              'events': 'events',
              'menu': 'menu',
              'food-specials': 'specials',
              'drink-specials': 'specials',
              'announcements': 'announcements',
              'homepage': 'homepage',
              'signage': 'signage',
              'settings': 'settings',
            };
            const mappedFeature = sectionToFeature[adminSection];
            if (mappedFeature) {
              setCurrentFeature(mappedFeature);
            }
          }
        }
      }
    }
  }, [pathname]);

  const getHelpUrl = (feature?: FeatureKey, slug?: string): string => {
    const targetFeature = feature || currentFeature;
    if (!targetFeature) return '/help';
    
    if (slug) {
      return `/help?feature=${targetFeature}&slug=${slug}`;
    }
    return `/help?feature=${targetFeature}`;
  };

  const getHelpModalProps = (feature?: FeatureKey, slug?: string) => {
    const targetFeature = (feature || currentFeature) as FeatureKey;
    if (!targetFeature) {
      throw new Error('Feature is required for help modal');
    }
    
    return {
      feature: targetFeature,
      slug,
    };
  };

  return (
    <HelpContext.Provider
      value={{
        currentFeature,
        currentRoute,
        setCurrentFeature,
        setCurrentRoute,
        getHelpUrl,
        getHelpModalProps,
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}

/**
 * Hook to use help context
 */
export function useHelp() {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}

