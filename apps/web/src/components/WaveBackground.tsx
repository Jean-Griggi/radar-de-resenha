const PERIOD = 1440;
const HEIGHT = 1024;

/** Controle de uma crista: [x1, yOff1, x2, yOff2, x, yOff] relativo à linha-base. */
const HUMPS: Array<[number, number, number, number, number, number]> = [
  [180, -78, 360, 92, 520, 18],
  [740, -62, 900, 108, 1100, 28],
  [1260, -48, 1360, 72, PERIOD, 0],
];

const LAYERS = [
  { fill: 'var(--wave-5)', y: 70, invert: false, duration: '22s' },
  { fill: 'var(--wave-4)', y: 260, invert: true, duration: '18s' },
  { fill: 'var(--wave-3)', y: 460, invert: false, duration: '14s' },
  { fill: 'var(--wave-2)', y: 660, invert: true, duration: '11s' },
  { fill: 'var(--wave-1)', y: 850, invert: false, duration: '8s' },
] as const;

function crests(y: number, invert: boolean, x0: number) {
  const s = invert ? -1 : 1;
  return HUMPS.map(
    ([x1, o1, x2, o2, x, oe]) =>
      `C ${x0 + x1} ${y + s * o1}, ${x0 + x2} ${y + s * o2}, ${x0 + x} ${y + s * oe}`,
  ).join(' ');
}

function fillPath(y: number, invert: boolean) {
  return `M0 ${y} ${crests(y, invert, 0)} ${crests(y, invert, PERIOD)} L${PERIOD * 2} ${HEIGHT} L0 ${HEIGHT} Z`;
}

function strokePath(y: number, invert: boolean) {
  return `M0 ${y} ${crests(y, invert, 0)} ${crests(y, invert, PERIOD)}`;
}

function shinePath(y: number, invert: boolean) {
  const band = 64;
  return `M0 ${y} ${crests(y, invert, 0)} ${crests(y, invert, PERIOD)} L${PERIOD * 2} ${y + band} L0 ${y + band} Z`;
}

export function WaveBackground() {
  const back = LAYERS[0];

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${PERIOD} ${HEIGHT}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-sky" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--wave-sky-start)" />
              <stop offset="100%" stopColor="var(--wave-sky-end)" />
            </linearGradient>
          </defs>
          <rect width={PERIOD} height={HEIGHT} fill="url(#wave-sky)" />
        </svg>
        {LAYERS.map((layer) => (
          <svg
            key={layer.fill}
            className="wave-drift absolute inset-y-0 left-0 h-full w-[200%]"
            style={{ animationDuration: layer.duration }}
            viewBox={`0 0 ${PERIOD * 2} ${HEIGHT}`}
            preserveAspectRatio="none"
          >
            {layer === back ? (
              <defs>
                <linearGradient id="wave-shine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--wave-shine)" stopOpacity="0.55" />
                  <stop offset="18%" stopColor="var(--wave-shine)" stopOpacity="0" />
                </linearGradient>
              </defs>
            ) : null}
            <path fill={layer.fill} d={fillPath(layer.y, layer.invert)} />
            <path fill="none" stroke="var(--wave-line)" strokeWidth="1.2" d={strokePath(layer.y + 16, layer.invert)} />
            <path fill="none" stroke="var(--wave-line)" strokeWidth="0.8" d={strokePath(layer.y + 30, layer.invert)} />
            {layer === back ? <path fill="url(#wave-shine)" d={shinePath(layer.y, layer.invert)} /> : null}
          </svg>
        ))}
      </div>
      <div className="grain-overlay pointer-events-none fixed inset-0 z-[1]" aria-hidden />
    </>
  );
}
