import sharp from 'sharp';
import { EMBEDDED_AD_SPECS, FULL_SLIDE_AD_SPECS } from './ad-creative-specs';

export type SignageUploadPurpose = 'full_slide' | 'embedded' | 'content';

export class SignageImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignageImageValidationError';
  }
}

/** 16:9 = 1.777… — keep a tight band so TV letterboxing stays minimal. */
const ASPECT_MIN = 1.6;
const ASPECT_MAX = 1.9;

/**
 * Hard floors for images that fill a bar TV (object-contain on black).
 * Recommended creatives are still 1920×1080 / 800×450.
 */
const FULL_SLIDE_MIN = { width: 1280, height: 720 } as const;
const EMBEDDED_MIN = { width: 640, height: 360 } as const;

/** Rough bytes-per-megapixel floor — catches over-compressed mush. */
const MIN_BYTES_PER_MEGAPIXEL = 18_000;

export function parseSignageUploadPurpose(value: unknown): SignageUploadPurpose {
  if (value === 'embedded') return 'embedded';
  if (value === 'content') return 'content';
  return 'full_slide';
}

function minsForPurpose(purpose: SignageUploadPurpose) {
  return purpose === 'embedded' ? EMBEDDED_MIN : FULL_SLIDE_MIN;
}

function recommendedForPurpose(purpose: SignageUploadPurpose) {
  return purpose === 'embedded' ? EMBEDDED_AD_SPECS : FULL_SLIDE_AD_SPECS;
}

/**
 * Validate a saved image file for digital signage playback.
 * Rejects artwork that will look soft, letterboxed, or animated on /specials-tv.
 */
export async function validateSignageImageFile(
  filePath: string,
  options: {
    purpose?: SignageUploadPurpose;
    fileSizeBytes?: number;
    mimeType?: string;
  } = {}
): Promise<{ width: number; height: number }> {
  const purpose = options.purpose ?? 'full_slide';
  const mins = minsForPurpose(purpose);
  const recommended = recommendedForPurpose(purpose);

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(filePath, { animated: true }).metadata();
  } catch {
    throw new SignageImageValidationError(
      'Could not read this image. Use a valid PNG, JPG, or WebP file.'
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width <= 0 || height <= 0) {
    throw new SignageImageValidationError(
      'Image dimensions could not be determined. Re-export and try again.'
    );
  }

  // Animated GIFs / multi-frame WebP — TV rotator expects a still frame
  if ((metadata.pages ?? 1) > 1) {
    throw new SignageImageValidationError(
      'Animated images are not allowed. Export a single still frame (PNG or JPG).'
    );
  }

  if (options.mimeType === 'image/gif' && (metadata.delay?.length ?? 0) > 1) {
    throw new SignageImageValidationError(
      'Animated GIFs are not allowed. Export a single still frame (PNG or JPG).'
    );
  }

  if (width < mins.width || height < mins.height) {
    throw new SignageImageValidationError(
      `Image is too small (${width}×${height}). ` +
        `Minimum for this placement is ${mins.width}×${mins.height}. ` +
        `Recommended: ${recommended.summary}.`
    );
  }

  const aspect = width / height;
  if (aspect < ASPECT_MIN || aspect > ASPECT_MAX) {
    throw new SignageImageValidationError(
      `Wrong aspect ratio (${width}×${height} ≈ ${aspect.toFixed(2)}:1). ` +
        `Ads must be landscape ${recommended.aspectLabel} (about 1.78:1) so they fill the TV without black bars. ` +
        `Export at ${recommended.summary}.`
    );
  }

  if (typeof options.fileSizeBytes === 'number' && options.fileSizeBytes > 0) {
    const megapixels = (width * height) / 1_000_000;
    const minBytes = Math.max(40_000, Math.round(megapixels * MIN_BYTES_PER_MEGAPIXEL));
    if (options.fileSizeBytes < minBytes) {
      throw new SignageImageValidationError(
        `Image looks over-compressed (${Math.round(options.fileSizeBytes / 1024)} KB for ${width}×${height}). ` +
          `Re-export at higher quality (target ${recommended.summary}).`
      );
    }
  }

  return { width, height };
}
