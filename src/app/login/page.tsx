'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import BetaRequestModal from '@/components/BetaRequestModal';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.session) {
        window.location.href = '/dashboard';
      } else {
        setError('Failed to establish a session. Please try again.');
      }
    } catch (err: any) {
      setError('An unexpected error occurred: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-grow flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Log In</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Log In
            </button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Request Beta Access
              </button>
            </p>
            <p>
              <Link href="/forgot-password" className="text-green-600 hover:text-green-700 font-medium">
                Forgot your password?
              </Link>
            </p>
          </div>
        </div>
      </div>
      <BetaRequestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}