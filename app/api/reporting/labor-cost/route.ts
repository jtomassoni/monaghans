import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { calculateHoursWorked, calculateShiftCost } from '@/lib/schedule-helpers';
import {
  calculateLaborCostPerItem,
  calculateAverageHourlyWage,
  calculateLaborCostPercentage,
} from '@/lib/labor-cost-helpers';
import { parsePrice } from '@/lib/food-cost-helpers';

/**
 * Labor Cost Analytics API
 * Provides labor cost analysis by shift, employee, menu item, and trends over time
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const groupBy = searchParams.get('groupBy') || 'all'; // 'all', 'shift', 'employee', 'menuItem'

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Get all active employees to calculate average wage
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        role: true,
        hourlyWage: true,
      },
    });

    const averageHourlyWage = calculateAverageHourlyWage(employees);

    // Get shifts in the period
    const shifts = await prisma.shift.findMany({
      where: {
        clockIn: {
          gte: startDate,
          lte: endDate,
        },
        clockOut: {
          not: null, // Only completed shifts
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            hourlyWage: true,
          },
        },
      },
      orderBy: {
        clockIn: 'asc',
      },
    });

    // Calculate labor costs per shift
    const shiftsWithCosts = shifts.map(shift => {
      const hoursWorked = calculateHoursWorked(
        shift.clockIn,
        shift.clockOut,
        shift.breakMin
      );
      const cost = calculateShiftCost(hoursWorked, shift.employee.hourlyWage);

      return {
        id: shift.id,
        employeeId: shift.employeeId,
        employeeName: shift.employee.name,
        employeeRole: shift.employee.role,
        clockIn: shift.clockIn,
        clockOut: shift.clockOut,
        breakMin: shift.breakMin,
        hoursWorked,
        cost: cost || 0,
      };
    });

    // Calculate total labor cost
    const totalLaborCost = shiftsWithCosts.reduce((sum, shift) => sum + shift.cost, 0);
    const totalHours = shiftsWithCosts.reduce((sum, shift) => sum + (shift.hoursWorked || 0), 0);

    // Get sales data for the period (for labor cost percentage calculation)
    const onlineOrders = await prisma.order.findMany({
      where: {
        status: { in: ['completed', 'ready'] },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    const posSales = await prisma.pOSSale.findMany({
      where: {
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        total: true,
        saleDate: true,
      },
    });

    const totalSales = 
      onlineOrders.reduce((sum, o) => sum + o.total, 0) +
      posSales.reduce((sum, s) => sum + s.total, 0);

    const laborCostPercentage = calculateLaborCostPercentage(totalLaborCost, totalSales);

    // Group by employee
    const byEmployee = new Map<string, {
      employeeId: string;
      employeeName: string;
      role: string;
      shifts: number;
      hours: number;
      cost: number;
    }>();

    for (const shift of shiftsWithCosts) {
      const existing = byEmployee.get(shift.employeeId) || {
        employeeId: shift.employeeId,
        employeeName: shift.employeeName,
        role: shift.employeeRole,
        shifts: 0,
        hours: 0,
        cost: 0,
      };

      existing.shifts += 1;
      existing.hours += shift.hoursWorked || 0;
      existing.cost += shift.cost;

      byEmployee.set(shift.employeeId, existing);
    }

    // Group by day (for trends)
    const byDay = new Map<string, {
      date: string;
      shifts: number;
      hours: number;
      cost: number;
      sales: number;
      laborCostPercentage: number | null;
    }>();

    // Initialize all days in period
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      byDay.set(dateStr, {
        date: dateStr,
        shifts: 0,
        hours: 0,
        cost: 0,
        sales: 0,
        laborCostPercentage: null,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add shift data to days
    for (const shift of shiftsWithCosts) {
      const dateStr = shift.clockIn.toISOString().split('T')[0];
      const dayData = byDay.get(dateStr);
      if (dayData) {
        dayData.shifts += 1;
        dayData.hours += shift.hoursWorked || 0;
        dayData.cost += shift.cost;
      }
    }

    // Add sales data to days
    for (const order of onlineOrders) {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      const dayData = byDay.get(dateStr);
      if (dayData) {
        dayData.sales += order.total;
      }
    }

    for (const sale of posSales) {
      const dateStr = sale.saleDate.toISOString().split('T')[0];
      const dayData = byDay.get(dateStr);
      if (dayData) {
        dayData.sales += sale.total;
      }
    }

    // Calculate labor cost percentage per day
    for (const dayData of byDay.values()) {
      dayData.laborCostPercentage = calculateLaborCostPercentage(dayData.cost, dayData.sales);
    }

    // Get menu items with prep times for labor cost per item calculation
    const menuItems = await prisma.menuItem.findMany({
      where: {
        prepTimeMin: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        prepTimeMin: true,
        price: true,
        section: {
          select: {
            name: true,
            menuType: true,
          },
        },
      },
    });

    // Calculate labor cost per menu item
    const menuItemsWithLaborCost = menuItems.map(item => {
      const laborCost = calculateLaborCostPerItem(item.prepTimeMin, averageHourlyWage);
      const menuPrice = parsePrice(item.price);
      const laborCostPercentage = menuPrice && laborCost
        ? calculateLaborCostPercentage(laborCost, menuPrice)
        : null;

      return {
        id: item.id,
        name: item.name,
        section: item.section.name,
        menuType: item.section.menuType,
        prepTimeMin: item.prepTimeMin,
        price: item.price,
        menuPrice,
        laborCost: laborCost || 0,
        laborCostPercentage,
      };
    });

    // Group by role
    const byRole = new Map<string, {
      role: string;
      employees: number;
      shifts: number;
      hours: number;
      cost: number;
    }>();

    for (const empData of byEmployee.values()) {
      const existing = byRole.get(empData.role) || {
        role: empData.role,
        employees: 0,
        shifts: 0,
        hours: 0,
        cost: 0,
      };

      existing.employees += 1;
      existing.shifts += empData.shifts;
      existing.hours += empData.hours;
      existing.cost += empData.cost;

      byRole.set(empData.role, existing);
    }

    // Build response based on groupBy parameter
    let responseData: any = {
      period: days,
      summary: {
        totalLaborCost: Math.round(totalLaborCost * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        totalShifts: shifts.length,
        totalEmployees: employees.length,
        averageHourlyWage: Math.round(averageHourlyWage * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        laborCostPercentage: laborCostPercentage ? Math.round(laborCostPercentage * 100) / 100 : null,
      },
      trends: {
        daily: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
      },
      byEmployee: Array.from(byEmployee.values())
        .sort((a, b) => b.cost - a.cost),
      byRole: Array.from(byRole.values())
        .sort((a, b) => b.cost - a.cost),
      byMenuItem: menuItemsWithLaborCost
        .filter(item => item.laborCost > 0)
        .sort((a, b) => b.laborCost - a.laborCost),
    };

    // Add shift-level data if requested
    if (groupBy === 'shift' || groupBy === 'all') {
      responseData.shifts = shiftsWithCosts;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    return handleError(error, 'Failed to generate labor cost analytics');
  }
}

