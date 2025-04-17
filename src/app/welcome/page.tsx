'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <img 
                src="/flag-stick.png" 
                alt="Logo" 
                className="w-8 h-8 sm:w-10 sm:h-10 filter hue-rotate-[120deg] brightness-[0.8]"
              />
              <span className="text-lg sm:text-xl font-bold text-green-800">Golf Performance</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link 
                href="/login" 
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm sm:text-base hover:bg-green-700 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section with Background */}
        <div 
          className="min-h-[50vh] sm:h-[60vh] bg-cover bg-center flex items-center justify-center relative" 
          style={{ 
            backgroundImage: "url('/golf-course-bg.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="bg-white/90 p-6 sm:p-8 rounded-lg shadow-lg text-center max-w-lg mx-4 relative z-10">
            <h1 className="text-2xl sm:text-4xl font-bold text-green-800 mb-3 sm:mb-4">Welcome to the Golf Performance App!</h1>
            <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6">
              Track your rounds, analyze your game, and unlock your golfer persona to take your skills to the next level.
            </p>
            <div className="flex justify-center mb-4 sm:mb-6">
              <img 
                src="/flag-stick.png" 
                alt="Golf Flag" 
                className="w-12 h-12 sm:w-16 sm:h-16 filter hue-rotate-[120deg] brightness-[0.8]"
              />
            </div>
            <button
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors text-base sm:text-lg font-semibold"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white py-12 sm:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-green-800 mb-8 sm:mb-16">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
              {/* Tile 1 */}
              <div className="bg-green-50 p-6 sm:p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-green-600 mb-4 sm:mb-6">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-3 sm:mb-4">Request Access</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Join our private beta by requesting access. We will review your request and get you started on your golf journey.
                </p>
              </div>

              {/* Tile 2 */}
              <div className="bg-green-50 p-6 sm:p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-green-600 mb-4 sm:mb-6">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-3 sm:mb-4">Track Your Rounds</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Log your golf rounds with detailed statistics. Track your progress and identify areas for improvement.
                </p>
              </div>

              {/* Tile 3 */}
              <div className="bg-green-50 p-6 sm:p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-green-600 mb-4 sm:mb-6">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-3 sm:mb-4">Analyze & Improve</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Get personalized insights and recommendations to help you improve your game and reach your golfing goals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-green-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About</h3>
              <p className="text-sm text-green-100">
                Golf Performance App helps golfers track their progress and improve their game through data-driven insights.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-green-100">
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-green-100">
                <li>Email: support@golfperformance.app</li>
                <li>Twitter: @golfperformance</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-green-700 text-center text-sm text-green-100">
            <p>&copy; {new Date().getFullYear()} Golf Performance App. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}