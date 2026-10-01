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
    <div className="min-h-screen bg-lime-50 text-slate-900 p-4 sm:p-8 md:p-12 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-lime-200 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-lime-900">Settings & Notion Configuration</h1>
          <p className="text-sm text-lime-700 mt-1">
            Manage your Notion API tokens, database connections, and workspace settings.
          </p>
        </div>

        {/* Current Active Connection */}
        <div className="p-4 rounded-lg bg-lime-50 border border-lime-200 flex flex-col gap-3">
          <h2 className="text-base font-bold text-lime-950">Active Notion Database ID</h2>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              readOnly
              value={databaseId}
              className="flex-1 p-2.5 border border-lime-300 rounded-md bg-white font-mono text-xs sm:text-sm text-slate-800"
            />
            <button
              onClick={() => handleCopy(databaseId)}
              className="px-3.5 py-2.5 bg-lime-600 hover:bg-lime-700 text-white font-semibold rounded-md text-xs sm:text-sm transition-colors shadow-xs"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Instructions for switching to Brother's Real Database */}
        <div className="border border-lime-200 p-6 rounded-xl flex flex-col gap-4 bg-lime-50/60">
          <h2 className="text-lg font-bold text-lime-950">
            🔄 How to switch to your Brother&apos;s Real Database later
          </h2>

          <p className="text-sm text-slate-700 leading-relaxed">
            Since your website is currently connected to your copy database, here are the 2 simple steps to switch it to his original database whenever you are ready:
          </p>

          <ol className="list-decimal list-inside text-sm text-slate-800 flex flex-col gap-3 font-medium">
            <li className="p-3 bg-white rounded-lg border border-lime-200 shadow-xs">
              <strong className="text-lime-900">Grant Permission in Notion:</strong> Open your brother&apos;s real database in Notion, click the three dots (<code className="bg-lime-100 px-1 py-0.5 rounded text-xs">...</code>) at the top right, go to <strong>Connections</strong>, and add <code className="bg-lime-100 px-1 py-0.5 rounded text-xs">Antigravity-Notion</code>.
            </li>

            <li className="p-3 bg-white rounded-lg border border-lime-200 shadow-xs">
              <strong className="text-lime-900">Update ID in Vercel:</strong> Go to your <strong>Vercel Settings → Environment Variables</strong>, update <code className="bg-lime-100 px-1 py-0.5 rounded text-xs">NOTION_DATABASE_ID</code> with his Database ID, and hit <strong>Redeploy</strong>!
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
