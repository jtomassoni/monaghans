'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './theme-provider';
import { AdminMobileHeaderProvider } from './admin-mobile-header-context';
import { HelpProvider } from './help-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth">
      <ThemeProvider>
        <AdminMobileHeaderProvider>
          <HelpProvider>
            {children}
          </HelpProvider>
        </AdminMobileHeaderProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

