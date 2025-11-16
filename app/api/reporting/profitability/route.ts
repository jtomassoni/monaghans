import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
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
  calculateCOGS,
  getProfitabilityStatus,
} from '@/lib/profitability-helpers';

/**
 * Profitability Analytics API
 * Combines food cost, labor cost, and sales data to calculate profitability metrics
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Get all menu items with ingredients and prep times
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
      orderBy: [
        { section: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    // Get average hourly wage for labor cost calculations
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

    // Calculate food and labor costs for each menu item
    const itemsWithCosts = menuItems.map(item => {
      const foodCost = calculateFoodCost(item.ingredients);
      const laborCost = calculateLaborCostPerItem(item.prepTimeMin, averageHourlyWage);
      const menuPrice = parsePrice(item.price);

      return {
        id: item.id,
        name: item.name,
        section: item.section,
        price: item.price,
        menuPrice,
        isAvailable: item.isAvailable,
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
                },
              },
            },
          },
        },
      });
    }

    // Aggregate sales by menu item
    const itemSales = new Map<string, {
      menuItemId: string | null;
      name: string;
      quantity: number;
      revenue: number;
      orderCount: number;
    }>();

    // Process online orders
    for (const order of onlineOrders) {
      for (const item of order.items) {
        const key = item.menuItemId || `custom_${item.name}`;
        const existing = itemSales.get(key) || {
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: 0,
          revenue: 0,
          orderCount: 0,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        existing.orderCount += 1;

        itemSales.set(key, existing);
      }
    }

    // Process POS sales
    for (const sale of posSales) {
      for (const item of sale.items) {
        const key = item.menuItemId || `custom_${item.name}`;
        const existing = itemSales.get(key) || {
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: 0,
          revenue: 0,
          orderCount: 0,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        existing.orderCount += 1;

        itemSales.set(key, existing);
      }
    }

    // Calculate profitability for each item
    const profitabilityData = itemsWithCosts.map(item => {
      const sales = itemSales.get(item.id);
      const revenue = sales?.revenue || 0;
      const quantity = sales?.quantity || 0;
      const orderCount = sales?.orderCount || 0;

      // Calculate per-unit costs
      const unitFoodCost = item.foodCost;
      const unitLaborCost = item.laborCost || 0;

      // Calculate total costs for items sold
      const totalFoodCost = unitFoodCost * quantity;
      const totalLaborCost = unitLaborCost * quantity;

      // Calculate profitability metrics
      const metrics = calculateProfitabilityMetrics(
        revenue,
        totalFoodCost,
        totalLaborCost
      );

      // Calculate per-unit profitability
      const unitRevenue = quantity > 0 ? revenue / quantity : (item.menuPrice || 0);
      const unitMetrics = calculateProfitabilityMetrics(
        unitRevenue,
        unitFoodCost,
        unitLaborCost
      );

      return {
        id: item.id,
        name: item.name,
        section: item.section,
        price: item.price,
        menuPrice: item.menuPrice,
        isAvailable: item.isAvailable,
        quantity,
        revenue,
        orderCount,
        // Per-unit costs
        unitFoodCost,
        unitLaborCost,
        unitPrimeCost: unitMetrics.primeCost,
        unitProfitMargin: unitMetrics.profitMargin,
        unitProfitMarginPercentage: unitMetrics.profitMarginPercentage,
        unitContributionMargin: unitMetrics.contributionMargin,
        unitContributionMarginPercentage: unitMetrics.contributionMarginPercentage,
        // Total costs
        totalFoodCost,
        totalLaborCost,
        totalPrimeCost: metrics.primeCost,
        // Total profitability
        profitMargin: metrics.profitMargin,
        profitMarginPercentage: metrics.profitMarginPercentage,
        contributionMargin: metrics.contributionMargin,
        contributionMarginPercentage: metrics.contributionMarginPercentage,
        // Status
        profitabilityStatus: getProfitabilityStatus(unitMetrics.profitMarginPercentage),
      };
    });

    // Calculate summary statistics
    const totalRevenue = profitabilityData.reduce((sum, item) => sum + item.revenue, 0);
    const totalFoodCost = profitabilityData.reduce((sum, item) => sum + item.totalFoodCost, 0);
    const totalLaborCost = profitabilityData.reduce((sum, item) => sum + item.totalLaborCost, 0);
    const totalPrimeCost = totalFoodCost + totalLaborCost;
    const totalProfitMargin = totalRevenue - totalPrimeCost;
    const totalProfitMarginPercentage = totalRevenue > 0
      ? (totalProfitMargin / totalRevenue) * 100
      : null;
    const totalCOGS = totalPrimeCost;

    // Calculate food cost % vs sales
    const foodCostPercentage = totalRevenue > 0
      ? (totalFoodCost / totalRevenue) * 100
      : null;

    // Calculate labor cost % vs sales
    const laborCostPercentage = totalRevenue > 0
      ? (totalLaborCost / totalRevenue) * 100
      : null;

    // Identify high-volume, low-margin items
    // High volume = quantity > median, Low margin = profit margin % < 20%
    const quantities = profitabilityData
      .filter(item => item.quantity > 0)
      .map(item => item.quantity)
      .sort((a, b) => a - b);
    const medianQuantity = quantities.length > 0
      ? quantities[Math.floor(quantities.length / 2)]
      : 0;

    const highVolumeLowMargin = profitabilityData
      .filter(item => 
        item.quantity > medianQuantity &&
        item.unitProfitMarginPercentage !== null &&
        item.unitProfitMarginPercentage < 20
      )
      .sort((a, b) => a.unitProfitMarginPercentage! - b.unitProfitMarginPercentage!)
      .slice(0, 20);

    // Identify low-volume, high-margin items
    // Low volume = quantity < median, High margin = profit margin % > 25%
    const lowVolumeHighMargin = profitabilityData
      .filter(item => 
        item.quantity < medianQuantity &&
        item.quantity > 0 &&
        item.unitProfitMarginPercentage !== null &&
        item.unitProfitMarginPercentage > 25
      )
      .sort((a, b) => (b.unitProfitMarginPercentage || 0) - (a.unitProfitMarginPercentage || 0))
      .slice(0, 20);

    // Sort items by various metrics
    const sortedByProfitMargin = [...profitabilityData]
      .filter(item => item.unitProfitMarginPercentage !== null)
      .sort((a, b) => (b.unitProfitMarginPercentage || 0) - (a.unitProfitMarginPercentage || 0));

    const sortedByContributionMargin = [...profitabilityData]
      .filter(item => item.unitContributionMarginPercentage !== null)
      .sort((a, b) => (b.unitContributionMarginPercentage || 0) - (a.unitContributionMarginPercentage || 0));

    const sortedByRevenue = [...profitabilityData]
      .sort((a, b) => b.revenue - a.revenue);

    // Group by profitability status
    const byStatus = {
      excellent: profitabilityData.filter(item => item.profitabilityStatus === 'excellent'),
      good: profitabilityData.filter(item => item.profitabilityStatus === 'good'),
      acceptable: profitabilityData.filter(item => item.profitabilityStatus === 'acceptable'),
      poor: profitabilityData.filter(item => item.profitabilityStatus === 'poor'),
      unknown: profitabilityData.filter(item => item.profitabilityStatus === 'unknown'),
    };

    return NextResponse.json({
      period: days,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalFoodCost: Math.round(totalFoodCost * 100) / 100,
        totalLaborCost: Math.round(totalLaborCost * 100) / 100,
        totalPrimeCost: Math.round(totalPrimeCost * 100) / 100,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        totalProfitMargin: Math.round(totalProfitMargin * 100) / 100,
        totalProfitMarginPercentage: totalProfitMarginPercentage
          ? Math.round(totalProfitMarginPercentage * 100) / 100
          : null,
        foodCostPercentage: foodCostPercentage
          ? Math.round(foodCostPercentage * 100) / 100
          : null,
        laborCostPercentage: laborCostPercentage
          ? Math.round(laborCostPercentage * 100) / 100
          : null,
        totalItems: profitabilityData.length,
        itemsWithSales: profitabilityData.filter(item => item.quantity > 0).length,
        byStatus: {
          excellent: byStatus.excellent.length,
          good: byStatus.good.length,
          acceptable: byStatus.acceptable.length,
          poor: byStatus.poor.length,
          unknown: byStatus.unknown.length,
        },
      },
      items: profitabilityData,
      sortedByProfitMargin: sortedByProfitMargin.slice(0, 50),
      sortedByContributionMargin: sortedByContributionMargin.slice(0, 50),
      sortedByRevenue: sortedByRevenue.slice(0, 50),
      highVolumeLowMargin,
      lowVolumeHighMargin,
      byStatus,
    });
  } catch (error) {
    return handleError(error, 'Failed to generate profitability analytics');
  }
}

