'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ROLE_CATEGORIES } from '@resenhometro/shared';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { Button } from '@/components/Button';
import { Ficha, FichaRow } from '@/components/FichaRow';
import { Input, Select, Textarea } from '@/components/Field';
import type { MapPoint } from '@/features/users/mapPoint';
import { BannerField } from './BannerField';
import { PlaceField } from './PlaceField';

export type RoleFormValues = {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  estimatedCost: string;
  tags: string;
};

/**
 * Casca visual do formulário de rolê (criar e editar usam esta mesma). Só apresentação: o estado, a validação e
 * o envio ficam nas telas. Capa e ficha lado a lado a partir de 768 px (capa sticky); uma coluna no celular.
 */
export function RoleFormView({
  heading,
  form,
  setForm,
  point,
  setPoint,
  banner,
  onSubmit,
  submitLabel,
  submitDisabled,
  reason,
  error,
  titleMinLength,
}: {
  heading: string;
  form: RoleFormValues;
  setForm: (next: RoleFormValues) => void;
  point: MapPoint | null;
  setPoint: (next: MapPoint | null) => void;
  banner: Parameters<typeof BannerField>[0];
  onSubmit: (event: FormEvent) => void;
  submitLabel: ReactNode;
  submitDisabled: boolean;
  /** O que falta (derivado da condição que já desabilita o botão). */
  reason?: string | null;
  /** Erro do envio, mostrado no topo da barra de ação. */
  error?: string;
  /** Tamanho mínimo do nome (só a criação tinha). */
  titleMinLength?: number;
}) {
  const titleId = useId();
  const reasonId = useId();
  const nameId = useId();
  const [descOpen, setDescOpen] = useState(false);
  const autoOpened = useRef(false);
  const nameRef = useRef<HTMLTextAreaElement>(null);

  // O nome cresce com o texto (onde não há `field-sizing: content`, o ajuste de altura vem daqui).
  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  }, [form.title]);

  // Edição: se o rolê já tem descrição, o bloco abre uma vez; depois a pessoa manda.
  useEffect(() => {
    if (form.description && !autoOpened.current) {
      autoOpened.current = true;
      setDescOpen(true);
    }
  }, [form.description]);

  const set = <K extends keyof RoleFormValues>(key: K, value: RoleFormValues[K]) =>
    setForm({ ...form, [key]: value });

  return (
    <form onSubmit={onSubmit} className="role-form" aria-labelledby={titleId}>
      <h1 id={titleId} className="k-display role-form__title">
        {heading}
      </h1>
      <div className="role-form__grid">
        <div className="role-form__cover">
          <BannerField {...banner} />
        </div>
        <div className="role-form__body">
          <div className="role-name">
            <label className="sr-only" htmlFor={nameId}>
              Nome do rolê
            </label>
            {/* Textarea de 1 linha que cresce: nome longo quebra em linhas, sem reticências. */}
            <textarea
              id={nameId}
              ref={nameRef}
              className="role-name__input"
              rows={1}
              value={form.title}
              placeholder="Nome do rolê"
              required
              minLength={titleMinLength}
              onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
            />
            <p className="k-meta" aria-hidden>
              Nome do rolê
            </p>
          </div>

          <Ficha className="role-ficha">
            <FichaRow group label="Quando" mark={form.date || form.time ? 'done' : 'empty'}>
              <span className="role-ficha__pair">
                <Input type="date" aria-label="Data" value={form.date} onChange={(e) => set('date', e.target.value)} />
                <Input type="time" aria-label="Hora" value={form.time} onChange={(e) => set('time', e.target.value)} />
              </span>
            </FichaRow>
            <FichaRow group label="Onde" mark={form.location ? 'done' : 'empty'}>
              <PlaceField
                location={form.location}
                point={point}
                onChange={(next) => {
                  setForm({ ...form, location: next.location });
                  setPoint(next.point);
                }}
              />
            </FichaRow>
            <FichaRow label="Categoria" mark={form.category ? 'done' : 'empty'}>
              <span className="k-select">
                <Select aria-label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {ROLE_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </Select>
                <ChevronDown size={18} aria-hidden className="k-select__chevron" />
              </span>
            </FichaRow>
            <FichaRow label="Custo" mark={form.estimatedCost ? 'done' : 'empty'}>
              <Input
                type="number"
                min="0"
                aria-label="Custo estimado"
                placeholder="Ex.: 20 (em reais)"
                value={form.estimatedCost}
                onChange={(e) => set('estimatedCost', e.target.value)}
              />
            </FichaRow>
            <FichaRow label="Tags" mark={form.tags.trim() ? 'done' : 'empty'}>
              <Input
                aria-label="Tags"
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="sexta, festa, bar"
              />
            </FichaRow>
          </Ficha>

          <details
            className="role-desc"
            open={descOpen}
            onToggle={(e) => setDescOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary>Descrição e informações extras</summary>
            <label className="sr-only" htmlFor={`${nameId}-desc`}>
              Descrição
            </label>
            <Textarea
              id={`${nameId}-desc`}
              className="role-desc__text"
              style={{ minHeight: 96 }}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </details>
        </div>
      </div>

      {/* Barra de ação fixa embaixo: a ÚNICA ação principal da tela. */}
      <div className="role-form__publish">
        {error ? (
          <p role="alert" className="k-msg k-msg--error role-form__error">
            <CircleAlert size={16} aria-hidden />
            {error}
          </p>
        ) : null}
        <div className="role-form__publish-row">
          <Button
            type="submit"
            disabled={submitDisabled}
            aria-describedby={submitDisabled && reason ? reasonId : undefined}
          >
            {submitLabel}
          </Button>
          {submitDisabled && reason ? (
            <p id={reasonId} className="role-form__hint">
              {reason}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
