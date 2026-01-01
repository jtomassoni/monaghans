'use client';

import { useAdminMobileHeader } from '@/components/admin-mobile-header-context';
import { useEffect } from 'react';
import AdminActionButton from '@/components/admin-action-button';

export default function NewDrinkSpecialButton() {
  const { setRightAction } = useAdminMobileHeader();

  const handleClick = () => {
    const event = new CustomEvent('openNewDrinkSpecial');
    window.dispatchEvent(event);
  };

  useEffect(() => {
    // Set mobile header action button
    const mobileButton = (
      <button
        onClick={handleClick}
        className="h-9 px-3 rounded-lg bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 border border-blue-400 dark:border-blue-500 touch-manipulation shadow-sm"
      >
        <span>➕</span>
        <span>New</span>
      </button>
    );
    setRightAction(mobileButton);

    return () => {
      setRightAction(null);
    };
  }, [setRightAction]);

  return (
    <AdminActionButton
      onClick={handleClick}
      label="New Drink Special"
      shortLabel="New"
      variant="primary"
    />
  );
}

