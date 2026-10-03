'use client';

import React from 'react';
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
    desc: 'Ultra-clean, distraction-free modern tech aesthetic. Crisp white header, cool slate-50 canvas, and electric indigo accents.',
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
    desc: 'Prestigious corporate styling. Midnight sapphire header, porcelain ice-slate background, and authoritative royal cobalt accents.',
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
    desc: 'Calm, thoughtful, fatigue-free design. Gentle warm alabaster canvas, soft stone borders, and rich amber bronze accents.',
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

export default function ThemesPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto font-[family-name:var(--font-geist-sans)]">
      <div
        className="p-6 sm:p-8 rounded-2xl shadow-xs border flex flex-col gap-8 theme-surface theme-border"
      >
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold theme-text">
              Choose Workspace Theme
            </h1>
          </div>
          <p className="text-xs sm:text-sm theme-text-muted mt-1 leading-relaxed">
            Select a modern, high-precision aesthetic. Your selection instantly transforms the header, tables, forms,
            and navigation across the entire application.
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
                className="rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-0 shadow-xs hover:shadow-md overflow-hidden"
                style={{
                  borderColor: isSelected ? t.accentColor : t.cardBorder,
                  boxShadow: isSelected ? `0 0 0 3px ${t.accentColor}30` : '',
                }}
              >
                {/* Preview: Header Bar */}
                <div
                  className="h-10 flex items-center px-3 gap-2 border-b"
                  style={{
                    backgroundColor: t.headerColor,
                    borderColor: t.headerBorder,
                    color: t.headerTextColor,
                  }}
                >
                  {/* Fake logo */}
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

                {/* Preview: Body Canvas */}
                <div
                  className="p-3.5 flex flex-col gap-2.5"
                  style={{ backgroundColor: t.bgColor }}
                >
                  {/* Fake card */}
                  <div
                    className="rounded-xl p-2.5 border shadow-2xs flex flex-col gap-2"
                    style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}
                  >
                    {/* Fake table row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold" style={{ color: t.previewText }}>
                        Ratna Vallabhaneni — AI / ML
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

                    <div
                      className="h-px w-full"
                      style={{ backgroundColor: t.cardBorder }}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] opacity-60 font-mono" style={{ color: t.previewText }}>
                        Vanguard • $65/hr
                      </span>
                      <div className="flex gap-1">
                        <div
                          className="h-1.5 w-12 rounded-full"
                          style={{ backgroundColor: t.accentColor, opacity: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fake action button */}
                  <div className="flex justify-end">
                    <span
                      className="text-[9px] px-2.5 py-1 rounded-lg font-bold shadow-2xs"
                      style={{ backgroundColor: t.accentColor, color: t.accentText }}
                    >
                      Save Placement
                    </span>
                  </div>
                </div>

                {/* Card Footer Details */}
                <div
                  className="p-4 flex flex-col gap-1.5 border-t flex-1 justify-between"
                  style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}
                >
                  <div>
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
                    <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: t.previewText, opacity: 0.75 }}>
                      {t.desc}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTheme(t.id);
                    }}
                    className="mt-3.5 w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
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
