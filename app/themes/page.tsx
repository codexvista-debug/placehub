'use client';

import React from 'react';
import { useTheme, ThemeName } from '../context/ThemeContext';

export default function ThemesPage() {
  const { theme, setTheme } = useTheme();

  const themesList: { id: ThemeName; name: string; desc: string; previewHeader: string; previewBg: string; previewCard: string }[] = [
    {
      id: 'emerald',
      name: 'Emerald Slate (Recommended)',
      desc: 'Clean corporate theme with deep emerald headers, soft mint background, and crisp high-contrast cards.',
      previewHeader: 'bg-emerald-900',
      previewBg: 'bg-emerald-50',
      previewCard: 'bg-white border-emerald-300',
    },
    {
      id: 'navy',
      name: 'Midnight Navy (Dark Theme)',
      desc: 'Sleek dark mode theme with royal navy headers, dark slate backgrounds, and vibrant neon sapphire badges.',
      previewHeader: 'bg-slate-950',
      previewBg: 'bg-slate-900',
      previewCard: 'bg-slate-800 border-slate-700 text-white',
    },
    {
      id: 'lime',
      name: 'Lime Rover (Classic)',
      desc: 'Fresh lime-green theme with vibrant highlights and high visibility spreadsheet gridlines.',
      previewHeader: 'bg-lime-900',
      previewBg: 'bg-lime-50',
      previewCard: 'bg-white border-lime-300',
    },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto font-[family-name:var(--font-geist-sans)]">
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            🎨 Choose Your Website Theme
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Select a custom color theme below. Your choice immediately transforms the header, background, table, buttons, and badges across all pages and persists permanently!
          </p>
        </div>

        {/* Theme Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {themesList.map((t) => {
            const isSelected = theme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${
                  isSelected
                    ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/30 dark:bg-slate-700/80'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{t.name}</h3>
                    {isSelected && (
                      <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{t.desc}</p>
                </div>

                {/* Theme Visual Preview Box */}
                <div className={`p-3 rounded-lg ${t.previewBg} border border-slate-200 flex flex-col gap-2`}>
                  <div className={`h-4 rounded ${t.previewHeader} w-full`} />
                  <div className={`h-12 rounded ${t.previewCard} p-2 flex items-center justify-between text-[10px]`}>
                    <span>Table View</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold">Pill</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTheme(t.id);
                  }}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition-colors shadow-2xs ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? '✓ Currently Active' : 'Apply Theme'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
