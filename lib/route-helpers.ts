/**
 * Client-safe route helper functions
 * These functions don't use Node.js fs module and can be used in client components
 */

/**
 * Map route to feature key for help documentation
 * This is a client-safe version that doesn't require fs access
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

