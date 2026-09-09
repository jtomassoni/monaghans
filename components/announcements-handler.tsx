'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import AnnouncementNoticeBar from '@/components/announcement-notice-bar';
import AnnouncementSeverityModal from '@/components/announcement-severity-modal';
import {
  persistDismissedAnnouncementId,
  readDismissedAnnouncementIds,
} from '@/lib/announcement-dismissals';
import type { PublicAnnouncement } from '@/lib/announcements';

function isPublicPath(pathname: string | null) {
  if (!pathname) return true;
  return (
    !pathname.startsWith('/admin') &&
    pathname !== '/timeclock' &&
    pathname !== '/specials-tv'
  );
}

export default function AnnouncementsHandler({
  announcements,
}: {
  announcements: PublicAnnouncement[];
}) {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const visibleOnThisRoute = isPublicPath(pathname);

  useLayoutEffect(() => {
    setDismissedIds(new Set(readDismissedAnnouncementIds()));
    setReady(true);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    persistDismissedAnnouncementId(id);
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const visible = announcements.filter((announcement) => !dismissedIds.has(announcement.id));
  const notices = visible.filter((announcement) => !announcement.isHighSeverity);
  const highSeverity = visible.filter((announcement) => announcement.isHighSeverity);
  const currentModal = visibleOnThisRoute && ready ? highSeverity[0] ?? null : null;
  const showBar = visibleOnThisRoute && ready && notices.length > 0 && !currentModal;

  useLayoutEffect(() => {
    if (!showBar) {
      document.documentElement.style.setProperty('--notice-bar-h', '0px');
      return;
    }

    const el = barRef.current;
    if (!el) {
      document.documentElement.style.setProperty('--notice-bar-h', '0px');
      return;
    }

    const applyHeight = () => {
      document.documentElement.style.setProperty('--notice-bar-h', `${el.offsetHeight}px`);
    };
    applyHeight();
    const observer = new ResizeObserver(applyHeight);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--notice-bar-h', '0px');
    };
  }, [showBar, notices.length, currentModal?.id]);

  if (!visibleOnThisRoute || !ready) return null;

  return (
    <>
      {showBar ? (
        <AnnouncementNoticeBar
          ref={barRef}
          announcements={notices}
          onDismiss={handleDismiss}
        />
      ) : null}
      {currentModal ? (
        <AnnouncementSeverityModal
          announcement={currentModal}
          onDismiss={handleDismiss}
        />
      ) : null}
    </>
  );
}
