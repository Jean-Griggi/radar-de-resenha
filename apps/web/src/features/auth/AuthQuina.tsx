'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/** Deslocamento do ponto de controle do arco. O arco real no centro é metade disto (8 px com o fio totalmente curvado). */
const BOW = 16;

/**
 * Os dois fios da quina (plano 6.2), em SVG atrás do conteúdo. Nascem como arcos leves e ficam retos por padrão; o
 * magnetismo só gira a escala perpendicular de cada um (`transform`, com `vector-effect: non-scaling-stroke`), nunca o `d`.
 * A grade de quarteirões é o canvas `AuthGrid`. O SVG não recebe ponteiro (`pointer-events: none` no CSS).
 */
export function AuthQuina({ hRef, vRef }: { hRef?: RefObject<SVGPathElement | null>; vRef?: RefObject<SVGPathElement | null> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const { w, h } = size;
  const cx = w / 2;
  const cy = h / 2;

  return (
    <svg ref={svgRef} className="auth-stage__quina" viewBox={w > 0 ? `0 0 ${w} ${h}` : undefined} aria-hidden focusable="false">
      {w > 0 ? (
        <>
          <path
            ref={hRef}
            className="auth-quina__fio auth-quina__fio--h"
            d={`M0 ${cy}Q${cx} ${cy + BOW} ${w} ${cy}`}
            style={{ transformOrigin: `0px ${cy}px` }}
          />
          <path
            ref={vRef}
            className="auth-quina__fio auth-quina__fio--v"
            d={`M${cx} 0Q${cx + BOW} ${cy} ${cx} ${h}`}
            style={{ transformOrigin: `${cx}px 0px` }}
          />
        </>
      ) : null}
    </svg>
  );
}
