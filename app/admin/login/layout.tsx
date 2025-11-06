import { Providers } from '@/components/providers';

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Middleware handles redirect if already logged in
  return (
    <Providers>
      <main className="min-h-screen bg-black overflow-hidden">
        {children}
      </main>
    </Providers>
  );
}

