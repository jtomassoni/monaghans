import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import {
  getFeatureFlags,
  updateFeatureFlags,
  canManageAdsSettings,
  type UserRole,
} from '@/lib/feature-flags-ads';

/**
 * GET /api/settings/features
 * Returns feature flags filtered by user role
 * - Admin: receives full feature tree including ads.enabledByAdmin
 * - Owner: receives feature tree WITHOUT ads.enabledByAdmin (field omitted entirely)
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const userRole = (user.role as UserRole) || null;
    const flags = await getFeatureFlags(userRole);

    return NextResponse.json(flags);
  } catch (error) {
    return handleError(error, 'Failed to fetch feature flags');
  }
}

/**
 * PATCH /api/settings/features
 * Updates feature flags
 * - Admin: can update features.digitalSignage.enabled and features.digitalSignage.ads.enabledByAdmin
 * - Owner: can update features.digitalSignage.enabled but NOT ads.enabledByAdmin (returns 403)
 */
export async function PATCH(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const userRole = (user.role as UserRole) || null;
    const body = await req.json();

    // Validate request body structure
    if (!body.features || typeof body.features !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { features: { ... } }' },
        { status: 400 }
      );
    }

    // Check if owner is trying to modify ads.enabledByAdmin
    if (userRole !== 'admin') {
      // Check if the request includes ads.enabledByAdmin
      const hasAdsUpdate =
        body.features?.digitalSignage?.ads?.enabledByAdmin !== undefined ||
        body.features?.digitalSignage?.ads !== undefined;

      if (hasAdsUpdate) {
        return NextResponse.json(
          {
            error: 'Forbidden: Only admins can modify ads.enabledByAdmin setting',
          },
          { status: 403 }
        );
      }
    }

    // Get existing setting to track changes
    const existingSetting = await prisma.setting.findUnique({
      where: { key: 'features' },
    });

    const oldValue = existingSetting?.value || null;

    // Update feature flags
    const updatedFlags = await updateFeatureFlags(body.features, userRole);

    // Log activity
    const action = existingSetting ? 'update' : 'create';
    const changes: Record<string, { before: any; after: any }> = {};

    if (oldValue) {
      try {
        const oldFeatures = JSON.parse(oldValue);
        const newFeatures = updatedFlags.features;

        // Track digitalSignage.enabled changes
        if (
          oldFeatures?.features?.digitalSignage?.enabled !==
          newFeatures.digitalSignage.enabled
        ) {
          changes['digitalSignage.enabled'] = {
            before: oldFeatures.features.digitalSignage.enabled ?? false,
            after: newFeatures.digitalSignage.enabled,
          };
        }

        // Track ads.enabledByAdmin changes (only for admins)
        if (userRole === 'admin') {
          const oldAdsEnabled =
            oldFeatures?.features?.digitalSignage?.ads?.enabledByAdmin ?? false;
          const newAdsEnabled = newFeatures.digitalSignage.ads?.enabledByAdmin ?? false;

          if (oldAdsEnabled !== newAdsEnabled) {
            changes['ads.enabledByAdmin'] = {
              before: oldAdsEnabled,
              after: newAdsEnabled,
            };
          }
        }
      } catch (error) {
        // If parsing fails, log generic update
        console.error('Failed to parse old features for activity log:', error);
      }
    }

    const description =
      Object.keys(changes).length > 0
        ? `Updated feature flags: ${Object.keys(changes).join(', ')}`
        : 'Updated feature flags';

    await logActivity(
      user.id,
      action,
      'setting',
      existingSetting?.id || 'features',
      'Feature Flags',
      Object.keys(changes).length > 0 ? changes : undefined,
      description
    );

    return NextResponse.json(updatedFlags);
  } catch (error) {
    return handleError(error, 'Failed to update feature flags');
  }
}

