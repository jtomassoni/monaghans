import { prisma } from './prisma';
import sharp from 'sharp';
import { readFile } from 'fs/promises';

export interface AssetMetadata {
  width: number;
  height: number;
}

/**
 * Extract image dimensions from an image file
 */
export async function getImageDimensions(filePath: string): Promise<AssetMetadata> {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch (error) {
    console.error('Error extracting image dimensions:', error);
    // Return default dimensions if extraction fails
    return { width: 0, height: 0 };
  }
}

/**
 * Create an Asset record from an upload
 * @param uploadId - The Upload record ID
 * @param storageKey - Path to the asset file (relative to /public)
 * @param kind - 'IMAGE' or 'PDF_PAGE_IMAGE'
 * @param dimensions - Optional dimensions (will be extracted if not provided for images)
 */
export async function createAssetFromUpload(
  uploadId: string,
  storageKey: string,
  kind: 'IMAGE' | 'PDF_PAGE_IMAGE',
  dimensions?: { width: number; height: number }
): Promise<{ id: string; width: number; height: number; storageKey: string }> {
  let finalDimensions = dimensions;

  // If dimensions not provided and it's an image, extract them
  if (!finalDimensions && kind === 'IMAGE') {
    const filePath = storageKey.startsWith('/')
      ? `${process.cwd()}/public${storageKey}`
      : `${process.cwd()}/public/${storageKey}`;
    finalDimensions = await getImageDimensions(filePath);
  }

  // If still no dimensions, use defaults
  if (!finalDimensions) {
    finalDimensions = { width: 0, height: 0 };
  }

  // Create Asset record
  const asset = await prisma.asset.create({
    data: {
      uploadId,
      kind,
      storageKey,
      width: finalDimensions.width,
      height: finalDimensions.height,
    },
  });

  return {
    id: asset.id,
    width: asset.width || 0,
    height: asset.height || 0,
    storageKey: asset.storageKey,
  };
}

