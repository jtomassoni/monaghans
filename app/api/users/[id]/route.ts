import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper to require superadmin role
async function requireSuperadmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return handleError(error, 'Failed to fetch user');
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireSuperadmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await req.json();

    // Prevent changing superadmin role or deactivating superadmin
    const currentUser = await prisma.user.findUnique({ where: { id } });
    if (currentUser?.role === 'superadmin' && body.role !== 'superadmin') {
      return NextResponse.json({ error: 'Cannot change superadmin role' }, { status: 400 });
    }
    if (currentUser?.role === 'superadmin' && body.isActive === false) {
      return NextResponse.json({ error: 'Cannot deactivate superadmin' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        image: body.image !== undefined ? body.image : undefined,
        role: body.role || currentUser?.role,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return handleError(error, 'Failed to update user');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireSuperadmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (user?.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot delete superadmin' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete user');
  }
}

