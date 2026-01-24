'use client';

import { useAdminMobileHeader } from '@/components/admin-mobile-header-context';
import { useEffect, useState } from 'react';
import AdminActionButton from '@/components/admin-action-button';
import { FaImage } from 'react-icons/fa';
import FoodSpecialsGallerySelector from '@/components/food-specials-gallery-selector';

export default function GalleryButton() {
  const { setRightAction } = useAdminMobileHeader();
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    // Set mobile header action button
    const mobileButton = (
      <button
        onClick={() => setShowGallery(true)}
        className="h-9 px-3 rounded-lg bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 text-white font-medium text-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 border border-orange-400 dark:border-orange-500 touch-manipulation shadow-sm"
      >
        <FaImage className="w-3.5 h-3.5" />
        <span>Gallery</span>
      </button>
    );
    setRightAction(mobileButton);

    return () => {
      setRightAction(null);
    };
  }, [setRightAction]);

  return (
    <>
      <AdminActionButton
        onClick={() => setShowGallery(true)}
        label="View Gallery"
        shortLabel="Gallery"
        variant="warning"
        icon={<FaImage className="w-4 h-4" />}
      />
      <FoodSpecialsGallerySelector
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        // No onSelect - when viewing from main page, clicking copies path to clipboard
      />
    </>
  );
}

