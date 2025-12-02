import type { Metadata } from 'next';
import './globals.css';
import ConditionalNavigation from '@/components/conditional-navigation';
import ToastContainer from '@/components/toast';
import { Providers } from '@/components/providers';
import Analytics from '@/components/analytics';
import Script from 'next/script';

// Get base URL for absolute image URLs (needed for SMS previews)
const baseUrl = process.env.NEXTAUTH_URL || 'https://monaghans.com';
const heroImageUrl = `${baseUrl}/pics/hero.png`;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Monaghan's Dive Bar",
  description: 'Cold drinks, warm people. Your neighborhood dive bar.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: "Monaghan's Dive Bar",
    description: 'Cold drinks, warm people. Your neighborhood dive bar.',
    images: [
      {
        url: heroImageUrl,
        width: 1200,
        height: 630,
        alt: "Monaghan's Dive Bar",
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Monaghan's Dive Bar",
    description: 'Cold drinks, warm people. Your neighborhood dive bar.',
    images: [heroImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const pathname = window.location.pathname;
                  // Public routes: force dark mode (anything not starting with /admin or /timeclock)
                  const isPublicRoute = !pathname.startsWith('/admin') && pathname !== '/timeclock';
                  
                  if (isPublicRoute) {
                    // Always force dark mode for public-facing site
                    document.documentElement.classList.add('dark');
                  } else {
                    // Admin routes: use saved theme preference
                    const theme = localStorage.getItem('admin-theme');
                    if (theme === 'dark') {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Providers>
          {/* Skip to main content link for keyboard navigation */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-accent)] focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
          >
            Skip to main content
          </a>
          <ConditionalNavigation />
          {children}
          <ToastContainer />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
