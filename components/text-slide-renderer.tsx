'use client';

import { marked } from 'marked';
import ReactMarkdown from 'react-markdown';
import { SlideContent } from '@/app/specials-tv/types';
import EventsSlideRenderer from './events-slide-renderer';
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

  // Dedicated TV-optimized events board
  if (isEventSlide) {
    return (
      <EventsSlideRenderer
        slide={slide}
        slideProps={{
          accentColor,
          itemCount,
          isDenseEvents,
          eventColumnCount,
          eventRowCount,
        }}
      />
    );
  }

  // Happy Hour / Drink slide — drinks are the story; happy hour is a fixed reminder stamp
  if (isHappyHourSlide || (isDrinkSlide && backgroundImageUrl)) {
    const hasHappyHour = Boolean(isHappyHourSlide && (slide.subtitle || slide.title || slide.body));
    const drinkItems = slide.items?.length ? slide.items : [];
    const hasDrinks = drinkItems.length > 0;
    const drinksAreHero = hasDrinks;
    const bogoLabel = /buy one get one|bogo/i.test(slide.title || '') ? 'BOGO' : (slide.title || 'BOGO');
    const bogoDetail = slide.body
      ? slide.body.replace(/^BOGO on\s+/i, '').replace(/\s*[,&]\s*/g, ' · ')
      : null;

    return (
      <div 
        className="relative z-10 flex h-full w-full overflow-hidden rounded-[40px] border border-white/10 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)]"
        style={{
          backgroundImage: backgroundImageUrl
            ? `linear-gradient(100deg, rgba(8,6,4,0.55) 0%, rgba(8,6,4,0.32) 45%, rgba(8,6,4,0.4) 100%), url(${backgroundImageUrl})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          boxSizing: 'border-box',
          contain: 'layout style paint',
        }}
      >
        {drinksAreHero ? (
          <div className={`relative z-10 flex h-full w-full flex-col items-center justify-center px-6 py-6 md:px-10 md:py-8 ${hasHappyHour ? 'pb-32 md:pb-36' : ''}`}>
            {/* Drink special — lighter frosted panel so the photo stays visible */}
            <div
              className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/20 px-8 py-8 md:px-12 md:py-10"
              style={{
                background: 'rgba(8, 6, 4, 0.42)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 60px -28px rgba(0,0,0,0.55)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              }}
            >
              <div
                className="pointer-events-none absolute left-0 top-0 h-full w-1.5"
                style={{ background: `linear-gradient(180deg, ${accentColor}, ${accentColor}40)` }}
              />

              <p
                className="mb-4 font-bold uppercase tracking-[0.28em] text-white/70 drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
                style={{ fontSize: 'clamp(15px, 1.8vw, 22px)' }}
              >
                Today&apos;s drink special
              </p>

              <div className="flex flex-col gap-5 md:gap-6">
                {drinkItems.map((item, itemIdx) => {
                  const genericTitle = !item.title || /^drink specials?$/i.test(item.title.trim());
                  const headline = genericTitle && item.note ? item.note : item.title;
                  const supportingNote = genericTitle && item.note ? undefined : item.note;

                  return (
                    <div key={`${slide.id}-item-${itemIdx}`} className="flex flex-col gap-5">
                      <h1
                        className="w-full text-balance break-words font-black leading-[0.9] tracking-tight text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
                        style={{ fontSize: 'clamp(52px, 7.5vw, 100px)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                      >
                        {headline}
                      </h1>

                      {supportingNote && (
                        <div
                          className="w-full rounded-2xl border border-white/15 px-6 py-5 md:px-8 md:py-6"
                          style={{
                            background: `linear-gradient(135deg, ${accentColor}38, rgba(0,0,0,0.28))`,
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <p
                            className="break-words font-bold leading-snug text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
                            style={{ fontSize: 'clamp(32px, 4.4vw, 54px)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                          >
                            {supportingNote}
                          </p>
                        </div>
                      )}

                      {item.time && (
                        <p
                          className="font-bold uppercase tracking-[0.16em] text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                          style={{ fontSize: 'clamp(16px, 2vw, 22px)' }}
                        >
                          {item.time}
                        </p>
                      )}

                      {item.detail && (
                        <div
                          className="w-full break-words font-medium leading-snug text-white/90 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] [&_ul]:ml-5 [&_ul]:list-disc [&_p]:mb-1 [&_*]:break-words"
                          style={{ fontSize: 'clamp(22px, 3vw, 36px)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                          dangerouslySetInnerHTML={{ __html: marked.parse(item.detail) }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {slide.footer && (
                <p
                  className="mt-6 border-t border-white/15 pt-4 font-medium tracking-wide text-white/60"
                  style={{ fontSize: 'clamp(15px, 1.7vw, 20px)' }}
                >
                  {slide.footer}
                </p>
              )}
            </div>

            {/* Happy Hour — noticeable reminder bar (servers fill in details) */}
            {hasHappyHour && (
              <aside
                className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-full border border-amber-200/45 bg-black/55 px-7 py-3.5 text-center shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md md:bottom-12 md:gap-5 md:px-9 md:py-4"
                aria-label="Happy Hour reminder"
              >
                <span
                  className="font-black uppercase tracking-[0.2em] text-amber-200"
                  style={{ fontSize: 'clamp(16px, 2vw, 22px)' }}
                >
                  Happy Hour
                </span>
                <span className="h-6 w-px bg-white/30" aria-hidden />
                <span
                  className="font-bold text-white"
                  style={{ fontSize: 'clamp(18px, 2.3vw, 26px)' }}
                >
                  {bogoLabel}
                  {bogoDetail ? ` · ${bogoDetail}` : ''}
                </span>
                {slide.subtitle && (
                  <>
                    <span className="h-6 w-px bg-white/30" aria-hidden />
                    <span
                      className="font-semibold uppercase tracking-[0.08em] text-white/85"
                      style={{ fontSize: 'clamp(15px, 1.85vw, 20px)' }}
                    >
                      {slide.subtitle}
                    </span>
                  </>
                )}
              </aside>
            )}
          </div>
        ) : hasHappyHour ? (
          /* Happy hour alone — still a board, not twin cards */
          <div className="relative z-10 flex h-full w-full items-center justify-center p-8 md:p-12">
            <div
              className="flex w-full max-w-4xl flex-col items-center rounded-[28px] border border-white/15 px-10 py-12 text-center md:px-16 md:py-14"
              style={{
                background:
                  'linear-gradient(165deg, rgba(12,10,8,0.82) 0%, rgba(18,14,12,0.72) 55%, rgba(10,8,6,0.78) 100%)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.1), 0 24px 60px -28px rgba(0,0,0,0.75)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              }}
            >
              <p
                className="mb-4 font-bold uppercase tracking-[0.28em] text-amber-200/90"
                style={{ fontSize: 'clamp(14px, 1.8vw, 20px)' }}
              >
                Every day
              </p>
              <h1
                className="font-black uppercase tracking-tight text-white"
                style={{ fontSize: 'clamp(48px, 8vw, 96px)' }}
              >
                Happy Hour
              </h1>
              {slide.title && (
                <p
                  className="mt-4 font-black text-white"
                  style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
                >
                  {slide.title}
                </p>
              )}
              {slide.body && (
                <p
                  className="mt-3 max-w-3xl font-semibold text-white/90"
                  style={{ fontSize: 'clamp(20px, 2.8vw, 34px)' }}
                >
                  {slide.body}
                </p>
              )}
              {slide.subtitle && (
                <p
                  className="mt-6 font-bold uppercase tracking-[0.16em] text-amber-200/90"
                  style={{ fontSize: 'clamp(16px, 2.2vw, 26px)' }}
                >
                  {slide.subtitle}
                </p>
              )}
            </div>
          </div>
        ) : null}

        <span 
          className="absolute top-5 right-6 z-30 font-semibold text-white/45 md:top-6 md:right-8" 
          style={{ fontSize: 'clamp(12px, 1.5vw, 18px)' }}
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
                style={{ backgroundColor: accentColor, boxShadow: `0 0 0 2px ${accentColor}`, fontSize: 'clamp(21px, 3.9vw, 41px)' }}
              >
                {slide.label}
              </span>
            )}
            {!isCustomSlide && !isEventSlide && slide.subtitle && (
              <span
                className={`font-semibold uppercase tracking-[0.12em] text-white/80 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)] ${isFoodSlide ? 'self-start' : ''}`}
                style={{ fontSize: 'clamp(20px, 4.1vw, 43px)' }}
              >
                {slide.subtitle}
              </span>
            )}
          </div>
          <div className={`flex flex-col ${isFoodSlide ? 'items-end justify-start gap-3' : ''}`}>
            <span className="font-semibold text-white/70" style={{ fontSize: 'clamp(21px, 3.9vw, 41px)' }}>
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
                  style={{ fontSize: 'clamp(14px, 2.5vw, 23px)' }}
                >
                  {slide.subtitle}
                </p>
              )}
              {slide.title && (
                <h1
                  className={`text-balance font-black leading-[0.95] tracking-tight drop-shadow-[0_18px_48px_rgba(0,0,0,0.45)] break-words w-full ${isCustomSlide ? 'text-center' : ''}`}
                  style={{ 
                    fontSize: 'clamp(41px, 7.8vw, 90px)',
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
                    className="w-full max-w-[85vw] font-semibold leading-[1.2] drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)] mt-8 md:mt-12 mx-auto break-words overflow-wrap-anywhere [&_*]:text-white [&_*]:break-words [&_p]:text-[clamp(23px,4.4vw,47px)] [&_h1]:text-[clamp(28px,5.4vw,55px)] [&_p]:break-words [&_li]:break-words [&_span]:break-words"
                    style={{ fontSize: 'clamp(23px, 4.4vw, 47px)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
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
                      fontSize: 'clamp(26px, 5.5vw, 53px)',
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
                    fontSize: 'clamp(18px, 3.4vw, 31px)',
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
                    ? 'clamp(26px, 4.7vw, 45px)' 
                    : 'clamp(28px, 5.3vw, 51px)';
                  const noteSize = isDenseEvents 
                    ? 'clamp(18px, 3.7vw, 26px)' 
                    : 'clamp(20px, 4.1vw, 29px)';
                  const timeSize = isDenseEvents 
                    ? 'clamp(18px, 3.7vw, 26px)' 
                    : 'clamp(20px, 3.9vw, 28px)';
                  const detailSize = isDenseEvents 
                    ? 'clamp(18px, 3.7vw, 26px)' 
                    : 'clamp(20px, 4.3vw, 29px)';

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
                              fontSize: isDenseEvents ? 'clamp(16px, 3.1vw, 23px)' : 'clamp(17px, 3.3vw, 26px)',
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
                          fontSize: 'clamp(39px, 7.4vw, 84px)',
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
                                      fontSize: 'clamp(17px, 3.2vw, 28px)',
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
                                      fontSize: 'clamp(28px, 5.4vw, 47px)',
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
                                      fontSize: 'clamp(23px, 4.4vw, 39px)',
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
                                      fontSize: 'clamp(31px, 5.9vw, 70px)',
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
                                      fontSize: 'clamp(25px, 4.8vw, 39px)',
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
                                    fontSize: 'clamp(30px, 6.2vw, 55px)',
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
                                    fontSize: 'clamp(25px, 5.2vw, 46px)',
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
                                  fontSize: 'clamp(37px, 7vw, 73px)',
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
                            </div>
                            {item.note && (
                              <p
                                className="relative overflow-hidden font-semibold leading-[1.25] drop-shadow-[0_6px_20px_rgba(0,0,0,0.4)] break-words w-full"
                                style={{ 
                                  fontSize: 'clamp(28px, 5.3vw, 47px)',
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
                                  fontSize: 'clamp(21px, 4.2vw, 35px)',
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
