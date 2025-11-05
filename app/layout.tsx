import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Monaghan's Dive Bar",
  description: 'Cold drinks, warm people. Your neighborhood dive bar.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
