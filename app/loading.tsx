import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen theme-bg theme-text-body p-2 sm:p-4 font-[family-name:var(--font-geist-sans)] animate-pulse">
      <main className="w-full max-w-full mx-auto flex flex-col theme-surface p-2 sm:p-4 rounded-xl shadow-xs border theme-border overflow-hidden">
        {/* Top Control Bar Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b theme-border">
          <div className="flex items-center gap-2">
            <div className="w-28 h-8 rounded-lg theme-surface-alt theme-border border"></div>
            <div className="w-36 h-8 rounded-lg theme-surface-alt theme-border border"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-48 h-8 rounded-lg theme-surface-alt theme-border border"></div>
            <div className="w-24 h-6 rounded-full theme-surface-alt"></div>
          </div>
        </div>

        {/* Action / Search Bar Skeleton */}
        <div className="flex items-center justify-between gap-3 py-3 border-b theme-border">
          <div className="w-64 h-7 rounded-md theme-surface-alt"></div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-7 rounded-md theme-surface-alt"></div>
            <div className="w-14 h-7 rounded-md theme-surface-alt"></div>
            <div className="w-16 h-7 rounded-md theme-surface-alt"></div>
          </div>
        </div>

        {/* Table Header & Rows Skeleton */}
        <div className="w-full mt-2 rounded-lg border theme-table-border overflow-hidden">
          {/* Table Header */}
          <div className="h-10 w-full flex items-center px-3 gap-2 theme-table-head border-b theme-table-border">
            <div className="w-8 h-4 rounded bg-white/20"></div>
            <div className="w-24 h-4 rounded bg-white/20"></div>
            <div className="w-36 h-4 rounded bg-white/20"></div>
            <div className="w-40 h-4 rounded bg-white/20"></div>
            <div className="w-32 h-4 rounded bg-white/20"></div>
            <div className="w-28 h-4 rounded bg-white/20"></div>
            <div className="w-24 h-4 rounded bg-white/20"></div>
            <div className="w-24 h-4 rounded bg-white/20"></div>
            <div className="flex-1 h-4 rounded bg-white/20"></div>
          </div>

          {/* Table Rows (8 skeleton rows) */}
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className={`h-11 w-full flex items-center px-3 gap-2 border-b theme-table-border ${
                idx % 2 === 0 ? 'theme-surface' : 'theme-surface-alt'
              }`}
            >
              <div className="w-8 h-3 rounded bg-black/10 dark:bg-white/10"></div>
              <div className="w-20 h-4 rounded-full bg-blue-100/60 dark:bg-blue-900/30"></div>
              <div className="w-32 h-3.5 rounded bg-black/10 dark:bg-white/10"></div>
              <div className="w-36 h-3.5 rounded bg-black/10 dark:bg-white/10"></div>
              <div className="w-28 h-4 rounded-full bg-emerald-100/60 dark:bg-emerald-900/30"></div>
              <div className="w-24 h-4 rounded-full bg-purple-100/60 dark:bg-purple-900/30"></div>
              <div className="w-20 h-3.5 rounded bg-black/10 dark:bg-white/10"></div>
              <div className="w-20 h-3.5 rounded bg-black/10 dark:bg-white/10"></div>
              <div className="flex-1 h-3.5 rounded bg-black/10 dark:bg-white/10"></div>
            </div>
          ))}
        </div>

        {/* Bottom Loading Indicator */}
        <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold theme-text-muted">
          <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin theme-border border-t-[var(--color-accent)]"></div>
          <span>Loading RemoteTiger Live Table...</span>
        </div>
      </main>
    </div>
  );
}
