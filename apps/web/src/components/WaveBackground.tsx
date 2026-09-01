'use client';

import { useEffect, useRef, useState } from 'react';

const W = 1440;
const H = 1024;
const SAMPLES = 40;

const LAYERS = [
  { fill: 'var(--wave-5)', y: 140, amp: 34, cycles: 1.35, speed: 0.28, wobble: 0.07 },
  { fill: 'var(--wave-4)', y: 310, amp: 30, cycles: 1.48, speed: 0.34, wobble: 0.09 },
  { fill: 'var(--wave-3)', y: 490, amp: 26, cycles: 1.62, speed: 0.4, wobble: 0.08 },
  { fill: 'var(--wave-2)', y: 670, amp: 22, cycles: 1.74, speed: 0.46, wobble: 0.1 },
  { fill: 'var(--wave-1)', y: 840, amp: 18, cycles: 1.88, speed: 0.52, wobble: 0.08 },
] as const;

type Pt = { x: number; y: number };

function points(y: number, amp: number, cycles: number, phase: number, wobble: number, time: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const x = t * W;
    const yy = y + Math.sin(time * wobble) * 4 + amp * Math.sin(t * cycles * Math.PI * 2 + phase);
    pts.push({ x, y: yy });
  }
  return pts;
}

function cubics(pts: Pt[]) {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (!p1 || !p2) continue;
    const p0 = pts[i - 1] ?? p1;
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function smooth(pts: Pt[]) {
  const start = pts[0];
  if (!start) return '';
  return `M${start.x} ${start.y}${cubics(pts)}`;
}

function fillPath(pts: Pt[]) {
  return `${smooth(pts)} L${W} ${H} L0 ${H} Z`;
}

function shinePath(pts: Pt[], band = 72) {
  const lower = pts.map((p) => ({ x: p.x, y: p.y + band })).reverse();
  const end = lower[0];
  if (!end) return smooth(pts);
  return `${smooth(pts)} L${end.x} ${end.y}${cubics(lower)} Z`;
}

function pathsAt(time: number) {
  return LAYERS.map((layer) => {
    const pts = points(layer.y, layer.amp, layer.cycles, layer.speed * time, layer.wobble, time);
    return { fill: fillPath(pts), shine: shinePath(pts) };
  });
}

const INITIAL = pathsAt(0);

export function WaveBackground() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [lite, setLite] = useState(true);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = window.matchMedia('(max-width: 767px)');
    const update = () => {
      setReduceMotion(motion.matches);
      setLite(motion.matches || narrow.matches);
    };
    update();
    motion.addEventListener('change', update);
    narrow.addEventListener('change', update);
    return () => {
      motion.removeEventListener('change', update);
      narrow.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const svg = svgRef.current;
    if (!svg) return;
    const fills = svg.querySelectorAll<SVGPathElement>('[data-wave="fill"]');
    const shine = svg.querySelector<SVGPathElement>('[data-wave="shine"]');
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const next = pathsAt(t);
      next.forEach((p, i) => fills.item(i)?.setAttribute('d', p.fill));
      shine?.setAttribute('d', next[0]?.shine ?? '');
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
            <linearGradient id="wave-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--wave-sky-start)" />
              <stop offset="100%" stopColor="var(--wave-sky-end)" />
            </linearGradient>
            <linearGradient id="wave-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--wave-shine)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--wave-shine)" stopOpacity="0" />
            </linearGradient>
            {lite ? null : (
              <filter id="wave-soft" x="-8%" y="-8%" width="116%" height="116%">
                <feGaussianBlur stdDeviation="10" />
              </filter>
            )}
          </defs>
          <rect width={W} height={H} fill="url(#wave-sky)" />
          <g filter={lite ? undefined : 'url(#wave-soft)'}>
            {LAYERS.map((layer, i) => (
              <path
                key={layer.fill}
                data-wave="fill"
                fill={layer.fill}
                className="wave-fill"
                d={INITIAL[i]?.fill ?? ''}
              />
            ))}
            <path data-wave="shine" fill="url(#wave-shine)" d={INITIAL[0]?.shine ?? ''} />
          </g>
        </svg>
      </div>
      <div className="grain-overlay pointer-events-none fixed inset-0 z-[1]" aria-hidden />
    </>
  );
}
