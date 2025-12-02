import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllFeatureFlags, updateFeatureFlags } from '@/lib/feature-flags';
import { getPermissions } from '@/lib/permissions';

/**
 * GET /api/feature-flags
 * Get all feature flags (all authenticated users can read, but only superadmin can update)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // All authenticated users can read feature flags (needed for navigation)
    const flags = await getAllFeatureFlags();
    return NextResponse.json({ flags });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/feature-flags
 * Update feature flags (only superadmin)
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin can update feature flags
    const userRole = session.user.role || 'admin';
    if (userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected array of updates.' },
        { status: 400 }
      );
    }

    const flags = await updateFeatureFlags(updates);
    return NextResponse.json({ flags });
  } catch (error) {
    console.error('Error updating feature flags:', error);
    return NextResponse.json(
      { error: 'Failed to update feature flags' },
      { status: 500 }
    );
  }
}

