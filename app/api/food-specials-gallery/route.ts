import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { requireAuth, handleError, getCurrentUser, logActivity } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/food-specials-gallery
 * List all images from:
 * 1. The pics/food-specials gallery directory (file system: /public/pics/food-specials/)
 * 2. Images currently associated with food specials (database)
 */
export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const imageSet = new Set<string>(); // Track unique image paths
    const images: Array<{
      filename: string;
      path: string;
      size?: number;
      modified: string;
      inUse?: boolean; // Whether this image is currently used by a food special
      usedBy?: string[]; // Titles of food specials using this image
    }> = [];

    // 1. Get images from file system (gallery directory)
    const galleryDir = join(process.cwd(), 'public', 'pics', 'food-specials');
    let files: string[] = [];
    try {
      files = await readdir(galleryDir);
    } catch (error: any) {
      // Directory doesn't exist, that's fine
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Filter for image files and get their stats
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const file of files) {
      const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
      if (imageExtensions.includes(ext)) {
        try {
          const filePath = join(galleryDir, file);
          const stats = await stat(filePath);
          const path = `/pics/food-specials/${file}`;
          if (!imageSet.has(path)) {
            imageSet.add(path);
            images.push({
              filename: file,
              path,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              inUse: false,
              usedBy: [],
            });
          }
        } catch (error) {
          // File might have been deleted, skip it
          console.warn(`Could not stat file ${file}:`, error);
        }
      }
    }

    // 2. Get images from food specials in database
    const foodSpecials = await prisma.special.findMany({
      where: {
        type: 'food',
        image: {
          not: null,
        },
      },
      select: {
        image: true,
        title: true,
      },
    });

    // Add database images and track which ones are in use
    for (const special of foodSpecials) {
      if (special.image && special.image.trim() !== '') {
        const imagePath = special.image;
        
        // Check if we already have this image from file system
        const existingIndex = images.findIndex(img => img.path === imagePath);
        
        if (existingIndex >= 0) {
          // Mark as in use and add to usedBy
          images[existingIndex].inUse = true;
          if (!images[existingIndex].usedBy) {
            images[existingIndex].usedBy = [];
          }
          images[existingIndex].usedBy!.push(special.title);
        } else if (!imageSet.has(imagePath)) {
          // New image from database (might be in /pics/ or /uploads/)
          imageSet.add(imagePath);
          const filename = imagePath.split('/').pop() || imagePath;
          images.push({
            filename,
            path: imagePath,
            modified: new Date().toISOString(), // We don't have file stats for these
            inUse: true,
            usedBy: [special.title],
          });
        }
      }
    }

    // Sort by modified date (newest first), then by inUse status
    images.sort((a, b) => {
      // First sort by inUse (in-use images first)
      if (a.inUse !== b.inUse) {
        return a.inUse ? -1 : 1;
      }
      // Then by modified date
      return new Date(b.modified).getTime() - new Date(a.modified).getTime();
    });

    return NextResponse.json(images);
  } catch (error) {
    return handleError(error, 'Failed to list gallery images');
  }
}

/**
 * POST /api/food-specials-gallery
 * Upload an image to the pics/food-specials gallery directory (/public/pics/food-specials/)
 */
export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (png, jpg, jpeg, webp, gif) are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Max size: 10MB' },
        { status: 400 }
      );
    }

    // Create gallery directory if it doesn't exist
    const { writeFile, mkdir } = await import('fs/promises');
    const galleryDir = join(process.cwd(), 'public', 'pics', 'food-specials');
    try {
      await mkdir(galleryDir, { recursive: true });
    } catch (error: any) {
      // Directory might already exist, that's fine
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    // Generate filename (use original name, sanitized)
    const originalName = file.name;
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    const timestamp = Date.now();
    const filename = `${timestamp}-${sanitizedName}`;
    const filepath = join(galleryDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the public path
    const publicPath = `/pics/food-specials/${filename}`;
    return NextResponse.json({ path: publicPath, filename }, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to upload image');
  }
}

/**
 * DELETE /api/food-specials-gallery
 * Delete an image from the gallery
 */
export async function DELETE(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const imagePath = searchParams.get('path');

    if (!imagePath) {
      return NextResponse.json({ error: 'Image path is required' }, { status: 400 });
    }

    // Only allow deletion of images in the food-specials directory
    if (!imagePath.startsWith('/pics/food-specials/')) {
      return NextResponse.json(
        { error: 'Can only delete images from the food-specials gallery' },
        { status: 400 }
      );
    }

    // Check if image is in use by any food specials
    const specialsUsingImage = await prisma.special.findMany({
      where: {
        type: 'food',
        image: imagePath,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (specialsUsingImage.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete image that is in use',
          inUse: true,
          usedBy: specialsUsingImage.map(s => s.title),
        },
        { status: 400 }
      );
    }

    // Extract filename from path
    const filename = imagePath.replace('/pics/food-specials/', '');
    const filePath = join(process.cwd(), 'public', 'pics', 'food-specials', filename);

    // Check if file exists
    try {
      await stat(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 });
      }
      throw error;
    }

    // Delete the file
    await unlink(filePath);

    // Log the activity
    await logActivity(
      user.id,
      'delete',
      'image',
      imagePath,
      filename,
      undefined,
      `deleted image "${filename}" from food specials gallery`
    );

    return NextResponse.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    return handleError(error, 'Failed to delete image');
  }
}

/**
 * PATCH /api/food-specials-gallery/fix-invalid-paths
 * Fix food specials with invalid image paths by updating them to use correct paths
 */
export async function PATCH(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;

  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { stat } = await import('fs/promises');
    const { join } = await import('path');

    // Find all food specials with images
    const foodSpecials = await prisma.special.findMany({
      where: {
        type: 'food',
        image: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        image: true,
      },
    });

    const fixes: Array<{ id: string; title: string; oldPath: string | null; newPath: string }> = [];

    for (const special of foodSpecials) {
      if (!special.image || special.image.trim() === '') continue;

      const imagePath = special.image.startsWith('/')
        ? join(process.cwd(), 'public', special.image.substring(1))
        : join(process.cwd(), 'public', special.image);

      // Check if file exists
      let fileExists = false;
      try {
        await stat(imagePath);
        fileExists = true;
      } catch {
        fileExists = false;
      }

      // If file doesn't exist and title contains "Taco Platter", try to fix it
      if (!fileExists && special.title.toLowerCase().includes('taco platter')) {
        const correctPath = '/pics/food-specials/taco-platter.png';
        const correctImagePath = join(process.cwd(), 'public', correctPath.substring(1));
        
        try {
          await stat(correctImagePath);
          // File exists, update the special
          await prisma.special.update({
            where: { id: special.id },
            data: { image: correctPath },
          });
          fixes.push({
            id: special.id,
            title: special.title,
            oldPath: special.image,
            newPath: correctPath,
          });
        } catch {
          // Correct path also doesn't exist, skip
        }
      }
    }

    if (fixes.length > 0) {
      await logActivity(
        user.id,
        'update',
        'special',
        fixes.map(f => f.id).join(','),
        `Fixed ${fixes.length} invalid image path(s)`,
        undefined,
        `Fixed image paths for: ${fixes.map(f => f.title).join(', ')}`
      );
    }

    return NextResponse.json({
      success: true,
      fixed: fixes.length,
      fixes: fixes,
    });
  } catch (error) {
    return handleError(error, 'Failed to fix image paths');
  }
}

