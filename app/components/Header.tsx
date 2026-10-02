'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
  const pathname = usePathname();
  const { theme } = useTheme();

  const navItems = [
    {
      name: 'Text Extractor',
      path: '/extract',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      name: 'Live Table',
      path: '/',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  // Theme-aware Header Colors
  let headerBg = 'bg-emerald-950 border-emerald-800 text-white';
  let logoBg = 'bg-emerald-500 text-emerald-950';
  let activeBtnBg = 'bg-emerald-700 text-white';
  let hoverBtnBg = 'hover:bg-emerald-800 text-emerald-100';

  if (theme === 'navy') {
    headerBg = 'bg-slate-950 border-slate-800 text-white';
    logoBg = 'bg-indigo-500 text-white';
    activeBtnBg = 'bg-indigo-600 text-white';
    hoverBtnBg = 'hover:bg-slate-800 text-slate-200';
  } else if (theme === 'lime') {
    headerBg = 'bg-lime-900 border-lime-800 text-white';
    logoBg = 'bg-lime-500 text-lime-950';
    activeBtnBg = 'bg-lime-600 text-white';
    hoverBtnBg = 'hover:bg-lime-800 text-lime-100';
  }

  return (
    <header className={`${headerBg} shadow-md border-b sticky top-0 z-40 transition-colors duration-300`}>
      <div className="max-w-full mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${logoBg} font-black text-lg flex items-center justify-center shadow-xs transition-colors`}>
              P
            </div>
            <Link href="/" className="text-lg font-bold tracking-tight hover:opacity-90 transition-opacity">
              PlaceRover
            </Link>
          </div>

          {/* Navigation Items + Theme Icon */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                    isActive ? activeBtnBg : hoverBtnBg
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Themes Icon (No text label, just icon) */}
            <Link
              href="/themes"
              title="Change Theme"
              className={`p-2 rounded-md transition-all ${
                pathname === '/themes' ? activeBtnBg : hoverBtnBg
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </Link>
          </nav>

        </div>
      </div>
    </header>
  );
}
