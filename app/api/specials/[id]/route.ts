import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const special = await prisma.special.findUnique({
      where: { id },
    });

    if (!special) {
      return NextResponse.json({ error: 'Special not found' }, { status: 404 });
    }

    return NextResponse.json(special);
  } catch (error) {
    return handleError(error, 'Failed to fetch special');
  }
}

export async function PUT(
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

    const currentSpecial = await prisma.special.findUnique({
      where: { id },
    });

    if (!currentSpecial) {
      return NextResponse.json({ error: 'Special not found' }, { status: 404 });
    }

    const special = await prisma.special.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        priceNotes: body.priceNotes,
        type: body.type || 'food',
        appliesOn: typeof body.appliesOn === 'string' ? body.appliesOn : JSON.stringify(body.appliesOn || []),
        timeWindow: body.timeWindow,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        image: body.image,
        isActive: body.isActive,
      },
    });

    const changes: Record<string, { before: any; after: any }> = {};
    if (currentSpecial.title !== body.title) changes.title = { before: currentSpecial.title, after: body.title };
    if (currentSpecial.isActive !== body.isActive) changes.isActive = { before: currentSpecial.isActive, after: body.isActive };

    await logActivity(
      user.id,
      'update',
      'special',
      special.id,
      special.title,
      Object.keys(changes).length > 0 ? changes : undefined,
      `updated special "${special.title}"`
    );

    return NextResponse.json(special);
  } catch (error) {
    return handleError(error, 'Failed to update special');
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
    const special = await prisma.special.findUnique({
      where: { id },
    });

    if (!special) {
      return NextResponse.json({ error: 'Special not found' }, { status: 404 });
    }

    await prisma.special.delete({
      where: { id },
    });

    await logActivity(
      user.id,
      'delete',
      'special',
      id,
      special.title,
      undefined,
      `deleted special "${special.title}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete special');
  }
}

