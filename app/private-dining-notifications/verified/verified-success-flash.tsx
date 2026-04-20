'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REDIRECT_MS = 2200;

export default function VerifiedSuccessFlash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/admin/private-dining-leads');
    }, REDIRECT_MS);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-300">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Email confirmed</h1>
      <p className="mt-3 max-w-md text-gray-600 dark:text-gray-400">
        You will receive private dining and event rental lead notifications at this address. Check your inbox
        for a short welcome message with a link to the admin app — full inquiry details stay in the app.
      </p>
      <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">Opening Private Dining Leads…</p>
    </div>
  );
}
