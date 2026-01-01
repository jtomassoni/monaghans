import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * Slide API (single)
 * GET: Get slide by ID
 * PATCH: Update slide
 * DELETE: Delete slide
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;

    const slide = await prisma.slide.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            upload: {
              select: {
                id: true,
                originalFilename: true,
                mimeType: true,
              },
            },
          },
        },
      },
    });

    if (!slide) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    return NextResponse.json(slide);
  } catch (error) {
    return handleError(error, 'Failed to fetch slide');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Get existing slide for change tracking
    const existingSlide = await prisma.slide.findUnique({
      where: { id },
    });

    if (!existingSlide) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    // Validate asset if assetId is being changed
    if (body.assetId && body.assetId !== existingSlide.assetId) {
      const asset = await prisma.asset.findUnique({
        where: { id: body.assetId },
      });

      if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      }
    }

    // Validate type if being changed
    if (body.type) {
      const validTypes = ['CONTENT', 'AD_FULL', 'AD_EMBEDDED'];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title || null;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
    if (body.assetId !== undefined) updateData.assetId = body.assetId;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.startAt !== undefined) updateData.startAt = body.startAt ? new Date(body.startAt) : null;
    if (body.endAt !== undefined) updateData.endAt = body.endAt ? new Date(body.endAt) : null;

    const slide = await prisma.slide.update({
      where: { id },
      data: updateData,
      include: {
        asset: {
          include: {
            upload: {
              select: {
                id: true,
                originalFilename: true,
                mimeType: true,
              },
            },
          },
        },
      },
    });

    // Track changes for activity log
    const changes: Record<string, { before: any; after: any }> = {};
    if (body.title !== undefined && body.title !== existingSlide.title) {
      changes.title = { before: existingSlide.title, after: body.title };
    }
    if (body.active !== undefined && body.active !== existingSlide.active) {
      changes.active = { before: existingSlide.active, after: body.active };
    }
    if (body.orderIndex !== undefined && body.orderIndex !== existingSlide.orderIndex) {
      changes.orderIndex = { before: existingSlide.orderIndex, after: body.orderIndex };
    }

    await logActivity(
      user.id,
      'update',
      'setting',
      slide.id,
      slide.title || `Slide (${slide.type})`,
      Object.keys(changes).length > 0 ? changes : undefined,
      `Updated slide`
    );

    return NextResponse.json(slide);
  } catch (error) {
    return handleError(error, 'Failed to update slide');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;

    const slide = await prisma.slide.findUnique({
      where: { id },
    });

    if (!slide) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    await prisma.slide.delete({
      where: { id },
    });

    await logActivity(
      user.id,
      'delete',
      'setting',
      slide.id,
      slide.title || `Slide (${slide.type})`,
      undefined,
      `Deleted slide`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete slide');
  }
}

