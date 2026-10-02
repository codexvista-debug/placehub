'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
  const [databaseId, setDatabaseId] = useState('f1ac713f-b415-83a1-819d-87674597c07b');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen theme-bg theme-text-body p-4 sm:p-8 md:p-12 font-[family-name:var(--font-geist-sans)]">
      <div
        className="max-w-4xl mx-auto p-6 sm:p-8 rounded-xl shadow-sm border flex flex-col gap-6 theme-surface theme-border"
      >
        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold theme-text">
            Settings &amp; Notion Configuration
          </h1>
          <p className="text-sm theme-text-muted mt-1">
            Manage your Notion API tokens, database connections, and workspace settings.
          </p>
        </div>

        {/* Active DB ID */}
        <div className="p-4 rounded-lg border flex flex-col gap-3 theme-surface-alt theme-border">
          <h2 className="text-base font-bold theme-text">Active Notion Database ID</h2>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              readOnly
              value={databaseId}
              className="flex-1 p-2.5 border rounded-md font-mono text-xs sm:text-sm theme-input theme-border"
            />
            <button
              onClick={() => handleCopy(databaseId)}
              className="px-3.5 py-2.5 font-semibold rounded-md text-xs sm:text-sm transition-colors shadow-xs theme-btn"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="border p-6 rounded-xl flex flex-col gap-4 theme-surface-alt theme-border">
          <h2 className="text-lg font-bold theme-text">
            🔄 How to switch to your Brother&apos;s Real Database later
          </h2>

          <p className="text-sm theme-text-body leading-relaxed">
            Since your website is currently connected to your copy database, here are the 2 simple steps to switch it to his original database whenever you are ready:
          </p>

          <ol className="list-decimal list-inside text-sm flex flex-col gap-3 font-medium theme-text-body">
            <li className="p-3 rounded-lg border shadow-xs theme-surface theme-border">
              <strong className="theme-text">Grant Permission in Notion:</strong> Open your brother&apos;s real database in Notion, click the three dots (
              <code className="theme-code px-1 py-0.5 rounded text-xs">...</code>
              ) at the top right, go to <strong>Connections</strong>, and add{' '}
              <code className="theme-code px-1 py-0.5 rounded text-xs">Antigravity-Notion</code>.
            </li>

            <li className="p-3 rounded-lg border shadow-xs theme-surface theme-border">
              <strong className="theme-text">Update ID in Vercel:</strong> Go to your{' '}
              <strong>Vercel Settings → Environment Variables</strong>, update{' '}
              <code className="theme-code px-1 py-0.5 rounded text-xs">NOTION_DATABASE_ID</code>{' '}
              with his Database ID, and hit <strong>Redeploy</strong>!
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
