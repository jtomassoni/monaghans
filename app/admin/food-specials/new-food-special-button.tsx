'use client';

import { useAdminMobileHeader } from '@/components/admin-mobile-header-context';
import { useEffect } from 'react';
import { FaPlus } from 'react-icons/fa';

export default function NewFoodSpecialButton() {
  const { setRightAction } = useAdminMobileHeader();

  useEffect(() => {
    // Set mobile header action button
    const mobileButton = (
      <button
        onClick={() => {
          const event = new CustomEvent('openNewSpecial');
          window.dispatchEvent(event);
        }}
        className="h-9 px-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium text-xs transition-all duration-200 flex items-center justify-center gap-1.5"
      >
        <FaPlus className="w-3 h-3" />
        <span>New</span>
      </button>
    );
    setRightAction(mobileButton);

    return () => {
      setRightAction(null);
    };
  }, [setRightAction]);

  return (
    <button
      onClick={() => {
        const event = new CustomEvent('openNewSpecial');
        window.dispatchEvent(event);
      }}
      className="px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
    >
      <FaPlus className="w-4 h-4" />
      <span className="hidden sm:inline">New Food Special</span>
      <span className="sm:hidden">New</span>
    </button>
  );
}

