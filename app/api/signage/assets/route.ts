import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';

/**
 * GET /api/signage/assets
 * List all assets (for selection in forms)
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const uploadId = searchParams.get('uploadId'); // Filter by upload if needed

    const where: any = {};
    if (uploadId) {
      where.uploadId = uploadId;
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        upload: {
          select: {
            id: true,
            originalFilename: true,
            mimeType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assets);
  } catch (error) {
    return handleError(error, 'Failed to fetch assets');
  }
}

