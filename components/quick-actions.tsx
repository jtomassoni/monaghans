'use client';

import { 
  FaCalendarAlt, 
  FaStar, 
  FaUtensils, 
  FaBullhorn,
} from 'react-icons/fa';

export default function QuickActions() {
  const handlePostAnnouncement = () => {
    const event = new CustomEvent('openAnnouncementModal');
    window.dispatchEvent(event);
  };

  const handleAddDailySpecial = () => {
    const event = new CustomEvent('openNewSpecial');
    window.dispatchEvent(event);
  };

  const handleCreateEvent = () => {
    const event = new CustomEvent('openNewEvent');
    window.dispatchEvent(event);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <button
          onClick={handlePostAnnouncement}
          className="px-4 py-3 bg-yellow-500/90 dark:bg-yellow-600/90 hover:bg-yellow-600 dark:hover:bg-yellow-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center gap-2 cursor-pointer border border-yellow-400 dark:border-yellow-500"
        >
          <FaBullhorn className="w-4 h-4" />
          <span>Post Announcement</span>
        </button>
        <button
          onClick={handleAddDailySpecial}
          className="px-4 py-3 bg-orange-500/90 dark:bg-orange-600/90 hover:bg-orange-600 dark:hover:bg-orange-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center gap-2 cursor-pointer border border-orange-400 dark:border-orange-500"
        >
          <FaStar className="w-4 h-4" />
          <span>Add Daily Special</span>
        </button>
        <button
          onClick={handleCreateEvent}
          className="px-4 py-3 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center gap-2 cursor-pointer border border-blue-400 dark:border-blue-500"
        >
          <FaCalendarAlt className="w-4 h-4" />
          <span>Create Event</span>
        </button>
        <a
          href="/admin/menu"
          className="px-4 py-3 bg-blue-500/90 dark:bg-blue-600/90 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center gap-2 cursor-pointer border border-blue-400 dark:border-blue-500"
        >
          <FaUtensils className="w-4 h-4" />
          <span>Update Menu</span>
        </a>
      </div>
    </div>
  );
}
