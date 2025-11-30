import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { getMountainTimeDateString, getMountainTimeToday, parseMountainTimeDate } from '@/lib/timezone';
import {
  findIngredientOverlaps,
  detectRedundantPrepItems,
  calculateInventoryOptimization,
} from '@/lib/menu-optimization-helpers';

/**
 * Menu Optimization API
 * Analyzes ingredient overlap, consolidation opportunities, and inventory optimization
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days

    const days = parseInt(period);
    const today = getMountainTimeToday();
    const startDateStr = getMountainTimeDateString(new Date(today.getTime() - days * 24 * 60 * 60 * 1000));
    const startDate = parseMountainTimeDate(startDateStr);
    const endDate = new Date(today);
    // Set to end of day in Mountain Time (23:59:59.999)
    endDate.setUTCHours(endDate.getUTCHours() + 23, 59, 59, 999);

    // Get all ingredients
    const ingredients = await prisma.ingredient.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        currentStock: true,
        parLevel: true,
        costPerUnit: true,
        unit: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Get menu items with ingredients
    const menuItems = await prisma.menuItem.findMany({
      where: {
        isAvailable: true,
      },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    // Build menu item ingredient mapping
    const menuItemIngredients = menuItems.flatMap(item =>
      item.ingredients.map(miIng => ({
        menuItemId: item.id,
        menuItemName: item.name,
        ingredientId: miIng.ingredient.id,
      }))
    );

    // Find ingredient overlaps
    const ingredientOverlaps = findIngredientOverlaps(
      ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        category: ing.category,
      })),
      menuItemIngredients
    );

    // Detect redundant prep items
    const redundantPrepItems = detectRedundantPrepItems(
      ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        category: ing.category,
      })),
      menuItemIngredients
    );

    // Get order data for inventory usage calculation
    const orders = await prisma.order.findMany({
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
              include: {
                ingredients: {
                  include: {
                    ingredient: {
                      select: {
                        id: true,
                        unit: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate ingredient usage
    const ingredientUsage = new Map<string, number>();
    for (const order of orders) {
      for (const orderItem of order.items) {
        if (orderItem.menuItem?.ingredients) {
          for (const miIng of orderItem.menuItem.ingredients) {
            const current = ingredientUsage.get(miIng.ingredient.id) || 0;
            ingredientUsage.set(
              miIng.ingredient.id,
              current + (miIng.quantity * orderItem.quantity)
            );
          }
        }
      }
    }

    // Build usage data array
    const usageData = Array.from(ingredientUsage.entries()).map(([ingredientId, quantityUsed]) => ({
      ingredientId,
      quantityUsed,
      periodDays: days,
    }));

    // Calculate inventory optimization
    const inventoryOptimization = calculateInventoryOptimization(
      ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        category: ing.category,
        currentStock: ing.currentStock,
        parLevel: ing.parLevel,
        costPerUnit: ing.costPerUnit,
      })),
      usageData
    );

    return NextResponse.json({
      period: days,
      ingredientOverlaps: ingredientOverlaps.slice(0, 20), // Top 20 overlaps
      redundantPrepItems,
      inventoryOptimization: inventoryOptimization.slice(0, 50), // Top 50 items needing attention
      summary: {
        totalIngredients: ingredients.length,
        totalOverlaps: ingredientOverlaps.length,
        highPriorityOverlaps: ingredientOverlaps.filter(o => o.consolidationOpportunity === 'high').length,
        redundantPrepItemGroups: redundantPrepItems.length,
        lowStockItems: inventoryOptimization.filter(i => i.status === 'low_stock').length,
        overstockedItems: inventoryOptimization.filter(i => i.status === 'overstocked').length,
        itemsNeedingData: inventoryOptimization.filter(i => i.status === 'no_data').length,
      },
    });
  } catch (error) {
    return handleError(error, 'Failed to fetch menu optimization data');
  }
}

