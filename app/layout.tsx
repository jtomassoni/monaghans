import type { Metadata } from 'next';
import './globals.css';
import ConditionalNavigation from '@/components/conditional-navigation';
import ToastContainer from '@/components/toast';
import { Providers } from '@/components/providers';
import Analytics from '@/components/analytics';
import Script from 'next/script';
import { prisma } from '@/lib/prisma';

// Get base URL for absolute image URLs (needed for SMS previews)
const baseUrl = process.env.NEXTAUTH_URL || 'https://monaghans.com';
const heroImageUrl = `${baseUrl}/pics/hero.png`;

export async function generateMetadata(): Promise<Metadata> {
  // Fetch site title from database
  // During build time, database may not be available, so handle gracefully
  let siteTitle = "Monaghan's Dive Bar";
  try {
    const siteTitleSetting = await prisma.setting.findUnique({
      where: { key: 'siteTitle' },
    });
    siteTitle = siteTitleSetting?.value || "Monaghan's Dive Bar";
  } catch (error) {
    // During build, database may not be available - use default
    console.warn('Could not fetch site title from database during build:', error);
  }
  
  const defaultDescription = 'Cold drinks, warm people. Your neighborhood dive bar.';

  return {
    metadataBase: new URL(baseUrl),
    title: siteTitle,
    description: defaultDescription,
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      title: siteTitle,
      description: defaultDescription,
      images: [
        {
          url: heroImageUrl,
          width: 1200,
          height: 630,
          alt: siteTitle,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: defaultDescription,
      images: [heroImageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Google Analytics 4 Measurement ID
  const ga4MeasurementId = 'G-ZXF5XYV2RY';

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`}
          strategy="afterInteractive"
        />
        <Script
          id="ga4-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4MeasurementId}', {
                page_path: window.location.pathname,
                send_page_view: false // We'll handle pageviews manually for better control
              });
            `,
          }}
        />
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
