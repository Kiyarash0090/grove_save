import React from 'react';
import type { ProviderGlow } from './DownloaderView';

interface AmbientDotSpec {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  minOpacity: number;
  maxOpacity: number;
  accented: boolean;
}

// Deterministic low-discrepancy distribution across the viewport so dots never clump or jump on re-render
const AMBIENT_DOTS: AmbientDotSpec[] = Array.from({ length: 120 }, (_, i) => {
  const gx = ((i * 0.61803398875 + 0.09) % 1) * 97 + 1.5;
  const gy = (((i * 0.38196601125 + 0.05 + Math.sin(i * 1.93) * 0.06) % 1 + 1) % 1) * 95 + 2.5;
  const sizeBucket = i % 6;
  const size =
    sizeBucket === 0
      ? 3.5
      : sizeBucket === 1
        ? 3
        : sizeBucket === 2 || sizeBucket === 3
          ? 2.5
          : sizeBucket === 4
            ? 2
            : 1.5;
  const duration = 5.4 + (i % 8) * 0.9; // 5.4s – 11.7s slow twinkle
  const delay = -((i * 1.43) % duration);
  const minOpacity = 0.07 + (i % 3) * 0.04;
  const maxOpacity = 0.5 + (i % 5) * 0.1;
  const accented = i % 4 === 0;

  return {
    id: i,
    left: `${gx.toFixed(2)}%`,
    top: `${gy.toFixed(2)}%`,
    size,
    duration,
    delay,
    minOpacity,
    maxOpacity,
    accented,
  };
});

interface AmbientTwinkleDotsProps {
  providerGlow: ProviderGlow;
}

function getAccentDotClass(providerGlow: ProviderGlow): string {
  switch (providerGlow) {
    case 'red':
      return 'bg-red-500/75 dark:bg-red-300 shadow-[0_0_8px_rgba(239,68,68,0.45)] dark:shadow-[0_0_10px_rgba(252,165,165,0.85)]';
    case 'instagram':
      return 'bg-pink-500/70 dark:bg-pink-300 shadow-[0_0_8px_rgba(221,42,123,0.45)] dark:shadow-[0_0_10px_rgba(249,168,212,0.85)]';
    case 'tiktok':
      return 'bg-cyan-500/70 dark:bg-cyan-300 shadow-[0_0_8px_rgba(37,244,238,0.45)] dark:shadow-[0_0_10px_rgba(165,243,252,0.85)]';
    case 'x':
      return 'bg-sky-500/70 dark:bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.45)] dark:shadow-[0_0_10px_rgba(186,230,253,0.85)]';
    default:
      return 'bg-zinc-600/55 dark:bg-white shadow-[0_0_7px_rgba(0,0,0,0.18)] dark:shadow-[0_0_10px_rgba(255,255,255,0.85)]';
  }
}

export const AmbientTwinkleDots: React.FC<AmbientTwinkleDotsProps> = React.memo(({ providerGlow }) => {
  const accentDotClass = getAccentDotClass(providerGlow);

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {AMBIENT_DOTS.map((dot) => {
        const dotStyle = {
          left: dot.left,
          top: dot.top,
          width: `${dot.size}px`,
          height: `${dot.size}px`,
          animationDuration: `${dot.duration}s`,
          animationDelay: `${dot.delay.toFixed(2)}s`,
          '--dot-min': String(dot.minOpacity),
          '--dot-mid': String(((dot.minOpacity + dot.maxOpacity) * 0.45).toFixed(2)),
          '--dot-max': String(dot.maxOpacity),
        } as React.CSSProperties;

        return (
          <span
            key={dot.id}
            style={dotStyle}
            className={`absolute rounded-full animate-ambient-twinkle transition-colors duration-700 ${
              dot.accented
                ? accentDotClass
                : 'bg-zinc-700/45 dark:bg-white/95 shadow-[0_0_6px_rgba(0,0,0,0.16)] dark:shadow-[0_0_9px_rgba(255,255,255,0.8)]'
            }`}
          />
        );
      })}
    </div>
  );
});

AmbientTwinkleDots.displayName = 'AmbientTwinkleDots';
