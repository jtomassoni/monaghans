'use client';

import { marked } from 'marked';
import ReactMarkdown from 'react-markdown';
import { SlideContent } from '@/app/specials-tv/types';
import ImageSlideRenderer from './image-slide-renderer';

// Configure marked to allow HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

type TextSlideRendererProps = {
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
  hasImageItems?: boolean;
  isImageCustomSlide?: boolean;
  showBorderForImageSlide?: boolean;
};

const pageTextureUrl = '/pics/monaghans-patio.jpg';

export default function TextSlideRenderer({
  slide,
  slideProps,
  debug = false,
  failedImages,
  setFailedImages,
  TRANSITION_DURATION,
  hasImageItems = false,
  isImageCustomSlide = false,
  showBorderForImageSlide = true,
}: TextSlideRendererProps) {
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
    isWelcomeSlide,
    showLabel,
    gridColumns,
    itemCount,
    isDenseEvents,
    eventColumnCount,
    eventRowCount,
    eventRowMin,
    backgroundImageUrl,
  } = slideProps;

  const isWelcomeSlideToUse = isWelcomeSlide;

  // Debug logging
  if (debug) {
    console.log('[TextSlideRenderer] Rendering slide:', {
      slideId: slide?.id,
      source: slide?.source,
      isHappyHourSlide,
      isDrinkSlide,
      backgroundImageUrl,
      hasImageItems,
      hasItems: !!slide?.items && slide.items.length > 0,
      itemCount: slide?.items?.length || 0,
    });
  }

  // Happy Hour or Drink Slide with Background
  if (isHappyHourSlide || (isDrinkSlide && backgroundImageUrl)) {
    return (
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
        
        {/* Two-column layout */}
        <div className={`relative z-10 flex flex-row items-stretch justify-center w-full gap-8 md:gap-12 px-6 py-6 md:py-8 ${slide.footer ? 'pb-32 md:pb-40' : ''} ${(!isHappyHourSlide || !slide.items || slide.items.length === 0) && (isDrinkSlide && !isHappyHourSlide && slide.items && slide.items.length > 0) ? 'justify-center' : ''}`} style={slide.footer ? { height: 'calc(100% - 200px)' } : { height: '100%' }}>
          {/* Left Column: Happy Hour */}
          {isHappyHourSlide && (slide.subtitle || slide.title || slide.body) && (
            <div className={`flex flex-col items-center text-center min-w-0 ${slide.items && slide.items.length > 0 ? 'flex-1 max-w-[42%]' : 'max-w-[55%]'}`}>
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

              <div className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 md:p-6 shadow-lg w-full flex-1 flex flex-col justify-center" style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}`, height: slide.items && slide.items.length > 0 && isHappyHourSlide ? '85%' : '100%' }}>
                <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                  {slide.subtitle && (
                    <div
                      className="font-bold uppercase tracking-[0.15em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                      style={{ fontSize: 'clamp(59px, 10.29vw, 118px)', marginBottom: '0.15em' }}
                    >
                      {slide.subtitle}
                    </div>
                  )}
                  {slide.title && (
                    <h1
                      className="text-balance font-black leading-[0.92] tracking-tight drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)] break-words w-full"
                      style={{ fontSize: 'clamp(118px, 20.58vw, 235px)', marginTop: slide.subtitle ? '0.1em' : '0', marginBottom: slide.body ? '0.15em' : '0', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      {slide.title}
                    </h1>
                  )}
                  {slide.body && (
                    <p
                      className="w-full font-semibold leading-[1.2] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)] break-words"
                      style={{ fontSize: 'clamp(59px, 11.76vw, 118px)', marginTop: '0.1em', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      {slide.body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Vertical Divider */}
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

          {/* Right Column: Drink Specials */}
          {slide.items && slide.items.length > 0 && (
            <div className={`flex flex-col items-center text-center min-w-0 ${isHappyHourSlide && (slide.subtitle || slide.title || slide.body) ? 'flex-1 max-w-[42%]' : 'max-w-[55%]'}`}>
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
              
              <div className={`w-full flex-1 flex flex-col ${slide.footer ? 'min-h-0 overflow-hidden' : ''}`} style={{ height: slide.items && slide.items.length > 0 && isHappyHourSlide ? '85%' : '100%' }}>
                {slide.items.map((item, itemIdx) => (
                  <div
                    key={`${slide.id}-item-${itemIdx}`}
                    className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-5 md:p-6 shadow-lg w-full h-full flex flex-col justify-center"
                    style={{ boxShadow: `0 8px 32px -16px ${accentGlowColor}` }}
                  >
                    <div className="flex flex-col items-center text-center gap-3 md:gap-4">
                      <h3
                        className="font-black leading-[0.92] tracking-tight text-white drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                        style={{ fontSize: 'clamp(118px, 20.58vw, 235px)', marginBottom: (item.note || item.time || item.detail) ? '0.1em' : '0' }}
                      >
                        {item.title}
                      </h3>
                      {item.note && (
                        <p
                          className="font-semibold leading-[1.2] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)] break-words w-full"
                          style={{ fontSize: 'clamp(59px, 11.76vw, 118px)', marginTop: '0.05em', marginBottom: (item.time || item.detail) ? '0.1em' : '0', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {item.note}
                        </p>
                      )}
                      {item.time && (
                        <p
                          className="font-bold uppercase tracking-[0.15em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] break-words w-full"
                          style={{ fontSize: 'clamp(59px, 10.29vw, 118px)', marginTop: '0.05em', marginBottom: item.detail ? '0.1em' : '0', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                        >
                          {item.time}
                        </p>
                      )}
                      {item.detail && (
                        <div
                          className="mt-1 font-semibold leading-[1.2] text-white/95 drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)] break-words w-full [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-2 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-2 [&_p]:mb-2 [&_*]:break-words"
                          style={{ fontSize: 'clamp(59px, 11.76vw, 118px)', marginTop: '0.1em', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
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

        <span 
          className="absolute top-8 right-8 font-semibold text-white/70" 
          style={{ fontSize: 'clamp(42px, 7.35vw, 76px)' }}
        >
          Monaghan&apos;s
        </span>
      </div>
    );
  }

  // Standard layout for other slides
  // Fallback: if no content at all, render a placeholder
  if (!slide.title && !slide.body && !slide.items && !hasImageItems) {
    if (debug) {
      console.warn('[TextSlideRenderer] Slide has no content:', slide);
    }
    return (
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <div className="text-white text-2xl">No content to display</div>
      </div>
    );
  }

  return (
    <div 
      className={`relative z-10 flex flex-col bg-white/5 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-lg ${
        hasImageItems 
          ? (isWelcomeSlideToUse 
            ? 'w-full h-full overflow-hidden'
            : (isImageCustomSlide && !showBorderForImageSlide
              ? 'w-full h-full overflow-hidden'
              : 'w-full h-full rounded-[32px] overflow-hidden'))
          : 'h-full w-full overflow-hidden rounded-[48px]'
      }`}
      style={{
        minHeight: '100%',
        minWidth: '100%',
        padding: hasImageItems 
          ? (isWelcomeSlideToUse ? '0' : (isImageCustomSlide && !showBorderForImageSlide ? '0' : '12px'))
          : (isCustomSlide ? '12px' : undefined),
        border: hasImageItems 
          ? (isWelcomeSlideToUse ? 'none' : (isImageCustomSlide && !showBorderForImageSlide ? 'none' : `12px solid ${accentColor}`))
          : (isCustomSlide ? `8px solid ${accentColor}` : '1px solid rgba(255, 255, 255, 0.1)'),
        boxShadow: hasImageItems
          ? (isWelcomeSlideToUse 
            ? 'none'
            : (isImageCustomSlide && !showBorderForImageSlide
              ? 'none'
              : `0 0 60px ${accentGlowColor}, 0 0 120px ${accentGlowColor}40, inset 0 0 0 12px ${accentColor}, inset 0 0 20px ${accentColor}20`))
          : (isCustomSlide 
            ? `0 0 30px ${accentGlowColor}, 0 30px 120px -60px rgba(0,0,0,0.9)`
            : '0 30px 120px -60px rgba(0,0,0,0.9)'),
        boxSizing: 'border-box',
        contain: 'layout style paint',
        ...(isEventSlide ? {
          backgroundImage: `linear-gradient(135deg, rgba(5, 6, 8, 0.75), rgba(5, 6, 8, 0.85)), url(${pageTextureUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } : {})
      }}
    >
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
                  className={`text-balance font-black leading-[0.95] tracking-tight drop-shadow-[0_18px_48px_rgba(0,0,0,0.45)] break-words w-full ${isCustomSlide ? 'text-center' : ''}`}
                  style={{ 
                    fontSize: 'clamp(123px, 23.52vw, 270px)',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
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
                    className="w-full max-w-[85vw] font-semibold leading-[1.2] drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] mt-8 md:mt-12 mx-auto break-words overflow-wrap-anywhere [&_*]:text-white [&_*]:break-words [&_p]:text-[clamp(70px,13.23vw,140px)] [&_h1]:text-[clamp(83px,16.17vw,165px)] [&_p]:break-words [&_li]:break-words [&_span]:break-words"
                    style={{ fontSize: 'clamp(70px, 13.23vw, 140px)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  >
                    <ReactMarkdown
                      components={{
                        ul: ({ children }) => (
                          <ul style={{ listStyle: 'none', paddingLeft: 0, margin: '1em 0', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            {children}
                          </ul>
                        ),
                        li: ({ children }) => (
                          <li style={{ marginBottom: '1.2em', paddingLeft: '1.8em', position: 'relative', listStyle: 'none', display: 'block', textAlign: 'left', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            <span style={{ position: 'absolute', left: 0, color: accentColor, fontWeight: 'bold', fontSize: '1.3em', lineHeight: '1.2' }}>•</span>
                            <span style={{ color: 'white', display: 'inline-block', marginLeft: '0.5em', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{children}</span>
                          </li>
                        ),
                        p: ({ children }) => (
                          <p style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', marginBottom: '0.5em' }}>{children}</p>
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

            // Calculate the starting column for the last row to center it
            const lastRowStartCol = hasIncompleteLastRow && eventColumnCount && itemsInLastRow > 0
              ? Math.floor((eventColumnCount - itemsInLastRow) / 2) + 1
              : 1;

            return (
              <div
                className={`grid flex-1 ${isEventSlide ? 'gap-8 md:gap-12' : 'gap-5 md:gap-7'}`}
                style={{
                  gridAutoRows: gridColumns === 'event' ? `minmax(${eventRowMin || 0}px, 1fr)` : 'minmax(250px, 1fr)',
                  gridTemplateColumns:
                    gridColumns === 'event'
                      ? `repeat(${eventColumnCount}, minmax(0, 1fr))`
                      : 'repeat(auto-fit, minmax(300px, 1fr))',
                  gridTemplateRows: gridColumns === 'event' && eventRowCount ? `repeat(${eventRowCount}, minmax(0, 1fr))` : undefined,
                  alignContent: 'stretch',
                }}
              >
                {slide.items.map((item, itemIdx) => {
                  const isLastRowItem = isEventSlide && itemIdx >= lastRowStartIdx;
                  let gridColumnStyle: string | undefined;
                  
                  if (isEventSlide && eventColumnCount) {
                    if (isLastRowItem && hasIncompleteLastRow) {
                      // If there's exactly one item in the last row (odd number of events), make it full width
                      if (itemsInLastRow === 1) {
                        gridColumnStyle = `1 / ${eventColumnCount + 1}`;
                      } else {
                        // For incomplete last row with multiple items, center the items
                        const positionInLastRow = itemIdx - lastRowStartIdx;
                        const startCol = lastRowStartCol + positionInLastRow;
                        const endCol = startCol + 1;
                        gridColumnStyle = `${startCol} / ${endCol}`;
                      }
                    } else {
                      // For regular rows, use normal column positioning
                      const positionInRow = itemIdx % eventColumnCount;
                      const startCol = positionInRow + 1;
                      const endCol = startCol + 1;
                      gridColumnStyle = `${startCol} / ${endCol}`;
                    }
                  }

                  const padding = isDenseEvents ? 'p-5 md:p-6' : 'p-6 md:p-8';
                  const titleSize = isDenseEvents 
                    ? 'clamp(77px, 14.11vw, 136px)' 
                    : 'clamp(83px, 15.88vw, 153px)';
                  const noteSize = isDenseEvents 
                    ? 'clamp(53px, 11.17vw, 77px)' 
                    : 'clamp(59px, 12.35vw, 88px)';
                  const timeSize = isDenseEvents 
                    ? 'clamp(53px, 11.17vw, 77px)' 
                    : 'clamp(59px, 11.76vw, 83px)';
                  const detailSize = isDenseEvents 
                    ? 'clamp(53px, 11.17vw, 77px)' 
                    : 'clamp(59px, 12.94vw, 88px)';

                  return isEventSlide ? (
                    <div
                      key={`${slide.id}-${itemIdx}`}
                      className={`relative flex flex-col h-full overflow-hidden rounded-3xl border border-white/14 ${padding} shadow-[0_18px_70px_-48px_rgba(0,0,0,0.85)]`}
                      style={{ 
                        boxShadow: `0 10px 40px -32px ${accentGlowColor}`,
                        gridColumn: gridColumnStyle,
                      }}
                    >
                      <div className="absolute inset-0 bg-black/70 rounded-3xl"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/70 to-black/70 backdrop-blur-md rounded-3xl"></div>
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background: `radial-gradient(circle at 18% 20%, ${accentSurfaceColor}, transparent 40%), radial-gradient(circle at 82% 8%, ${accentSurfaceColor}, transparent 34%)`,
                          opacity: '0.2',
                          willChange: 'transform',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'translateZ(0)',
                          WebkitTransform: 'translateZ(0)',
                        }}
                      />
                      <div className="relative flex-1 flex flex-col items-center justify-center text-center min-h-0 gap-4 md:gap-5 w-full px-2">
                        <p
                          className="font-extrabold leading-[1.15] text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] break-words w-full"
                          style={{ 
                            fontSize: titleSize,
                            lineHeight: '1.15',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.title}
                        </p>
                        {item.time && (
                          <p
                            className="font-semibold leading-[1.3] break-words w-full"
                            style={{ 
                              fontSize: isDenseEvents ? 'clamp(48px, 9.41vw, 70px)' : 'clamp(50px, 10vw, 77px)',
                              color: accentColor,
                              textShadow: `0 4px 12px ${accentGlowColor}`,
                            }}
                          >
                            {item.time}
                          </p>
                        )}
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
                        isFoodSlide ? (
                          <div className="relative flex flex-row h-full w-full gap-8 md:gap-10">
                            <div className="relative flex-1 flex flex-col justify-center min-w-0 pr-2">
                              <div className="flex flex-col items-center text-center gap-5 md:gap-6">
                                {item.title && item.title.trim() && item.title.trim() !== slide.title?.trim() && (
                      <h3
                        className="font-extrabold leading-[1.08] break-words w-full"
                        style={{ 
                          fontSize: 'clamp(118px, 22.05vw, 252px)',
                          color: 'rgba(255, 255, 255, 1)',
                          textShadow: '0 0 20px rgba(255, 255, 255, 0.3), 0 6px 18px rgba(0,0,0,0.6)',
                          marginBottom: (item.note || item.detail) ? '0.15em' : '0',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {item.title}
                      </h3>
                                )}
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
                                {item.note && (
                                  <p
                                    className="font-semibold leading-[1.25] break-words w-full"
                                    style={{ 
                                      fontSize: 'clamp(83px, 16.17vw, 140px)',
                                      color: 'rgba(251, 191, 36, 0.95)',
                                      textShadow: '0 3px 12px rgba(251, 191, 36, 0.5)',
                                      marginTop: item.title ? '0.1em' : '0',
                                      marginBottom: item.detail ? '0.15em' : '0',
                                      wordBreak: 'break-word',
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {item.note}
                                  </p>
                                )}
                                {item.detail && (
                                  <p
                                    className="font-semibold leading-[1.4] break-words w-full"
                                    style={{ 
                                      fontSize: 'clamp(70px, 13.23vw, 118px)',
                                      color: 'rgba(147, 197, 253, 0.9)',
                                      textShadow: '0 2px 8px rgba(147, 197, 253, 0.3)',
                                      marginTop: (item.title || item.note) ? '0.1em' : '0',
                                      wordBreak: 'break-word',
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {item.detail}
                                  </p>
                                )}
                              </div>
                            </div>
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
                          <div className={`relative flex flex-col items-center ${isCustomSlide ? 'justify-start w-full' : 'justify-center h-full w-full'} ${isCustomSlide ? 'gap-1 md:gap-2' : 'gap-3 md:gap-4 2xl:gap-6'}`}>
                            {!isCustomSlide && (
                            <div className="relative flex-none 2xl:flex-1 flex flex-col min-w-0 2xl:justify-center pr-0 2xl:pr-2 text-center 2xl:text-left w-full 2xl:w-auto">
                              <div className="flex items-center 2xl:items-start justify-center 2xl:justify-start gap-3 mb-1 2xl:mb-4 flex-wrap px-2 2xl:px-0">
                                {item.title && item.title.trim() && item.title.trim() !== slide.title?.trim() && (
                                  <p
                                    className="font-extrabold leading-[1.1] flex-1 break-words w-full"
                                    style={{ 
                                      fontSize: 'clamp(94px, 17.64vw, 211px)',
                                      color: 'rgba(255, 255, 255, 1)',
                                      textShadow: '0 6px 18px rgba(0,0,0,0.6)',
                                      wordBreak: 'break-word',
                                      overflowWrap: 'anywhere',
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
                                  className="relative mb-2 md:mb-2 2xl:mb-3 overflow-hidden font-semibold leading-[1.2] px-2 2xl:px-0 break-words w-full"
                                  style={{ 
                                    fontSize: 'clamp(90px, 18.52vw, 165px)',
                                    color: 'rgba(255, 255, 255, 0.95)',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere',
                                  }}
                                >
                                  {item.note}
                                </p>
                              )}
                              {item.detail && (
                                <p
                                  className="relative overflow-hidden leading-[1.4] flex-1 px-2 2xl:px-0 mb-0 2xl:mb-0 break-words w-full"
                                  style={{ 
                                    fontSize: 'clamp(74px, 15.64vw, 139px)',
                                    color: 'rgba(255, 255, 255, 0.85)',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere',
                                  }}
                                >
                                  {item.detail}
                                </p>
                              )}
                            </div>
                            )}
                            <div className={`relative flex flex-col items-center justify-center flex-shrink-0 ${
                              hasImageItems 
                                ? 'w-full h-full'
                                : 'w-full 2xl:w-[85%] 2xl:min-w-[600px] 2xl:max-w-[1400px] h-[60%] 2xl:h-[85%] min-h-[450px] md:min-h-[500px] 2xl:min-h-[600px] rounded-3xl border-2 border-white/30 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.95)] mt-6 md:mt-8 2xl:mt-0'
                            }`}>
                              <div className={`relative w-full h-full overflow-hidden flex items-center justify-center ${
                                hasImageItems 
                                  ? ''
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
                        <div className="relative flex flex-col items-center justify-center h-full text-center gap-6 md:gap-8 px-6">
                          <div className="flex flex-col items-center gap-5 md:gap-6">
                            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
                              <p
                                className="font-extrabold leading-[1.08] break-words w-full"
                                style={{ 
                                  fontSize: 'clamp(110px, 21vw, 220px)',
                                  color: isFoodSlide ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 1)',
                                  textShadow: isFoodSlide 
                                    ? '0 0 24px rgba(255, 255, 255, 0.35), 0 8px 24px rgba(0,0,0,0.5)' 
                                    : '0 8px 24px rgba(0,0,0,0.5)',
                                  marginBottom: (item.note || item.detail) ? '0.1em' : '0',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
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
                                className="relative overflow-hidden font-semibold leading-[1.25] drop-shadow-[0_6px_20px_rgba(0,0,0,0.4)] break-words w-full"
                                style={{ 
                                  fontSize: 'clamp(84px, 15.75vw, 140px)',
                                  color: isFoodSlide ? 'rgba(251, 191, 36, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                  textShadow: isFoodSlide ? '0 4px 16px rgba(251, 191, 36, 0.5)' : '0 6px 20px rgba(0,0,0,0.4)',
                                  marginTop: item.title ? '0.1em' : '0',
                                  marginBottom: item.detail ? '0.1em' : '0',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {item.note}
                              </p>
                            )}
                            {item.detail && (
                              <p
                                className="relative overflow-hidden leading-[1.4] drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)] max-w-4xl break-words w-full"
                                style={{ 
                                  fontSize: 'clamp(63px, 12.6vw, 105px)',
                                  color: isFoodSlide ? 'rgba(147, 197, 253, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                  textShadow: isFoodSlide ? '0 3px 12px rgba(147, 197, 253, 0.35)' : '0 4px 16px rgba(0,0,0,0.35)',
                                  marginTop: (item.title || item.note) ? '0.1em' : '0',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
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
      
      {/* Render items for image-based slides (full screen) - only if hasImageItems */}
      {hasImageItems && slide.items && slide.items.length > 0 && (
        <ImageSlideRenderer
          slide={slide}
          slideProps={slideProps}
          debug={debug}
          failedImages={failedImages}
          setFailedImages={setFailedImages}
          TRANSITION_DURATION={TRANSITION_DURATION}
        />
      )}
    </div>
  );
}
