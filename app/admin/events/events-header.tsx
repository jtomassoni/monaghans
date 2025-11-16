'use client';

import { useEffect, useState } from 'react';

export default function EventsHeader() {
  const [showDuplicateButton, setShowDuplicateButton] = useState(false);

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

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Events
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
          Manage events and daily specials
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <button
          onClick={() => {
            const event = new CustomEvent('openNewEvent');
            window.dispatchEvent(event);
          }}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-blue-400 dark:border-blue-500 touch-manipulation"
        >
          <span>➕</span>
          <span>New Event</span>
        </button>
        {showDuplicateButton && (
          <button
            onClick={() => {
              const event = new CustomEvent('openDuplicateCalendar');
              window.dispatchEvent(event);
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-green-500/90 dark:bg-green-600/90 hover:bg-green-600 dark:hover:bg-green-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-green-400 dark:border-green-500 touch-manipulation"
            title="Duplicate recurring events to following year"
          >
            <span>📅</span>
            <span>Duplicate Calendar</span>
          </button>
        )}
      </div>
    </div>
  );
}

