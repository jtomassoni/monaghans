'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PrivateEventsForm from '@/components/private-events-form';
import PrivateEventsFormModal from '@/components/private-events-form-modal';

export default function PrivateEventsPageClient({ contact }: { contact: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const formSectionRef = useRef<HTMLElement>(null);
  const bottomFormSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (formSectionRef.current && bottomFormSectionRef.current) {
        const formBottom = formSectionRef.current.offsetTop + formSectionRef.current.offsetHeight;
        const scrollPosition = window.scrollY + window.innerHeight;
        
        // Check if bottom form section is visible in viewport
        const bottomFormTop = bottomFormSectionRef.current.offsetTop;
        const bottomFormBottom = bottomFormTop + bottomFormSectionRef.current.offsetHeight;
        const viewportTop = window.scrollY;
        const viewportBottom = window.scrollY + window.innerHeight;
        
        // Hide button if bottom form is visible (even partially)
        const isBottomFormVisible = bottomFormTop < viewportBottom && bottomFormBottom > viewportTop;
        
        // Show button when we've scrolled past the top form AND bottom form is not visible
        setShowScrollButton(scrollPosition > formBottom + 100 && !isBottomFormVisible);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToForm = () => {
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section with Form - Above the Fold */}
          <section id="request-quote" ref={formSectionRef} className="mb-16 scroll-mt-20">
            <div className="relative rounded-2xl overflow-hidden border-2 border-gray-800 shadow-2xl">
              {/* Background Image with Overlay */}
              <div className="absolute inset-0">
                <Image
                  src="/pics/hero.png"
                  alt="Monaghan's Bar private event space"
                  fill
                  className="object-cover"
                  unoptimized={true}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
              </div>

              {/* Content */}
              <div className="relative z-10 p-8 md:p-12 lg:p-16">
                <div className="max-w-4xl mx-auto">
                  {/* Hero Text */}
                  <div className="text-center mb-8 md:mb-12">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white leading-tight">
                      Plan Your Perfect Private Event
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-[var(--color-accent)] to-purple-600 mx-auto mb-6"></div>
                    <p className="text-lg md:text-xl lg:text-2xl text-gray-200 leading-relaxed max-w-3xl mx-auto">
                      From intimate gatherings to grand celebrations, let us help bring your vision to life at Monaghan&apos;s Bar.
                    </p>
                  </div>

                  {/* Form Container */}
                  <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 md:p-8 shadow-xl">
                    <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white text-center">
                      Request Your Quote
                    </h2>
                    <p className="text-gray-300 text-sm md:text-base mb-6 text-center">
                      Tell us about your event and we&apos;ll get back to you with personalized options.
                    </p>
                    <div className="max-w-2xl mx-auto">
                      <PrivateEventsForm compact={true} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Hero Section - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16">
            {/* Image Column */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-800 shadow-2xl">
              <Image
                src="/pics/hero.png"
                alt="Monaghan's Bar private event space"
                fill
                className="object-cover"
                unoptimized={true}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
            </div>

            {/* Text Column */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white leading-tight">
                  Private Events & Private Dining
                </h1>
                <div className="w-20 h-1 bg-gradient-to-r from-[var(--color-accent)] to-purple-600 mb-6"></div>
                <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                  Host your special occasion at Monaghan&apos;s Bar—Denver&apos;s premier venue for Christmas parties, corporate events, private dining, post-wedding celebrations, birthdays, anniversaries, and memorial services.
                </p>
              </div>

              {/* Event Types - Elegant List */}
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-purple-600 flex-shrink-0"></div>
                    <span className="text-sm md:text-base">Christmas Parties</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-purple-600 flex-shrink-0"></div>
                    <span className="text-sm md:text-base">Corporate Events</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-purple-600 flex-shrink-0"></div>
                    <span className="text-sm md:text-base">Post-Wedding Celebrations</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-purple-600 flex-shrink-0"></div>
                    <span className="text-sm md:text-base">Private Dining</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-purple-600 flex-shrink-0"></div>
                    <span className="text-sm md:text-base">Birthdays & Anniversaries</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-purple-600 flex-shrink-0"></div>
                    <span className="text-sm md:text-base">Memorial Services</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event Space Gallery */}
          <section className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white text-center">
              Our Event Space
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-gray-800">
                <Image
                  src="/pics/hero.png"
                  alt="Monaghan's Bar event space setup"
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold">Event space setup for private dining</p>
                </div>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-gray-800">
                <Image
                  src="/pics/hero.png"
                  alt="Monaghan's Bar bar area with TVs"
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <p className="text-white font-semibold">Bar area with 8 HD TVs</p>
                </div>
              </div>
            </div>
          </section>

          {/* Venue Specifications */}
          <section className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-8 md:p-10 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white text-center">
              Venue Specifications & Amenities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <svg className="w-10 h-10 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Space</h3>
                <p className="text-gray-300 text-2xl font-bold mb-1">2,400 sq ft</p>
                <p className="text-gray-400 text-sm">
                  Accommodates 50-120 guests
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <svg className="w-10 h-10 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Entertainment</h3>
                <p className="text-gray-300 text-2xl font-bold mb-1">8 HD TVs</p>
                <p className="text-gray-400 text-sm">
                  Perfect for sports & presentations
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <svg className="w-10 h-10 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Capacity</h3>
                <p className="text-gray-300 text-2xl font-bold mb-1">50-120 guests</p>
                <p className="text-gray-400 text-sm">
                  Seated or cocktail-style
                </p>
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">What&apos;s Included</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-gray-300 text-sm mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Full-service bar</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Sound system</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Flexible seating</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Private restrooms</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>On-site parking</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Dedicated event coordinator</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Setup, service, and cleanup</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>All service staff included</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Linens, plates, and serviceware</span>
                </div>
              </div>
              <p className="text-gray-300 text-sm text-center mt-4">
                <span className="text-[var(--color-accent)] font-semibold">Flexible group sizes:</span> We welcome groups of all sizes. Contact us to discuss your specific needs.
              </p>
            </div>
          </section>

          {/* Catering & Bar Options */}
          <section className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-8 md:p-10 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white text-center">
              Catering & Bar Options
            </h2>
            <p className="text-gray-300 text-lg mb-6 text-center max-w-3xl mx-auto">
              We offer flexible catering and bar options to fit your event needs. From appetizer spreads to carving stations, open bars to à la carte service—everything is customizable. Contact us to discuss your vision and we&apos;ll create a package that works for your group.
            </p>
            <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700 mb-10">
              <h3 className="text-lg font-semibold text-white mb-3 text-center">Fully Customizable Experience</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300 text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Custom menu items and dietary accommodations</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Extended bar hours available</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Flexible timing and arrangements</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Personalized service tailored to your event</span>
                </div>
              </div>
            </div>

            {/* Food Options */}
            <div className="mb-12">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-white text-center">Food Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-2 border-orange-500/30 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Appetizers & Light Bites</h4>
                  <p className="text-gray-300 text-sm">
                    Perfect for cocktail hours. Wings, nachos, sliders, vegetable platters, cheese boards, and more.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border-2 border-amber-500/30 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Buffet Style</h4>
                  <p className="text-gray-300 text-sm">
                    Our famous Green Chili, hot dishes, salads, and sides. Great for larger groups.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border-2 border-red-500/30 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Carving Stations</h4>
                  <p className="text-gray-300 text-sm">
                    Prime rib, roasted meats, and specialty stations. Perfect for formal events.
                  </p>
                </div>
              </div>
            </div>

            {/* Bar Options */}
            <div className="mb-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-white text-center">Bar Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-2 border-blue-500/30 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Open Bar</h4>
                  <p className="text-gray-300 text-sm">
                    Beer, wine, and spirits included. Choose from domestic, craft, premium, or top-shelf options.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-2 border-purple-500/30 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">À La Carte</h4>
                  <p className="text-gray-300 text-sm">
                    Guests pay for their own drinks. Perfect for casual gatherings and flexibility.
                  </p>
                </div>
                <div className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 border-2 border-indigo-500/30 rounded-xl p-6 text-center">
                  <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Hosted Bar</h4>
                  <p className="text-gray-300 text-sm">
                    Set a tab or time limit. Great for controlling costs while providing drinks.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Form Section */}
          <section id="contact" ref={bottomFormSectionRef} className="bg-gradient-to-br from-[var(--color-accent)]/20 to-purple-900/20 backdrop-blur-sm border-2 border-[var(--color-accent)]/30 rounded-xl p-8 md:p-10 mb-12">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white text-center">
                Questions? We&apos;re Here to Help
              </h2>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/20">
                <p className="text-lg text-gray-100 text-center leading-relaxed">
                  <span className="font-semibold text-white">Submit a request and we&apos;ll be in touch ASAP with answers!</span> We encourage form submissions so our team can give your inquiry the attention it deserves when we&apos;re not in the middle of serving guests during peak hours.
                </p>
              </div>
              <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 md:p-8 shadow-xl">
                <h3 className="text-2xl font-bold mb-4 text-white text-center">
                  Request More Information
                </h3>
                <div className="max-w-2xl mx-auto">
                  <PrivateEventsForm compact={true} />
                </div>
              </div>
            </div>
          </section>

          {/* Back to Home Link - Less Prominent */}
          <div className="text-center mb-12">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-300 text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Floating Scroll to Form Button */}
      {showScrollButton && (
        <button
          onClick={scrollToForm}
          className="fixed bottom-8 right-8 z-40 inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-base animate-in fade-in slide-in-from-bottom-4 duration-300"
          aria-label="Scroll to request form"
        >
          Request Info
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* Modal */}
      <PrivateEventsFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

