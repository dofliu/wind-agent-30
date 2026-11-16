// src/kit/kit.js
// Shared toolbox handed to every scene renderer:
//   - deterministic PRNG / hashing / value noise (never use Math.random in scenes)
//   - bake(): draw-once cache for static artwork (backgrounds, textures, sprites)
//   - pooled 1000x1000 panel canvases
//   - canonical road sampling (y = 700 with zero slope at both panel edges)
//   - fonts, rider rig, pinwheel and small drawing helpers

import { PANEL_SIZE, ROAD_Y, clamp, lerp, smoothstep, smootherstep, envelope, quantizeTime } from '../beat/timeline.js';
import { computeRiderRig, drawRider, drawPinwheel } from '../rig/spoonbill.js';
import { FONT } from './fonts.js';

// -----------------------------------------------------------------------------
// Deterministic randomness
// -----------------------------------------------------------------------------
/** Mulberry32 PRNG -> floats in [0, 1). */
export function makePRNG(seed = 1) {
  let s = (Number(seed) ^ 0x9e3779b9) >>> 0;
  if (s === 0) s = 1;
  return function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let r = Math.imul(s ^ (s >>> 15), s | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) * 2.3283064365386963e-10;
  };
}

/** FNV-1a string/number hash -> uint32 seed. */
export function hashSeed(strOrNum) {
  const str = String(strOrNum);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

/** Stateless hash of a number -> [0, 1). */
export function hash11(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Stateless hash of 2 numbers -> [0, 1). */
export function hash21(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7 + 74.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in [0, 1]. */
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash11(i + seed * 57.3), hash11(i + 1 + seed * 57.3), u);
}

/** Smooth 2D value noise in [0, 1]. */
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const o = seed * 19.19;
  const a = hash21(ix + o, iy);
  const b = hash21(ix + 1 + o, iy);
  const c = hash21(ix + o, iy + 1);
  const d = hash21(ix + 1 + o, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

/** Fractal (fbm) 2D noise in ~[0, 1]. */
export function fbm2(x, y, octaves = 4, seed = 0) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq, seed + i * 7);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

// -----------------------------------------------------------------------------
// Canvas helpers
// -----------------------------------------------------------------------------
export function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Hex '#rrggbb' -> {r,g,b}. */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** '#rrggbb' + alpha -> 'rgba(...)'. */
export function rgba(hex, a = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Mix two hex colours, t in [0,1] -> 'rgb(...)'. */
export function mixColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Sample n+1 points of a cubic Bezier. */
export function sampleCubic(p0, p1, p2, p3, n = 20) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const iu = 1 - u;
    pts.push({
      x: iu * iu * iu * p0.x + 3 * iu * iu * u * p1.x + 3 * iu * u * u * p2.x + u * u * u * p3.x,
      y: iu * iu * iu * p0.y + 3 * iu * iu * u * p1.y + 3 * iu * u * u * p2.y + u * u * u * p3.y,
    });
  }
  return pts;
}

/** Stroke a polyline with a slight deterministic hand-drawn wobble. */
export function wobblyLine(ctx, pts, amp = 1.2, seed = 1) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dx = (hash11(i * 3.17 + seed) - 0.5) * 2 * amp;
    const dy = (hash11(i * 5.71 + seed * 1.3) - 0.5) * 2 * amp;
    if (i === 0) ctx.moveTo(p.x + dx, p.y + dy);
    else ctx.lineTo(p.x + dx, p.y + dy);
  }
  ctx.stroke();
}

/**
 * Fill a canvas region with fine paper / plaster grain (deterministic).
 * `amount` ~0.03..0.12. Use inside bake() callbacks only (it touches many pixels).
 */
export function addGrain(ctx, w, h, rng, amount = 0.06, mono = true) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (rng() - 0.5) * 2 * amount * 255;
    if (mono) {
      d[i] = clamp(d[i] + n, 0, 255);
      d[i + 1] = clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = clamp(d[i + 2] + n, 0, 255);
    } else {
      d[i] = clamp(d[i] + (rng() - 0.5) * 2 * amount * 255, 0, 255);
      d[i + 1] = clamp(d[i + 1] + (rng() - 0.5) * 2 * amount * 255, 0, 255);
      d[i + 2] = clamp(d[i + 2] + (rng() - 0.5) * 2 * amount * 255, 0, 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Soft blotchy stain / wash (e.g. aged paper, fresco plaster). Use in bake(). */
export function addBlotches(ctx, w, h, rng, color = 'rgba(120,90,50,0.05)', count = 40, rMin = 40, rMax = 180) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = lerp(rMin, rMax, rng());
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** Radial vignette over the whole panel. */
export function vignette(ctx, w, h, strength = 0.35, color = '0,0,0') {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${strength})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Wrap text to a max width; returns array of lines (CJK-aware: breaks between any chars). */
export function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  const tokens = text.match(/[A-Za-z0-9.,'’\-–%/()+:;!?°]+\s*|\s+|./gu) || [];
  for (const tok of tokens) {
    const test = line + tok;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trimEnd());
      line = tok.trimStart();
    } else {
      line = test;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

// -----------------------------------------------------------------------------
// Kit factory
// -----------------------------------------------------------------------------
export function createKit() {
  const slots = [];
  for (let i = 0; i < 4; i++) {
    const canvas = createCanvas(PANEL_SIZE, PANEL_SIZE);
    slots.push({ canvas, ctx: canvas.getContext('2d') });
  }
  const bakeCache = new Map();
  const thumbCache = new Map();

  function getSlot(i) {
    return slots[i % slots.length];
  }

  /**
   * Draw-once cache. `drawFn(ctx, rng, w, h, canvas)` runs a single time per key;
   * the returned canvas can be blitted every frame with ctx.drawImage(canvas, x, y).
   */
  function bake(key, w, h, drawFn) {
    const k = `${key}@${w}x${h}`;
    if (bakeCache.has(k)) return bakeCache.get(k);
    const c = createCanvas(w, h);
    const cctx = c.getContext('2d');
    drawFn(cctx, makePRNG(hashSeed(k)), w, h, c);
    bakeCache.set(k, c);
    return c;
  }

  /**
   * Canonical road: y(x) inside a panel. `arch` > 0 raises the middle (bridge/hill),
   * < 0 dips it. Always y = 700 with zero slope at x = 0 and x = 1000.
   */
  function sampleRoad(x, arch = 0) {
    const u = clamp(x / PANEL_SIZE, 0, 1);
    if (!arch) return { y: ROAD_Y, slope: 0 };
    const s = Math.sin(Math.PI * u);
    const y = ROAD_Y - arch * s * s;
    const dydx = (-arch * Math.PI * Math.sin(2 * Math.PI * u)) / PANEL_SIZE;
    return { y, slope: Math.atan(dydx) };
  }

  /** Convenience: rig for the rider at panel-local x on a road with optional arch. */
  function riderRig(params, opts = {}) {
    const { riderLocalX, pedalAngle, speedScale = 1, t = 0 } = params;
    const arch = opts.arch || 0;
    const road = opts.roadFn ? opts.roadFn(riderLocalX) : sampleRoad(riderLocalX, arch);
    return computeRiderRig({
      x: riderLocalX,
      y: road.y,
      slope: road.slope,
      pedalAngle,
      speedScale,
      time: t,
      worldX: params.riderWorldX,
      scale: opts.scale || 1,
      pose: opts.pose || 'ride',
      pinwheelAngle: params.pinwheelAngle,
    });
  }

  /** True when the rider overlaps this panel (draw it, the canvas clips the rest). */
  function riderVisible(params, margin = 260) {
    return params.riderLocalX > -margin && params.riderLocalX < PANEL_SIZE + margin;
  }

  return {
    PANEL_SIZE,
    ROAD_Y,
    FONT,
    getSlot,
    bake,
    thumbCache,
    sampleRoad,
    riderRig,
    riderVisible,
    computeRiderRig,
    drawRider,
    drawPinwheel,
    // math & noise
    clamp,
    lerp,
    smoothstep,
    smootherstep,
    envelope,
    quantizeTime,
    makePRNG,
    hashSeed,
    hash11,
    hash21,
    noise1,
    noise2,
    fbm2,
    // canvas helpers
    createCanvas,
    rgba,
    mixColor,
    hexToRgb,
    sampleCubic,
    wobblyLine,
    addGrain,
    addBlotches,
    vignette,
    wrapText,
  };
}
