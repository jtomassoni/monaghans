'use client';

import { useState, useEffect } from 'react';
import AnnouncementBanner from './announcement-modal';

interface Announcement {
  id: string;
  title: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  dismissable?: boolean;
}

interface AnnouncementsHandlerProps {
  announcements: Announcement[];
}

export default function AnnouncementsHandler({ announcements }: AnnouncementsHandlerProps) {
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState<number | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Always show the first announcement on page load (no localStorage persistence)
    if (announcements.length === 0) {
      setCurrentAnnouncementIndex(null);
      return;
    }

    // Find the first unacknowledged announcement
    const unacknowledgedIndex = announcements.findIndex(
      (announcement) => !acknowledgedIds.has(announcement.id)
    );

    if (unacknowledgedIndex !== -1) {
      setCurrentAnnouncementIndex(unacknowledgedIndex);
    } else {
      // If all are acknowledged in this session, hide the banner
      setCurrentAnnouncementIndex(null);
    }
  }, [announcements, acknowledgedIds]);

  const handleAcknowledge = () => {
    if (currentAnnouncementIndex === null) return;

    const currentAnnouncement = announcements[currentAnnouncementIndex];
    if (!currentAnnouncement) return;

    // Mark as acknowledged (only for current session, not persisted)
    const newAcknowledgedIds = new Set(acknowledgedIds);
    newAcknowledgedIds.add(currentAnnouncement.id);
    setAcknowledgedIds(newAcknowledgedIds);

    // Find next unacknowledged announcement
    const nextIndex = announcements.findIndex(
      (announcement, index) => index > currentAnnouncementIndex && !newAcknowledgedIds.has(announcement.id)
    );

    if (nextIndex !== -1) {
      setCurrentAnnouncementIndex(nextIndex);
    } else {
      setCurrentAnnouncementIndex(null);
    }
  };

  const currentAnnouncement =
    currentAnnouncementIndex !== null ? announcements[currentAnnouncementIndex] : null;

  return (
    <AnnouncementBanner
      isOpen={currentAnnouncement !== null}
      announcement={currentAnnouncement}
      onAcknowledge={handleAcknowledge}
    />
  );
}


