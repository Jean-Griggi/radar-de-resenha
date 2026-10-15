'use client';

import { useEffect } from 'react';

/**
 * Mapa de deslocamento da refração: vermelho (eixo X) e verde (eixo Y) variam só nas bordas e ficam neutros (128) no centro.
 * Duas camadas somadas com `screen` (preto + canal = o próprio canal): R = 255 → 128 → 0 da esquerda para a direita, G idem de cima para baixo.
 * Perto das bordas o fundo é puxado de dentro (lente); no meio nada se move.
 */
const DISPLACEMENT_MAP = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="none">
<defs>
<linearGradient id="x" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="rgb(255,0,0)"/><stop offset=".14" stop-color="rgb(128,0,0)"/><stop offset=".86" stop-color="rgb(128,0,0)"/><stop offset="1" stop-color="rgb(0,0,0)"/></linearGradient>
<linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgb(0,255,0)"/><stop offset=".14" stop-color="rgb(0,128,0)"/><stop offset=".86" stop-color="rgb(0,128,0)"/><stop offset="1" stop-color="rgb(0,0,0)"/></linearGradient>
</defs>
<rect width="100" height="100" fill="rgb(0,0,0)"/>
<rect width="100" height="100" fill="url(#x)"/>
<rect width="100" height="100" fill="url(#y)" style="mix-blend-mode:screen"/>
</svg>`;

const MAP_HREF = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DISPLACEMENT_MAP)}`;

/**
 * Define uma vez o filtro `#k-glass` usado pelo `.k-glass` (DECISOES D19). Só o Chromium aceita filtro SVG dentro de
 * `backdrop-filter`; nele marcamos `<html data-glass-refract>` e o CSS liga a refração. Firefox e Safari não recebem a
 * marca e ficam no desfoque comum, sem erro. O filtro é estático: nada nele anima.
 */
export function GlassFilter() {
  useEffect(() => {
    const root = document.documentElement;
    if (!('userAgentData' in navigator)) return;
    root.dataset.glassRefract = '';
    return () => {
      delete root.dataset.glassRefract;
    };
  }, []);

  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <filter id="k-glass" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
        <feImage href={MAP_HREF} preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="40" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation="0.6" />
      </filter>
    </svg>
  );
}
