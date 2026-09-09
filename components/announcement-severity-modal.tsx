'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import AnnouncementRichText from '@/components/announcement-rich-text';
import type { PublicAnnouncement } from '@/lib/announcements';

type AnnouncementSeverityModalProps = {
  announcement: PublicAnnouncement;
  onDismiss: (id: string) => void;
};

export default function AnnouncementSeverityModal({
  announcement,
  onDismiss,
}: AnnouncementSeverityModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const hasCta = Boolean(announcement.ctaText && announcement.ctaUrl);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onDismiss(announcement.id);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [announcement.id, onDismiss]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-modal-title"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-amber-400/40 bg-neutral-950 shadow-2xl shadow-black/50"
      >
        <div className="border-b border-amber-400/30 bg-amber-500/10 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">
            Important
          </p>
          <h2
            id="announcement-modal-title"
            className="mt-1 text-xl font-bold leading-tight text-white sm:text-2xl"
          >
            {announcement.title}
          </h2>
        </div>

        <div className="px-5 py-4 sm:px-6">
          {announcement.body ? (
            <AnnouncementRichText
              body={announcement.body}
              className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-white/90 [&_a]:text-amber-300 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:ml-4 [&_ul]:list-disc"
            />
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              ref={closeRef}
              type="button"
              onClick={() => onDismiss(announcement.id)}
              className="min-h-[44px] rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Got it
            </button>
            {hasCta ? (
              <Link
                href={announcement.ctaUrl!}
                onClick={() => onDismiss(announcement.id)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-amber-300"
              >
                {announcement.ctaText}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
