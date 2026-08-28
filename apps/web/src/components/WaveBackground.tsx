'use client';

import { useEffect, useRef, useState } from 'react';

const W = 1440;
const H = 1024;
const SAMPLES = 16;

const LAYERS = [
  { fill: 'var(--wave-5)', y: 90, amp: 62, cycles: 2.15, speed: 0.85, wobble: 0.22 },
  { fill: 'var(--wave-4)', y: 280, amp: 54, cycles: 2.45, speed: -1.05, wobble: 0.28 },
  { fill: 'var(--wave-3)', y: 470, amp: 48, cycles: 2.7, speed: 1.25, wobble: 0.18 },
  { fill: 'var(--wave-2)', y: 660, amp: 42, cycles: 3.05, speed: -1.45, wobble: 0.32 },
  { fill: 'var(--wave-1)', y: 845, amp: 36, cycles: 3.3, speed: 1.7, wobble: 0.24 },
] as const;

type Pt = { x: number; y: number };

function points(y: number, amp: number, cycles: number, phase: number, wobble: number, time: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const x = t * W;
    const yy =
      y +
      Math.sin(time * wobble) * 10 +
      amp * Math.sin(t * cycles * Math.PI * 2 + phase) +
      amp * 0.28 * Math.sin(t * cycles * Math.PI * 4 + phase * 1.35);
    pts.push({ x, y: yy });
  }
  return pts;
}

function cubics(pts: Pt[]) {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function smooth(pts: Pt[]) {
  return `M${pts[0].x} ${pts[0].y}${cubics(pts)}`;
}

function fillPath(pts: Pt[]) {
  return `${smooth(pts)} L${W} ${H} L0 ${H} Z`;
}

function shinePath(pts: Pt[], band = 58) {
  const lower = pts.map((p) => ({ x: p.x, y: p.y + band })).reverse();
  return `${smooth(pts)} L${lower[0].x} ${lower[0].y}${cubics(lower)} Z`;
}

function pathsAt(time: number) {
  return LAYERS.map((layer) => {
    const pts = points(layer.y, layer.amp, layer.cycles, layer.speed * time, layer.wobble, time);
    return {
      fill: fillPath(pts),
      s1: smooth(points(layer.y + 16, layer.amp * 0.92, layer.cycles, layer.speed * time, layer.wobble, time)),
      s2: smooth(points(layer.y + 30, layer.amp * 0.85, layer.cycles, layer.speed * time, layer.wobble, time)),
      shine: shinePath(pts),
    };
  });
}

const INITIAL = pathsAt(0);

export function WaveBackground() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(motion.matches);
    update();
    motion.addEventListener('change', update);
    return () => motion.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const svg = svgRef.current;
    if (!svg) return;
    const fills = svg.querySelectorAll<SVGPathElement>('[data-wave="fill"]');
    const s1 = svg.querySelectorAll<SVGPathElement>('[data-wave="s1"]');
    const s2 = svg.querySelectorAll<SVGPathElement>('[data-wave="s2"]');
    const shine = svg.querySelector<SVGPathElement>('[data-wave="shine"]');
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const next = pathsAt(t);
      next.forEach((p, i) => {
        fills[i]?.setAttribute('d', p.fill);
        s1[i]?.setAttribute('d', p.s1);
        s2[i]?.setAttribute('d', p.s2);
      });
      shine?.setAttribute('d', next[0].shine);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion]);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <svg ref={svgRef} className="h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-sky" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--wave-sky-start)" />
              <stop offset="100%" stopColor="var(--wave-sky-end)" />
            </linearGradient>
            <linearGradient id="wave-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--wave-shine)" stopOpacity="0.55" />
              <stop offset="18%" stopColor="var(--wave-shine)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#wave-sky)" />
          {LAYERS.map((layer, i) => (
            <g key={layer.fill}>
              <path data-wave="fill" fill={layer.fill} d={INITIAL[i].fill} />
              <path data-wave="s1" fill="none" stroke="var(--wave-line)" strokeWidth="1.2" d={INITIAL[i].s1} />
              <path data-wave="s2" fill="none" stroke="var(--wave-line)" strokeWidth="0.8" d={INITIAL[i].s2} />
            </g>
          ))}
          <path data-wave="shine" fill="url(#wave-shine)" d={INITIAL[0].shine} />
        </svg>
      </div>
      <div className="grain-overlay pointer-events-none fixed inset-0 z-[1]" aria-hidden />
    </>
  );
}
