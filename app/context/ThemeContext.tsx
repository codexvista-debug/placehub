'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'glass' | 'silver' | 'slate' | 'executive' | 'graphite' | 'ocean' | 'dusk';

export type BackgroundName =
  | 'default'
  | 'dots'
  | 'grid'
  | 'glow'
  | 'isometric'
  | 'stripes'
  | 'sunset'
  | 'topography';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  background: BackgroundName;
  setBackground: (bg: BackgroundName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'glass',
  setTheme: () => {},
  background: 'default',
  setBackground: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('glass');
  const [background, setBackgroundState] = useState<BackgroundName>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Theme initialization
    const savedTheme = localStorage.getItem('placerover_theme') as ThemeName;
    const validThemes: ThemeName[] = ['glass', 'silver', 'slate', 'executive', 'graphite', 'ocean', 'dusk'];
    if (savedTheme && validThemes.includes(savedTheme)) {
      setThemeState(savedTheme);
    } else {
      setThemeState('glass');
      localStorage.setItem('placerover_theme', 'glass');
    }

    // 2. Background initialization (default: 'default' - keeps current clean theme canvas)
    const savedBg = localStorage.getItem('placerover_bg') as BackgroundName;
    const validBgs: BackgroundName[] = ['default', 'dots', 'grid', 'glow', 'isometric', 'stripes', 'sunset', 'topography'];
    if (savedBg && validBgs.includes(savedBg)) {
      setBackgroundState(savedBg);
    } else {
      setBackgroundState('default');
      localStorage.setItem('placerover_bg', 'default');
    }

    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('placerover_theme', newTheme);
  };

  const setBackground = (newBg: BackgroundName) => {
    setBackgroundState(newBg);
    localStorage.setItem('placerover_bg', newBg);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-bg', newBg);
    }
  };

  const activeTheme = mounted ? theme : 'glass';
  const activeBg = mounted ? background : 'default';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-bg', activeBg);
      document.documentElement.setAttribute('data-theme', activeTheme);
    }
  }, [activeBg, activeTheme]);

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, setTheme, background: activeBg, setBackground }}>
      <div
        data-theme={activeTheme}
        data-bg={activeBg}
        className="min-h-screen theme-bg theme-text-body transition-colors duration-300"
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
