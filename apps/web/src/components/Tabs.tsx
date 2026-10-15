'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

export type TabItem<T extends string> = { value: T; label: ReactNode };

/**
 * Abas em texto: ativa com peso 600 e sublinhado de 2 px, fio no contêiner (substitui `.chip-tab`).
 * Teclado: setas esquerda/direita (e Home/End) trocam de aba. No celular a barra rola na horizontal
 * e a aba ativa fica sempre visível (DECISOES D15).
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className = '',
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nome acessível do grupo de abas. */
  label: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const active = refs.current[items.findIndex((item) => item.value === value)];
    // Só rola o contêiner da barra; `nearest` evita mover a página inteira.
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [items, value]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = items.findIndex((item) => item.value === value);
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    const target = items[next];
    if (!target) return;
    event.preventDefault();
    onChange(target.value);
    refs.current[next]?.focus();
  }

  return (
    <div className={`k-tabs-wrap ${className}`.trim()}>
    <div role="tablist" aria-label={label} className="k-tabs" onKeyDown={onKeyDown}>
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="k-tab"
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
    </div>
  );
}
