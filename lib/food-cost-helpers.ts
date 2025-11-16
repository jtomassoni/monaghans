/**
 * Food Cost Helpers
 * Functions to calculate food costs, parse prices, and analyze menu item profitability
 */

export interface MenuItemIngredient {
  quantity: number;
  ingredient: {
    costPerUnit: number;
  };
}

/**
 * Parse a price string to extract numeric value
 * Handles formats like "$14", "$8-12", "14.99", "Market Price", etc.
 * Returns the first numeric value found, or null if none found
 */
export function parsePrice(priceString: string | null | undefined): number | null {
  if (!priceString) return null;
  
  // Remove currency symbols and whitespace
  const cleaned = priceString.trim().replace(/[$,\s]/g, '');
  
  // Try to extract first number (handles ranges like "8-12" by taking first)
  const match = cleaned.match(/^(\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]);
  }
  
  return null;
}

/**
 * Calculate total food cost for a menu item based on its ingredients
 */
export function calculateFoodCost(ingredients: MenuItemIngredient[]): number {
  return ingredients.reduce((total, miIng) => {
    return total + (miIng.ingredient.costPerUnit * miIng.quantity);
  }, 0);
}

/**
 * Calculate food cost percentage (food cost / menu price * 100)
 * Returns null if price cannot be parsed
 */
export function calculateFoodCostPercentage(
  foodCost: number,
  menuPrice: string | null | undefined
): number | null {
  const price = parsePrice(menuPrice);
  if (price === null || price === 0) return null;
  
  return Math.round((foodCost / price) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Get food cost status (low, medium, high)
 * Industry standards: < 30% = good, 30-35% = acceptable, > 35% = high
 */
export function getFoodCostStatus(percentage: number | null): 'good' | 'acceptable' | 'high' | 'unknown' {
  if (percentage === null) return 'unknown';
  if (percentage < 30) return 'good';
  if (percentage <= 35) return 'acceptable';
  return 'high';
}

/**
 * Format food cost percentage for display
 */
export function formatFoodCostPercentage(percentage: number | null): string {
  if (percentage === null) return 'N/A';
  return `${percentage.toFixed(1)}%`;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

