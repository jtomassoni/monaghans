'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Don't show marketing navigation in admin routes, timeclock, signage display, or help page
  if (pathname?.startsWith('/admin') || pathname === '/timeclock' || pathname === '/specials-tv' || pathname === '/help') {
    return null;
  }
  
  return <Navigation />;
}

