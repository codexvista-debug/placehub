'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'glass' | 'silver' | 'slate' | 'executive' | 'graphite' | 'ocean' | 'dusk';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'glass',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('glass');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('placerover_theme') as ThemeName;
    const validThemes: ThemeName[] = ['glass', 'silver', 'slate', 'executive', 'graphite', 'ocean', 'dusk'];
    if (saved && validThemes.includes(saved)) {
      setThemeState(saved);
    } else {
      // Default to glass or migrate legacy themes
      setThemeState('glass');
      localStorage.setItem('placerover_theme', 'glass');
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
