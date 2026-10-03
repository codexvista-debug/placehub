'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ThemesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings');
  }, [router]);

  return (
    <div className="min-h-screen theme-bg theme-text-body p-8 font-[family-name:var(--font-geist-sans)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm theme-text-muted">Redirecting to Settings...</p>
      </div>
    </div>
  );
}
