'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme, ThemeName, BackgroundName } from '../context/ThemeContext';

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
    id: 'glass',
    name: 'Liquid Glass',
    tagline: '🔮 Apple & Frosted Glassmorphism',
    desc: 'Frosted translucent header with specular edge highlight, airy canvas, luminous cyan accents, and glassy elevated cards.',
    headerColor: 'rgba(255, 255, 255, 0.85)',
    headerBorder: 'rgba(203, 213, 225, 0.7)',
    headerTextColor: '#0f172a',
    bgColor: '#f8fafd',
    cardBg: '#ffffff',
    cardBorder: '#dbe4ee',
    accentColor: '#0284c7',
    accentText: '#ffffff',
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
    previewText: '#0c192c',
  },
  {
    id: 'silver',
    name: 'Brushed Silver',
    tagline: '⚙️ Chrome & Precision Hardware',
    desc: 'Metallic brushed-chrome gradient header with hairline steel edge, platinum canvas, titanium table head, and cobalt accents.',
    headerColor: 'linear-gradient(180deg, #f8fafc 0%, #cbd5e1 100%)',
    headerBorder: '#94a3b8',
    headerTextColor: '#0f172a',
    bgColor: '#edf1f6',
    cardBg: '#ffffff',
    cardBorder: '#cbd5e1',
    accentColor: '#1d4ed8',
    accentText: '#ffffff',
    badgeBg: '#e0e7ff',
    badgeText: '#1e3a8a',
    previewText: '#0f172a',
  },
  {
    id: 'slate',
    name: 'Modern Slate',
    tagline: '⚡ Linear & Modern SaaS',
    desc: 'Ultra-clean tech aesthetic. Pure white header, cool slate canvas, electric indigo accent. Crisp, distraction-free default.',
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
    desc: 'Midnight sapphire header, porcelain ice-slate canvas, royal cobalt accent. Authoritative corporate aesthetic built for dense review.',
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
    id: 'graphite',
    name: 'Graphite',
    tagline: '📊 Bloomberg Terminal & Data Grid',
    desc: 'Charcoal zinc header, ash-white canvas, teal-green accent. Premium financial terminal aesthetic built for ultra-dense table scanning.',
    headerColor: '#27272a',
    headerBorder: '#3f3f46',
    headerTextColor: '#f4f4f5',
    bgColor: '#f4f4f5',
    cardBg: '#fafafa',
    cardBorder: '#d4d4d8',
    accentColor: '#0d9488',
    accentText: '#ffffff',
    badgeBg: '#ccfbf1',
    badgeText: '#0f4c47',
    previewText: '#27272a',
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    tagline: '🌊 Product Analytics & Open Data',
    desc: 'Deep oceanic gradient header, clear sky-50 canvas, vivid sky-blue accent and borders. Energetic and airy — data that breathes.',
    headerColor: 'linear-gradient(135deg, #075985 0%, #0c4a6e 100%)',
    headerBorder: '#0369a1',
    headerTextColor: '#e0f2fe',
    bgColor: '#f0f9ff',
    cardBg: '#ffffff',
    cardBorder: '#7dd3fc',
    accentColor: '#0284c7',
    accentText: '#ffffff',
    badgeBg: '#e0f2fe',
    badgeText: '#075985',
    previewText: '#0c4a6e',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    tagline: '🌆 Luxury Boutique & Studio Editorial',
    desc: 'Deep royal-plum gradient header, ghostly lavender canvas, violet accent. Rich purple identity where editorial luxury meets analytics.',
    headerColor: 'linear-gradient(135deg, #3b0764 0%, #2e1065 100%)',
    headerBorder: '#3d1b84',
    headerTextColor: '#ede9fe',
    bgColor: '#f4f0fb',
    cardBg: '#ffffff',
    cardBorder: '#cfc0ea',
    accentColor: '#8b5cf6',
    accentText: '#ffffff',
    badgeBg: '#ede9fe',
    badgeText: '#4c1d95',
    previewText: '#2d1155',
  },
];

const backgrounds: {
  id: BackgroundName;
  name: string;
  tagline: string;
  desc: string;
  previewClass: string;
}[] = [
  {
    id: 'default',
    name: 'Clean Canvas',
    tagline: '✨ Default Solid Canvas',
    desc: 'The original pure theme background with no textures or patterns. Clean, minimal, and focused.',
    previewClass: '',
  },
  {
    id: 'dots',
    name: 'Tech Dot Matrix',
    tagline: '⚡ Linear & Raycast Dots',
    desc: 'Subtle technical dot grid used by modern developer platforms and high-precision tools.',
    previewClass: 'preview-bg-dots',
  },
  {
    id: 'grid',
    name: 'Blueprint Grid',
    tagline: '📐 Engineering Grid Lines',
    desc: 'Fine architectural grid lines giving structured geometry and data-grid precision.',
    previewClass: 'preview-bg-grid',
  },
  {
    id: 'glow',
    name: 'Luminous Aura',
    tagline: '🔮 Ambient Radial Glow',
    desc: 'Soft atmospheric cyan, violet, and pink ambient glows radiating softly across corners.',
    previewClass: 'preview-bg-glow',
  },
  {
    id: 'isometric',
    name: 'Isometric Lattice',
    tagline: '💎 3D Diamond Geometry',
    desc: 'Isometric diamond line lattice adding architectural depth and spatial elegance.',
    previewClass: 'preview-bg-isometric',
  },
  {
    id: 'stripes',
    name: 'Diagonal Stripes',
    tagline: '🏎️ Carbon Micro-Hatch',
    desc: 'Fine 45-degree micro-hatch diagonal lines for a dynamic, carbon-fiber textured finish.',
    previewClass: 'preview-bg-stripes',
  },
  {
    id: 'sunset',
    name: 'Golden Hour Sunset',
    tagline: '🌅 Warm Ambient Mesh',
    desc: 'Warm ambient sunset mesh with peach, amber, and coral glows radiating across the page.',
    previewClass: 'preview-bg-sunset',
  },
  {
    id: 'topography',
    name: 'Topographic Contours',
    tagline: '🗺️ Map Elevation Curves',
    desc: 'Subtle concentric contour curves reminiscent of architectural and geographic maps.',
    previewClass: 'preview-bg-topography',
  },
];

export default function SettingsPage() {
  const { theme, setTheme, background, setBackground } = useTheme();
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
                Select a modern light theme to personalize your navigation, headers, and table colors across RemoteTiger.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full theme-surface-alt theme-border border theme-text-muted">
              Active: {themes.find((t) => t.id === theme)?.name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                      background: t.headerColor,
                      borderColor: t.headerBorder,
                      color: t.headerTextColor,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center shadow-2xs bg-white border border-slate-200/80"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <path d="M5.5 11c-1.38 0-2.5 1.12-2.5 2.5S4.12 16 5.5 16 8 14.88 8 13.5 6.88 11 5.5 11z" fill="#94a3b8" />
                        <path d="M7.5 3C6.12 3 5 4.12 5 5.5S6.12 8 7.5 8 10 6.88 10 5.5 8.88 3 7.5 3z" fill="#f97316" />
                        <path d="M16.5 3C15.12 3 14 4.12 14 5.5S15.12 8 16.5 8 19 6.88 19 5.5 17.88 3 16.5 3z" fill="#f97316" />
                        <path d="M18.5 11c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" fill="#f97316" />
                        <path d="M12 14c-2.76 0-5 1.79-5 4 0 1.66 1.34 3 3 3h4c1.66 0 3-1.34 3-3 0-2.21-2.24-4-5-4z" fill="#f97316" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold tracking-tight">RemoteTiger</span>
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

        {/* Section 2: Workspace Background Canvas (Works Separately from Themes) */}
        <section className="p-6 sm:p-8 rounded-2xl border shadow-xs theme-surface theme-border flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 theme-border">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xl">🖼️</span>
                <h2 className="text-lg font-bold theme-text">
                  Workspace Background Canvas
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  Universal Texture
                </span>
              </div>
              <p className="text-xs theme-text-muted mt-0.5">
                Select an architectural background texture that overlays across all pages and routes. Operates independently from your theme palette, with the clean solid canvas set as default.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full theme-surface-alt theme-border border theme-text-muted shrink-0">
              Active: {backgrounds.find((b) => b.id === background)?.name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {backgrounds.map((b) => {
              const isSelected = background === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setBackground(b.id)}
                  className="rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-0 shadow-xs hover:shadow-md overflow-hidden"
                  style={{
                    borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                    boxShadow: isSelected ? '0 0 0 3px rgba(2, 132, 199, 0.22)' : undefined,
                  }}
                >
                  {/* Background Live Preview Box */}
                  <div
                    className={`h-24 p-3 flex flex-col justify-between border-b relative ${b.previewClass}`}
                    style={{
                      backgroundColor: 'var(--color-bg)',
                      borderColor: 'var(--color-border-soft)',
                    }}
                  >
                    <div className="flex items-center justify-between z-10">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md theme-surface border theme-border shadow-2xs">
                        {b.name}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                          ✓ Active
                        </span>
                      )}
                    </div>

                    <div className="rounded-lg p-2 theme-surface border theme-border shadow-2xs flex items-center justify-between text-[10px] font-semibold z-10">
                      <span className="truncate">Sample Table Canvas</span>
                      <span className="text-[8px] px-1 py-0.5 rounded theme-badge font-bold">
                        PREVIEW
                      </span>
                    </div>
                  </div>

                  {/* Background Details Footer */}
                  <div className="p-3.5 flex flex-col gap-1.5 theme-surface flex-1 justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xs theme-text">
                          {b.name}
                        </h3>
                        {b.id === 'default' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-sky-600 mt-0.5">
                        {b.tagline}
                      </p>
                      <p className="text-[10px] theme-text-muted mt-1 leading-relaxed">
                        {b.desc}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBackground(b.id);
                      }}
                      className="mt-2.5 w-full py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      style={
                        isSelected
                          ? { backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }
                          : {
                              backgroundColor: 'var(--color-surface-alt)',
                              color: 'var(--color-text)',
                              border: '1px solid var(--color-border)',
                            }
                      }
                    >
                      {isSelected ? '✓ Currently Active' : 'Apply Background'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Account & Security (Logout) */}
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

        {/* Section 4: System & Integration Status */}
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
                  <div className="text-xs font-bold theme-text">Notion Placements Database</div>
                  <div className="text-[11px] theme-text-muted">Live Table &amp; Text Extractor Push</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                ● Active
              </span>
            </div>

            <div className="p-4 rounded-xl border theme-surface-alt theme-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                  🇮🇳
                </div>
                <div>
                  <div className="text-xs font-bold theme-text">Desi Vendor Info Database</div>
                  <div className="text-[11px] theme-text-muted">Vendor Directory Sync</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                ● Connected
              </span>
            </div>

            <div className="p-4 rounded-xl border theme-surface-alt theme-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  🌐
                </div>
                <div>
                  <div className="text-xs font-bold theme-text">PV Vendor Info Database</div>
                  <div className="text-[11px] theme-text-muted">Vendor Directory Sync</div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                ● Connected
              </span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
