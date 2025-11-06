import type { Metadata } from 'next';
import './globals.css';
import ConditionalNavigation from '@/components/conditional-navigation';
import ToastContainer from '@/components/toast';
import { Providers } from '@/components/providers';
import Script from 'next/script';

export const metadata: Metadata = {
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
        url: '/pics/sms-preview.png',
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
    images: ['/pics/sms-preview.png'],
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
                  const theme = localStorage.getItem('admin-theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Providers>
          <ConditionalNavigation />
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
