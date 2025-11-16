/**
 * Supplier Cost Analysis Helpers
 * Functions for comparing costs across suppliers and analyzing pricing
 */

export interface SupplierCostComparison {
  ingredientId: string;
  ingredientName: string;
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    productId: string;
    productName: string;
    unit: string;
    price: number;
    minOrderQty: number;
    leadTimeDays: number | null;
    lastPriceUpdate: Date | null;
  }>;
  bestPrice: {
    supplierId: string;
    supplierName: string;
    price: number;
    savings: number | null; // Savings vs current cost
  };
  currentCost: number;
  recommendation: string;
}

export interface CostAnalysis {
  ingredientId: string;
  ingredientName: string;
  currentCost: number;
  supplierOptions: Array<{
    supplierId: string;
    supplierName: string;
    price: number;
    unit: string;
    minOrderQty: number;
    totalCost: number; // Price * minOrderQty
    costPerUnit: number; // Adjusted for unit conversion if needed
    leadTimeDays: number | null;
  }>;
  bestOption: {
    supplierId: string;
    supplierName: string;
    price: number;
    potentialSavings: number; // Savings vs current cost
    savingsPercentage: number;
  } | null;
}

/**
 * Compare costs across suppliers for an ingredient
 */
export function compareSupplierCosts(
  ingredient: {
    id: string;
    name: string;
    unit: string;
    costPerUnit: number;
  },
  supplierProducts: Array<{
    id: string;
    supplierId: string;
    supplierName: string;
    name: string;
    unit: string;
    currentPrice: number;
    minOrderQty: number | null;
    leadTimeDays: number | null;
    lastPriceUpdate: Date | null;
  }>
): SupplierCostComparison {
  // Filter products that match this ingredient
  const matchingProducts = supplierProducts.filter(p => 
    p.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
    ingredient.name.toLowerCase().includes(p.name.toLowerCase())
  );

  // Convert prices to same unit if needed (simplified - assumes same unit for now)
  const supplierOptions = matchingProducts.map(product => ({
    supplierId: product.supplierId,
    supplierName: product.supplierName,
    productId: product.id,
    productName: product.name,
    unit: product.unit,
    price: product.currentPrice,
    minOrderQty: product.minOrderQty || 1,
    leadTimeDays: product.leadTimeDays,
    lastPriceUpdate: product.lastPriceUpdate,
  }));

  // Find best price
  const sortedByPrice = [...supplierOptions].sort((a, b) => a.price - b.price);
  const bestPrice = sortedByPrice[0] || null;

  let recommendation = '';
  if (bestPrice) {
    const savings = ingredient.costPerUnit - bestPrice.price;
    const savingsPercent = (savings / ingredient.costPerUnit) * 100;
    
    if (savingsPercent > 10) {
      recommendation = `Consider switching to ${bestPrice.supplierName} - potential savings of ${savingsPercent.toFixed(1)}% ($${savings.toFixed(2)} per ${ingredient.unit})`;
    } else if (savingsPercent > 0) {
      recommendation = `${bestPrice.supplierName} offers a slightly better price ($${savings.toFixed(2)} savings per ${ingredient.unit})`;
    } else {
      recommendation = `Current supplier offers the best price among available options`;
    }
  } else {
    recommendation = 'No supplier products found for this ingredient';
  }

  return {
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    suppliers: supplierOptions,
    bestPrice: bestPrice ? {
      supplierId: bestPrice.supplierId,
      supplierName: bestPrice.supplierName,
      price: bestPrice.price,
      savings: bestPrice.price < ingredient.costPerUnit 
        ? ingredient.costPerUnit - bestPrice.price 
        : null,
    } : {
      supplierId: '',
      supplierName: 'None',
      price: 0,
      savings: null,
    },
    currentCost: ingredient.costPerUnit,
    recommendation,
  };
}

/**
 * Analyze cost for an ingredient across all suppliers
 */
export function analyzeIngredientCost(
  ingredient: {
    id: string;
    name: string;
    unit: string;
    costPerUnit: number;
  },
  supplierProducts: Array<{
    id: string;
    supplierId: string;
    supplierName: string;
    name: string;
    unit: string;
    currentPrice: number;
    minOrderQty: number | null;
    leadTimeDays: number | null;
  }>
): CostAnalysis {
  // Find matching products
  const matchingProducts = supplierProducts.filter(p => {
    const productName = p.name.toLowerCase();
    const ingredientName = ingredient.name.toLowerCase();
    return productName.includes(ingredientName) || 
           ingredientName.includes(productName) ||
           productName.split(/\s+/).some(word => ingredientName.includes(word));
  });

  const supplierOptions = matchingProducts.map(product => {
    const minQty = product.minOrderQty || 1;
    const totalCost = product.currentPrice * minQty;
    
    return {
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      price: product.currentPrice,
      unit: product.unit,
      minOrderQty: minQty,
      totalCost,
      costPerUnit: product.currentPrice, // Simplified - assumes same unit
      leadTimeDays: product.leadTimeDays,
    };
  });

  // Find best option
  const sortedOptions = [...supplierOptions].sort((a, b) => a.costPerUnit - b.costPerUnit);
  const bestOption = sortedOptions[0] || null;

  let bestOptionWithSavings = null;
  if (bestOption && bestOption.costPerUnit < ingredient.costPerUnit) {
    const potentialSavings = ingredient.costPerUnit - bestOption.costPerUnit;
    const savingsPercentage = (potentialSavings / ingredient.costPerUnit) * 100;
    
    bestOptionWithSavings = {
      supplierId: bestOption.supplierId,
      supplierName: bestOption.supplierName,
      price: bestOption.costPerUnit,
      potentialSavings,
      savingsPercentage,
    };
  }

  return {
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    currentCost: ingredient.costPerUnit,
    supplierOptions,
    bestOption: bestOptionWithSavings,
  };
}

/**
 * Calculate true cost per menu item including all ingredients from suppliers
 */
export function calculateTrueMenuItemCost(
  menuItem: {
    id: string;
    name: string;
  },
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
  }>,
  supplierProducts: Array<{
    ingredientId: string | null;
    currentPrice: number;
    unit: string;
  }>
): {
  currentCost: number;
  optimizedCost: number;
  potentialSavings: number;
  savingsPercentage: number;
  ingredients: Array<{
    ingredientId: string;
    ingredientName: string;
    currentCost: number;
    optimizedCost: number;
    savings: number;
  }>;
} {
  let currentCost = 0;
  let optimizedCost = 0;
  const ingredientBreakdown: Array<{
    ingredientId: string;
    ingredientName: string;
    currentCost: number;
    optimizedCost: number;
    savings: number;
  }> = [];

  for (const ingredient of ingredients) {
    const ingredientCost = ingredient.costPerUnit * ingredient.quantity;
    currentCost += ingredientCost;

    // Find best supplier price for this ingredient
    const matchingProducts = supplierProducts.filter(p => p.ingredientId === ingredient.id);
    const bestPrice = matchingProducts.length > 0
      ? Math.min(...matchingProducts.map(p => p.currentPrice))
      : ingredient.costPerUnit;

    const optimizedIngredientCost = bestPrice * ingredient.quantity;
    optimizedCost += optimizedIngredientCost;

    ingredientBreakdown.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      currentCost: ingredientCost,
      optimizedCost: optimizedIngredientCost,
      savings: ingredientCost - optimizedIngredientCost,
    });
  }

  const potentialSavings = currentCost - optimizedCost;
  const savingsPercentage = currentCost > 0 
    ? (potentialSavings / currentCost) * 100 
    : 0;

  return {
    currentCost,
    optimizedCost,
    potentialSavings,
    savingsPercentage,
    ingredients: ingredientBreakdown,
  };
}

