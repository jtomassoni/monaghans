'use client';

import { useState, useEffect } from 'react';
import AnnouncementModal from './announcement-modal';

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
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState<number | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load acknowledged announcement IDs from localStorage
    const stored = localStorage.getItem('acknowledgedAnnouncements');
    if (stored) {
      try {
        const ids = JSON.parse(stored) as string[];
        setAcknowledgedIds(new Set(ids));
      } catch {
        // If parsing fails, start fresh
      }
    }
  }, []);

  useEffect(() => {
    // Find the first unacknowledged announcement
    if (announcements.length === 0) return;

    const unacknowledgedIndex = announcements.findIndex(
      (announcement) => !acknowledgedIds.has(announcement.id)
    );

    if (unacknowledgedIndex !== -1) {
      setCurrentAnnouncementIndex(unacknowledgedIndex);
    } else {
      setCurrentAnnouncementIndex(null);
    }
  }, [announcements, acknowledgedIds]);

  const handleAcknowledge = () => {
    if (currentAnnouncementIndex === null) return;

    const currentAnnouncement = announcements[currentAnnouncementIndex];
    if (!currentAnnouncement) return;

    // Mark as acknowledged
    const newAcknowledgedIds = new Set(acknowledgedIds);
    newAcknowledgedIds.add(currentAnnouncement.id);
    setAcknowledgedIds(newAcknowledgedIds);

    // Save to localStorage
    localStorage.setItem(
      'acknowledgedAnnouncements',
      JSON.stringify(Array.from(newAcknowledgedIds))
    );

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
    <AnnouncementModal
      isOpen={currentAnnouncement !== null}
      announcement={currentAnnouncement}
      onAcknowledge={handleAcknowledge}
    />
  );
}

