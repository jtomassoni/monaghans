'use client';

import { SlideContent } from '@/app/specials-tv/types';

type AdSlideRendererProps = {
  slide: SlideContent;
  isAdSlide: boolean;
  isImageCustomSlide: boolean;
  showBorderForImageSlide: boolean;
  isWelcomeSlideToUse: boolean;
  TRANSITION_DURATION: number;
};

export default function AdSlideRenderer({
  slide,
  isAdSlide,
  isImageCustomSlide,
  showBorderForImageSlide,
  isWelcomeSlideToUse,
  TRANSITION_DURATION,
}: AdSlideRendererProps) {
  const getBorderStyle = () => {
    if (isImageCustomSlide && showBorderForImageSlide) {
      const slideAccent = slide.accent || 'accent';
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
  };

  const getFooterColor = () => {
    const slideAccent = slide.accent || 'accent';
    const colorMap: Record<string, { var: string }> = {
      accent: { var: '#dc2626' },
      gold: { var: '#eab308' },
      blue: { var: '#3b82f6' },
      green: { var: '#228B22' },
      purple: { var: '#a855f7' },
      orange: { var: '#f97316' },
      teal: { var: '#14b8a6' },
      pink: { var: '#ec4899' },
      cyan: { var: '#06b6d4' },
    };
    return colorMap[slideAccent]?.var || colorMap.accent.var;
  };

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center bg-black" 
      style={{
        ...getBorderStyle(),
        minHeight: '100%',
        minWidth: '100%',
      }}
    >
      <img
        src={slide.asset!.storageKey}
        alt={isAdSlide ? 'Advertisement' : slide.title || 'Content'}
        className="object-contain"
        style={{
          width: (isImageCustomSlide && !showBorderForImageSlide) ? '100%' : 'calc(100% - 64px)',
          height: (isImageCustomSlide && !showBorderForImageSlide) ? '100%' : 'calc(100% - 64px)',
          maxWidth: (isImageCustomSlide && !showBorderForImageSlide) ? '100%' : 'calc(100% - 64px)',
          maxHeight: (isImageCustomSlide && !showBorderForImageSlide) ? '100%' : 'calc(100% - 64px)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
        onError={(e) => {
          console.error('Failed to load image:', {
            storageKey: slide.asset?.storageKey,
            slide: slide,
            isAdSlide,
            isContentSlide: slide.isContentSlide,
            isImageCustomSlide,
          });
          (e.target as HTMLImageElement).style.display = 'none';
        }}
        onLoad={(e) => {
          console.log('Image loaded successfully:', slide.asset?.storageKey);
        }}
      />
      {/* Display title and footer for welcome slides and content slides (not ads, not image-based custom slides) */}
      {((slide.isContentSlide || isWelcomeSlideToUse) && !isAdSlide && !isImageCustomSlide) && (
        <>
          {slide.title && (
            <div className="absolute top-8 left-8 right-8 z-10">
              <h2
                className="font-extrabold leading-tight text-center"
                style={{
                  fontSize: 'clamp(118px, 23.52vw, 281px)',
                  color: 'rgba(255, 255, 255, 1)',
                  textShadow: '0 0 30px rgba(0, 0, 0, 0.8), 0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)',
                }}
              >
                {slide.title}
              </h2>
            </div>
          )}
          {slide.subtitle && isWelcomeSlideToUse && (
            <div className="absolute top-[20%] left-8 right-8 z-10">
              <p
                className="font-bold leading-tight text-center"
                style={{
                  fontSize: 'clamp(70px, 11.76vw, 140px)',
                  color: 'rgba(255, 255, 255, 0.95)',
                  textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)',
                }}
              >
                {slide.subtitle}
              </p>
            </div>
          )}
          {slide.body && isWelcomeSlideToUse && (
            <div className="absolute top-[35%] left-8 right-8 z-10">
              <p
                className="font-semibold leading-relaxed text-center whitespace-pre-line"
                style={{
                  fontSize: 'clamp(59px, 9.41vw, 118px)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)',
                }}
              >
                {slide.body}
              </p>
            </div>
          )}
          {slide.footer && (
            <div className="absolute bottom-8 left-8 right-8 z-10">
              <p
                className="font-semibold leading-tight text-center"
                style={{
                  fontSize: 'clamp(70px, 11.76vw, 140px)',
                  color: getFooterColor(),
                  textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)',
                }}
              >
                {slide.footer}
              </p>
            </div>
          )}
        </>
      )}
      {isAdSlide && slide.adCreative?.destinationUrl && (
        <a
          href={slide.adCreative.destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0"
          aria-label="Visit advertiser website"
        />
      )}
      {isAdSlide && slide.adCreative?.qrEnabled && slide.adCreative?.destinationUrl && (
        <div className="absolute bottom-4 right-4 bg-white p-2 rounded">
          <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs text-gray-600">
            QR
          </div>
        </div>
      )}
    </div>
  );
}
