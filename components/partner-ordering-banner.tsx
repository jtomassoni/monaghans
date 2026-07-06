import { FaBreadSlice } from 'react-icons/fa';
import { orderingRedirectPath } from '@/lib/ordering-partners';

type PartnerOrderingBannerProps = {
  className?: string;
  variant?: 'hero' | 'inline';
};

/**
 * Permanent partner-ordering strip for Toast online ordering.
 * Warm "toasted" palette (amber/orange) to echo the Toast brand,
 * intentionally distinct from the specials/event cards.
 */
export default function PartnerOrderingBanner({
  className = '',
  variant = 'hero',
}: PartnerOrderingBannerProps) {
  const isHero = variant === 'hero';

  return (
    <aside
      aria-label="Order pickup online through Toast"
      className={`relative w-full overflow-hidden rounded-2xl ${isHero ? 'mb-4 sm:mb-6' : ''} ${className}`}
    >
      {/* Warm toasted accent bars, top & bottom */}
      <div className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-[#FF4C00] via-[#FF8A00] to-[#FFB300] sm:h-1.5" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-gradient-to-r from-[#FFB300] via-[#FF8A00] to-[#FF4C00] sm:h-1.5" aria-hidden />

      <div
        className={`relative flex flex-col gap-3 bg-gradient-to-br from-[#20130a] via-[#2c1a0b] to-[#160d05] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-5 ${
          isHero ? 'shadow-[0_8px_32px_rgba(255,76,0,0.28)]' : 'shadow-lg'
        }`}
      >
        {/* Toasty crumb texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-12deg, #FFB300 0, #FFB300 1px, transparent 1px, transparent 14px)',
          }}
          aria-hidden
        />
        {/* Warm glow */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FF6A00]/20 blur-3xl" aria-hidden />

        <div className="relative flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF4C00] to-[#FF9A00] text-white shadow-lg shadow-[#FF4C00]/30 sm:h-16 sm:w-16"
            aria-hidden
          >
            <FaBreadSlice className="h-5 w-5 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFA033] sm:text-xs">
              Order online
            </p>
            <p className="text-lg font-bold leading-tight text-white sm:text-xl md:text-2xl">
              Pickup on{' '}
              <span className="bg-gradient-to-r from-[#FF6A00] to-[#FFB300] bg-clip-text text-transparent">
                Toast
              </span>
            </p>
            <p className="mt-1 hidden text-xs text-amber-100/60 sm:block sm:text-sm">
              Sheridan neighborhood favorites — order ahead for pickup at the bar.
            </p>
          </div>
        </div>

        <a
          href={orderingRedirectPath('online-ordering')}
          className="relative inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF4C00] to-[#FF8A00] px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-[#FF4C00]/25 transition hover:from-[#e64400] hover:to-[#ff7a00] hover:shadow-[#FF4C00]/40 sm:min-h-[48px] sm:w-auto sm:min-w-[200px] sm:py-3"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Order pickup
        </a>
      </div>
    </aside>
  );
}
