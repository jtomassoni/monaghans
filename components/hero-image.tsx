'use client';

import { useState } from 'react';
import Image from 'next/image';

interface HeroImageProps {
  src: string;
  alt: string;
}

export default function HeroImage({ src, alt }: HeroImageProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    // Show placeholder text when image fails to load
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-white/60 text-lg md:text-xl font-semibold">Image not available</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover transition-opacity duration-500"
      priority
      unoptimized={true}
      onError={handleError}
    />
  );
}

