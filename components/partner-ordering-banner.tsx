import { orderingRedirectPath } from '@/lib/ordering-partners';

type PartnerOrderingBannerProps = {
  className?: string;
  variant?: 'hero' | 'inline';
};

/**
 * Permanent partner-ordering strip — intentionally unlike hero specials/event cards
 * (no border-l accent cards, no purple/orange/blue gradient tiles).
 */
export default function PartnerOrderingBanner({
  className = '',
  variant = 'hero',
}: PartnerOrderingBannerProps) {
  const isHero = variant === 'hero';

  return (
    <aside
      aria-label="Order pickup online through Grubhub"
      className={`relative w-full overflow-hidden ${isHero ? 'mb-4 sm:mb-6' : ''} ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[#F63440] sm:h-1.5" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-[#F63440] sm:h-1.5" aria-hidden />

      <div
        className={`relative flex flex-col gap-4 bg-neutral-950 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-5 ${
          isHero ? 'shadow-[0_8px_32px_rgba(246,52,64,0.25)]' : 'shadow-lg'
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-12deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)',
          }}
          aria-hidden
        />

        <div className="relative flex min-w-0 flex-1 items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center bg-[#F63440] text-white sm:h-16 sm:w-16"
            aria-hidden
          >
            <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F63440] sm:text-xs">
              Order online
            </p>
            <p className="text-lg font-bold leading-tight text-white sm:text-xl md:text-2xl">
              Pickup on <span className="text-[#F63440]">Grubhub</span>
            </p>
            <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
              Sheridan neighborhood favorites — order ahead for pickup at the bar.
            </p>
          </div>
        </div>

        <a
          href={orderingRedirectPath('online-ordering')}
          className="relative inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 bg-[#F63440] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#d42a35] sm:w-auto sm:min-w-[200px]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Order pickup
        </a>
      </div>
    </aside>
  );
}
