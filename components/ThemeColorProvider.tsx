'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type ColorTheme = 'yellow' | 'blue' | 'green' | 'pink';

interface ThemeColors {
  primary: string; // Main color (e.g., var(--theme-primary) for yellow)
  secondary: string; // Secondary shade (e.g., var(--theme-secondary) for yellow)
  tertiary: string; // Tertiary shade (e.g., var(--theme-tertiary) for yellow)
  light: string; // Very light background (e.g., var(--theme-light) for yellow)
  lighter: string; // Light background (e.g., var(--theme-lighter) for yellow)
}

const colorThemes: Record<ColorTheme, ThemeColors> = {
  yellow: {
    primary: '#eab308',
    secondary: '#ca9a04',
    tertiary: '#a87f03',
    light: '#fefce8',
    lighter: '#fef9c3'
  },
  blue: {
    primary: '#4a9ff4',
    secondary: '#3a8ee5',
    tertiary: '#2a7ed6',
    light: '#f7fbff',
    lighter: '#e8f4f8'
  },
  green: {
    primary: '#4af47d',
    secondary: '#3ae56c',
    tertiary: '#2ad65b',
    light: '#f7fff9',
    lighter: '#e8f8ee'
  },
  pink: {
    primary: '#f44a9f',
    secondary: '#e53a8e',
    tertiary: '#d62a7e',
    light: '#fff7fb',
    lighter: '#f8e8f4'
  }
};

interface ThemeColorContextType {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
  colors: ThemeColors;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ColorTheme>('yellow');

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('colorTheme') as ColorTheme;
    if (savedTheme && colorThemes[savedTheme]) {
      setThemeState(savedTheme);
    }
  }, []);

  const setTheme = (newTheme: ColorTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('colorTheme', newTheme);
    
    // Apply CSS variables for dynamic theming
    const colors = colorThemes[newTheme];
    document.documentElement.style.setProperty('--theme-primary', colors.primary);
    document.documentElement.style.setProperty('--theme-secondary', colors.secondary);
    document.documentElement.style.setProperty('--theme-tertiary', colors.tertiary);
    document.documentElement.style.setProperty('--theme-light', colors.light);
    document.documentElement.style.setProperty('--theme-lighter', colors.lighter);
  };

  // Apply theme colors on mount
  useEffect(() => {
    const colors = colorThemes[theme];
    document.documentElement.style.setProperty('--theme-primary', colors.primary);
    document.documentElement.style.setProperty('--theme-secondary', colors.secondary);
    document.documentElement.style.setProperty('--theme-tertiary', colors.tertiary);
    document.documentElement.style.setProperty('--theme-light', colors.light);
    document.documentElement.style.setProperty('--theme-lighter', colors.lighter);
  }, [theme]);

  return (
    <ThemeColorContext.Provider value={{ theme, setTheme, colors: colorThemes[theme] }}>
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColor() {
  const context = useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error('useThemeColor must be used within a ThemeColorProvider');
  }
  return context;
}

