'use client';

import AdminActionButton from '@/components/admin-action-button';

export default function AnnouncementsHeader() {
  return (
    <AdminActionButton
      onClick={() => {
        const event = new CustomEvent('openAnnouncementModal');
        window.dispatchEvent(event);
      }}
      label="New Announcement"
      shortLabel="New"
      variant="warning"
    />
  );
}

