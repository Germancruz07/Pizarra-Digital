import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useConsent } from './ConsentContext';

const STORAGE_KEY = 'pd:theme';
const ThemeContext = createContext(null);
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Tema de la interfaz: 'light' | 'dark' | 'system' (sigue al sistema operativo). */
export function ThemeProvider({ children }) {
  const { allowsPreferences } = useConsent();
  const [preference, setPreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(() => media().matches);

  useEffect(() => {
    const mq = media();
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    root.classList.toggle('dark', resolved === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#12131a' : '#4f46e5');
    const t = setTimeout(() => root.classList.remove('theme-transition'), 350);
    return () => clearTimeout(t);
  }, [resolved]);

  // El tema solo se guarda si la persona aceptó la categoría "Preferencias".
  useEffect(() => {
    try {
      if (allowsPreferences) localStorage.setItem(STORAGE_KEY, preference);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* sin almacenamiento: el tema solo dura esta sesión */
    }
  }, [preference, allowsPreferences]);

  const setTheme = useCallback((value) => setPreference(value), []);

  const cycleTheme = useCallback(() => {
    setTheme(preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light');
  }, [preference, setTheme]);

  const value = useMemo(
    () => ({ preference, resolved, isDark: resolved === 'dark', setTheme, cycleTheme }),
    [preference, resolved, setTheme, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
