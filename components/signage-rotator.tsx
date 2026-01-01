'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import ReactMarkdown from 'react-markdown';
import { SlideContent } from '@/app/specials-tv/types';
import AdZone, { AdCreative } from './ad-zone';

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

  // Smooth easing functions for professional transitions
  // Ease-in-out cubic bezier for smooth, natural fades
  const easeInOutCubic = (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Ease-out for smoother fade-out (current slide)
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Ease-in for smoother fade-in (next slide)
  const easeInCubic = (t: number): number => {
    return t * t * t;
  };

  // Combined smooth fade function - uses ease-in-out for balanced transitions
  const smoothFade = (t: number): number => {
    // Apply ease-in-out cubic for the most natural feel
    return easeInOutCubic(t);
  };

  useEffect(() => {
    setIndex(0);
    setNextIndex(null);
    setFadeProgress(0);
    // Reset failed images when slides change
    setFailedImages(new Set());
  }, [safeSlides.length]);

  // Cross-fade animation with smooth easing
  useEffect(() => {
    if (fadeStartTime.current === null) return;

    const animate = (currentTime: number) => {
      if (fadeStartTime.current === null) return;
      
      const elapsed = currentTime - fadeStartTime.current;
      const rawProgress = Math.min(elapsed / clampedFadeDuration, 1);
      
      // Apply smooth easing function for professional fade
      const easedProgress = smoothFade(rawProgress);
      
      setFadeProgress(easedProgress);

      if (rawProgress < 1) {
        fadeAnimationFrame.current = requestAnimationFrame(animate);
      } else {
        // Transition complete - ensure we're at exactly 1.0
        setFadeProgress(1);
        // Use requestAnimationFrame to ensure smooth final state update
        requestAnimationFrame(() => {
          setIndex(nextIndex!);
          setNextIndex(null);
          setFadeProgress(0);
          fadeStartTime.current = null;
        });
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
  const nextSlide = nextIndex !== null ? safeSlides[nextIndex] : null;
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
  const nextSlideProps = nextSlide && !nextSlide.isAd && !(nextSlide.source === 'custom' && nextSlide.asset && nextSlide.asset.storageKey && typeof nextSlide.asset.storageKey === 'string' && nextSlide.asset.storageKey.trim() !== '') ? getSlideProps(nextSlide) : null;
  
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
  
  // Calculate opacities for cross-fade with smooth transitions
  // Use a small threshold to ensure elements are fully hidden when opacity is very low
  const OPACITY_THRESHOLD = 0.01;
  
  // Apply separate easing for fade-out (current) and fade-in (next) for smoother transitions
  const currentOpacity = nextIndex !== null 
    ? Math.max(0, Math.min(1, 1 - fadeProgress)) 
    : 1;
  const nextOpacity = nextIndex !== null 
    ? Math.max(0, Math.min(1, fadeProgress)) 
    : 0;
  
  // Smooth visibility transitions with threshold
  const currentVisible = currentOpacity > OPACITY_THRESHOLD;
  const nextVisible = nextOpacity > OPACITY_THRESHOLD;
  
  // CSS transition timing function for smooth hardware-accelerated transitions
  const TRANSITION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'; // Material Design standard easing
  const TRANSITION_DURATION = `${clampedFadeDuration}ms`;

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#050608] text-white"
      onMouseMove={revealControls}
      style={{
        // Ensure smooth transitions for the entire container
        willChange: nextIndex !== null ? 'contents' : 'auto',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(5, 6, 8, 0.82), rgba(5, 6, 8, 0.92)), url(${pageTextureUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(10px) saturate(1.05)',
          transform: 'scale(1.04) translateZ(0)',
          WebkitTransform: 'scale(1.04) translateZ(0)',
          opacity: 0.65,
          willChange: 'opacity, transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transition: `opacity ${TRANSITION_DURATION} ${TRANSITION_EASING}`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${accentSurfaceStrong || 'rgba(220, 38, 38, 0.18)'}, transparent 40%), radial-gradient(circle at 80% 30%, ${accentSurfaceColor || 'rgba(220, 38, 38, 0.1)'}, transparent 38%), linear-gradient(135deg, #0b0c10, #050608)`,
          filter: 'saturate(1.1)',
          willChange: 'background, opacity',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          transition: `background ${TRANSITION_DURATION} ${TRANSITION_EASING}, opacity ${TRANSITION_DURATION} ${TRANSITION_EASING}`,
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
      <div 
        className="absolute inset-0 flex items-center justify-center" 
        style={{ 
          contain: 'layout style paint',
          willChange: nextIndex !== null ? 'contents' : 'auto',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      >
        {/* Current slide */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            opacity: currentOpacity,
            visibility: currentVisible ? 'visible' : 'hidden',
            transition: nextIndex === null 
              ? 'none' 
              : `opacity ${TRANSITION_DURATION} ${TRANSITION_EASING}, visibility ${TRANSITION_DURATION} ${TRANSITION_EASING}`,
            pointerEvents: currentOpacity > 0.5 ? 'auto' : 'none',
            willChange: nextIndex !== null ? 'opacity, transform' : 'auto',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden',
            WebkitTransform: 'translateZ(0)',
            isolation: 'isolate',
            contain: 'layout style paint',
            width: '100%',
            height: '100%',
            // Force hardware acceleration for smooth transitions
            perspective: '1000px',
            transformStyle: 'preserve-3d',
          }}
        >
        {/* Ad slide or CONTENT slide rendering (full-screen image) */}
        {(() => {
          const asset = currentSlide?.asset;
          const hasImageAsset = Boolean(
            asset && 
            asset.storageKey && 
            typeof asset.storageKey === 'string' &&
            asset.storageKey.trim() !== ''
          );
          const shouldRenderImage = Boolean(
            hasImageAsset && 
            (isAdSlide || currentSlide?.isContentSlide === true || isImageCustomSlide)
          );
          if (currentSlide?.source === 'custom' && debug) {
            console.log('Custom slide image check:', {
              shouldRenderImage,
              isAdSlide: Boolean(isAdSlide),
              isContentSlide: Boolean(currentSlide?.isContentSlide),
              isImageCustomSlide: Boolean(isImageCustomSlide),
              hasAsset: !!asset,
              storageKey: asset?.storageKey || 'NO STORAGE KEY',
              slideId: currentSlide.id,
            });
          }
          return shouldRenderImage;
        })() ? (
          <div 
            className="relative w-full h-full flex items-center justify-center bg-black" 
            style={(() => {
              if (isImageCustomSlide && showBorderForImageSlide) {
                // Get accent color for border
                const slideAccent = currentSlide.accent || 'accent';
                const colorMap: Record<string, string> = {
                  accent: '#dc2626',
                  gold: '#eab308',
                  blue: '#3b82f6',
                  green: '#228B22',
                  purple: '#a855f7',
                  orange: '#f97316',
                  teal: '#14b8a6',
                  pink: '#ec4899',
                  cyan: '#06b6d4',
                };
                const borderColor = colorMap[slideAccent] || colorMap.accent;
                // Convert hex to rgba for glow
                const hexToRgba = (hex: string, alpha: number) => {
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                };
                return {
                  boxSizing: 'border-box' as const,
                  contain: 'layout style paint' as const,
                  padding: '32px',
                  borderRadius: '40px',
                  border: `16px solid ${borderColor}`,
                  boxShadow: `
                    inset 0 0 100px ${hexToRgba(borderColor, 0.5)},
                    inset 0 0 60px ${hexToRgba(borderColor, 0.4)},
                    inset 0 0 30px ${hexToRgba(borderColor, 0.6)},
                    inset 0 0 15px ${hexToRgba(borderColor, 0.8)},
                    0 0 80px ${hexToRgba(borderColor, 0.7)},
                    0 0 150px ${hexToRgba(borderColor, 0.5)},
                    0 0 220px ${hexToRgba(borderColor, 0.3)},
                    0 0 300px ${hexToRgba(borderColor, 0.15)},
                    0 20px 80px rgba(0, 0, 0, 0.8),
                    inset 0 4px 8px rgba(255, 255, 255, 0.2),
                    inset 0 -4px 8px rgba(0, 0, 0, 0.3)
                  `,
                };
              }
              return {
                boxSizing: 'border-box' as const,
                contain: 'layout style paint' as const,
              };
            })()}
          >
            <img
              src={currentSlide.asset!.storageKey}
              alt={isAdSlide ? 'Advertisement' : currentSlide.title || 'Content'}
              className="object-contain"
              style={{
                width: (isImageCustomSlide && !showBorderForImageSlide) ? '100%' : 'calc(100% - 64px)',
                height: (isImageCustomSlide && !showBorderForImageSlide) ? '100%' : 'calc(100% - 64px)',
                maxWidth: (isImageCustomSlide && !showBorderForImageSlide) ? '100%' : 'calc(100% - 64px)',
                maxHeight: (isImageCustomSlide && !showBorderForImageSlide) ? '100%' : 'calc(100% - 64px)',
                willChange: 'opacity, transform',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
                transition: `opacity ${TRANSITION_DURATION} ${TRANSITION_EASING}`,
              }}
              onError={(e) => {
                console.error('Failed to load image:', {
                  storageKey: currentSlide.asset?.storageKey,
                  slide: currentSlide,
                  isAdSlide,
                  isContentSlide: currentSlide.isContentSlide,
                  isImageCustomSlide,
                });
                // Fallback: hide the broken image
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              onLoad={(e) => {
                console.log('Image loaded successfully:', currentSlide.asset?.storageKey);
                // Smooth fade-in on load with hardware acceleration
                const img = e.target as HTMLImageElement;
                img.style.opacity = '0';
                requestAnimationFrame(() => {
                  img.style.transition = `opacity 600ms ${TRANSITION_EASING}`;
                  requestAnimationFrame(() => {
                    img.style.opacity = '1';
                  });
                });
              }}
            />
            {/* Display title and footer for welcome slides and content slides (not ads, not image-based custom slides) */}
            {((currentSlide.isContentSlide || isWelcomeSlideToUse) && !isAdSlide && !isImageCustomSlide) && (
              <>
                {currentSlide.title && (
                  <div className="absolute top-8 left-8 right-8 z-10">
                    <h2
                      className="font-extrabold leading-tight text-center"
                      style={{
                        fontSize: 'clamp(118px, 23.52vw, 281px)',
                        color: 'rgba(255, 255, 255, 1)',
                        textShadow: '0 0 30px rgba(0, 0, 0, 0.8), 0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)',
                      }}
                    >
                      {currentSlide.title}
                    </h2>
                  </div>
                )}
                {currentSlide.subtitle && isWelcomeSlideToUse && (
                  <div className="absolute top-[20%] left-8 right-8 z-10">
                    <p
                      className="font-bold leading-tight text-center"
                      style={{
                        fontSize: 'clamp(70px, 11.76vw, 140px)',
                        color: 'rgba(255, 255, 255, 0.95)',
                        textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)',
                      }}
                    >
                      {currentSlide.subtitle}
                    </p>
                  </div>
                )}
                {currentSlide.body && isWelcomeSlideToUse && (
                  <div className="absolute top-[35%] left-8 right-8 z-10">
                    <p
                      className="font-semibold leading-relaxed text-center whitespace-pre-line"
                      style={{
                        fontSize: 'clamp(59px, 9.41vw, 118px)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)',
                      }}
                    >
                      {currentSlide.body}
                    </p>
                  </div>
                )}
                {currentSlide.footer && (() => {
                  // Get accent color for image-based custom slides
                  const slideAccent = currentSlide.accent || 'accent';
                  const colorMap: Record<string, { var: string }> = {
                    accent: { var: '#dc2626' },
                    gold: { var: '#eab308' },
                    blue: { var: '#3b82f6' },
                    green: { var: '#228B22' }, // Traditional Irish bar green
                    purple: { var: '#a855f7' },
                    orange: { var: '#f97316' },
                    teal: { var: '#14b8a6' },
                    pink: { var: '#ec4899' },
                    cyan: { var: '#06b6d4' },
                  };
                  const footerColor = colorMap[slideAccent]?.var || colorMap.accent.var;
                  return (
                    <div className="absolute bottom-8 left-8 right-8 z-10">
                      <p
                        className="font-semibold leading-tight text-center"
                        style={{
                          fontSize: 'clamp(70px, 11.76vw, 140px)',
                          color: footerColor,
                          textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)',
                        }}
                      >
                        {currentSlide.footer}
                      </p>
                    </div>
                  );
                })()}
              </>
            )}
            {isAdSlide && currentSlide.adCreative?.destinationUrl && (
              <a
                href={currentSlide.adCreative.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0"
                aria-label="Visit advertiser website"
              />
            )}
            {isAdSlide && currentSlide.adCreative?.qrEnabled && currentSlide.adCreative?.destinationUrl && (
              <div className="absolute bottom-4 right-4 bg-white p-2 rounded">
                <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                  QR
                </div>
              </div>
            )}
          </div>
        ) : (isHappyHourSlide || (isDrinkSlide && backgroundImageUrl)) ? (
          // Special creative layout for Happy Hour slide
          <div 
            className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[48px] border border-white/10 p-8 md:p-12 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-lg"
            style={{
              backgroundImage: backgroundImageUrl ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url(${backgroundImageUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              boxSizing: 'border-box',
              contain: 'layout style paint',
            }}
          >
            <div 
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.05), transparent 70%)',
              }}
            />
            
            {/* Two-column layout - centered when only one column, side-by-side when both */}
            <div className={`relative z-10 flex flex-row items-stretch justify-center w-full gap-8 md:gap-12 px-6 py-6 md:py-8 ${slide.footer ? 'pb-32 md:pb-40' : ''} ${(!isHappyHourSlide || !slide.items || slide.items.length === 0) && (isDrinkSlide && !isHappyHourSlide && slide.items && slide.items.length > 0) ? 'justify-center' : ''}`} style={slide.footer ? { height: 'calc(100% - 200px)' } : { height: '100%' }}>
              {/* Left Column: Happy Hour */}
              {isHappyHourSlide && (slide.subtitle || slide.title || slide.body) && (
                <div className={`flex flex-col items-center text-center min-w-0 ${slide.items && slide.items.length > 0 ? 'flex-1 max-w-[42%]' : 'max-w-[55%]'}`}>
                  {/* Subtle header */}
                  {showLabel && (
                    <div className="mb-6 md:mb-8 flex-shrink-0">
                      <div
                        className="inline-block rounded-full px-6 py-3 md:px-8 md:py-4 font-bold uppercase tracking-wider text-white shadow-lg"
                        style={{ 
                          backgroundColor: `${accentColor}70`, 
                          border: `3px solid ${accentColor}`,
                          fontSize: 'clamp(38px, 6.5vw, 60px)',
                          boxShadow: `0 0 20px ${accentGlowColor}, 0 8px 24px rgba(0,0,0,0.4), inset 0 0 10px ${accentColor}40`
                        }}
                      >
                        {slide.label}
                      </div>
                    </div>
                  )}

                  {/* Happy Hour Content Container */}
                  <div className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 md:p-6 shadow-lg w-full flex-1 flex flex-col justify-center" style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}`, height: slide.items && slide.items.length > 0 && isHappyHourSlide ? '85%' : '100%' }}>
                    <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                      {/* Times */}
                      {slide.subtitle && (
                        <div
                          className="font-bold uppercase tracking-[0.15em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                          style={{ fontSize: 'clamp(59px, 10.29vw, 118px)', marginBottom: '0.15em' }}
                        >
                          {slide.subtitle}
                        </div>
                      )}

                      {/* Main title */}
                      {slide.title && (
                        <h1
                          className="text-balance font-black leading-[0.92] tracking-tight drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                          style={{ fontSize: 'clamp(118px, 20.58vw, 235px)', marginTop: slide.subtitle ? '0.1em' : '0', marginBottom: slide.body ? '0.15em' : '0' }}
                        >
                          {slide.title}
                        </h1>
                      )}

                      {/* Description/Body */}
                      {slide.body && (
                        <p
                          className="w-full font-semibold leading-[1.2] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                          style={{ fontSize: 'clamp(59px, 11.76vw, 118px)', marginTop: '0.1em' }}
                        >
                          {slide.body}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical Divider - only show when both happy hour and drink specials */}
              {isHappyHourSlide && slide.items && slide.items.length > 0 && (slide.subtitle || slide.title || slide.body) && (
                <div className="flex flex-col items-center justify-center w-px relative">
                  <div 
                    className="absolute inset-0 w-px bg-gradient-to-b from-transparent via-white/30 to-transparent"
                    style={{
                      boxShadow: `0 0 20px ${accentGlowColor}40, 0 0 40px ${accentGlowColor}20`,
                    }}
                  />
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: accentColor,
                      boxShadow: `0 0 20px ${accentGlowColor}, 0 0 40px ${accentGlowColor}60`,
                    }}
                  />
                </div>
              )}

              {/* Right Column: Drink Specials OR Drink-only centered */}
              {slide.items && slide.items.length > 0 && (
                <div className={`flex flex-col items-center text-center min-w-0 ${isHappyHourSlide && (slide.subtitle || slide.title || slide.body) ? 'flex-1 max-w-[42%]' : 'max-w-[55%]'}`}>
                  {/* Subtle header for drink specials */}
                  {isHappyHourSlide && (
                    <div className="mb-6 md:mb-8 flex-shrink-0">
                      <div
                        className="inline-block rounded-full px-6 py-3 md:px-8 md:py-4 font-bold uppercase tracking-wider text-white shadow-lg"
                        style={{ 
                          backgroundColor: `${accentColor}70`, 
                          border: `3px solid ${accentColor}`,
                          fontSize: 'clamp(38px, 6.5vw, 60px)',
                          boxShadow: `0 0 20px ${accentGlowColor}, 0 8px 24px rgba(0,0,0,0.4), inset 0 0 10px ${accentColor}40`
                        }}
                      >
                        Drink Specials
                      </div>
                    </div>
                  )}

                  {/* Drink-only slide header */}
                  {isDrinkSlide && !isHappyHourSlide && showLabel && (
                    <div className="mb-6 md:mb-8 flex-shrink-0">
                      <div
                        className="inline-block rounded-full px-6 py-3 md:px-8 md:py-4 font-bold uppercase tracking-wider text-white shadow-lg"
                        style={{ 
                          backgroundColor: `${accentColor}70`, 
                          border: `3px solid ${accentColor}`,
                          fontSize: 'clamp(38px, 6.5vw, 60px)',
                          boxShadow: `0 0 20px ${accentGlowColor}, 0 8px 24px rgba(0,0,0,0.4), inset 0 0 10px ${accentColor}40`
                        }}
                      >
                        {slide.label}
                      </div>
                    </div>
                  )}
                  
                  {/* Drink Special Items */}
                  <div className={`w-full flex-1 flex flex-col ${slide.footer ? 'min-h-0 overflow-hidden' : ''}`} style={{ height: slide.items && slide.items.length > 0 && isHappyHourSlide ? '85%' : '100%' }}>
                    {slide.items.map((item, itemIdx) => (
                      <div
                        key={`${slide.id}-item-${itemIdx}`}
                        className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 md:p-6 shadow-lg w-full h-full flex flex-col justify-center"
                        style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}` }}
                      >
                        <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                          {/* Title - matching happy hour title size */}
                          <h3
                            className="font-black leading-[0.92] tracking-tight text-white drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                            style={{ fontSize: 'clamp(118px, 20.58vw, 235px)', marginBottom: (item.note || item.time || item.detail) ? '0.1em' : '0' }}
                          >
                            {item.title}
                          </h3>
                          {/* Note/Price - matching happy hour body size */}
                          {item.note && (
                            <p
                              className="font-semibold leading-[1.2] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                              style={{ fontSize: 'clamp(59px, 11.76vw, 118px)', marginTop: '0.05em', marginBottom: (item.time || item.detail) ? '0.1em' : '0' }}
                            >
                              {item.note}
                            </p>
                          )}
                          {/* Time - matching happy hour subtitle size */}
                          {item.time && (
                            <p
                              className="font-bold uppercase tracking-[0.15em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                              style={{ fontSize: 'clamp(59px, 10.29vw, 118px)', marginTop: '0.05em', marginBottom: item.detail ? '0.1em' : '0' }}
                            >
                              {item.time}
                            </p>
                          )}
                          {/* Detail - matching happy hour body size */}
                          {item.detail && (
                            <div
                              className="mt-1 font-semibold leading-[1.2] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)] [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-2 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-2 [&_p]:mb-2"
                              style={{ fontSize: 'clamp(59px, 11.76vw, 118px)', marginTop: '0.1em' }}
                              dangerouslySetInnerHTML={{ __html: marked.parse(item.detail) }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - moved to bottom, much bigger */}
            {slide.footer && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                <div
                  className="font-semibold text-white/80 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                  style={{ fontSize: 'clamp(70px, 11.76vw, 140px)' }}
                >
                  {slide.footer}
                </div>
              </div>
            )}

            {/* Monaghan's branding in corner */}
            <span 
              className="absolute top-8 right-8 font-semibold text-white/70" 
              style={{ fontSize: 'clamp(42px, 7.35vw, 76px)' }}
            >
              Monaghan&apos;s
            </span>
          </div>
        ) : (
          // Standard layout for other slides
          <div 
            className={`relative z-10 flex flex-col bg-white/5 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-lg ${
              hasImageItems 
                ? (isWelcomeSlideToUse 
                  ? 'w-full h-full overflow-hidden' // Full screen, no rounded corners for welcome
                  : (isImageCustomSlide && !showBorderForImageSlide
                    ? 'w-full h-full overflow-hidden' // Full screen, no rounded corners for borderless image slides
                    : 'w-full h-full rounded-[32px] overflow-hidden')) // Full screen for image slides with rounded corners
                : 'h-full w-full overflow-hidden rounded-[48px]' // Full width for other slides
            }`}
            style={{
              padding: hasImageItems 
                ? (isWelcomeSlideToUse ? '0' : (isImageCustomSlide && !showBorderForImageSlide ? '0' : '12px')) // No padding for welcome or borderless image slides
                : (isCustomSlide ? '12px' : undefined),
              border: hasImageItems 
                ? (isWelcomeSlideToUse ? 'none' : (isImageCustomSlide && !showBorderForImageSlide ? 'none' : `12px solid ${accentColor}`)) // No border for welcome or borderless image slides
                : (isCustomSlide ? `8px solid ${accentColor}` : '1px solid rgba(255, 255, 255, 0.1)'),
              boxShadow: hasImageItems
                ? (isWelcomeSlideToUse 
                  ? 'none' // No shadow for welcome slide
                  : (isImageCustomSlide && !showBorderForImageSlide
                    ? 'none' // No shadow for borderless image slides
                    : `0 0 60px ${accentGlowColor}, 0 0 120px ${accentGlowColor}40, inset 0 0 0 12px ${accentColor}, inset 0 0 20px ${accentColor}20`))
                : (isCustomSlide 
                  ? `0 0 30px ${accentGlowColor}, 0 30px 120px -60px rgba(0,0,0,0.9)`
                  : '0 30px 120px -60px rgba(0,0,0,0.9)'),
              boxSizing: 'border-box',
              contain: 'layout style paint',
              // Add textured background for events slide
              ...(isEventSlide ? {
                backgroundImage: `linear-gradient(135deg, rgba(5, 6, 8, 0.75), rgba(5, 6, 8, 0.85)), url(${pageTextureUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              } : {})
            }}
          >
            {/* Additional texture overlay for events slide - blurred background layer */}
            {isEventSlide && (
              <>
                <div 
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{
                    backgroundImage: `url(${pageTextureUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(25px)',
                    opacity: 0.5,
                  }}
                />
                <div 
                  className="pointer-events-none absolute inset-0 z-0 opacity-25"
                  style={{
                    backgroundImage: `url(${pageTextureUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(12px) saturate(1.2)',
                    mixBlendMode: 'overlay',
                  }}
                />
              </>
            )}
            {!hasImageItems && (
              <div className="pointer-events-none absolute inset-x-10 top-0 z-0 h-40 bg-gradient-to-b from-white/10 via-white/0 to-transparent blur-2xl" />
            )}
            {!hasImageItems && (
              <header className={`relative flex-shrink-0 ${isCustomSlide ? 'mb-4 p-7 md:p-10' : ''} ${isFoodSlide ? 'grid grid-cols-2 gap-8 items-start px-8 pt-4 pb-2' : 'flex items-start justify-between gap-6 px-8 pt-8 pb-4'}`}>
                {/* Left column */}
                <div className={`flex flex-col ${isFoodSlide ? 'gap-2' : 'flex-wrap items-center gap-4'}`}>
                  {showLabel && (
                    <span
                      className={`rounded-full px-6 py-2.5 font-black uppercase tracking-wide text-black shadow-[0_16px_45px_-28px_rgba(0,0,0,0.65)] ${isFoodSlide ? 'self-start' : ''}`}
                      style={{ backgroundColor: accentColor, boxShadow: `0 0 0 2px ${accentColor}`, fontSize: 'clamp(64px, 11.76vw, 123px)' }}
                    >
                      {slide.label}
                    </span>
                  )}
                  {!isCustomSlide && !isEventSlide && slide.subtitle && (
                    <span
                      className={`font-semibold uppercase tracking-[0.12em] text-white/80 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)] ${isFoodSlide ? 'self-start' : ''}`}
                      style={{ fontSize: 'clamp(59px, 12.35vw, 129px)' }}
                    >
                      {slide.subtitle}
                    </span>
                  )}
                </div>
                {/* Right column */}
                <div className={`flex flex-col ${isFoodSlide ? 'items-end justify-start gap-3' : ''}`}>
                  <span className="font-semibold text-white/70" style={{ fontSize: 'clamp(64px, 11.76vw, 123px)' }}>
                    Monaghan&apos;s
                  </span>
                </div>
              </header>
            )}

            {!hasImageItems && (
              <main className={`flex min-h-0 flex-1 flex-col gap-6 md:gap-8 ${isCustomSlide ? 'px-7 md:px-10 justify-start pt-8 md:pt-12' : isFoodSlide ? 'px-8 mt-2 justify-center' : 'px-8 mt-4 md:mt-6 justify-center'}`}>
                {(slide.title || slide.body || slide.footer || (isCustomSlide && slide.subtitle)) && (
                  <div className={`flex flex-col ${isCustomSlide ? 'gap-8 md:gap-10 items-center text-center w-full max-w-[90vw] mx-auto' : 'gap-4 md:gap-5 w-full'}`}>
                    {isCustomSlide && slide.subtitle && (
                      <p
                        className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                        style={{ fontSize: 'clamp(41px, 7.35vw, 70px)' }}
                      >
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.title && (
                      <h1
                        className={`text-balance font-black leading-[0.95] tracking-tight drop-shadow-[0_18px_48px_rgba(0,0,0,0.45)] ${isCustomSlide ? 'text-center' : ''}`}
                        style={{ 
                          fontSize: 'clamp(123px, 23.52vw, 270px)',
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
                        className="w-full max-w-[85vw] font-semibold leading-[1.2] drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] mt-8 md:mt-12 mx-auto [&_*]:text-white [&_p]:text-[clamp(70px,13.23vw,140px)] [&_h1]:text-[clamp(83px,16.17vw,165px)]"
                        style={{ fontSize: 'clamp(70px, 13.23vw, 140px)' }}
                      >
                        <ReactMarkdown
                          components={{
                            ul: ({ children }) => (
                              <ul style={{ listStyle: 'none', paddingLeft: 0, margin: '1em 0' }}>
                                {children}
                              </ul>
                            ),
                            li: ({ children }) => (
                              <li style={{ marginBottom: '1.2em', paddingLeft: '1.8em', position: 'relative', listStyle: 'none', display: 'block', textAlign: 'left' }}>
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
                        className="w-full font-semibold leading-[1.08] text-white/90 drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] overflow-hidden"
                        style={{ 
                          fontSize: 'clamp(77px, 16.46vw, 158px)',
                          display: '-webkit-box', 
                          WebkitLineClamp: 3, 
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {slide.body}
                      </p>
                    )
                  )}
                  {/* Only show footer here if slide doesn't have items with images (footer will be on image instead) */}
                  {isCustomSlide && slide.footer && (!slide.items || slide.items.length === 0 || !slide.items.some(item => item.image)) && (
                    <p
                      className="w-full max-w-[85vw] font-semibold leading-[1.2] drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-center mt-6 md:mt-8 mx-auto"
                      style={{ 
                        fontSize: 'clamp(53px, 10.29vw, 94px)',
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
                if (debug && slide.source === 'custom') {
                  console.log('[Signage Rotator] Custom slide items:', {
                    slideId: slide.id,
                    itemCount: slide.items.length,
                    items: slide.items.map(item => ({
                      title: item.title,
                      hasImage: !!item.image,
                      imagePath: item.image,
                    })),
                  });
                }
              const itemsInLastRow = isEventSlide && eventColumnCount && eventRowCount && itemCount !== undefined
                ? itemCount - (eventRowCount - 1) * eventColumnCount
                : 0;
              const hasIncompleteLastRow = isEventSlide && itemsInLastRow > 0 && itemsInLastRow < (eventColumnCount || 0);
              const lastRowStartIdx = isEventSlide && eventColumnCount && eventRowCount && itemCount !== undefined
                ? (eventRowCount - 1) * eventColumnCount
                : (itemCount ?? 0);

              // For incomplete last row, use a multiplier grid so items fill evenly
              // e.g., 2 items in 3 columns: use 6 columns (3*2), each item spans 3
              const gridMultiplier = hasIncompleteLastRow && itemsInLastRow > 0 ? itemsInLastRow : 1;
              const effectiveColumnCount = isEventSlide && hasIncompleteLastRow
                ? (eventColumnCount || 0) * gridMultiplier
                : eventColumnCount;

              return (
                <div
                  className={`grid flex-1 ${isEventSlide ? 'gap-8 md:gap-12' : 'gap-5 md:gap-7'}`}
                  style={{
                    gridAutoRows: gridColumns === 'event' ? `minmax(${eventRowMin || 0}px, 1fr)` : 'minmax(250px, 1fr)',
                    gridTemplateColumns:
                      gridColumns === 'event'
                        ? `repeat(${effectiveColumnCount}, minmax(0, 1fr))`
                        : 'repeat(auto-fit, minmax(300px, 1fr))',
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
                    ? 'clamp(94px, 17.64vw, 176px)' 
                    : isDenseEvents 
                      ? 'clamp(77px, 14.11vw, 136px)' 
                      : 'clamp(83px, 15.88vw, 153px)';
                  const noteSize = isWiderTile
                    ? 'clamp(64px, 12.94vw, 106px)'
                    : isDenseEvents 
                      ? 'clamp(53px, 11.17vw, 77px)' 
                      : 'clamp(59px, 12.35vw, 88px)';
                  const timeSize = isWiderTile
                    ? 'clamp(59px, 12.35vw, 94px)'
                    : isDenseEvents 
                      ? 'clamp(53px, 11.17vw, 77px)' 
                      : 'clamp(59px, 11.76vw, 83px)';
                  const detailSize = isWiderTile
                    ? 'clamp(59px, 12.35vw, 99px)'
                    : isDenseEvents 
                      ? 'clamp(53px, 11.17vw, 77px)' 
                      : 'clamp(59px, 12.94vw, 88px)';
                  const noteMargin = isWiderTile ? 'mt-3' : 'mt-2.5';
                  const detailMargin = isWiderTile ? 'mt-4' : 'mt-3.5';

                  return isEventSlide ? (
                    <div
                      key={`${slide.id}-${itemIdx}`}
                      className={`relative flex flex-col h-full overflow-hidden rounded-3xl border border-white/14 ${padding} shadow-[0_18px_70px_-48px_rgba(0,0,0,0.85)]`}
                      style={{ 
                        boxShadow: `0 10px 40px -32px ${accentGlowColor}`, // Softer, more subtle glow for welcoming feel
                        gridColumn: gridColumnStyle,
                      }}
                    >
                      {/* Solid background layer */}
                      <div className="absolute inset-0 bg-black/70 rounded-3xl"></div>
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/70 to-black/70 backdrop-blur-md rounded-3xl"></div>
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background: `radial-gradient(circle at 18% 20%, ${accentSurfaceColor}, transparent 40%), radial-gradient(circle at 82% 8%, ${accentSurfaceColor}, transparent 34%)`,
                          opacity: '0.2', // Reduced opacity for overlay since base is now more opaque
                          transition: `opacity ${TRANSITION_DURATION} ${TRANSITION_EASING}, background ${TRANSITION_DURATION} ${TRANSITION_EASING}`,
                          willChange: 'opacity, background',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'translateZ(0)',
                          WebkitTransform: 'translateZ(0)',
                        }}
                      />
                      {/* Content centered and reordered: Title -> Time -> Date -> Description */}
                      <div className="relative flex-1 flex flex-col items-center justify-center text-center min-h-0 gap-4 md:gap-5 w-full px-2">
                        {/* Title first - bright white */}
                        <p
                          className="font-extrabold leading-[1.15] text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] break-words w-full"
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
                            className="font-semibold leading-[1.3] break-words w-full"
                            style={{ 
                              fontSize: isWiderTile ? 'clamp(53px, 10.58vw, 83px)' : isDenseEvents ? 'clamp(48px, 9.41vw, 70px)' : 'clamp(50px, 10vw, 77px)',
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
                            className="font-bold leading-[1.25] break-words w-full"
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
                            className="relative overflow-hidden leading-[1.4] text-white/85 break-words w-full [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-2 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-2 [&_p]:mb-2"
                            style={{ 
                              fontSize: detailSize,
                            }}
                            dangerouslySetInnerHTML={{ __html: marked.parse(item.detail) }}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`${slide.id}-${itemIdx}`}
                      className={`relative flex flex-col overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-white/10 via-white/0 to-black/40 shadow-[0_18px_70px_-48px_rgba(0,0,0,0.85)] backdrop-blur-md ${isFoodSlide ? 'p-8 md:p-10' : 'p-6 md:p-8'}`}
                      style={{ boxShadow: `0 18px 70px -48px ${accentGlowColor}` }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-80"
                        style={{
                          background: `radial-gradient(circle at 20% 20%, ${accentSurfaceColor}, transparent 38%), radial-gradient(circle at 80% 0%, ${accentSurfaceColor}, transparent 36%)`,
                        }}
                      />
                      {(() => {
                        const hasImage = Boolean(item.image);
                        const notFailed = !failedImages.has(item.image || '');
                        if (debug && hasImage) {
                          console.log('[Signage Rotator] Item image check:', {
                            hasImage,
                            notFailed,
                            imagePath: item.image,
                            failedImages: Array.from(failedImages),
                          });
                        }
                        return hasImage && notFailed;
                      })() ? (
                        // Layout with image: two-column horizontal layout for food specials
                        isFoodSlide ? (
                          <div className="relative flex flex-row h-full w-full gap-8 md:gap-10">
                            {/* Left column: Text content */}
                            <div className="relative flex-1 flex flex-col justify-center min-w-0 pr-2">
                              <div className="flex flex-col items-center text-center gap-5 md:gap-6">
                                {/* Title */}
                                {item.title && item.title.trim() && item.title.trim() !== slide.title?.trim() && (
                                  <h3
                                    className="font-extrabold leading-[1.08]"
                                    style={{ 
                                      fontSize: 'clamp(118px, 22.05vw, 252px)',
                                      color: 'rgba(255, 255, 255, 1)',
                                      textShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 6px 18px rgba(0,0,0,0.6)',
                                      marginBottom: (item.note || item.detail) ? '0.15em' : '0',
                                    }}
                                  >
                                    {item.title}
                                  </h3>
                                )}
                                {/* Time badge - hidden for food specials (always all day) */}
                                {item.time && !isFoodSlide && (
                                  <span
                                    className="relative rounded-full border bg-white/10 px-6 py-3 md:px-8 md:py-4 font-bold tracking-tight shadow-lg"
                                    style={{
                                      fontSize: 'clamp(50px, 9.45vw, 84px)',
                                      color: accentColor,
                                      borderColor: accentColor,
                                      boxShadow: `0 0 0 2px ${accentColor}, 0 12px 36px -18px ${accentGlowColor}`,
                                    }}
                                  >
                                    {item.time}
                                  </span>
                                )}
                                {/* Note/Price */}
                                {item.note && (
                                  <p
                                    className="font-semibold leading-[1.25]"
                                    style={{ 
                                      fontSize: 'clamp(83px, 16.17vw, 140px)',
                                      color: 'rgba(251, 191, 36, 0.95)',
                                      textShadow: '0 3px 12px rgba(251, 191, 36, 0.5)',
                                      marginTop: item.title ? '0.1em' : '0',
                                      marginBottom: item.detail ? '0.15em' : '0',
                                    }}
                                  >
                                    {item.note}
                                  </p>
                                )}
                                {/* Detail/Description */}
                                {item.detail && (
                                  <p
                                    className="font-semibold leading-[1.4]"
                                    style={{ 
                                      fontSize: 'clamp(70px, 13.23vw, 118px)',
                                      color: 'rgba(147, 197, 253, 0.9)',
                                      textShadow: '0 2px 8px rgba(147, 197, 253, 0.3)',
                                      marginTop: (item.title || item.note) ? '0.1em' : '0',
                                    }}
                                  >
                                    {item.detail}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Right column: Image */}
                            <div className="relative flex-shrink-0 w-[45%] h-full">
                              <div className="relative w-full h-full overflow-hidden rounded-3xl border-2 border-white/30 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.95)]">
                                <img
                                  src={item.image}
                                  alt={item.title || 'Image'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('[Signage Rotator] Image failed to load:', item.image, e);
                                    setFailedImages((prev) => new Set(prev).add(item.image!));
                                  }}
                                  onLoad={() => {
                                    if (debug) {
                                      console.log('[Signage Rotator] Image loaded successfully:', item.image);
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
                                <div className="absolute inset-0 ring-2 ring-white/20 pointer-events-none rounded-3xl" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Layout with image: full-screen optimized for 4K and 1080p (non-food slides)
                          // For custom slides with images, use full-screen layout
                          <div className={`relative flex flex-col items-center ${isCustomSlide ? 'justify-start w-full' : 'justify-center h-full w-full'} ${isCustomSlide ? 'gap-1 md:gap-2' : 'gap-3 md:gap-4 2xl:gap-6'}`}>
                            {/* Text section - minimal for custom slides with images */}
                            {!isCustomSlide && (
                            <div className="relative flex-none 2xl:flex-1 flex flex-col min-w-0 2xl:justify-center pr-0 2xl:pr-2 text-center 2xl:text-left w-full 2xl:w-auto">
                              <div className="flex items-center 2xl:items-start justify-center 2xl:justify-start gap-3 mb-1 2xl:mb-4 flex-wrap px-2 2xl:px-0">
                                {/* Only show item title if it's not empty/whitespace and doesn't match slide title */}
                                {item.title && item.title.trim() && item.title.trim() !== slide.title?.trim() && (
                                  <p
                                    className="font-extrabold leading-[1.1] flex-1"
                                    style={{ 
                                      fontSize: 'clamp(94px, 17.64vw, 211px)',
                                      color: 'rgba(255, 255, 255, 1)',
                                      textShadow: '0 6px 18px rgba(0,0,0,0.6)',
                                    }}
                                  >
                                    {item.title}
                                  </p>
                                )}
                                {item.time && !isFoodSlide && (
                                  <span
                                    className="relative shrink-0 rounded-full border bg-white/10 px-4 py-2 md:px-5 md:py-2.5 font-bold tracking-tight shadow-lg"
                                    style={{
                                      fontSize: 'clamp(74px, 14.41vw, 116px)',
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
                                    fontSize: 'clamp(90px, 18.52vw, 165px)',
                                    color: 'rgba(255, 255, 255, 0.95)',
                                  }}
                                >
                                  {item.note}
                                </p>
                              )}
                              {item.detail && (
                                <p
                                  className="relative overflow-hidden leading-[1.4] flex-1 px-2 2xl:px-0 mb-0 2xl:mb-0"
                                  style={{ 
                                    fontSize: 'clamp(74px, 15.64vw, 139px)',
                                    color: 'rgba(255, 255, 255, 0.85)',
                                  }}
                                >
                                  {item.detail}
                                </p>
                              )}
                            </div>
                            )}
                            {/* Image section - full screen for image-based slides */}
                            <div className={`relative flex flex-col items-center justify-center flex-shrink-0 ${
                              hasImageItems 
                                ? 'w-full h-full' // Full screen
                                : 'w-full 2xl:w-[85%] 2xl:min-w-[600px] 2xl:max-w-[1400px] h-[60%] 2xl:h-[85%] min-h-[450px] md:min-h-[500px] 2xl:min-h-[600px] rounded-3xl border-2 border-white/30 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.95)] mt-6 md:mt-8 2xl:mt-0'
                            }`}>
                              <div className={`relative w-full h-full overflow-hidden flex items-center justify-center ${
                                hasImageItems 
                                  ? '' // No rounded corners for full screen
                                  : 'h-[60%] 2xl:h-[85%] min-h-[450px] md:min-h-[500px] 2xl:min-h-[600px] rounded-3xl'
                              }`}>
                                <img
                                  src={item.image}
                                  alt={item.title || 'Image'}
                                  className={`${hasImageItems ? 'w-full h-full object-contain' : 'w-full h-full object-cover'}`}
                                  style={hasImageItems ? {} : { transform: 'scale(1.05)' }}
                                  onError={(e) => {
                                    console.error('[Signage Rotator] Image failed to load:', item.image, e);
                                    setFailedImages((prev) => new Set(prev).add(item.image!));
                                  }}
                                  onLoad={() => {
                                    if (debug) {
                                      console.log('[Signage Rotator] Image loaded successfully:', item.image);
                                    }
                                  }}
                                />
                                {!hasImageItems && (
                                  <>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 ring-2 ring-white/20 pointer-events-none rounded-3xl" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/10 pointer-events-none" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        // Layout without image: centered and prominent text-only layout
                        <div className="relative flex flex-col items-center justify-center h-full text-center gap-6 md:gap-8 px-6">
                          <div className="flex flex-col items-center gap-5 md:gap-6">
                            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
                              <p
                                className="font-extrabold leading-[1.08]"
                                style={{ 
                                  fontSize: 'clamp(110px, 21vw, 220px)',
                                  color: isFoodSlide ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 1)',
                                  textShadow: isFoodSlide 
                                    ? '0 0 24px rgba(255, 255, 255, 0.35), 0 8px 24px rgba(0,0,0,0.5)' 
                                    : '0 8px 24px rgba(0,0,0,0.5)',
                                  marginBottom: (item.note || item.detail) ? '0.1em' : '0',
                                }}
                              >
                                {item.title}
                              </p>
                              {item.time && !isFoodSlide && (
                                <span
                                  className="relative shrink-0 rounded-full border bg-white/10 px-5 py-2.5 md:px-6 md:py-3 font-bold tracking-tight shadow-lg"
                                  style={{
                                    fontSize: 'clamp(50px, 10.5vw, 84px)',
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
                                className="relative overflow-hidden font-semibold leading-[1.25] drop-shadow-[0_6px_20px_rgba(0,0,0,0.4)]"
                                style={{ 
                                  fontSize: 'clamp(84px, 15.75vw, 140px)',
                                  color: isFoodSlide ? 'rgba(251, 191, 36, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                  textShadow: isFoodSlide ? '0 4px 16px rgba(251, 191, 36, 0.5)' : '0 6px 20px rgba(0,0,0,0.4)',
                                  marginTop: item.title ? '0.1em' : '0',
                                  marginBottom: item.detail ? '0.15em' : '0',
                                }}
                              >
                                {item.note}
                              </p>
                            )}
                            {item.detail && (
                              <p
                                className="relative overflow-hidden leading-[1.4] drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)] max-w-4xl"
                                style={{ 
                                  fontSize: 'clamp(63px, 12.6vw, 105px)',
                                  color: isFoodSlide ? 'rgba(147, 197, 253, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                  textShadow: isFoodSlide ? '0 3px 12px rgba(147, 197, 253, 0.35)' : '0 4px 16px rgba(0,0,0,0.35)',
                                  marginTop: (item.title || item.note) ? '0.1em' : '0',
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
            )}

            {/* Render items for image-based slides (full screen) */}
            {hasImageItems && slide.items && slide.items.length > 0 && (() => {
              if (debug && (slide.source === 'custom' || slide.source === 'welcome')) {
                console.log('[Signage Rotator] Image-based slide items:', {
                  slideId: slide.id,
                  source: slide.source,
                  itemCount: slide.items.length,
                  items: slide.items.map(item => ({
                    title: item.title,
                    hasImage: !!item.image,
                    imagePath: item.image,
                  })),
                });
              }

              return (
                <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${isWelcomeSlideToUse ? 'inset-0' : ''}`}>
                  {/* Subtle background gradient overlay - only for non-welcome slides */}
                  {!isWelcomeSlideToUse && (
                    <div 
                      className="absolute inset-0 pointer-events-none z-0"
                      style={{
                        background: `radial-gradient(circle at center, ${accentGlowColor}15, transparent 70%)`,
                      }}
                    />
                  )}
                  
                  {/* Corner accent highlights - only for non-welcome slides */}
                  {!isWelcomeSlideToUse && (
                    <>
                      <div 
                        className="absolute top-0 left-0 w-32 h-32 pointer-events-none z-0"
                        style={{
                          background: `radial-gradient(circle at top left, ${accentGlowColor}30, transparent 70%)`,
                          filter: 'blur(20px)',
                        }}
                      />
                      <div 
                        className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none z-0"
                        style={{
                          background: `radial-gradient(circle at bottom right, ${accentGlowColor}30, transparent 70%)`,
                          filter: 'blur(20px)',
                        }}
                      />
                    </>
                  )}
                  
                  {slide.items.map((item, itemIdx) => {
                    const hasImage = Boolean(item.image);
                    const notFailed = !failedImages.has(item.image || '');
                    if (debug && hasImage) {
                      console.log('[Signage Rotator] Image-based slide item:', {
                        hasImage,
                        notFailed,
                        imagePath: item.image,
                        failedImages: Array.from(failedImages),
                      });
                    }
                    
                    if (hasImage && notFailed) {
                      return (
                        <div 
                          key={`${slide.id}-item-${itemIdx}`} 
                          className={`relative flex items-center justify-center z-10 ${isWelcomeSlideToUse ? 'w-full h-full inset-0' : 'w-full h-full'}`}
                        >
                          {/* Image container - full screen for welcome, 98% for others */}
                          <div 
                            className={`relative flex items-center justify-center ${isWelcomeSlideToUse ? 'w-full h-full' : 'w-[98%] h-[98%]'}`}
                            style={isWelcomeSlideToUse ? {} : {
                              filter: 'drop-shadow(0 20px 60px rgba(0, 0, 0, 0.5))',
                            }}
                          >
                            <img
                              src={item.image}
                              alt={item.title || 'Image'}
                              className={`${isWelcomeSlideToUse ? 'w-full h-full object-cover' : 'w-full h-full object-contain'}`}
                              style={{
                                willChange: 'opacity, transform',
                                maxWidth: isWelcomeSlideToUse ? '100%' : '100%',
                                maxHeight: isWelcomeSlideToUse ? '100%' : '100%',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'translateZ(0)',
                                WebkitTransform: 'translateZ(0)',
                                transition: `opacity 600ms ${TRANSITION_EASING}`,
                              }}
                              onError={(e) => {
                                console.error('[Signage Rotator] Image failed to load:', item.image, e);
                                setFailedImages((prev) => new Set(prev).add(item.image!));
                              }}
                              onLoad={(e) => {
                                if (debug) {
                                  console.log('[Signage Rotator] Image loaded successfully:', item.image);
                                }
                                // Smooth fade-in on load with hardware acceleration
                                const img = e.target as HTMLImageElement;
                                img.style.opacity = '0';
                                requestAnimationFrame(() => {
                                  img.style.transition = `opacity 600ms ${TRANSITION_EASING}`;
                                  requestAnimationFrame(() => {
                                    img.style.opacity = '1';
                                  });
                                });
                              }}
                            />
                            
                            {/* Dark overlay for text readability on welcome slides */}
                            {isWelcomeSlideToUse && (
                              <div 
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4))',
                                  transition: `opacity ${TRANSITION_DURATION} ${TRANSITION_EASING}, background ${TRANSITION_DURATION} ${TRANSITION_EASING}`,
                                  willChange: 'opacity',
                                  backfaceVisibility: 'hidden',
                                  WebkitBackfaceVisibility: 'hidden',
                                  transform: 'translateZ(0)',
                                  WebkitTransform: 'translateZ(0)',
                                }}
                              />
                            )}
                            
                            {/* Subtle inner glow effect - only for non-welcome slides */}
                            {!isWelcomeSlideToUse && (
                              <div 
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  boxShadow: `inset 0 0 80px ${accentGlowColor}20, inset 0 0 40px ${accentGlowColor}10`,
                                  borderRadius: '2px',
                                  transition: `opacity ${TRANSITION_DURATION} ${TRANSITION_EASING}, box-shadow ${TRANSITION_DURATION} ${TRANSITION_EASING}`,
                                  willChange: 'opacity, box-shadow',
                                  backfaceVisibility: 'hidden',
                                  WebkitBackfaceVisibility: 'hidden',
                                  transform: 'translateZ(0)',
                                  WebkitTransform: 'translateZ(0)',
                                }}
                              />
                            )}
                          </div>
                          
                          {/* Welcome slide text overlay */}
                          {isWelcomeSlideToUse && (
                            <>
                              {/* Decorative top accent line */}
                              <div className="absolute top-[8%] left-1/2 -translate-x-1/2 z-20 w-32 h-1 bg-gradient-to-r from-transparent via-[#eab308] to-transparent" style={{ boxShadow: '0 0 20px rgba(234, 179, 8, 0.6)' }} />
                              
                              {slide.title && (
                                <div className="absolute top-[12%] left-8 right-8 z-20">
                                  <h2
                                    className="font-extrabold leading-[1.1] text-center"
                                    style={{
                                      fontSize: 'clamp(140px, 28vw, 350px)',
                                      color: 'rgba(255, 255, 255, 1)',
                                      textShadow: '0 0 40px rgba(0, 0, 0, 0.9), 0 10px 30px rgba(0, 0, 0, 0.7), 0 5px 15px rgba(0, 0, 0, 0.5)',
                                      letterSpacing: '-0.02em',
                                    }}
                                  >
                                    {slide.title}
                                  </h2>
                                </div>
                              )}
                              
                              {slide.subtitle && (
                                <div className="absolute top-[28%] left-8 right-8 z-20">
                                  <p
                                    className="font-bold leading-tight text-center"
                                    style={{
                                      fontSize: 'clamp(64px, 12.5vw, 140px)',
                                      color: 'rgba(234, 179, 8, 1)',
                                      textShadow: '0 0 30px rgba(234, 179, 8, 0.5), 0 0 15px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)',
                                      letterSpacing: '0.1em',
                                    }}
                                  >
                                    {slide.subtitle}
                                  </p>
                                </div>
                              )}
                              
                              {/* Decorative middle accent line */}
                              <div className="absolute top-[38%] left-1/2 -translate-x-1/2 z-20 w-24 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                              
                              {slide.body && (
                                <div className="absolute top-[42%] left-8 right-8 z-20">
                                  <div className="flex flex-col items-center gap-6">
                                    {slide.body.split('\n\n').map((paragraph, idx) => (
                                      <p
                                        key={idx}
                                        className="font-semibold leading-relaxed text-center"
                                        style={{
                                          fontSize: idx === 0 ? 'clamp(70px, 13vw, 140px)' : 'clamp(56px, 10vw, 112px)',
                                          color: idx === 0 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.85)',
                                          textShadow: '0 0 25px rgba(0, 0, 0, 0.8), 0 5px 15px rgba(0, 0, 0, 0.6)',
                                          lineHeight: '1.4',
                                        }}
                                      >
                                        {paragraph}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Cycle indicator - subtle visual marker */}
                              <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
                                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-white/40" />
                                <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                                  <p
                                    className="font-medium text-center uppercase tracking-wider"
                                    style={{
                                      fontSize: 'clamp(32px, 5vw, 56px)',
                                      color: 'rgba(255, 255, 255, 0.7)',
                                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                                      letterSpacing: '0.15em',
                                    }}
                                  >
                                    Slideshow Start
                                  </p>
                                </div>
                                <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-white/40" />
                              </div>
                              
                              {slide.footer && (() => {
                                const slideAccent = slide.accent || 'accent';
                                const colorMap: Record<string, { var: string }> = {
                                  accent: { var: '#dc2626' },
                                  gold: { var: '#eab308' },
                                  blue: { var: '#3b82f6' },
                                  green: { var: '#228B22' }, // Traditional Irish bar green
                                  purple: { var: '#a855f7' },
                                  orange: { var: '#f97316' },
                                  teal: { var: '#14b8a6' },
                                  pink: { var: '#ec4899' },
                                  cyan: { var: '#06b6d4' },
                                };
                                const footerColor = colorMap[slideAccent]?.var || colorMap.accent.var;
                                return (
                                  <div className="absolute bottom-[6%] left-8 right-8 z-20">
                                    <p
                                      className="font-semibold leading-tight text-center"
                                      style={{
                                        fontSize: 'clamp(56px, 10vw, 112px)',
                                        color: footerColor,
                                        textShadow: '0 0 30px rgba(234, 179, 8, 0.4), 0 0 15px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)',
                                      }}
                                    >
                                      {slide.footer}
                                    </p>
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

        {/* Next slide (during transition) */}
        {nextSlide && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ 
              opacity: nextOpacity,
              visibility: nextVisible ? 'visible' : 'hidden',
              transition: `opacity ${TRANSITION_DURATION} ${TRANSITION_EASING}, visibility ${TRANSITION_DURATION} ${TRANSITION_EASING}`,
              pointerEvents: nextOpacity > 0.5 ? 'auto' : 'none',
              willChange: 'opacity, transform',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              WebkitTransform: 'translateZ(0)',
              isolation: 'isolate',
              contain: 'layout style paint',
              width: '100%',
              height: '100%',
              // Force hardware acceleration for smooth transitions
              perspective: '1000px',
              transformStyle: 'preserve-3d',
            }}
          >
            {(() => {
              // Check if next slide is an ad or CONTENT slide (image-based)
              const isNextImageCustomSlide = Boolean(
                nextSlide.source === 'custom' && 
                nextSlide.asset && 
                nextSlide.asset.storageKey &&
                typeof nextSlide.asset.storageKey === 'string' &&
                nextSlide.asset.storageKey.trim() !== ''
              );
              const showBorderForNextImageSlide = isNextImageCustomSlide 
                ? (nextSlide?.showBorder === true) // Only show border when explicitly true
                : true;
              const hasNextImageAsset = Boolean(
                nextSlide.asset && 
                nextSlide.asset.storageKey &&
                typeof nextSlide.asset.storageKey === 'string' &&
                nextSlide.asset.storageKey.trim() !== ''
              );
              if (hasNextImageAsset && (nextSlide.isAd || nextSlide.isContentSlide || isNextImageCustomSlide) && nextSlide.asset) {
                return (
                  <div 
                    className="relative w-full h-full flex items-center justify-center bg-black" 
                    style={(() => {
                      if (isNextImageCustomSlide && showBorderForNextImageSlide) {
                        // Get accent color for border
                        const slideAccent = nextSlide.accent || 'accent';
                        const colorMap: Record<string, string> = {
                          accent: '#dc2626',
                          gold: '#eab308',
                          blue: '#3b82f6',
                          green: '#228B22',
                          purple: '#a855f7',
                          orange: '#f97316',
                          teal: '#14b8a6',
                          pink: '#ec4899',
                          cyan: '#06b6d4',
                        };
                        const borderColor = colorMap[slideAccent] || colorMap.accent;
                        // Convert hex to rgba for glow
                        const hexToRgba = (hex: string, alpha: number) => {
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                        };
                        return {
                          boxSizing: 'border-box' as const,
                          contain: 'layout style paint' as const,
                          padding: '32px',
                          borderRadius: '40px',
                          border: `16px solid ${borderColor}`,
                          boxShadow: `
                            inset 0 0 100px ${hexToRgba(borderColor, 0.5)},
                            inset 0 0 60px ${hexToRgba(borderColor, 0.4)},
                            inset 0 0 30px ${hexToRgba(borderColor, 0.6)},
                            inset 0 0 15px ${hexToRgba(borderColor, 0.8)},
                            0 0 80px ${hexToRgba(borderColor, 0.7)},
                            0 0 150px ${hexToRgba(borderColor, 0.5)},
                            0 0 220px ${hexToRgba(borderColor, 0.3)},
                            0 0 300px ${hexToRgba(borderColor, 0.15)},
                            0 20px 80px rgba(0, 0, 0, 0.8),
                            inset 0 4px 8px rgba(255, 255, 255, 0.2),
                            inset 0 -4px 8px rgba(0, 0, 0, 0.3)
                          `,
                        };
                      }
                      return {
                        boxSizing: 'border-box' as const,
                        contain: 'layout style paint' as const,
                      };
                    })()}
                  >
                    <img
                      src={nextSlide.asset.storageKey}
                      alt={nextSlide.isAd ? 'Advertisement' : nextSlide.title || 'Content'}
                      className="object-contain"
                      style={{
                        width: (isNextImageCustomSlide && !showBorderForNextImageSlide) ? '100%' : 'calc(100% - 64px)',
                        height: (isNextImageCustomSlide && !showBorderForNextImageSlide) ? '100%' : 'calc(100% - 64px)',
                        maxWidth: (isNextImageCustomSlide && !showBorderForNextImageSlide) ? '100%' : 'calc(100% - 64px)',
                        maxHeight: (isNextImageCustomSlide && !showBorderForNextImageSlide) ? '100%' : 'calc(100% - 64px)',
                        willChange: 'opacity, transform',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'translateZ(0)',
                        WebkitTransform: 'translateZ(0)',
                        transition: `opacity ${TRANSITION_DURATION} ${TRANSITION_EASING}`,
                      }}
                      onError={(e) => {
                        console.error('Failed to load next slide image:', nextSlide.asset?.storageKey);
                        // Fallback: hide the broken image
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                      onLoad={(e) => {
                        // Smooth fade-in on load with hardware acceleration
                        const img = e.target as HTMLImageElement;
                        img.style.opacity = '0';
                        requestAnimationFrame(() => {
                          img.style.transition = `opacity 600ms ${TRANSITION_EASING}`;
                          requestAnimationFrame(() => {
                            img.style.opacity = '1';
                          });
                        });
                      }}
                    />
                    {/* Display title for content slides (not ads, not image-based custom slides) */}
                    {nextSlide.isContentSlide && !nextSlide.isAd && !isNextImageCustomSlide && nextSlide.title && (
                      <div className="absolute top-8 left-8 right-8 z-10">
                        <h2
                          className="font-extrabold leading-tight text-center"
                          style={{
                            fontSize: 'clamp(118px, 23.52vw, 281px)',
                            color: 'rgba(255, 255, 255, 1)',
                            textShadow: '0 0 30px rgba(0, 0, 0, 0.8), 0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)',
                          }}
                        >
                          {nextSlide.title}
                        </h2>
                      </div>
                    )}
                    {nextSlide.isAd && nextSlide.adCreative?.destinationUrl && (
                      <a
                        href={nextSlide.adCreative.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0"
                        aria-label="Visit advertiser website"
                      />
                    )}
                    {nextSlide.isAd && nextSlide.adCreative?.qrEnabled && nextSlide.adCreative?.destinationUrl && (
                      <div className="absolute bottom-4 right-4 bg-white p-2 rounded">
                        <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                          QR
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Temporarily override variables for next slide rendering
              const slide = nextSlide;
              const hasNextImageItems = slide?.source === 'custom' && slide?.items && slide.items.some(item => item.image);
              const {
                accentColor = '#dc2626',
                accentGlowColor = 'rgba(220, 38, 38, 0.55)',
                accentSurfaceColor = 'rgba(220, 38, 38, 0.1)',
                accentSurfaceStrong = 'rgba(220, 38, 38, 0.18)',
                isEventSlide = false,
                isHappyHourSlide = false,
                isDrinkSlide = false,
                isFoodSlide = false,
                showLabel = false,
                gridColumns = 'default',
                itemCount = 0,
                isDenseEvents = false,
                eventColumnCount = undefined,
                eventRowCount = undefined,
                eventRowMin = undefined,
                backgroundImageUrl = null,
              } = nextSlideProps || {};
              
              // Render next slide (duplicate the slide rendering logic)
              return (isHappyHourSlide || (isDrinkSlide && backgroundImageUrl)) ? (
                // Special creative layout for Happy Hour slide - Two column layout
                <div 
                  className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[48px] border border-white/10 p-8 md:p-12 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-lg"
                  style={{
                    backgroundImage: backgroundImageUrl ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url(${backgroundImageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    boxSizing: 'border-box',
                    contain: 'layout style paint',
                  }}
                >
                  <div 
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.05), transparent 70%)',
                    }}
                  />
                  
                  {/* Two-column layout - centered when only one column, side-by-side when both */}
                  <div className={`relative z-10 flex flex-row items-stretch justify-center w-full h-full gap-8 md:gap-12 px-6 py-6 md:py-8 ${slide.footer ? 'pb-32 md:pb-40' : ''} ${(!isHappyHourSlide || !slide.items || slide.items.length === 0) && (isDrinkSlide && !isHappyHourSlide && slide.items && slide.items.length > 0) ? 'justify-center' : ''}`}>
                    {/* Left Column: Happy Hour */}
                    {isHappyHourSlide && (slide.subtitle || slide.title || slide.body) && (
                      <div className={`flex flex-col items-center justify-center text-center min-w-0 ${slide.items && slide.items.length > 0 ? 'flex-1 max-w-[48%]' : 'max-w-[60%]'}`}>
                        {/* Subtle header */}
                        {showLabel && (
                          <div className="mb-6 md:mb-8">
                            <div
                              className="inline-block rounded-full px-6 py-3 md:px-8 md:py-4 font-bold uppercase tracking-wider text-white shadow-lg"
                              style={{ 
                                backgroundColor: `${accentColor}70`, 
                                border: `3px solid ${accentColor}`,
                                fontSize: 'clamp(38px, 6.5vw, 60px)',
                                boxShadow: `0 0 20px ${accentGlowColor}, 0 8px 24px rgba(0,0,0,0.4), inset 0 0 10px ${accentColor}40`
                              }}
                            >
                              {slide.label}
                            </div>
                          </div>
                        )}

                        {/* Happy Hour Content */}
                        <div className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 md:p-8 shadow-lg w-full" style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}` }}>
                          <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                            {/* Times */}
                            {slide.subtitle && (
                              <div
                                className="font-bold uppercase tracking-[0.15em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                                style={{ fontSize: 'clamp(59px, 10.29vw, 118px)', marginBottom: '0.15em' }}
                              >
                                {slide.subtitle}
                              </div>
                            )}

                            {/* Main title */}
                            {slide.title && (
                              <h1
                                className="text-balance font-black leading-[0.92] tracking-tight drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                                style={{ fontSize: 'clamp(118px, 20.58vw, 235px)', marginTop: slide.subtitle ? '0.1em' : '0', marginBottom: slide.body ? '0.15em' : '0' }}
                              >
                                {slide.title}
                              </h1>
                            )}

                            {/* Description/Body */}
                            {slide.body && (
                              <p
                                className="w-full font-semibold leading-[1.2] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                                style={{ fontSize: 'clamp(59px, 11.76vw, 118px)', marginTop: '0.1em' }}
                              >
                                {slide.body}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vertical Divider - only show when both happy hour and drink specials */}
                    {isHappyHourSlide && slide.items && slide.items.length > 0 && (slide.subtitle || slide.title || slide.body) && (
                      <div className="flex flex-col items-center justify-center w-px relative">
                        <div 
                          className="absolute inset-0 w-px bg-gradient-to-b from-transparent via-white/30 to-transparent"
                          style={{
                            boxShadow: `0 0 20px ${accentGlowColor}40, 0 0 40px ${accentGlowColor}20`,
                          }}
                        />
                        <div 
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: accentColor,
                            boxShadow: `0 0 20px ${accentGlowColor}, 0 0 40px ${accentGlowColor}60`,
                          }}
                        />
                      </div>
                    )}

                    {/* Right Column: Drink Specials OR Drink-only centered */}
                    {slide.items && slide.items.length > 0 && (
                      <div className={`flex flex-col items-center justify-center text-center min-w-0 ${isHappyHourSlide && (slide.subtitle || slide.title || slide.body) ? 'flex-1 max-w-[48%]' : 'max-w-[60%]'}`}>
                        {/* Subtle header for drink specials */}
                        {isHappyHourSlide && (
                          <div className="mb-6 md:mb-8">
                            <div
                              className="inline-block rounded-full px-5 py-2.5 md:px-6 md:py-3 font-bold uppercase tracking-wider text-white/90"
                              style={{ 
                                backgroundColor: `${accentColor}40`, 
                                border: `2px solid ${accentColor}80`,
                                fontSize: 'clamp(32px, 5.25vw, 50px)'
                              }}
                            >
                              Drink Specials
                            </div>
                          </div>
                        )}

                        {/* Drink-only slide header */}
                        {isDrinkSlide && !isHappyHourSlide && showLabel && (
                          <div className="mb-6 md:mb-8">
                            <div
                              className="inline-block rounded-full px-6 py-3 md:px-8 md:py-4 font-bold uppercase tracking-wider text-white shadow-lg"
                              style={{ 
                                backgroundColor: `${accentColor}70`, 
                                border: `3px solid ${accentColor}`,
                                fontSize: 'clamp(38px, 6.5vw, 60px)',
                                boxShadow: `0 0 20px ${accentGlowColor}, 0 8px 24px rgba(0,0,0,0.4), inset 0 0 10px ${accentColor}40`
                              }}
                            >
                              {slide.label}
                            </div>
                          </div>
                        )}
                        
                        {/* Drink Special Items */}
                        <div className="space-y-5 md:space-y-6 w-full">
                          {slide.items.map((item, itemIdx) => (
                            <div
                              key={`${slide.id}-item-${itemIdx}`}
                              className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 md:p-8 shadow-lg"
                              style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}` }}
                            >
                              <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                                {/* Title - matching happy hour title size */}
                                <h3
                                  className="font-black leading-[0.92] tracking-tight text-white drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                                  style={{ fontSize: 'clamp(118px, 20.58vw, 235px)', marginBottom: (item.note || item.time || item.detail) ? '0.1em' : '0' }}
                                >
                                  {item.title}
                                </h3>
                                {/* Note/Price - matching happy hour body size */}
                                {item.note && (
                                  <p
                                    className="font-semibold leading-[1.2] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
                                    style={{ fontSize: 'clamp(59px, 11.76vw, 118px)', marginTop: '0.05em', marginBottom: (item.time || item.detail) ? '0.1em' : '0' }}
                                  >
                                    {item.note}
                                  </p>
                                )}
                                {/* Time - matching happy hour subtitle size */}
                                {item.time && (
                                  <p
                                    className="font-bold uppercase tracking-[0.15em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                                    style={{ fontSize: 'clamp(59px, 10.29vw, 118px)', marginTop: '0.05em', marginBottom: item.detail ? '0.1em' : '0' }}
                                  >
                                    {item.time}
                                  </p>
                                )}
                                {/* Detail - matching happy hour body size */}
                                {item.detail && (
                                  <div
                                    className="mt-1 font-semibold leading-[1.2] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)] [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-2 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-2 [&_p]:mb-2"
                                    style={{ fontSize: 'clamp(59px, 11.76vw, 118px)', marginTop: '0.1em' }}
                                    dangerouslySetInnerHTML={{ __html: marked.parse(item.detail) }}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer - moved to bottom, much bigger */}
                  {slide.footer && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                      <div
                        className="font-semibold text-white/80 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                        style={{ fontSize: 'clamp(70px, 11.76vw, 140px)' }}
                      >
                        {slide.footer}
                      </div>
                    </div>
                  )}

                  {/* Monaghan's branding in corner */}
                  <span 
                    className="absolute top-8 right-8 font-semibold text-white/70" 
                    style={{ fontSize: 'clamp(42px, 7.35vw, 76px)' }}
                  >
                    Monaghan&apos;s
                  </span>
                </div>
              ) : (
                // Standard layout for other slides - simplified for next slide
                <div 
                  className="relative z-10 flex h-full w-full flex-col overflow-hidden rounded-[48px] bg-white/5 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-lg"
                  style={{
                    padding: isCustomSlide ? '12px' : undefined,
                    border: isCustomSlide ? `8px solid ${accentColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: isCustomSlide 
                      ? `0 0 30px ${accentGlowColor}, 0 30px 120px -60px rgba(0,0,0,0.9)`
                      : '0 30px 120px -60px rgba(0,0,0,0.9)',
                    boxSizing: 'border-box',
                    contain: 'layout style paint',
                  }}
                >
                  <div className="pointer-events-none absolute inset-x-10 top-0 z-0 h-40 bg-gradient-to-b from-white/10 via-white/0 to-transparent blur-2xl" />
                  <header className={`relative ${isCustomSlide ? 'mb-4 p-7 md:p-10' : ''} ${isFoodSlide ? 'grid grid-cols-2 gap-8 items-start px-8 pt-4 pb-2' : 'flex items-start justify-between gap-6 px-8 pt-8 pb-4'}`}>
                    {/* Left column */}
                    <div className={`flex flex-col ${isFoodSlide ? 'gap-2' : 'flex-wrap items-center gap-4'}`}>
                      {showLabel && (
                        <span
                          className={`rounded-full px-6 py-2.5 font-black uppercase tracking-wide text-black shadow-[0_16px_45px_-28px_rgba(0,0,0,0.65)] ${isFoodSlide ? 'self-start' : ''}`}
                          style={{ backgroundColor: accentColor, boxShadow: `0 0 0 2px ${accentColor}`, fontSize: 'clamp(64px, 11.76vw, 123px)' }}
                        >
                          {slide.label}
                        </span>
                      )}
                      {!isCustomSlide && !isEventSlide && slide.subtitle && (
                        <span
                          className={`font-semibold uppercase tracking-[0.12em] text-white/80 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)] ${isFoodSlide ? 'self-start' : ''}`}
                          style={{ fontSize: 'clamp(59px, 12.35vw, 129px)' }}
                        >
                          {slide.subtitle}
                        </span>
                      )}
                    </div>
                    {/* Right column */}
                    {!hasNextImageItems && (
                      <div className={`flex flex-col ${isFoodSlide ? 'items-end justify-start gap-3' : ''}`}>
                        <span className="font-semibold text-white/70" style={{ fontSize: 'clamp(64px, 11.76vw, 123px)' }}>
                          Monaghan&apos;s
                        </span>
                      </div>
                    )}
                  </header>

                  <main className={`flex min-h-0 flex-1 flex-col gap-6 md:gap-8 ${isCustomSlide ? 'px-7 md:px-10 justify-start pt-8 md:pt-12' : 'mt-6 md:mt-8 justify-start'}`}>
                    {(slide.title || slide.body || slide.footer || (isCustomSlide && slide.subtitle)) && (
                      <div className={`flex flex-col ${isCustomSlide ? 'gap-8 md:gap-10 items-center text-center w-full max-w-[90vw] mx-auto' : 'gap-4 md:gap-5 w-full'}`}>
                        {isCustomSlide && slide.subtitle && (
                          <p
                            className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                            style={{ fontSize: 'clamp(41px, 7.35vw, 70px)' }}
                          >
                            {slide.subtitle}
                          </p>
                        )}
                        {slide.title && (
                          <h1
                            className={`text-balance font-black leading-[0.95] tracking-tight drop-shadow-[0_18px_48px_rgba(0,0,0,0.45)] ${isCustomSlide ? 'text-center' : ''}`}
                            style={{ 
                              fontSize: 'clamp(123px, 23.52vw, 270px)',
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
                              className="w-full max-w-[85vw] font-semibold leading-[1.2] drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] mt-8 md:mt-12 mx-auto [&_*]:text-white [&_p]:text-[clamp(70px,13.23vw,140px)] [&_h1]:text-[clamp(83px,16.17vw,165px)]"
                              style={{ fontSize: 'clamp(70px, 13.23vw, 140px)' }}
                            >
                              <ReactMarkdown
                                components={{
                                  ul: ({ children }) => (
                                    <ul style={{ listStyle: 'none', paddingLeft: 0, margin: '1em 0' }}>
                                      {children}
                                    </ul>
                                  ),
                                  li: ({ children }) => (
                                    <li style={{ marginBottom: '1.2em', paddingLeft: '1.8em', position: 'relative', listStyle: 'none', display: 'block', textAlign: 'left' }}>
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
                              className="w-full font-semibold leading-[1.08] text-white/90 drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] overflow-hidden"
                              style={{ 
                                fontSize: 'clamp(77px, 16.46vw, 158px)',
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
                            className="w-full max-w-[85vw] font-semibold leading-[1.2] drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-center mt-6 md:mt-8 mx-auto"
                            style={{ 
                              fontSize: 'clamp(53px, 10.29vw, 94px)',
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

                  {!isCustomSlide && slide.footer && <footer className="mt-8 md:mt-10 text-[99px] md:text-[112px] font-semibold text-white/80">{slide.footer}</footer>}
                </div>
              );
            })()}
          </div>
        )}
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
                  transition: `width 400ms ${TRANSITION_EASING}, background-color 400ms ${TRANSITION_EASING}, box-shadow 400ms ${TRANSITION_EASING}`,
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
            transition: `opacity 300ms ${TRANSITION_EASING}, transform 300ms ${TRANSITION_EASING}`,
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
              transition: `opacity 300ms ${TRANSITION_EASING}, transform 300ms ${TRANSITION_EASING}`,
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
              transition: `opacity 300ms ${TRANSITION_EASING}, transform 300ms ${TRANSITION_EASING}`,
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

