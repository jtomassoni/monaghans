'use client';

import { useEffect } from 'react';
import { SlideContent } from '@/app/specials-tv/types';
import AdSlideRenderer from './ad-slide-renderer';
import ImageSlideRenderer from './image-slide-renderer';
import TextSlideRenderer from './text-slide-renderer';

type SlideContentRendererProps = {
  slide: SlideContent;
  slideProps: {
    accentColor: string;
    accentGlowColor: string;
    accentSurfaceColor: string;
    accentSurfaceStrong: string;
    isEventSlide: boolean;
    isHappyHourSlide: boolean;
    isDrinkSlide: boolean;
    isFoodSlide: boolean;
    isCustomSlide: boolean;
    isWelcomeSlide: boolean;
    showLabel: boolean;
    gridColumns: string;
    itemCount: number;
    isDenseEvents: boolean;
    eventColumnCount?: number;
    eventRowCount?: number;
    eventRowMin?: number;
    backgroundImageUrl: string | null;
  };
  debug?: boolean;
  failedImages: Set<string>;
  setFailedImages: (updater: (prev: Set<string>) => Set<string>) => void;
  TRANSITION_DURATION: number;
  onDebugInfo?: (info: Record<string, any>) => void;
};

export default function SlideContentRenderer({
  slide,
  slideProps,
  debug = false,
  failedImages,
  setFailedImages,
  TRANSITION_DURATION,
  onDebugInfo,
}: SlideContentRendererProps) {
  const isAdSlide = slide?.isAd === true;
  const isWelcomeSlide = slide?.source === 'welcome';
  const isImageBasedSlide = (slide?.source === 'custom' || isWelcomeSlide) &&
    (slide?.slideType === 'image' || (slide?.items && slide.items.some(item => item.image)));
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

  // Check if we should render an ad/content slide with full-screen image
  const asset = slide?.asset;
  const hasImageAsset = Boolean(
    asset &&
    asset.storageKey &&
    typeof asset.storageKey === 'string' &&
    asset.storageKey.trim() !== ''
  );
  const shouldRenderImage = Boolean(
    hasImageAsset &&
    (isAdSlide || slide?.isContentSlide === true || isImageCustomSlide)
  );

  // Update debug info
  useEffect(() => {
    if (debug && onDebugInfo) {
      onDebugInfo({
        renderer: 'SlideContentRenderer',
        isAdSlide,
        isWelcomeSlide,
        hasImageItems,
        isImageCustomSlide,
        showBorderForImageSlide,
        hasImageAsset,
        shouldRenderImage,
        slideSource: slide?.source,
        slideType: slide?.slideType,
        hasItems: !!slide?.items && slide.items.length > 0,
        itemCount: slide?.items?.length || 0,
        slideProps: {
          isHappyHourSlide: slideProps.isHappyHourSlide,
          isDrinkSlide: slideProps.isDrinkSlide,
          isFoodSlide: slideProps.isFoodSlide,
          isEventSlide: slideProps.isEventSlide,
          isCustomSlide: slideProps.isCustomSlide,
          hasBackgroundImage: !!slideProps.backgroundImageUrl,
        },
      });
    }
  }, [
    debug,
    onDebugInfo,
    isAdSlide,
    isWelcomeSlide,
    hasImageItems,
    isImageCustomSlide,
    showBorderForImageSlide,
    hasImageAsset,
    shouldRenderImage,
    slide?.source,
    slide?.slideType,
    slide?.items,
    slideProps,
  ]);

  // Log which renderer path we're taking
  if (debug) {
    console.log('[SlideContentRenderer] Render decision:', {
      shouldRenderImage,
      isAdSlide,
      isImageCustomSlide,
      hasImageAsset,
      isContentSlide: slide?.isContentSlide,
      slideSource: slide?.source,
      renderer: shouldRenderImage ? 'AdSlideRenderer' : 'TextSlideRenderer',
    });
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {shouldRenderImage ? (
        <AdSlideRenderer
          slide={slide}
          isAdSlide={isAdSlide}
          isImageCustomSlide={isImageCustomSlide}
          showBorderForImageSlide={showBorderForImageSlide}
          isWelcomeSlideToUse={slideProps.isWelcomeSlide}
          TRANSITION_DURATION={TRANSITION_DURATION}
        />
      ) : (
        <TextSlideRenderer
          slide={slide}
          slideProps={slideProps}
          debug={debug}
          failedImages={failedImages}
          setFailedImages={setFailedImages}
          TRANSITION_DURATION={TRANSITION_DURATION}
          hasImageItems={hasImageItems}
          isImageCustomSlide={isImageCustomSlide}
          showBorderForImageSlide={showBorderForImageSlide}
        />
      )}
    </div>
  );
}
