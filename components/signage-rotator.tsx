'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import ReactMarkdown from 'react-markdown';
import { SlideContent } from '@/app/specials-tv/types';

// Configure marked to allow HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

type Props = {
  slides: SlideContent[];
  slideDurationMs?: number;
  fadeDurationMs?: number;
  debug?: boolean;
};

export default function SignageRotator({
  slides,
  slideDurationMs = 10000,
  fadeDurationMs = 700,
  debug = false,
}: Props) {
  const [index, setIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [fadeProgress, setFadeProgress] = useState(0); // 0 = current slide fully visible, 1 = next slide fully visible
  const [showControls, setShowControls] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnimationFrame = useRef<number | null>(null);
  const fadeStartTime = useRef<number | null>(null);

  const safeSlides = useMemo(() => slides.filter(Boolean), [slides]);
  const clampedSlideDuration = Math.max(slideDurationMs, fadeDurationMs + 300);
  const clampedFadeDuration = Math.min(fadeDurationMs, clampedSlideDuration - 200);

  useEffect(() => {
    setIndex(0);
    setNextIndex(null);
    setFadeProgress(0);
    // Reset failed images when slides change
    setFailedImages(new Set());
  }, [safeSlides.length]);

  // Cross-fade animation
  useEffect(() => {
    if (fadeStartTime.current === null) return;

    const animate = (currentTime: number) => {
      if (fadeStartTime.current === null) return;
      
      const elapsed = currentTime - fadeStartTime.current;
      const progress = Math.min(elapsed / clampedFadeDuration, 1);
      
      setFadeProgress(progress);

      if (progress < 1) {
        fadeAnimationFrame.current = requestAnimationFrame(animate);
      } else {
        // Transition complete
        setIndex(nextIndex!);
        setNextIndex(null);
        setFadeProgress(0);
        fadeStartTime.current = null;
      }
    };

    fadeAnimationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (fadeAnimationFrame.current) {
        cancelAnimationFrame(fadeAnimationFrame.current);
      }
    };
  }, [nextIndex, clampedFadeDuration]);

  useEffect(() => {
    if (safeSlides.length <= 1 || isPaused) return;

    const startFadeTimer = setTimeout(() => {
      const next = (index + 1) % safeSlides.length;
      setNextIndex(next);
      fadeStartTime.current = performance.now();
    }, clampedSlideDuration - clampedFadeDuration);

    return () => {
      clearTimeout(startFadeTimer);
    };
  }, [index, safeSlides.length, clampedSlideDuration, clampedFadeDuration, isPaused]);

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  const revealControls = () => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => setShowControls(false), 3200);
  };

  const goToSlide = (targetIndex: number) => {
    if (targetIndex === index) return;
    setNextIndex(null);
    setFadeProgress(0);
    fadeStartTime.current = null;
    if (fadeAnimationFrame.current) {
      cancelAnimationFrame(fadeAnimationFrame.current);
    }
    setIndex((targetIndex + safeSlides.length) % safeSlides.length);
  };

  const goToPrevious = () => {
    setNextIndex(null);
    setFadeProgress(0);
    fadeStartTime.current = null;
    if (fadeAnimationFrame.current) {
      cancelAnimationFrame(fadeAnimationFrame.current);
    }
    setIndex((prev) => (prev - 1 + safeSlides.length) % safeSlides.length);
  };

  const goToNext = () => {
    setNextIndex(null);
    setFadeProgress(0);
    fadeStartTime.current = null;
    if (fadeAnimationFrame.current) {
      cancelAnimationFrame(fadeAnimationFrame.current);
    }
    setIndex((prev) => (prev + 1) % safeSlides.length);
  };

  if (safeSlides.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <p className="text-4xl font-bold">No slides available</p>
      </div>
    );
  }



  // Helper function to get slide properties
  const getSlideProps = (slideToRender: SlideContent) => {
    // Color mappings for all accent options - using hex values directly for reliability
    const colorMap: Record<string, { var: string; glow: string; surface: string; surfaceStrong: string }> = {
      accent: {
        var: '#dc2626', // Brand Red
        glow: 'rgba(220, 38, 38, 0.55)',
        surface: 'rgba(220, 38, 38, 0.1)',
        surfaceStrong: 'rgba(220, 38, 38, 0.18)',
      },
      gold: {
        var: '#d4af37',
        glow: 'rgba(212, 175, 55, 0.55)',
        surface: 'rgba(212, 175, 55, 0.08)',
        surfaceStrong: 'rgba(212, 175, 55, 0.16)',
      },
      blue: {
        var: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.55)',
        surface: 'rgba(59, 130, 246, 0.1)',
        surfaceStrong: 'rgba(59, 130, 246, 0.18)',
      },
      green: {
        var: '#10b981',
        glow: 'rgba(16, 185, 129, 0.55)',
        surface: 'rgba(16, 185, 129, 0.1)',
        surfaceStrong: 'rgba(16, 185, 129, 0.18)',
      },
      purple: {
        var: '#8b5cf6',
        glow: 'rgba(139, 92, 246, 0.55)',
        surface: 'rgba(139, 92, 246, 0.1)',
        surfaceStrong: 'rgba(139, 92, 246, 0.18)',
      },
      orange: {
        var: '#f97316',
        glow: 'rgba(249, 115, 22, 0.55)',
        surface: 'rgba(249, 115, 22, 0.1)',
        surfaceStrong: 'rgba(249, 115, 22, 0.18)',
      },
      teal: {
        var: '#14b8a6',
        glow: 'rgba(20, 184, 166, 0.55)',
        surface: 'rgba(20, 184, 166, 0.1)',
        surfaceStrong: 'rgba(20, 184, 166, 0.18)',
      },
      pink: {
        var: '#ec4899',
        glow: 'rgba(236, 72, 153, 0.55)',
        surface: 'rgba(236, 72, 153, 0.1)',
        surfaceStrong: 'rgba(236, 72, 153, 0.18)',
      },
      cyan: {
        var: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.55)',
        surface: 'rgba(6, 182, 212, 0.1)',
        surfaceStrong: 'rgba(6, 182, 212, 0.18)',
      },
    };

    const accent = slideToRender.accent || 'accent';
    const colors = colorMap[accent] || colorMap.accent;
    
    const accentColor = colors.var;
    const accentGlowColor = colors.glow;
    const accentSurfaceColor = colors.surface;
    const accentSurfaceStrong = colors.surfaceStrong;
    const isEventSlide = slideToRender.source === 'events';
    const isHappyHourSlide = slideToRender.source === 'happyHour';
    const isDrinkSlide = slideToRender.source === 'drink';
    const isFoodSlide = slideToRender.source === 'food';
    const isCustomSlide = slideToRender.source === 'custom';
    const showLabel = slideToRender.label && slideToRender.source !== 'custom';
    const gridColumns = isEventSlide ? 'event' : 'default';
    const itemCount = slideToRender.items?.length || 0;
    const isDenseEvents = isEventSlide && itemCount >= 5;
    const eventColumnCount = isEventSlide ? (isDenseEvents ? 3 : Math.max(1, Math.min(2, itemCount || 1))) : undefined;
    const eventRowCount = isEventSlide && eventColumnCount ? Math.ceil(itemCount / eventColumnCount) : undefined;
    const eventRowMin = isEventSlide ? (isDenseEvents ? 240 : itemCount >= 3 ? 280 : 320) : undefined;
    const backgroundImageUrl =
      (slideToRender.source === 'happyHour' || slideToRender.source === 'drink')
        ? '/pics/happy-hour-cheers.png'
        : null;
    
    return {
      accentColor,
      accentGlowColor,
      accentSurfaceColor,
      accentSurfaceStrong,
      isEventSlide,
      isHappyHourSlide,
      isDrinkSlide,
      isFoodSlide,
      isCustomSlide,
      showLabel,
      gridColumns,
      itemCount,
      isDenseEvents,
      eventColumnCount,
      eventRowCount,
      eventRowMin,
      backgroundImageUrl,
    };
  };

  const currentSlide = safeSlides[index];
  const nextSlide = nextIndex !== null ? safeSlides[nextIndex] : null;
  const currentSlideProps = getSlideProps(currentSlide);
  const nextSlideProps = nextSlide ? getSlideProps(nextSlide) : null;
  
  // For backward compatibility, keep these for the render function
  const slide = currentSlide;
  const {
    accentColor,
    accentGlowColor,
    accentSurfaceColor,
    accentSurfaceStrong,
    isEventSlide,
    isHappyHourSlide,
    isDrinkSlide,
    isFoodSlide,
    isCustomSlide,
    showLabel,
    gridColumns,
    itemCount,
    isDenseEvents,
    eventColumnCount,
    eventRowCount,
    eventRowMin,
    backgroundImageUrl,
  } = currentSlideProps;
  
  const pageTextureUrl = '/pics/monaghans-patio.jpg';
  
  // Calculate opacities for cross-fade
  const currentOpacity = nextIndex !== null ? 1 - fadeProgress : 1;
  const nextOpacity = nextIndex !== null ? fadeProgress : 0;

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#050608] text-white"
      onMouseMove={revealControls}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(5, 6, 8, 0.82), rgba(5, 6, 8, 0.92)), url(${pageTextureUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(10px) saturate(1.05)',
          transform: 'scale(1.04)',
          opacity: 0.65,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${accentSurfaceStrong}, transparent 40%), radial-gradient(circle at 80% 30%, ${accentSurfaceColor}, transparent 38%), linear-gradient(135deg, #0b0c10, #050608)`,
          filter: 'saturate(1.1)',
        }}
      />

      {debug && (
        <div className="absolute left-6 top-6 z-30 rounded-xl bg-black/70 px-4 py-3 text-sm text-white shadow-lg">
          <p className="font-semibold">Debug</p>
          <p className="text-white/80">
            Slide {index + 1} / {safeSlides.length} · {slide.source}
            {nextIndex !== null && ` → ${nextIndex + 1}`}
          </p>
          <p className="text-white/60">Duration {Math.round(clampedSlideDuration / 1000)}s · Fade {Math.round(clampedFadeDuration)}ms · Progress {Math.round(fadeProgress * 100)}%</p>
        </div>
      )}

      {/* Slide container - renders both current and next slide during transition */}
      <div className="absolute inset-0 flex items-center justify-center px-6 py-8 md:px-12 md:py-12">
        {/* Current slide */}
        <div
          className="absolute inset-0 flex items-center justify-center px-6 py-8 md:px-12 md:py-12"
          style={{ 
            opacity: currentOpacity,
            transition: nextIndex === null ? 'none' : 'opacity 0ms linear',
            pointerEvents: currentOpacity > 0.5 ? 'auto' : 'none',
          }}
        >
        {(isHappyHourSlide || (isDrinkSlide && backgroundImageUrl)) ? (
          // Special creative layout for Happy Hour slide
          <div 
            className="relative z-10 flex h-full w-full max-w-[min(98vw,2200px)] items-center justify-center overflow-hidden rounded-[48px] border border-white/10 p-8 md:p-12 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-lg"
            style={{
              backgroundImage: backgroundImageUrl ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url(${backgroundImageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div 
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.05), transparent 70%)',
              }}
            />
            
            {/* Centered content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center w-full max-w-6xl px-4 py-4 md:py-6 min-h-full">
              {/* Happy Hour Section */}
              <div className="flex flex-col items-center space-y-3 md:space-y-4 mb-4 md:mb-6 flex-shrink-0 w-full max-w-4xl">
                {/* Happy Hour badge */}
                {showLabel && (
                  <div
                    className="inline-block rounded-full px-6 py-3 md:px-8 md:py-4 font-black uppercase tracking-wider text-black shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]"
                    style={{ 
                      backgroundColor: accentColor, 
                      boxShadow: `0 0 0 3px ${accentColor}, 0 20px 60px -30px ${accentGlowColor}`,
                      fontSize: 'clamp(24px, 4vw, 48px)'
                    }}
                  >
                    {slide.label}
                  </div>
                )}

                {/* Happy Hour Content Container - only show for happy hour slides */}
                {isHappyHourSlide && (slide.subtitle || slide.title || slide.body) && (
                  <div className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 md:p-6 shadow-lg w-full" style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}` }}>
                    <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                      {/* Times */}
                      {slide.subtitle && (
                        <div
                          className="font-bold uppercase tracking-[0.15em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                          style={{ fontSize: 'clamp(20px, 3.5vw, 40px)' }}
                        >
                          {slide.subtitle}
                        </div>
                      )}

                      {/* Main title */}
                      {slide.title && (
                        <h1
                          className="text-balance font-black leading-[0.9] tracking-tight drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                          style={{ fontSize: 'clamp(40px, 7vw, 80px)' }}
                        >
                          {slide.title}
                        </h1>
                      )}

                      {/* Description/Body */}
                      {slide.body && (
                        <p
                          className="max-w-4xl font-semibold leading-[1.15] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                          style={{ fontSize: 'clamp(20px, 4vw, 40px)' }}
                        >
                          {slide.body}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Divider between sections */}
              {slide.items && slide.items.length > 0 && (
                <div className="w-full max-w-2xl h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4 md:mb-6" />
              )}

              {/* Drink Specials Section */}
              {slide.items && slide.items.length > 0 && (
                <div className="w-full max-w-4xl flex-shrink-0">
                  {/* Section Header - only show for happy hour slides (drink-only slides already have label above) */}
                  {isHappyHourSlide && (
                    <div className="mb-4 md:mb-6 text-center">
                      <div
                        className="inline-block rounded-full px-6 py-3 md:px-8 md:py-4 font-black uppercase tracking-wider text-black shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]"
                        style={{ 
                          backgroundColor: accentColor,
                          boxShadow: `0 0 0 3px ${accentColor}, 0 20px 60px -30px ${accentGlowColor}`,
                          fontSize: 'clamp(24px, 4vw, 48px)'
                        }}
                      >
                        Today's Drink Specials
                      </div>
                    </div>
                  )}
                  
                  {/* Drink Special Items */}
                  <div className="space-y-4 md:space-y-5 flex-shrink-0">
                    {slide.items.map((item, itemIdx) => (
                      <div
                        key={`${slide.id}-item-${itemIdx}`}
                        className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 md:p-6 shadow-lg"
                        style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}` }}
                      >
                        <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                          <h3
                            className="font-extrabold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                            style={{ fontSize: 'clamp(24px, 4.5vw, 42px)' }}
                          >
                            {item.title}
                          </h3>
                          {item.note && (
                            <p
                              className="font-semibold text-white/90"
                              style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}
                            >
                              {item.note}
                            </p>
                          )}
                          {item.time && (
                            <p
                              className="font-medium text-white/75"
                              style={{ fontSize: 'clamp(14px, 2.5vw, 20px)' }}
                            >
                              {item.time}
                            </p>
                          )}
                          {item.detail && (
                            <div
                              className="mt-1 text-white/85 leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-2 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-2 [&_p]:mb-2"
                              style={{ fontSize: 'clamp(14px, 2.5vw, 20px)' }}
                              dangerouslySetInnerHTML={{ __html: marked.parse(item.detail) }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer - moved to bottom, much smaller */}
              {slide.footer && (
                <div className="mt-4 md:mt-6">
                  <div
                    className="font-medium text-white/60 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                    style={{ fontSize: 'clamp(12px, 1.8vw, 18px)' }}
                  >
                    {slide.footer}
                  </div>
                </div>
              )}

              {/* Decorative elements */}
              <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-40 h-40 rounded-full bg-gradient-to-tl from-white/10 to-transparent blur-3xl" />
            </div>

            {/* Monaghan's branding in corner */}
            <span 
              className="absolute top-8 right-8 font-semibold text-white/70" 
              style={{ fontSize: 'clamp(20px, 3.5vw, 36px)' }}
            >
              Monaghan&apos;s
            </span>
          </div>
        ) : (
          // Standard layout for other slides
          <div 
            className="relative z-10 flex h-full w-full max-w-[min(98vw,2200px)] flex-col overflow-hidden rounded-[48px] bg-white/5 p-7 md:p-10 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-lg"
            style={{
              border: isCustomSlide ? `3px solid ${accentColor}` : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: isCustomSlide 
                ? `0 0 30px ${accentGlowColor}, 0 30px 120px -60px rgba(0,0,0,0.9)`
                : '0 30px 120px -60px rgba(0,0,0,0.9)'
            }}
          >
            <div className="pointer-events-none absolute inset-x-10 top-0 z-0 h-40 bg-gradient-to-b from-white/10 via-white/0 to-transparent blur-2xl" />
            <header className={`relative flex items-start justify-between gap-6 ${isCustomSlide ? 'mb-4' : ''}`}>
              <div className="flex flex-wrap items-center gap-4">
                {showLabel && (
                  <span
                    className="rounded-full px-5 py-2 font-black uppercase tracking-wide text-black shadow-[0_16px_45px_-28px_rgba(0,0,0,0.65)]"
                    style={{ backgroundColor: accentColor, boxShadow: `0 0 0 2px ${accentColor}`, fontSize: 'clamp(22px, 4vw, 42px)' }}
                  >
                    {slide.label}
                  </span>
                )}
                {!isCustomSlide && slide.subtitle && (
                  <span
                    className="font-semibold uppercase tracking-[0.12em] text-white/80 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
                    style={{ fontSize: 'clamp(20px, 4.2vw, 44px)' }}
                  >
                    {slide.subtitle}
                  </span>
                )}
              </div>
              <span className="font-semibold text-white/70" style={{ fontSize: 'clamp(18px, 3.6vw, 32px)' }}>
                Monaghan&apos;s
              </span>
            </header>

            <main className={`mt-6 md:mt-8 flex min-h-0 flex-1 flex-col ${isCustomSlide ? 'justify-center items-center' : 'justify-start'} gap-6 md:gap-8`}>
              {(slide.title || slide.body || slide.footer || (isCustomSlide && slide.subtitle)) && (
                <div className={`flex flex-col gap-5 md:gap-6 ${isCustomSlide ? 'items-center text-center max-w-5xl xl:max-w-6xl' : ''}`}>
                  {isCustomSlide && slide.subtitle && (
                    <p
                      className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                      style={{ fontSize: 'clamp(14px, 2.5vw, 24px)' }}
                    >
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.title && (
                    <h1
                      className={`text-balance font-black leading-[0.95] tracking-tight drop-shadow-[0_18px_48px_rgba(0,0,0,0.45)] ${isCustomSlide ? 'text-center' : ''}`}
                      style={{ 
                        fontSize: 'clamp(42px, 8vw, 92px)',
                        ...(isCustomSlide ? { 
                          color: accentColor,
                          textShadow: `0 0 20px ${accentGlowColor}, 0 18px 48px rgba(0,0,0,0.45)`
                        } : {})
                      }}
                    >
                      {slide.title}
                    </h1>
                  )}
                  {slide.body && (
                    isCustomSlide ? (
                      <div
                        className="max-w-5xl xl:max-w-6xl font-semibold leading-[1.2] drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] mt-8 md:mt-12 w-full mx-auto [&_*]:text-white [&_p]:text-[clamp(24px,4.5vw,48px)] [&_h1]:text-[clamp(28px,5.5vw,56px)]"
                        style={{ fontSize: 'clamp(24px, 4.5vw, 48px)' }}
                      >
                        <ReactMarkdown
                          components={{
                            ul: ({ children }) => (
                              <ul style={{ listStyle: 'none', paddingLeft: 0, margin: '0.5em 0' }}>
                                {children}
                              </ul>
                            ),
                            li: ({ children }) => (
                              <li style={{ marginBottom: '0.8em', paddingLeft: '1.8em', position: 'relative', listStyle: 'none', display: 'block', textAlign: 'left' }}>
                                <span style={{ position: 'absolute', left: 0, color: accentColor, fontWeight: 'bold', fontSize: '1.3em', lineHeight: '1.2' }}>•</span>
                                <span style={{ color: 'white', display: 'inline-block', marginLeft: '0.5em' }}>{children}</span>
                              </li>
                            ),
                          }}
                        >
                          {slide.body}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p
                        className="max-w-6xl font-semibold leading-[1.08] text-white/90 drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] overflow-hidden"
                        style={{ 
                          fontSize: 'clamp(26px, 5.6vw, 54px)',
                          display: '-webkit-box', 
                          WebkitLineClamp: 3, 
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {slide.body}
                      </p>
                    )
                  )}
                  {isCustomSlide && slide.footer && (
                    <p
                      className="max-w-5xl xl:max-w-6xl font-semibold leading-[1.2] drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-center mt-2"
                      style={{ 
                        fontSize: 'clamp(18px, 3.5vw, 32px)',
                        color: accentColor,
                        textShadow: `0 0 15px ${accentGlowColor}, 0 8px 24px rgba(0,0,0,0.35)`
                      }}
                    >
                      {slide.footer}
                    </p>
                  )}
                </div>
              )}

              {slide.items && slide.items.length > 0 && (() => {
              const itemsInLastRow = isEventSlide && eventColumnCount && eventRowCount
                ? itemCount - (eventRowCount - 1) * eventColumnCount
                : 0;
              const hasIncompleteLastRow = isEventSlide && itemsInLastRow > 0 && itemsInLastRow < (eventColumnCount || 0);
              const lastRowStartIdx = isEventSlide && eventColumnCount && eventRowCount
                ? (eventRowCount - 1) * eventColumnCount
                : itemCount;

              // For incomplete last row, use a multiplier grid so items fill evenly
              // e.g., 2 items in 3 columns: use 6 columns (3*2), each item spans 3
              const gridMultiplier = hasIncompleteLastRow && itemsInLastRow > 0 ? itemsInLastRow : 1;
              const effectiveColumnCount = isEventSlide && hasIncompleteLastRow
                ? (eventColumnCount || 0) * gridMultiplier
                : eventColumnCount;

              return (
                <div
                  className="grid flex-1 gap-5 md:gap-7"
                  style={{
                    gridAutoRows: gridColumns === 'event' ? `minmax(${eventRowMin || 0}px, 1fr)` : 'minmax(250px, 1fr)',
                    gridTemplateColumns:
                      gridColumns === 'event'
                        ? `repeat(${effectiveColumnCount}, minmax(0, 1fr))`
                        : 'repeat(auto-fit, minmax(380px, 1fr))',
                    gridTemplateRows: gridColumns === 'event' && eventRowCount ? `repeat(${eventRowCount}, minmax(0, 1fr))` : undefined,
                    alignContent: 'stretch',
                  }}
                >
                  {slide.items.map((item, itemIdx) => {
                  const isLastRowItem = isEventSlide && itemIdx >= lastRowStartIdx;
                  // For incomplete last row, adjust spanning for all items
                  let gridColumnStyle: string | undefined;
                  const isWiderTile = isEventSlide && isLastRowItem && hasIncompleteLastRow && eventColumnCount && itemsInLastRow > 0;
                  const tileWidthMultiplier = isWiderTile ? (eventColumnCount / itemsInLastRow) : 1; // How much wider this tile is
                  
                  if (isEventSlide && hasIncompleteLastRow && eventColumnCount) {
                    if (isLastRowItem) {
                      // Last row items: each gets eventColumnCount columns in the multiplied grid
                      const positionInLastRow = itemIdx - lastRowStartIdx;
                      const startCol = positionInLastRow * eventColumnCount + 1;
                      const endCol = startCol + eventColumnCount;
                      gridColumnStyle = `${startCol} / ${endCol}`;
                    } else {
                      // First rows: each item spans gridMultiplier columns to maintain original width
                      const positionInRow = itemIdx % (eventColumnCount || 1);
                      const startCol = positionInRow * gridMultiplier + 1;
                      const endCol = startCol + gridMultiplier;
                      gridColumnStyle = `${startCol} / ${endCol}`;
                    }
                  }

                  // Adjust sizing based on tile width - wider tiles get larger text and more spacing
                  const basePadding = isDenseEvents ? 'p-5 md:p-6' : 'p-6 md:p-8';
                  const padding = isWiderTile ? 'p-7 md:p-9' : basePadding;
                  const titleSize = isWiderTile 
                    ? 'clamp(32px, 6vw, 60px)' 
                    : isDenseEvents 
                      ? 'clamp(26px, 4.8vw, 46px)' 
                      : 'clamp(28px, 5.4vw, 52px)';
                  const noteSize = isWiderTile
                    ? 'clamp(22px, 4.4vw, 36px)'
                    : isDenseEvents 
                      ? 'clamp(18px, 3.8vw, 26px)' 
                      : 'clamp(20px, 4.2vw, 30px)';
                  const timeSize = isWiderTile
                    ? 'clamp(20px, 4.2vw, 32px)'
                    : isDenseEvents 
                      ? 'clamp(18px, 3.8vw, 26px)' 
                      : 'clamp(20px, 4vw, 28px)';
                  const detailSize = isWiderTile
                    ? 'clamp(20px, 4.2vw, 34px)'
                    : isDenseEvents 
                      ? 'clamp(18px, 3.8vw, 26px)' 
                      : 'clamp(20px, 4.4vw, 30px)';
                  const noteMargin = isWiderTile ? 'mt-3' : 'mt-2.5';
                  const detailMargin = isWiderTile ? 'mt-4' : 'mt-3.5';
                  const dividerMargin = isWiderTile ? 'mt-auto pt-5' : 'mt-auto pt-4';

                  return isEventSlide ? (
                    <div
                      key={`${slide.id}-${itemIdx}`}
                      className={`relative flex flex-col h-full overflow-hidden rounded-3xl border border-white/14 bg-gradient-to-br from-white/8 via-white/0 to-black/55 ${padding} shadow-[0_18px_70px_-48px_rgba(0,0,0,0.85)] backdrop-blur-md`}
                      style={{ 
                        boxShadow: `0 18px 70px -48px ${accentGlowColor}`,
                        gridColumn: gridColumnStyle,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-80"
                        style={{
                          background: `radial-gradient(circle at 18% 20%, ${accentSurfaceColor}, transparent 40%), radial-gradient(circle at 82% 8%, ${accentSurfaceColor}, transparent 34%)`,
                        }}
                      />
                      {/* Content centered and reordered: Title -> Time -> Date -> Description */}
                      <div className="relative flex-1 flex flex-col items-center justify-center text-center min-h-0 gap-4 md:gap-5">
                        {/* Title first - bright white */}
                        <p
                          className="font-extrabold leading-[1.15] text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] break-words"
                          style={{ 
                            fontSize: titleSize,
                            lineHeight: '1.15',
                            display: '-webkit-box',
                            WebkitLineClamp: isWiderTile ? 3 : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.title}
                        </p>
                        
                        {/* Time - accent color */}
                        {item.time && (
                          <p
                            className="font-semibold leading-[1.3] break-words"
                            style={{ 
                              fontSize: isWiderTile ? 'clamp(18px, 3.6vw, 28px)' : isDenseEvents ? 'clamp(16px, 3.2vw, 24px)' : 'clamp(17px, 3.4vw, 26px)',
                              color: accentColor,
                              textShadow: `0 4px 12px ${accentGlowColor}`,
                            }}
                          >
                            {item.time}
                          </p>
                        )}
                        
                        {/* Note/Date - accent color */}
                        {item.note && (
                          <p
                            className="font-bold leading-[1.25] break-words"
                            style={{ 
                              fontSize: noteSize,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              color: accentColor,
                              textShadow: `0 3px 10px ${accentGlowColor}`,
                            }}
                          >
                            {item.note}
                          </p>
                        )}
                        
                        {/* Description - white with slight opacity */}
                        {item.detail && (
                          <div
                            className="relative overflow-hidden leading-[1.4] text-white/85 break-words flex-1 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-2 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-2 [&_p]:mb-2"
                            style={{ 
                              fontSize: detailSize,
                            }}
                            dangerouslySetInnerHTML={{ __html: marked.parse(item.detail) }}
                          />
                        )}
                      </div>
                      <div className={`relative ${dividerMargin} h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent`} />
                    </div>
                  ) : (
                    <div
                      key={`${slide.id}-${itemIdx}`}
                      className="relative flex flex-col overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-white/10 via-white/0 to-black/40 p-6 md:p-8 shadow-[0_18px_70px_-48px_rgba(0,0,0,0.85)] backdrop-blur-md"
                      style={{ boxShadow: `0 18px 70px -48px ${accentGlowColor}` }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-80"
                        style={{
                          background: `radial-gradient(circle at 20% 20%, ${accentSurfaceColor}, transparent 38%), radial-gradient(circle at 80% 0%, ${accentSurfaceColor}, transparent 36%)`,
                        }}
                      />
                      {item.image && !failedImages.has(item.image) ? (
                        // Layout with image: horizontal side-by-side on 2xl screens, vertical stacked (text top, image bottom) on smaller screens
                        <div className="relative flex flex-col 2xl:flex-row items-center justify-center gap-3 md:gap-4 2xl:gap-6 h-full">
                          {/* Text section - centered in vertical mode, left-aligned in horizontal mode */}
                          <div className="relative flex-none 2xl:flex-1 flex flex-col min-w-0 2xl:justify-center pr-0 2xl:pr-2 text-center 2xl:text-left w-full 2xl:w-auto">
                            <div className="flex items-center 2xl:items-start justify-center 2xl:justify-start gap-3 mb-1 2xl:mb-4 flex-wrap px-2 2xl:px-0">
                              <p
                                className="font-extrabold leading-[1.1] flex-1"
                                style={{ 
                                  fontSize: 'clamp(32px, 6vw, 72px)',
                                  color: isFoodSlide ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 1)',
                                  textShadow: isFoodSlide 
                                    ? '0 0 20px rgba(255, 255, 255, 0.3), 0 6px 18px rgba(0,0,0,0.6)' 
                                    : '0 6px 18px rgba(0,0,0,0.6)',
                                }}
                              >
                                {item.title}
                              </p>
                              {item.time && (
                                <span
                                  className="relative shrink-0 rounded-full border bg-white/10 px-4 py-2 md:px-5 md:py-2.5 font-bold tracking-tight shadow-lg"
                                  style={{
                                    fontSize: 'clamp(18px, 3.5vw, 28px)',
                                    color: accentColor,
                                    borderColor: accentColor,
                                    boxShadow: `0 0 0 1px ${accentColor}, 0 12px 36px -18px ${accentGlowColor}`,
                                  }}
                                >
                                  {item.time}
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p
                                className="relative mb-2 md:mb-2 2xl:mb-3 overflow-hidden font-semibold leading-[1.2] px-2 2xl:px-0"
                                style={{ 
                                  fontSize: 'clamp(22px, 4.5vw, 40px)',
                                  color: isFoodSlide ? 'rgba(251, 191, 36, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                  textShadow: isFoodSlide ? '0 3px 12px rgba(251, 191, 36, 0.5)' : 'none',
                                }}
                              >
                                {item.note}
                              </p>
                            )}
                            {item.detail && (
                              <p
                                className="relative overflow-hidden leading-[1.4] flex-1 px-2 2xl:px-0 mb-0 2xl:mb-0"
                                style={{ 
                                  fontSize: 'clamp(18px, 3.8vw, 34px)',
                                  color: isFoodSlide ? 'rgba(147, 197, 253, 0.9)' : 'rgba(255, 255, 255, 0.85)',
                                  textShadow: isFoodSlide ? '0 2px 8px rgba(147, 197, 253, 0.3)' : 'none',
                                }}
                              >
                                {item.detail}
                              </p>
                            )}
                          </div>
                          {/* Image section - full width below text in vertical mode, side-by-side in horizontal mode */}
                          <div className="relative flex-shrink-0 w-full 2xl:w-[60%] 2xl:min-w-[400px] 2xl:max-w-[900px] h-[45%] 2xl:h-auto min-h-[350px] md:min-h-[400px] 2xl:min-h-0 rounded-3xl overflow-hidden border-2 border-white/30 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.95)] mt-6 md:mt-8 2xl:mt-0">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              style={{ transform: 'scale(1.05)' }}
                              onError={() => {
                                // Mark image as failed to trigger layout change
                                setFailedImages((prev) => new Set(prev).add(item.image!));
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
                            <div className="absolute inset-0 ring-2 ring-white/20 rounded-3xl pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/10 pointer-events-none" />
                          </div>
                        </div>
                      ) : (
                        // Layout without image: centered and prominent text-only layout
                        <div className="relative flex flex-col items-center justify-center h-full text-center gap-6 md:gap-8 px-4">
                          <div className="flex flex-col items-center gap-4 md:gap-5">
                            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
                              <p
                                className="font-extrabold leading-[1.05]"
                                style={{ 
                                  fontSize: 'clamp(42px, 8vw, 88px)',
                                  color: isFoodSlide ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 1)',
                                  textShadow: isFoodSlide 
                                    ? '0 0 24px rgba(255, 255, 255, 0.35), 0 8px 24px rgba(0,0,0,0.5)' 
                                    : '0 8px 24px rgba(0,0,0,0.5)',
                                }}
                              >
                                {item.title}
                              </p>
                              {item.time && (
                                <span
                                  className="relative shrink-0 rounded-full border bg-white/10 px-5 py-2.5 md:px-6 md:py-3 font-bold tracking-tight shadow-lg"
                                  style={{
                                    fontSize: 'clamp(20px, 4vw, 32px)',
                                    color: accentColor,
                                    borderColor: accentColor,
                                    boxShadow: `0 0 0 2px ${accentColor}, 0 16px 48px -20px ${accentGlowColor}`,
                                  }}
                                >
                                  {item.time}
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p
                                className="relative overflow-hidden font-semibold leading-[1.2] drop-shadow-[0_6px_20px_rgba(0,0,0,0.4)]"
                                style={{ 
                                  fontSize: 'clamp(32px, 6vw, 56px)',
                                  color: isFoodSlide ? 'rgba(251, 191, 36, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                  textShadow: isFoodSlide ? '0 4px 16px rgba(251, 191, 36, 0.5)' : '0 6px 20px rgba(0,0,0,0.4)',
                                }}
                              >
                                {item.note}
                              </p>
                            )}
                            {item.detail && (
                              <p
                                className="relative overflow-hidden leading-[1.4] drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)] max-w-4xl"
                                style={{ 
                                  fontSize: 'clamp(24px, 4.8vw, 42px)',
                                  color: isFoodSlide ? 'rgba(147, 197, 253, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                  textShadow: isFoodSlide ? '0 3px 12px rgba(147, 197, 253, 0.35)' : '0 4px 16px rgba(0,0,0,0.35)',
                                }}
                              >
                                {item.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
                );
              })()}
            </main>

            {!isCustomSlide && slide.footer && <footer className="mt-8 md:mt-10 text-[34px] md:text-[38px] font-semibold text-white/80">{slide.footer}</footer>}
          </div>
        )}
      </div>

        {/* Next slide (during transition) */}
        {nextSlide && nextSlideProps && (
          <div
            className="absolute inset-0 flex items-center justify-center px-6 py-8 md:px-12 md:py-12"
            style={{ 
              opacity: nextOpacity,
              transition: 'opacity 0ms linear',
              pointerEvents: nextOpacity > 0.5 ? 'auto' : 'none',
            }}
          >
            {(() => {
              // Temporarily override variables for next slide rendering
              const slide = nextSlide;
              const {
                accentColor,
                accentGlowColor,
                accentSurfaceColor,
                accentSurfaceStrong,
                isEventSlide,
                isHappyHourSlide,
                isDrinkSlide,
                isFoodSlide,
                showLabel,
                gridColumns,
                itemCount,
                isDenseEvents,
                eventColumnCount,
                eventRowCount,
                eventRowMin,
                backgroundImageUrl,
              } = nextSlideProps;
              
              // Render next slide (duplicate the slide rendering logic)
              return (isHappyHourSlide || (isDrinkSlide && backgroundImageUrl)) ? (
                // Special creative layout for Happy Hour slide
                <div 
                  className="relative z-10 flex h-full w-full max-w-[min(98vw,2200px)] items-center justify-center overflow-hidden rounded-[48px] border border-white/10 p-8 md:p-12 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-lg"
                  style={{
                    backgroundImage: backgroundImageUrl ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url(${backgroundImageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <div 
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.05), transparent 70%)',
                    }}
                  />
                  
                  {/* Centered content */}
                  <div className="relative z-10 flex flex-col items-center justify-center text-center w-full max-w-6xl px-4 py-4 md:py-6 min-h-full">
                    {/* Happy Hour Section */}
                    <div className="flex flex-col items-center space-y-3 md:space-y-4 mb-4 md:mb-6 flex-shrink-0 w-full max-w-4xl">
                      {/* Happy Hour badge */}
                      {showLabel && (
                        <div
                          className="inline-block rounded-full px-6 py-3 md:px-8 md:py-4 font-black uppercase tracking-wider text-black shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]"
                          style={{ 
                            backgroundColor: accentColor, 
                            boxShadow: `0 0 0 3px ${accentColor}, 0 20px 60px -30px ${accentGlowColor}`,
                            fontSize: 'clamp(24px, 4vw, 48px)'
                          }}
                        >
                          {slide.label}
                        </div>
                      )}

                      {/* Happy Hour Content Container - only show for happy hour slides */}
                      {isHappyHourSlide && (slide.subtitle || slide.title || slide.body) && (
                        <div className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 md:p-6 shadow-lg w-full" style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}` }}>
                          <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                            {/* Times */}
                            {slide.subtitle && (
                              <div
                                className="font-bold uppercase tracking-[0.15em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                                style={{ fontSize: 'clamp(20px, 3.5vw, 40px)' }}
                              >
                                {slide.subtitle}
                              </div>
                            )}

                            {/* Main title */}
                            {slide.title && (
                              <h1
                                className="text-balance font-black leading-[0.9] tracking-tight drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                                style={{ fontSize: 'clamp(40px, 7vw, 80px)' }}
                              >
                                {slide.title}
                              </h1>
                            )}

                            {/* Description/Body */}
                            {slide.body && (
                              <p
                                className="max-w-4xl font-semibold leading-[1.15] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                                style={{ fontSize: 'clamp(20px, 4vw, 40px)' }}
                              >
                                {slide.body}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Divider between sections */}
                    {slide.items && slide.items.length > 0 && (
                      <div className="w-full max-w-2xl h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4 md:mb-6" />
                    )}

                    {/* Drink Specials Section */}
                    {slide.items && slide.items.length > 0 && (
                      <div className="w-full max-w-4xl flex-shrink-0">
                        {/* Section Header - only show for happy hour slides (drink-only slides already have label above) */}
                        {isHappyHourSlide && (
                          <div className="mb-4 md:mb-6 text-center">
                            <div
                              className="inline-block rounded-full px-6 py-3 md:px-8 md:py-4 font-black uppercase tracking-wider text-black shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]"
                              style={{ 
                                backgroundColor: accentColor,
                                boxShadow: `0 0 0 3px ${accentColor}, 0 20px 60px -30px ${accentGlowColor}`,
                                fontSize: 'clamp(24px, 4vw, 48px)'
                              }}
                            >
                              Today's Drink Specials
                            </div>
                          </div>
                        )}
                        
                        {/* Drink Special Items */}
                        <div className="space-y-4 md:space-y-5 flex-shrink-0">
                          {slide.items.map((item, itemIdx) => (
                            <div
                              key={`${slide.id}-item-${itemIdx}`}
                              className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 md:p-6 shadow-lg"
                              style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}` }}
                            >
                              <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                                <h3
                                  className="font-extrabold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                                  style={{ fontSize: 'clamp(24px, 4.5vw, 42px)' }}
                                >
                                  {item.title}
                                </h3>
                                {item.note && (
                                  <p
                                    className="font-semibold text-white/90"
                                    style={{ fontSize: 'clamp(16px, 3vw, 24px)' }}
                                  >
                                    {item.note}
                                  </p>
                                )}
                                {item.time && (
                                  <p
                                    className="font-medium text-white/75"
                                    style={{ fontSize: 'clamp(14px, 2.5vw, 20px)' }}
                                  >
                                    {item.time}
                                  </p>
                                )}
                                {item.detail && (
                                  <div
                                    className="mt-1 text-white/85 leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-2 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-2 [&_p]:mb-2"
                                    style={{ fontSize: 'clamp(14px, 2.5vw, 20px)' }}
                                    dangerouslySetInnerHTML={{ __html: marked.parse(item.detail) }}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer - moved to bottom, much smaller */}
                    {slide.footer && (
                      <div className="mt-4 md:mt-6">
                        <div
                          className="font-medium text-white/60 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                          style={{ fontSize: 'clamp(12px, 1.8vw, 18px)' }}
                        >
                          {slide.footer}
                        </div>
                      </div>
                    )}

                    {/* Decorative elements */}
                    <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-3xl" />
                    <div className="absolute bottom-0 right-1/4 w-40 h-40 rounded-full bg-gradient-to-tl from-white/10 to-transparent blur-3xl" />
                  </div>

                  {/* Monaghan's branding in corner */}
                  <span 
                    className="absolute top-8 right-8 font-semibold text-white/70" 
                    style={{ fontSize: 'clamp(20px, 3.5vw, 36px)' }}
                  >
                    Monaghan&apos;s
                  </span>
                </div>
              ) : (
                // Standard layout for other slides - simplified for next slide
                <div 
                  className="relative z-10 flex h-full w-full max-w-[min(98vw,2200px)] flex-col overflow-hidden rounded-[48px] bg-white/5 p-7 md:p-10 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-lg"
                  style={{
                    border: isCustomSlide ? `3px solid ${accentColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: isCustomSlide 
                      ? `0 0 30px ${accentGlowColor}, 0 30px 120px -60px rgba(0,0,0,0.9)`
                      : '0 30px 120px -60px rgba(0,0,0,0.9)'
                  }}
                >
                  <div className="pointer-events-none absolute inset-x-10 top-0 z-0 h-40 bg-gradient-to-b from-white/10 via-white/0 to-transparent blur-2xl" />
                  <header className={`relative flex items-start justify-between gap-6 ${isCustomSlide ? 'mb-4' : ''}`}>
                    <div className="flex flex-wrap items-center gap-4">
                      {showLabel && (
                        <span
                          className="rounded-full px-5 py-2 font-black uppercase tracking-wide text-black shadow-[0_16px_45px_-28px_rgba(0,0,0,0.65)]"
                          style={{ backgroundColor: accentColor, boxShadow: `0 0 0 2px ${accentColor}`, fontSize: 'clamp(22px, 4vw, 42px)' }}
                        >
                          {slide.label}
                        </span>
                      )}
                      {!isCustomSlide && slide.subtitle && (
                        <span
                          className="font-semibold uppercase tracking-[0.12em] text-white/80 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
                          style={{ fontSize: 'clamp(20px, 4.2vw, 44px)' }}
                        >
                          {slide.subtitle}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-white/70" style={{ fontSize: 'clamp(18px, 3.6vw, 32px)' }}>
                      Monaghan&apos;s
                    </span>
                  </header>

                  <main className={`mt-6 md:mt-8 flex min-h-0 flex-1 flex-col ${isCustomSlide ? 'justify-center items-center' : 'justify-start'} gap-6 md:gap-8`}>
                    {(slide.title || slide.body || slide.footer || (isCustomSlide && slide.subtitle)) && (
                      <div className={`flex flex-col gap-5 md:gap-6 ${isCustomSlide ? 'items-center text-center max-w-5xl xl:max-w-6xl' : ''}`}>
                        {isCustomSlide && slide.subtitle && (
                          <p
                            className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                            style={{ fontSize: 'clamp(14px, 2.5vw, 24px)' }}
                          >
                            {slide.subtitle}
                          </p>
                        )}
                        {slide.title && (
                          <h1
                            className={`text-balance font-black leading-[0.95] tracking-tight drop-shadow-[0_18px_48px_rgba(0,0,0,0.45)] ${isCustomSlide ? 'text-center' : ''}`}
                            style={{ 
                              fontSize: 'clamp(42px, 8vw, 92px)',
                              ...(isCustomSlide ? { 
                                color: accentColor,
                                textShadow: `0 0 20px ${accentGlowColor}, 0 18px 48px rgba(0,0,0,0.45)`
                              } : {})
                            }}
                          >
                            {slide.title}
                          </h1>
                        )}
                        {slide.body && (
                          isCustomSlide ? (
                            <div
                              className="max-w-5xl xl:max-w-6xl font-semibold leading-[1.2] drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] mt-8 md:mt-12 w-full mx-auto [&_*]:text-white [&_p]:text-[clamp(24px,4.5vw,48px)] [&_h1]:text-[clamp(28px,5.5vw,56px)]"
                              style={{ fontSize: 'clamp(24px, 4.5vw, 48px)' }}
                            >
                              <ReactMarkdown
                                components={{
                                  ul: ({ children }) => (
                                    <ul style={{ listStyle: 'none', paddingLeft: 0, margin: '0.5em 0' }}>
                                      {children}
                                    </ul>
                                  ),
                                  li: ({ children }) => (
                                    <li style={{ marginBottom: '0.8em', paddingLeft: '1.8em', position: 'relative', listStyle: 'none', display: 'block', textAlign: 'left' }}>
                                      <span style={{ position: 'absolute', left: 0, color: accentColor, fontWeight: 'bold', fontSize: '1.3em', lineHeight: '1.2' }}>•</span>
                                      <span style={{ color: 'white', display: 'inline-block', marginLeft: '0.5em' }}>{children}</span>
                                    </li>
                                  ),
                                }}
                              >
                                {slide.body}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p
                              className="max-w-6xl font-semibold leading-[1.08] text-white/90 drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] overflow-hidden"
                              style={{ 
                                fontSize: 'clamp(26px, 5.6vw, 54px)',
                                display: '-webkit-box', 
                                WebkitLineClamp: 3, 
                                WebkitBoxOrient: 'vertical'
                              }}
                            >
                              {slide.body}
                            </p>
                          )
                        )}
                        {isCustomSlide && slide.footer && (
                          <p
                            className="max-w-4xl font-semibold leading-[1.2] drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-center mt-2"
                            style={{ 
                              fontSize: 'clamp(20px, 4vw, 36px)',
                              color: accentColor,
                              textShadow: `0 0 15px ${accentGlowColor}, 0 8px 24px rgba(0,0,0,0.35)`
                            }}
                          >
                            {slide.footer}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Items rendering would go here but simplified for now */}
                  </main>

                  {!isCustomSlide && slide.footer && <footer className="mt-8 md:mt-10 text-[34px] md:text-[38px] font-semibold text-white/80">{slide.footer}</footer>}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {safeSlides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
          {safeSlides.map((_, dotIdx) => {
            const isActive = dotIdx === index;
            return (
              <button
                key={dotIdx}
                type="button"
                aria-label={`Go to slide ${dotIdx + 1}`}
                onClick={() => {
                  revealControls();
                  goToSlide(dotIdx);
                }}
                className={`h-3 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${isActive ? 'w-14 bg-[var(--accent)] shadow-[0_0_0_1px_rgba(255,255,255,0.3)]' : 'w-10 bg-white/25'}`}
              />
            );
          })}
        </div>
      )}

      {safeSlides.length > 1 && (
        <button
          type="button"
          aria-label={isPaused ? 'Resume rotation' : 'Pause rotation'}
          aria-pressed={isPaused}
          onClick={() => {
            revealControls();
            setIsPaused((prev) => !prev);
            // Transition handled by fadeProgress
          }}
          className={`absolute right-6 top-6 z-30 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur transition ${showControls ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}
          style={{ transitionDuration: '200ms' }}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      )}

      {safeSlides.length > 1 && (
        <>
          <button
            aria-label="Previous slide"
            onClick={() => {
              revealControls();
              goToPrevious();
            }}
            className={`group absolute left-6 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/20 bg-black/30 px-5 py-4 text-xl font-semibold text-white shadow-lg backdrop-blur transition ${showControls ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}
            style={{ transitionDuration: '200ms' }}
          >
            ‹
          </button>
          <button
            aria-label="Next slide"
            onClick={() => {
              revealControls();
              goToNext();
            }}
            className={`group absolute right-6 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/20 bg-black/30 px-5 py-4 text-xl font-semibold text-white shadow-lg backdrop-blur transition ${showControls ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}
            style={{ transitionDuration: '200ms' }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

