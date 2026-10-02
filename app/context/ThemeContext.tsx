'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'emerald' | 'navy' | 'rose';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'emerald',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('emerald');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('placerover_theme') as ThemeName;
    if (saved && ['emerald', 'navy', 'rose'].includes(saved)) {
      setThemeState(saved);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('placerover_theme', newTheme);
  };

  const activeTheme = mounted ? theme : 'emerald';

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, setTheme }}>
      <div
        data-theme={activeTheme}
        className="min-h-screen theme-bg theme-text-body"
        style={{ minHeight: '100vh' }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
