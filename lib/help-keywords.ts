/**
 * Help Keywords & Synonym Mapping System
 * 
 * This file maps common user terms, synonyms, and alternative names to feature keys.
 * This enables users to find help documentation using terms they know, even if they
 * don't know the exact feature name.
 * 
 * Structure:
 * - Each feature key maps to an array of keywords/synonyms
 * - Keywords are case-insensitive
 * - Search will match any of these keywords to find the corresponding feature
 * 
 * To add new keywords:
 * 1. Find the feature key (e.g., "events", "menu", "specials")
 * 2. Add your keyword to the array for that feature
 * 3. Keywords can be single words or phrases
 */

export type FeatureKey = 
  | 'events'
  | 'menu'
  | 'specials'
  | 'announcements'
  | 'homepage'
  | 'signage'
  | 'settings';

/**
 * Maps feature keys to arrays of keywords and synonyms
 */
export const helpKeywords: Record<FeatureKey, string[]> = {
  // Calendar & Events
  events: [
    'events',
    'event',
    'calendar',
    'cal',
    'schedule',
    'scheduling',
    'create event',
    'add event',
    'new event',
    'recurring event',
    'recurring',
    'repeat',
    'repeating',
    'drag event',
    'move event',
    'edit event',
    'delete event',
    'rrule',
    'rrule pattern',
    'venue area',
    'tags',
    'event tags',
    'weekly view',
    'monthly view',
    'week view',
    'month view',
  ],

  // Menu Management
  menu: [
    'menu',
    'menu items',
    'menu item',
    'food menu',
    'add item',
    'create item',
    'new item',
    'edit item',
    'delete item',
    'menu sections',
    'menu section',
    'add section',
    'create section',
    'menu management',
    'edit menu',
    'modifiers',
    'item modifiers',
    'availability',
    'item availability',
    'reorder',
    'reorder menu',
    'reorder items',
  ],

  // Specials
  specials: [
    'specials',
    'special',
    'food specials',
    'food special',
    'drink specials',
    'drink special',
    'daily specials',
    'daily special',
    'happy hour',
    'weekday specials',
    'date range',
    'special dates',
    'special images',
    'upload special',
  ],

  // Announcements
  announcements: [
    'announcements',
    'announcement',
    'post',
    'publish',
    'publishing',
    'expiry',
    'expire',
    'expiration',
    'homepage content',
    'create announcement',
    'add announcement',
    'edit announcement',
    'delete announcement',
    'call to action',
    'cta',
    'cta button',
  ],

  // Homepage
  homepage: [
    'homepage',
    'home page',
    'home',
    'hero',
    'hero section',
    'hero image',
    'about section',
    'about',
    'customize homepage',
    'homepage images',
    'homepage content',
    'homepage layout',
  ],

  // Digital Signage
  signage: [
    'signage',
    'digital signage',
    'specials tv',
    'specials television',
    'tv display',
    'television display',
    'slideshow',
    'slide show',
    'wall display',
    'wall mounted',
    'ad campaigns',
    'ad campaign',
    'content slides',
    'upload content',
  ],

  // Settings
  settings: [
    'settings',
    'setting',
    'configuration',
    'config',
    'business hours',
    'hours',
    'business info',
    'business information',
    'shift types',
    'shift type',
    'feature flags',
    'feature flag',
  ],
};

/**
 * Get all keywords for a specific feature
 */
export function getKeywordsForFeature(feature: FeatureKey): string[] {
  return helpKeywords[feature] || [];
}

/**
 * Find feature(s) by keyword
 * Returns all features that match the keyword
 */
export function findFeaturesByKeyword(keyword: string): FeatureKey[] {
  const normalizedKeyword = keyword.toLowerCase().trim();
  const matchingFeatures: FeatureKey[] = [];

  for (const [feature, keywords] of Object.entries(helpKeywords)) {
    const matches = keywords.some(
      (k) =>
        k.toLowerCase() === normalizedKeyword ||
        k.toLowerCase().includes(normalizedKeyword) ||
        normalizedKeyword.includes(k.toLowerCase())
    );
    if (matches) {
      matchingFeatures.push(feature as FeatureKey);
    }
  }

  return matchingFeatures;
}

/**
 * Check if a keyword matches a feature
 */
export function keywordMatchesFeature(keyword: string, feature: FeatureKey): boolean {
  const normalizedKeyword = keyword.toLowerCase().trim();
  const keywords = helpKeywords[feature] || [];

  return keywords.some(
    (k) =>
      k.toLowerCase() === normalizedKeyword ||
      k.toLowerCase().includes(normalizedKeyword) ||
      normalizedKeyword.includes(k.toLowerCase())
  );
}

/**
 * Expand search query with synonyms
 * Returns the original query plus all matching feature keywords
 */
export function expandSearchQuery(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const expanded: string[] = [normalizedQuery];

  // Find all features that match
  const matchingFeatures = findFeaturesByKeyword(normalizedQuery);

  // Add all keywords from matching features
  for (const feature of matchingFeatures) {
    const keywords = helpKeywords[feature];
    expanded.push(...keywords);
  }

  // Remove duplicates and return
  return Array.from(new Set(expanded));
}

