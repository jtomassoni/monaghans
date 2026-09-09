'use client';

import { forwardRef, useState } from 'react';
import Link from 'next/link';
import AnnouncementRichText from '@/components/announcement-rich-text';
import type { PublicAnnouncement } from '@/lib/announcements';

type AnnouncementNoticeBarProps = {
  announcements: PublicAnnouncement[];
  onDismiss: (id: string) => void;
};

const AnnouncementNoticeBar = forwardRef<HTMLDivElement, AnnouncementNoticeBarProps>(
  function AnnouncementNoticeBar({ announcements, onDismiss }, ref) {
    const [index, setIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);

    if (announcements.length === 0) return null;

    const safeIndex = index % announcements.length;
    const announcement = announcements[safeIndex];
    const hasMultiple = announcements.length > 1;
    const hasBody = Boolean(announcement.body?.trim());
    const hasCta = Boolean(announcement.ctaText && announcement.ctaUrl);

    function showNext() {
      setExpanded(false);
      setIndex((current) => (current + 1) % announcements.length);
    }

    return (
      <div
        ref={ref}
        className="fixed top-0 left-0 right-0 z-30 border-b border-amber-300/40 bg-[#d4af37] text-black shadow-md"
        role="region"
        aria-label="Site announcement"
      >
        <div className="mx-auto flex max-w-6xl items-start gap-2 px-3 py-2 sm:items-center sm:px-4 sm:py-2.5">
          <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black/10 sm:mt-0" aria-hidden="true">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <p className="text-sm font-bold leading-snug sm:truncate">
                {announcement.title}
              </p>
              {hasBody && !expanded ? (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="w-fit text-left text-xs font-semibold underline-offset-2 hover:underline"
                >
                  Details
                </button>
              ) : null}
              {hasCta ? (
                <Link
                  href={announcement.ctaUrl!}
                  className="inline-flex w-fit flex-shrink-0 items-center rounded-full bg-black px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-black/80"
                >
                  {announcement.ctaText}
                </Link>
              ) : null}
            </div>
            {hasBody && expanded ? (
              <AnnouncementRichText
                body={announcement.body}
                className="mt-1 text-xs leading-relaxed [&_a]:underline [&_p]:mb-1 [&_p:last-child]:mb-0 [&_ul]:ml-4 [&_ul]:list-disc"
              />
            ) : null}
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            {hasMultiple ? (
              <button
                type="button"
                onClick={showNext}
                className="rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide hover:bg-black/10"
                aria-label="Show next announcement"
              >
                {safeIndex + 1}/{announcements.length}
              </button>
            ) : null}
            {announcement.dismissable ? (
              <button
                type="button"
                onClick={() => {
                  onDismiss(announcement.id);
                  setExpanded(false);
                  setIndex(0);
                }}
                className="rounded-md p-1.5 hover:bg-black/10"
                aria-label="Dismiss announcement"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
);

export default AnnouncementNoticeBar;
