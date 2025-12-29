'use client';

import Link from 'next/link';
import { marked } from 'marked';

// Configure marked to allow HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface Announcement {
  id: string;
  title: string;
  body: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
}

interface AnnouncementBannerProps {
  isOpen: boolean;
  announcement: Announcement | null;
}

export default function AnnouncementBanner({ isOpen, announcement }: AnnouncementBannerProps) {
  if (!isOpen || !announcement) return null;

  return (
    <div className="relative z-20 mb-3 sm:mb-4 max-w-6xl mx-auto w-full">
      <div className="relative bg-gradient-to-br from-amber-900/70 via-yellow-800/60 to-amber-800/70 backdrop-blur-md rounded-2xl p-3 sm:p-4 border-l-4 border-amber-400 shadow-xl overflow-hidden">
        {/* Decorative pattern overlay - festive sparkles */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/20 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative flex items-start gap-2 sm:gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 pt-0.5">
            <div className="p-2 bg-amber-500/60 rounded-xl shadow-lg ring-2 ring-amber-300/30">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white mb-1 drop-shadow-sm">
                  {announcement.title}
                </h3>
                {announcement.body && (
                  <div 
                    className="text-white/90 text-xs sm:text-sm prose prose-sm prose-invert max-w-none [&_*]:text-white/90 [&_*]:text-xs [&_*]:sm:text-sm [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: marked.parse(announcement.body) }} 
                  />
                )}
                {announcement.ctaText && announcement.ctaUrl && (
                  <div className="mt-2">
                    <Link
                      href={announcement.ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 rounded-lg font-semibold transition-colors text-xs sm:text-sm shadow-md hover:shadow-lg"
                    >
                      {announcement.ctaText}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

