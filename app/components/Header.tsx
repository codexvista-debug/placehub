'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useNotifications } from '@/app/context/NotificationContext';

export default function Header() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  // If we are on the login page, hide navigation header items
  if (pathname === '/login') {
    return null;
  }

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
      name: 'Interviews',
      path: '/',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Team Submissions',
      path: '/team-submissions',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Vendor Info',
      path: '/vendor-info',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      name: 'Notifications',
      path: '/notifications',
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : null,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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

  return (
    <header
      className="sticky top-0 z-40 shadow-xs border-b transition-all duration-300"
      style={{
        background: 'var(--color-header-bg)',
        borderColor: 'var(--color-header-border)',
        color: 'var(--color-header-text)',
        backdropFilter: 'var(--header-backdrop, none)',
        WebkitBackdropFilter: 'var(--header-backdrop, none)',
      }}
    >
      <div className="max-w-full mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            title="Go to Interviews"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs transition-transform hover:scale-105 border border-slate-200/80 bg-white"
            >
              <svg className="w-5 h-5 drop-shadow-2xs" viewBox="0 0 24 24" fill="none">
                {/* 1st Paw Finger (Leftmost / Dewclaw) */}
                <path
                  d="M5.5 11c-1.38 0-2.5 1.12-2.5 2.5S4.12 16 5.5 16 8 14.88 8 13.5 6.88 11 5.5 11z"
                  fill="#d97706"
                />
                {/* 2nd Paw Finger (Upper Left) */}
                <path
                  d="M7.5 3C6.12 3 5 4.12 5 5.5S6.12 8 7.5 8 10 6.88 10 5.5 8.88 3 7.5 3z"
                  fill="#f97316"
                />
                {/* 3rd Paw Finger (Upper Right) */}
                <path
                  d="M16.5 3C15.12 3 14 4.12 14 5.5S15.12 8 16.5 8 19 6.88 19 5.5 17.88 3 16.5 3z"
                  fill="#f97316"
                />
                {/* 4th Paw Finger (Rightmost) */}
                <path
                  d="M18.5 11c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z"
                  fill="#f97316"
                />
                {/* Main Paw Pad */}
                <path
                  d="M12 14c-2.76 0-5 1.79-5 4 0 1.66 1.34 3 3 3h4c1.66 0 3-1.34 3-3 0-2.21-2.24-4-5-4z"
                  fill="#f97316"
                />
                {/* Tiger stripes */}
                <path
                  d="M6.1 12.1 7.4 13M6 14.2l1.5.7M6.9 5.9l1.4.8M8 4.5l1.2.7M15.1 4.5l1.2-.7M14.8 5.9l1.4-.8M17.9 12.1l-1.3.9M18 14.2l-1.5.7M9.5 16.3l1.3.4M9 18l1.5.2M14.5 16.3l-1.3.4M15 18l-1.5.2"
                  stroke="#2b160b"
                  strokeWidth="0.85"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
            <span
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: 'var(--color-header-text)' }}
            >
              RemoteTiger
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer relative"
                  style={{
                    backgroundColor: isActive ? 'var(--color-header-active)' : 'transparent',
                    color: 'var(--color-header-text)',
                    opacity: isActive ? 1 : 0.85,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-header-hover)';
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLElement).style.opacity = '0.85';
                    }
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    {item.icon}
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-[14px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-1 ring-white/60 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

        </div>
      </div>
    </header>
  );
}
