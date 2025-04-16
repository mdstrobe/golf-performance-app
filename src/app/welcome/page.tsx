'use client';

import { useRouter } from 'next/navigation';
// import Link from 'next/link';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section with Background */}
        <div 
          className="h-[60vh] bg-cover bg-center flex items-center justify-center" 
          style={{ 
            backgroundImage: "url('/golf-course-bg.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="bg-white bg-opacity-90 p-8 rounded-lg shadow-lg text-center max-w-lg mx-4">
            <h1 className="text-4xl font-bold text-green-800 mb-4">Welcome to the Golf Performance App!</h1>
            <p className="text-lg text-gray-700 mb-6">
              Track your rounds, analyze your game, and unlock your golfer persona to take your skills to the next level.
            </p>
            <div className="flex justify-center mb-6">
              <img 
                src="/flag-stick.png" 
                alt="Golf Flag" 
                className="w-16 h-16 filter hue-rotate-[120deg] brightness-[0.8]"
              />
            </div>
            <button
              onClick={() => router.push('/login')}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors text-lg font-semibold"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-green-800 mb-16">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Tile 1 */}
              <div className="bg-green-50 p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-green-600 mb-6">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-green-800 mb-4">Request Access</h3>
                <p className="text-gray-600">
                  Join our private beta by requesting access. We will review your request and get you started on your golf journey.
                </p>
              </div>

              {/* Tile 2 */}
              <div className="bg-green-50 p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-green-600 mb-6">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-green-800 mb-4">Track Your Rounds</h3>
                <p className="text-gray-600">
                  Log your golf rounds with detailed statistics. Track your progress and identify areas for improvement.
                </p>
              </div>

              {/* Tile 3 */}
              <div className="bg-green-50 p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-green-600 mb-6">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-green-800 mb-4">Analyze & Improve</h3>
                <p className="text-gray-600">
                  Get personalized insights and recommendations to help you improve your game and reach your golfing goals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}