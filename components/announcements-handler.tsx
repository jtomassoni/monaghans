'use client';

import { useState, useEffect } from 'react';
import AnnouncementBanner from './announcement-modal';

interface Announcement {
  id: string;
  title: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
}

interface AnnouncementsHandlerProps {
  announcements: Announcement[];
}

export default function AnnouncementsHandler({ announcements }: AnnouncementsHandlerProps) {
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState<number | null>(
    announcements.length > 0 ? 0 : null
  );

  useEffect(() => {
    if (announcements.length === 0) {
      setCurrentAnnouncementIndex(null);
      return;
    }

    // Always show the first announcement, rotate through them if multiple
    setCurrentAnnouncementIndex(0);
  }, [announcements]);

  // Auto-rotate through announcements every 10 seconds if multiple exist
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentAnnouncementIndex((prev) => {
        if (prev === null) return 0;
        return (prev + 1) % announcements.length;
      });
    }, 10000); // Rotate every 10 seconds

    return () => clearInterval(interval);
  }, [announcements.length]);

  const currentAnnouncement =
    currentAnnouncementIndex !== null ? announcements[currentAnnouncementIndex] : null;

  return (
    <AnnouncementBanner
      isOpen={currentAnnouncement !== null}
      announcement={currentAnnouncement}
    />
  );
}


