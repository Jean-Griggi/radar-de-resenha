'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Título visível (Fraunces) e nome acessível do diálogo. */
  title: string;
  description?: string;
  children: ReactNode;
  /** Vidro líquido (`.k-glass`, DECISOES D19). Só para a folha de login das telas de entrada. */
  glass?: boolean;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Comportamento comum de Modal e Sheet: entrada/saída (a saída dura 160 ms antes de desmontar),
 * foco preso dentro do painel, `Esc` fecha, o foco volta ao gatilho e a página não rola por baixo.
 */
function useOverlay(open: boolean, onClose: () => void) {
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPhase('open');
      return;
    }
    setPhase((current) => (current === 'open' ? 'closing' : current));
  }, [open]);

  useEffect(() => {
    if (phase !== 'closing') return;
    const timer = window.setTimeout(() => {
      setPhase('closed');
      const trigger = triggerRef.current;
      if (trigger?.isConnected) trigger.focus();
    }, 160);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'open') return;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  const onBackdrop = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  return { phase, panelRef, onKeyDown, onBackdrop };
}

function Dialog({
  kind,
  open,
  onClose,
  title,
  description,
  children,
  glass,
}: OverlayProps & { kind: 'modal' | 'sheet' }) {
  const titleId = useId();
  const { phase, panelRef, onKeyDown, onBackdrop } = useOverlay(open, onClose);
  if (phase === 'closed' || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`k-overlay${kind === 'sheet' ? ' k-overlay--sheet' : ''}`} data-state={phase} onMouseDown={onBackdrop}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${kind === 'modal' ? 'k-modal k-corners' : 'k-sheet'}${glass ? ' k-glass' : ''}`}
        onKeyDown={onKeyDown}
      >
        {kind === 'sheet' ? <span className="k-sheet__handle" aria-hidden /> : null}
        <div className="k-dialog__head">
          <div>
            <h2 id={titleId} className="k-dialog__title">
              {title}
            </h2>
            {description ? <p className="k-dialog__description">{description}</p> : null}
          </div>
          <button type="button" className="k-dialog__close" aria-label="Fechar" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="k-dialog__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Modal (desktop): superfície elevada com cantoneiras de 16 px, sem raio; overlay `--k-overlay`;
 * foco preso, `Esc` fecha e o foco volta ao gatilho. Controlado: o pai guarda `open`.
 * Para o primeiro foco ir a um campo específico, marque-o com `data-autofocus`.
 */
export function Modal(props: OverlayProps) {
  return <Dialog kind="modal" {...props} />;
}

/** Sheet (celular): folha que encosta embaixo, largura total, alça de 40×4 px e título em Fraunces 26 px. */
export function Sheet(props: OverlayProps) {
  return <Dialog kind="sheet" {...props} />;
}
