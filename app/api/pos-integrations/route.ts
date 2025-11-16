import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';

/**
 * GET: List all POS integrations
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const integrations = await prisma.pOSIntegration.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    // Don't return credentials in response
    const safeIntegrations = integrations.map(integration => ({
      ...integration,
      credentials: '[REDACTED]',
    }));

    return NextResponse.json(safeIntegrations);
  } catch (error) {
    return handleError(error, 'Failed to fetch POS integrations');
  }
}

/**
 * POST: Create a new POS integration
 */
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await req.json();
    const { provider, name, credentials, config, syncFrequency } = body;

    if (!provider || !name || !credentials) {
      return NextResponse.json(
        { error: 'Provider, name, and credentials are required' },
        { status: 400 }
      );
    }

    // Validate provider
    const validProviders = ['square', 'toast', 'clover', 'lightspeed', 'touchbistro'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }

    // Store credentials as JSON string (in production, encrypt this)
    const integration = await prisma.pOSIntegration.create({
      data: {
        provider,
        name,
        credentials: JSON.stringify(credentials),
        config: config ? JSON.stringify(config) : null,
        syncFrequency: syncFrequency || 'daily',
        isActive: true,
      },
    });

    await logActivity(
      user.id,
      'create',
      'posIntegration',
      integration.id,
      integration.name,
      undefined,
      `created POS integration "${integration.name}" (${provider})`
    );

    // Return without credentials
    const safeIntegration = {
      ...integration,
      credentials: '[REDACTED]',
    };

    return NextResponse.json(safeIntegration, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create POS integration');
  }
}

