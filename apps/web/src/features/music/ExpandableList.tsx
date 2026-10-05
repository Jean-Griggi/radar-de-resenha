'use client';

import { useState, type ReactNode } from 'react';
import { INITIAL_VISIBLE, splitVisible } from './expandable';

/**
 * Lista que mostra só os primeiros itens e deixa expandir ("Ver mais") ou recolher ("Ver menos").
 * Se couber tudo no começo, nem mostra o botão.
 */
export function ExpandableList<T>({
  items,
  initial = INITIAL_VISIBLE,
  itemKey,
  render,
  label = 'itens',
}: {
  items: T[];
  initial?: number;
  itemKey: (item: T) => string;
  render: (item: T) => ReactNode;
  /** Plural usado no botão: "Ver mais 12 músicas". */
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { visible, hidden } = splitVisible(items, expanded, initial);

  return (
    <div className="space-y-2">
      <ul className="grid gap-2 sm:grid-cols-2">
        {visible.map((item) => (
          <li key={itemKey(item)}>{render(item)}</li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          className="text-sm font-semibold text-[var(--primary)] hover:underline"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Ver menos' : `Ver mais ${hidden} ${label}`}
        </button>
      ) : null}
    </div>
  );
}
