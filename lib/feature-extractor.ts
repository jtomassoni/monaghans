import fs from 'fs';
import path from 'path';

/**
 * Feature information extracted from the codebase
 */
export interface FeatureInfo {
  id: string;
  name: string;
  route: string;
  type: 'page' | 'api' | 'component';
  lastModified?: Date;
  metadata?: Record<string, any>;
}

/**
 * Extract all admin pages/routes from the codebase
 */
export function extractAdminPages(): FeatureInfo[] {
  const adminDir = path.join(process.cwd(), 'app', 'admin');
  const features: FeatureInfo[] = [];

  if (!fs.existsSync(adminDir)) {
    return features;
  }

  function scanDirectory(dir: string, baseRoute: string = '/admin'): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const route = `${baseRoute}/${entry.name}`;

      if (entry.isDirectory()) {
        // Check if this directory has a page.tsx
        const pagePath = path.join(fullPath, 'page.tsx');
        if (fs.existsSync(pagePath)) {
          const stats = fs.statSync(pagePath);
          features.push({
            id: route.replace(/\//g, '-').replace(/^-/, ''),
            name: entry.name.charAt(0).toUpperCase() + entry.name.slice(1).replace(/-/g, ' '),
            route: route,
            type: 'page',
            lastModified: stats.mtime,
          });
        }

        // Recursively scan subdirectories
        scanDirectory(fullPath, route);
      } else if (entry.name === 'page.tsx' && dir !== adminDir) {
        // This is a page.tsx file
        const stats = fs.statSync(fullPath);
        const route = baseRoute === '/admin' ? '/admin' : baseRoute;
        const dirName = path.basename(dir);
        
        features.push({
          id: route.replace(/\//g, '-').replace(/^-/, ''),
          name: dirName.charAt(0).toUpperCase() + dirName.slice(1).replace(/-/g, ' '),
          route: route,
          type: 'page',
          lastModified: stats.mtime,
        });
      }
    }
  }

  scanDirectory(adminDir);
  return features;
}

/**
 * Extract all API endpoints from the codebase
 */
export function extractApiEndpoints(): FeatureInfo[] {
  const apiDir = path.join(process.cwd(), 'app', 'api');
  const features: FeatureInfo[] = [];

  if (!fs.existsSync(apiDir)) {
    return features;
  }

  function scanApiDirectory(dir: string, baseRoute: string = '/api'): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Check for route.ts or route.js
        const routePath = path.join(fullPath, 'route.ts');
        const routeJsPath = path.join(fullPath, 'route.js');
        
        if (fs.existsSync(routePath) || fs.existsSync(routeJsPath)) {
          const routeFile = fs.existsSync(routePath) ? routePath : routeJsPath;
          const stats = fs.statSync(routeFile);
          const route = `${baseRoute}/${entry.name}`;
          
          features.push({
            id: route.replace(/\//g, '-').replace(/^-/, ''),
            name: entry.name.charAt(0).toUpperCase() + entry.name.slice(1).replace(/-/g, ' '),
            route: route,
            type: 'api',
            lastModified: stats.mtime,
          });
        }

        // Recursively scan subdirectories
        scanApiDirectory(fullPath, `${baseRoute}/${entry.name}`);
      }
    }
  }

  scanApiDirectory(apiDir);
  return features;
}

/**
 * Extract features from FEATURES.md
 */
export function extractFeaturesFromMarkdown(): FeatureInfo[] {
  const featuresFile = path.join(process.cwd(), 'FEATURES.md');
  const features: FeatureInfo[] = [];

  if (!fs.existsSync(featuresFile)) {
    return features;
  }

  const content = fs.readFileSync(featuresFile, 'utf-8');
  const lines = content.split('\n');

  let currentFeature: Partial<FeatureInfo> | null = null;
  let inFeatureSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for feature headers (### or ##)
    if (line.startsWith('###') || line.startsWith('##')) {
      if (currentFeature && currentFeature.name) {
        features.push(currentFeature as FeatureInfo);
      }

      const featureName = line.replace(/^#+\s*/, '').replace(/\*\*Status:\*\*.*$/, '').trim();
      if (featureName && featureName !== 'Overview' && featureName !== 'Core Features') {
        currentFeature = {
          id: featureName.toLowerCase().replace(/\s+/g, '-'),
          name: featureName,
          route: '', // Will be determined from Key Files/Routes
          type: 'page',
        };
        inFeatureSection = true;
      }
    } else if (inFeatureSection && line.startsWith('- **Key Files/Routes:**')) {
      // Extract routes from this section
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('-')) {
        const routeLine = lines[j].trim();
        const routeMatch = routeLine.match(/`([^`]+)`/);
        if (routeMatch && currentFeature) {
          const filePath = routeMatch[1];
          // Extract route from file path
          if (filePath.startsWith('app/admin/')) {
            const route = filePath.replace('app/admin/', '/admin/').replace('/page.tsx', '');
            if (!currentFeature.route) {
              currentFeature.route = route;
            }
          } else if (filePath.startsWith('app/api/')) {
            const route = filePath.replace('app/api/', '/api/').replace('/route.ts', '');
            if (!currentFeature.route) {
              currentFeature.route = route;
            }
          }
        }
        j++;
      }
    }
  }

  // Add the last feature
  if (currentFeature && currentFeature.name) {
    features.push(currentFeature as FeatureInfo);
  }

  return features;
}

/**
 * Get all features from the codebase
 */
export function getAllFeatures(): FeatureInfo[] {
  const adminPages = extractAdminPages();
  const apiEndpoints = extractApiEndpoints();
  const markdownFeatures = extractFeaturesFromMarkdown();

  // Combine and deduplicate by route
  const featureMap = new Map<string, FeatureInfo>();

  for (const feature of [...adminPages, ...apiEndpoints, ...markdownFeatures]) {
    if (feature.route) {
      const existing = featureMap.get(feature.route);
      if (!existing || (feature.lastModified && existing.lastModified && feature.lastModified > existing.lastModified)) {
        featureMap.set(feature.route, feature);
      }
    }
  }

  return Array.from(featureMap.values());
}

/**
 * Map route to feature key for help documentation
 */
export function routeToFeatureKey(route: string): string | null {
  const routeMap: Record<string, string> = {
    '/admin': 'events',
    '/admin/events': 'events',
    '/admin/menu': 'menu',
    '/admin/food-specials': 'specials',
    '/admin/drink-specials': 'specials',
    '/admin/announcements': 'announcements',
    '/admin/homepage': 'homepage',
    '/admin/settings': 'settings',
    '/admin/signage': 'signage',
  };

  // Exact match
  if (routeMap[route]) {
    return routeMap[route];
  }

  // Prefix match
  for (const [key, value] of Object.entries(routeMap)) {
    if (route.startsWith(key)) {
      return value;
    }
  }

  return null;
}

