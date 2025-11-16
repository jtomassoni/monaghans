import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * Sales Analytics API
 * Combines data from online orders and POS imports
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const includePOS = searchParams.get('includePOS') !== 'false'; // Default true
    const includeOnline = searchParams.get('includeOnline') !== 'false'; // Default true

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

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
                  section: {
                    select: {
                      name: true,
                      menuType: true,
                    },
                  },
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
                  section: {
                    select: {
                      name: true,
                      menuType: true,
                    },
                  },
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
      section: string;
      menuType: string;
      quantity: number;
      revenue: number;
      orderCount: number;
      posCount: number;
      onlineCount: number;
    }>();

    // Process online orders
    for (const order of onlineOrders) {
      for (const item of order.items) {
        const key = item.menuItemId || `custom_${item.name}`;
        const existing = itemSales.get(key) || {
          menuItemId: item.menuItemId,
          name: item.name,
          section: item.menuItem?.section?.name || 'Other',
          menuType: item.menuItem?.section?.menuType || 'dinner',
          quantity: 0,
          revenue: 0,
          orderCount: 0,
          posCount: 0,
          onlineCount: 0,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        existing.orderCount += 1;
        existing.onlineCount += 1;

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
          section: item.menuItem?.section?.name || item.category || 'Other',
          menuType: item.menuItem?.section?.menuType || 'dinner',
          quantity: 0,
          revenue: 0,
          orderCount: 0,
          posCount: 0,
          onlineCount: 0,
        };

        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        existing.orderCount += 1;
        existing.posCount += 1;

        itemSales.set(key, existing);
      }
    }

    // Convert to array and sort
    const salesByItem = Array.from(itemSales.values())
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate totals
    const totalRevenue = salesByItem.reduce((sum, item) => sum + item.revenue, 0);
    const totalQuantity = salesByItem.reduce((sum, item) => sum + item.quantity, 0);
    const totalOrders = onlineOrders.length + posSales.length;

    // Sales by time of day (hourly)
    const salesByHour = new Map<number, { revenue: number; count: number }>();
    for (const order of onlineOrders) {
      const hour = new Date(order.createdAt).getHours();
      const existing = salesByHour.get(hour) || { revenue: 0, count: 0 };
      existing.revenue += order.total;
      existing.count += 1;
      salesByHour.set(hour, existing);
    }
    for (const sale of posSales) {
      const hour = new Date(sale.saleDate).getHours();
      const existing = salesByHour.get(hour) || { revenue: 0, count: 0 };
      existing.revenue += sale.total;
      existing.count += 1;
      salesByHour.set(hour, existing);
    }

    // Sales by day of week
    const salesByDay = new Map<number, { revenue: number; count: number }>();
    for (const order of onlineOrders) {
      const day = new Date(order.createdAt).getDay();
      const existing = salesByDay.get(day) || { revenue: 0, count: 0 };
      existing.revenue += order.total;
      existing.count += 1;
      salesByDay.set(day, existing);
    }
    for (const sale of posSales) {
      const day = new Date(sale.saleDate).getDay();
      const existing = salesByDay.get(day) || { revenue: 0, count: 0 };
      existing.revenue += sale.total;
      existing.count += 1;
      salesByDay.set(day, existing);
    }

    // Daily trends
    const dailyTrends: Array<{ date: string; revenue: number; count: number }> = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      let revenue = 0;
      let count = 0;

      // Online orders for this date
      const dayOrders = onlineOrders.filter(order => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      });
      revenue += dayOrders.reduce((sum, o) => sum + o.total, 0);
      count += dayOrders.length;

      // POS sales for this date
      const daySales = posSales.filter(sale => {
        const saleDate = new Date(sale.saleDate).toISOString().split('T')[0];
        return saleDate === dateStr;
      });
      revenue += daySales.reduce((sum, s) => sum + s.total, 0);
      count += daySales.length;

      dailyTrends.push({ date: dateStr, revenue, count });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Top items
    const topItems = salesByItem.slice(0, 20);
    const slowMovers = salesByItem
      .filter(item => item.quantity < 5 && item.revenue < 50)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 20);

    return NextResponse.json({
      period: days,
      summary: {
        totalRevenue,
        totalQuantity,
        totalOrders,
        onlineOrders: onlineOrders.length,
        posSales: posSales.length,
        uniqueItems: salesByItem.length,
      },
      topItems,
      slowMovers,
      salesByHour: Array.from(salesByHour.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => a.hour - b.hour),
      salesByDay: Array.from(salesByDay.entries())
        .map(([day, data]) => ({ day, ...data }))
        .sort((a, b) => a.day - b.day),
      dailyTrends,
      allItems: salesByItem,
    });
  } catch (error) {
    return handleError(error, 'Failed to generate sales analytics');
  }
}

