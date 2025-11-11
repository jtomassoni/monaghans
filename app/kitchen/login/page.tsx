'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUtensils } from 'react-icons/fa';

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
      const response = await fetch('/api/kitchen/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store kitchen session
        localStorage.setItem('kitchen_authenticated', 'true');
        localStorage.setItem('kitchen_username', data.user.name || username);
        localStorage.setItem('kitchen_userId', data.user.id);
        router.push('/kitchen');
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-gray-900 border-4 border-gray-800 rounded-2xl p-10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <div className="bg-orange-600 p-6 rounded-full">
                <FaUtensils className="text-6xl text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-black text-white mb-3 tracking-tight">KITCHEN LOGIN</h1>
            <p className="text-gray-400 text-xl">Sign in to access the kitchen display system</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-lg font-bold text-gray-300 mb-3">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-6 py-4 bg-gray-800 border-2 border-gray-700 rounded-xl text-white text-xl focus:ring-4 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="Enter your username"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-lg font-bold text-gray-300 mb-3">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-6 py-4 bg-gray-800 border-2 border-gray-700 rounded-xl text-white text-xl focus:ring-4 focus:ring-orange-500 focus:border-orange-500 transition"
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-600/30 border-2 border-red-500 rounded-xl p-4">
                <p className="text-red-300 text-lg font-semibold">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-black text-2xl rounded-xl transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? 'Signing in...' : 'SIGN IN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

