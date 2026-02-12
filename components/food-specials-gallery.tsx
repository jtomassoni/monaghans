'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface FoodSpecial {
  id: string;
  title: string;
  description: string | null;
  priceNotes: string | null;
  timeWindow: string | null;
  image: string;
}

interface FoodSpecialsGalleryProps {
  specials: FoodSpecial[];
}

export default function FoodSpecialsGallery({ specials }: FoodSpecialsGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
    document.body.style.overflow = 'unset';
  };

  const goToPrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex - 1 + specials.length) % specials.length);
  };

  const goToNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % specials.length);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  };

  if (specials.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-block p-6 bg-gray-800/50 rounded-full mb-4">
          <svg
            className="w-12 h-12 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">
          No Specials Available
        </h2>
        <p className="text-gray-400">
          Check back soon for our latest food specials!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {specials.map((special, index) => (
          <div
            key={special.id}
            className="group relative bg-gray-800/40 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/50 hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-1 cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            {/* Image Container */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-900">
              <Image
                src={special.image}
                alt={special.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Badge */}
              <div className="absolute top-3 right-3 px-3 py-1 bg-orange-600/90 backdrop-blur-sm rounded-full">
                <span className="text-white text-xs font-semibold uppercase tracking-wider">
                  Special
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-orange-400 transition-colors">
                {special.title}
              </h3>
              
              {special.description && (
                <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                  {special.description}
                </p>
              )}

              {special.priceNotes && (
                <p className="text-orange-400 font-semibold text-sm mb-2">
                  {special.priceNotes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all"
            aria-label="Close lightbox"
          >
            <FaTimes className="w-6 h-6" />
          </button>

          {/* Navigation Buttons */}
          {specials.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all"
                aria-label="Previous image"
              >
                <FaChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all"
                aria-label="Next image"
              >
                <FaChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image Container */}
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full aspect-video mb-4">
              <Image
                src={specials[selectedIndex].image}
                alt={specials[selectedIndex].title}
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Image Info */}
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-2xl font-bold text-white mb-2">
                {specials[selectedIndex].title}
              </h3>
              
              {specials[selectedIndex].description && (
                <p className="text-gray-300 mb-3">
                  {specials[selectedIndex].description}
                </p>
              )}

              {specials[selectedIndex].priceNotes && (
                <p className="text-orange-400 font-semibold text-lg mb-2">
                  {specials[selectedIndex].priceNotes}
                </p>
              )}

              {/* Image Counter */}
              {specials.length > 1 && (
                <div className="mt-4 text-center text-gray-400 text-sm">
                  {selectedIndex + 1} of {specials.length}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

