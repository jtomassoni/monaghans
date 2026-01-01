import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { requireAuth, handleError, getCurrentUser } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { convertPdfToImages } from '@/lib/pdf-processor';
import { createAssetFromUpload } from '@/lib/asset-processor';

/**
 * POST /api/signage/uploads
 * Upload images or PDFs for digital signage
 * - Images: Creates one Asset
 * - PDFs: Converts each page to an image and creates one Asset per page
 */
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validPdfType = 'application/pdf';
    const isValidImage = validImageTypes.includes(file.type);
    const isValidPdf = file.type === validPdfType;

    if (!isValidImage && !isValidPdf) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (png, jpg, jpeg, webp, gif) and PDFs are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxPdfSize = 20 * 1024 * 1024; // 20MB
    const maxSize = isValidPdf ? maxPdfSize : maxImageSize;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate unique upload ID
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', uploadId);
    await mkdir(uploadDir, { recursive: true });

    // Save original file
    const originalExtension = file.name.split('.').pop() || (isValidPdf ? 'pdf' : 'jpg');
    const originalFilename = file.name;
    const originalFilePath = join(uploadDir, originalFilename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(originalFilePath, buffer);

    // Create Upload record
    const upload = await prisma.upload.create({
      data: {
        originalFilename,
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey: `/uploads/${uploadId}/${originalFilename}`,
        createdByUserId: user.id,
      },
    });

    const assets: Array<{ id: string; width: number; height: number; storageKey: string; kind: string }> = [];

    try {
      if (isValidPdf) {
        // Convert PDF to images
        const pageImages = await convertPdfToImages(originalFilePath, uploadId);

        // Create Asset for each page
        for (const pageImage of pageImages) {
          const asset = await createAssetFromUpload(
            upload.id,
            pageImage.storageKey,
            'PDF_PAGE_IMAGE',
            { width: pageImage.width, height: pageImage.height }
          );
          assets.push({ ...asset, kind: 'PDF_PAGE_IMAGE' });
        }
      } else {
        // Create single Asset for image
        const storageKey = `/uploads/${uploadId}/${originalFilename}`;
        const asset = await createAssetFromUpload(upload.id, storageKey, 'IMAGE');
        assets.push({ ...asset, kind: 'IMAGE' });
      }

      return NextResponse.json(
        {
          uploadId: upload.id,
          upload: {
            id: upload.id,
            originalFilename: upload.originalFilename,
            mimeType: upload.mimeType,
            sizeBytes: upload.sizeBytes,
            storageKey: upload.storageKey,
          },
          assets,
        },
        { status: 201 }
      );
    } catch (error) {
      // Cleanup on error: delete upload record and files
      try {
        await prisma.upload.delete({ where: { id: upload.id } });
        // Delete directory (simplified - in production you might want to delete files individually)
        const fs = await import('fs');
        await fs.promises.rm(uploadDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }

      throw error;
    }
  } catch (error) {
    return handleError(error, 'Failed to upload file');
  }
}

