'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import UserProfileDropdown from './UserProfileDropdown';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-green-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/welcome" className="text-2xl font-bold">
            Golf Performance App
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/welcome" className="hover:text-green-300 transition-colors">
              Home
            </Link>
            <Link href="/dashboard" className="hover:text-green-300 transition-colors">
              Dashboard
            </Link>
            <Link href="/rounds" className="hover:text-green-300 transition-colors">
              Log a Round
            </Link>
            <UserProfileDropdown />
          </div>
        </div>
      </nav>

      {/* Main Content with Background */}
      <main 
        className="flex-1 bg-cover bg-center bg-fixed" 
        style={{ 
          backgroundImage: "url('/golf-course-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="bg-white bg-opacity-90 min-h-full">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-green-800 text-white p-4 text-center">
        <p>&copy; 2025 Golf Performance App. All rights reserved.</p>
      </footer>
    </div>
  );
} 