import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'teewai-theme';

const systemTheme = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export function useTheme() {
  // No saved preference → follow the OS (mandatory behaviour on Android).
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(STORAGE_KEY) || systemTheme();
  });
  // Tracks whether the user has explicitly chosen a theme in-app.
  const [manual, setManual] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    // Only persist once the user has made a choice, so system-followers keep
    // following the system on their next visit.
    if (manual) localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, manual]);

  useEffect(() => {
    if (manual) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [manual]);

  const toggle = () => {
    setManual(true);
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };
  return { theme, toggle };
}

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-olo hover:bg-olo/10 transition-colors ${className}`}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}