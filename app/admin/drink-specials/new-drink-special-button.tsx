'use client';

import { useAdminMobileHeader } from '@/components/admin-mobile-header-context';
import { useEffect } from 'react';

export default function NewDrinkSpecialButton() {
  const { setRightAction } = useAdminMobileHeader();

  useEffect(() => {
    // Set mobile header action button
    const mobileButton = (
      <button
        onClick={() => {
          const event = new CustomEvent('openNewDrinkSpecial');
          window.dispatchEvent(event);
        }}
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
    <button
      onClick={() => {
        const event = new CustomEvent('openNewDrinkSpecial');
        window.dispatchEvent(event);
      }}
      className="px-4 py-2.5 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 border border-blue-400 dark:border-blue-500 touch-manipulation"
    >
      <span>➕</span>
      <span>New Drink Special</span>
    </button>
  );
}

