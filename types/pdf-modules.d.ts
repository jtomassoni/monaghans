// Type declarations for PDF processing modules
declare module 'pdfjs-dist' {
  export function getDocument(src: { data: Uint8Array }): {
    promise: Promise<{
      numPages: number;
      getPage(pageNum: number): Promise<{
        getViewport(options: { scale: number }): {
          width: number;
          height: number;
        };
        render(options: {
          canvasContext: any;
          viewport: { width: number; height: number };
        }): { promise: Promise<void> };
      }>;
    }>;
  };
}

declare module 'canvas' {
  export function createCanvas(width: number, height: number): {
    getContext(type: '2d'): {
      [key: string]: any;
    };
    toBuffer(mimeType: string): Buffer;
  };
}

