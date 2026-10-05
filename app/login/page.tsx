'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginFormContent() {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        router.push(from);
        router.refresh();
      } else {
        setError(json.error || 'Incorrect passcode. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-xl border flex flex-col gap-6 theme-surface theme-border animate-fadeIn">
      
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md bg-white border border-slate-200/80"
        >
          <svg className="w-8 h-8 drop-shadow-2xs" viewBox="0 0 24 24" fill="none">
            <path d="M5.5 11c-1.38 0-2.5 1.12-2.5 2.5S4.12 16 5.5 16 8 14.88 8 13.5 6.88 11 5.5 11z" fill="#94a3b8" />
            <path d="M7.5 3C6.12 3 5 4.12 5 5.5S6.12 8 7.5 8 10 6.88 10 5.5 8.88 3 7.5 3z" fill="#f97316" />
            <path d="M16.5 3C15.12 3 14 4.12 14 5.5S15.12 8 16.5 8 19 6.88 19 5.5 17.88 3 16.5 3z" fill="#f97316" />
            <path d="M18.5 11c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" fill="#f97316" />
            <path d="M12 14c-2.76 0-5 1.79-5 4 0 1.66 1.34 3 3 3h4c1.66 0 3-1.34 3-3 0-2.21-2.24-4-5-4z" fill="#f97316" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight theme-text">
            RemoteTiger Access
          </h1>
          <p className="text-xs sm:text-sm theme-text-muted mt-1">
            Enter your shared security passcode to access the portal.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Passcode Form */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold theme-text mb-1.5">
            Security Passcode
          </label>
          <input
            type="password"
            autoFocus
            required
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter access passcode..."
            className="w-full p-3 border rounded-xl text-sm theme-input theme-border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono tracking-wider"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !passcode.trim()}
          className="w-full py-3.5 font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 theme-btn"
        >
          <span>{loading ? 'Verifying...' : 'Unlock Portal →'}</span>
        </button>
      </form>

      {/* Footer Info */}
      <div className="pt-2 text-center border-t theme-border text-[11px] theme-text-muted">
        <span>🔒 Protected with encrypted 30-day session authorization.</span>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen theme-bg theme-text-body flex items-center justify-center p-4 font-[family-name:var(--font-geist-sans)]">
      <Suspense fallback={<div className="text-sm font-semibold theme-text">Loading security portal...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
