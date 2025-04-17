'use client';

import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
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
    </div>
  );
} 