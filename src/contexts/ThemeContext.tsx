import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Theme } from '../types';
import { auth } from '../services/firebase';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  accentColor: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUid, setCurrentUid] = useState<string>(() => auth.currentUser?.uid || 'anon');

  const [theme, setThemeState] = useState<Theme>(() => {
    const uid = auth.currentUser?.uid || 'anon';
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`lifeos_${uid}_theme`) : null;
    return saved === 'light' ? 'light' : 'dark'; // dark is default
  });

  const accentColor = '#6366f1';

  // Listen to auth changes to switch theme key based on active UID
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      const uid = user?.uid || 'anon';
      setCurrentUid(uid);
      if (typeof window !== 'undefined') {
        const userSaved = localStorage.getItem(`lifeos_${uid}_theme`);
        if (userSaved === 'light' || userSaved === 'dark') {
          setThemeState(userSaved);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`lifeos_${currentUid}_theme`, theme);
      } catch {
        // Safe localStorage write
      }
    }
  }, [theme, currentUid]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, accentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
