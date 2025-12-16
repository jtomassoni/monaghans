'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './theme-provider';
import { AdminMobileHeaderProvider } from './admin-mobile-header-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth">
      <ThemeProvider>
        <AdminMobileHeaderProvider>
          {children}
        </AdminMobileHeaderProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

