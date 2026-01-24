'use client';

import { SlideContent } from '@/app/specials-tv/types';

type ImageSlideRendererProps = {
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
};

export default function ImageSlideRenderer({
  slide,
  slideProps,
  debug = false,
  failedImages,
  setFailedImages,
  TRANSITION_DURATION,
}: ImageSlideRendererProps) {
  const {
    accentGlowColor,
    isWelcomeSlide,
  } = slideProps;

  const isWelcomeSlideToUse = isWelcomeSlide;

  if (debug && (slide.source === 'custom' || slide.source === 'welcome')) {
    console.log('[Signage Rotator] Image-based slide items:', {
      slideId: slide.id,
      source: slide.source,
      itemCount: slide.items?.length || 0,
      items: slide.items?.map(item => ({
        title: item.title,
        hasImage: !!item.image,
        imagePath: item.image,
      })) || [],
    });
  }

  if (!slide.items || slide.items.length === 0) {
    return null;
  }

  return (
    <div className={`absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden z-20`}>
      {!isWelcomeSlideToUse && (
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at center, ${accentGlowColor}15, transparent 70%)`,
          }}
        />
      )}
      
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
                    willChange: 'transform',
                    maxWidth: isWelcomeSlideToUse ? '100%' : '100%',
                    maxHeight: isWelcomeSlideToUse ? '100%' : '100%',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                  }}
                  onError={(e) => {
                    console.error('[Signage Rotator] Image failed to load:', item.image, e);
                    setFailedImages((prev) => new Set(prev).add(item.image!));
                  }}
                  onLoad={(e) => {
                    if (debug) {
                      console.log('[Signage Rotator] Image loaded successfully:', item.image);
                    }
                  }}
                />
                
                {isWelcomeSlideToUse && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4))',
                      transition: `opacity ${TRANSITION_DURATION}ms ease-in-out, background ${TRANSITION_DURATION}ms ease-in-out`,
                      willChange: 'opacity',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'translateZ(0)',
                      WebkitTransform: 'translateZ(0)',
                    }}
                  />
                )}
                
                {!isWelcomeSlideToUse && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      boxShadow: `inset 0 0 80px ${accentGlowColor}20, inset 0 0 40px ${accentGlowColor}10`,
                      borderRadius: '2px',
                      transition: `opacity ${TRANSITION_DURATION}ms ease-in-out, box-shadow ${TRANSITION_DURATION}ms ease-in-out`,
                      willChange: 'opacity, box-shadow',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'translateZ(0)',
                      WebkitTransform: 'translateZ(0)',
                    }}
                  />
                )}
              </div>
              
              {isWelcomeSlideToUse && (
                <>
                  <div className="absolute top-[8%] left-8 right-8 z-20">
                    <p
                      className="font-extrabold leading-[1.1] text-center"
                      style={{
                        fontSize: 'clamp(100px, 18.75vw, 225px)',
                        color: 'rgba(255, 255, 255, 1)',
                        textShadow: '0 0 40px rgba(0, 0, 0, 0.9), 0 10px 30px rgba(0, 0, 0, 0.7), 0 5px 15px rgba(0, 0, 0, 0.5)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Welcome to
                    </p>
                  </div>
                  
                  {slide.title && (
                    <div className="absolute top-[18%] left-8 right-8 z-20">
                      <h2
                        className="font-extrabold leading-[1.1] text-center"
                        style={{
                          fontSize: 'clamp(175px, 35vw, 437.5px)',
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
                    <div className="absolute top-[41%] left-8 right-8 z-20">
                      <p
                        className="font-bold leading-tight text-center"
                        style={{
                          fontSize: 'clamp(70px, 13.75vw, 150px)',
                          color: 'rgba(234, 179, 8, 1)',
                          textShadow: '0 0 30px rgba(234, 179, 8, 0.5), 0 0 15px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.6)',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {slide.subtitle}
                      </p>
                    </div>
                  )}
                  
                  {slide.body && (
                    <div className="absolute top-[49%] left-8 right-8 z-20">
                      <div className="flex flex-col items-center gap-5">
                        {slide.body.split('\n\n').map((paragraph, idx) => (
                          <p
                            key={idx}
                            className="font-semibold leading-relaxed text-center"
                            style={{
                              fontSize: idx === 0 ? 'clamp(80px, 15vw, 162.5px)' : 'clamp(60px, 11.25vw, 125px)',
                              color: 'rgba(255, 255, 255, 0.95)',
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
                  
                  <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
                    <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-white/40" />
                    <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                      <p
                        className="font-medium text-center uppercase tracking-wider"
                        style={{
                          fontSize: 'clamp(40px, 6.25vw, 70px)',
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
                      green: { var: '#228B22' },
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
                            fontSize: 'clamp(70px, 12.5vw, 140px)',
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
}
