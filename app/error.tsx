'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--color-accent)]/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[var(--color-accent)]/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl mx-auto text-center relative z-10">
        <div className="mb-8">
          <h1 className="text-9xl md:text-[12rem] font-bold text-[var(--color-accent)] mb-4 drop-shadow-2xl">
            500
          </h1>
          <div className="w-32 h-1 bg-[var(--color-accent)] mx-auto mb-8 shadow-lg shadow-[var(--color-accent)]/50"></div>
        </div>
        
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-8 mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Oops! Something Spilled
          </h2>
          
          <p className="text-xl text-gray-300 mb-6 leading-relaxed">
            We&apos;re having a bit of trouble behind the bar. Our team has been notified and we&apos;re working to clean things up.
          </p>
          
          <p className="text-lg text-gray-400 italic">
            Don&apos;t worry—we&apos;ll have this sorted faster than you can say &quot;another round.&quot;
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            onClick={reset}
            className="px-8 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-[var(--color-accent)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-black"
          >
            Try Again
          </button>
          
          <Link
            href="/"
            className="px-8 py-3 border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-black"
          >
            Back to Home
          </Link>
        </div>
        
        <div className="mt-12 text-gray-500 text-sm">
          <p>If this problem persists, please <Link href="/contact" className="text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] hover:underline transition-colors">contact us</Link>.</p>
          {error.digest && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

