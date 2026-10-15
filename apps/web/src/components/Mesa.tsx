'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { canViewTransition, withViewTransition } from '@/lib/viewTransition';

/**
 * A Mesa (D20): índice de fotos espalhadas, estilo exposé. Grade CSS de 12 colunas (4 no celular) com
 * `grid-auto-flow: dense`: os tiles nunca se sobrepõem e não há JS de layout. O padrão de tamanhos é fixo e
 * se repete a cada 8 itens, então o mesmo item cai sempre no mesmo lugar.
 */
const SPAN_DESKTOP = [6, 3, 3, 4, 4, 4, 5, 7];
const SPAN_MOBILE = [4, 2, 2, 2, 2, 4, 2, 2];
const RATIO = ['4/3', '1/1', '1/1', '4/5', '4/5', '1/1', '4/3', '3/2'];

export type MesaEntry = {
  id: string;
  /** Nome acessível do tile, ex.: "Post de Ana, em Churrasco". */
  label: string;
  /** Foto do tile (cor natural, sem filtro). Sem ela, o tile vira um tile de texto. */
  image?: string | null;
  /** Trecho do tile de texto (Fraunces). Sem ele, usa `label`. */
  text?: string;
  avatar?: { src?: string | null; name?: string | null };
  /** Data em `.k-meta`. */
  meta?: string;
  dateTime?: string;
};

/** Nome da View Transition de um item. Único por id; só um elemento por vez o recebe. */
export function mesaName(id: string) {
  return `mesa-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

function MesaTile({ entry, onOpen }: { entry: MesaEntry; onOpen: (id: string) => void }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [entry.image]);
  const hasImage = Boolean(entry.image) && !broken;

  return (
    <button
      type="button"
      className="k-mesa__tile k-corners"
      data-mesa-tile={entry.id}
      aria-label={entry.label}
      onClick={() => onOpen(entry.id)}
    >
      {hasImage ? (
        <img
          data-mesa-media={entry.id}
          className="k-mesa__media"
          src={entry.image ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <span data-mesa-media={entry.id} className="k-mesa__media k-mesa__text k-display">
          {entry.text || entry.label}
        </span>
      )}
      <span className="k-mesa__strip">
        {entry.avatar ? <Avatar src={entry.avatar.src} name={entry.avatar.name} size="xs" /> : null}
        {entry.meta ? (
          <time className="k-meta" dateTime={entry.dateTime}>
            {entry.meta}
          </time>
        ) : null}
      </span>
    </button>
  );
}

export function Mesa({
  entries,
  onOpen,
  label,
  renderExtra,
}: {
  entries: MesaEntry[];
  onOpen: (id: string) => void;
  label: string;
  /** Controle irmão do tile (ex.: excluir). Não pode ficar dentro do `<button>` do tile. */
  renderExtra?: (id: string) => ReactNode;
}) {
  return (
    <ul className="k-mesa" aria-label={label}>
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className="k-mesa__item"
          style={
            {
              '--span-d': SPAN_DESKTOP[index % 8],
              '--span-m': SPAN_MOBILE[index % 8],
              aspectRatio: RATIO[index % 8],
            } as CSSProperties
          }
        >
          <MesaTile entry={entry} onOpen={onOpen} />
          {renderExtra ? renderExtra(entry.id) : null}
        </li>
      ))}
    </ul>
  );
}

/** Carregando: contornos de 1 px e um ponto, na mesma grade (sem blocos cinza). */
export function MesaSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="k-mesa" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="k-mesa__item k-mesa__ghost skeleton"
          style={
            {
              '--span-d': SPAN_DESKTOP[index % 8],
              '--span-m': SPAN_MOBILE[index % 8],
              aspectRatio: RATIO[index % 8],
            } as CSSProperties
          }
        >
          <i className="skeleton skeleton--dot" />
          <i className="skeleton skeleton--line" />
        </li>
      ))}
    </ul>
  );
}

function findTile(id: string) {
  return document.querySelector<HTMLElement>(`[data-mesa-tile="${CSS.escape(id)}"]`);
}

function findMedia(id: string) {
  return document.querySelector<HTMLElement>(`[data-mesa-media="${CSS.escape(id)}"]`);
}

/**
 * Estilo que dá o nome da View Transition ao elemento do painel que "recebe" o tile (a foto grande, ou o
 * bloco do post quando o tile é de texto). Só um elemento por vez tem o nome: o tile o perde ao abrir.
 */
export function mesaTransitionStyle(id: string): CSSProperties {
  return { viewTransitionName: mesaName(id), viewTransitionClass: 'k-mesa' } as CSSProperties;
}

function nameTile(id: string, on: boolean) {
  const media = findMedia(id);
  if (!media) return;
  media.style.viewTransitionName = on ? mesaName(id) : '';
  media.style.setProperty('view-transition-class', on ? 'k-mesa' : '');
}

/**
 * Estado do item aberto a partir da Mesa. O item abre num painel por cima da página (sem trocar de rota), então
 * a rolagem da Mesa fica como estava. Entrar adiciona uma entrada ao histórico para o "voltar" do navegador fechar
 * o painel; o foco volta ao tile de origem. Abrir e fechar rodam numa View Transition: a foto do tile cresce até
 * o painel e volta ao lugar (sem suporte ou com movimento reduzido, o painel só aparece em fade).
 */
export function useMesaViewer() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openRef = useRef<string | null>(null);
  openRef.current = openId;

  const finish = useCallback(() => {
    const id = openRef.current;
    if (!id) return;
    void withViewTransition(() => {
      flushSync(() => setOpenId(null));
      const tile = findTile(id);
      tile?.focus({ preventScroll: true });
      nameTile(id, true);
    }).then(() => nameTile(id, false));
  }, []);

  const open = useCallback((id: string) => {
    window.history.pushState({ kinaMesa: true }, '');
    nameTile(id, true);
    void withViewTransition(() => {
      nameTile(id, false);
      flushSync(() => setOpenId(id));
    });
  }, []);

  const close = useCallback(() => {
    if ((window.history.state as { kinaMesa?: boolean } | null)?.kinaMesa) window.history.back();
    else finish();
  }, [finish]);

  useEffect(() => {
    const onPop = () => {
      if (openRef.current) finish();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [finish]);

  return { openId, open, close };
}

/**
 * Painel do item aberto: tela cheia na cor do fundo, `Esc` fecha, o resto da página fica inerte (foco preso) e a
 * página não rola por baixo. Sem View Transition (ou com movimento reduzido) entra em fade.
 */
export function MesaViewer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const silenced = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== panel && !element.inert,
    );
    silenced.forEach((element) => {
      element.inert = true;
    });
    panel?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      silenced.forEach((element) => {
        element.inert = false;
      });
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className={canViewTransition() ? 'k-mesa-viewer' : 'k-mesa-viewer k-mesa-viewer--fade'}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="k-mesa-viewer__bar">
        <button type="button" className="k-mesa-viewer__back" data-autofocus onClick={onClose}>
          <ArrowLeft size={20} aria-hidden />
          Voltar
        </button>
      </div>
      <div className="k-mesa-viewer__body">{children}</div>
    </div>,
    document.body,
  );
}
