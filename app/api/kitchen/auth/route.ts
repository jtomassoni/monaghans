import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/api-helpers';

/**
 * Kitchen Authentication API
 * Allows kitchen staff to authenticate using username/password
 * Kitchen users have role "kitchen" in the User model
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    // Find user by email (username can be email) or by name
    // For kitchen staff, we'll use email format: username@kitchen.local
    const email = username.includes('@') ? username : `${username}@kitchen.local`;
    
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, check if we should create one
    // For now, we'll use a simple password check
    // In production, use proper password hashing (bcrypt)
    const kitchenPassword = process.env.KITCHEN_PASSWORD || 'kitchen123';
    
    if (!user) {
      // Check if this is a valid kitchen credential
      if (password === kitchenPassword) {
        // Create kitchen user
        const newUser = await prisma.user.create({
          data: {
            email,
            name: username,
            role: 'kitchen',
            isActive: true,
          },
        });
        
        return NextResponse.json({
          success: true,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
          },
        });
      }
      
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    // Allow kitchen role or cook role to access kitchen display
    if (user.role !== 'kitchen' && user.role !== 'cook') {
      return NextResponse.json({ error: 'Access denied: Kitchen access required' }, { status: 403 });
    }

    // Simple password check (in production, use proper password hashing)
    // For now, we'll allow any password for existing kitchen users
    // Or use environment variable for shared password
    const isValidPassword = password === kitchenPassword || password === 'kitchen123';

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return handleError(error, 'Failed to authenticate');
  }
}

