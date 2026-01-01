import { Metadata } from 'next';
import Link from 'next/link';
import AdvertiseLeadForm from '@/components/advertise-lead-form';

export const metadata: Metadata = {
  title: 'Advertise With Us | Monaghan\'s Dive Bar',
  description: 'Reach thousands of customers daily with digital signage advertising at Monaghan\'s. Full slide and embedded sponsorship options available.',
};

export default function AdvertisePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-16 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Advertise With Us
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Reach thousands of customers daily with digital signage advertising
          </p>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Full Slide Sponsor</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[var(--color-accent)] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Full-screen display every 4 content slides
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[var(--color-accent)] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Maximum visibility and impact
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[var(--color-accent)] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Optional click-through URL and QR code
              </li>
            </ul>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Embedded Sponsor</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[var(--color-accent)] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Rotating display in dead space area
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[var(--color-accent)] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Always visible during content slides
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-[var(--color-accent)] mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Cost-effective option for local businesses
              </li>
            </ul>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Why Advertise With Us?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--color-accent)] mb-2">8am-2am</div>
              <p className="text-gray-300">Extended hours of visibility</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--color-accent)] mb-2">Always-On</div>
              <p className="text-gray-300">Continuous presence on our digital displays</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[var(--color-accent)] mb-2">Flexible</div>
              <p className="text-gray-300">Month-to-month contracts available</p>
            </div>
          </div>
        </div>

        {/* Technical Specs Link */}
        <div className="text-center mb-8">
          <Link
            href="/advertise/specs"
            className="inline-flex items-center gap-2 text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] transition-colors"
          >
            View Technical Specifications
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Contact Form */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Get Started</h2>
          <p className="text-gray-300 text-center mb-8">
            Fill out the form below and we'll get back to you with pricing and availability.
          </p>
          <AdvertiseLeadForm />
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

