import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

export interface PdfPageImage {
  pageNumber: number;
  storageKey: string;
  width: number;
  height: number;
}

/**
if  * Convert PDF pages to images using pdfjs-dist and canvas
 * Requires: npm install pdfjs-dist canvas
 * On macOS, canvas also requires: brew install pkg-config cairo pango libpng jpeg giflib librsvg
 */
/**
 * Dynamic import helper that prevents Next.js from analyzing modules at build time
 */
function dynamicImport(moduleName: string): Promise<any> {
  // Use Function constructor to create a truly dynamic import
  // that bundlers can't statically analyze
  const importFunc = new Function('moduleName', 'return import(moduleName)');
  return importFunc(moduleName);
}

export async function convertPdfToImages(
  pdfPath: string,
  uploadId: string
): Promise<PdfPageImage[]> {
  try {
    // Use dynamic imports that won't be analyzed at build time
    const pdfjs = await dynamicImport('pdfjs-dist');
    
    // Canvas is optional - may not be available in all environments (e.g., Vercel builds)
    let canvasModule;
    try {
      canvasModule = await dynamicImport('canvas');
    } catch (canvasError) {
      throw new Error(
        'Canvas module is not available. PDF processing requires the canvas package with native dependencies. ' +
        'This feature may not be available in serverless environments like Vercel. ' +
        `Original error: ${canvasError instanceof Error ? canvasError.message : 'Unknown error'}`
      );
    }
    
    const { createCanvas } = canvasModule;
    
    // Read the PDF file
    const pdfBuffer = await readFile(pdfPath);
    const pdfData = new Uint8Array(pdfBuffer);
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    // Create output directory
    const pagesDir = join(process.cwd(), 'public', 'uploads', uploadId, 'pages');
    await mkdir(pagesDir, { recursive: true });
    
    const pageImages: PdfPageImage[] = [];
    
    // Convert each page to an image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality
      
      // Create canvas
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context as any,
        viewport: viewport,
      }).promise;
      
      // Convert canvas to buffer
      const pngBuffer = canvas.toBuffer('image/png');
      
      // Convert PNG to WebP using sharp
      const webpBuffer = await sharp(pngBuffer).webp({ quality: 90 }).toBuffer();
      
      // Get dimensions
      const metadata = await sharp(webpBuffer).metadata();
      
      // Save WebP file
      const pageFilename = `page-${pageNum}.webp`;
      const webpPath = join(pagesDir, pageFilename);
      await writeFile(webpPath, webpBuffer);
      
      pageImages.push({
        pageNumber: pageNum,
        storageKey: `/uploads/${uploadId}/pages/${pageFilename}`,
        width: metadata.width || 0,
        height: metadata.height || 0,
      });
    }
    
    return pageImages;

  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw new Error(
      `Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

