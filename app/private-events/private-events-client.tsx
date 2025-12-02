'use client';

import { useState } from 'react';
import PrivateEventsFormModal from '@/components/private-events-form-modal';
import PrivateEventsForm from '@/components/private-events-form';

export default function PrivateEventsClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Quote Request Form - First Section */}
      <section className="mb-16">
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white text-center">
            Request a Quote
          </h2>
          <p className="text-gray-300 text-sm md:text-base mb-6 text-center max-w-2xl mx-auto">
            Fill out the form below and we&apos;ll get back to you soon to discuss your private event needs.
          </p>
          <div className="max-w-3xl mx-auto">
            <PrivateEventsForm compact={true} />
          </div>
        </div>
      </section>

      {/* Modal */}
      <PrivateEventsFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* CTA Button Component - Can be used throughout */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-base"
      >
        Request a Quote
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
}


