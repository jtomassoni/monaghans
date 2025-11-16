/**
 * Schedule Optimization Helpers
 * Functions for analyzing busy hours and suggesting optimal staffing levels
 */

export interface BusyHourAnalysis {
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  dayName: string;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
  busyLevel: 'very_busy' | 'busy' | 'moderate' | 'quiet' | 'closed';
  recommendedStaffing: {
    cooks: number;
    bartenders: number;
    barbacks: number;
  };
}

export interface ScheduleOptimizationSuggestion {
  type: 'staffing_level' | 'shift_timing' | 'role_distribution';
  priority: 'high' | 'medium' | 'low';
  dayOfWeek: number;
  dayName: string;
  hour?: number;
  shiftType?: string;
  title: string;
  description: string;
  currentStaffing?: {
    cooks: number;
    bartenders: number;
    barbacks: number;
  };
  recommendedStaffing: {
    cooks: number;
    bartenders: number;
    barbacks: number;
  };
  expectedImpact: string;
}

/**
 * Analyze busy hours from order data
 */
export function analyzeBusyHours(
  orders: Array<{
    createdAt: Date | string;
    total: number;
    items: Array<{ quantity: number }>;
  }>,
  periodDays: number = 30
): BusyHourAnalysis[] {
  const hourData = new Map<string, {
    orderCount: number;
    revenue: number;
    totalItems: number;
  }>();

  // Aggregate data by hour and day of week
  for (const order of orders) {
    const orderDate = new Date(order.createdAt);
    const hour = orderDate.getHours();
    const dayOfWeek = orderDate.getDay();
    const key = `${dayOfWeek}_${hour}`;

    const existing = hourData.get(key) || {
      orderCount: 0,
      revenue: 0,
      totalItems: 0,
    };

    existing.orderCount += 1;
    existing.revenue += order.total;
    existing.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);

    hourData.set(key, existing);
  }

  // Calculate averages and determine busy levels
  const analyses: BusyHourAnalysis[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Calculate average order count per hour across all days
  const avgOrderCount = Array.from(hourData.values())
    .reduce((sum, data) => sum + data.orderCount, 0) / Math.max(hourData.size, 1);

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${dayOfWeek}_${hour}`;
      const data = hourData.get(key) || {
        orderCount: 0,
        revenue: 0,
        totalItems: 0,
      };

      // Normalize to daily average (divide by period days)
      const normalizedOrderCount = data.orderCount / periodDays;
      const averageOrderValue = data.orderCount > 0 ? data.revenue / data.orderCount : 0;

      // Determine busy level
      let busyLevel: 'very_busy' | 'busy' | 'moderate' | 'quiet' | 'closed' = 'closed';
      if (normalizedOrderCount >= avgOrderCount * 1.5) {
        busyLevel = 'very_busy';
      } else if (normalizedOrderCount >= avgOrderCount * 1.0) {
        busyLevel = 'busy';
      } else if (normalizedOrderCount >= avgOrderCount * 0.5) {
        busyLevel = 'moderate';
      } else if (normalizedOrderCount > 0) {
        busyLevel = 'quiet';
      }

      // Calculate recommended staffing based on busy level and hour
      const recommendedStaffing = calculateRecommendedStaffing(
        busyLevel,
        normalizedOrderCount,
        hour,
        dayOfWeek
      );

      analyses.push({
        hour,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        orderCount: Math.round(normalizedOrderCount * 10) / 10, // Round to 1 decimal
        revenue: data.revenue / periodDays,
        averageOrderValue,
        busyLevel,
        recommendedStaffing,
      });
    }
  }

  return analyses;
}

/**
 * Calculate recommended staffing based on busy level
 */
function calculateRecommendedStaffing(
  busyLevel: 'very_busy' | 'busy' | 'moderate' | 'quiet' | 'closed',
  orderCount: number,
  hour: number,
  dayOfWeek: number
): { cooks: number; bartenders: number; barbacks: number } {
  // Base staffing levels
  const baseStaffing = {
    very_busy: { cooks: 3, bartenders: 3, barbacks: 2 },
    busy: { cooks: 2, bartenders: 2, barbacks: 1 },
    moderate: { cooks: 1, bartenders: 2, barbacks: 1 },
    quiet: { cooks: 1, bartenders: 1, barbacks: 0 },
    closed: { cooks: 0, bartenders: 0, barbacks: 0 },
  };

  if (busyLevel === 'closed') {
    return baseStaffing.closed;
  }

  let staffing = { ...baseStaffing[busyLevel] };

  // Adjust for time of day
  // Breakfast/lunch hours (6am-2pm): more cooks, fewer bartenders
  if (hour >= 6 && hour < 14) {
    staffing.cooks = Math.max(staffing.cooks, 2);
    staffing.bartenders = Math.max(1, staffing.bartenders - 1);
  }

  // Dinner hours (5pm-10pm): balanced
  if (hour >= 17 && hour < 22) {
    staffing.cooks = Math.max(staffing.cooks, 2);
    staffing.bartenders = Math.max(staffing.bartenders, 2);
  }

  // Late night (10pm-2am): more bartenders, fewer cooks
  if (hour >= 22 || hour < 2) {
    staffing.bartenders = Math.max(staffing.bartenders, 2);
    staffing.cooks = Math.max(1, staffing.cooks - 1);
  }

  // Adjust for day of week
  // Weekends typically busier
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
    staffing.cooks = Math.min(staffing.cooks + 1, 4);
    staffing.bartenders = Math.min(staffing.bartenders + 1, 4);
    staffing.barbacks = Math.min(staffing.barbacks + 1, 3);
  }

  // Scale based on order count (rough estimate: 1 staff per 5 orders per hour)
  const staffNeeded = Math.ceil(orderCount / 5);
  if (orderCount > 10) {
    staffing.cooks = Math.max(staffing.cooks, Math.min(staffNeeded, 4));
    staffing.bartenders = Math.max(staffing.bartenders, Math.min(staffNeeded, 4));
  }

  return staffing;
}

/**
 * Generate schedule optimization suggestions
 */
export function generateScheduleOptimizations(
  busyHourAnalyses: BusyHourAnalysis[],
  currentSchedules: Array<{
    date: Date | string;
    shiftType: string;
    employeeRole: string;
    count: number;
  }>,
  periodDays: number = 30
): ScheduleOptimizationSuggestion[] {
  const suggestions: ScheduleOptimizationSuggestion[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group analyses by day of week and shift type
  const dayShiftRecommendations = new Map<string, {
    dayOfWeek: number;
    dayName: string;
    shiftType: string;
    recommended: { cooks: number; bartenders: number; barbacks: number };
    hours: number[];
  }>();

  // Analyze open shift (typically 9am-4pm)
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const openHours = busyHourAnalyses.filter(
      a => a.dayOfWeek === dayOfWeek && a.hour >= 9 && a.hour < 16
    );
    if (openHours.length > 0) {
      const avgRecommended = calculateAverageStaffing(openHours);
      const key = `${dayOfWeek}_open`;
      dayShiftRecommendations.set(key, {
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        shiftType: 'open',
        recommended: avgRecommended,
        hours: openHours.map(h => h.hour),
      });
    }
  }

  // Analyze close shift (typically 4pm-close, around 11pm-2am)
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const closeHours = busyHourAnalyses.filter(
      a => a.dayOfWeek === dayOfWeek && (a.hour >= 16 || a.hour < 2)
    );
    if (closeHours.length > 0) {
      const avgRecommended = calculateAverageStaffing(closeHours);
      const key = `${dayOfWeek}_close`;
      dayShiftRecommendations.set(key, {
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        shiftType: 'close',
        recommended: avgRecommended,
        hours: closeHours.map(h => h.hour),
      });
    }
  }

  // Compare recommendations with current schedules
  for (const [key, recommendation] of dayShiftRecommendations) {
    const currentForDayShift = currentSchedules.filter(
      s => {
        const scheduleDate = new Date(s.date);
        return scheduleDate.getDay() === recommendation.dayOfWeek &&
               s.shiftType === recommendation.shiftType;
      }
    );

    const currentStaffing = {
      cooks: currentForDayShift.filter(s => s.employeeRole === 'cook').reduce((sum, s) => sum + s.count, 0),
      bartenders: currentForDayShift.filter(s => s.employeeRole === 'bartender').reduce((sum, s) => sum + s.count, 0),
      barbacks: currentForDayShift.filter(s => s.employeeRole === 'barback').reduce((sum, s) => sum + s.count, 0),
    };

    const totalCurrent = currentStaffing.cooks + currentStaffing.bartenders + currentStaffing.barbacks;
    const totalRecommended = recommendation.recommended.cooks + 
                             recommendation.recommended.bartenders + 
                             recommendation.recommended.barbacks;

    // Generate suggestion if there's a significant difference
    if (Math.abs(totalCurrent - totalRecommended) >= 1) {
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (Math.abs(totalCurrent - totalRecommended) >= 2) {
        priority = 'high';
      }

      let description = '';
      if (totalRecommended > totalCurrent) {
        description = `Current staffing (${totalCurrent} staff) may be insufficient for ${recommendation.dayName} ${recommendation.shiftType} shift. Recommended: ${totalRecommended} staff.`;
      } else {
        description = `Current staffing (${totalCurrent} staff) may be higher than needed for ${recommendation.dayName} ${recommendation.shiftType} shift. Recommended: ${totalRecommended} staff.`;
      }

      suggestions.push({
        type: 'staffing_level',
        priority,
        dayOfWeek: recommendation.dayOfWeek,
        dayName: recommendation.dayName,
        shiftType: recommendation.shiftType,
        title: `Optimize Staffing: ${recommendation.dayName} ${recommendation.shiftType.charAt(0).toUpperCase() + recommendation.shiftType.slice(1)} Shift`,
        description,
        currentStaffing,
        recommendedStaffing: recommendation.recommended,
        expectedImpact: totalRecommended > totalCurrent
          ? `Increasing staffing may improve service quality and reduce wait times during busy periods.`
          : `Reducing staffing may save labor costs while maintaining service quality.`,
      });
    }
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Calculate average recommended staffing from multiple hour analyses
 */
function calculateAverageStaffing(
  analyses: BusyHourAnalysis[]
): { cooks: number; bartenders: number; barbacks: number } {
  if (analyses.length === 0) {
    return { cooks: 1, bartenders: 1, barbacks: 0 };
  }

  const totals = analyses.reduce(
    (acc, analysis) => ({
      cooks: acc.cooks + analysis.recommendedStaffing.cooks,
      bartenders: acc.bartenders + analysis.recommendedStaffing.bartenders,
      barbacks: acc.barbacks + analysis.recommendedStaffing.barbacks,
    }),
    { cooks: 0, bartenders: 0, barbacks: 0 }
  );

  return {
    cooks: Math.round(totals.cooks / analyses.length),
    bartenders: Math.round(totals.bartenders / analyses.length),
    barbacks: Math.round(totals.barbacks / analyses.length),
  };
}

