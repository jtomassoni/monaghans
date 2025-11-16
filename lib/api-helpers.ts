import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from './prisma';

export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function getCurrentUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  
  // Try to find user by ID first
  let user = null;
  if (session.user.id) {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
  }
  
  // If user doesn't exist but session has email, try to find by email
  if (!user && session.user.email) {
    user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
  }
  
  // If user still doesn't exist but we have a valid session, attempt to create/fix the user
  // This handles edge cases where the database was reset or user was deleted
  if (!user && session.user.email) {
    try {
      // Determine role based on email matching patterns
      const superadminEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase().trim();
      const isSuperadmin = superadminEmail && session.user.email.toLowerCase() === superadminEmail;
      
      // For credentials auth, check if email matches admin username pattern
      // This handles the case where ADMIN_USERNAME was used and email is like "username@monaghans.local"
      const adminUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
      const isCredentialsAdmin = adminUsername && (
        session.user.email.toLowerCase() === adminUsername.toLowerCase() ||
        session.user.email.toLowerCase() === `${adminUsername.toLowerCase()}@monaghans.local`
      );
      
      // Determine role: superadmin email > credentials admin > default to admin
      let role = 'admin';
      if (isSuperadmin) {
        role = 'superadmin';
      } else if (isCredentialsAdmin) {
        role = 'superadmin'; // Credentials auth users are superadmins
      } else if (session.user.role) {
        role = session.user.role; // Use role from session if available
      }
      
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || 'Admin User',
          role: role,
          isActive: true,
        },
      });
    } catch (error) {
      // If creation fails (e.g., unique constraint), try to fetch again
      // This can happen if user was created between our checks
      console.error('Failed to create user in getCurrentUser:', error);
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
    }
  }
  
  // Check if user is active
  if (user && !user.isActive) {
    return null; // Return null if user is inactive
  }
  
  return user;
}

export function handleError(error: unknown, message = 'An error occurred') {
  console.error(message, error);
  return NextResponse.json(
    { error: message, details: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  );
}

export async function logActivity(
  userId: string,
  action: 'create' | 'update' | 'delete' | 'login',
  entityType: 'menuItem' | 'menuSection' | 'event' | 'special' | 'announcement' | 'user' | 'setting' | 'ingredient' | 'posIntegration' | 'purchaseOrder' | 'supplierConnection' | 'supplier',
  entityId: string,
  entityName: string | null,
  changes?: Record<string, { before: any; after: any }>,
  description?: string
) {
  try {
    // Generate description if not provided
    let finalDescription = description;
    if (!finalDescription && changes) {
      const changeDescriptions = Object.entries(changes)
        .filter(([_, change]) => change.before !== change.after)
        .map(([field, change]) => {
          const fieldName = field.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
          return `changed ${fieldName} from "${change.before}" to "${change.after}"`;
        });
      finalDescription = changeDescriptions.join(', ');
    }

    if (!finalDescription) {
      finalDescription = `${action} ${entityType}`;
    }

    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        entityName,
        changes: changes ? JSON.stringify(changes) : null,
        description: finalDescription,
      },
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log activity:', error);
  }
}

/**
 * Helper function to log user login activities
 */
export async function logLoginActivity(userId: string, userEmail: string, userName: string | null) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'login',
        entityType: 'user',
        entityId: userId,
        entityName: userName || userEmail,
        description: `User logged in`,
      },
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Failed to log login activity:', error);
  }
}

