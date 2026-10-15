'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { prepareImageFile } from '@/lib/upload';

/** Proporção do recorte: número (largura / altura) ou `original` (a imagem inteira, sem cortar nas bordas). */
export type CropAspect = { label: string; value: number | 'original' };

export type CropOptions = {
  title?: string;
  aspects: CropAspect[];
  /** Máscara redonda de pré-visualização (avatar). O arquivo gerado continua retangular. */
  round?: boolean;
  /** Largura máxima (px) do arquivo gerado. */
  maxWidth?: number;
};

type Request = { file: File; options: CropOptions; resolve: (file: File | null) => void };

let openRequest: ((request: Request) => void) | null = null;

/**
 * Abre o diálogo de recorte ("Personalizar") e devolve o arquivo já recortado, ou `null` se a pessoa cancelar.
 * GIF volta como veio (animação não sobrevive ao recorte). Precisa do `<CropHost />` montado no layout raiz.
 */
export function cropImage(file: File, options: CropOptions): Promise<File | null> {
  if (!openRequest || file.type === 'image/gif') return Promise.resolve(file);
  return new Promise((resolve) => openRequest!({ file, options, resolve }));
}

export const CROP = {
  avatar: { title: 'Personalizar a foto de perfil', aspects: [{ label: '1:1', value: 1 }], round: true, maxWidth: 800 },
  cover: { title: 'Personalizar a capa', aspects: [{ label: '16:9', value: 16 / 9 }], maxWidth: 1800 },
  banner: { title: 'Personalizar o banner', aspects: [{ label: '3:2', value: 3 / 2 }], maxWidth: 1800 },
  story: { title: 'Personalizar o story', aspects: [{ label: '9:16', value: 9 / 16 }], maxWidth: 1080 },
  free: {
    title: 'Personalizar a imagem',
    aspects: [
      { label: 'Original', value: 'original' as const },
      { label: '1:1', value: 1 },
      { label: '4:5', value: 4 / 5 },
      { label: '3:2', value: 3 / 2 },
      { label: '16:9', value: 16 / 9 },
    ],
    maxWidth: 1800,
  },
} satisfies Record<string, CropOptions>;

/** Montado uma vez no layout raiz: recebe os pedidos de `cropImage` e mostra o diálogo. */
export function CropHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const requestRef = useRef<Request | null>(null);
  requestRef.current = request;

  useEffect(() => {
    openRequest = (next) => {
      // Um pedido novo cancela o que estiver aberto.
      requestRef.current?.resolve(null);
      setRequest(next);
    };
    return () => {
      openRequest = null;
    };
  }, []);

  const finish = useCallback((result: File | null) => {
    requestRef.current?.resolve(result);
    setRequest(null);
  }, []);

  return request ? <CropDialog key={request.file.name + request.file.size} request={request} onFinish={finish} /> : null;
}

function clamp(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value));
}

function CropDialog({ request, onFinish }: { request: Request; onFinish: (file: File | null) => void }) {
  const { file, options } = request;
  const toast = useToast();
  const [source, setSource] = useState<{ url: string; width: number; height: number; name: string } | null>(null);
  const [aspectIndex, setAspectIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Prepara o arquivo (HEIC vira JPEG) e lê o tamanho natural.
  useEffect(() => {
    let cancelled = false;
    let url = '';
    void (async () => {
      try {
        const ready = await prepareImageFile(file);
        url = URL.createObjectURL(ready);
        const img = new Image();
        img.src = url;
        await img.decode();
        if (!cancelled) setSource({ url, width: img.naturalWidth, height: img.naturalHeight, name: ready.name });
      } catch (err) {
        if (cancelled) return;
        toast.push(err instanceof Error ? err.message : 'Não foi possível abrir a imagem', 'error');
        onFinish(null);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const choice = options.aspects[aspectIndex] ?? options.aspects[0]!;
  const aspect = source ? (choice.value === 'original' ? source.width / source.height : choice.value) : 1;

  // Mede o quadro (ele muda com a proporção e com a janela).
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [source, aspect]);

  // Escala que cobre o quadro (zoom 1) e escala atual.
  const baseScale = source && box.w > 0 ? Math.max(box.w / source.width, box.h / source.height) : 1;
  const scale = baseScale * zoom;
  const limitX = source ? Math.max(0, (source.width * scale - box.w) / 2) : 0;
  const limitY = source ? Math.max(0, (source.height * scale - box.h) / 2) : 0;

  // Mantém o quadro sempre coberto pela imagem.
  useEffect(() => {
    setOffset((current) => ({ x: clamp(current.x, limitX), y: clamp(current.y, limitY) }));
  }, [limitX, limitY]);

  const move = useCallback(
    (dx: number, dy: number) => setOffset((current) => ({ x: clamp(current.x + dx, limitX), y: clamp(current.y + dy, limitY) })),
    [limitX, limitY],
  );

  // Roda do mouse dá zoom (precisa de listener não passivo para segurar a rolagem da página).
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => Math.min(4, Math.max(1, current - event.deltaY * 0.002)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [source]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    move(event.clientX - drag.current.x, event.clientY - drag.current.y);
    drag.current = { x: event.clientX, y: event.clientY };
  }
  function onPointerUp() {
    drag.current = null;
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 40 : 10;
    if (event.key === 'ArrowLeft') move(step, 0);
    else if (event.key === 'ArrowRight') move(-step, 0);
    else if (event.key === 'ArrowUp') move(0, step);
    else if (event.key === 'ArrowDown') move(0, -step);
    else if (event.key === '+' || event.key === '=') setZoom((z) => Math.min(4, z + 0.1));
    else if (event.key === '-') setZoom((z) => Math.max(1, z - 0.1));
    else return;
    event.preventDefault();
  }

  async function confirm() {
    if (!source || box.w === 0) return;
    setSaving(true);
    try {
      // Região da imagem original que está dentro do quadro.
      const sw = box.w / scale;
      const sh = box.h / scale;
      const sx = source.width / 2 - sw / 2 - offset.x / scale;
      const sy = source.height / 2 - sh / 2 - offset.y / scale;
      const outW = Math.round(Math.min(options.maxWidth ?? 1800, sw));
      const outH = Math.round(outW / aspect);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      const img = new Image();
      img.src = source.url;
      await img.decode();
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('blob');
      const base = source.name.replace(/\.[^.]+$/, '') || 'imagem';
      onFinish(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }));
    } catch {
      toast.push('Não foi possível recortar a imagem. Tente de novo.', 'error');
      setSaving(false);
    }
  }

  const frameStyle = { '--crop-aspect': aspect } as CSSProperties;

  return (
    <Modal open onClose={() => onFinish(null)} title={options.title ?? 'Personalizar a imagem'} description="Arraste a imagem e use o zoom para escolher a parte que aparece.">
      {options.aspects.length > 1 ? (
        <div className="k-crop__aspects" role="group" aria-label="Proporção">
          {options.aspects.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className="chip-tab"
              aria-pressed={index === aspectIndex}
              onClick={() => {
                setAspectIndex(index);
                setOffset({ x: 0, y: 0 });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div
        ref={frameRef}
        className={`k-crop__frame${options.round ? ' k-crop__frame--round' : ''}`}
        style={frameStyle}
        tabIndex={0}
        role="group"
        aria-label="Área do recorte. Setas movem a imagem; mais e menos dão zoom."
        data-autofocus
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {source ? (
          <img
            src={source.url}
            alt=""
            draggable={false}
            className="k-crop__image"
            style={{
              width: source.width,
              height: source.height,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          />
        ) : (
          <span className="k-crop__loading k-meta">Abrindo…</span>
        )}
        {options.round ? <span className="k-crop__mask" aria-hidden /> : null}
      </div>

      <label className="k-crop__zoom">
        <span className="k-label">Zoom</span>
        <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
      </label>

      <div className="k-crop__actions">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Centralizar
        </Button>
        <Button type="button" variant="secondary" onClick={() => onFinish(null)}>
          Cancelar
        </Button>
        <Button type="button" loading={saving} disabled={!source} onClick={confirm}>
          Usar este recorte
        </Button>
      </div>
    </Modal>
  );
}
