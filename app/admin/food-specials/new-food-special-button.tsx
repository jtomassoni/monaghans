'use client';

import { useAdminMobileHeader } from '@/components/admin-mobile-header-context';
import { useEffect } from 'react';

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
        className="h-9 px-3 bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 rounded-lg text-white font-medium text-xs transition-all duration-200 active:scale-[0.95] flex items-center justify-center gap-1.5 border border-orange-400/50 dark:border-orange-500/50 touch-manipulation shadow-sm hover:shadow-md"
      >
        <span className="text-sm leading-none">➕</span>
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
      className="px-4 py-2.5 bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 rounded-lg text-white font-medium text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-orange-400/50 dark:border-orange-500/50 shadow-sm hover:shadow-md touch-manipulation"
    >
      <span className="text-base leading-none">➕</span>
      <span className="hidden sm:inline">New Food Special</span>
      <span className="sm:hidden">New</span>
    </button>
  );
}

