'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type MenuItem = {
  label: string;
  /** Link de navegação (usa `next/link`). Sem `href`, o item é um botão e chama `onSelect`. */
  href?: string;
  onSelect?: () => void;
  icon?: ReactNode;
  tone?: 'danger';
  /** Fio separador acima deste item. */
  separatorBefore?: boolean;
};

/**
 * Menu suspenso: superfície elevada, fio `--k-line`, itens de 44 px e separadores por fio.
 * Teclado: Enter/Espaço/seta para baixo abrem; setas, Home e End navegam; `Esc` fecha e devolve o foco ao gatilho.
 * `label` é o nome acessível do gatilho (obrigatório quando o gatilho é só um ícone ou um avatar).
 */
export function Menu({
  trigger,
  label,
  items,
  align = 'end',
  className = '',
}: {
  trigger: ReactNode;
  label: string;
  items: MenuItem[];
  align?: 'start' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const menuId = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Foco no primeiro item ao abrir.
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  // Clique ou toque fora fecha.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function focusItem(index: number) {
    const count = items.length;
    itemRefs.current[((index % count) + count) % count]?.focus();
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((node) => node === document.activeElement);
    if (event.key === 'ArrowDown') focusItem(current + 1);
    else if (event.key === 'ArrowUp') focusItem(current - 1);
    else if (event.key === 'Home') focusItem(0);
    else if (event.key === 'End') focusItem(items.length - 1);
    else if (event.key === 'Escape') close(true);
    else if (event.key === 'Tab') close(false);
    else return;
    if (event.key !== 'Tab') event.preventDefault();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div ref={rootRef} className={`k-menu ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="k-menu__trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
      >
        {trigger}
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label={label} className={`k-menu__panel k-menu__panel--${align}`} onKeyDown={onPanelKeyDown}>
          {items.map((item, index) => {
            const className = `k-menu__item${item.tone === 'danger' ? ' k-menu__item--danger' : ''}${item.separatorBefore ? ' k-menu__item--sep' : ''}`;
            const content = (
              <>
                {item.icon}
                {item.label}
              </>
            );
            if (item.href) {
              return (
                <Link
                  key={item.label}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  href={item.href}
                  role="menuitem"
                  tabIndex={-1}
                  className={className}
                  onClick={() => close(false)}
                >
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={className}
                onClick={() => {
                  item.onSelect?.();
                  close(true);
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
