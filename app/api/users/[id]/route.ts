import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPermissions, canCreateRole, canManageUser } from '@/lib/permissions';

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
  const authResult = await requireUserManagement(req);
  if (authResult instanceof NextResponse) return authResult;
  const { session, permissions } = authResult;

  try {
    const actingUser = await getCurrentUser(req);
    if (!actingUser?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Get the user being updated
    const currentUser = await prisma.user.findUnique({ where: { id } });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent modifying admin or superadmin
    if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot modify admin user' }, { status: 403 });
    }

    // Check if current user can manage this user
    if (!canManageUser(session.user.role, currentUser.role)) {
      return NextResponse.json({ 
        error: `You do not have permission to manage users with role "${currentUser.role}"` 
      }, { status: 403 });
    }

    // If changing role, check permission
    if (body.role && body.role !== currentUser.role) {
      if (!canCreateRole(session.user.role, body.role)) {
        return NextResponse.json({ 
          error: `You do not have permission to assign role "${body.role}"` 
        }, { status: 403 });
      }
      
      // Validate new role
      const validRoles = ['owner', 'manager', 'cook', 'bartender', 'barback'];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ 
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        }, { status: 400 });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        image: body.image !== undefined ? body.image : undefined,
        role: body.role || currentUser.role,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
      },
    });

    // Track changes
    const changes: Record<string, { before: any; after: any }> = {};
    if (currentUser.name !== user.name) changes.name = { before: currentUser.name || '(empty)', after: user.name || '(empty)' };
    if (currentUser.role !== user.role) changes.role = { before: currentUser.role, after: user.role };
    if (currentUser.isActive !== user.isActive) changes.isActive = { before: currentUser.isActive, after: user.isActive };

    await logActivity(
      actingUser.id,
      'update',
      'user',
      user.id,
      user.name || user.email,
      Object.keys(changes).length > 0 ? changes : undefined,
      `updated user "${user.name || user.email}"`
    );

    return NextResponse.json(user);
  } catch (error) {
    return handleError(error, 'Failed to update user');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUserManagement(req);
  if (authResult instanceof NextResponse) return authResult;
  const { session } = authResult;

  try {
    const actingUser = await getCurrentUser(req);
    if (!actingUser?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'admin' || user.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 403 });
    }

    // Check if current user can manage this user
    if (!canManageUser(session.user.role, user.role)) {
      return NextResponse.json({ 
        error: `You do not have permission to delete users with role "${user.role}"` 
      }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id },
    });

    await logActivity(
      actingUser.id,
      'delete',
      'user',
      id,
      user.name || user.email,
      undefined,
      `deleted user "${user.name || user.email}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete user');
  }
}

