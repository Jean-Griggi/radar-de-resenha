'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Check, CircleAlert, Info } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';
type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; tone: ToastTone; action?: ToastAction };

const ToastContext = createContext<{
  push: (message: string, tone?: ToastTone, action?: ToastAction) => void;
} | null>(null);

const ICONS = { success: Check, error: CircleAlert, info: Info };

/** Visual do toast (inverso: fundo na cor do texto). O tom aparece no ícone, nunca só na cor. */
export function ToastView({
  message,
  tone = 'success',
  action,
  onAction,
}: {
  message: string;
  tone?: ToastTone;
  action?: string;
  onAction?: () => void;
}) {
  const Icon = ICONS[tone];
  return (
    <div className="k-toast" role={tone === 'error' ? 'alert' : undefined}>
      <Icon size={18} aria-hidden />
      <span className="k-toast__message">{message}</span>
      {action ? (
        <button type="button" className="k-toast__action" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = 'success', action?: ToastAction) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, tone, action }]);
      // 4–6 s (spec); com ação ("Desfazer") fica um pouco mais.
      window.setTimeout(() => dismiss(id), action ? 6000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-24 z-[var(--k-z-toast)] flex max-w-sm flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastView
              message={toast.message}
              tone={toast.tone}
              action={toast.action?.label}
              onAction={() => {
                toast.action?.onClick();
                dismiss(toast.id);
              }}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { push: () => undefined };
  return ctx;
}
