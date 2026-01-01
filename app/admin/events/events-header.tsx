'use client';

import { useEffect, useState } from 'react';
import { useAdminMobileHeader } from '@/components/admin-mobile-header-context';
import AdminActionButton from '@/components/admin-action-button';
import { FaCalendarAlt } from 'react-icons/fa';

export default function EventsHeader() {
  const [showDuplicateButton, setShowDuplicateButton] = useState(false);
  const { setRightAction } = useAdminMobileHeader();

  useEffect(() => {
    // Check if there are events scheduled at least one year from now
    const checkForFutureEvents = async () => {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const events = await res.json();
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          const hasEvents = events.some((event: any) => {
            const eventDate = new Date(event.startDateTime);
            return eventDate >= oneYearFromNow;
          });
          setShowDuplicateButton(hasEvents);
        }
      } catch (error) {
        console.error('Failed to check for future events:', error);
      }
    };

    checkForFutureEvents();
  }, []);

  const handleNewEvent = () => {
    const event = new CustomEvent('openNewEvent');
    window.dispatchEvent(event);
  };

  const handleDuplicateCalendar = () => {
    const event = new CustomEvent('openDuplicateCalendar');
    window.dispatchEvent(event);
  };

  useEffect(() => {
    // Set mobile header action button
    const mobileButton = (
      <button
        onClick={handleNewEvent}
        className="h-9 px-2.5 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 border border-blue-400 dark:border-blue-500 touch-manipulation shadow-sm"
      >
        <span className="text-xs">➕</span>
        <span>New</span>
      </button>
    );
    setRightAction(mobileButton);

    return () => {
      setRightAction(null);
    };
  }, [setRightAction]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      <AdminActionButton
        onClick={handleNewEvent}
        label="New Event"
        shortLabel="New"
        variant="primary"
      />
      {showDuplicateButton && (
        <AdminActionButton
          onClick={handleDuplicateCalendar}
          label="Duplicate Calendar"
          shortLabel="Duplicate"
          variant="success"
          icon={<FaCalendarAlt className="w-4 h-4" />}
        />
      )}
    </div>
  );
}

