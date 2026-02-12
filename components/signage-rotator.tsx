'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import ReactMarkdown from 'react-markdown';
import { SlideContent } from '@/app/specials-tv/types';
import AdZone, { AdCreative } from './ad-zone';
import SlideContentRenderer from './slide-content-renderer';

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
  adsEnabled?: boolean; // Whether ads are enabled by admin
  embeddedAds?: AdCreative[]; // Embedded ads for AdZone
};

export default function SignageRotator({
  slides,
  slideDurationMs = 10000,
  fadeDurationMs = 700,
  debug = false,
  adsEnabled = false,
  embeddedAds = [],
}: Props) {
  const [index, setIndex] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isFirstRender, setIsFirstRender] = useState(true);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [shouldResetPosition, setShouldResetPosition] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const safeSlides = useMemo(() => slides.filter(Boolean), [slides]);
  // Use slide transition duration from prop (converted from seconds to ms, with min/max bounds)
  const slideTransitionDuration = Math.min(Math.max(fadeDurationMs || 400, 200), 1000);

  useEffect(() => {
    setIndex(0);
    setIsTransitioning(false);
    setFailedImages(new Set());
    setIsFirstRender(true);
    setDebugInfo({});
  }, [safeSlides.length]);

  // Clear debug info when slide changes
  useEffect(() => {
    if (debug) {
      setDebugInfo({});
    }
  }, [index, debug]);

  // Mark first render as complete after initial mount
  useEffect(() => {
    if (isFirstRender) {
      // Use a small delay to ensure first slide is fully rendered
      const timer = setTimeout(() => {
        setIsFirstRender(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFirstRender]);

  // Auto-advance slides with smooth carousel transition
  useEffect(() => {
    if (safeSlides.length <= 1 || isPaused || isTransitioning) return;

    slideTimer.current = setTimeout(() => {
      // Check if we're wrapping from last slide to first
      const nextIndex = (index + 1) % safeSlides.length;
      const isWrapping = nextIndex === 0 && index === safeSlides.length - 1;
      
      if (isWrapping) {
        // For wrap-around, instantly reset without animation
        setShouldResetPosition(true);
        setIndex(nextIndex);
        // Reset the flag on next frame to allow instant position reset
        requestAnimationFrame(() => {
          setShouldResetPosition(false);
        });
      } else {
        // Normal transition
        setIsTransitioning(true);
        setIndex(nextIndex);
        setTimeout(() => {
          setIsTransitioning(false);
        }, slideTransitionDuration);
      }
    }, slideDurationMs);

    return () => {
      if (slideTimer.current) {
        clearTimeout(slideTimer.current);
      }
    };
  }, [index, safeSlides.length, slideDurationMs, slideTransitionDuration, isPaused, isTransitioning]);

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
    if (targetIndex === index || isTransitioning) return;
    if (slideTimer.current) {
      clearTimeout(slideTimer.current);
    }
    const normalizedIndex = (targetIndex + safeSlides.length) % safeSlides.length;
    const isWrapping = normalizedIndex === 0 && index === safeSlides.length - 1;
    
    if (isWrapping) {
      // For wrap-around, instantly reset without animation
      setShouldResetPosition(true);
      setIndex(normalizedIndex);
      requestAnimationFrame(() => {
        setShouldResetPosition(false);
      });
    } else {
      // Normal transition
      setIsTransitioning(true);
      setIndex(normalizedIndex);
      setTimeout(() => {
        setIsTransitioning(false);
      }, slideTransitionDuration);
    }
  };

  const goToPrevious = () => {
    if (isTransitioning) return;
    if (slideTimer.current) {
      clearTimeout(slideTimer.current);
    }
    // For backward navigation, normal transition is fine (visually moves forward)
    setIsTransitioning(true);
    setIndex((prev) => (prev - 1 + safeSlides.length) % safeSlides.length);
    setTimeout(() => {
      setIsTransitioning(false);
    }, slideTransitionDuration);
  };

  const goToNext = () => {
    if (isTransitioning) return;
    if (slideTimer.current) {
      clearTimeout(slideTimer.current);
    }
    const nextIndex = (index + 1) % safeSlides.length;
    const isWrapping = nextIndex === 0 && index === safeSlides.length - 1;
    
    if (isWrapping) {
      // For wrap-around, instantly reset without animation
      setShouldResetPosition(true);
      setIndex(nextIndex);
      requestAnimationFrame(() => {
        setShouldResetPosition(false);
      });
    } else {
      // Normal transition
      setIsTransitioning(true);
      setIndex(nextIndex);
      setTimeout(() => {
        setIsTransitioning(false);
      }, slideTransitionDuration);
    }
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
        var: '#228B22', // Traditional Irish bar green (forest green)
        glow: 'rgba(34, 139, 34, 0.55)',
        surface: 'rgba(34, 139, 34, 0.1)',
        surfaceStrong: 'rgba(34, 139, 34, 0.18)',
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
    const isWelcomeSlide = slideToRender.source === 'welcome';
    const showLabel = slideToRender.label && slideToRender.source !== 'custom' && slideToRender.source !== 'welcome';
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
      isWelcomeSlide,
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
  const isAdSlide = currentSlide?.isAd === true;
  const isWelcomeSlide = currentSlide?.source === 'welcome';
  // Check if this is an image-based custom slide or welcome slide (for container sizing and display)
  const isImageBasedSlide = (currentSlide?.source === 'custom' || isWelcomeSlide) && (currentSlide?.slideType === 'image' || (currentSlide?.items && currentSlide.items.some(item => item.image)));
  const hasImageItems = isImageBasedSlide;
  // Check if current slide is an image-based custom slide
  // Must have: source === 'custom', asset exists, and storageKey is a non-empty string
  const isImageCustomSlide = Boolean(
    currentSlide?.source === 'custom' && 
    currentSlide?.asset && 
    currentSlide.asset.storageKey &&
    typeof currentSlide.asset.storageKey === 'string' &&
    currentSlide.asset.storageKey.trim() !== ''
  );
  
  // Check if border should be shown - only show when explicitly set to true
  const showBorderForImageSlide = isImageCustomSlide 
    ? (currentSlide?.showBorder === true) // Only show border when explicitly true
    : true;
  
  // Debug logging for image-based custom slides
  if (currentSlide?.source === 'custom' && debug) {
    console.log('Custom slide debug:', {
      id: currentSlide.id,
      source: currentSlide.source,
      hasAsset: !!currentSlide.asset,
      storageKey: currentSlide.asset?.storageKey,
      isContentSlide: currentSlide.isContentSlide,
      isImageCustomSlide,
      title: currentSlide.title,
    });
  }
  
  const currentSlideProps = (isAdSlide || isImageCustomSlide) ? null : getSlideProps(currentSlide);
  
  // For backward compatibility, keep these for the render function
  const slide = currentSlide;
  const {
    accentColor = '#dc2626',
    accentGlowColor = 'rgba(220, 38, 38, 0.55)',
    accentSurfaceColor = 'rgba(220, 38, 38, 0.1)',
    accentSurfaceStrong = 'rgba(220, 38, 38, 0.18)',
    isEventSlide = false,
    isHappyHourSlide = false,
    isDrinkSlide = false,
    isFoodSlide = false,
    isCustomSlide = false,
    isWelcomeSlide: isWelcomeSlideFromProps = false,
    showLabel = false,
    gridColumns = 'default',
    itemCount = 0,
    isDenseEvents = false,
    eventColumnCount = undefined,
    eventRowCount = undefined,
    eventRowMin = undefined,
    backgroundImageUrl = null,
  } = currentSlideProps || {};
  
  // Use the prop value if available, otherwise check the slide directly
  const isWelcomeSlideFinal = isWelcomeSlideFromProps ?? isWelcomeSlide;
  
  // Use isWelcomeSlideFinal throughout the component
  const isWelcomeSlideToUse = isWelcomeSlideFinal;
  
  const pageTextureUrl = '/pics/monaghans-patio.jpg';
  
  // Calculate transform for carousel container - moves horizontally to show current slide
  const getCarouselTransform = () => {
    return `translateX(-${index * 100}%)`;
  };
  
  // Simple CSS transition duration
  const TRANSITION_DURATION = `${slideTransitionDuration}ms`;
  
  // Preload images for next and previous slides to prevent fade-in
  useEffect(() => {
    const preloadImages = () => {
      const nextIndex = (index + 1) % safeSlides.length;
      const prevIndex = (index - 1 + safeSlides.length) % safeSlides.length;
      
      [nextIndex, prevIndex].forEach((slideIdx) => {
        const slide = safeSlides[slideIdx];
        if (!slide) return;
        
        // Preload main asset image if it exists
        if (slide.asset?.storageKey) {
          const img = new Image();
          img.src = slide.asset.storageKey;
        }
        
        // Preload item images
        if (slide.items) {
          slide.items.forEach((item) => {
            if (item.image) {
              const img = new Image();
              img.src = item.image;
            }
          });
        }
      });
    };
    
    preloadImages();
  }, [index, safeSlides]);

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#050608] text-white"
      onMouseMove={revealControls}
      style={{}}
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
          background: `radial-gradient(circle at 20% 20%, ${accentSurfaceStrong || 'rgba(220, 38, 38, 0.18)'}, transparent 40%), radial-gradient(circle at 80% 30%, ${accentSurfaceColor || 'rgba(220, 38, 38, 0.1)'}, transparent 38%), linear-gradient(135deg, #0b0c10, #050608)`,
          filter: 'saturate(1.1)',
        }}
      />

      {debug && (
        <div className="absolute left-6 top-6 z-30 rounded-xl bg-black/90 px-4 py-3 text-xs text-white shadow-lg max-w-md overflow-auto max-h-[80vh]">
          <p className="font-semibold text-base mb-2">Debug Info</p>
          <div className="space-y-1 text-white/90">
            <p><span className="font-semibold">Slide:</span> {index + 1} / {safeSlides.length}</p>
            <p><span className="font-semibold">Source:</span> {currentSlide?.source || 'unknown'}</p>
            <p><span className="font-semibold">ID:</span> {currentSlide?.id || 'none'}</p>
            <p><span className="font-semibold">Label:</span> {currentSlide?.label || 'none'}</p>
            <p><span className="font-semibold">Title:</span> {currentSlide?.title || 'none'}</p>
            <p><span className="font-semibold">Has Items:</span> {currentSlide?.items?.length || 0}</p>
            <p><span className="font-semibold">Has Asset:</span> {currentSlide?.asset?.storageKey ? 'yes' : 'no'}</p>
            <p><span className="font-semibold">Is Ad:</span> {currentSlide?.isAd ? 'yes' : 'no'}</p>
            <p><span className="font-semibold">Is Content:</span> {currentSlide?.isContentSlide ? 'yes' : 'no'}</p>
            <p><span className="font-semibold">Duration:</span> {Math.round(slideDurationMs / 1000)}s</p>
            <p><span className="font-semibold">Transition:</span> {slideTransitionDuration}ms</p>
            <p><span className="font-semibold">Paused:</span> {isPaused ? 'yes' : 'no'}</p>
            <p><span className="font-semibold">Failed Images:</span> {failedImages.size}</p>
          </div>
          {Object.keys(debugInfo).length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="font-semibold mb-1">Renderer Info:</p>
              <pre className="text-xs bg-black/50 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Carousel container - holds all slides horizontally */}
      <div 
        className="absolute inset-0 overflow-hidden" 
      >
        {/* Horizontal carousel wrapper - translates to show current slide */}
        <div
          ref={carouselRef}
          className="flex h-full"
          style={{ 
            width: `${safeSlides.length * 100}vw`,
            transform: shouldResetPosition ? 'translateX(0)' : `translateX(-${index * 100}vw)`,
            transition: (isTransitioning && !shouldResetPosition) ? `transform ${TRANSITION_DURATION} cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Render all slides side-by-side */}
          {safeSlides.map((slideToRender, slideIdx) => {
            // Get slide props for this slide
            const slideProps = (() => {
              const isAdSlide = slideToRender?.isAd === true;
              const isImageCustomSlide = Boolean(
                slideToRender?.source === 'custom' && 
                slideToRender?.asset && 
                slideToRender.asset.storageKey &&
                typeof slideToRender.asset.storageKey === 'string' &&
                slideToRender.asset.storageKey.trim() !== ''
              );
              return (isAdSlide || isImageCustomSlide) ? null : getSlideProps(slideToRender);
            })();
            
            const {
              accentColor: slideAccentColor = '#dc2626',
              accentGlowColor: slideAccentGlowColor = 'rgba(220, 38, 38, 0.55)',
              accentSurfaceColor: slideAccentSurfaceColor = 'rgba(220, 38, 38, 0.1)',
              accentSurfaceStrong: slideAccentSurfaceStrong = 'rgba(220, 38, 38, 0.18)',
              isEventSlide: slideIsEventSlide = false,
              isHappyHourSlide: slideIsHappyHourSlide = false,
              isDrinkSlide: slideIsDrinkSlide = false,
              isFoodSlide: slideIsFoodSlide = false,
              isCustomSlide: slideIsCustomSlide = false,
              isWelcomeSlide: slideIsWelcomeSlide = false,
              showLabel: slideShowLabel = false,
              gridColumns: slideGridColumns = 'default',
              itemCount: slideItemCount = 0,
              isDenseEvents: slideIsDenseEvents = false,
              eventColumnCount: slideEventColumnCount = undefined,
              eventRowCount: slideEventRowCount = undefined,
              eventRowMin: slideEventRowMin = undefined,
              backgroundImageUrl: slideBackgroundImageUrl = null,
            } = slideProps || {};
            
            return (
              <div
                key={`slide-${slideIdx}`}
                className="flex-shrink-0 h-full flex items-center justify-center"
                style={{
                  width: '100vw',
                  minWidth: '100vw',
                  maxWidth: '100vw',
                }}
              >
                {/* Render single slide content */}
                {(() => {
                  const slide = slideToRender;
                  const isAdSlide = slide?.isAd === true;
                  const isWelcomeSlide = slide?.source === 'welcome';
                  const isImageBasedSlide = (slide?.source === 'custom' || isWelcomeSlide) && (slide?.slideType === 'image' || (slide?.items && slide.items.some(item => item.image)));
                  const hasImageItems = isImageBasedSlide;
                  const isImageCustomSlide = Boolean(
                    slide?.source === 'custom' && 
                    slide?.asset && 
                    slide.asset.storageKey &&
                    typeof slide.asset.storageKey === 'string' &&
                    slide.asset.storageKey.trim() !== ''
                  );
                  const showBorderForImageSlide = isImageCustomSlide 
                    ? (slide?.showBorder === true)
                    : true;
                  
                  // Use slide-specific props
                  const accentColor = slideAccentColor;
                  const accentGlowColor = slideAccentGlowColor;
                  const accentSurfaceColor = slideAccentSurfaceColor;
                  const accentSurfaceStrong = slideAccentSurfaceStrong;
                  const isEventSlide = slideIsEventSlide;
                  const isHappyHourSlide = slideIsHappyHourSlide;
                  const isDrinkSlide = slideIsDrinkSlide;
                  const isFoodSlide = slideIsFoodSlide;
                  const isCustomSlide = slideIsCustomSlide;
                  const isWelcomeSlideToUse = slideIsWelcomeSlide;
                  const showLabel = slideShowLabel;
                  const gridColumns = slideGridColumns;
                  const itemCount = slideItemCount;
                  const isDenseEvents = slideIsDenseEvents;
                  const eventColumnCount = slideEventColumnCount;
                  const eventRowCount = slideEventRowCount;
                  const eventRowMin = slideEventRowMin;
                  const backgroundImageUrl = slideBackgroundImageUrl;
                  
                  // Debug logging for current slide
                  if (debug && slideIdx === index) {
                    console.log('[SignageRotator] Rendering current slide:', {
                      slideIdx,
                      index,
                      slideId: slide?.id,
                      slideSource: slide?.source,
                      slideLabel: slide?.label,
                      slideTitle: slide?.title,
                      hasItems: !!slide?.items && slide.items.length > 0,
                      itemCount: slide?.items?.length || 0,
                      hasAsset: !!slide?.asset?.storageKey,
                      assetStorageKey: slide?.asset?.storageKey,
                      slideProps: {
                        isHappyHourSlide: slideIsHappyHourSlide,
                        isDrinkSlide: slideIsDrinkSlide,
                        isFoodSlide: slideIsFoodSlide,
                        isEventSlide: slideIsEventSlide,
                        isCustomSlide: slideIsCustomSlide,
                        isWelcomeSlide: slideIsWelcomeSlide,
                        backgroundImageUrl: slideBackgroundImageUrl,
                      },
                    });
                  }

                  return (
                    <SlideContentRenderer
                      slide={slide}
                      slideProps={{
                        accentColor: slideAccentColor,
                        accentGlowColor: slideAccentGlowColor,
                        accentSurfaceColor: slideAccentSurfaceColor,
                        accentSurfaceStrong: slideAccentSurfaceStrong,
                        isEventSlide: slideIsEventSlide,
                        isHappyHourSlide: slideIsHappyHourSlide,
                        isDrinkSlide: slideIsDrinkSlide,
                        isFoodSlide: slideIsFoodSlide,
                        isCustomSlide: slideIsCustomSlide,
                        isWelcomeSlide: slideIsWelcomeSlide,
                        showLabel: Boolean(slideShowLabel),
                        gridColumns: String(slideGridColumns),
                        itemCount: slideItemCount,
                        isDenseEvents: slideIsDenseEvents,
                        eventColumnCount: slideEventColumnCount,
                        eventRowCount: slideEventRowCount,
                        eventRowMin: slideEventRowMin,
                        backgroundImageUrl: slideBackgroundImageUrl,
                      }}
                      debug={debug}
                      failedImages={failedImages}
                      setFailedImages={setFailedImages}
                      TRANSITION_DURATION={slideTransitionDuration}
                      onDebugInfo={slideIdx === index ? setDebugInfo : undefined}
                    />
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* AdZone for embedded ads (only show on non-ad, non-content slides when ads are enabled) */}
      {adsEnabled && !isAdSlide && !currentSlide.isContentSlide && embeddedAds.length > 0 && (
        <AdZone
          placement="embedded-middle"
          ads={embeddedAds}
          enabled={adsEnabled}
        />
      )}

      {safeSlides.length > 1 && !isWelcomeSlideToUse && (
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
                className={`h-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black ${isActive ? 'w-14 bg-[var(--accent)] shadow-[0_0_0_1px_rgba(255,255,255,0.3)]' : 'w-10 bg-white/25'}`}
                style={{
                  transition: `width 400ms ease-in-out, background-color 400ms ease-in-out, box-shadow 400ms ease-in-out`,
                  willChange: 'width, background-color, box-shadow',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                }}
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
          className={`absolute right-6 top-6 z-30 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur pointer-events-auto`}
          style={{ 
            opacity: showControls ? 1 : 0,
            transition: `opacity 300ms ease-in-out, transform 300ms ease-in-out`,
            willChange: 'opacity, transform',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            pointerEvents: showControls ? 'auto' : 'none',
          }}
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
            className={`group absolute left-6 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/20 bg-black/30 px-5 py-4 text-xl font-semibold text-white shadow-lg backdrop-blur pointer-events-auto`}
            style={{ 
              opacity: showControls ? 1 : 0,
              transition: `opacity 300ms ease-in-out, transform 300ms ease-in-out`,
              willChange: 'opacity, transform',
              transform: 'translateY(-50%) translateZ(0)',
              WebkitTransform: 'translateY(-50%) translateZ(0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              pointerEvents: showControls ? 'auto' : 'none',
            }}
          >
            ‹
          </button>
          <button
            aria-label="Next slide"
            onClick={() => {
              revealControls();
              goToNext();
            }}
            className={`group absolute right-6 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/20 bg-black/30 px-5 py-4 text-xl font-semibold text-white shadow-lg backdrop-blur pointer-events-auto`}
            style={{ 
              opacity: showControls ? 1 : 0,
              transition: `opacity 300ms ease-in-out, transform 300ms ease-in-out`,
              willChange: 'opacity, transform',
              transform: 'translateY(-50%) translateZ(0)',
              WebkitTransform: 'translateY(-50%) translateZ(0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              pointerEvents: showControls ? 'auto' : 'none',
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

