import { NextResponse, type NextRequest } from 'next/server';
import { pollFacebookForFoodSpecials } from '@/lib/facebook-food-special-import';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Hourly check of the Facebook page, using the connected account, for a food or football special.
 * Vercel Cron calls GET with `Authorization: Bearer $CRON_SECRET`.
 */
async function run(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 401 });
    }
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pollFacebookForFoodSpecials();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Facebook food special poll failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check Facebook' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
