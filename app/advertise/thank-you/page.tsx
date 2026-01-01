import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thank You | Monaghan\'s Dive Bar',
  description: 'Thank you for your advertising inquiry. We\'ll be in touch soon!',
};

export default function AdvertiseThankYouPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-16 pb-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-[var(--color-accent)]/20 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Thank You Message */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          Thank You!
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          We've received your advertising inquiry and will be in touch soon.
        </p>

        {/* Next Steps */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8 text-left">
          <h2 className="text-2xl font-bold text-white mb-4">What Happens Next?</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Review Your Inquiry</h3>
                <p>We'll review your submission and check availability for your preferred ad type.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Contact You</h3>
                <p>We'll reach out via email or phone within 1-2 business days with pricing and next steps.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white font-bold mr-4 flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Get Started</h3>
                <p>Once we agree on terms, we'll help you upload your creative and get your ad live!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Questions?</h2>
          <p className="text-gray-300 mb-4">
            If you have any immediate questions, feel free to reach out to us directly.
          </p>
          <p className="text-gray-300">
            You can also visit our <Link href="/contact" className="text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] underline">contact page</Link> for more ways to get in touch.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/advertise"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            Learn More About Advertising
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

