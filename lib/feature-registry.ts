import { FeatureInfo, getAllFeatures, routeToFeatureKey } from './feature-extractor';
import { FeatureKey } from './help-keywords';

/**
 * Central registry of all features in the system
 */
export class FeatureRegistry {
  private features: Map<string, FeatureInfo>;
  private featuresByKey: Map<FeatureKey, FeatureInfo[]>;

  constructor() {
    this.features = new Map();
    this.featuresByKey = new Map();
    this.loadFeatures();
  }

  /**
   * Load all features from the codebase
   */
  private loadFeatures(): void {
    const allFeatures = getAllFeatures();

    for (const feature of allFeatures) {
      // Store by route
      this.features.set(feature.route, feature);

      // Store by feature key
      const featureKey = routeToFeatureKey(feature.route);
      if (featureKey) {
        const existing = this.featuresByKey.get(featureKey as FeatureKey) || [];
        existing.push(feature);
        this.featuresByKey.set(featureKey as FeatureKey, existing);
      }
    }
  }

  /**
   * Get all features
   */
  getAllFeatures(): FeatureInfo[] {
    return Array.from(this.features.values());
  }

  /**
   * Get feature by route
   */
  getFeatureByRoute(route: string): FeatureInfo | undefined {
    return this.features.get(route);
  }

  /**
   * Get features by feature key
   */
  getFeaturesByKey(featureKey: FeatureKey): FeatureInfo[] {
    return this.featuresByKey.get(featureKey) || [];
  }

  /**
   * Get all admin pages
   */
  getAdminPages(): FeatureInfo[] {
    return this.getAllFeatures().filter((f) => f.type === 'page' && f.route.startsWith('/admin'));
  }

  /**
   * Get all API endpoints
   */
  getApiEndpoints(): FeatureInfo[] {
    return this.getAllFeatures().filter((f) => f.type === 'api');
  }

  /**
   * Check if a route exists
   */
  routeExists(route: string): boolean {
    return this.features.has(route);
  }

  /**
   * Get routes that should have help documentation
   */
  getRoutesNeedingDocs(): string[] {
    const adminPages = this.getAdminPages();
    // Filter out login, error pages, and dynamic routes that don't need separate docs
    return adminPages
      .map((f) => f.route)
      .filter((route) => {
        // Skip login and error pages
        if (route.includes('/login') || route.includes('/error')) {
          return false;
        }
        // Skip dynamic routes (they're covered by parent pages)
        if (route.includes('/[id]') || route.includes('/new')) {
          return false;
        }
        return true;
      });
  }
}

// Singleton instance
let registryInstance: FeatureRegistry | null = null;

/**
 * Get the feature registry instance
 */
export function getFeatureRegistry(): FeatureRegistry {
  if (!registryInstance) {
    registryInstance = new FeatureRegistry();
  }
  return registryInstance;
}

