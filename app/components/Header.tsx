'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Live Table', path: '/' },
    { name: 'Text Extractor', path: '/extract' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <header className="bg-lime-900 text-white shadow-md border-b border-lime-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-lime-500 text-lime-950 font-black text-xl flex items-center justify-center shadow-xs">
              P
            </div>
            <Link href="/" className="text-xl font-bold tracking-tight hover:text-lime-200 transition-colors">
              PlaceRover
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3.5 py-2 rounded-md text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-lime-600 text-white shadow-xs'
                      : 'text-lime-100 hover:bg-lime-800 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

        </div>
      </div>
    </header>
  );
}
