import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions, canCreateRole } from '@/lib/permissions';

// Helper to require user management permissions
async function requireUserManagement(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const permissions = getPermissions(session.user.role);
  if (!permissions.canManageUsers) {
    return NextResponse.json({ error: 'Forbidden: User management access required' }, { status: 403 });
  }
  return { session, permissions };
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
  const authResult = await requireUserManagement(req);
  if (authResult instanceof NextResponse) return authResult;
  const { session, permissions } = authResult;

  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const targetRole = body.role || 'manager';
    
    // Check if current user can create this role
    if (!canCreateRole(session.user.role, targetRole)) {
      return NextResponse.json({ 
        error: `You do not have permission to create users with role "${targetRole}"` 
      }, { status: 403 });
    }
    
    // Validate role
    const validRoles = ['owner', 'manager', 'cook', 'bartender', 'barback'];
    if (!validRoles.includes(targetRole)) {
      return NextResponse.json({ 
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      }, { status: 400 });
    }
    
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name || null,
        image: body.image || null,
        role: targetRole,
        isActive: body.isActive ?? true,
      },
    });

    await logActivity(
      currentUser.id,
      'create',
      'user',
      user.id,
      user.name || user.email,
      undefined,
      `created user "${user.name || user.email}" with role "${user.role}"`
    );

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return handleError(error, 'Failed to create user');
  }
}

