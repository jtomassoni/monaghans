import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { createPOSClient, matchMenuItem } from '@/lib/pos-helpers';

/**
 * POST: Sync/import sales data from POS integration
 */
export async function POST(
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
    const { startDate, endDate } = body;

    const integration = await prisma.pOSIntegration.findUnique({
      where: { id },
    });

    if (!integration) {
      return NextResponse.json({ error: 'POS integration not found' }, { status: 404 });
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { error: 'POS integration is not active' },
        { status: 400 }
      );
    }

    // Parse credentials
    const credentials = JSON.parse(integration.credentials);
    const config = integration.config ? JSON.parse(integration.config) : {};

    // Create POS client
    const posClient = createPOSClient(
      integration.provider as any,
      credentials
    );

    // Determine date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days

    // Fetch transactions from POS
    const transactions = await posClient.fetchTransactions(start, end);

    // Get all menu items for matching
    const menuItems = await prisma.menuItem.findMany({
      select: { id: true, name: true },
    });

    // Import transactions
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const transaction of transactions) {
      try {
        // Check if transaction already exists
        const existing = await prisma.pOSSale.findUnique({
          where: {
            posIntegrationId_posTransactionId: {
              posIntegrationId: id,
              posTransactionId: transaction.transactionId,
            },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create sale record
        const sale = await prisma.pOSSale.create({
          data: {
            posIntegrationId: id,
            posTransactionId: transaction.transactionId,
            posOrderNumber: transaction.orderNumber,
            saleDate: transaction.saleDate,
            subtotal: transaction.subtotal,
            tax: transaction.tax,
            tip: transaction.tip,
            total: transaction.total,
            paymentMethod: transaction.paymentMethod,
            customerCount: transaction.customerCount,
            serverName: transaction.serverName,
            locationId: transaction.locationId,
            rawData: transaction.rawData ? JSON.stringify(transaction.rawData) : null,
            items: {
              create: transaction.items.map(item => {
                // Try to match item to menu item
                const menuItemId = config.itemMatching?.enabled
                  ? matchMenuItem(item.name, menuItems)
                  : null;

                return {
                  posItemId: item.itemId,
                  name: item.name,
                  category: item.category,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null,
                  menuItemId,
                };
              }),
            },
          },
        });

        imported++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Transaction ${transaction.transactionId}: ${errorMsg}`);
      }
    }

    // Update integration sync status
    await prisma.pOSIntegration.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
      },
    });

    await logActivity(
      user.id,
      'update',
      'posIntegration',
      id,
      integration.name,
      undefined,
      `synced POS integration "${integration.name}": ${imported} imported, ${skipped} skipped`
    );

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Update integration with error
    try {
      const { id: integrationId } = await params;
      await prisma.pOSIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncError: errorMsg,
        },
      });
    } catch {
      // Ignore update error
    }

    return handleError(error, 'Failed to sync POS integration');
  }
}

/**
 * GET: Test POS integration connection
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const integration = await prisma.pOSIntegration.findUnique({
      where: { id },
    });

    if (!integration) {
      return NextResponse.json({ error: 'POS integration not found' }, { status: 404 });
    }

    const credentials = JSON.parse(integration.credentials);
    const posClient = createPOSClient(
      integration.provider as any,
      credentials
    );

    const isConnected = await posClient.testConnection();

    return NextResponse.json({ connected: isConnected });
  } catch (error) {
    return handleError(error, 'Failed to test POS integration');
  }
}

