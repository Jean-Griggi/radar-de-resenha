'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';
export type ThemeChoice = 'system' | Theme;

type ThemeContextValue = {
  /** Tema já resolvido (claro ou escuro), para o ícone do cabeçalho. */
  theme: Theme;
  /** O que a pessoa escolheu. "Sistema" = chave ausente no armazenamento. */
  preference: ThemeChoice;
  toggle: (event?: MouseEvent<HTMLButtonElement>) => void;
  choose: (choice: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'resenhometro_theme';

/** Só chamada quando a pessoa escolhe: grava a escolha e marca o <html>. Sem escolha, o CSS segue o sistema. */
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

function applySystemTheme() {
  delete document.documentElement.dataset.theme;
  localStorage.removeItem(STORAGE_KEY);
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

/** Segundos a partir de `--k-dur-*` (o valor no CSS é em ms). */
function tokenSeconds(token: string, fallback: number) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const ms = Number.parseFloat(raw);
  return Number.isFinite(ms) ? ms / 1000 : fallback;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [preference, setPreference] = useState<ThemeChoice>('system');

  // Só lê (sem gravar): o tema "resolvido" serve ao ícone do botão. Sem escolha salva, acompanha o sistema.
  useEffect(() => {
    const stored = storedTheme();
    setPreference(stored ?? 'system');
    setTheme(stored ?? systemTheme());
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
      setPreference(next);
    };

    const doc = document as Document & {
      startViewTransition?: (update: () => void) => { finished: Promise<void> };
    };

    // `themeFx` é marcado pela grade das telas de conta, que anima a troca por blocos no lugar do círculo.
    if (!prefersReducedMotion() && root.dataset.themeFx !== 'blocks' && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(commit);
      return;
    }

    commit();
  }, [theme]);

  const choose = useCallback((choice: ThemeChoice) => {
    if (choice === 'system') {
      applySystemTheme();
      setPreference('system');
      setTheme(systemTheme());
      return;
    }
    applyTheme(choice);
    setPreference(choice);
    setTheme(choice);
  }, []);

  const value = useMemo(() => ({ theme, preference, toggle, choose }), [theme, preference, toggle, choose]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: 'light' as Theme, preference: 'system' as ThemeChoice, toggle: () => undefined, choose: () => undefined };
  return ctx;
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const reduce = useReducedMotion() === true;
  const [dur, setDur] = useState(0.24);
  useEffect(() => {
    setDur(tokenSeconds('--k-dur-base', 0.24));
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className={`icon-btn ${className}`}
      aria-label="Alternar tema"
      aria-pressed={theme === 'dark'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="theme-toggle-icon"
          initial={reduce ? false : { rotate: -80, opacity: 0, scale: 0.55 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { rotate: 80, opacity: 0, scale: 0.55 }}
          transition={{ duration: reduce ? 0 : dur }}
        >
          {theme === 'dark' ? <Sun size={20} strokeWidth={2} aria-hidden /> : <Moon size={20} strokeWidth={2} aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
