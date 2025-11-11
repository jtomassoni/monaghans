'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function KitchenLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Kitchen login uses simple credentials
      // In production, this should use environment variables
      const kitchenUsername = process.env.NEXT_PUBLIC_KITCHEN_USERNAME || 'kitchen';
      const kitchenPassword = process.env.NEXT_PUBLIC_KITCHEN_PASSWORD || 'kitchen123';

      if (username === kitchenUsername && password === kitchenPassword) {
        // Store kitchen session in localStorage (simple approach for tablet login)
        localStorage.setItem('kitchen_authenticated', 'true');
        localStorage.setItem('kitchen_username', username);
        router.push('/kitchen');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Kitchen Login</h1>
            <p className="text-gray-400">Sign in to access the kitchen display</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

