'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  toggle: (event?: MouseEvent<HTMLButtonElement>) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'resenhometro_theme';

/** Só chamada quando a pessoa escolhe: grava a escolha e marca o <html>. Sem escolha, o CSS segue o sistema. */
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

function storedTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // Só lê (sem gravar): o tema "resolvido" serve ao ícone do botão. Sem escolha salva, acompanha o sistema.
  useEffect(() => {
    setTheme(storedTheme() ?? systemTheme());
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (storedTheme() === null) setTheme(systemTheme());
    };
    media.addEventListener('change', onSystemChange);
    return () => media.removeEventListener('change', onSystemChange);
  }, []);

  const toggle = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    const x = event?.clientX ?? window.innerWidth - 48;
    const y = event?.clientY ?? 48;
    root.style.setProperty('--theme-x', `${x}px`);
    root.style.setProperty('--theme-y', `${y}px`);

    const commit = () => {
      applyTheme(next);
      setTheme(next);
    };

    const doc = document as Document & {
      startViewTransition?: (update: () => void) => { finished: Promise<void> };
    };

    if (!prefersReducedMotion() && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(commit);
      return;
    }

    commit();
  }, [theme]);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: 'light' as Theme, toggle: () => undefined };
  return ctx;
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const reduce = useReducedMotion() === true;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`icon-btn ${className}`}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      aria-pressed={theme === 'light'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="theme-toggle-icon"
          initial={reduce ? false : { rotate: -80, opacity: 0, scale: 0.55 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { rotate: 80, opacity: 0, scale: 0.55 }}
          transition={{ duration: reduce ? 0 : 0.28 }}
        >
          {theme === 'dark' ? <Sun size={20} strokeWidth={2} aria-hidden /> : <Moon size={20} strokeWidth={2} aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
