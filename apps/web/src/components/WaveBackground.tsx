'use client';

import { useEffect, useState } from 'react';

export function WaveBackground() {
  const [lite, setLite] = useState(true);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = window.matchMedia('(max-width: 767px)');
    const update = () => setLite(motion.matches || narrow.matches);
    update();
    motion.addEventListener('change', update);
    narrow.addEventListener('change', update);
    return () => {
      motion.removeEventListener('change', update);
      narrow.removeEventListener('change', update);
    };
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <svg className="h-full w-full" viewBox="0 0 1440 1024" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="wave-sky" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--wave-sky-start)" />
              <stop offset="100%" stopColor="var(--wave-sky-end)" />
            </linearGradient>
            {lite ? null : (
              <filter id="wave-shadow" x="-10%" y="-10%" width="120%" height="140%">
                <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="var(--wave-sky-end)" floodOpacity="0.35" />
              </filter>
            )}
            <linearGradient id="wave-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--wave-shine)" stopOpacity="0.55" />
              <stop offset="18%" stopColor="var(--wave-shine)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="1440" height="1024" fill="url(#wave-sky)" />
          <g filter={lite ? undefined : 'url(#wave-shadow)'}>
            <path fill="var(--wave-5)" d="M0 130 C 180 60, 320 210, 520 155 C 740 95, 880 240, 1100 170 C 1260 120, 1360 200, 1440 155 L 1440 1024 L 0 1024 Z" />
            <path fill="var(--wave-4)" d="M0 230 C 200 170, 360 310, 560 245 C 780 175, 940 330, 1160 255 C 1300 210, 1380 290, 1440 250 L 1440 1024 L 0 1024 Z" />
            <path fill="var(--wave-3)" d="M0 320 C 170 275, 340 400, 540 340 C 760 275, 930 420, 1140 355 C 1290 310, 1375 390, 1440 350 L 1440 1024 L 0 1024 Z" />
            <path fill="var(--wave-2)" d="M0 420 C 210 370, 380 500, 600 440 C 820 380, 980 520, 1200 450 C 1320 410, 1390 490, 1440 455 L 1440 1024 L 0 1024 Z" />
            <path fill="var(--wave-1)" d="M0 530 C 190 490, 370 600, 590 545 C 820 485, 1000 620, 1220 550 C 1330 515, 1395 590, 1440 560 L 1440 1024 L 0 1024 Z" />
          </g>
          <g fill="none" stroke="var(--wave-line)" strokeWidth="0.8">
            <path d="M0 148 C 180 78, 320 228, 520 173 C 740 113, 880 258, 1100 188 C 1260 138, 1360 218, 1440 173" />
            <path d="M0 162 C 180 92, 320 242, 520 187 C 740 127, 880 272, 1100 202 C 1260 152, 1360 232, 1440 187" />
            <path d="M0 176 C 180 106, 320 256, 520 201 C 740 141, 880 286, 1100 216 C 1260 166, 1360 246, 1440 201" />
            <path d="M0 248 C 200 188, 360 328, 560 263 C 780 193, 940 348, 1160 273 C 1300 228, 1380 308, 1440 268" />
            <path d="M0 262 C 200 202, 360 342, 560 277 C 780 207, 940 362, 1160 287 C 1300 242, 1380 322, 1440 282" />
            <path d="M0 338 C 170 293, 340 418, 540 358 C 760 293, 930 438, 1140 373 C 1290 328, 1375 408, 1440 368" />
            <path d="M0 352 C 170 307, 340 432, 540 372 C 760 307, 930 452, 1140 387 C 1290 342, 1375 422, 1440 382" />
            <path d="M0 438 C 210 388, 380 518, 600 458 C 820 398, 980 538, 1200 468 C 1320 428, 1390 508, 1440 473" />
            <path d="M0 452 C 210 402, 380 532, 600 472 C 820 412, 980 552, 1200 482 C 1320 442, 1390 522, 1440 487" />
            <path d="M0 548 C 190 508, 370 618, 590 563 C 820 503, 1000 638, 1220 568 C 1330 533, 1395 608, 1440 578" />
          </g>
          <path fill="url(#wave-shine)" d="M0 130 C 180 60, 320 210, 520 155 C 740 95, 880 240, 1100 170 C 1260 120, 1360 200, 1440 155 L 1440 210 C 1360 255, 1260 175, 1100 225 C 880 295, 740 150, 520 210 C 320 265, 180 115, 0 185 Z" />
        </svg>
      </div>
      <div className="grain-overlay pointer-events-none fixed inset-0 z-[1]" aria-hidden />
    </>
  );
}
