'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import KitchenTabletInterface from './kitchen-tablet-interface';

export default function KitchenPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if kitchen is authenticated
    const isAuthenticated = localStorage.getItem('kitchen_authenticated') === 'true';
    if (!isAuthenticated) {
      router.push('/kitchen/login');
    } else {
      setAuthenticated(true);
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <KitchenTabletInterface />;
}

