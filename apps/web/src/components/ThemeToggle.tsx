'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Light/dark toggle. Persists to localStorage('nexus-theme') and flips the
 * `dark` class on <html>. The pre-paint init lives in the root layout, so this
 * only handles user-initiated changes.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('nexus-theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={mounted ? (dark ? 'Switch to light' : 'Switch to dark') : 'Toggle theme'}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted hover:text-foreground hover:bg-hover transition-colors ${className}`}
    >
      {mounted && dark ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
    </button>
  );
}
