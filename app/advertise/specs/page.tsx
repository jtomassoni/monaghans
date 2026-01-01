import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Advertising Specifications | Monaghan\'s Dive Bar',
  description: 'Technical specifications and design guidelines for digital signage advertising at Monaghan\'s.',
};

export default function AdvertiseSpecsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-16 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Advertising Specifications
          </h1>
          <p className="text-xl text-gray-300">
            Technical requirements and design guidelines for your ad creative
          </p>
        </div>

        {/* Image Specifications */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Image Specifications</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Supported Formats</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>PNG (recommended for transparency)</li>
                <li>JPG / JPEG</li>
                <li>WebP</li>
                <li>GIF (static images only)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">File Size Limits</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Images: Maximum 10MB</li>
                <li>PDFs: Maximum 20MB (will be converted to images)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Recommended Dimensions</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Full Slide:</strong> 1920 × 1080 pixels (16:9 aspect ratio)</li>
                <li><strong>Embedded:</strong> 800 × 450 pixels (16:9 aspect ratio) or similar</li>
                <li>We support any aspect ratio, but 16:9 is recommended for best results</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Image Quality</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>High resolution recommended (at least 72 DPI)</li>
                <li>RGB color mode</li>
                <li>Optimized file size for fast loading</li>
              </ul>
            </div>
          </div>
        </div>

        {/* PDF Specifications */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">PDF Specifications</h2>
          <div className="space-y-4 text-gray-300">
            <p>
              PDF files are automatically converted to images (one slide per page). Each page becomes a separate slide.
            </p>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Requirements</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Maximum file size: 20MB</li>
                <li>Each page should be designed as a standalone slide</li>
                <li>Recommended page size: 1920 × 1080 pixels (16:9)</li>
                <li>PDFs are converted to WebP format for optimal performance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Design Guidelines */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Design Guidelines</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Best Practices</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Use high contrast text for readability</li>
                <li>Keep text concise and impactful</li>
                <li>Include your logo prominently</li>
                <li>Use clear call-to-action (CTA)</li>
                <li>Test readability at various distances</li>
                <li>Avoid small text or fine details</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Color Considerations</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Our displays use dark backgrounds, so light text works best</li>
                <li>High contrast combinations are recommended</li>
                <li>Avoid very light colors on light backgrounds</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Content Tips</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Include your business name and contact information</li>
                <li>Highlight key offers or promotions</li>
                <li>Use compelling visuals that grab attention</li>
                <li>Keep messaging simple and memorable</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Optional Features */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Optional Features</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Click-Through URL</h3>
              <p className="ml-4">
                Full slide ads can include a clickable link that directs viewers to your website or landing page.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">QR Code</h3>
              <p className="ml-4">
                We can automatically generate a QR code linking to your destination URL, making it easy for customers to visit your website on their mobile devices.
              </p>
            </div>
          </div>
        </div>

        {/* Examples Note */}
        <div className="bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/50 rounded-lg p-6 mb-8">
          <p className="text-white text-center">
            <strong>Need help with design?</strong> We're happy to provide guidance or connect you with local designers who specialize in digital signage.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/advertise"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Advertising
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 text-white rounded-lg transition-all font-semibold"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

