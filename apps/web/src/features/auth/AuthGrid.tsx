'use client';

import { useEffect, useRef } from 'react';

/** Mesmo tamanho de quarteirão do `.k-street-grid`. */
const CELL = 64;
/** Raio (px) em que o mouse "acorda" os blocos. */
const HOVER_RADIUS = 120;
/** Duração do giro de cada bloco na troca de tema, e tempo da onda que atravessa a grade. */
const FLIP_MS = 520;
const WAVE_MS = 900;

type Rgb = [number, number, number];
type Colors = { bg: Rgb; text: Rgb };
type Flip = { from: Colors; start: number; delays: Float32Array };

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Fundo de quarteirões das telas de conta, desenhado em canvas.
 * - Mouse por cima: os blocos próximos giram 90° (um quadrado girado 90° é igual ao parado, então volta sem salto).
 * - Troca de tema: uma onda a partir do botão de tema faz cada bloco girar enquanto vai da cor antiga para a nova.
 *   Os demais componentes da tela (marca, frase, botão, painel, mira) ficam "presos" no tema antigo
 *   (`data-theme` no próprio elemento, que reescopa os tokens --k-*) e só trocam quando a onda chega neles.
 * As cores vêm de `--k-bg` e `--k-text` (nenhum hex). Com `prefers-reduced-motion`, nada anima.
 * Sem movimento, o canvas não redesenha: o loop de frames só roda enquanto há algo animando.
 */
export function AuthGrid({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    const probeCtx = probe.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx || !probeCtx) return;

    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dark = window.matchMedia('(prefers-color-scheme: dark)');

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let heat = new Float32Array(0);
    let pointer: { x: number; y: number } | null = null;
    let flip: Flip | null = null;
    let frame = 0;

    /** O canvas lê qualquer cor CSS; pintar 1 pixel e ler de volta dá o RGB para interpolar. */
    function toRgb(css: string, fallback: Rgb): Rgb {
      if (!css) return fallback;
      probeCtx!.clearRect(0, 0, 1, 1);
      probeCtx!.fillStyle = css;
      probeCtx!.fillRect(0, 0, 1, 1);
      const d = probeCtx!.getImageData(0, 0, 1, 1).data;
      return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0];
    }

    function readColors(): Colors {
      const cs = getComputedStyle(root);
      return {
        bg: toRgb(cs.getPropertyValue('--k-bg').trim(), [255, 255, 255]),
        text: toRgb(cs.getPropertyValue('--k-text').trim(), [0, 0, 0]),
      };
    }

    let colors = readColors();

    const resolveTheme = () => (root.dataset.theme === 'dark' || root.dataset.theme === 'light' ? root.dataset.theme : dark.matches ? 'dark' : 'light');
    let lastTheme = resolveTheme();
    let pinTimers: number[] = [];
    const stageItems = () => Array.from(canvas!.parentElement?.children ?? []).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== canvas);
    function releasePins() {
      pinTimers.forEach((t) => window.clearTimeout(t));
      pinTimers = [];
      stageItems().forEach((el) => delete el.dataset.theme);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    function resize() {
      const box = canvas!.getBoundingClientRect();
      w = box.width;
      h = box.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      heat = new Float32Array(cols * rows);
      schedule();
    }

    /** Quadrado de lado `size` centrado em (cx, cy), girado em `angle`, encolhido para nunca sair da célula. */
    function turnedSquare(cx: number, cy: number, angle: number, fill: string, stroke: string) {
      const fit = 1 / (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)));
      const size = (CELL - 1) * fit;
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(angle);
      ctx!.fillStyle = fill;
      ctx!.fillRect(-size / 2, -size / 2, size, size);
      ctx!.strokeStyle = stroke;
      ctx!.lineWidth = 1;
      ctx!.strokeRect(-size / 2 + 0.5, -size / 2 + 0.5, size - 1, size - 1);
      ctx!.restore();
    }

    function draw(now: number) {
      frame = 0;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);

      // Linhas da grade em repouso (as mesmas de 1 px a 7% do antigo `.k-street-grid`).
      ctx!.fillStyle = rgba(colors.text, 0.07);
      for (let c = 0; c <= cols; c++) ctx!.fillRect(c * CELL, 0, 1, h);
      for (let r = 0; r <= rows; r++) ctx!.fillRect(0, r * CELL, w, 1);

      let busy = false;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const x = c * CELL;
          const y = r * CELL;
          const cx = x + CELL / 2;
          const cy = y + CELL / 2;

          // Troca de tema: o bloco ainda mostra a cor antiga até a vez dele, depois gira e vira a nova.
          if (flip) {
            const p = (now - flip.start - (flip.delays[i] ?? 0)) / FLIP_MS;
            if (p < 1) {
              busy = true;
              if (p <= 0) {
                ctx!.fillStyle = rgba(flip.from.bg, 1);
                ctx!.fillRect(x, y, CELL, CELL);
                ctx!.fillStyle = rgba(flip.from.text, 0.07);
                ctx!.strokeStyle = rgba(flip.from.text, 0.07);
                ctx!.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
              } else {
                const e = easeInOut(p);
                turnedSquare(
                  cx,
                  cy,
                  e * (Math.PI / 2),
                  rgba(mix(flip.from.bg, colors.bg, e), 1),
                  rgba(mix(flip.from.text, colors.text, e), 0.07 + 0.35 * Math.sin(p * Math.PI)),
                );
              }
              continue;
            }
          }

          // Hover: o calor do bloco acompanha a distância do mouse, com suavização.
          let target = 0;
          if (pointer) {
            const d = Math.hypot(cx - pointer.x, cy - pointer.y);
            if (d < HOVER_RADIUS) target = 1 - d / HOVER_RADIUS;
          }
          let hv = heat[i] ?? 0;
          hv += (target - hv) * 0.16;
          if (Math.abs(target - hv) < 0.004) hv = target;
          else busy = true;
          heat[i] = hv;

          if (hv > 0.01) {
            ctx!.fillStyle = rgba(colors.bg, 1);
            ctx!.fillRect(x, y, CELL, CELL);
            turnedSquare(cx, cy, hv * (Math.PI / 2), rgba(colors.text, 0.12 * hv), rgba(colors.text, 0.07 + 0.4 * hv));
          }
        }
      }

      if (flip && !busy) flip = null;
      if (busy) schedule();
    }

    function onThemeChange() {
      const next = readColors();
      const same = next.bg.join() === colors.bg.join() && next.text.join() === colors.text.join();
      if (same) return;
      const from = colors;
      colors = next;
      const prevTheme = lastTheme;
      lastTheme = resolveTheme();
      releasePins();
      if (reduce.matches || w === 0) {
        schedule();
        return;
      }
      // A onda nasce no botão de tema (canto da tela) e se espalha pelos blocos.
      const toggle = document.querySelector('.theme-toggle-corner')?.getBoundingClientRect();
      const box = canvas!.getBoundingClientRect();
      const ox = toggle ? toggle.left + toggle.width / 2 - box.left : w;
      const oy = toggle ? toggle.top + toggle.height / 2 - box.top : 0;
      const maxDist = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy)) || 1;
      const delays = new Float32Array(cols * rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = Math.hypot(c * CELL + CELL / 2 - ox, r * CELL + CELL / 2 - oy);
          delays[r * cols + c] = (d / maxDist) * WAVE_MS + Math.random() * 80;
        }
      }
      // Cada item fica no tema antigo até a onda chegar no centro dele (meio do giro do bloco ali).
      if (prevTheme !== lastTheme) {
        for (const el of stageItems()) {
          const b = el.getBoundingClientRect();
          const d = Math.hypot(b.left + b.width / 2 - box.left - ox, b.top + b.height / 2 - box.top - oy);
          el.dataset.theme = prevTheme;
          pinTimers.push(window.setTimeout(() => delete el.dataset.theme, (d / maxDist) * WAVE_MS + FLIP_MS / 2));
        }
      }
      flip = { from, start: performance.now(), delays };
      schedule();
    }

    function onPointerMove(event: PointerEvent) {
      if (reduce.matches || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
      const box = canvas!.getBoundingClientRect();
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
      schedule();
    }
    function onPointerLeave() {
      pointer = null;
      schedule();
    }

    // Avisa o ThemeProvider que esta tela anima a troca de tema sozinha (sem o círculo de view transition).
    root.dataset.themeFx = 'blocks';

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    dark.addEventListener('change', onThemeChange);
    window.addEventListener('pointermove', onPointerMove);
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      releasePins();
      delete root.dataset.themeFx;
      resizeObserver.disconnect();
      themeObserver.disconnect();
      dark.removeEventListener('change', onThemeChange);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
