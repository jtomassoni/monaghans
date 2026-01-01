import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * PATCH /api/signage/slides/reorder
 * Bulk update orderIndex for multiple slides
 */
export async function PATCH(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.slides || !Array.isArray(body.slides)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { slides: [{ id, orderIndex }] }' },
        { status: 400 }
      );
    }

    // Validate all slides exist
    const slideIds = body.slides.map((s: any) => s.id);
    const existingSlides = await prisma.slide.findMany({
      where: { id: { in: slideIds } },
      select: { id: true },
    });

    if (existingSlides.length !== slideIds.length) {
      return NextResponse.json(
        { error: 'One or more slides not found' },
        { status: 404 }
      );
    }

    // Update all slides in a transaction
    await prisma.$transaction(
      body.slides.map((slide: { id: string; orderIndex: number }) =>
        prisma.slide.update({
          where: { id: slide.id },
          data: { orderIndex: slide.orderIndex },
        })
      )
    );

    await logActivity(
      user.id,
      'update',
      'setting',
      'bulk',
      'Slides',
      undefined,
      `Reordered ${body.slides.length} slides`
    );

    return NextResponse.json({ success: true, updated: body.slides.length });
  } catch (error) {
    return handleError(error, 'Failed to reorder slides');
  }
}

