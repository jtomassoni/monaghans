'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const images = [
  '/pics/monaghans-beer-and-shot.jpg',
  '/pics/monaghans-billiard-room.jpg',
  '/pics/monaghans-billiards.jpg',
  '/pics/monaghans-breakfast-biscut.jpg',
  '/pics/monaghans-fish-n-chips.jpg',
  '/pics/monaghans-kareoke.jpg',
  '/pics/monaghans-patio.jpg',
  '/pics/monaghans-quesadilla.jpg',
  '/pics/monaghans-taco-platter.jpg',
];

export default function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Filter out failed images
  const availableImages = images.filter(img => !failedImages.has(img));

  useEffect(() => {
    if (!isAutoPlaying || availableImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % availableImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, availableImages.length]);

  // Adjust current index when images fail
  useEffect(() => {
    if (availableImages.length > 0 && currentIndex >= availableImages.length) {
      setCurrentIndex(0);
    }
  }, [availableImages.length, currentIndex]);

  const goToSlide = (index: number) => {
    if (availableImages.length === 0) return;
    setCurrentIndex(index % availableImages.length);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    if (availableImages.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + availableImages.length) % availableImages.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    if (availableImages.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % availableImages.length);
    setIsAutoPlaying(false);
  };

  const handleImageError = (imageSrc: string) => {
    setFailedImages((prev) => new Set(prev).add(imageSrc));
  };

  // If no images available, show placeholder
  if (availableImages.length === 0) {
    return (
      <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white/60 text-center">
          <p className="text-lg font-semibold">No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden rounded-lg">
      {/* Main Image */}
      <div className="relative w-full h-full">
        <Image
          src={availableImages[currentIndex]}
          alt={`Monaghan's ${currentIndex + 1}`}
          fill
          className="object-cover"
          priority={currentIndex === 0}
          onError={() => handleImageError(availableImages[currentIndex])}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
        aria-label="Previous image"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
        aria-label="Next image"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {availableImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

