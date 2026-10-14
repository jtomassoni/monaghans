import { Metadata } from 'next';
import Link from 'next/link';
import { EMBEDDED_AD_SPECS, FULL_SLIDE_AD_SPECS } from '@/lib/ad-creative-specs';

export const metadata: Metadata = {
  title: 'Advertising Specifications | Monaghan\'s Dive Bar',
  description: 'Technical specifications and design guidelines for digital signage advertising at Monaghan\'s.',
};

export default function AdvertiseSpecsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-16 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Advertising Specifications
          </h1>
          <p className="text-xl text-gray-300">
            Ads are image-based. Your artwork is the entire slide — including your title and offer.
          </p>
        </div>

        {/* Pixel requirements front and center */}
        <div className="bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/50 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Required pixel sizes</h2>
          <p className="text-gray-300 mb-6">
            Design the full ad as a single image. We do not overlay a separate title on image ads —
            put your brand name, prices, and CTA in the file.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-black/40 border border-white/10 p-5">
              <p className="text-sm uppercase tracking-wider text-gray-400 mb-1">
                {FULL_SLIDE_AD_SPECS.label}
              </p>
              <p className="text-3xl font-bold text-white tabular-nums">
                {FULL_SLIDE_AD_SPECS.width} × {FULL_SLIDE_AD_SPECS.height}
              </p>
              <p className="text-gray-400 mt-1">
                pixels · {FULL_SLIDE_AD_SPECS.aspectLabel} landscape · fills the TV
              </p>
            </div>
            <div className="rounded-lg bg-black/40 border border-white/10 p-5">
              <p className="text-sm uppercase tracking-wider text-gray-400 mb-1">
                {EMBEDDED_AD_SPECS.label}
              </p>
              <p className="text-3xl font-bold text-white tabular-nums">
                {EMBEDDED_AD_SPECS.width} × {EMBEDDED_AD_SPECS.height}
              </p>
              <p className="text-gray-400 mt-1">
                pixels · {EMBEDDED_AD_SPECS.aspectLabel} · corner / zone placement
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">File requirements</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Formats</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>PNG (recommended)</li>
                <li>JPG / JPEG</li>
                <li>WebP</li>
                <li>GIF (static only)</li>
                <li>PDF (converted to images, one slide per page)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">File size</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Images: max 10MB</li>
                <li>PDFs: max 20MB</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Why exact pixels matter</h3>
              <p className="ml-4">
                TVs are {FULL_SLIDE_AD_SPECS.aspectLabel}. Artwork that is not{' '}
                {FULL_SLIDE_AD_SPECS.summary} will letterbox (black bars) or look soft when scaled.
                Export at exactly {FULL_SLIDE_AD_SPECS.width}×{FULL_SLIDE_AD_SPECS.height} for full-slide ads.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Uploads we reject</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  Smaller than {FULL_SLIDE_AD_SPECS.minWidth}×{FULL_SLIDE_AD_SPECS.minHeight} (full slide)
                  or {EMBEDDED_AD_SPECS.minWidth}×{EMBEDDED_AD_SPECS.minHeight} (embedded)
                </li>
                <li>Not landscape 16:9 (portrait, square, or ultrawide)</li>
                <li>Animated GIFs / multi-frame images</li>
                <li>Heavily over-compressed files that look mushy on a big screen</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Design tips</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
            <li>Bake logo, headline, offer, and contact into the image</li>
            <li>High contrast — readable from across a bar</li>
            <li>Avoid tiny type and fine detail</li>
            <li>RGB color; keep important content away from the outer ~5% edge</li>
            <li>Optional: we can add a QR code linking to your URL</li>
          </ul>
        </div>

        <div className="bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/50 rounded-lg p-6 mb-8">
          <p className="text-white text-center">
            <strong>Need help with design?</strong> We can guide you or connect you with designers who know digital signage.
          </p>
        </div>

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
