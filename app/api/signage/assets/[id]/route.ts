import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/signage/assets/[id]
 * Delete an asset and its associated file
 */
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

    // Fetch the asset with related data
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        upload: {
          select: {
            id: true,
            originalFilename: true,
          },
        },
        slides: {
          select: {
            id: true,
            title: true,
          },
        },
        creatives: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Check if asset is being used
    const isUsed = asset.slides.length > 0 || asset.creatives.length > 0;
    if (isUsed) {
      const usageDetails: string[] = [];
      if (asset.slides.length > 0) {
        usageDetails.push(`${asset.slides.length} slide(s)`);
      }
      if (asset.creatives.length > 0) {
        usageDetails.push(`${asset.creatives.length} ad creative(s)`);
      }
      return NextResponse.json(
        {
          error: 'Cannot delete asset that is in use',
          details: `This image is currently used in: ${usageDetails.join(', ')}. Please remove it from all slides and ad creatives before deleting.`,
        },
        { status: 400 }
      );
    }

    // Delete the file from filesystem
    try {
      const filePath = asset.storageKey.startsWith('/')
        ? join(process.cwd(), 'public', asset.storageKey)
        : join(process.cwd(), 'public', asset.storageKey);
      await unlink(filePath);
    } catch (fileError: any) {
      // Log but don't fail if file doesn't exist
      if (fileError.code !== 'ENOENT') {
        console.error('Error deleting asset file:', fileError);
      }
    }

    // Delete the asset record (cascading will handle related records if configured)
    await prisma.asset.delete({
      where: { id },
    });

    // Log the activity
    await logActivity(
      user.id,
      'delete',
      'asset',
      id,
      asset.upload.originalFilename,
      undefined,
      `deleted image "${asset.upload.originalFilename}" from ad gallery`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'Failed to delete asset');
  }
}

