import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import {
  analyzeLowMarginHighVolumeItems,
  suggestMenuChangesFromSalesPatterns,
  generatePriceAdjustmentInsights,
  suggestMenuCombinations,
  identifyEarlyTrends,
  forecastMenuItemDemand,
  forecastIngredientNeeds,
  type AIMenuOptimization,
  type AutomatedInsight,
  type DemandForecast,
  type IngredientForecast,
} from '@/lib/ai-insights-helpers';
import {
  calculateFoodCost,
  parsePrice,
} from '@/lib/food-cost-helpers';
import {
  calculateLaborCostPerItem,
  calculateAverageHourlyWage,
} from '@/lib/labor-cost-helpers';
import {
  calculateProfitabilityMetrics,
} from '@/lib/profitability-helpers';
import { getMountainTimeDateString, getMountainTimeToday, parseMountainTimeDate } from '@/lib/timezone';

/**
 * AI-Powered Insights API
 * Generates AI-powered recommendations, automated insights, and predictive analytics
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const includePOS = searchParams.get('includePOS') !== 'false';
    const includeOnline = searchParams.get('includeOnline') !== 'false';

    const days = parseInt(period);
    const today = getMountainTimeToday();
    const startDateStr = getMountainTimeDateString(new Date(today.getTime() - days * 24 * 60 * 60 * 1000));
    const startDate = parseMountainTimeDate(startDateStr);
    const endDate = new Date(today);
    // Set to end of day in Mountain Time (23:59:59.999)
    endDate.setUTCHours(endDate.getUTCHours() + 23, 59, 59, 999);

    // Get menu items with costs
    const menuItems = await prisma.menuItem.findMany({
      include: {
        section: {
          select: {
            id: true,
            name: true,
            menuType: true,
          },
        },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                costPerUnit: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    // Get average hourly wage
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        hourlyWage: true,
      },
    });
    const averageHourlyWage = calculateAverageHourlyWage(employees);

    // Calculate costs for menu items
    const itemsWithCosts = menuItems.map(item => {
      const foodCost = calculateFoodCost(item.ingredients);
      const laborCost = calculateLaborCostPerItem(item.prepTimeMin, averageHourlyWage);
      const menuPrice = parsePrice(item.price);

      return {
        id: item.id,
        name: item.name,
        section: item.section.name,
        price: item.price,
        menuPrice,
        foodCost,
        laborCost,
      };
    });

    // Get online orders
    let onlineOrders: any[] = [];
    if (includeOnline) {
      onlineOrders = await prisma.order.findMany({
        where: {
          status: { in: ['completed', 'ready'] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }

    // Get POS sales
    let posSales: any[] = [];
    if (includePOS) {
      posSales = await prisma.pOSSale.findMany({
        where: {
          saleDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }

    // Aggregate sales by menu item
    const itemSales = new Map<string, {
      menuItemId: string;
      name: string;
      quantity: number;
      revenue: number;
      foodCost: number;
      laborCost: number;
      profitMargin: number | null;
    }>();

    // Process online orders
    for (const order of onlineOrders) {
      for (const item of order.items) {
        if (!item.menuItemId) continue;
        
        const itemCosts = itemsWithCosts.find(i => i.id === item.menuItemId);
        if (!itemCosts) continue;

        const existing = itemSales.get(item.menuItemId) || {
          menuItemId: item.menuItemId,
          name: itemCosts.name,
          quantity: 0,
          revenue: 0,
          foodCost: itemCosts.foodCost,
          laborCost: itemCosts.laborCost ?? 0,
          profitMargin: null,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        itemSales.set(item.menuItemId, existing);
      }
    }

    // Process POS sales
    for (const sale of posSales) {
      for (const item of sale.items) {
        if (!item.menuItemId) continue;
        
        const itemCosts = itemsWithCosts.find(i => i.id === item.menuItemId);
        if (!itemCosts) continue;

        const existing = itemSales.get(item.menuItemId) || {
          menuItemId: item.menuItemId,
          name: itemCosts.name,
          quantity: 0,
          revenue: 0,
          foodCost: itemCosts.foodCost,
          laborCost: itemCosts.laborCost ?? 0,
          profitMargin: null,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice * item.quantity;
        itemSales.set(item.menuItemId, existing);
      }
    }

    // Calculate profit margins
    const menuItemPerformance = Array.from(itemSales.values()).map(item => {
      const metrics = calculateProfitabilityMetrics(
        item.revenue,
        item.foodCost * item.quantity,
        item.laborCost * item.quantity
      );

      return {
        id: item.menuItemId,
        name: item.name,
        price: itemsWithCosts.find(i => i.id === item.menuItemId)?.price || '',
        revenue: item.revenue,
        quantity: item.quantity,
        foodCost: item.foodCost,
        laborCost: item.laborCost,
        profitMargin: metrics.profitMarginPercentage,
      };
    });

    // Generate AI menu optimizations
    const menuOptimizations = [
      ...analyzeLowMarginHighVolumeItems(menuItemPerformance),
    ];

    // Generate sales pattern-based suggestions
    const salesByDay: Record<string, Array<{ menuItemId: string; quantity: number }>> = {};
    const salesByTime: Record<string, Array<{ menuItemId: string; quantity: number }>> = {};
    const salesHistory: Array<{ date: Date | string; menuItemId: string; menuItemName: string; quantity: number }> = [];

    // Aggregate sales by day and time
    for (const order of [...onlineOrders, ...posSales]) {
      const orderDate = new Date(order.createdAt || order.saleDate);
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][orderDate.getDay()];
      const hour = orderDate.getHours();
      const timeWindow = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

      for (const item of order.items) {
        if (!item.menuItemId) continue;
        
        const menuItemName = itemsWithCosts.find(i => i.id === item.menuItemId)?.name || 'Unknown';
        
        if (!salesByDay[dayName]) salesByDay[dayName] = [];
        salesByDay[dayName].push({ menuItemId: item.menuItemId, quantity: item.quantity });

        if (!salesByTime[timeWindow]) salesByTime[timeWindow] = [];
        salesByTime[timeWindow].push({ menuItemId: item.menuItemId, quantity: item.quantity });

        salesHistory.push({
          date: orderDate,
          menuItemId: item.menuItemId,
          menuItemName,
          quantity: item.quantity,
        });
      }
    }

    const patternBasedOptimizations = suggestMenuChangesFromSalesPatterns(
      menuItemPerformance.map(item => ({
        id: item.id,
        name: item.name,
        section: itemsWithCosts.find(i => i.id === item.id)?.section || '',
        revenue: item.revenue,
        quantity: item.quantity,
        profitMargin: item.profitMargin,
      })),
      salesByDay,
      salesByTime
    );

    menuOptimizations.push(...patternBasedOptimizations);

    // Generate automated insights
    const priceInsights = generatePriceAdjustmentInsights(menuItemPerformance);
    
    // Generate menu combination insights
    const allOrders = [...onlineOrders.map(o => ({
      items: o.items.map((i: any) => ({
        menuItemId: i.menuItemId || '',
        menuItemName: i.menuItem?.name || i.name,
      })),
    }))];
    const combinationInsights = suggestMenuCombinations(allOrders);

    // Identify early trends
    const trendInsights = identifyEarlyTrends(salesHistory, 14);

    const automatedInsights: AutomatedInsight[] = [
      ...priceInsights,
      ...combinationInsights,
      ...trendInsights,
    ];

    // Generate demand forecasts
    const demandForecasts = forecastMenuItemDemand(salesHistory, 7);

    // Get menu item ingredients for ingredient forecasting
    const menuItemIngredients = menuItems.flatMap(item =>
      item.ingredients.map(ing => ({
        menuItemId: item.id,
        ingredientId: ing.ingredient.id,
        ingredientName: ing.ingredient.name,
        quantity: ing.quantity,
        unit: ing.ingredient.unit,
      }))
    );

    // Get current stock levels
    const ingredients = await prisma.ingredient.findMany({
      select: {
        id: true,
        currentStock: true,
        parLevel: true,
      },
    });

    const ingredientForecasts = forecastIngredientNeeds(
      demandForecasts,
      menuItemIngredients,
      ingredients.map(ing => ({
        ingredientId: ing.id,
        currentStock: ing.currentStock,
        parLevel: ing.parLevel,
      })),
      7
    );

    return NextResponse.json({
      menuOptimizations,
      automatedInsights,
      demandForecasts,
      ingredientForecasts,
      generatedAt: new Date().toISOString(),
      period: days,
    });
  } catch (error) {
    return handleError(error, 'Failed to generate AI insights');
  }
}

