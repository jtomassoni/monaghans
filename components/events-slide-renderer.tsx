'use client';

import { marked } from 'marked';
import { Instrument_Serif, DM_Sans } from 'next/font/google';
import { SlideContent } from '@/app/specials-tv/types';

const displayFont = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

const sansFont = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
});

marked.setOptions({
  breaks: true,
  gfm: true,
});

type EventsSlideRendererProps = {
  slide: SlideContent;
  slideProps: {
    accentColor: string;
    itemCount: number;
    isDenseEvents: boolean;
    eventColumnCount?: number;
    eventRowCount?: number;
  };
};

type ParsedDate = {
  weekday: string;
  month: string;
  day: string;
};

function parseEventDate(note?: string): ParsedDate | null {
  if (!note) return null;
  const match = note.match(/^([A-Za-z]+),\s+([A-Za-z]+)\s+(\d{1,2})/);
  if (!match) return null;
  return {
    weekday: match[1].slice(0, 3).toUpperCase(),
    month: match[2].slice(0, 3).toUpperCase(),
    day: match[3],
  };
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function EventsSlideRenderer({
  slide,
  slideProps,
}: EventsSlideRendererProps) {
  const {
    accentColor,
    itemCount,
    isDenseEvents,
    eventColumnCount = 2,
    eventRowCount = 1,
  } = slideProps;

  const items = slide.items || [];
  const columns = Math.min(eventColumnCount, 2);
  const dense = isDenseEvents || itemCount >= 5;

  const itemsInLastRow =
    itemCount > 0 ? itemCount - (eventRowCount - 1) * columns : 0;
  const hasIncompleteLastRow = itemsInLastRow > 0 && itemsInLastRow < columns;
  const lastRowStartIdx = itemCount > 0 ? (eventRowCount - 1) * columns : 0;
  const lastRowStartCol =
    hasIncompleteLastRow && itemsInLastRow > 0
      ? Math.floor((columns - itemsInLastRow) / 2) + 1
      : 1;

  const titleSize = dense
    ? 'clamp(28px, 3.4vw, 42px)'
    : itemCount <= 2
      ? 'clamp(40px, 5vw, 64px)'
      : 'clamp(32px, 3.8vw, 48px)';
  const detailSize = dense
    ? 'clamp(18px, 1.9vw, 24px)'
    : 'clamp(20px, 2.2vw, 28px)';
  const timeSize = dense
    ? 'clamp(18px, 1.9vw, 24px)'
    : 'clamp(20px, 2.2vw, 28px)';
  const dateWeekdaySize = dense
    ? 'clamp(24px, 2.6vw, 32px)'
    : 'clamp(28px, 3vw, 38px)';
  const dateDaySize = dense
    ? 'clamp(48px, 5.2vw, 72px)'
    : itemCount <= 2
      ? 'clamp(64px, 6.5vw, 96px)'
      : 'clamp(52px, 5.6vw, 80px)';

  return (
    <div
      className={`relative z-10 flex h-full w-full flex-col overflow-hidden ${sansFont.className}`}
      style={{
        background:
          'radial-gradient(ellipse 90% 70% at 12% 0%, rgba(220, 38, 38, 0.08), transparent 55%), radial-gradient(ellipse 70% 60% at 100% 100%, rgba(220, 38, 38, 0.04), transparent 50%), linear-gradient(165deg, #0c0d10 0%, #07080a 48%, #050608 100%)',
        boxSizing: 'border-box',
        contain: 'layout style paint',
      }}
    >
      {/* Soft atmospheric photo — kept quiet so type stays king */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.09]"
        style={{
          backgroundImage: 'url(/pics/monaghans-patio.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(0.45) contrast(1.08) brightness(0.7)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-black/78 to-black/92" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      <header className="relative z-10 flex flex-shrink-0 items-end justify-between gap-8 px-10 pt-9 pb-5 md:px-14 md:pt-11 md:pb-6">
        <div className="min-w-0">
          <p
            className="mb-2 font-medium uppercase tracking-[0.35em] text-white/45"
            style={{ fontSize: 'clamp(12px, 1.35vw, 16px)' }}
          >
            Monaghan&apos;s
          </p>
          <h1
            className={`${displayFont.className} leading-none text-white`}
            style={{
              fontSize: 'clamp(42px, 5.8vw, 72px)',
              letterSpacing: '-0.02em',
            }}
          >
            {slide.label || 'Upcoming Events'}
          </h1>
          <div
            className="mt-4 h-px w-24"
            style={{
              background: `linear-gradient(90deg, ${accentColor}, transparent)`,
            }}
          />
        </div>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-8 pb-8 md:px-12 md:pb-10">
        <div
          className="grid min-h-0 flex-1 gap-5 md:gap-6"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${eventRowCount}, minmax(0, 1fr))`,
            alignContent: 'stretch',
          }}
        >
          {items.map((item, itemIdx) => {
            const parsed = parseEventDate(item.note);
            const isLastRowItem = itemIdx >= lastRowStartIdx;
            let gridColumnStyle: string | undefined;

            if (isLastRowItem && hasIncompleteLastRow) {
              if (itemsInLastRow === 1) {
                gridColumnStyle = `1 / ${columns + 1}`;
              } else {
                const positionInLastRow = itemIdx - lastRowStartIdx;
                const startCol = lastRowStartCol + positionInLastRow;
                gridColumnStyle = `${startCol} / ${startCol + 1}`;
              }
            } else {
              const positionInRow = itemIdx % columns;
              gridColumnStyle = `${positionInRow + 1} / ${positionInRow + 2}`;
            }

            const detailHtml = item.detail ? String(marked.parse(item.detail)) : '';
            const detailText = detailHtml ? stripHtmlToText(detailHtml) : '';

            return (
              <article
                key={`${slide.id}-${itemIdx}`}
                className="animate-events-card-in relative flex min-h-0 overflow-hidden"
                style={{
                  gridColumn: gridColumnStyle,
                  animationDelay: `${itemIdx * 70}ms`,
                }}
              >
                <div
                  className="absolute inset-y-3 left-0 z-10 w-[3px] rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <div
                  className="relative flex min-h-0 w-full gap-5 rounded-sm border py-5 pl-6 pr-5 md:gap-6 md:py-6 md:pl-7 md:pr-6 backdrop-blur-[2px]"
                  style={{
                    borderColor: `${accentColor}40`,
                    background: `
                      radial-gradient(ellipse 90% 120% at 0% 50%, ${accentColor}2e 0%, transparent 55%),
                      linear-gradient(145deg, ${accentColor}1f 0%, transparent 55%),
                      linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%),
                      rgba(28, 16, 16, 0.82)
                    `,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 14px 44px -22px ${accentColor}55`,
                  }}
                >
                  {/* Date column — primary scan cue from across the room */}
                  <div className="flex w-[5rem] flex-shrink-0 flex-col items-start justify-center md:w-[6rem]">
                    {parsed ? (
                      <>
                        <span
                          className="font-semibold uppercase tracking-[0.18em]"
                          style={{
                            fontSize: dateWeekdaySize,
                            color: accentColor,
                          }}
                        >
                          {parsed.weekday}
                        </span>
                        <span
                          className={`${displayFont.className} leading-none text-white`}
                          style={{ fontSize: dateDaySize }}
                        >
                          {parsed.day}
                        </span>
                        <span
                          className="mt-1 font-medium uppercase tracking-[0.16em] text-white/40"
                          style={{ fontSize: 'clamp(12px, 1.3vw, 16px)' }}
                        >
                          {parsed.month}
                        </span>
                      </>
                    ) : (
                      <span
                        className="font-semibold leading-snug text-white/70"
                        style={{ fontSize: timeSize }}
                      >
                        {item.note}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-2 md:gap-2.5">
                    <h2
                      className="font-semibold leading-[1.12] tracking-tight text-white"
                      style={{
                        fontSize: titleSize,
                        display: '-webkit-box',
                        WebkitLineClamp: dense ? 2 : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.title}
                    </h2>

                    {item.time && (
                      <p
                        className="font-medium tabular-nums tracking-wide text-white/70"
                        style={{ fontSize: timeSize }}
                      >
                        {item.time.replace(' - ', ' – ')}
                      </p>
                    )}

                    {detailText && (
                      <p
                        className="leading-snug text-white/55"
                        style={{
                          fontSize: detailSize,
                          display: '-webkit-box',
                          WebkitLineClamp: dense ? 2 : 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {detailText}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
