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

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json(users);
  } catch (error) {
    return handleError(error, 'Failed to fetch users');
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireSuperadmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name || null,
        image: body.image || null,
        role: body.role || 'admin',
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return handleError(error, 'Failed to create user');
  }
}

