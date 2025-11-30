import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { getMountainTimeDateString, getMountainTimeToday, parseMountainTimeDate } from '@/lib/timezone';
import {
  analyzeBusyHours,
  generateScheduleOptimizations,
} from '@/lib/schedule-optimization-helpers';

/**
 * Schedule Optimization API
 * Analyzes busy hours and suggests optimal staffing levels
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

    // Get orders for busy hour analysis
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
        total: true,
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    // Analyze busy hours
    const busyHourAnalyses = analyzeBusyHours(
      orders.map(order => ({
        createdAt: order.createdAt,
        total: order.total,
        items: order.items,
      })),
      days
    );

    // Get current schedules for comparison
    const schedules = await prisma.schedule.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        employee: {
          select: {
            role: true,
          },
        },
      },
    });

    // Group schedules by date, shift type, and role
    const scheduleGroups = new Map<string, {
      date: Date;
      shiftType: string;
      employeeRole: string;
      count: number;
    }>();

    for (const schedule of schedules) {
      const key = `${getMountainTimeDateString(schedule.date)}_${schedule.shiftType}_${schedule.employee.role}`;
      const existing = scheduleGroups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        scheduleGroups.set(key, {
          date: schedule.date,
          shiftType: schedule.shiftType,
          employeeRole: schedule.employee.role,
          count: 1,
        });
      }
    }

    const currentSchedules = Array.from(scheduleGroups.values());

    // Generate optimization suggestions
    const suggestions = generateScheduleOptimizations(
      busyHourAnalyses,
      currentSchedules.map(s => ({
        date: s.date,
        shiftType: s.shiftType,
        employeeRole: s.employeeRole,
        count: s.count,
      })),
      days
    );

    // Calculate summary statistics
    const veryBusyHours = busyHourAnalyses.filter(a => a.busyLevel === 'very_busy').length;
    const busyHours = busyHourAnalyses.filter(a => a.busyLevel === 'busy').length;
    const quietHours = busyHourAnalyses.filter(a => a.busyLevel === 'quiet').length;

    // Find peak hours
    const peakHours = busyHourAnalyses
      .filter(a => a.busyLevel === 'very_busy' || a.busyLevel === 'busy')
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    return NextResponse.json({
      period: days,
      busyHourAnalyses,
      suggestions,
      summary: {
        totalHoursAnalyzed: busyHourAnalyses.length,
        veryBusyHours,
        busyHours,
        quietHours,
        peakHours: peakHours.map(h => ({
          day: h.dayName,
          hour: h.hour,
          orderCount: h.orderCount,
          revenue: h.revenue,
        })),
        suggestionsCount: suggestions.length,
        highPrioritySuggestions: suggestions.filter(s => s.priority === 'high').length,
      },
    });
  } catch (error) {
    return handleError(error, 'Failed to fetch schedule optimization data');
  }
}

