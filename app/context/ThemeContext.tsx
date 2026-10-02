'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'lime' | 'emerald' | 'navy';

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
    if (saved && ['lime', 'emerald', 'navy'].includes(saved)) {
      setThemeState(saved);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('placerover_theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme: mounted ? theme : 'emerald', setTheme }}>
      <div data-theme={mounted ? theme : 'emerald'} className="min-h-screen">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
