import { NextResponse } from 'next/server';
import { handleError } from '@/lib/api-helpers';
import { getSignageVersionTimestamp } from '@/lib/signage-version';

/**
 * GET /api/signage/version
 * Returns a version/timestamp that changes when any signage-related data is updated.
 * This is used by the signage page to detect when it needs to refresh.
 */
export async function GET() {
  try {
    const timestamp = await getSignageVersionTimestamp();

    return NextResponse.json({
      version: new Date(timestamp).toISOString(),
      timestamp,
    });
  } catch (error) {
    return handleError(error, 'Failed to get signage version');
  }
}
