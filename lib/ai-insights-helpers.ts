/**
 * AI-Powered Analytics & Insights Helpers
 * Functions for generating AI-powered recommendations, automated insights,
 * and predictive analytics for menu optimization
 */

export interface AIMenuOptimization {
  type: 'price_adjustment' | 'ingredient_consolidation' | 'menu_restructure' | 'low_margin_support';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  menuItemId?: string;
  menuItemName?: string;
  currentMetrics?: {
    revenue: number;
    quantity: number;
    profitMargin: number | null;
    foodCost: number;
    laborCost: number;
  };
  suggestedChange: string;
  expectedImpact: string;
  confidence: number; // 0-100
}

export interface AutomatedInsight {
  type: 'price_adjustment' | 'menu_combination' | 'trend_identification' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionable: boolean;
  relatedItems?: string[];
  data?: Record<string, any>;
}

export interface DemandForecast {
  menuItemId: string;
  menuItemName: string;
  currentDemand: number; // units per day
  forecastedDemand: number; // units per day for next period
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number; // 0-100
  factors: string[];
}

export interface IngredientForecast {
  ingredientId: string;
  ingredientName: string;
  currentUsageRate: number; // units per day
  forecastedUsageRate: number; // units per day
  daysUntilDepletion: number | null;
  recommendedOrderQuantity: number;
  recommendedOrderDate: Date | null;
  confidence: number; // 0-100
}

/**
 * Analyze menu performance and suggest optimizations for popular low-margin items
 */
export function analyzeLowMarginHighVolumeItems(
  menuItems: Array<{
    id: string;
    name: string;
    price: string;
    revenue: number;
    quantity: number;
    foodCost: number;
    laborCost: number | null;
    profitMargin: number | null;
  }>
): AIMenuOptimization[] {
  const optimizations: AIMenuOptimization[] = [];

  // Identify high-volume, low-margin items
  const lowMarginHighVolume = menuItems.filter(item => {
    const volumeThreshold = 50; // items sold in period
    const marginThreshold = 15; // profit margin percentage
    return item.quantity >= volumeThreshold && 
           (item.profitMargin === null || item.profitMargin < marginThreshold);
  });

  for (const item of lowMarginHighVolume) {
    const menuPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
    const currentMargin = item.profitMargin || 0;
    const currentPrimeCost = item.foodCost + (item.laborCost || 0);
    
    // Calculate optimal price to achieve 20% margin
    const targetMargin = 20;
    const optimalPrice = currentPrimeCost / (1 - targetMargin / 100);
    const priceIncrease = optimalPrice - menuPrice;

    if (priceIncrease > 0.50) { // Only suggest if increase is meaningful
      optimizations.push({
        type: 'low_margin_support',
        priority: 'high',
        title: `Optimize Pricing: ${item.name}`,
        description: `"${item.name}" is a popular item (${item.quantity} sold) but has a low profit margin (${currentMargin.toFixed(1)}%).`,
        menuItemId: item.id,
        menuItemName: item.name,
        currentMetrics: {
          revenue: item.revenue,
          quantity: item.quantity,
          profitMargin: item.profitMargin,
          foodCost: item.foodCost,
          laborCost: item.laborCost || 0,
        },
        suggestedChange: `Increase price from $${menuPrice.toFixed(2)} to $${optimalPrice.toFixed(2)} ($${priceIncrease.toFixed(2)} increase)`,
        expectedImpact: `This would improve profit margin to ${targetMargin}% and increase profit by approximately $${(priceIncrease * item.quantity).toFixed(2)} per period, assuming no volume loss.`,
        confidence: 75,
      });
    }

    // Suggest ingredient optimization
    if (item.foodCost > menuPrice * 0.35) { // Food cost > 35% of price
      optimizations.push({
        type: 'ingredient_consolidation',
        priority: 'medium',
        title: `Review Ingredients: ${item.name}`,
        description: `"${item.name}" has high food costs (${((item.foodCost / menuPrice) * 100).toFixed(1)}% of price). Consider ingredient consolidation or substitution.`,
        menuItemId: item.id,
        menuItemName: item.name,
        currentMetrics: {
          revenue: item.revenue,
          quantity: item.quantity,
          profitMargin: item.profitMargin,
          foodCost: item.foodCost,
          laborCost: item.laborCost || 0,
        },
        suggestedChange: 'Review ingredient list and identify opportunities to consolidate or substitute high-cost ingredients',
        expectedImpact: `Reducing food cost by 10% could improve profit margin by ${((item.foodCost * 0.1 / menuPrice) * 100).toFixed(1)} percentage points.`,
        confidence: 60,
      });
    }
  }

  return optimizations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Suggest menu changes based on sales patterns
 */
export function suggestMenuChangesFromSalesPatterns(
  menuItems: Array<{
    id: string;
    name: string;
    section: string;
    revenue: number;
    quantity: number;
    profitMargin: number | null;
  }>,
  salesByDay: Record<string, Array<{ menuItemId: string; quantity: number }>>,
  salesByTime: Record<string, Array<{ menuItemId: string; quantity: number }>>
): AIMenuOptimization[] {
  const optimizations: AIMenuOptimization[] = [];

  // Find items that sell well on specific days
  const dayPatterns = new Map<string, Map<string, number>>();
  for (const [day, sales] of Object.entries(salesByDay)) {
    for (const sale of sales) {
      if (!dayPatterns.has(sale.menuItemId)) {
        dayPatterns.set(sale.menuItemId, new Map());
      }
      const itemDayMap = dayPatterns.get(sale.menuItemId)!;
      itemDayMap.set(day, (itemDayMap.get(day) || 0) + sale.quantity);
    }
  }

  // Identify items with strong day-of-week patterns
  for (const [menuItemId, dayMap] of dayPatterns.entries()) {
    const menuItem = menuItems.find(m => m.id === menuItemId);
    if (!menuItem) continue;

    const dayEntries = Array.from(dayMap.entries());
    if (dayEntries.length === 0) continue;

    const totalSales = dayEntries.reduce((sum, [, qty]) => sum + qty, 0);
    const avgSalesPerDay = totalSales / 7;
    const bestDay = dayEntries.sort((a, b) => b[1] - a[1])[0];

    // If best day has 2x+ the average, suggest promotion
    if (bestDay[1] >= avgSalesPerDay * 2 && bestDay[1] >= 10) {
      optimizations.push({
        type: 'menu_restructure',
        priority: 'medium',
        title: `Promote ${menuItem.name} on ${bestDay[0]}`,
        description: `"${menuItem.name}" sells ${bestDay[1]} units on ${bestDay[0]}s, which is ${((bestDay[1] / avgSalesPerDay) * 100).toFixed(0)}% above average.`,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        suggestedChange: `Consider featuring "${menuItem.name}" as a special or prominently displaying it on ${bestDay[0]}s`,
        expectedImpact: `Promoting this item on its best day could increase sales by 15-25%.`,
        confidence: 70,
      });
    }
  }

  // Find low-performing items
  const lowPerformers = menuItems
    .filter(item => item.quantity < 5 && item.revenue < 100)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  for (const item of lowPerformers) {
    optimizations.push({
      type: 'menu_restructure',
      priority: 'low',
      title: `Review Low Performer: ${item.name}`,
      description: `"${item.name}" has low sales (${item.quantity} units, $${item.revenue.toFixed(2)} revenue).`,
      menuItemId: item.id,
      menuItemName: item.name,
      currentMetrics: {
        revenue: item.revenue,
        quantity: item.quantity,
        profitMargin: item.profitMargin,
        foodCost: 0,
        laborCost: 0,
      },
      suggestedChange: 'Consider removing from menu, adjusting price, or improving promotion',
      expectedImpact: `Removing low performers can simplify menu and reduce inventory complexity.`,
      confidence: 65,
    });
  }

  return optimizations;
}

/**
 * Generate automated insights for price adjustments
 */
export function generatePriceAdjustmentInsights(
  menuItems: Array<{
    id: string;
    name: string;
    price: string;
    revenue: number;
    quantity: number;
    profitMargin: number | null;
    foodCost: number;
    laborCost: number | null;
  }>
): AutomatedInsight[] {
  const insights: AutomatedInsight[] = [];

  for (const item of menuItems) {
    const menuPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
    if (menuPrice === 0) continue;

    const primeCost = item.foodCost + (item.laborCost || 0);
    const currentMargin = item.profitMargin || 0;

    // Identify items with very low margins
    if (currentMargin < 10 && item.quantity > 20) {
      const optimalPrice = primeCost / 0.8; // Target 20% margin
      const increase = optimalPrice - menuPrice;

      if (increase > 0.25) {
        insights.push({
          type: 'price_adjustment',
          priority: 'high',
          title: `Price Adjustment Opportunity: ${item.name}`,
          message: `Current margin is ${currentMargin.toFixed(1)}%. Consider increasing price from $${menuPrice.toFixed(2)} to $${optimalPrice.toFixed(2)} to achieve 20% margin.`,
          actionable: true,
          relatedItems: [item.id],
          data: {
            currentPrice: menuPrice,
            suggestedPrice: optimalPrice,
            currentMargin,
            targetMargin: 20,
            potentialRevenueIncrease: increase * item.quantity,
          },
        });
      }
    }

    // Identify items with very high margins (may be underpriced)
    if (currentMargin > 50 && item.quantity > 30) {
      insights.push({
        type: 'price_adjustment',
        priority: 'medium',
        title: `High Margin Item: ${item.name}`,
        message: `"${item.name}" has a ${currentMargin.toFixed(1)}% margin and strong sales (${item.quantity} units). This suggests the item is popular and could potentially support a higher price.`,
        actionable: true,
        relatedItems: [item.id],
        data: {
          currentPrice: menuPrice,
          currentMargin,
          quantity: item.quantity,
        },
      });
    }
  }

  return insights;
}

/**
 * Suggest menu item combinations that work well together
 */
export function suggestMenuCombinations(
  orders: Array<{
    items: Array<{ menuItemId: string; menuItemName: string }>;
  }>
): AutomatedInsight[] {
  const insights: AutomatedInsight[] = [];
  const itemPairs = new Map<string, number>(); // "item1|item2" -> count
  const itemCounts = new Map<string, number>(); // itemId -> count

  // Count item pairs in orders
  for (const order of orders) {
    const itemIds = order.items.map(item => item.menuItemId).filter(Boolean);
    
    for (const itemId of itemIds) {
      itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
    }

    // Count pairs
    for (let i = 0; i < itemIds.length; i++) {
      for (let j = i + 1; j < itemIds.length; j++) {
        const pair = [itemIds[i], itemIds[j]].sort().join('|');
        itemPairs.set(pair, (itemPairs.get(pair) || 0) + 1);
      }
    }
  }

  // Find strong pairs (appear together in >20% of orders where both items appear)
  const strongPairs: Array<{ item1: string; item2: string; count: number; strength: number }> = [];
  
  for (const [pair, count] of itemPairs.entries()) {
    const [item1, item2] = pair.split('|');
    const item1Count = itemCounts.get(item1) || 0;
    const item2Count = itemCounts.get(item2) || 0;
    const minCount = Math.min(item1Count, item2Count);
    
    if (minCount > 0 && count >= 5) {
      const strength = (count / minCount) * 100;
      if (strength > 20) {
        strongPairs.push({ item1, item2, count, strength });
      }
    }
  }

  // Get item names
  const itemNames = new Map<string, string>();
  for (const order of orders) {
    for (const item of order.items) {
      if (item.menuItemId && !itemNames.has(item.menuItemId)) {
        itemNames.set(item.menuItemId, item.menuItemName);
      }
    }
  }

  // Generate insights for top 5 pairs
  const topPairs = strongPairs
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  for (const pair of topPairs) {
    const name1 = itemNames.get(pair.item1) || 'Item 1';
    const name2 = itemNames.get(pair.item2) || 'Item 2';
    
    insights.push({
      type: 'menu_combination',
      priority: 'medium',
      title: `Menu Combination: ${name1} + ${name2}`,
      message: `These items are frequently ordered together (${pair.count} times, ${pair.strength.toFixed(1)}% co-occurrence rate). Consider creating a combo or promoting them together.`,
      actionable: true,
      relatedItems: [pair.item1, pair.item2],
      data: {
        coOccurrenceRate: pair.strength,
        orderCount: pair.count,
      },
    });
  }

  return insights;
}

/**
 * Identify trends before they become obvious
 */
export function identifyEarlyTrends(
  salesHistory: Array<{
    date: Date | string;
    menuItemId: string;
    quantity: number;
  }>,
  periodDays: number = 14
): AutomatedInsight[] {
  const insights: AutomatedInsight[] = [];
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(now.getDate() - periodDays);

  // Group sales by menu item and week
  const weeklySales = new Map<string, Map<number, number>>(); // menuItemId -> weekNumber -> quantity

  for (const sale of salesHistory) {
    const saleDate = new Date(sale.date);
    if (saleDate < periodStart) continue;

    const weekNumber = Math.floor((now.getTime() - saleDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    if (!weeklySales.has(sale.menuItemId)) {
      weeklySales.set(sale.menuItemId, new Map());
    }
    const weekMap = weeklySales.get(sale.menuItemId)!;
    weekMap.set(weekNumber, (weekMap.get(weekNumber) || 0) + sale.quantity);
  }

  // Identify trends (increasing/decreasing)
  for (const [menuItemId, weekMap] of weeklySales.entries()) {
    const weeks = Array.from(weekMap.keys()).sort((a, b) => a - b);
    if (weeks.length < 2) continue;

    const recentWeek = weeks[weeks.length - 1];
    const previousWeek = weeks[weeks.length - 2];
    const recentSales = weekMap.get(recentWeek) || 0;
    const previousSales = weekMap.get(previousWeek) || 0;

    // Detect significant changes (>30% increase or decrease)
    if (previousSales > 0) {
      const changePercent = ((recentSales - previousSales) / previousSales) * 100;
      
      if (changePercent > 30 && recentSales >= 5) {
        insights.push({
          type: 'trend_identification',
          priority: 'high',
          title: `Rising Trend Detected`,
          message: `Sales increased ${changePercent.toFixed(0)}% this week (${previousSales} → ${recentSales} units). This may indicate growing popularity.`,
          actionable: true,
          relatedItems: [menuItemId],
          data: {
            changePercent,
            previousSales,
            recentSales,
            trend: 'increasing',
          },
        });
      } else if (changePercent < -30 && previousSales >= 5) {
        insights.push({
          type: 'trend_identification',
          priority: 'medium',
          title: `Declining Trend Detected`,
          message: `Sales decreased ${Math.abs(changePercent).toFixed(0)}% this week (${previousSales} → ${recentSales} units). Consider investigating the cause.`,
          actionable: true,
          relatedItems: [menuItemId],
          data: {
            changePercent,
            previousSales,
            recentSales,
            trend: 'decreasing',
          },
        });
      }
    }
  }

  return insights;
}

/**
 * Forecast demand for menu items using simple moving average and trend analysis
 */
export function forecastMenuItemDemand(
  salesHistory: Array<{
    date: Date | string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
  }>,
  forecastDays: number = 7
): DemandForecast[] {
  const forecasts: DemandForecast[] = [];
  const itemSales = new Map<string, Array<{ date: Date; quantity: number }>>();

  // Group sales by menu item
  for (const sale of salesHistory) {
    if (!itemSales.has(sale.menuItemId)) {
      itemSales.set(sale.menuItemId, []);
    }
    itemSales.get(sale.menuItemId)!.push({
      date: new Date(sale.date),
      quantity: sale.quantity,
    });
  }

  // Calculate forecasts for each item
  for (const [menuItemId, sales] of itemSales.entries()) {
    if (sales.length === 0) continue;

    // Sort by date
    sales.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate daily averages for recent periods
    const now = new Date();
    const last7Days = sales.filter(s => {
      const daysDiff = (now.getTime() - s.date.getTime()) / (24 * 60 * 60 * 1000);
      return daysDiff <= 7;
    });
    const last14Days = sales.filter(s => {
      const daysDiff = (now.getTime() - s.date.getTime()) / (24 * 60 * 60 * 1000);
      return daysDiff <= 14 && daysDiff > 7;
    });

    const avgLast7Days = last7Days.length > 0
      ? last7Days.reduce((sum, s) => sum + s.quantity, 0) / 7
      : 0;
    const avgLast14Days = last14Days.length > 0
      ? last14Days.reduce((sum, s) => sum + s.quantity, 0) / 7
      : 0;

    const currentDemand = avgLast7Days;
    
    // Simple trend calculation
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let forecastedDemand = currentDemand;
    let confidence = 50;

    if (avgLast7Days > 0 && avgLast14Days > 0) {
      const trendPercent = ((avgLast7Days - avgLast14Days) / avgLast14Days) * 100;
      
      if (trendPercent > 10) {
        trend = 'increasing';
        forecastedDemand = currentDemand * 1.1; // Project 10% increase
        confidence = Math.min(70 + Math.round(Math.abs(trendPercent) / 2), 90);
      } else if (trendPercent < -10) {
        trend = 'decreasing';
        forecastedDemand = currentDemand * 0.9; // Project 10% decrease
        confidence = Math.min(70 + Math.round(Math.abs(trendPercent) / 2), 90);
      } else {
        forecastedDemand = currentDemand; // Stable
        confidence = 60;
      }
    } else if (avgLast7Days > 0) {
      forecastedDemand = currentDemand;
      confidence = 40;
    }

    const menuItemName = salesHistory.find(s => s.menuItemId === menuItemId)?.menuItemName || 'Unknown';
    const factors: string[] = [];
    if (trend !== 'stable') {
      factors.push(`${trend} trend detected`);
    }
    if (last7Days.length < 3) {
      factors.push('limited historical data');
      confidence = Math.max(confidence - 20, 20);
    }

    forecasts.push({
      menuItemId,
      menuItemName,
      currentDemand: Math.round(currentDemand * 10) / 10,
      forecastedDemand: Math.round(forecastedDemand * 10) / 10,
      trend,
      confidence,
      factors,
    });
  }

  return forecasts.sort((a, b) => b.forecastedDemand - a.forecastedDemand);
}

/**
 * Predict ingredient needs based on menu item demand forecasts
 */
export function forecastIngredientNeeds(
  menuItemForecasts: DemandForecast[],
  menuItemIngredients: Array<{
    menuItemId: string;
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
  }>,
  currentStock: Array<{
    ingredientId: string;
    currentStock: number | null;
    parLevel: number | null;
  }>,
  forecastDays: number = 7
): IngredientForecast[] {
  const forecasts: IngredientForecast[] = [];
  const ingredientUsage = new Map<string, {
    currentUsageRate: number;
    forecastedUsageRate: number;
    menuItems: string[];
  }>();

  // Calculate usage rates from forecasts
  for (const forecast of menuItemForecasts) {
    for (const miIng of menuItemIngredients) {
      if (miIng.menuItemId === forecast.menuItemId) {
        if (!ingredientUsage.has(miIng.ingredientId)) {
          ingredientUsage.set(miIng.ingredientId, {
            currentUsageRate: 0,
            forecastedUsageRate: 0,
            menuItems: [],
          });
        }
        const usage = ingredientUsage.get(miIng.ingredientId)!;
        usage.currentUsageRate += forecast.currentDemand * miIng.quantity;
        usage.forecastedUsageRate += forecast.forecastedDemand * miIng.quantity;
        usage.menuItems.push(forecast.menuItemName);
      }
    }
  }

  // Generate forecasts
  for (const [ingredientId, usage] of ingredientUsage.entries()) {
    const stock = currentStock.find(s => s.ingredientId === ingredientId);
    const currentStockLevel = stock?.currentStock ?? null;
    const parLevel = stock?.parLevel ?? null;

    let daysUntilDepletion: number | null = null;
    if (currentStockLevel !== null && usage.forecastedUsageRate > 0) {
      daysUntilDepletion = currentStockLevel / usage.forecastedUsageRate;
    }

    // Calculate recommended order quantity (enough for forecastDays + buffer)
    const forecastedNeeds = usage.forecastedUsageRate * forecastDays;
    const buffer = forecastedNeeds * 0.2; // 20% buffer
    const recommendedOrderQuantity = Math.ceil(forecastedNeeds + buffer);

    // Calculate recommended order date (order when stock reaches par level or 3 days before depletion)
    let recommendedOrderDate: Date | null = null;
    if (daysUntilDepletion !== null && parLevel !== null) {
      const daysUntilPar = (currentStockLevel! - parLevel) / usage.forecastedUsageRate;
      if (daysUntilPar > 0 && daysUntilPar < forecastDays) {
        recommendedOrderDate = new Date();
        recommendedOrderDate.setDate(recommendedOrderDate.getDate() + Math.floor(daysUntilPar));
      } else if (daysUntilDepletion < 3) {
        recommendedOrderDate = new Date(); // Order immediately
      }
    } else if (daysUntilDepletion !== null && daysUntilDepletion < 3) {
      recommendedOrderDate = new Date();
    }

    const ingredientName = menuItemIngredients.find(mi => mi.ingredientId === ingredientId)?.ingredientName || 'Unknown';
    
    forecasts.push({
      ingredientId,
      ingredientName,
      currentUsageRate: Math.round(usage.currentUsageRate * 10) / 10,
      forecastedUsageRate: Math.round(usage.forecastedUsageRate * 10) / 10,
      daysUntilDepletion,
      recommendedOrderQuantity,
      recommendedOrderDate,
      confidence: 65, // Moderate confidence for ingredient forecasts
    });
  }

  return forecasts.sort((a, b) => {
    // Sort by urgency (days until depletion)
    if (a.daysUntilDepletion === null && b.daysUntilDepletion === null) return 0;
    if (a.daysUntilDepletion === null) return 1;
    if (b.daysUntilDepletion === null) return -1;
    return a.daysUntilDepletion - b.daysUntilDepletion;
  });
}

