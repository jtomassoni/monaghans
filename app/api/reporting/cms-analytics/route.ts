import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * CMS Analytics API
 * Tracks changes to content (specials, events, announcements, menu items)
 * Designed to be extensible for future features (orders, inventory, etc.)
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const entityType = searchParams.get('entityType'); // optional filter

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause
    const where: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (entityType) {
      where.entityType = entityType;
    }

    // Get activity counts by entity type
    const activitiesByType = await prisma.activityLog.groupBy({
      by: ['entityType', 'action'],
      where,
      _count: {
        id: true,
      },
    });

    // Get activity counts by day
    const activitiesByDay = await prisma.$queryRaw<Array<{
      date: string;
      count: bigint;
    }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as count
      FROM "ActivityLog"
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Get most active entities
    const mostActiveEntities = await prisma.activityLog.groupBy({
      by: ['entityType', 'entityId', 'entityName'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Get activity by user
    const activitiesByUser = await prisma.activityLog.groupBy({
      by: ['userId'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Get user details for activities
    const userIds = activitiesByUser.map(a => a.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Format response
    const response = {
      period: days,
      summary: {
        totalActivities: activitiesByType.reduce((sum, item) => sum + item._count.id, 0),
        byType: activitiesByType.reduce((acc, item) => {
          if (!acc[item.entityType]) {
            acc[item.entityType] = { create: 0, update: 0, delete: 0 };
          }
          acc[item.entityType][item.action as 'create' | 'update' | 'delete'] = item._count.id;
          return acc;
        }, {} as Record<string, { create: number; update: number; delete: number }>),
      },
      trends: {
        daily: activitiesByDay.map(item => ({
          date: item.date,
          count: Number(item.count),
        })),
      },
      mostActive: mostActiveEntities.map(item => ({
        entityType: item.entityType,
        entityId: item.entityId,
        entityName: item.entityName,
        activityCount: item._count.id,
      })),
      byUser: activitiesByUser.map(item => {
        const user = userMap.get(item.userId);
        return {
          userId: item.userId,
          userName: user?.name || user?.email || 'Unknown',
          activityCount: item._count.id,
        };
      }),
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleError(error, 'Failed to fetch CMS analytics');
  }
}

