'use client';

import React from 'react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen theme-bg theme-text-body p-4 sm:p-8 md:p-12 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-xl shadow-sm border flex flex-col items-center justify-center text-center gap-4 theme-surface theme-border min-h-[400px]">
        <div className="w-16 h-16 rounded-full flex items-center justify-center theme-surface-alt theme-border border text-3xl">
          ⚙️
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-text">
            Settings
          </h1>
          <p className="text-sm theme-text-muted mt-2 max-w-md mx-auto">
            Workspace configuration and custom settings will be available here soon.
          </p>
        </div>
      </div>
    </div>
  );
}
