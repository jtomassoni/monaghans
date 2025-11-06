'use client';

export default function AnnouncementsHeader() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Announcements
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs hidden sm:block">
          Post updates and news to your website
        </p>
      </div>
      <button
        onClick={() => {
          const event = new CustomEvent('openAnnouncementModal');
          window.dispatchEvent(event);
        }}
        className="w-full sm:w-auto px-4 py-2.5 bg-yellow-500/90 dark:bg-yellow-600/90 hover:bg-yellow-600 dark:hover:bg-yellow-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-yellow-400 dark:border-yellow-500 touch-manipulation"
      >
        <span>➕</span>
        <span>New Announcement</span>
      </button>
    </div>
  );
}

