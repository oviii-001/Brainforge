import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('brainforge-theme');
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
      // First visit: default to system
      return 'system';
    }
    return 'light';
  });

  // Resolved theme is always 'light' or 'dark'
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    if (mode === 'system') return getSystemTheme();
    return mode;
  });

  // Apply theme class to <html> and persist
  useEffect(() => {
    const root = window.document.documentElement;
    const effective = mode === 'system' ? getSystemTheme() : mode;
    root.classList.remove('light', 'dark');
    root.classList.add(effective);
    setResolvedTheme(effective);
    localStorage.setItem('brainforge-theme', mode);
  }, [mode]);

  // Listen to OS preference changes (matters when mode === 'system')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (mode === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(newTheme);
        setResolvedTheme(newTheme);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setTheme = useCallback((newMode) => {
    if (newMode === 'light' || newMode === 'dark' || newMode === 'system') {
      setMode(newMode);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      // system: toggle to opposite of current resolved
      return resolvedTheme === 'dark' ? 'light' : 'dark';
    });
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, mode, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
