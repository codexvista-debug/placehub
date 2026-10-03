'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme, ThemeName } from '../context/ThemeContext';

const themes: {
  id: ThemeName;
  name: string;
  tagline: string;
  desc: string;
  headerColor: string;
  headerBorder: string;
  headerTextColor: string;
  bgColor: string;
  cardBg: string;
  cardBorder: string;
  accentColor: string;
  accentText: string;
  badgeBg: string;
  badgeText: string;
  previewText: string;
}[] = [
  {
    id: 'slate',
    name: 'Modern Slate',
    tagline: '⚡ Linear & Modern SaaS',
    desc: 'Ultra-clean modern tech aesthetic. Crisp white header, cool slate-50 canvas, and electric indigo accents.',
    headerColor: '#ffffff',
    headerBorder: '#e2e8f0',
    headerTextColor: '#0f172a',
    bgColor: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    accentColor: '#4f46e5',
    accentText: '#ffffff',
    badgeBg: '#eef2ff',
    badgeText: '#4338ca',
    previewText: '#0f172a',
  },
  {
    id: 'executive',
    name: 'Executive Blue',
    tagline: '🏛️ Stripe & Enterprise FinTech',
    desc: 'Prestigious corporate styling. Midnight sapphire header, porcelain ice-slate background, and royal cobalt accents.',
    headerColor: '#0f172a',
    headerBorder: '#1e293b',
    headerTextColor: '#ffffff',
    bgColor: '#f1f5f9',
    cardBg: '#ffffff',
    cardBorder: '#cbd5e1',
    accentColor: '#2563eb',
    accentText: '#ffffff',
    badgeBg: '#eff6ff',
    badgeText: '#1e40af',
    previewText: '#0f172a',
  },
  {
    id: 'minimal',
    name: 'Warm Minimal',
    tagline: '📖 Notion & Editorial Studio',
    desc: 'Calm, fatigue-free design. Gentle warm alabaster canvas, soft stone borders, and rich amber bronze accents.',
    headerColor: '#ffffff',
    headerBorder: '#e6e3da',
    headerTextColor: '#1c1917',
    bgColor: '#f7f6f3',
    cardBg: '#ffffff',
    cardBorder: '#e6e3da',
    accentColor: '#d97706',
    accentText: '#ffffff',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    previewText: '#1c1917',
  },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen theme-bg theme-text-body p-4 sm:p-8 md:p-12 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b theme-border">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl sm:text-3xl">⚙️</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold theme-text tracking-tight">
                Settings & Preferences
              </h1>
            </div>
            <p className="text-xs sm:text-sm theme-text-muted mt-1">
              Configure your visual theme, session security, and workspace preferences.
            </p>
          </div>
        </div>

        {/* Section 1: Workspace Themes */}
        <section className="p-6 sm:p-8 rounded-2xl border shadow-xs theme-surface theme-border flex flex-col gap-6">
          <div className="flex items-center justify-between border-b pb-4 theme-border">
            <div>
              <h2 className="text-lg font-bold theme-text flex items-center gap-2">
                <span>🎨</span> Workspace Theme
              </h2>
              <p className="text-xs theme-text-muted mt-0.5">
                Select a modern light theme to personalize your navigation, headers, and table colors across PlaceRover.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full theme-surface-alt theme-border border theme-text-muted">
              Active: {themes.find((t) => t.id === theme)?.name}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {themes.map((t) => {
              const isSelected = theme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-0 shadow-xs hover:shadow-md overflow-hidden"
                  style={{
                    borderColor: isSelected ? t.accentColor : t.cardBorder,
                    boxShadow: isSelected ? `0 0 0 3px ${t.accentColor}25` : '',
                  }}
                >
                  {/* Theme Preview Header */}
                  <div
                    className="h-10 flex items-center px-3 gap-2 border-b"
                    style={{
                      backgroundColor: t.headerColor,
                      borderColor: t.headerBorder,
                      color: t.headerTextColor,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded font-black text-[10px] flex items-center justify-center shadow-2xs"
                      style={{ backgroundColor: t.accentColor, color: t.accentText }}
                    >
                      P
                    </div>
                    <span className="text-[11px] font-bold tracking-tight">PlaceRover</span>
                    <div className="ml-auto flex gap-1">
                      {['Table', 'Metrics'].map((label, idx) => (
                        <span
                          key={label}
                          className="text-[8px] px-1.5 py-0.5 rounded font-semibold"
                          style={{
                            backgroundColor: idx === 0 ? `${t.accentColor}20` : 'transparent',
                            color: idx === 0 ? t.accentColor : t.headerTextColor,
                            opacity: idx === 0 ? 1 : 0.7,
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Theme Preview Canvas */}
                  <div
                    className="p-3 flex flex-col gap-2"
                    style={{ backgroundColor: t.bgColor }}
                  >
                    <div
                      className="rounded-xl p-2.5 border shadow-2xs flex flex-col gap-1.5"
                      style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold" style={{ color: t.previewText }}>
                          Ratna Vallabhaneni
                        </span>
                        <span
                          className="text-[8px] px-1.5 py-0.5 rounded-md font-bold border"
                          style={{
                            backgroundColor: t.badgeBg,
                            color: t.badgeText,
                            borderColor: t.cardBorder,
                          }}
                        >
                          SUBMITTED
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] opacity-60">
                        <span style={{ color: t.previewText }}>AI / ML • $65/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* Theme Details Footer */}
                  <div
                    className="p-4 flex flex-col gap-2 border-t flex-1 justify-between"
                    style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm" style={{ color: t.previewText }}>
                          {t.name}
                        </h3>
                        {isSelected && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: t.accentColor, color: t.accentText }}
                          >
                            ✓ Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: t.accentColor }}>
                        {t.tagline}
                      </p>
                      <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: t.previewText, opacity: 0.75 }}>
                        {t.desc}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTheme(t.id);
                      }}
                      className="mt-3 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      style={
                        isSelected
                          ? { backgroundColor: t.accentColor, color: t.accentText }
                          : {
                              backgroundColor: t.badgeBg,
                              color: t.badgeText,
                              border: `1px solid ${t.cardBorder}`,
                            }
                      }
                    >
                      {isSelected ? '✓ Currently Active' : 'Apply Theme'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Account & Security (Logout) */}
        <section className="p-6 sm:p-8 rounded-2xl border shadow-xs theme-surface theme-border flex flex-col gap-6">
          <div className="flex items-center justify-between border-b pb-4 theme-border">
            <div>
              <h2 className="text-lg font-bold theme-text flex items-center gap-2">
                <span>🔒</span> Account & Session Security
              </h2>
              <p className="text-xs theme-text-muted mt-0.5">
                Manage your logged-in administrator session and security settings.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border theme-surface-alt theme-border">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-lg shrink-0">
                🛡️
              </div>
              <div>
                <h3 className="text-sm font-bold theme-text">
                  Authenticated Administrator Session
                </h3>
                <p className="text-xs theme-text-muted mt-0.5">
                  Secured via 30-day HTTP session token. Sign out to lock access on this device.
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{isLoggingOut ? 'Locking Session...' : 'Sign Out & Lock Workspace'}</span>
            </button>
          </div>
        </section>

        {/* Section 3: System & Integration Status */}
        <section className="p-6 sm:p-8 rounded-2xl border shadow-xs theme-surface theme-border flex flex-col gap-4">
          <div className="border-b pb-4 theme-border">
            <h2 className="text-lg font-bold theme-text flex items-center gap-2">
              <span>🔌</span> Integration & System Status
            </h2>
            <p className="text-xs theme-text-muted mt-0.5">
              Data pipelines and connected backend integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border theme-surface-alt theme-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                  GS
                </div>
                <div>
                  <div className="text-xs font-bold theme-text">Google Sheets Pipeline</div>
                  <div className="text-[11px] theme-text-muted">Vercel Environment Variable</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200">
                ● Connected
              </span>
            </div>

            <div className="p-4 rounded-xl border theme-surface-alt theme-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  N
                </div>
                <div>
                  <div className="text-xs font-bold theme-text">Notion Database API</div>
                  <div className="text-[11px] theme-text-muted">One-Click Text Extractor Push</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                ● Active
              </span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
