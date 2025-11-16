import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import {
  analyzeDrinkSpecialPerformance,
  suggestOptimalSpecials,
  calculateDrinkSpecialProfitability,
} from '@/lib/specials-optimization-helpers';

/**
 * Specials Optimization API
 * Analyzes drink special performance by day of week and profitability
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Get all drink specials
    const specials = await prisma.special.findMany({
      where: {
        type: 'drink',
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        type: true,
        appliesOn: true,
        timeWindow: true,
      },
    });

    // Get orders from the period
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['completed', 'ready'] },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        items: {
          select: {
            name: true,
            price: true,
            quantity: true,
          },
        },
        total: true,
      },
    });

    // Analyze drink special performance
    const specialPerformances = analyzeDrinkSpecialPerformance(
      specials,
      orders.map(order => ({
        createdAt: order.createdAt,
        items: order.items,
        total: order.total,
      })),
      days
    );

    // Calculate profitability
    const profitabilityData = calculateDrinkSpecialProfitability(specialPerformances);

    // Generate suggestions
    const suggestions = suggestOptimalSpecials(
      specialPerformances,
      orders.map(order => ({
        createdAt: order.createdAt,
        items: order.items,
        total: order.total,
      }))
    );

    // Calculate summary statistics
    const totalRevenue = specialPerformances.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalOrders = specialPerformances.reduce((sum, p) => sum + p.totalOrders, 0);
    const totalProfit = profitabilityData.reduce((sum, p) => sum + p.netProfit, 0);
    const averageProfitMargin = profitabilityData.length > 0
      ? profitabilityData.reduce((sum, p) => sum + p.profitMargin, 0) / profitabilityData.length
      : 0;

    return NextResponse.json({
      period: days,
      specialPerformances: profitabilityData,
      suggestions,
      summary: {
        totalSpecials: specials.length,
        totalRevenue,
        totalOrders,
        totalProfit,
        averageProfitMargin: Math.round(averageProfitMargin * 100) / 100,
        highPerformers: specialPerformances.filter(p => p.performanceScore >= 70).length,
        lowPerformers: specialPerformances.filter(p => p.performanceScore < 40).length,
        suggestionsCount: suggestions.length,
      },
    });
  } catch (error) {
    return handleError(error, 'Failed to fetch specials optimization data');
  }
}

