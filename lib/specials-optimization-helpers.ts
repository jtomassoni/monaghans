/**
 * Specials Optimization Helpers
 * Functions for analyzing drink special performance and profitability
 */

export interface DrinkSpecialPerformance {
  specialId: string;
  title: string;
  type: string;
  appliesOn: string[] | null;
  timeWindow: string | null;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  performanceByDay: Record<string, {
    revenue: number;
    orders: number;
    averageOrderValue: number;
  }>;
  profitability: {
    estimatedProfit: number;
    profitMargin: number | null;
  };
  recommendation: string;
  performanceScore: number; // 0-100
}

export interface SpecialSuggestion {
  type: 'optimal_day' | 'optimal_time' | 'price_adjustment' | 'new_special';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  currentPerformance?: {
    revenue: number;
    orders: number;
    profitMargin: number | null;
  };
  suggestedChange?: string;
  expectedImpact?: string;
}

/**
 * Analyze drink special performance by day of week
 */
export function analyzeDrinkSpecialPerformance(
  specials: Array<{
    id: string;
    title: string;
    type: string;
    appliesOn: string | null; // JSON array
    timeWindow: string | null;
  }>,
  orders: Array<{
    createdAt: Date | string;
    items: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
    total: number;
  }>,
  periodDays: number = 30
): DrinkSpecialPerformance[] {
  const performances: DrinkSpecialPerformance[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const special of specials) {
    if (special.type !== 'drink') continue;

    const appliesOn = special.appliesOn ? JSON.parse(special.appliesOn) : [];
    const specialTitle = special.title.toLowerCase();
    const timeWindow = special.timeWindow?.toLowerCase() || '';

    // Find orders that match this special
    const matchingOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const dayName = dayNames[orderDate.getDay()];

      // Check if order was placed on a day when special applies
      if (appliesOn.length > 0 && !appliesOn.includes(dayName)) {
        return false;
      }

      // Check if order items match special (simple keyword matching)
      const orderItems = order.items.map(item => item.name.toLowerCase()).join(' ');
      const matchesSpecial = orderItems.includes(specialTitle) || 
                            specialTitle.split(' ').some(word => orderItems.includes(word));

      return matchesSpecial;
    });

    // Calculate metrics
    const totalRevenue = matchingOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = matchingOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate performance by day
    const performanceByDay: Record<string, { revenue: number; orders: number; averageOrderValue: number }> = {};
    for (const dayName of dayNames) {
      const dayOrders = matchingOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return dayNames[orderDate.getDay()] === dayName;
      });

      const dayRevenue = dayOrders.reduce((sum, order) => sum + order.total, 0);
      const dayOrderCount = dayOrders.length;
      const dayAvgValue = dayOrderCount > 0 ? dayRevenue / dayOrderCount : 0;

      performanceByDay[dayName] = {
        revenue: dayRevenue,
        orders: dayOrderCount,
        averageOrderValue: dayAvgValue,
      };
    }

    // Estimate profitability (simplified: assume 60% profit margin for drinks)
    const estimatedProfit = totalRevenue * 0.6;
    const profitMargin = totalRevenue > 0 ? 60 : null;

    // Calculate performance score (0-100)
    // Based on revenue per day, order frequency, and consistency
    const avgDailyRevenue = totalRevenue / periodDays;
    const avgDailyOrders = totalOrders / periodDays;
    const revenueScore = Math.min(avgDailyRevenue / 100, 1) * 40; // Max 40 points
    const orderScore = Math.min(avgDailyOrders / 5, 1) * 30; // Max 30 points
    const consistencyScore = totalOrders > 0 ? Math.min(Object.values(performanceByDay).filter(d => d.orders > 0).length / 7, 1) * 30 : 0; // Max 30 points
    const performanceScore = Math.round(revenueScore + orderScore + consistencyScore);

    // Generate recommendation
    let recommendation = '';
    if (totalOrders === 0) {
      recommendation = 'No orders detected for this special. Consider promoting it more or adjusting the offer.';
    } else if (performanceScore < 30) {
      recommendation = 'Low performance. Consider changing the day, time, or offer.';
    } else if (performanceScore < 60) {
      recommendation = 'Moderate performance. Review which days perform best and optimize accordingly.';
    } else {
      const bestDay = Object.entries(performanceByDay)
        .sort((a, b) => b[1].revenue - a[1].revenue)[0];
      recommendation = `Strong performance. Best day: ${bestDay[0]} ($${bestDay[1].revenue.toFixed(2)}). Consider expanding to similar days.`;
    }

    performances.push({
      specialId: special.id,
      title: special.title,
      type: special.type,
      appliesOn: appliesOn.length > 0 ? appliesOn : null,
      timeWindow: special.timeWindow,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      performanceByDay,
      profitability: {
        estimatedProfit,
        profitMargin,
      },
      recommendation,
      performanceScore,
    });
  }

  return performances.sort((a, b) => b.performanceScore - a.performanceScore);
}

/**
 * Suggest optimal specials based on historical data
 */
export function suggestOptimalSpecials(
  specialPerformances: DrinkSpecialPerformance[],
  historicalOrders: Array<{
    createdAt: Date | string;
    items: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
    total: number;
  }>
): SpecialSuggestion[] {
  const suggestions: SpecialSuggestion[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Analyze best performing days
  const dayPerformance: Record<string, { revenue: number; orders: number }> = {};
  for (const dayName of dayNames) {
    dayPerformance[dayName] = { revenue: 0, orders: 0 };
  }

  for (const perf of specialPerformances) {
    for (const [day, data] of Object.entries(perf.performanceByDay)) {
      if (dayPerformance[day]) {
        dayPerformance[day].revenue += data.revenue;
        dayPerformance[day].orders += data.orders;
      }
    }
  }

  // Find best and worst days
  const sortedDays = Object.entries(dayPerformance)
    .sort((a, b) => b[1].revenue - a[1].revenue);
  const bestDay = sortedDays[0];
  const worstDay = sortedDays[sortedDays.length - 1];

  // Suggest optimal day for new specials
  if (bestDay[1].revenue > worstDay[1].revenue * 2) {
    suggestions.push({
      type: 'optimal_day',
      priority: 'high',
      title: `Consider Running Specials on ${bestDay[0]}`,
      description: `${bestDay[0]} shows the highest revenue ($${bestDay[1].revenue.toFixed(2)}) and order volume (${bestDay[1].orders}). Consider scheduling new specials on this day.`,
      currentPerformance: {
        revenue: bestDay[1].revenue,
        orders: bestDay[1].orders,
        profitMargin: null,
      },
      suggestedChange: `Schedule new drink specials on ${bestDay[0]}`,
      expectedImpact: `Expected to increase special revenue by 20-30% based on historical performance.`,
    });
  }

  // Analyze time windows
  const timeWindowPerformance = new Map<string, { revenue: number; orders: number }>();
  for (const perf of specialPerformances) {
    if (perf.timeWindow) {
      const key = perf.timeWindow;
      const existing = timeWindowPerformance.get(key) || { revenue: 0, orders: 0 };
      existing.revenue += perf.totalRevenue;
      existing.orders += perf.totalOrders;
      timeWindowPerformance.set(key, existing);
    }
  }

  // Find best time window
  if (timeWindowPerformance.size > 0) {
    const bestTimeWindow = Array.from(timeWindowPerformance.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)[0];

    suggestions.push({
      type: 'optimal_time',
      priority: 'medium',
      title: `Best Time Window: ${bestTimeWindow[0]}`,
      description: `Specials during "${bestTimeWindow[0]}" generate the highest revenue ($${bestTimeWindow[1].revenue.toFixed(2)}) and orders (${bestTimeWindow[1].orders}).`,
      currentPerformance: {
        revenue: bestTimeWindow[1].revenue,
        orders: bestTimeWindow[1].orders,
        profitMargin: null,
      },
      suggestedChange: `Schedule new specials during ${bestTimeWindow[0]}`,
      expectedImpact: `May increase special performance by 15-25%.`,
    });
  }

  // Identify underperforming specials
  const underperformers = specialPerformances.filter(p => p.performanceScore < 40);
  for (const underperformer of underperformers.slice(0, 3)) {
    suggestions.push({
      type: 'price_adjustment',
      priority: 'medium',
      title: `Review Special: ${underperformer.title}`,
      description: `This special has low performance (score: ${underperformer.performanceScore}/100). Consider adjusting the offer, day, or time window.`,
      currentPerformance: {
        revenue: underperformer.totalRevenue,
        orders: underperformer.totalOrders,
        profitMargin: underperformer.profitability.profitMargin,
      },
      suggestedChange: `Review and optimize "${underperformer.title}"`,
      expectedImpact: `Improving this special could increase revenue by $${(underperformer.totalRevenue * 0.3).toFixed(2)} per month.`,
    });
  }

  return suggestions;
}

/**
 * Calculate profitability of drink specials
 */
export function calculateDrinkSpecialProfitability(
  specialPerformances: DrinkSpecialPerformance[],
  averageDrinkCost: number = 1.50, // Average cost per drink
  averageDrinkPrice: number = 6.00 // Average price per drink
): Array<DrinkSpecialPerformance & { 
  costOfGoods: number;
  netProfit: number;
  profitMargin: number;
}> {
  return specialPerformances.map(perf => {
    // Estimate number of drinks sold (simplified: assume average order contains 2 drinks)
    const estimatedDrinksSold = perf.totalOrders * 2;
    const costOfGoods = estimatedDrinksSold * averageDrinkCost;
    const netProfit = perf.totalRevenue - costOfGoods;
    const profitMargin = perf.totalRevenue > 0 
      ? (netProfit / perf.totalRevenue) * 100 
      : 0;

    return {
      ...perf,
      costOfGoods,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
    };
  });
}

