'use client';

import { useEffect, useState, useRef } from 'react';

export type AdCreative = {
  id: string;
  campaignId: string;
  assetId: string;
  destinationUrl?: string | null;
  qrEnabled: boolean;
  active: boolean;
  asset: {
    id: string;
    storageKey: string;
    width: number | null;
    height: number | null;
  };
};

type AdZoneProps = {
  placement: 'embedded-middle';
  ads: AdCreative[];
  enabled: boolean;
  rotationIntervalMs?: number; // Default: 12-15 seconds (randomized)
};

export default function AdZone({
  placement,
  ads,
  enabled,
  rotationIntervalMs,
}: AdZoneProps) {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If disabled or no ads, don't render anything
  if (!enabled || ads.length === 0) {
    return null;
  }

  // Calculate rotation interval (randomize between 12-15 seconds)
  const getRotationInterval = () => {
    if (rotationIntervalMs) {
      return rotationIntervalMs;
    }
    // Random between 12000 and 15000 ms
    return Math.floor(Math.random() * 3000) + 12000;
  };

  useEffect(() => {
    if (ads.length <= 1) return;

    const rotate = () => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      rotationTimerRef.current = setTimeout(rotate, getRotationInterval());
    };

    // Start rotation
    rotationTimerRef.current = setTimeout(rotate, getRotationInterval());

    return () => {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
      }
    };
  }, [ads.length, rotationIntervalMs]);

  const currentAd = ads[currentAdIndex];

  if (!currentAd) return null;

  // Render QR code if enabled (using a simple library or SVG)
  const renderQRCode = () => {
    if (!currentAd.qrEnabled || !currentAd.destinationUrl) return null;
    
    // For now, we'll use a simple placeholder
    // In production, you'd use a QR code library like 'qrcode.react' or 'react-qr-code'
    return (
      <div className="absolute bottom-2 right-2 bg-white p-2 rounded">
        <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs text-gray-600">
          QR
        </div>
      </div>
    );
  };

  if (placement === 'embedded-middle') {
    return (
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-20">
        <div className="relative bg-black/40 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="relative w-full aspect-video flex items-center justify-center">
            <img
              src={currentAd.asset.storageKey}
              alt="Advertisement"
              className="max-w-full max-h-full object-contain"
              style={{
                width: 'auto',
                height: 'auto',
              }}
            />
            {renderQRCode()}
          </div>
          {currentAd.destinationUrl && (
            <a
              href={currentAd.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0"
              aria-label="Visit advertiser website"
            />
          )}
        </div>
      </div>
    );
  }

  return null;
}

