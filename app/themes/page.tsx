'use client';

import React from 'react';
import { useTheme, ThemeName } from '../context/ThemeContext';

const themes: {
  id: ThemeName;
  name: string;
  tagline: string;
  desc: string;
  headerColor: string;
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
    id: 'emerald',
    name: 'Emerald Slate',
    tagline: '🌿 Corporate & Clean',
    desc: 'Professional deep-emerald header, soft mint page background, crisp white cards. Built for focus.',
    headerColor: '#064e3b',
    bgColor: '#f0fdf4',
    cardBg: '#ffffff',
    cardBorder: '#a7f3d0',
    accentColor: '#059669',
    accentText: '#ffffff',
    badgeBg: '#d1fae5',
    badgeText: '#065f46',
    previewText: '#064e3b',
  },
  {
    id: 'navy',
    name: 'Midnight Navy',
    tagline: '🌙 Dark & Sleek',
    desc: 'Full dark mode — deep navy backgrounds, cyan neon accents, glowing highlights. Easy on the eyes at night.',
    headerColor: '#060d1a',
    bgColor: '#0b1120',
    cardBg: '#162032',
    cardBorder: '#2d4a6b',
    accentColor: '#06b6d4',
    accentText: '#000000',
    badgeBg: '#083344',
    badgeText: '#67e8f9',
    previewText: '#e2e8f0',
  },
  {
    id: 'rose',
    name: 'Warm Rose',
    tagline: '🌸 Warm & Vibrant',
    desc: 'Deep rose header, blush-pink background, bold crimson accents. Warm, modern, and distinctive.',
    headerColor: '#881337',
    bgColor: '#fff1f2',
    cardBg: '#ffffff',
    cardBorder: '#fda4af',
    accentColor: '#e11d48',
    accentText: '#ffffff',
    badgeBg: '#ffe4e6',
    badgeText: '#9f1239',
    previewText: '#881337',
  },
];

export default function ThemesPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto font-[family-name:var(--font-geist-sans)]">
      <div
        className="p-6 sm:p-8 rounded-xl shadow-sm border flex flex-col gap-8 theme-surface theme-border"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-text flex items-center gap-3">
            🎨 Choose Your Website Theme
          </h1>
          <p className="text-sm theme-text-muted mt-1 leading-relaxed">
            Select a theme below. Your choice transforms the header, background, table, buttons, inputs, and badges
            across <strong>every page</strong> — and persists across sessions.
          </p>
        </div>

        {/* Theme Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {themes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-0 shadow-sm hover:shadow-lg overflow-hidden"
                style={{
                  borderColor: isSelected ? t.accentColor : t.cardBorder,
                  boxShadow: isSelected ? `0 0 0 3px ${t.accentColor}40` : '',
                }}
              >
                {/* Preview: header bar */}
                <div
                  className="h-10 flex items-center px-3 gap-2"
                  style={{ backgroundColor: t.headerColor }}
                >
                  {/* Fake logo */}
                  <div
                    className="w-5 h-5 rounded font-black text-[10px] flex items-center justify-center"
                    style={{ backgroundColor: t.accentColor, color: t.accentText }}
                  >
                    P
                  </div>
                  <span className="text-[10px] font-bold text-white opacity-90">PlaceRover</span>
                  <div className="ml-auto flex gap-1">
                    {['Extractor', 'Table'].map((label) => (
                      <span
                        key={label}
                        className="text-[8px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ backgroundColor: `${t.accentColor}33`, color: 'white' }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview: body */}
                <div
                  className="p-3 flex flex-col gap-2"
                  style={{ backgroundColor: t.bgColor }}
                >
                  {/* Fake card */}
                  <div
                    className="rounded-lg p-2 border flex flex-col gap-1.5"
                    style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}
                  >
                    {/* Fake table row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-medium" style={{ color: t.previewText }}>
                        John Doe — Senior Engineer
                      </span>
                      <span
                        className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: t.badgeBg, color: t.badgeText }}
                      >
                        Interview
                      </span>
                    </div>
                    <div
                      className="h-px w-full"
                      style={{ backgroundColor: t.cardBorder }}
                    />
                    <div className="flex gap-1">
                      <div
                        className="h-1.5 rounded-full flex-1"
                        style={{ backgroundColor: t.accentColor, opacity: 0.5 }}
                      />
                      <div
                        className="h-1.5 rounded-full w-1/3"
                        style={{ backgroundColor: t.cardBorder }}
                      />
                    </div>
                  </div>

                  {/* Fake button */}
                  <div className="flex justify-end">
                    <span
                      className="text-[8px] px-2 py-1 rounded font-bold"
                      style={{ backgroundColor: t.accentColor, color: t.accentText }}
                    >
                      Submit Entry
                    </span>
                  </div>
                </div>

                {/* Card footer */}
                <div
                  className="p-4 flex flex-col gap-1 border-t"
                  style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: t.previewText }}>
                        {t.name}
                      </h3>
                      <p className="text-[11px] font-medium" style={{ color: t.accentColor }}>
                        {t.tagline}
                      </p>
                    </div>
                    {isSelected && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: t.accentColor, color: t.accentText }}
                      >
                        ✓ Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: t.previewText, opacity: 0.75 }}>
                    {t.desc}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTheme(t.id);
                    }}
                    className="mt-3 w-full py-2 rounded-lg text-xs font-bold transition-all"
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
      </div>
    </div>
  );
}
