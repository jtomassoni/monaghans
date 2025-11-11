import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--color-accent)]/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[var(--color-accent)]/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl mx-auto text-center relative z-10">
        <div className="mb-8">
          <h1 className="text-9xl md:text-[12rem] font-bold text-[var(--color-accent)] mb-4 drop-shadow-2xl">
            404
          </h1>
          <div className="w-32 h-1 bg-[var(--color-accent)] mx-auto mb-8 shadow-lg shadow-[var(--color-accent)]/50"></div>
        </div>
        
        <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-xl p-8 mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Looks Like You Took a Wrong Turn
          </h2>
          
          <p className="text-xl text-gray-300 mb-6 leading-relaxed">
            This page doesn&apos;t exist or has been moved. No worries—happens to the best of us after a few rounds.
          </p>
          
          <p className="text-lg text-gray-400 italic">
            &quot;Cold drinks, warm people&quot;—but this page is neither. Let&apos;s get you back on track.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Link
            href="/"
            className="px-8 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg shadow-[var(--color-accent)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-black"
          >
            Back to Home
          </Link>
          
          <Link
            href="/menu"
            className="px-8 py-3 border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-black"
          >
            View Menu
          </Link>
          
          <Link
            href="/events"
            className="px-8 py-3 border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-black"
          >
            View Events
          </Link>
        </div>
        
        <div className="mt-12 text-gray-500 text-sm">
          <p>Need help? <Link href="/contact" className="text-[var(--color-accent)] hover:text-[var(--color-accent-dark)] hover:underline transition-colors">Contact us</Link></p>
        </div>
      </div>
    </main>
  );
}

