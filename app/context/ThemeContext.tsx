'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'slate' | 'executive' | 'minimal';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'slate',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('slate');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('placerover_theme') as ThemeName;
    if (saved && ['slate', 'executive', 'minimal'].includes(saved)) {
      setThemeState(saved);
    } else {
      // Clear out deprecated legacy themes if any
      setThemeState('slate');
      localStorage.setItem('placerover_theme', 'slate');
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('placerover_theme', newTheme);
  };

  const activeTheme = mounted ? theme : 'slate';

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
