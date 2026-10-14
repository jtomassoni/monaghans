'use client';

/**
 * Full-screen TV promo for Sindustry OS.
 * Shown in /specials-tv when admin has ads.enabledByAdmin on.
 */
export default function SindustryOsAdSlide() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#06080c] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 15% 10%, rgba(34, 211, 238, 0.14), transparent 55%), radial-gradient(ellipse 60% 50% at 90% 90%, rgba(14, 165, 233, 0.1), transparent 45%), linear-gradient(165deg, #06080c 0%, #0a1018 50%, #050608 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="absolute top-7 right-9 z-10 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
        Advertisement
      </div>

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-14 py-12 text-center">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.4em] text-cyan-300/85 md:text-base">
          Hospitality software
        </p>

        <h1
          className="max-w-5xl text-6xl font-black leading-[0.92] tracking-tight md:text-8xl lg:text-[7.5rem]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", ui-serif, serif',
            background: 'linear-gradient(135deg, #f0fdff 0%, #67e8f9 45%, #e0f2fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Sindustry OS
        </h1>

        <p className="mt-7 max-w-3xl text-2xl font-medium leading-snug text-white/75 md:text-3xl">
          Digital signage, specials, events, and ops — built for bars and restaurants.
        </p>

        <div className="mt-10 h-px w-40 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        <p className="mt-10 max-w-2xl text-lg text-white/50 md:text-xl">
          Like what you see on this screen? Ask about Sindustry OS — or upgrade to ad-free.
        </p>
        <p className="mt-4 text-lg font-semibold tracking-[0.18em] text-cyan-200/90 md:text-xl">
          sindustryos.com
        </p>
      </div>
    </div>
  );
}
