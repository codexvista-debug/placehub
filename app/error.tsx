'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-[family-name:var(--font-geist-sans)]">
      <div className="p-8 max-w-md w-full rounded-2xl border theme-border theme-surface shadow-md flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-3xl">
          ⚠️
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold theme-text">
            Unable to load page
          </h2>
          <p className="text-xs theme-text-muted">
            The data service may be refreshing or temporarily unavailable. You can retry loading or return to the main table.
          </p>
          {error?.message && (
            <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2 rounded-lg mt-2 break-all text-left">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 w-full mt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-2 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 py-2 px-4 rounded-xl border theme-border theme-surface hover:theme-surface-alt theme-text text-xs font-semibold transition-all text-center"
          >
            Interviews
          </Link>
        </div>
      </div>
    </div>
  );
}
