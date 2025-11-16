'use client';

import { usePathname } from 'next/navigation';
import Navigation from '@/components/navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Don't show marketing navigation in admin routes or timeclock
  if (pathname?.startsWith('/admin') || pathname === '/timeclock') {
    return null;
  }
  
  return <Navigation />;
}

