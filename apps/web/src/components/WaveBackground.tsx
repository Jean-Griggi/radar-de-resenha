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
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <svg className="h-full w-full" viewBox="0 0 1440 1024" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="wave-sky" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--wave-sky-start)" />
            <stop offset="100%" stopColor="var(--wave-sky-end)" />
          </linearGradient>
          {lite ? null : (
            <filter id="wave-shadow" x="-10%" y="-10%" width="120%" height="140%">
              <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="rgba(8,16,32,0.35)" />
            </filter>
          )}
          <linearGradient id="wave-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--wave-shine)" stopOpacity="0.55" />
            <stop offset="18%" stopColor="var(--wave-shine)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="1440" height="1024" fill="url(#wave-sky)" />
        <g filter={lite ? undefined : 'url(#wave-shadow)'}>
          <path fill="var(--wave-5)" d="M0 430 C 180 360, 320 510, 520 455 C 740 395, 880 540, 1100 470 C 1260 420, 1360 500, 1440 455 L 1440 1024 L 0 1024 Z" />
          <path fill="var(--wave-4)" d="M0 530 C 200 470, 360 610, 560 545 C 780 475, 940 630, 1160 555 C 1300 510, 1380 590, 1440 550 L 1440 1024 L 0 1024 Z" />
          <path fill="var(--wave-3)" d="M0 620 C 170 575, 340 700, 540 640 C 760 575, 930 720, 1140 655 C 1290 610, 1375 690, 1440 650 L 1440 1024 L 0 1024 Z" />
          <path fill="var(--wave-2)" d="M0 720 C 210 670, 380 800, 600 740 C 820 680, 980 820, 1200 750 C 1320 710, 1390 790, 1440 755 L 1440 1024 L 0 1024 Z" />
          <path fill="var(--wave-1)" d="M0 830 C 190 790, 370 900, 590 845 C 820 785, 1000 920, 1220 850 C 1330 815, 1395 890, 1440 860 L 1440 1024 L 0 1024 Z" />
        </g>
        <g fill="none" stroke="var(--wave-line)" strokeWidth="0.8">
          <path d="M0 448 C 180 378, 320 528, 520 473 C 740 413, 880 558, 1100 488 C 1260 438, 1360 518, 1440 473" />
          <path d="M0 462 C 180 392, 320 542, 520 487 C 740 427, 880 572, 1100 502 C 1260 452, 1360 532, 1440 487" />
          <path d="M0 476 C 180 406, 320 556, 520 501 C 740 441, 880 586, 1100 516 C 1260 466, 1360 546, 1440 501" />
          <path d="M0 548 C 200 488, 360 628, 560 563 C 780 493, 940 648, 1160 573 C 1300 528, 1380 608, 1440 568" />
          <path d="M0 562 C 200 502, 360 642, 560 577 C 780 507, 940 662, 1160 587 C 1300 542, 1380 622, 1440 582" />
          <path d="M0 638 C 170 593, 340 718, 540 658 C 760 593, 930 738, 1140 673 C 1290 628, 1375 708, 1440 668" />
          <path d="M0 652 C 170 607, 340 732, 540 672 C 760 607, 930 752, 1140 687 C 1290 642, 1375 722, 1440 682" />
          <path d="M0 738 C 210 688, 380 818, 600 758 C 820 698, 980 838, 1200 768 C 1320 728, 1390 808, 1440 773" />
          <path d="M0 752 C 210 702, 380 832, 600 772 C 820 712, 980 852, 1200 782 C 1320 742, 1390 822, 1440 787" />
          <path d="M0 848 C 190 808, 370 918, 590 863 C 820 803, 1000 938, 1220 868 C 1330 833, 1395 908, 1440 878" />
        </g>
        <path fill="url(#wave-shine)" d="M0 430 C 180 360, 320 510, 520 455 C 740 395, 880 540, 1100 470 C 1260 420, 1360 500, 1440 455 L 1440 510 C 1360 555, 1260 475, 1100 525 C 880 595, 740 450, 520 510 C 320 565, 180 415, 0 485 Z" />
      </svg>
    </div>
  );
}
