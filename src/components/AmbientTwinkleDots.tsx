import React, { useEffect, useRef } from 'react';
import type { ProviderGlow } from './DownloaderView';

interface AmbientTwinkleDotsProps {
  providerGlow: ProviderGlow;
}

interface StarSpec {
  // Normalized screen coordinates [0..1]
  nx: number;
  ny: number;
  // Base radius in CSS px
  radius: number;
  // Color category: 0 = primary/white, 1 = warm/core, 2 = cool/halo, 3 = accent
  paletteSlot: 0 | 1 | 2 | 3;
  // Twinkle animation parameters
  minAlpha: number;
  maxAlpha: number;
  twinkleSpeed: number;
  phase: number;
  // Subtle glow halo & 4-point diffraction spike for brightest stars
  hasHalo: boolean;
  hasSpike: boolean;
  // Ultra-subtle parallax drift factor
  driftX: number;
  driftY: number;
}

interface MeteorState {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  age: number;
  duration: number;
  nextSpawnAt: number;
}

interface GalacticPalette {
  isDark: boolean;
  nebulaCore: [number, number, number];
  nebulaMid: [number, number, number];
  nebulaOuter: [number, number, number];
  nebulaAlphaScale: number;
  dustAlpha: number;
  dustColor: [number, number, number];
  starColors: [
    [number, number, number], // 0: primary
    [number, number, number], // 1: warm core
    [number, number, number], // 2: cool blue-white
    [number, number, number], // 3: accent / provider
  ];
}

// Mulberry32 deterministic PRNG so the galaxy starfield stays consistent across mounts/resizes
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller normal distribution for realistic galactic band density falloff
function randGaussian(rng: () => number): number {
  const u1 = Math.max(1e-6, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Project galactic (u, v) coordinates onto normalized [0..1] viewport coordinates
// Band runs diagonally from bottom-left toward top-right with a gentle S-curve
const GALAXY_ANGLE = -0.58; // ~ -33.2 deg
const COS_A = Math.cos(GALAXY_ANGLE);
const SIN_A = Math.sin(GALAXY_ANGLE);

function galacticToScreen(u: number, v: number): { nx: number; ny: number } {
  // Subtle natural curvature along the Milky Way spine
  const curveOffset = Math.sin(u * 2.5 - 0.25) * 0.032;
  const gx = u * 0.88;
  const gy = (v + curveOffset) * 0.78;
  const rx = gx * COS_A - gy * SIN_A;
  const ry = gx * SIN_A + gy * COS_A;
  return {
    nx: 0.5 + rx,
    ny: 0.5 + ry,
  };
}

function generateMilkyWayStars(): StarSpec[] {
  const rng = createRng(20260842);
  const stars: StarSpec[] = [];

  // 1. Dense Galactic Stardust Band (580 fine pinpoint stars forming the misty Milky Way river)
  for (let i = 0; i < 580; i++) {
    // Cluster slightly more around the galactic bulge (u ~ -0.05..0.15)
    const isCore = i < 200;
    const u = isCore
      ? randGaussian(rng) * 0.26 + 0.04
      : (rng() * 2 - 1) * 0.92;
    const spread = isCore ? 0.085 : 0.115;
    let v = randGaussian(rng) * spread;

    // Carve a subtle "Great Rift" dark dust lane near the center of the band for organic depth
    if (Math.abs(v - 0.012) < 0.018 && Math.abs(u) < 0.45 && rng() < 0.65) {
      v += (v >= 0.012 ? 1 : -1) * (0.025 + rng() * 0.04);
    }

    const { nx, ny } = galacticToScreen(u, v);
    if (nx < -0.04 || nx > 1.04 || ny < -0.04 || ny > 1.04) continue;

    const r = rng();
    const paletteSlot: 0 | 1 | 2 | 3 =
      isCore && r < 0.52 ? 1 : r < 0.74 ? 0 : r < 0.9 ? 2 : 3;

    stars.push({
      nx,
      ny,
      radius: 0.45 + rng() * 0.78,
      paletteSlot,
      minAlpha: 0.12 + rng() * 0.22,
      maxAlpha: 0.52 + rng() * 0.42,
      twinkleSpeed: 0.35 + rng() * 0.85,
      phase: rng() * Math.PI * 2,
      hasHalo: rng() < 0.08,
      hasSpike: false,
      driftX: (rng() - 0.5) * 3.5,
      driftY: (rng() - 0.5) * 3.5,
    });
  }

  // 2. Spiral Arm & Star Cloud Medium Stars (240 luminous stars flanking the galactic band)
  for (let i = 0; i < 240; i++) {
    const u = (rng() * 2 - 1) * 0.95;
    const v = randGaussian(rng) * 0.22;
    const { nx, ny } = galacticToScreen(u, v);
    if (nx < -0.04 || nx > 1.04 || ny < -0.04 || ny > 1.04) continue;

    const r = rng();
    const paletteSlot: 0 | 1 | 2 | 3 = r < 0.38 ? 0 : r < 0.62 ? 2 : r < 0.8 ? 1 : 3;

    stars.push({
      nx,
      ny,
      radius: 0.95 + rng() * 1.05,
      paletteSlot,
      minAlpha: 0.16 + rng() * 0.2,
      maxAlpha: 0.68 + rng() * 0.3,
      twinkleSpeed: 0.45 + rng() * 0.95,
      phase: rng() * Math.PI * 2,
      hasHalo: rng() < 0.35,
      hasSpike: false,
      driftX: (rng() - 0.5) * 5,
      driftY: (rng() - 0.5) * 5,
    });
  }

  // 3. Deep-Space Background Field Stars (130 stars distributed across the full sky)
  for (let i = 0; i < 130; i++) {
    const nx = rng();
    const ny = rng();
    const r = rng();
    const paletteSlot: 0 | 1 | 2 | 3 = r < 0.48 ? 0 : r < 0.72 ? 2 : r < 0.86 ? 1 : 3;

    stars.push({
      nx,
      ny,
      radius: 0.6 + rng() * 1.15,
      paletteSlot,
      minAlpha: 0.1 + rng() * 0.16,
      maxAlpha: 0.48 + rng() * 0.38,
      twinkleSpeed: 0.3 + rng() * 0.75,
      phase: rng() * Math.PI * 2,
      hasHalo: rng() < 0.2,
      hasSpike: false,
      driftX: (rng() - 0.5) * 4,
      driftY: (rng() - 0.5) * 4,
    });
  }

  // 4. First-Magnitude Beacon Stars with Soft Diffraction Spikes (24 prominent stars)
  for (let i = 0; i < 24; i++) {
    const onBand = i < 16;
    const pos = onBand
      ? galacticToScreen((rng() * 2 - 1) * 0.85, randGaussian(rng) * 0.2)
      : { nx: 0.05 + rng() * 0.9, ny: 0.05 + rng() * 0.9 };

    if (pos.nx < 0.02 || pos.nx > 0.98 || pos.ny < 0.02 || pos.ny > 0.98) continue;

    const r = rng();
    const paletteSlot: 0 | 1 | 2 | 3 = r < 0.35 ? 0 : r < 0.6 ? 2 : r < 0.8 ? 1 : 3;

    stars.push({
      nx: pos.nx,
      ny: pos.ny,
      radius: 1.75 + rng() * 0.95,
      paletteSlot,
      minAlpha: 0.45 + rng() * 0.18,
      maxAlpha: 0.92 + rng() * 0.08,
      twinkleSpeed: 0.55 + rng() * 0.7,
      phase: rng() * Math.PI * 2,
      hasHalo: true,
      hasSpike: true,
      driftX: (rng() - 0.5) * 6,
      driftY: (rng() - 0.5) * 6,
    });
  }

  return stars;
}

const MILKY_WAY_STARS = generateMilkyWayStars();

function getGalacticPalette(theme: string, isDark: boolean, providerGlow: ProviderGlow): GalacticPalette {
  // Base stellar temperatures per theme
  let base: GalacticPalette;

  if (!isDark) {
    // Light themes: subtle cosmic-slate / theme-tinted stardust so the Milky Way band stays visible & delicate
    if (theme === 'spring') {
      base = {
        isDark: false,
        nebulaCore: [16, 185, 129],
        nebulaMid: [244, 63, 94],
        nebulaOuter: [52, 211, 153],
        nebulaAlphaScale: 0.14,
        dustAlpha: 0,
        dustColor: [237, 249, 241],
        starColors: [
          [15, 118, 110],
          [225, 29, 72],
          [5, 150, 105],
          [244, 63, 94],
        ],
      };
    } else if (theme === 'summer') {
      base = {
        isDark: false,
        nebulaCore: [245, 158, 11],
        nebulaMid: [6, 182, 212],
        nebulaOuter: [249, 115, 22],
        nebulaAlphaScale: 0.14,
        dustAlpha: 0,
        dustColor: [255, 246, 228],
        starColors: [
          [180, 83, 9],
          [217, 119, 6],
          [8, 145, 178],
          [245, 158, 11],
        ],
      };
    } else if (theme === 'autumn') {
      base = {
        isDark: false,
        nebulaCore: [234, 88, 12],
        nebulaMid: [217, 119, 6],
        nebulaOuter: [185, 28, 28],
        nebulaAlphaScale: 0.13,
        dustAlpha: 0,
        dustColor: [252, 237, 221],
        starColors: [
          [154, 52, 18],
          [217, 119, 6],
          [185, 28, 28],
          [234, 88, 12],
        ],
      };
    } else {
      // Pure light theme
      base = {
        isDark: false,
        nebulaCore: [113, 113, 122],
        nebulaMid: [161, 161, 170],
        nebulaOuter: [82, 82, 91],
        nebulaAlphaScale: 0.1,
        dustAlpha: 0,
        dustColor: [255, 255, 255],
        starColors: [
          [63, 63, 70],
          [113, 113, 122],
          [82, 82, 91],
          [39, 39, 42],
        ],
      };
    }
  } else if (theme === 'winter') {
    base = {
      isDark: true,
      nebulaCore: [186, 230, 253],
      nebulaMid: [56, 189, 248],
      nebulaOuter: [37, 99, 235],
      nebulaAlphaScale: 0.24,
      dustAlpha: 0.32,
      dustColor: [7, 19, 34],
      starColors: [
        [240, 249, 255],
        [224, 242, 254],
        [125, 211, 252],
        [56, 189, 248],
      ],
    };
  } else if (theme === 'shiraz') {
    base = {
      isDark: true,
      nebulaCore: [251, 207, 232],
      nebulaMid: [226, 163, 182],
      nebulaOuter: [157, 68, 102],
      nebulaAlphaScale: 0.24,
      dustAlpha: 0.34,
      dustColor: [19, 8, 13],
      starColors: [
        [255, 245, 248],
        [253, 218, 228],
        [226, 163, 182],
        [244, 114, 182],
      ],
    };
  } else if (theme === 'pastelDark') {
    base = {
      isDark: true,
      nebulaCore: [224, 231, 255],
      nebulaMid: [183, 180, 237],
      nebulaOuter: [155, 218, 200],
      nebulaAlphaScale: 0.23,
      dustAlpha: 0.32,
      dustColor: [13, 15, 20],
      starColors: [
        [248, 250, 252],
        [221, 214, 254],
        [167, 243, 208],
        [183, 180, 237],
      ],
    };
  } else {
    // Classic deep space dark theme
    base = {
      isDark: true,
      nebulaCore: [255, 244, 224],
      nebulaMid: [196, 214, 255],
      nebulaOuter: [110, 145, 225],
      nebulaAlphaScale: 0.2,
      dustAlpha: 0.42,
      dustColor: [0, 0, 0],
      starColors: [
        [255, 255, 255],
        [254, 240, 205],
        [191, 219, 254],
        [226, 232, 240],
      ],
    };
  }

  // Tint accent stars & subtle nebula highlights to match the active media provider glow
  if (providerGlow === 'red') {
    base.starColors[3] = isDark ? [252, 165, 165] : [220, 38, 38];
    base.nebulaMid = isDark ? [239, 68, 68] : [239, 68, 68];
  } else if (providerGlow === 'instagram') {
    base.starColors[3] = isDark ? [249, 168, 212] : [219, 39, 119];
    base.nebulaMid = isDark ? [221, 42, 123] : [221, 42, 123];
    base.nebulaCore = isDark ? [253, 186, 116] : [245, 133, 41];
  } else if (providerGlow === 'tiktok') {
    base.starColors[3] = isDark ? [165, 243, 252] : [6, 182, 212];
    base.nebulaMid = isDark ? [37, 244, 238] : [6, 182, 212];
    base.nebulaOuter = isDark ? [254, 44, 85] : [244, 63, 94];
  } else if (providerGlow === 'x') {
    base.starColors[3] = isDark ? [186, 230, 253] : [2, 132, 199];
    base.nebulaMid = isDark ? [56, 189, 248] : [14, 165, 233];
  } else if (providerGlow === 'pinterest') {
    base.starColors[3] = isDark ? [253, 164, 175] : [225, 29, 72];
    base.nebulaMid = isDark ? [230, 0, 35] : [225, 29, 72];
  }

  return base;
}

function buildNebulaLayer(width: number, height: number, palette: GalacticPalette): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.floor(width));
  off.height = Math.max(1, Math.floor(height));
  const ctx = off.getContext('2d');
  if (!ctx) return off;

  const cx = width * 0.5;
  const cy = height * 0.5;
  const diag = Math.hypot(width, height);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(GALAXY_ANGLE);

  // Outer diffuse galactic halo ribbon
  const bandGrad = ctx.createRadialGradient(0, 0, diag * 0.02, 0, 0, diag * 0.58);
  const [or, og, ob] = palette.nebulaOuter;
  const [mr, mg, mb] = palette.nebulaMid;
  const [cr, cg, cb] = palette.nebulaCore;
  const aScale = palette.nebulaAlphaScale;

  ctx.save();
  ctx.scale(1.35, 0.24);
  bandGrad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${(0.72 * aScale).toFixed(3)})`);
  bandGrad.addColorStop(0.28, `rgba(${mr}, ${mg}, ${mb}, ${(0.48 * aScale).toFixed(3)})`);
  bandGrad.addColorStop(0.62, `rgba(${or}, ${og}, ${ob}, ${(0.22 * aScale).toFixed(3)})`);
  bandGrad.addColorStop(1, `rgba(${or}, ${og}, ${ob}, 0)`);
  ctx.fillStyle = bandGrad;
  ctx.beginPath();
  ctx.arc(0, 0, diag * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Warm / bright galactic core bulge (Sagittarius region)
  ctx.save();
  ctx.translate(diag * 0.04, -diag * 0.01);
  ctx.scale(0.85, 0.34);
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, diag * 0.34);
  coreGrad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${(0.95 * aScale).toFixed(3)})`);
  coreGrad.addColorStop(0.42, `rgba(${mr}, ${mg}, ${mb}, ${(0.45 * aScale).toFixed(3)})`);
  coreGrad.addColorStop(1, `rgba(${mr}, ${mg}, ${mb}, 0)`);
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, diag * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Secondary star cloud knot along the upper-right arm
  ctx.save();
  ctx.translate(diag * 0.26, diag * 0.015);
  ctx.scale(0.65, 0.2);
  const knotGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, diag * 0.24);
  knotGrad.addColorStop(0, `rgba(${mr}, ${mg}, ${mb}, ${(0.55 * aScale).toFixed(3)})`);
  knotGrad.addColorStop(1, `rgba(${or}, ${og}, ${ob}, 0)`);
  ctx.fillStyle = knotGrad;
  ctx.beginPath();
  ctx.arc(0, 0, diag * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Subtle dark Great Rift dust lane across the galactic equator (dark themes only)
  if (palette.isDark && palette.dustAlpha > 0) {
    ctx.save();
    ctx.translate(diag * 0.02, diag * 0.008);
    ctx.scale(1.15, 0.055);
    const [dr, dg, db] = palette.dustColor;
    const dustGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, diag * 0.38);
    dustGrad.addColorStop(0, `rgba(${dr}, ${dg}, ${db}, ${palette.dustAlpha})`);
    dustGrad.addColorStop(0.55, `rgba(${dr}, ${dg}, ${db}, ${(palette.dustAlpha * 0.55).toFixed(3)})`);
    dustGrad.addColorStop(1, `rgba(${dr}, ${dg}, ${db}, 0)`);
    ctx.fillStyle = dustGrad;
    ctx.beginPath();
    ctx.arc(0, 0, diag * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
  return off;
}

export const AmbientTwinkleDots: React.FC<AmbientTwinkleDotsProps> = React.memo(({ providerGlow }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const providerGlowRef = useRef<ProviderGlow>(providerGlow);
  providerGlowRef.current = providerGlow;

  const syncGlowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const readThemeState = () => {
      const root = document.documentElement;
      const theme = root.dataset.theme || (root.classList.contains('dark') ? 'dark' : 'light');
      const isDark = root.classList.contains('dark');
      return { theme, isDark };
    };

    let currentTheme = readThemeState();
    let palette = getGalacticPalette(currentTheme.theme, currentTheme.isDark, providerGlowRef.current);
    let nebulaCanvas = buildNebulaLayer(width, height, palette);

    const syncCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      nebulaCanvas = buildNebulaLayer(width, height, palette);
    };

    syncCanvasSize();

    const meteor: MeteorState = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      length: 90,
      age: 0,
      duration: 0.75,
      nextSpawnAt: performance.now() + 3500,
    };

    let lastGlow = providerGlowRef.current;

    const drawFrame = (nowMs: number, dtSec: number) => {
      if (lastGlow !== providerGlowRef.current) {
        lastGlow = providerGlowRef.current;
        palette = getGalacticPalette(currentTheme.theme, currentTheme.isDark, lastGlow);
        nebulaCanvas = buildNebulaLayer(width, height, palette);
      }

      const t = nowMs * 0.001;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // 1. Pre-rendered Milky Way galactic nebula & dust band
      ctx.drawImage(nebulaCanvas, 0, 0, width, height);

      // 2. Render all Milky Way stars
      for (let i = 0; i < MILKY_WAY_STARS.length; i++) {
        const star = MILKY_WAY_STARS[i];
        const twinkleWave = reducedMotion
          ? 0.65
          : 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.phase);
        const alpha = star.minAlpha + (star.maxAlpha - star.minAlpha) * twinkleWave;

        const driftOffsetX = reducedMotion ? 0 : Math.sin(t * 0.08 + star.phase) * star.driftX;
        const driftOffsetY = reducedMotion ? 0 : Math.cos(t * 0.07 + star.phase) * star.driftY;

        const x = star.nx * width + driftOffsetX;
        const y = star.ny * height + driftOffsetY;
        const [r, g, b] = palette.starColors[star.paletteSlot];
        const radius = star.radius * (0.88 + 0.22 * twinkleWave);

        // Soft luminous halo on prominent stars
        if (star.hasHalo) {
          const haloRadius = radius * (star.hasSpike ? 5.2 : 3.4);
          const haloGrad = ctx.createRadialGradient(x, y, 0, x, y, haloRadius);
          haloGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.45).toFixed(3)})`);
          haloGrad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.14).toFixed(3)})`);
          haloGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Delicate 4-point starlight diffraction spike on 1st-magnitude beacon stars
        if (star.hasSpike) {
          const spikeLen = radius * (3.6 + twinkleWave * 2.2);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.55).toFixed(3)})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(x - spikeLen, y);
          ctx.lineTo(x + spikeLen, y);
          ctx.moveTo(x, y - spikeLen);
          ctx.lineTo(x, y + spikeLen);
          ctx.stroke();
        }

        // Crisp star core
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Occasional subtle shooting star gliding along the sky (disabled in reduced-motion)
      if (!reducedMotion) {
        if (!meteor.active && nowMs >= meteor.nextSpawnAt) {
          meteor.active = true;
          meteor.age = 0;
          meteor.duration = 0.65 + Math.random() * 0.35;
          meteor.x = width * (0.2 + Math.random() * 0.65);
          meteor.y = height * (0.06 + Math.random() * 0.32);
          const speed = Math.min(width, height) * 0.55 + 220;
          const angle = Math.PI * (0.72 + Math.random() * 0.12);
          meteor.vx = Math.cos(angle) * speed;
          meteor.vy = Math.sin(angle) * speed;
          meteor.length = 75 + Math.random() * 55;
        }

        if (meteor.active) {
          meteor.age += dtSec;
          const progress = meteor.age / meteor.duration;
          if (progress >= 1) {
            meteor.active = false;
            meteor.nextSpawnAt = nowMs + 8500 + Math.random() * 7500;
          } else {
            const fade = Math.sin(progress * Math.PI);
            const curX = meteor.x + meteor.vx * meteor.age;
            const curY = meteor.y + meteor.vy * meteor.age;
            const norm = Math.hypot(meteor.vx, meteor.vy) || 1;
            const tailX = curX - (meteor.vx / norm) * meteor.length;
            const tailY = curY - (meteor.vy / norm) * meteor.length;

            const [mr, mg, mb] = palette.starColors[0];
            const meteorGrad = ctx.createLinearGradient(curX, curY, tailX, tailY);
            meteorGrad.addColorStop(0, `rgba(${mr}, ${mg}, ${mb}, ${(0.85 * fade).toFixed(3)})`);
            meteorGrad.addColorStop(0.35, `rgba(${mr}, ${mg}, ${mb}, ${(0.35 * fade).toFixed(3)})`);
            meteorGrad.addColorStop(1, `rgba(${mr}, ${mg}, ${mb}, 0)`);

            ctx.strokeStyle = meteorGrad;
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(curX, curY);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
          }
        }
      }
    };

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dtSec = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      drawFrame(now, dtSec);
      if (!reducedMotion && !document.hidden) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const startOrRenderStatic = () => {
      window.cancelAnimationFrame(rafId);
      lastTime = performance.now();
      if (reducedMotion) {
        drawFrame(lastTime, 0);
      } else if (!document.hidden) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    syncGlowRef.current = () => {
      lastGlow = providerGlowRef.current;
      palette = getGalacticPalette(currentTheme.theme, currentTheme.isDark, lastGlow);
      nebulaCanvas = buildNebulaLayer(width, height, palette);
      if (reducedMotion) {
        drawFrame(performance.now(), 0);
      }
    };

    const handleResize = () => {
      syncCanvasSize();
      if (reducedMotion) {
        drawFrame(performance.now(), 0);
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        startOrRenderStatic();
      } else {
        window.cancelAnimationFrame(rafId);
      }
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      startOrRenderStatic();
    };

    const themeObserver = new MutationObserver(() => {
      const nextTheme = readThemeState();
      if (nextTheme.theme !== currentTheme.theme || nextTheme.isDark !== currentTheme.isDark) {
        currentTheme = nextTheme;
        palette = getGalacticPalette(currentTheme.theme, currentTheme.isDark, providerGlowRef.current);
        nebulaCanvas = buildNebulaLayer(width, height, palette);
        if (reducedMotion) {
          drawFrame(performance.now(), 0);
        }
      }
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    motionQuery.addEventListener('change', handleMotionChange);

    startOrRenderStatic();

    return () => {
      syncGlowRef.current = null;
      window.cancelAnimationFrame(rafId);
      themeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  useEffect(() => {
    syncGlowRef.current?.();
  }, [providerGlow]);

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
});

AmbientTwinkleDots.displayName = 'AmbientTwinkleDots';
