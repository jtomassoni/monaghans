/**
 * Menu Optimization Helpers
 * Functions for analyzing ingredient overlap, consolidation opportunities,
 * and inventory optimization
 */

export interface IngredientOverlap {
  ingredient1: {
    id: string;
    name: string;
    category: string;
  };
  ingredient2: {
    id: string;
    name: string;
    category: string;
  };
  similarity: number; // 0-1 score
  sharedMenuItems: number;
  menuItemNames: string[];
  consolidationOpportunity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface ConsolidationSuggestion {
  type: 'ingredient' | 'prep_item';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  ingredients: Array<{
    id: string;
    name: string;
    usedIn: number;
  }>;
  estimatedSavings: number; // in dollars per month
  action: string;
}

export interface InventoryOptimization {
  ingredientId: string;
  ingredientName: string;
  category: string;
  currentStock: number | null;
  parLevel: number | null;
  usageRate: number; // units per day
  daysUntilDepletion: number | null;
  turnoverRate: number; // times per month
  status: 'healthy' | 'low_stock' | 'overstocked' | 'no_data';
  recommendation: string;
}

/**
 * Calculate similarity between two ingredient names
 * Uses simple string matching and keyword extraction
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const normalize = (str: string) => str.toLowerCase().trim();
  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Exact match
  if (n1 === n2) return 1.0;

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = Math.min(n1.length, n2.length);
    const longer = Math.max(n1.length, n2.length);
    return shorter / longer;
  }

  // Extract keywords (split by common separators)
  const keywords1 = n1.split(/[\s\-_,]+/).filter(k => k.length > 2);
  const keywords2 = n2.split(/[\s\-_,]+/).filter(k => k.length > 2);

  // Count matching keywords
  const matches = keywords1.filter(k1 => keywords2.some(k2 => k1 === k2 || k1.includes(k2) || k2.includes(k1)));
  if (matches.length === 0) return 0;

  // Calculate similarity based on keyword overlap
  const totalKeywords = new Set([...keywords1, ...keywords2]).size;
  return matches.length / totalKeywords;
}

/**
 * Find ingredient overlap and consolidation opportunities
 */
export function findIngredientOverlaps(
  ingredients: Array<{
    id: string;
    name: string;
    category: string;
  }>,
  menuItemIngredients: Array<{
    menuItemId: string;
    menuItemName: string;
    ingredientId: string;
  }>
): IngredientOverlap[] {
  const overlaps: IngredientOverlap[] = [];
  const ingredientMap = new Map<string, Set<string>>(); // ingredientId -> Set of menuItemIds

  // Build ingredient to menu items map
  for (const mi of menuItemIngredients) {
    if (!ingredientMap.has(mi.ingredientId)) {
      ingredientMap.set(mi.ingredientId, new Set());
    }
    ingredientMap.get(mi.ingredientId)!.add(mi.menuItemId);
  }

  // Compare all pairs of ingredients
  for (let i = 0; i < ingredients.length; i++) {
    for (let j = i + 1; j < ingredients.length; j++) {
      const ing1 = ingredients[i];
      const ing2 = ingredients[j];

      // Only compare ingredients in the same category or with similar names
      const nameSimilarity = calculateNameSimilarity(ing1.name, ing2.name);
      if (ing1.category !== ing2.category && nameSimilarity < 0.3) {
        continue;
      }

      const menuItems1 = ingredientMap.get(ing1.id) || new Set();
      const menuItems2 = ingredientMap.get(ing2.id) || new Set();

      // Find shared menu items
      const shared = new Set([...menuItems1].filter(x => menuItems2.has(x)));
      const sharedCount = shared.size;

      if (sharedCount > 0 || nameSimilarity > 0.5) {
        const totalMenuItems = new Set([...menuItems1, ...menuItems2]).size;
        const similarity = nameSimilarity * 0.5 + (sharedCount / Math.max(totalMenuItems, 1)) * 0.5;

        const menuItemNames = Array.from(shared).map(id => {
          const mi = menuItemIngredients.find(m => m.menuItemId === id);
          return mi?.menuItemName || 'Unknown';
        });

        let opportunity: 'high' | 'medium' | 'low' = 'low';
        if (similarity > 0.7 || (sharedCount >= 3 && nameSimilarity > 0.4)) {
          opportunity = 'high';
        } else if (similarity > 0.5 || sharedCount >= 2) {
          opportunity = 'medium';
        }

        let suggestion = '';
        if (nameSimilarity > 0.7) {
          suggestion = `Consider consolidating "${ing1.name}" and "${ing2.name}" - they appear to be the same ingredient with different names.`;
        } else if (sharedCount >= 3) {
          suggestion = `These ingredients are used together in ${sharedCount} menu items. Consider if they can be combined or if one can replace the other.`;
        } else {
          suggestion = `These ingredients share ${sharedCount} menu item(s). Review if consolidation is possible.`;
        }

        overlaps.push({
          ingredient1: ing1,
          ingredient2: ing2,
          similarity,
          sharedMenuItems: sharedCount,
          menuItemNames,
          consolidationOpportunity: opportunity,
          suggestion,
        });
      }
    }
  }

  // Sort by opportunity (high first) then by similarity
  return overlaps.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.consolidationOpportunity] !== priorityOrder[b.consolidationOpportunity]) {
      return priorityOrder[b.consolidationOpportunity] - priorityOrder[a.consolidationOpportunity];
    }
    return b.similarity - a.similarity;
  });
}

/**
 * Detect redundant prep items (e.g., marinara vs tomato-based pasta sauce)
 */
export function detectRedundantPrepItems(
  ingredients: Array<{
    id: string;
    name: string;
    category: string;
  }>,
  menuItemIngredients: Array<{
    menuItemId: string;
    menuItemName: string;
    ingredientId: string;
  }>
): ConsolidationSuggestion[] {
  const suggestions: ConsolidationSuggestion[] = [];
  const overlaps = findIngredientOverlaps(ingredients, menuItemIngredients);

  // Group high-similarity ingredients
  const highSimilarityGroups = new Map<string, Array<{ id: string; name: string }>>();

  for (const overlap of overlaps) {
    if (overlap.similarity > 0.7 && overlap.consolidationOpportunity === 'high') {
      const key = `${overlap.ingredient1.category}_${Math.round(overlap.similarity * 10)}`;
      if (!highSimilarityGroups.has(key)) {
        highSimilarityGroups.set(key, []);
      }
      const group = highSimilarityGroups.get(key)!;
      
      // Add ingredients if not already in group
      if (!group.find(g => g.id === overlap.ingredient1.id)) {
        group.push({ id: overlap.ingredient1.id, name: overlap.ingredient1.name });
      }
      if (!group.find(g => g.id === overlap.ingredient2.id)) {
        group.push({ id: overlap.ingredient2.id, name: overlap.ingredient2.name });
      }
    }
  }

  // Create suggestions for each group
  for (const [key, group] of highSimilarityGroups) {
    if (group.length >= 2) {
      // Count usage for each ingredient
      const usageCounts = group.map(ing => {
        const count = menuItemIngredients.filter(mi => mi.ingredientId === ing.id).length;
        return { id: ing.id, name: ing.name, usedIn: count };
      });

      // Estimate savings (simplified: assume 10% cost reduction from consolidation)
      const estimatedSavings = usageCounts.reduce((sum, ing) => sum + ing.usedIn, 0) * 5; // $5 per menu item per month

      suggestions.push({
        type: 'prep_item',
        priority: 'high',
        title: `Potential Redundant Prep Items: ${group.map(g => g.name).join(', ')}`,
        description: `These ${group.length} ingredients have very similar names and may be redundant prep items. Consider consolidating them into a single ingredient.`,
        ingredients: usageCounts,
        estimatedSavings,
        action: `Review these ingredients and consolidate if they serve the same purpose.`,
      });
    }
  }

  return suggestions;
}

/**
 * Calculate inventory optimization metrics
 */
export function calculateInventoryOptimization(
  ingredients: Array<{
    id: string;
    name: string;
    category: string;
    currentStock: number | null;
    parLevel: number | null;
    costPerUnit: number;
  }>,
  usageData: Array<{
    ingredientId: string;
    quantityUsed: number; // total units used in period
    periodDays: number;
  }>
): InventoryOptimization[] {
  const optimizations: InventoryOptimization[] = [];
  const usageMap = new Map<string, { quantityUsed: number; periodDays: number }>();

  for (const usage of usageData) {
    usageMap.set(usage.ingredientId, usage);
  }

  for (const ingredient of ingredients) {
    const usage = usageMap.get(ingredient.id);
    const usageRate = usage ? usage.quantityUsed / usage.periodDays : 0;
    const turnoverRate = usageRate * 30; // monthly turnover

    let daysUntilDepletion: number | null = null;
    if (ingredient.currentStock !== null && usageRate > 0) {
      daysUntilDepletion = ingredient.currentStock / usageRate;
    }

    let status: 'healthy' | 'low_stock' | 'overstocked' | 'no_data' = 'no_data';
    let recommendation = '';

    if (ingredient.currentStock === null || ingredient.parLevel === null) {
      status = 'no_data';
      recommendation = 'Set current stock and par level to enable inventory tracking.';
    } else if (usageRate === 0) {
      status = 'overstocked';
      recommendation = 'No usage detected. Consider removing from inventory or finding alternative uses.';
    } else if (daysUntilDepletion !== null && daysUntilDepletion < 3) {
      status = 'low_stock';
      recommendation = `Stock is critically low. Reorder immediately. Current stock will last ${daysUntilDepletion.toFixed(1)} days.`;
    } else if (daysUntilDepletion !== null && daysUntilDepletion < (ingredient.parLevel / usageRate)) {
      status = 'low_stock';
      recommendation = `Stock is below par level. Consider reordering soon.`;
    } else if (daysUntilDepletion !== null && daysUntilDepletion > 60) {
      status = 'overstocked';
      recommendation = `Stock is high (${daysUntilDepletion.toFixed(0)} days supply). Consider reducing order quantity to improve turnover.`;
    } else {
      status = 'healthy';
      recommendation = `Stock levels are healthy. Current supply: ${daysUntilDepletion?.toFixed(0) || 'N/A'} days.`;
    }

    optimizations.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      category: ingredient.category,
      currentStock: ingredient.currentStock,
      parLevel: ingredient.parLevel,
      usageRate,
      daysUntilDepletion,
      turnoverRate,
      status,
      recommendation,
    });
  }

  return optimizations.sort((a, b) => {
    // Sort by status priority: low_stock > no_data > overstocked > healthy
    const statusPriority = { low_stock: 4, no_data: 3, overstocked: 2, healthy: 1 };
    return statusPriority[b.status] - statusPriority[a.status];
  });
}

