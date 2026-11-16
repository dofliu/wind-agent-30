// src/scenes/quixote.js — #04 · 1605 · 唐吉訶德大戰風車
//
// Medium: a 19th-century wood-engraving book plate (in the spirit of the great
// illustrated Quixote editions of the 1860s): cream paper, black ink, skies cut as
// fine horizontal "tint" lines, form built from swelling parallel lines and
// cross-hatching, deep chiaroscuro, the plate caption set beneath the image.
//
// Machine: a La Mancha tower mill (Campo de Criptana / Consuegra type): squat
// whitewashed cylindrical masonry tower, tiny windows, a door at the foot, a
// conical wooden cap that is turned into the wind with the long tail pole
// ("palo de gobierno") tied to stone posts, and four lattice sails with canvas.
//
// Gag (4 bars @ 120 BPM): bar 1 Sancho warns, the knight lowers his lance; bar 2
// Rocinante charges; bar 3 the down-sweeping sail catches the lance and lifts the
// knight out of the saddle (Sancho clutches his head); bar 4 he is carried up the
// sail, the lance snaps and he tumbles in an arc to the ground — the broken lance
// head keeps riding round on the sail. The spoonbill pedals past, unbothered.
//
// Everything static is baked once (sky strip, landscape + mill, plate); per frame
// only sails, figures, birds, dust and the rider are drawn.

const S = 1000;
const ROAD_Y = 700;
const INK = '#1a1714';
const PAPER = '#f1ebdd';
const ink = (a) => `rgba(26,23,20,${a})`;
const paperA = (a) => `rgba(241,235,221,${a})`;
const TAU = Math.PI * 2;

// plate (image) rectangle inside the panel; caption printed below it
const IMG = { x0: 30, y0: 30, x1: 970, y1: 876 };
const EYE = 440; // eye level (horizon)

// ---------------------------------------------------------------------------
// small math / noise (self-contained)
// ---------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sm01 = (u) => {
  const t = clamp(u, 0, 1);
  return t * t * (3 - 2 * t);
};
const sstep = (e0, e1, x) => sm01((x - e0) / (e1 - e0));
const env = (x, a, b, c, d) => sstep(a, b, x) * (1 - sstep(c, d, x));
function h1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function h2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7 + 74.7) * 43758.5453123;
  return s - Math.floor(s);
}
function vn2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy);
  const b = h2(ix + 1, iy);
  const c = h2(ix, iy + 1);
  const d = h2(ix + 1, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
function fbm(x, y, o = 3) {
  let a = 0.5;
  let f = 1;
  let s = 0;
  let n = 0;
  for (let i = 0; i < o; i++) {
    s += a * vn2(x * f + i * 17.3, y * f - i * 9.1);
    n += a;
    a *= 0.5;
    f *= 2.07;
  }
  return s / n;
}
const gray = (d) => {
  const v = Math.round(255 * (1 - clamp(d, 0, 1)));
  return `rgb(${v},${v},${v})`;
};
const grayA = (d, a) => {
  const v = Math.round(255 * (1 - clamp(d, 0, 1)));
  return `rgba(${v},${v},${v},${a})`;
};
const rot = (x, y, a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
};
const P = (x, y) => ({ x, y });
const addP = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mid = (a, b, t = 0.5) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

// ---------------------------------------------------------------------------
// layout
// ---------------------------------------------------------------------------
function crestY(x) {
  let y = 487 - 6 * sm01((x - 40) / 170);
  y -= 10 * sm01((x - 560) / 400);
  y += 2.0 * Math.sin(x * 0.019 + 0.7) + 1.2 * Math.sin(x * 0.051 + 2.1);
  return y;
}
function ridgeY(x) {
  let y = 431 + 4 * Math.sin(x * 0.013 + 0.4) + 2.2 * Math.sin(x * 0.043 + 1.3);
  y -= 9 * Math.exp(-(((x - 150) / 120) ** 2));
  y -= 6 * Math.exp(-(((x - 360) / 90) ** 2));
  y += 13 * sm01((x - 440) / 220);
  return y;
}

// the mill
const TX = 752; // tower axis x
const TT = 272; // tower top (rim) y
const TB = Math.round(crestY(TX) + 2); // tower foot
const TR1 = 63; // radius at top
const TR0 = 72; // radius at foot
const CAP = { rim: TT + 4, apex: { x: 756, y: 197 }, r: 72 };
const HUB = { x: 663, y: 247 };
const SAIL_R = 205;
const KX = 0.7; // foreshortening of the sail plane (sails face front-left)
const OMEGA = 0.9; // rad/s  (~8.6 rpm, a brisk La Mancha breeze)
const T_CATCH = 3.5;
const T_SNAP = 6.2;
const STUCK = { r: 192, n: 17 }; // where the lance pierces the sail (sail-local)
const LANCE_F = 168; // grip -> tip
const LANCE_B = 26; // grip -> butt

// characters
const SANCHO_X = 150;
const KNIGHT_X0 = 300;

const towerR = (y) => lerp(TR1, TR0, (y - TT) / (TB - TT));
const ringSag = (y) => (y - EYE) * 0.045; // + = U-shaped ring (below eye), - = n-shaped

// sail angle of sail k at time T (k = 0 is the sail that catches the lance)
const sailAngle = (T, k = 0) => Math.PI / 2 - OMEGA * (T - T_CATCH) + (k * Math.PI) / 2;
function sailPoint(theta, r, n) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: HUB.x + KX * (r * c - n * s), y: HUB.y + r * s + n * c };
}

// ---------------------------------------------------------------------------
// engraving core: tone map -> swelling parallel lines
// ---------------------------------------------------------------------------
function mkCanvas(kit, w, h) {
  return kit.createCanvas(w, h);
}

function toneReader(tc, x0, y0) {
  const w = tc.width;
  const h = tc.height;
  const d = tc.getContext('2d').getImageData(0, 0, w, h).data;
  return (x, y) => {
    const ix = Math.floor(x - x0 + 0.5);
    const iy = Math.floor(y - y0 + 0.5);
    if (ix < 0 || iy < 0 || ix >= w || iy >= h) return -1;
    const k = (iy * w + ix) * 4;
    if (d[k + 3] < 110) return -1;
    return 1 - d[k] / 255;
  };
}

/**
 * Engrave polylines: the width of each line swells with the darkness of the tone.
 * pts: [x, y, widthMul]
 */
function engrave(g, rd, lines, o = {}) {
  const sp = o.sp || 3;
  const d0 = o.d0 === undefined ? 0.04 : o.d0;
  const gam = o.gam || 1;
  const mx = o.max || 0.9;
  const minW = o.minW || 0.3;
  let path = new Path2D();
  let nPoly = 0;
  const top = [];
  const bot = [];
  const flush = () => {
    if (top.length >= 2) {
      path.moveTo(top[0][0], top[0][1]);
      for (let i = 1; i < top.length; i++) path.lineTo(top[i][0], top[i][1]);
      for (let i = bot.length - 1; i >= 0; i--) path.lineTo(bot[i][0], bot[i][1]);
      path.closePath();
      if (++nPoly >= 24) {
        // fill in batches: one giant path rasterises far slower than many small ones
        g.fill(path);
        path = new Path2D();
        nPoly = 0;
      }
    }
    top.length = 0;
    bot.length = 0;
  };
  for (const pts of lines) {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const a = pts[i > 0 ? i - 1 : 0];
      const b = pts[i < n - 1 ? i + 1 : n - 1];
      let tx = b[0] - a[0];
      let ty = b[1] - a[1];
      const L = Math.hypot(tx, ty) || 1;
      tx /= L;
      ty /= L;
      const s = rd(p[0], p[1]);
      let w = 0;
      if (s > d0) w = Math.pow((s - d0) / (1 - d0), gam) * mx * sp * (p[2] === undefined ? 1 : p[2]);
      if (w < minW) {
        if (top.length) {
          top.push([p[0], p[1]]);
          bot.push([p[0], p[1]]);
        }
        flush();
        continue;
      }
      const hw = w / 2;
      top.push([p[0] - ty * hw, p[1] + tx * hw]);
      bot.push([p[0] + ty * hw, p[1] - tx * hw]);
    }
    flush();
  }
  g.fill(path);
}

// cheap smooth pseudo-noise in [-1, 1] (sum of incommensurate sines) for line wobble
const wav = (x, y) => Math.sin(x * 1.0 + y * 1.7) * 0.5 + Math.sin(x * 2.31 - y * 0.83 + 1.3) * 0.3 + Math.sin(x * 0.47 + y * 2.9 + 4.1) * 0.2;

/** Parallel straight lines at angle (deg) covering a bbox, with slight hand wobble. */
function linesParallel(x0, y0, x1, y1, ang, sp, o = {}) {
  const a = (ang * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const nx = -uy;
  const ny = ux;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
  const step = o.step || 2;
  const wob = o.wob === undefined ? 0.45 : o.wob;
  const seed = o.seed || 0;
  const jit = o.jit === undefined ? 0.18 : o.jit;
  const out = [];
  let li = 0;
  for (let k = -R; k <= R; k += sp, li++) {
    // clip the line to the rectangle analytically
    const bx = cx + nx * k;
    const by = cy + ny * k;
    let s0 = -R;
    let s1 = R;
    if (Math.abs(ux) > 1e-6) {
      const a0 = (x0 - bx) / ux;
      const a1 = (x1 - bx) / ux;
      s0 = Math.max(s0, Math.min(a0, a1));
      s1 = Math.min(s1, Math.max(a0, a1));
    } else if (bx < x0 || bx > x1) continue;
    if (Math.abs(uy) > 1e-6) {
      const b0 = (y0 - by) / uy;
      const b1 = (y1 - by) / uy;
      s0 = Math.max(s0, Math.min(b0, b1));
      s1 = Math.min(s1, Math.max(b0, b1));
    } else if (by < y0 || by > y1) continue;
    if (s1 - s0 < step) continue;
    const pts = [];
    const lf = li * 0.37 + seed * 3.1;
    for (let s = s0; s <= s1; s += step) {
      const wv = wob ? wav(s * 0.011 + seed, lf) * wob : 0;
      pts.push([bx + nx * wv + ux * s, by + ny * wv + uy * s, 1 + wav(s * 0.05 + li * 1.7, seed) * jit]);
    }
    out.push(pts);
  }
  return out;
}

/** Rows interpolated between a top curve and a bottom curve (contour lines). */
function linesRows(x0, x1, topFn, botFn, sp, o = {}) {
  const step = o.step || 2;
  let maxH = 0;
  for (let x = x0; x <= x1; x += 10) maxH = Math.max(maxH, botFn(x) - topFn(x));
  const n = Math.ceil(maxH / sp);
  const out = [];
  const seed = o.seed || 0;
  const wob = o.wob === undefined ? 0.5 : o.wob;
  const brk = o.brk || 0;
  const brkF = o.brkF || 0.12;
  const undul = o.undul || 0;
  for (let k = 0; k <= n; k++) {
    const f = (k + 0.5) / (n + 1);
    const pts = [];
    for (let x = x0; x <= x1; x += step) {
      const yt = topFn(x);
      const yb = botFn(x);
      let y = lerp(yt, yb, f) + wav(x * 0.013 + seed, k * 0.41) * wob;
      if (undul) y += undul * f * (Math.sin(x * 0.011 + k * 0.05) * 0.6 + wav(x * 0.006, k * 0.03 + seed));
      let m = 1 + wav(x * 0.04 + k, seed + 2) * 0.18;
      if (brk && vn2(x * brkF + k * 7.3, k * 1.91 + seed) < brk) m = 0;
      pts.push([x, y, m]);
    }
    out.push(pts);
  }
  return out;
}

/** Paint a tone map for a region and engrave it into g. */
function engraveRegion(kit, g, bbox, pathFn, toneFn, passes, o = {}) {
  const x0 = Math.floor(bbox[0]);
  const y0 = Math.floor(bbox[1]);
  const w = Math.ceil(bbox[2] - x0);
  const h = Math.ceil(bbox[3] - y0);
  const tc = mkCanvas(kit, w, h);
  const t = tc.getContext('2d');
  t.translate(-x0, -y0);
  t.save();
  t.beginPath();
  pathFn(t);
  t.clip();
  t.fillStyle = '#fff';
  t.fillRect(x0, y0, w, h);
  toneFn(t);
  t.restore();
  const rd = toneReader(tc, x0, y0);
  if (o.paper !== false) {
    g.save();
    g.fillStyle = PAPER;
    g.beginPath();
    pathFn(g);
    g.fill();
    g.restore();
  }
  g.fillStyle = INK;
  for (const ps of passes) engrave(g, rd, ps.lines, ps);
  return rd;
}

function puff(t, x, y, r, d, a = 1, hard = 0.5) {
  const gr = t.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, grayA(d, a));
  gr.addColorStop(hard, grayA(d, a));
  gr.addColorStop(1, grayA(d, 0));
  t.fillStyle = gr;
  t.beginPath();
  t.arc(x, y, r, 0, TAU);
  t.fill();
}

function polyPath(t, pts, close = true) {
  t.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) t.lineTo(pts[i].x, pts[i].y);
  if (close) t.closePath();
}

/** Smooth closed path through points (quadratic through midpoints). */
function smoothClosed(t, pts) {
  const n = pts.length;
  const m0 = mid(pts[n - 1], pts[0]);
  t.moveTo(m0.x, m0.y);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    t.quadraticCurveTo(p.x, p.y, m.x, m.y);
  }
  t.closePath();
}

// ---------------------------------------------------------------------------
// SKY (baked strip, drifts slowly right with the wind)
// ---------------------------------------------------------------------------
const SKY_W = 1190;
const SKY_H = 480;
const SKY_PAD = 175;

function cumulus(t, rng, x0, x1, baseY, topY, dark) {
  const pts = [];
  const n = Math.max(4, Math.round((x1 - x0) / 30));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const hump = Math.pow(Math.sin(Math.PI * u), 0.75);
    const r = (22 + 36 * rng()) * (0.5 + 0.75 * hump);
    const x = x0 + (x1 - x0) * u + (rng() - 0.5) * 22;
    const y = baseY - r * 0.55 - Math.max(0, baseY - topY - r * 1.3) * hump * (0.55 + 0.45 * rng());
    pts.push({ x, y, r });
    if (hump > 0.45 && rng() < 0.75) pts.push({ x: x + (rng() - 0.5) * 36, y: y - r * 0.62, r: r * (0.55 + 0.25 * rng()) });
  }
  for (const p of pts) puff(t, p.x + p.r * 0.2, p.y + p.r * 0.26, p.r * 1.1, dark, 0.95, 0.45);
  for (const p of pts) puff(t, p.x - p.r * 0.24, p.y - p.r * 0.3, p.r * 0.8, 0.02, 0.92, 0.42);
  // flat shaded base
  const cx = (x0 + x1) / 2;
  t.save();
  t.translate(cx, baseY - 6);
  t.scale((x1 - x0) / 2 / 30, 1);
  puff(t, 0, 0, 30, dark + 0.12, 0.7, 0.3);
  t.restore();
  return pts;
}

function getSky(kit) {
  return kit.bake('quix_sky_v2', SKY_W, SKY_H, (g, rng, w, h) => {
    g.fillStyle = PAPER;
    g.fillRect(0, 0, w, h);
    const tc = mkCanvas(kit, w, h);
    const t = tc.getContext('2d');
    const gr = t.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, gray(0.66));
    gr.addColorStop(0.3, gray(0.48));
    gr.addColorStop(0.62, gray(0.26));
    gr.addColorStop(0.86, gray(0.12));
    gr.addColorStop(1, gray(0.08));
    t.fillStyle = gr;
    t.fillRect(0, 0, w, h);
    // light breaking through at upper left
    puff(t, 300, 150, 330, 0.06, 0.7, 0.15);
    puff(t, 250, 110, 160, 0.02, 0.6, 0.2);
    // streaks of high cirrus
    for (let i = 0; i < 7; i++) {
      const y = 60 + i * 26 + rng() * 12;
      const x = 40 + rng() * 500;
      t.save();
      t.translate(x, y);
      t.scale(5 + rng() * 4, 0.5);
      puff(t, 0, 0, 22, 0.05, 0.5, 0.2);
      t.restore();
    }
    // storm cumulus that towers behind the mill
    cumulus(t, rng, 600, 1190, 340, 70, 0.74);
    cumulus(t, rng, 760, 1100, 250, 120, 0.8);
    // mid cumulus on the left
    cumulus(t, rng, 30, 360, 330, 210, 0.6);
    cumulus(t, rng, 300, 560, 238, 168, 0.55);
    // low banks along the horizon
    cumulus(t, rng, 0, 420, 420, 372, 0.38);
    cumulus(t, rng, 380, 900, 430, 386, 0.42);
    // the dark body of the storm, right behind the mill (so the whitewash glows)
    t.save();
    t.translate(930, 300);
    t.scale(3.4, 1);
    puff(t, 0, 0, 92, 0.8, 0.85, 0.35);
    t.restore();
    t.save();
    t.translate(980, 190);
    t.scale(2.4, 1);
    puff(t, 0, 0, 70, 0.72, 0.6, 0.3);
    t.restore();
    // a dark ragged scud near the top
    for (let i = 0; i < 12; i++) {
      const x = 420 + i * 60 + rng() * 30;
      const y = 36 + rng() * 34;
      puff(t, x, y, 30 + rng() * 24, 0.78, 0.5, 0.3);
    }
    const rd = toneReader(tc, 0, 0);
    g.fillStyle = INK;
    engrave(g, rd, linesParallel(0, 0, w, h, 0, 3.1, { wob: 0.35, seed: 3, step: 3 }), { sp: 3.1, d0: 0.04, gam: 1.0, max: 0.86 });
    engrave(g, rd, linesParallel(0, 0, w, h, 22, 3.5, { wob: 0.5, seed: 7, step: 3 }), { sp: 3.5, d0: 0.52, gam: 1.15, max: 0.7 });
    engrave(g, rd, linesParallel(0, 0, w, h, -34, 4.0, { wob: 0.5, seed: 11, step: 3 }), { sp: 4.0, d0: 0.74, gam: 1.3, max: 0.55 });
  });
}

// ---------------------------------------------------------------------------
// LAND (baked, transparent above the skyline)
// ---------------------------------------------------------------------------
const FAR_MILLS = [
  { x: 52, s: 1.0 },
  { x: 96, s: 0.9 },
  { x: 202, s: 0.82 },
  { x: 244, s: 0.78 },
  { x: 352, s: 0.68 },
  { x: 396, s: 0.64 },
  { x: 466, s: 0.56 },
  { x: 536, s: 0.5 },
];
function farMillGeom(m) {
  const base = ridgeY(m.x) + 2;
  const h = 38 * m.s;
  const r = 9 * m.s;
  return { x: m.x, base, top: base - h, r, hub: { x: m.x - 3 * m.s, y: base - h - 3 * m.s }, R: 30 * m.s };
}

function paintFar(kit, g, rng) {
  // far ridge + plain (behind the hill)
  const path = (t) => {
    t.moveTo(IMG.x0, ridgeY(IMG.x0));
    for (let x = IMG.x0; x <= IMG.x1; x += 4) t.lineTo(x, ridgeY(x));
    t.lineTo(IMG.x1, 500);
    t.lineTo(IMG.x0, 500);
    t.closePath();
  };
  engraveRegion(
    kit,
    g,
    [IMG.x0, 380, IMG.x1, 500],
    path,
    (t) => {
      // aerial perspective: pale ridge, patterned fields below
      const gr = t.createLinearGradient(0, 400, 0, 600);
      gr.addColorStop(0, gray(0.34));
      gr.addColorStop(0.25, gray(0.26));
      gr.addColorStop(1, gray(0.18));
      t.fillStyle = gr;
      t.fillRect(0, 380, S, 320);
      // soft folds of the distant sierra
      for (let i = 0; i < 18; i++) {
        const x = 40 + rng() * 920;
        t.save();
        t.translate(x, ridgeY(x) + 12);
        t.scale(3, 1);
        puff(t, 0, 0, 10 + rng() * 10, 0.45, 0.35, 0.2);
        t.restore();
      }
      // ridge shading: darker on the right flanks of the bumps
      for (let x = 40; x < 980; x += 14) {
        const sl = ridgeY(x + 6) - ridgeY(x - 6);
        if (sl > 0.4) {
          t.fillStyle = grayA(0.5, 0.25);
          t.fillRect(x - 7, ridgeY(x), 14, 18);
        }
      }
    },
    [{ lines: linesParallel(IMG.x0, 380, IMG.x1, 500, 0, 2.5, { wob: 0.3, seed: 21 }), sp: 2.5, d0: 0.05, max: 0.8 }],
  );
  // distant towers (cap + white tower) — the sails turn per frame
  g.save();
  for (const m of FAR_MILLS) {
    const f = farMillGeom(m);
    g.fillStyle = PAPER;
    g.beginPath();
    g.moveTo(f.x - f.r * 0.9, f.top);
    g.lineTo(f.x - f.r, f.base);
    g.lineTo(f.x + f.r, f.base);
    g.lineTo(f.x + f.r * 0.9, f.top);
    g.closePath();
    g.fill();
    // right-side shading of the tower
    g.strokeStyle = ink(0.85);
    g.lineWidth = 0.6;
    g.beginPath();
    for (let k = 0; k < 4; k++) {
      const xx = f.x + f.r * (0.25 + k * 0.22);
      g.moveTo(xx, f.top + 2);
      g.lineTo(xx + 0.4, f.base);
    }
    g.stroke();
    g.lineWidth = 0.7;
    g.strokeStyle = ink(0.9);
    g.beginPath();
    g.moveTo(f.x + f.r * 0.9, f.top);
    g.lineTo(f.x + f.r, f.base);
    g.stroke();
    // cap
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(f.x - f.r * 1.08, f.top + 1);
    g.lineTo(f.x + 0.5, f.top - f.r * 1.0);
    g.lineTo(f.x + f.r * 1.08, f.top + 1);
    g.closePath();
    g.fill();
    // door
    g.fillRect(f.x - 1.2 * m.s, f.base - 7 * m.s, 2.6 * m.s, 7 * m.s);
  }
  g.restore();
}

function hillTop(x) {
  return crestY(x);
}
function hillBot() {
  return 690;
}

function paintHill(kit, g, rng) {
  const path = (t) => {
    t.moveTo(IMG.x0 - 2, hillTop(IMG.x0));
    for (let x = IMG.x0; x <= IMG.x1 + 2; x += 3) t.lineTo(x, hillTop(x));
    t.lineTo(IMG.x1 + 2, 694);
    t.lineTo(IMG.x0 - 2, 694);
    t.closePath();
  };
  // scrub (retama, thyme) in clusters, rocky ledges, a few boulders
  const shrubs = [];
  const clusters = [
    [70, 560, 5],
    [300, 640, 6],
    [520, 560, 4],
    [610, 660, 5],
    [900, 590, 6],
    [430, 520, 3],
    [180, 650, 4],
    [800, 520, 3],
  ];
  for (const [cx, cy, n] of clusters) {
    for (let i = 0; i < n; i++) {
      const x = cx + (rng() - 0.5) * 90;
      const y = clamp(cy + (rng() - 0.5) * 36, hillTop(x) + 22, 682);
      shrubs.push({ x, y, r: (5 + rng() * 10) * (0.7 + (y - 480) / 260) });
    }
  }
  const ledges = [];
  for (let i = 0; i < 7; i++) {
    const x = 60 + rng() * 860;
    const y = lerp(hillTop(x) + 40, 668, rng());
    ledges.push({ x, y, w: 60 + rng() * 110, h: 5 + rng() * 6, tilt: (rng() - 0.5) * 0.12 });
  }
  const rocks = [];
  for (let i = 0; i < 9; i++) {
    const x = 60 + rng() * 880;
    const y = lerp(hillTop(x) + 34, 672, rng());
    const r = 6 + rng() * 11;
    const pts = [];
    const nv = 7;
    for (let k = 0; k < nv; k++) {
      const a = Math.PI + (k / (nv - 1)) * Math.PI;
      const rr = r * (0.75 + rng() * 0.4);
      pts.push(P(x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 0.75));
    }
    rocks.push({ x, y, r, pts });
  }
  const pathPts = [];
  for (let k = 0; k <= 40; k++) {
    const u = k / 40;
    const x = lerp(30, 196, u) + 26 * Math.sin(u * 4.4 + 0.3);
    const y = lerp(694, hillTop(196) + 3, Math.pow(u, 0.85));
    pathPts.push({ x, y, w: lerp(22, 6, u) * (0.85 + 0.3 * vn2(u * 9, 4)) });
  }
  engraveRegion(
    kit,
    g,
    [IMG.x0 - 2, 440, IMG.x1 + 2, 696],
    path,
    (t) => {
      // base: broad, undulating patches of light and shade
      for (let y = 470; y < 696; y += 3) {
        for (let x = 26; x < 976; x += 3) {
          const top = hillTop(x);
          if (y < top - 3) continue;
          const depth = clamp((y - top) / (694 - top), 0, 1);
          let d = 0.34 + 0.2 * depth + (fbm(x * 0.0055, y * 0.011) - 0.5) * 0.62 + (vn2(x * 0.05, y * 0.08) - 0.5) * 0.08;
          d -= 0.26 * Math.exp(-(y - top) / 9); // sunlit lip of the crest
          d += 0.14 * Math.exp(-(((x - 300) / 220) ** 2)) * depth; // shadowed hollow
          t.fillStyle = gray(d);
          t.fillRect(x, y, 3, 3);
        }
      }
      // rocky ledges: lit upper edge, deep shadow beneath
      for (const L of ledges) {
        t.save();
        t.translate(L.x, L.y);
        t.rotate(L.tilt);
        const gr = t.createLinearGradient(0, -L.h, 0, L.h * 2.2);
        gr.addColorStop(0, grayA(0.2, 0));
        gr.addColorStop(0.3, grayA(0.18, 0.5));
        gr.addColorStop(0.45, grayA(0.8, 0.8));
        gr.addColorStop(1, grayA(0.6, 0));
        t.fillStyle = gr;
        t.beginPath();
        t.ellipse(0, L.h * 0.5, L.w / 2, L.h * 1.7, 0, 0, TAU);
        t.fill();
        t.restore();
      }
      // shadow cast by the mill tower (light from the upper left)
      t.save();
      t.translate(TX + 118, TB + 8);
      t.scale(4.2, 0.55);
      puff(t, 0, 0, 30, 0.88, 0.9, 0.55);
      t.restore();
      // scrub: dark clumps with a lit upper-left
      for (const s of shrubs) {
        for (let j = 0; j < 3; j++) {
          const ox = (h1(s.x + j) - 0.5) * s.r;
          const oy = (h1(s.y + j * 3) - 0.5) * s.r * 0.5;
          puff(t, s.x + ox, s.y + oy, s.r * (0.8 + 0.3 * h1(j + s.x)), 0.96, 1, 0.7);
        }
        puff(t, s.x - s.r * 0.4, s.y - s.r * 0.45, s.r * 0.5, 0.5, 0.7, 0.3);
      }
      // boulders: lit top facet, dark front, cast shadow
      for (const r of rocks) {
        t.fillStyle = gray(0.9);
        t.beginPath();
        t.ellipse(r.x + r.r * 0.5, r.y + r.r * 0.25, r.r * 1.5, r.r * 0.45, 0, 0, TAU);
        t.fill();
        t.fillStyle = gray(0.72);
        t.beginPath();
        polyPath(t, r.pts);
        t.fill();
        t.fillStyle = gray(0.14);
        t.beginPath();
        t.moveTo(r.pts[0].x, r.pts[0].y);
        for (let k = 1; k < r.pts.length; k++) t.lineTo(r.pts[k].x, r.pts[k].y - 0.5);
        t.lineTo(r.x + r.r * 0.6, r.y - r.r * 0.1);
        t.lineTo(r.x - r.r * 0.8, r.y);
        t.closePath();
        t.fill();
      }
    },
    [
      { lines: linesRows(IMG.x0 - 2, IMG.x1 + 2, (x) => hillTop(x) - 1, () => 694, 3.0, { seed: 5, wob: 0.7, brk: 0.13, brkF: 0.08, undul: 5 }), sp: 3.0, d0: 0.05, max: 0.92 },
      { lines: linesParallel(IMG.x0, 440, IMG.x1, 696, 30, 3.3, { seed: 8, step: 3 }), sp: 3.3, d0: 0.56, gam: 1.15, max: 0.82 },
      { lines: linesParallel(IMG.x0, 440, IMG.x1, 696, -50, 3.7, { seed: 9, step: 3 }), sp: 3.7, d0: 0.8, gam: 1.15, max: 0.65 },
    ],
  );
  // white-line flecks in the scrub (the engraver's graver cuts)
  g.save();
  g.lineCap = 'round';
  for (const s of shrubs) {
    g.strokeStyle = paperA(0.8);
    g.lineWidth = 0.75;
    const n = Math.round(s.r * 1.1);
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const a = -2.5 + rng() * 1.6;
      const rr = s.r * (0.25 + rng() * 0.8);
      const x = s.x + Math.cos(a) * rr;
      const y = s.y + Math.sin(a) * rr * 0.7;
      g.moveTo(x, y);
      g.lineTo(x + 1.5 + rng() * 2.5, y - 1.5 - rng() * 2.5);
    }
    g.stroke();
    // twiggy silhouette on top
    g.strokeStyle = INK;
    g.lineWidth = 0.8;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const x = s.x + (rng() - 0.5) * s.r * 1.6;
      const y = s.y - s.r * 0.5 + rng() * 3;
      g.moveTo(x, y);
      g.lineTo(x + (rng() - 0.5) * 4, y - 3 - rng() * s.r * 0.5);
    }
    g.stroke();
  }
  // boulder and ledge contours (only the shadowed edges, as an engraver would)
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  for (const r of rocks) {
    g.beginPath();
    g.moveTo(r.pts[r.pts.length - 1].x, r.pts[r.pts.length - 1].y);
    g.lineTo(r.pts[0].x, r.pts[0].y);
    g.stroke();
    g.beginPath();
    for (let k = 3; k < r.pts.length; k++) {
      if (k === 3) g.moveTo(r.pts[k].x, r.pts[k].y);
      else g.lineTo(r.pts[k].x, r.pts[k].y);
    }
    g.stroke();
  }
  // grass, stubble and pebbles: denser and larger towards the road
  g.strokeStyle = INK;
  g.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = IMG.x0 + rng() * (IMG.x1 - IMG.x0);
    const top = hillTop(x);
    const u = Math.pow(rng(), 0.7);
    const y = lerp(top + 6, 692, u);
    const sz = 1.5 + u * 5 + rng() * 2;
    if (fbm(x * 0.01, y * 0.02) < 0.38) continue;
    g.lineWidth = 0.5 + u * 0.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 1 + rng() * 0.8, y - sz);
    g.moveTo(x + 1.5, y);
    g.lineTo(x + 2.5 + rng() * 1.5, y - sz * 0.8);
    g.stroke();
  }
  for (let i = 0; i < 70; i++) {
    const x = IMG.x0 + rng() * (IMG.x1 - IMG.x0);
    const y = lerp(hillTop(x) + 10, 688, rng());
    const r = 1.2 + rng() * 2.5;
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(x + 0.6, y + 0.8, r * 1.3, r * 0.7, 0, 0, TAU);
    g.fill();
    g.fillStyle = PAPER;
    g.beginPath();
    g.ellipse(x - 0.3, y - 0.2, r, r * 0.55, 0, 0, TAU);
    g.fill();
  }
  // grass tufts along the crest silhouette
  g.lineWidth = 0.8;
  g.beginPath();
  for (let x = IMG.x0; x < IMG.x1; x += 3 + rng() * 5) {
    if (Math.abs(x - TX) < TR0 + 4) continue;
    const y = hillTop(x) + 1;
    const hgt = 2 + rng() * 6;
    g.moveTo(x, y);
    g.lineTo(x + (rng() - 0.3) * 3, y - hgt);
  }
  g.stroke();
  g.restore();
}

// --- the tower mill --------------------------------------------------------
function towerPath(t) {
  const rt = towerR(TT);
  const rb = towerR(TB);
  t.moveTo(TX - rt, TT);
  t.lineTo(TX - rb, TB);
  for (let k = 0; k <= 24; k++) {
    const ph = -Math.PI / 2 + (k / 24) * Math.PI;
    t.lineTo(TX + rb * Math.sin(ph), TB + ringSag(TB) * Math.cos(ph) + 2);
  }
  t.lineTo(TX + rt, TT);
  for (let k = 24; k >= 0; k--) {
    const ph = -Math.PI / 2 + (k / 24) * Math.PI;
    t.lineTo(TX + rt * Math.sin(ph), TT + ringSag(TT) * Math.cos(ph));
  }
  t.closePath();
}

const LIGHT_PH = -0.85; // light comes from the left of the cylinder axis
function cylDark(x, y, base = 0.04, span = 0.72) {
  const r = towerR(clamp(y, TT, TB));
  const u = clamp((x - TX) / r, -0.999, 0.999);
  const ph = Math.asin(u);
  const lit = Math.max(0, Math.cos(ph - LIGHT_PH));
  return base + span * (1 - lit);
}

const WINDOWS = [
  { ph: -0.95, y: 300, w: 9, h: 13 },
  { ph: 0.05, y: 296, w: 10, h: 14 },
  { ph: 0.98, y: 303, w: 9, h: 13 },
  { ph: 0.42, y: 372, w: 9, h: 12 },
];
const DOOR = { ph: -0.2, w: 30, h: 50 };

function paintTailPole(g) {
  // palo de gobierno: long beam from the cap's back down to a stone post
  const a = P(TX + 44, CAP.rim - 22);
  const b = P(TX + 170, crestY(TX + 170) - 4);
  const strut1 = P(TX + 20, CAP.rim - 4);
  const strutM = mid(a, b, 0.36);
  g.save();
  g.lineCap = 'round';
  // braces (tornapuntas)
  g.strokeStyle = INK;
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(strut1.x, strut1.y);
  g.lineTo(strutM.x, strutM.y);
  g.moveTo(TX + 58, CAP.rim - 2);
  g.lineTo(strutM.x + 2, strutM.y + 4);
  g.stroke();
  // the beam: dark underside, lit top edge
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  const nx = -dy / L;
  const ny = dx / L;
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(a.x + nx * 4.5, a.y + ny * 4.5);
  g.lineTo(b.x + nx * 3, b.y + ny * 3);
  g.lineTo(b.x - nx * 3, b.y - ny * 3);
  g.lineTo(a.x - nx * 4.5, a.y - ny * 4.5);
  g.closePath();
  g.fill();
  g.strokeStyle = PAPER;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(a.x - nx * 2.6, a.y - ny * 2.6);
  g.lineTo(b.x - nx * 1.6, b.y - ny * 1.6);
  g.stroke();
  // cross handle near the foot
  const hnd = mid(a, b, 0.86);
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(hnd.x - 12, hnd.y + 5);
  g.lineTo(hnd.x + 12, hnd.y - 3);
  g.stroke();
  // rope to the post
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(b.x, b.y);
  g.quadraticCurveTo(b.x + 8, b.y + 8, b.x + 16, b.y + 4);
  g.stroke();
  g.restore();
  return b;
}

function paintStonePost(g, x, y, s = 1) {
  g.save();
  g.fillStyle = PAPER;
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(x - 4 * s, y);
  g.lineTo(x - 3.5 * s, y - 12 * s);
  g.quadraticCurveTo(x, y - 15 * s, x + 3.5 * s, y - 12 * s);
  g.lineTo(x + 4 * s, y);
  g.closePath();
  g.fill();
  g.stroke();
  g.lineWidth = 0.7;
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    g.moveTo(x + (0.6 + k * 0.9) * s, y - 11 * s);
    g.lineTo(x + (0.6 + k * 0.9) * s, y - 1);
  }
  g.stroke();
  g.restore();
}

function paintTower(kit, g, rng) {
  // whitewashed masonry: paper ground, then lines that follow the cylinder
  g.save();
  g.fillStyle = PAPER;
  g.beginPath();
  towerPath(g);
  g.fill();
  g.restore();
  const vLines = [];
  const nL = 78;
  for (let k = 0; k <= nL; k++) {
    const ph = -Math.PI / 2 + ((k + 0.5) / (nL + 1)) * Math.PI;
    const pts = [];
    for (let y = TT - 10; y <= TB + 4; y += 2) {
      const r = towerR(clamp(y, TT, TB));
      const x = TX + r * Math.sin(ph) + (vn2(y * 0.05, k * 0.7) - 0.5) * 0.5;
      pts.push([x, y, 1 + (vn2(y * 0.08, k) - 0.5) * 0.3]);
    }
    vLines.push(pts);
  }
  const hLines = [];
  for (let y0 = TT + 2; y0 <= TB; y0 += 3.3) {
    const pts = [];
    const r = towerR(y0);
    for (let k = 0; k <= 60; k++) {
      const ph = -Math.PI / 2 + (k / 60) * Math.PI;
      pts.push([TX + r * Math.sin(ph), y0 + ringSag(y0) * Math.cos(ph), 1]);
    }
    hLines.push(pts);
  }
  // re-read the tone we just painted (engraveRegion returned no lines yet)
  const tc = mkCanvas(kit, Math.ceil(TR0 * 2 + 8), Math.ceil(TB - TT + 22));
  const t = tc.getContext('2d');
  const ox = TX - TR0 - 4;
  const oy = TT - 14;
  t.translate(-ox, -oy);
  t.save();
  t.beginPath();
  towerPath(t);
  t.clip();
  for (let x = Math.floor(ox); x <= TX + TR0 + 4; x++) {
    for (let y = TT - 12; y < TB + 6; y += 6) {
      let d = cylDark(x, y + 3, 0.03, 0.8);
      d += 0.85 * clamp(1 - (y - (TT - 10)) / 40, 0, 1) * (0.7 + 0.3 * Math.sign(x - TX + 30));
      d += 0.25 * clamp((y - (TB - 40)) / 40, 0, 1);
      d += (fbm(x * 0.08, y * 0.05) - 0.5) * 0.18;
      t.fillStyle = gray(d);
      t.fillRect(x, y, 1, 6);
    }
  }
  t.restore();
  const rd = toneReader(tc, ox, oy);
  g.fillStyle = INK;
  engrave(g, rd, vLines, { sp: 3.0, d0: 0.08, gam: 1.15, max: 0.85, minW: 0.28 });
  engrave(g, rd, hLines, { sp: 3.3, d0: 0.5, gam: 1.2, max: 0.75 });

  // stone courses showing where the whitewash has flaked (lit side)
  g.save();
  g.strokeStyle = ink(0.75);
  g.lineWidth = 0.7;
  for (let i = 0; i < 9; i++) {
    const y = TT + 60 + rng() * (TB - TT - 80);
    const ph = -1.1 + rng() * 1.2;
    const r = towerR(y);
    const x = TX + r * Math.sin(ph);
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      g.moveTo(x - 6 + k * 5, y + k * 0.6);
      g.lineTo(x - 1 + k * 5, y + k * 0.6);
    }
    g.moveTo(x - 3, y - 3);
    g.lineTo(x - 3, y + 1);
    g.moveTo(x + 4, y + 1);
    g.lineTo(x + 4, y + 5);
    g.stroke();
  }
  g.restore();

  // shadow-side contour + base contour
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(TX + towerR(TT), TT);
  g.lineTo(TX + towerR(TB), TB);
  g.stroke();
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(TX - towerR(TT), TT);
  g.lineTo(TX - towerR(TB), TB);
  g.stroke();
  g.restore();

  // windows (ventanucos): black openings with a lit sill
  for (const wdw of WINDOWS) {
    const r = towerR(wdw.y);
    const cx = TX + r * Math.sin(wdw.ph);
    const ww = wdw.w * Math.cos(wdw.ph);
    const sag = ringSag(wdw.y) * Math.cos(wdw.ph);
    g.fillStyle = INK;
    g.fillRect(cx - ww / 2, wdw.y + sag - wdw.h / 2, ww, wdw.h);
    g.fillStyle = PAPER;
    g.fillRect(cx - ww / 2 - 1.5, wdw.y + sag + wdw.h / 2, ww + 3, 1.6);
    g.strokeStyle = paperA(0.5);
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(cx - ww / 2 + 1.2, wdw.y + sag - wdw.h / 2 + 1);
    g.lineTo(cx - ww / 2 + 1.2, wdw.y + sag + wdw.h / 2 - 1);
    g.stroke();
  }
  // the door with a heavy timber lintel and a stone step
  {
    const ph = DOOR.ph;
    const r = towerR(TB);
    const cx = TX + r * Math.sin(ph);
    const ww = DOOR.w * Math.cos(ph);
    const yb = TB + ringSag(TB) * Math.cos(ph);
    g.fillStyle = INK;
    g.fillRect(cx - ww / 2, yb - DOOR.h, ww, DOOR.h);
    // half-open plank door
    g.fillStyle = PAPER;
    g.beginPath();
    g.moveTo(cx - ww / 2, yb - DOOR.h + 1);
    g.lineTo(cx - ww / 2 + ww * 0.42, yb - DOOR.h + 4);
    g.lineTo(cx - ww / 2 + ww * 0.42, yb - 1);
    g.lineTo(cx - ww / 2, yb);
    g.closePath();
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.8;
    g.stroke();
    g.beginPath();
    for (let k = 1; k < 4; k++) {
      const xx = cx - ww / 2 + (ww * 0.42 * k) / 4;
      g.moveTo(xx, yb - DOOR.h + 1 + k);
      g.lineTo(xx, yb - 1);
    }
    g.stroke();
    // lintel
    g.fillStyle = INK;
    g.fillRect(cx - ww / 2 - 5, yb - DOOR.h - 6, ww + 10, 6);
    g.strokeStyle = PAPER;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(cx - ww / 2 - 4, yb - DOOR.h - 4.8);
    g.lineTo(cx + ww / 2 + 3, yb - DOOR.h - 4.8);
    g.stroke();
    // step
    g.fillStyle = PAPER;
    g.strokeStyle = INK;
    g.lineWidth = 0.9;
    g.beginPath();
    g.rect(cx - ww / 2 - 7, yb - 1, ww + 14, 5);
    g.fill();
    g.stroke();
  }
}

function capPath(t) {
  const sag = ringSag(TT) * (CAP.r / TR1);
  t.moveTo(TX - CAP.r, CAP.rim);
  t.lineTo(CAP.apex.x, CAP.apex.y);
  t.lineTo(TX + CAP.r, CAP.rim);
  for (let k = 24; k >= 0; k--) {
    const ph = -Math.PI / 2 + (k / 24) * Math.PI;
    t.lineTo(TX + CAP.r * Math.sin(ph), CAP.rim + 5 + sag * Math.cos(ph));
  }
  t.closePath();
}

function paintCap(kit, g, rng) {
  const sag = ringSag(TT) * (CAP.r / TR1);
  // boards radiating from the apex, shaded by the cone's orientation to the light
  const lines = [];
  const n = 54;
  for (let k = 0; k <= n; k++) {
    const ph = -Math.PI / 2 + ((k + 0.5) / (n + 1)) * Math.PI;
    const bx = TX + CAP.r * Math.sin(ph);
    const by = CAP.rim + 5 + sag * Math.cos(ph);
    const pts = [];
    for (let u = 0.04; u <= 1.0001; u += 0.025) {
      pts.push([lerp(CAP.apex.x, bx, u), lerp(CAP.apex.y, by, u), 0.6 + 0.4 * u]);
    }
    lines.push(pts);
  }
  engraveRegion(
    kit,
    g,
    [TX - CAP.r - 4, CAP.apex.y - 4, TX + CAP.r + 4, CAP.rim + 10],
    capPath,
    (t) => {
      for (let x = TX - CAP.r - 4; x <= TX + CAP.r + 4; x++) {
        const u = clamp((x - TX) / CAP.r, -1, 1);
        const ph = Math.asin(u);
        const lit = Math.max(0, Math.cos(ph - LIGHT_PH));
        t.fillStyle = gray(0.22 + 0.72 * (1 - lit) + (vn2(x * 0.3, 1) - 0.5) * 0.12);
        t.fillRect(x, CAP.apex.y - 4, 1, CAP.rim - CAP.apex.y + 14);
      }
    },
    [
      { lines, sp: 3.0, d0: 0.05, gam: 0.9, max: 0.92 },
      {
        lines: linesParallel(TX - CAP.r, CAP.apex.y, TX + CAP.r, CAP.rim + 10, 12, 3.2, { seed: 31 }),
        sp: 3.2,
        d0: 0.62,
        max: 0.7,
      },
    ],
  );
  // curb ring (dark band) along the rim, white cut along its top
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = 5;
  g.beginPath();
  for (let k = 0; k <= 30; k++) {
    const ph = -Math.PI / 2 + (k / 30) * Math.PI;
    const x = TX + (CAP.r + 0.5) * Math.sin(ph);
    const y = CAP.rim + 3 + sag * Math.cos(ph);
    if (k === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.strokeStyle = paperA(0.85);
  g.lineWidth = 0.8;
  g.beginPath();
  for (let k = 0; k <= 20; k++) {
    const ph = -Math.PI / 2 + (k / 20) * Math.PI * 0.62;
    const x = TX + (CAP.r - 1) * Math.sin(ph);
    const y = CAP.rim + 1 + sag * Math.cos(ph);
    if (k === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  // apex knob
  g.fillStyle = INK;
  g.beginPath();
  g.arc(CAP.apex.x, CAP.apex.y - 1, 3, 0, TAU);
  g.fill();
  // outline of the cone (lit side thinner)
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(TX - CAP.r, CAP.rim + 2);
  g.lineTo(CAP.apex.x, CAP.apex.y);
  g.stroke();
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(CAP.apex.x, CAP.apex.y);
  g.lineTo(TX + CAP.r, CAP.rim + 2);
  g.stroke();
  // windshaft: from the cap's front-left face out to the hub
  const s0 = P(TX - 40, CAP.rim - 22);
  const s1 = P(HUB.x + 2, HUB.y);
  const dx = s1.x - s0.x;
  const dy = s1.y - s0.y;
  const L = Math.hypot(dx, dy);
  const nx = -dy / L;
  const ny = dx / L;
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(s0.x + nx * 8, s0.y + ny * 8);
  g.lineTo(s1.x + nx * 7, s1.y + ny * 7);
  g.lineTo(s1.x - nx * 7, s1.y - ny * 7);
  g.lineTo(s0.x - nx * 8, s0.y - ny * 8);
  g.closePath();
  g.fill();
  g.strokeStyle = PAPER;
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const off = -5 + k * 1.3;
    g.moveTo(s0.x + nx * off, s0.y + ny * off);
    g.lineTo(s1.x + nx * off, s1.y + ny * off);
    g.lineWidth = 1.1 - k * 0.15;
  }
  g.stroke();
  // iron bands
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  for (const u of [0.35, 0.7]) {
    const q = mid(s0, s1, u);
    g.moveTo(q.x + nx * 8.5, q.y + ny * 8.5);
    g.lineTo(q.x - nx * 8.5, q.y - ny * 8.5);
  }
  g.stroke();
  g.restore();
  void rng;
}

function paintRoadAndFore(kit, g, rng) {
  // the cart track (road at y = 700, edge to edge)
  const roadTop = (x) => 688 + 1.5 * Math.sin(x * 0.012 + 1);
  const roadBot = (x) => 716 + 2 * Math.sin(x * 0.009 + 2.2);
  engraveRegion(
    kit,
    g,
    [0, 680, S, 724],
    (t) => {
      t.moveTo(0, roadTop(0));
      for (let x = 0; x <= S; x += 5) t.lineTo(x, roadTop(x));
      for (let x = S; x >= 0; x -= 5) t.lineTo(x, roadBot(x));
      t.closePath();
    },
    (t) => {
      t.fillStyle = gray(0.12);
      t.fillRect(0, 680, S, 44);
      // wheel ruts
      t.fillStyle = gray(0.5);
      t.fillRect(0, 696, S, 2);
      t.fillRect(0, 708, S, 2.4);
      t.fillStyle = gray(0.3);
      t.fillRect(0, 689, S, 2);
      for (let i = 0; i < 70; i++) {
        const x = rng() * S;
        const y = 690 + rng() * 24;
        puff(t, x, y, 2 + rng() * 4, 0.55, 0.8, 0.5);
      }
    },
    [{ lines: linesParallel(0, 680, S, 724, 0, 2.6, { wob: 0.25, seed: 41 }), sp: 2.6, d0: 0.06, max: 0.85 }],
  );
  // foreground bank below the road: dark, rocky, thistles
  const foreTop = roadBot;
  const mkRock = (x, y, r, seed) => {
    // angular boulder: top facet (lit) + front face (shade)
    const top = [];
    const nv = 9;
    for (let k = 0; k < nv; k++) {
      const a = Math.PI + (k / (nv - 1)) * Math.PI;
      const rr = r * (0.78 + 0.35 * h1(seed + k * 1.7));
      top.push(P(x + Math.cos(a) * rr * 1.35, y + Math.sin(a) * rr * 0.8));
    }
    const ridge = [];
    for (let k = 0; k < 5; k++) {
      const u = k / 4;
      ridge.push(P(lerp(top[0].x, top[nv - 1].x, u) + (h1(seed + k * 3) - 0.5) * r * 0.3, y - r * 0.18 + Math.sin(u * Math.PI) * r * 0.1 + (h1(seed + k * 5) - 0.5) * r * 0.16));
    }
    const base = [P(top[nv - 1].x + r * 0.1, y + r * 0.5), P(x + r * 0.4, y + r * 0.62), P(x - r * 0.6, y + r * 0.6), P(top[0].x - r * 0.05, y + r * 0.45)];
    return { x, y, r, top, ridge, base };
  };
  const fRocks = [mkRock(118, 792, 50, 3), mkRock(865, 806, 60, 9), mkRock(486, 842, 28, 15), mkRock(330, 778, 18, 21), mkRock(690, 790, 15, 27)];
  engraveRegion(
    kit,
    g,
    [0, 700, S, IMG.y1 + 4],
    (t) => {
      t.moveTo(0, foreTop(0));
      for (let x = 0; x <= S; x += 5) t.lineTo(x, foreTop(x));
      t.lineTo(S, IMG.y1 + 4);
      t.lineTo(0, IMG.y1 + 4);
      t.closePath();
    },
    (t) => {
      const gr = t.createLinearGradient(0, 714, 0, 880);
      gr.addColorStop(0, gray(0.5));
      gr.addColorStop(0.3, gray(0.66));
      gr.addColorStop(1, gray(0.94));
      t.fillStyle = gr;
      t.fillRect(0, 700, S, 190);
      for (let i = 0; i < 30; i++) {
        const x = rng() * S;
        const y = 730 + rng() * 140;
        t.save();
        t.translate(x, y);
        t.scale(2.6, 1);
        puff(t, 0, 0, 10 + rng() * 18, rng() < 0.5 ? 0.3 : 0.92, 0.5, 0.3);
        t.restore();
      }
      for (const r of fRocks) {
        // cast shadow
        t.fillStyle = gray(0.96);
        t.beginPath();
        t.ellipse(r.x + r.r * 0.5, r.y + r.r * 0.55, r.r * 1.6, r.r * 0.42, 0, 0, TAU);
        t.fill();
        // whole mass in shade
        const gf = t.createLinearGradient(r.x - r.r, r.y, r.x + r.r * 1.2, r.y + r.r * 0.6);
        gf.addColorStop(0, gray(0.5));
        gf.addColorStop(1, gray(0.93));
        t.fillStyle = gf;
        t.beginPath();
        polyPath(t, r.top.concat(r.base));
        t.fill();
        // lit top facet
        const gt = t.createLinearGradient(r.x - r.r, r.y - r.r, r.x + r.r, r.y);
        gt.addColorStop(0, gray(0.2));
        gt.addColorStop(1, gray(0.42));
        t.fillStyle = gt;
        t.beginPath();
        polyPath(t, r.top.concat(r.ridge.slice().reverse()));
        t.fill();
        // cracks
        t.strokeStyle = gray(0.95);
        t.lineWidth = 2;
        t.beginPath();
        t.moveTo(r.ridge[2].x, r.ridge[2].y);
        t.lineTo(r.ridge[2].x + r.r * 0.15, r.y + r.r * 0.5);
        t.stroke();
      }
    },
    [
      { lines: linesRows(0, S, (x) => foreTop(x) - 1, () => IMG.y1 + 6, 3.2, { seed: 51, wob: 0.8, brk: 0.08, brkF: 0.1, undul: 4 }), sp: 3.2, d0: 0.05, max: 0.92 },
      { lines: linesParallel(0, 700, S, IMG.y1 + 4, 28, 3.4, { seed: 52, step: 3 }), sp: 3.4, d0: 0.5, gam: 1.1, max: 0.85 },
      { lines: linesParallel(0, 700, S, IMG.y1 + 4, -40, 3.8, { seed: 53, step: 3 }), sp: 3.8, d0: 0.78, gam: 1.1, max: 0.7 },
    ],
  );
  // rock contours
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  for (const r of fRocks) {
    g.lineWidth = 1.2;
    g.beginPath();
    polyPath(g, r.top, false);
    g.stroke();
    g.lineWidth = 0.9;
    g.beginPath();
    polyPath(g, r.ridge, false);
    g.stroke();
  }
  // grass blades & thistles (cardos) in solid black with white cuts
  const blade = (x, y, h, lean) => {
    g.beginPath();
    g.moveTo(x - 1.6, y);
    g.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h);
    g.quadraticCurveTo(x + lean * 0.3 + 1, y - h * 0.5, x + 1.6, y);
    g.closePath();
    g.fill();
  };
  g.fillStyle = INK;
  // tufts along the lower verge of the road (clustered, not a fence)
  for (let x = 0; x < S; x += 14 + rng() * 26) {
    const n = 2 + Math.floor(rng() * 5);
    for (let k = 0; k < n; k++) {
      const xx = x + (rng() - 0.5) * 12;
      blade(xx, foreTop(xx) + 3 + rng() * 3, 4 + rng() * 11, (rng() - 0.4) * 9);
    }
  }
  // repoussoir: big dark clumps of grass, dock leaves and thistles in the corners
  const thistle = (hx, hy, baseY, s, lean) => {
    g.strokeStyle = INK;
    g.lineWidth = 1.8 * s;
    g.beginPath();
    g.moveTo(hx, hy + 6 * s);
    g.quadraticCurveTo(hx - 4 * s + lean, (hy + baseY) / 2, hx + lean * 0.4, baseY);
    g.stroke();
    // spiny stem leaves
    g.fillStyle = INK;
    for (let j = 0; j < 3; j++) {
      const ly = lerp(hy + 14 * s, baseY - 8, j / 3 + 0.15);
      const sgn = j % 2 ? 1 : -1;
      g.beginPath();
      g.moveTo(hx + lean * 0.2, ly);
      g.quadraticCurveTo(hx + sgn * 10 * s, ly - 8 * s, hx + sgn * 18 * s, ly - 3 * s);
      g.lineTo(hx + sgn * 12 * s, ly - 1 * s);
      g.lineTo(hx + sgn * 14 * s, ly + 3 * s);
      g.quadraticCurveTo(hx + sgn * 6 * s, ly + 2 * s, hx + lean * 0.2, ly + 3 * s);
      g.closePath();
      g.fill();
    }
    // head: bract cup + spiky crown
    g.beginPath();
    g.ellipse(hx, hy + 5 * s, 5.5 * s, 6.5 * s, 0, 0, TAU);
    g.fill();
    g.lineWidth = 1.1 * s;
    g.beginPath();
    for (let j = 0; j < 11; j++) {
      const a = -Math.PI / 2 + (j - 5) * 0.2;
      g.moveTo(hx, hy + 1 * s);
      g.lineTo(hx + Math.cos(a) * 12 * s, hy + Math.sin(a) * 12 * s);
    }
    g.stroke();
    g.strokeStyle = paperA(0.85);
    g.lineWidth = 0.7;
    g.beginPath();
    for (let j = 0; j < 3; j++) {
      g.moveTo(hx - 3 * s + j * 2.5 * s, hy + 2 * s);
      g.lineTo(hx - 2.5 * s + j * 2.5 * s, hy + 9 * s);
    }
    g.stroke();
  };
  const dock = (x, y, len, ang) => {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.4, -len * 0.2, len, 0);
    g.quadraticCurveTo(len * 0.4, len * 0.22, 0, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = paperA(0.75);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(len * 0.05, 0);
    g.lineTo(len * 0.9, 0);
    for (let k = 1; k < 5; k++) {
      g.moveTo(len * k * 0.18, 0);
      g.lineTo(len * (k * 0.18 + 0.1), -len * 0.09);
    }
    g.stroke();
    g.restore();
  };
  for (const [cx, w, s, side] of [
    [70, 110, 1.6, 1],
    [930, 120, 1.7, -1],
  ]) {
    for (let k = 0; k < 7; k++) dock(cx + (rng() - 0.5) * w * 0.6, IMG.y1 - 4 - rng() * 30, (40 + rng() * 40) * (s / 1.6), -Math.PI / 2 + side * (0.5 + rng() * 0.9));
    for (let k = 0; k < 46; k++) {
      const x = cx + (rng() - 0.5) * w * 1.6;
      blade(x, IMG.y1 + 4, (30 + rng() * 70) * s * (1 - Math.abs(x - cx) / (w * 1.2)), (rng() - 0.5 + side * 0.15) * 30 * s);
    }
    for (let k = 0; k < 3; k++) {
      const hx = cx + side * (-20 + k * 26) + (rng() - 0.5) * 10;
      thistle(hx, IMG.y1 - (100 + rng() * 40) * (s / 1.6), IMG.y1 + 2, s * 0.8, side * (rng() * 8));
    }
  }
  for (const [x, y, s] of [
    [330, 878, 0.9],
    [600, 878, 0.8],
  ]) {
    for (let k = 0; k < 12; k++) blade(x + (rng() - 0.5) * 40 * s, y, (20 + rng() * 34) * s, (rng() - 0.45) * 22 * s);
  }
  g.restore();
}

function getLand(kit) {
  return kit.bake('quix_land_v3', S, S, (g, rng) => {
    paintFar(kit, g, rng);
    paintHill(kit, g, rng);
    // stone posts around the mill (to tie the tail pole)
    for (const [dx, dy, s] of [
      [-168, 6, 0.9],
      [-112, 14, 1.0],
      [118, 10, 1.0],
      [212, -4, 0.8],
    ]) {
      paintStonePost(g, TX + dx, crestY(TX + dx) + dy, s);
    }
    // rubble mound around the foot
    g.save();
    g.fillStyle = INK;
    for (let i = 0; i < 26; i++) {
      const x = TX - TR0 - 16 + rng() * (TR0 * 2 + 40);
      const y = TB + 1 + rng() * 6;
      g.beginPath();
      g.ellipse(x, y, 2 + rng() * 4, 1.2 + rng() * 1.6, 0, 0, TAU);
      g.fill();
    }
    g.restore();
    const postFoot = paintTailPole(g);
    paintStonePost(g, postFoot.x + 14, postFoot.y + 6, 1.05);
    paintTower(kit, g, rng);
    paintCap(kit, g, rng);
    paintRoadAndFore(kit, g, rng);
    kit.addGrain(g, S, S, rng, 0.03);
  });
}

// ---------------------------------------------------------------------------
// PLATE: paper margins, ruled border, caption (drawn over the picture)
// ---------------------------------------------------------------------------
function getPlate(kit) {
  return kit.bake('quix_plate_v1', S, S, (g, rng) => {
    g.fillStyle = PAPER;
    g.beginPath();
    g.rect(0, 0, S, S);
    g.rect(IMG.x0, IMG.y0, IMG.x1 - IMG.x0, IMG.y1 - IMG.y0);
    g.fill('evenodd');
    // foxing on the margin
    g.save();
    g.beginPath();
    g.rect(0, IMG.y1, S, S - IMG.y1);
    g.clip();
    kit.addBlotches(g, S, S, rng, 'rgba(150,110,60,0.05)', 16, 20, 90);
    g.restore();
    // ruled border: heavy outer rule + hairline
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.strokeRect(IMG.x0, IMG.y0, IMG.x1 - IMG.x0, IMG.y1 - IMG.y0);
    g.lineWidth = 0.7;
    g.strokeRect(IMG.x0 - 4, IMG.y0 - 4, IMG.x1 - IMG.x0 + 8, IMG.y1 - IMG.y0 + 8);
    // caption
    g.fillStyle = INK;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    const F = kit.FONT.engraving;
    g.font = `400 14px ${F}`;
    if ('letterSpacing' in g) g.letterSpacing = '2.5px';
    g.fillText('PARTE PRIMERA. — CAPÍTULO VIII.', S / 2, IMG.y1 + 30);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.font = `italic 400 21px ${F}`;
    g.fillText('—Non fuyades, cobardes y viles criaturas, que un solo caballero es el que os acomete.', S / 2, IMG.y1 + 62);
    // small plate marks
    g.font = `italic 400 12px ${F}`;
    g.textAlign = 'left';
    g.fillText('Lám. IV.', IMG.x0, IMG.y1 + 20);
    g.textAlign = 'right';
    g.fillText('Madrid, 1605.', IMG.x1, IMG.y1 + 20);
    kit.addGrain(g, S, S, rng, 0.02);
  });
}

// ---------------------------------------------------------------------------
// SAIL sprite (lattice + canvas), pre-engraved, rotated per frame
// ---------------------------------------------------------------------------
const SP_OX = 6;
const SP_OY = 14;
const SAIL_W = 44; // lattice width (trailing side)
const SAIL_LEAD = 6;
const SAIL_R0 = 46; // where the lattice starts

function getSailSprite(kit) {
  return kit.bake('quix_sail_v1', SAIL_R + 16, 66, (g) => {
    g.translate(SP_OX, SP_OY);
    const R = SAIL_R;
    // canvas cloth: lines along the sail, swelling into shade toward the trailing edge
    const cloth = (x, y) => {
      if (x < SAIL_R0 + 2 || x > R - 4 || y < 0 || y > SAIL_W - 1) return -1;
      const bar = ((x - SAIL_R0) % 15) / 15;
      const sagShade = 0.18 * Math.sin(bar * Math.PI); // cloth bellies between the bars
      return 0.14 + 0.36 * (y / SAIL_W) + sagShade + 0.08 * (x / R);
    };
    g.fillStyle = PAPER;
    g.fillRect(SAIL_R0, 0, R - SAIL_R0, SAIL_W);
    const lines = [];
    for (let y = 1.2; y < SAIL_W; y += 2.6) {
      const pts = [];
      for (let x = SAIL_R0; x <= R; x += 2) pts.push([x, y + Math.sin(x * 0.21 + y) * 0.25, 1]);
      lines.push(pts);
    }
    g.fillStyle = INK;
    engrave(g, cloth, lines, { sp: 2.6, d0: 0.05, max: 0.85, minW: 0.25 });
    // lattice: cross bars and hemlath
    g.strokeStyle = INK;
    g.lineCap = 'butt';
    for (let x = SAIL_R0; x <= R + 0.5; x += 15) {
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(x, -SAIL_LEAD);
      g.lineTo(x, SAIL_W);
      g.stroke();
      g.strokeStyle = PAPER;
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(x - 0.5, -SAIL_LEAD + 1);
      g.lineTo(x - 0.5, SAIL_W - 1);
      g.stroke();
      g.strokeStyle = INK;
    }
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(SAIL_R0, SAIL_W);
    g.lineTo(R, SAIL_W);
    g.moveTo(SAIL_R0, -SAIL_LEAD);
    g.lineTo(R, -SAIL_LEAD);
    g.stroke();
    // the whip (stock): tapered dark beam with a lit edge
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(-2, -4);
    g.lineTo(R + 6, -2.4);
    g.lineTo(R + 6, 2.4);
    g.lineTo(-2, 4);
    g.closePath();
    g.fill();
    g.strokeStyle = PAPER;
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(0, -2.2);
    g.lineTo(R + 4, -1.2);
    g.stroke();
  });
}

function drawMainSails(g, kit, T) {
  const spr = getSailSprite(kit);
  for (let k = 0; k < 4; k++) {
    const th = sailAngle(T, k);
    g.save();
    g.translate(HUB.x, HUB.y);
    g.scale(KX, 1);
    g.rotate(th);
    g.drawImage(spr, -SP_OX, -SP_OY);
    g.restore();
  }
  // hub boss: iron cross-plate + round end of the windshaft
  const th = sailAngle(T, 0);
  g.save();
  g.translate(HUB.x, HUB.y);
  g.scale(KX, 1);
  g.rotate(th);
  g.fillStyle = INK;
  g.fillRect(-11, -11, 22, 22);
  g.strokeStyle = PAPER;
  g.lineWidth = 1;
  g.strokeRect(-8, -8, 16, 16);
  g.restore();
  g.fillStyle = INK;
  g.beginPath();
  g.ellipse(HUB.x, HUB.y, 6, 8, 0, 0, TAU);
  g.fill();
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(HUB.x - 1.5, HUB.y - 2.5, 1.6, 0, TAU);
  g.fill();
}

function drawFarSails(g, T) {
  g.save();
  g.strokeStyle = INK;
  g.lineCap = 'round';
  for (let i = 0; i < FAR_MILLS.length; i++) {
    const m = FAR_MILLS[i];
    const f = farMillGeom(m);
    const a0 = -T * (0.5 + 0.12 * h1(i)) + i * 0.7;
    for (let k = 0; k < 4; k++) {
      const a = a0 + (k * Math.PI) / 2;
      const c = Math.cos(a) * 0.75;
      const s = Math.sin(a);
      const R = f.R;
      g.lineWidth = Math.max(0.6, 1.1 * m.s);
      g.beginPath();
      g.moveTo(f.hub.x, f.hub.y);
      g.lineTo(f.hub.x + c * R, f.hub.y + s * R);
      g.stroke();
      // lattice: a thin rectangle on the trailing side
      const nx = -Math.sin(a) * 0.75;
      const ny = Math.cos(a);
      const w = 5.5 * m.s;
      g.lineWidth = Math.max(0.5, 0.7 * m.s);
      g.beginPath();
      g.moveTo(f.hub.x + c * R * 0.3 + nx * w, f.hub.y + s * R * 0.3 + ny * w);
      g.lineTo(f.hub.x + c * R + nx * w, f.hub.y + s * R + ny * w);
      g.lineTo(f.hub.x + c * R, f.hub.y + s * R);
      for (let j = 1; j <= 3; j++) {
        const u = 0.3 + j * 0.233;
        g.moveTo(f.hub.x + c * R * u, f.hub.y + s * R * u);
        g.lineTo(f.hub.x + c * R * u + nx * w, f.hub.y + s * R * u + ny * w);
      }
      g.stroke();
    }
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// figure helpers (engraved line art, drawn per frame)
// ---------------------------------------------------------------------------
function capsulePath(p, a, b, ra, rb) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  p.moveTo(a.x + (-dy / L) * ra, a.y + (dx / L) * ra);
  p.lineTo(b.x + (-dy / L) * rb, b.y + (dx / L) * rb);
  p.arc(b.x, b.y, rb, ang + Math.PI / 2, ang - Math.PI / 2, true);
  p.lineTo(a.x - (-dy / L) * ra, a.y - (dx / L) * ra);
  p.arc(a.x, a.y, ra, ang - Math.PI / 2, ang + Math.PI / 2, true);
  p.closePath();
  return p;
}

/** Hatch inside a path (clip), parallel lines at angle (rad). */
function hatchIn(g, path, bb, ang, sp, lw, color = INK) {
  g.save();
  g.clip(path);
  g.strokeStyle = color;
  g.lineWidth = lw;
  const cx = (bb[0] + bb[2]) / 2;
  const cy = (bb[1] + bb[3]) / 2;
  const R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 2;
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  g.beginPath();
  for (let k = -R; k <= R; k += sp) {
    g.moveTo(cx - uy * k - ux * R, cy + ux * k - uy * R);
    g.lineTo(cx - uy * k + ux * R, cy + ux * k + uy * R);
  }
  g.stroke();
  g.restore();
}

/** Hatch the crescent of `path` that is NOT covered by the path shifted by (dx,dy) -> form shadow. */
function shadeCrescent(g, path, bb, dx, dy, ang, sp, lw) {
  g.save();
  g.clip(path);
  const p2 = new Path2D();
  p2.rect(bb[0] - 60, bb[1] - 60, bb[2] - bb[0] + 120, bb[3] - bb[1] + 120);
  p2.addPath(path, new DOMMatrix([1, 0, 0, 1, dx, dy]));
  g.clip(p2, 'evenodd');
  hatchIn(g, path, bb, ang, sp, lw);
  g.restore();
}

function pathBB(pts, pad = 4) {
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

function fillOutline(g, path, fill, lw = 1.3) {
  if (fill) {
    g.fillStyle = fill;
    g.fill(path);
  }
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.stroke(path);
}

// ---------------------------------------------------------------------------
// ROCINANTE (and Sancho's donkey) — a parametric engraved quadruped
// ---------------------------------------------------------------------------
// local coords: x forward (right), y down, ground at y = 0, origin under the barrel
function horseLegs(pose, sc) {
  // returns [farHind, farFore, nearHind, nearFore] chains in local coords
  const legs = [];
  const roots = { fore: P(19 * sc, -36 * sc), hind: P(-30 * sc, -38 * sc) };
  const order = [
    ['hind', 0.12, false],
    ['fore', 0.45, false],
    ['hind', 0.0, true],
    ['fore', 0.57, true],
  ];
  for (const [kind, off, near] of order) {
    const r = roots[kind];
    let a1;
    let k1;
    let a3;
    if (pose.gait === 'gallop') {
      const ph = (pose.phase + off) * TAU;
      const sw = Math.sin(ph);
      const lift = Math.max(0, Math.cos(ph));
      if (kind === 'fore') {
        a1 = 0.62 * sw; // forearm swing (rad, + = forward)
        k1 = 1.3 * lift * (sw < 0 ? 1 : 0.4);
        a3 = 0.3 * lift;
      } else {
        a1 = -0.35 + 0.6 * sw;
        k1 = 0.9 * lift;
        a3 = 0.2;
      }
    } else if (pose.gait === 'rear') {
      if (kind === 'fore') {
        a1 = 0.9 + (near ? 0.25 : -0.1) * Math.sin(pose.phase * TAU);
        k1 = 1.6;
        a3 = 0.4;
      } else {
        a1 = -0.55 + (near ? 0.05 : -0.08);
        k1 = 0.1;
        a3 = 0.1;
      }
    } else if (pose.gait === 'skid') {
      if (kind === 'fore') {
        a1 = near ? 0.55 : 0.42;
        k1 = 0.05;
        a3 = -0.2;
      } else {
        a1 = near ? 0.35 : 0.22;
        k1 = 0.5;
        a3 = 0.1;
      }
    } else {
      // stand / paw / dazed (splayed)
      const paw = kind === 'fore' && near ? pose.paw || 0 : 0;
      const splay = pose.splay || 0;
      a1 = (kind === 'fore' ? 0.04 + splay * (near ? 0.18 : -0.08) : -0.05 - splay * (near ? 0.1 : -0.12)) + paw * 0.7;
      k1 = paw * 1.5;
      a3 = paw * 0.4;
    }
    const L1 = (kind === 'fore' ? 17 : 19) * sc;
    const L2 = (kind === 'fore' ? 14 : 14) * sc;
    const L3 = 6 * sc;
    // segment directions measured from straight down; + rotates forward
    let p1;
    let p2;
    let p3;
    if (kind === 'fore') {
      p1 = addP(r, P(Math.sin(a1) * L1, Math.cos(a1) * L1)); // knee
      const a2 = a1 - k1;
      p2 = addP(p1, P(Math.sin(a2) * L2, Math.cos(a2) * L2)); // fetlock
      const a4 = a2 + 0.25 + a3;
      p3 = addP(p2, P(Math.sin(a4) * L3, Math.cos(a4) * L3)); // hoof
    } else {
      const g1 = a1 - 0.35; // gaskin slopes back to the hock
      p1 = addP(r, P(Math.sin(g1) * L1, Math.cos(g1) * L1)); // hock
      const a2 = a1 + 0.3 + k1 * 0.6;
      p2 = addP(p1, P(Math.sin(a2) * L2, Math.cos(a2) * L2));
      const a4 = a2 + 0.3 + a3;
      p3 = addP(p2, P(Math.sin(a4) * L3, Math.cos(a4) * L3));
    }
    legs.push({ kind, near, r, p1, p2, p3 });
  }
  return legs;
}

function drawQuadruped(g, X, gy, pose, opt) {
  // opt: { sc, donkey, saddle, headCb }
  const sc = opt.sc || 1;
  const dk = !!opt.donkey;
  const pitch = pose.pitch || 0;
  const pivot = pose.pivot || P(0, 0);
  const M = new DOMMatrix().translate(X, gy - (pose.bob || 0)).translate(pivot.x, pivot.y).rotate((pitch * 180) / Math.PI).translate(-pivot.x, -pivot.y);
  if (pose.flip) M.scaleSelf(-1, 1);
  const T = (p) => {
    const q = M.transformPoint(new DOMPoint(p.x, p.y));
    return P(q.x, q.y);
  };
  const legs = horseLegs(pose, sc);
  const legPath = (L, w) => {
    const p = new Path2D();
    const a = T(L.r);
    const b = T(L.p1);
    const c = T(L.p2);
    const d = T(L.p3);
    capsulePath(p, a, b, w * 1.9, w * 1.05);
    capsulePath(p, b, c, w * 1.05, w * 0.8);
    capsulePath(p, c, d, w * 0.8, w * 0.95);
    return { p, a, b, c, d };
  };
  const drawLeg = (L, far) => {
    const w = (dk ? 2.4 : 2.0) * sc;
    const lp = legPath(L, w);
    g.fillStyle = PAPER;
    g.fill(lp.p);
    const bb = pathBB([lp.a, lp.b, lp.c, lp.d], 6);
    if (far) hatchIn(g, lp.p, bb, -0.9, 1.9, 0.9);
    else shadeCrescent(g, lp.p, bb, -1.6, -0.8, -0.9, 2.2, 0.8);
    g.strokeStyle = INK;
    g.lineWidth = 1.1;
    g.stroke(lp.p);
    // knobbly joints + hoof
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(lp.d.x + 1 * sc, lp.d.y - 0.5, 3 * sc, 2.2 * sc, 0, 0, TAU);
    g.fill();
    if (!dk) {
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(lp.b.x, lp.b.y, 2.6 * sc, 0, TAU);
      g.stroke();
    }
  };
  // far legs first
  drawLeg(legs[0], true);
  drawLeg(legs[1], true);

  // tail
  const tailRoot = T(P(-44 * sc, -54 * sc));
  const tw = pose.tail || 0;
  g.strokeStyle = INK;
  g.lineCap = 'round';
  for (let k = 0; k < (dk ? 3 : 7); k++) {
    const sp = (k - 3) * 1.6;
    const e = T(P((-52 + tw * 10 + sp) * sc, (dk ? -26 : -18 + Math.abs(sp)) * sc));
    const c = T(P((-56 + tw * 6) * sc, -44 * sc));
    g.lineWidth = dk ? 1.4 : 1.1;
    g.beginPath();
    g.moveTo(tailRoot.x, tailRoot.y);
    g.quadraticCurveTo(c.x, c.y, e.x, e.y);
    g.stroke();
  }
  if (dk) {
    const e = T(P((-50 + tw * 10) * sc, -24 * sc));
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(e.x, e.y + 3 * sc, 2.4 * sc, 4.5 * sc, 0, 0, TAU);
    g.fill();
  }

  // body: bony nag / round donkey
  const bodyPts = dk
    ? [P(25, -40), P(16, -50), P(-6, -50), P(-28, -50), P(-40, -44), P(-42, -32), P(-30, -24), P(-6, -22), P(16, -25), P(26, -32)]
    : [P(31, -46), P(14, -63), P(-6, -56), P(-28, -62), P(-41, -57), P(-47, -47), P(-42, -35), P(-26, -33), P(-10, -31), P(12, -32), P(22, -37), P(29, -42)];
  const bp = bodyPts.map((p) => T(P(p.x * sc, p.y * sc)));
  const body = new Path2D();
  smoothClosed(body, bp);
  // neck + head
  const nA = pose.neck === undefined ? -0.85 : pose.neck;
  const neckL = (dk ? 22 : 34) * sc;
  const nb1 = P(14 * sc, -60 * sc);
  const nb2 = P(30 * sc, -44 * sc);
  if (dk) {
    nb1.x = 14 * sc;
    nb1.y = -48 * sc;
    nb2.x = 24 * sc;
    nb2.y = -36 * sc;
  }
  const poll = P(nb1.x + 10 * sc + Math.cos(nA) * neckL, nb1.y + Math.sin(nA) * neckL);
  const hA = nA + (pose.headTilt === undefined ? 1.35 : pose.headTilt);
  const headL = (dk ? 26 : 30) * sc;
  const muzzle = P(poll.x + Math.cos(hA) * headL, poll.y + Math.sin(hA) * headL);
  const hn = P(-Math.sin(hA), Math.cos(hA)); // head normal (towards the jaw)
  const throat = P(poll.x + hn.x * 9 * sc - Math.cos(hA) * 2 * sc, poll.y + hn.y * 9 * sc);
  const jaw = P(poll.x + Math.cos(hA) * headL * 0.42 + hn.x * (dk ? 12 : 11) * sc, poll.y + Math.sin(hA) * headL * 0.42 + hn.y * (dk ? 12 : 11) * sc);
  const chin = P(muzzle.x + hn.x * 5 * sc, muzzle.y + hn.y * 5 * sc);
  const nose = P(muzzle.x - hn.x * 1.5 * sc + Math.cos(hA) * 1.5 * sc, muzzle.y - hn.y * 1.5 * sc + Math.sin(hA) * 1.5 * sc);
  const forehead = P(poll.x + Math.cos(hA) * 6 * sc - hn.x * 3.5 * sc, poll.y + Math.sin(hA) * 6 * sc - hn.y * 3.5 * sc);
  const neckPts = [nb1, P(poll.x - 2 * sc, poll.y - 2 * sc), forehead, nose, chin, jaw, throat, nb2].map(T);
  const neck = new Path2D();
  neck.moveTo(neckPts[0].x, neckPts[0].y);
  neck.quadraticCurveTo(T(mid(nb1, poll, 0.5)).x - 2, T(mid(nb1, poll, 0.5)).y - 3, neckPts[1].x, neckPts[1].y);
  for (let i = 2; i < neckPts.length; i++) neck.lineTo(neckPts[i].x, neckPts[i].y);
  neck.closePath();

  g.fillStyle = PAPER;
  g.fill(body);
  g.fill(neck);
  const bbBody = pathBB(bp, 8);
  const bbNeck = pathBB(neckPts, 6);
  // coat shading: belly and haunch shadow, neck underside
  if (dk) {
    hatchIn(g, body, bbBody, -0.5, 2.3, 0.8); // grey donkey
    shadeCrescent(g, body, bbBody, -5, -6, 0.6, 2.3, 0.8);
    hatchIn(g, neck, bbNeck, -0.5, 2.3, 0.8);
  } else {
    hatchIn(g, body, bbBody, pitch - 0.12, 2.5, 0.5);
    hatchIn(g, neck, bbNeck, pitch - 0.9, 2.5, 0.5);
    shadeCrescent(g, body, bbBody, -4, -8, pitch - 0.55, 2.0, 0.9);
    shadeCrescent(g, body, bbBody, -2, -14, pitch + 0.5, 2.4, 0.8);
    shadeCrescent(g, neck, bbNeck, -3, -5, pitch - 0.6, 2.0, 0.85);
    // white highlight cut along the back
    const hb0 = T(P(-36 * sc, -57 * sc));
    const hb1 = T(P(-14 * sc, -57 * sc));
    const hb2 = T(P(8 * sc, -61 * sc));
    g.strokeStyle = PAPER;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(hb0.x, hb0.y);
    g.quadraticCurveTo(hb1.x, hb1.y + 1, hb2.x, hb2.y);
    g.stroke();
  }
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  g.stroke(body);
  g.stroke(neck);
  if (!dk) {
    // ribs! the famous leanness
    g.lineWidth = 0.9;
    for (let k = 0; k < 6; k++) {
      const x = (8 - k * 5.5) * sc;
      const a = T(P(x + 1, -54 * sc + k * 0.3));
      const c = T(P(x - 4 * sc, -44 * sc));
      const b = T(P(x - 2 * sc, -34 * sc));
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.quadraticCurveTo(c.x, c.y, b.x, b.y);
      g.stroke();
    }
    // hip bone and shoulder blade
    const hip = T(P(-28 * sc, -58 * sc));
    g.beginPath();
    g.arc(hip.x, hip.y + 2, 4 * sc, Math.PI * 0.9, Math.PI * 2.1);
    g.stroke();
    const sh1 = T(P(12 * sc, -58 * sc));
    const sh2 = T(P(22 * sc, -40 * sc));
    g.beginPath();
    g.moveTo(sh1.x, sh1.y);
    g.lineTo(sh2.x, sh2.y);
    g.stroke();
  } else {
    // pale belly & muzzle of the donkey: paper patch over the hatch
    const bel = T(P(-8 * sc, -27 * sc));
    g.fillStyle = paperA(0.9);
    g.beginPath();
    g.ellipse(bel.x, bel.y, 15 * sc, 4 * sc, pitch, 0, TAU);
    g.fill();
    const mz = T(mid(muzzle, chin));
    g.beginPath();
    g.arc(mz.x, mz.y, 4.5 * sc, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.8;
    g.stroke();
    // cross on the shoulders
    const c1 = T(P(10 * sc, -50 * sc));
    const c2 = T(P(14 * sc, -30 * sc));
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(c1.x, c1.y);
    g.lineTo(c2.x, c2.y);
    g.stroke();
  }
  // mane
  g.strokeStyle = INK;
  g.lineWidth = dk ? 1.6 : 0.9;
  g.beginPath();
  for (let k = 0; k <= (dk ? 5 : 9); k++) {
    const u = k / (dk ? 5 : 9);
    const q = T(P(lerp(nb1.x, poll.x, u), lerp(nb1.y, poll.y, u) - 1));
    const back = rot(-6 * sc, dk ? -2 : 4 * sc, pitch);
    g.moveTo(q.x, q.y);
    g.lineTo(q.x + back.x + (h1(k) - 0.5) * 3, q.y + back.y);
  }
  g.stroke();
  // ears
  const earL = (dk ? 20 : 8) * sc;
  for (const [o, sgn] of [
    [0, 1],
    [2.5, 0.8],
  ]) {
    const base = T(P(poll.x - 1 * sc + o * sc * 0.3, poll.y - 1 * sc));
    const ea = nA - 1.85 + (pose.ear || 0) * sgn + (dk ? 0.35 : 0);
    const tip = P(base.x + Math.cos(ea + pitch) * earL, base.y + Math.sin(ea + pitch) * earL);
    g.fillStyle = o ? INK : PAPER;
    g.beginPath();
    g.moveTo(base.x - 2.2 * sc, base.y);
    g.quadraticCurveTo(mid(base, tip).x - 3 * sc, mid(base, tip).y, tip.x, tip.y);
    g.quadraticCurveTo(mid(base, tip).x + 3 * sc, mid(base, tip).y + 1, base.x + 2.2 * sc, base.y + 1);
    g.closePath();
    g.fill();
    g.lineWidth = 0.9;
    g.stroke();
  }
  // eye & nostril
  const eye = T(P(poll.x + Math.cos(hA) * 8 * sc + hn.x * 3 * sc, poll.y + Math.sin(hA) * 8 * sc + hn.y * 3 * sc));
  g.fillStyle = INK;
  g.beginPath();
  g.arc(eye.x, eye.y, 1.5 * sc, 0, TAU);
  g.fill();
  const ns = T(P(muzzle.x - Math.cos(hA) * 3 * sc + hn.x * 0.5, muzzle.y - Math.sin(hA) * 3 * sc + hn.y * 0.5));
  g.beginPath();
  g.arc(ns.x, ns.y, 1.1 * sc, 0, TAU);
  g.fill();

  // tack
  const pts = { saddle: T(P(-6 * sc, -62 * sc)), bit: T(mid(muzzle, chin, 0.3)), poll: T(poll), muzzle: T(muzzle), M, T, pitch };
  if (opt.saddle) {
    // saddle cloth + war saddle (high pommel & cantle)
    const cl = [P(-22, -60), P(8, -62), P(10, -44), P(-22, -42)].map((p) => T(P(p.x * sc, p.y * sc)));
    const cloth = new Path2D();
    polyPath(cloth, cl);
    g.fillStyle = PAPER;
    g.fill(cloth);
    hatchIn(g, cloth, pathBB(cl, 4), 0.1, 2.0, 1.0);
    g.strokeStyle = INK;
    g.lineWidth = 1.1;
    g.stroke(cloth);
    const sd = [P(-18, -61), P(-17, -70), P(-12, -64), P(2, -64), P(6, -71), P(8, -62), P(4, -57), P(-15, -57)].map((p) => T(P(p.x * sc, p.y * sc)));
    const sp = new Path2D();
    polyPath(sp, sd);
    g.fillStyle = INK;
    g.fill(sp);
    g.strokeStyle = paperA(0.7);
    g.lineWidth = 0.7;
    const hl1 = T(P(-12 * sc, -62.5 * sc));
    const hl2 = T(P(2 * sc, -62.5 * sc));
    g.beginPath();
    g.moveTo(hl1.x, hl1.y);
    g.lineTo(hl2.x, hl2.y);
    g.stroke();
    // girth
    const g1 = T(P(0, -57 * sc));
    const g2 = T(P(2 * sc, -32 * sc));
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(g1.x, g1.y);
    g.lineTo(g2.x, g2.y);
    g.stroke();
    // bridle
    g.lineWidth = 1;
    const br1 = T(P(poll.x + hn.x * 2, poll.y + hn.y * 2));
    g.beginPath();
    g.moveTo(br1.x, br1.y);
    g.lineTo(pts.bit.x, pts.bit.y);
    g.stroke();
  }
  // near legs
  drawLeg(legs[2], false);
  drawLeg(legs[3], false);
  return pts;
}

// ---------------------------------------------------------------------------
// DON QUIXOTE — gaunt knight in old armour (joints in panel space)
// ---------------------------------------------------------------------------
function drawKnight(g, J) {
  // J: hip, sh (shoulder), head {x,y,a}, nElbow, nHand, fElbow, fHand, nKnee, nFoot, fKnee, fFoot, shield {x,y,a}, facing
  const f = J.facing || 1;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // far leg
  if (J.fKnee) {
    const p = new Path2D();
    capsulePath(p, J.hip, J.fKnee, 3.6, 3);
    capsulePath(p, J.fKnee, J.fFoot, 3, 2.4);
    g.fillStyle = PAPER;
    g.fill(p);
    hatchIn(g, p, pathBB([J.hip, J.fKnee, J.fFoot], 6), 0.9, 1.8, 0.9);
    g.strokeStyle = INK;
    g.lineWidth = 1.1;
    g.stroke(p);
  }
  // far arm + shield (adarga)
  if (J.fElbow) {
    const p = new Path2D();
    capsulePath(p, J.sh, J.fElbow, 3, 2.6);
    capsulePath(p, J.fElbow, J.fHand, 2.6, 2.2);
    g.fillStyle = PAPER;
    g.fill(p);
    hatchIn(g, p, pathBB([J.sh, J.fElbow, J.fHand], 6), 0.9, 1.8, 0.9);
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.stroke(p);
  }
  if (J.shield) {
    const sh = J.shield;
    const p = new Path2D();
    p.ellipse(sh.x, sh.y, 8.5, 13, sh.a || 0, 0, TAU);
    g.fillStyle = PAPER;
    g.fill(p);
    const bb = [sh.x - 14, sh.y - 14, sh.x + 14, sh.y + 14];
    hatchIn(g, p, bb, 1.2, 2.2, 0.8);
    shadeCrescent(g, p, bb, -2.5, -3, -0.4, 2.0, 0.9);
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.stroke(p);
    g.lineWidth = 0.8;
    g.beginPath();
    g.ellipse(sh.x, sh.y, 5.5, 9.5, sh.a || 0, 0, TAU);
    g.stroke();
    g.fillStyle = INK;
    g.beginPath();
    g.arc(sh.x, sh.y, 2.2, 0, TAU);
    g.fill();
  }
  // torso: breastplate (cuirass) with tassets
  const tv = P(J.sh.x - J.hip.x, J.sh.y - J.hip.y);
  const tl = Math.hypot(tv.x, tv.y) || 1;
  const tn = P(-tv.y / tl, tv.x / tl); // normal (to the right of hip->sh)
  // front side is -tn*f? compute front as the facing direction projected
  const fr = tn.x * f > 0 ? tn : P(-tn.x, -tn.y);
  const bk = P(-fr.x, -fr.y);
  const tp = [
    addP(J.hip, P(bk.x * 6, bk.y * 6)),
    addP(J.hip, P(fr.x * 6, fr.y * 6)),
    addP(mid(J.hip, J.sh, 0.55), P(fr.x * 9.5, fr.y * 9.5)),
    addP(J.sh, P(fr.x * 7, fr.y * 7)),
    addP(J.sh, P(bk.x * 6, bk.y * 6)),
    addP(mid(J.hip, J.sh, 0.5), P(bk.x * 6.5, bk.y * 6.5)),
  ];
  const torso = new Path2D();
  smoothClosed(torso, tp);
  g.fillStyle = PAPER;
  g.fill(torso);
  const tbb = pathBB(tp, 6);
  hatchIn(g, torso, tbb, Math.atan2(tv.y, tv.x) + Math.PI / 2, 1.9, 0.6);
  shadeCrescent(g, torso, tbb, fr.x * 3 - 1.5, fr.y * 3 - 2.5, Math.atan2(tv.y, tv.x), 1.6, 0.9);
  {
    // polished steel: a bright vertical gleam
    const a = addP(mid(J.hip, J.sh, 0.12), P(fr.x * 2.5, fr.y * 2.5));
    const b = addP(mid(J.hip, J.sh, 0.92), P(fr.x * 2, fr.y * 2));
    g.strokeStyle = PAPER;
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
  }
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  g.stroke(torso);
  // breastplate ridge + white highlight
  g.lineWidth = 0.8;
  const r1 = addP(mid(J.hip, J.sh, 0.2), P(fr.x * 5, fr.y * 5));
  const r2 = addP(mid(J.hip, J.sh, 0.85), P(fr.x * 5, fr.y * 5));
  g.beginPath();
  g.moveTo(r1.x, r1.y);
  g.quadraticCurveTo(addP(mid(J.hip, J.sh, 0.5), P(fr.x * 8.5, fr.y * 8.5)).x, addP(mid(J.hip, J.sh, 0.5), P(fr.x * 8.5, fr.y * 8.5)).y, r2.x, r2.y);
  g.stroke();
  // tassets (skirt plates) — three bands below the waist
  for (let k = 0; k < 3; k++) {
    const a = addP(J.hip, P(bk.x * 6 + tv.x * (-0.04 - k * 0.09), bk.y * 6 + tv.y * (-0.04 - k * 0.09)));
    const b = addP(J.hip, P(fr.x * 7.5 + tv.x * (-0.04 - k * 0.09), fr.y * 7.5 + tv.y * (-0.04 - k * 0.09)));
    g.lineWidth = 3.2 - k * 0.4;
    g.strokeStyle = INK;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
  }
  // head: gaunt face, long pointed beard, helmet with visor
  const H = J.head;
  const hp = (x, y) => {
    const q = rot(x * f, y, H.a);
    return P(H.x + q.x, H.y + q.y);
  };
  const face = [hp(-6, -2), hp(4, -5), hp(6.5, -2), hp(10.5, 2.5), hp(6.5, 3.6), hp(7, 6.5), hp(5.5, 9), hp(-2, 8), hp(-6.5, 4)];
  const fp = new Path2D();
  polyPath(fp, face);
  g.fillStyle = PAPER;
  g.fill(fp);
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.stroke(fp);
  // beard: long, pointed, hatched
  const beard = [hp(-2.5, 7.5), hp(6.5, 7.5), hp(5, 13), hp(3.5, 22), hp(-0.5, 12)];
  const bp = new Path2D();
  polyPath(bp, beard);
  g.fillStyle = PAPER;
  g.fill(bp);
  hatchIn(g, bp, pathBB(beard, 4), Math.PI / 2 + H.a + 0.25 * f, 1.4, 0.7);
  g.lineWidth = 1;
  g.stroke(bp);
  // moustache, eye, cheek hollow
  g.lineWidth = 0.9;
  g.beginPath();
  const m0 = hp(6.6, 5.2);
  const m1 = hp(1, 6.5);
  g.moveTo(m0.x, m0.y);
  g.lineTo(m1.x, m1.y);
  const ck0 = hp(1, 1.5);
  const ck1 = hp(2.5, 6);
  g.moveTo(ck0.x, ck0.y);
  g.lineTo(ck1.x, ck1.y);
  g.stroke();
  const ey = hp(4.5, -0.8);
  g.fillStyle = INK;
  g.beginPath();
  g.arc(ey.x, ey.y, 1.1, 0, TAU);
  g.fill();
  // helmet (celada) with brim/visor raised
  const helm = [hp(-8.5, 2), hp(-9, -5), hp(-4, -11), hp(3, -11.5), hp(8, -7), hp(13, -5.5), hp(12, -3.6), hp(5.5, -3.8), hp(-2, -2.5), hp(-5.5, 3)];
  const hm = new Path2D();
  smoothClosed(hm, helm);
  g.fillStyle = PAPER;
  g.fill(hm);
  const hbb = pathBB(helm, 4);
  shadeCrescent(g, hm, hbb, -2 * f, -2.5, 0.3, 1.6, 0.8);
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke(hm);
  g.strokeStyle = paperA(0.95);
  g.lineWidth = 1;
  g.beginPath();
  const hl0 = hp(-5, -7);
  const hl1 = hp(1, -10);
  g.moveTo(hl0.x, hl0.y);
  g.lineTo(hl1.x, hl1.y);
  g.stroke();
  // near leg: long, armoured, pointed sabaton
  if (J.nKnee) {
    const p = new Path2D();
    capsulePath(p, J.hip, J.nKnee, 4.2, 3.3);
    capsulePath(p, J.nKnee, J.nFoot, 3.3, 2.6);
    g.fillStyle = PAPER;
    g.fill(p);
    const lbb = pathBB([J.hip, J.nKnee, J.nFoot], 6);
    hatchIn(g, p, lbb, 0.35, 2.0, 0.55);
    shadeCrescent(g, p, lbb, -1.8, -1.6, 1.1, 1.7, 0.85);
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.stroke(p);
    // knee cop and greave bands
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(J.nKnee.x, J.nKnee.y, 3.6, 0, TAU);
    g.fill();
    g.lineWidth = 1;
    g.stroke();
    // sabaton
    const fd = P(J.nFoot.x + 8 * f, J.nFoot.y + 1.5);
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(J.nFoot.x - 3 * f, J.nFoot.y - 2.5);
    g.lineTo(fd.x, fd.y);
    g.lineTo(J.nFoot.x - 2 * f, J.nFoot.y + 2.5);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function drawKnightArm(g, J) {
  // near arm on top of the lance (couter + vambrace)
  const p = new Path2D();
  capsulePath(p, J.sh, J.nElbow, 3.6, 3.0);
  capsulePath(p, J.nElbow, J.nHand, 3.0, 2.4);
  g.fillStyle = PAPER;
  g.fill(p);
  shadeCrescent(g, p, pathBB([J.sh, J.nElbow, J.nHand], 6), -1.5, -2, 0.9, 1.8, 0.85);
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke(p);
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(J.nElbow.x, J.nElbow.y, 3.2, 0, TAU);
  g.fill();
  g.lineWidth = 0.9;
  g.stroke();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(J.nHand.x, J.nHand.y, 2.8, 0, TAU);
  g.fill();
  // pauldron
  g.fillStyle = PAPER;
  g.beginPath();
  g.ellipse(J.sh.x, J.sh.y + 1, 5.5, 4.2, 0.2, 0, TAU);
  g.fill();
  g.lineWidth = 1.1;
  g.stroke();
  g.lineWidth = 0.7;
  g.beginPath();
  g.ellipse(J.sh.x, J.sh.y + 2.2, 4.2, 2.6, 0.2, 0.2, Math.PI - 0.2);
  g.stroke();
}

function drawLance(g, a, b, w = 2.6, head = true) {
  // a: butt, b: tip
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const nx = -uy;
  const ny = ux;
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(a.x + nx * w * 0.7, a.y + ny * w * 0.7);
  g.lineTo(b.x - ux * 9 + nx * w * 0.42, b.y - uy * 9 + ny * w * 0.42);
  g.lineTo(b.x - ux * 9 - nx * w * 0.42, b.y - uy * 9 - ny * w * 0.42);
  g.lineTo(a.x - nx * w * 0.7, a.y - ny * w * 0.7);
  g.closePath();
  g.fill();
  g.strokeStyle = paperA(0.85);
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(a.x - nx * w * 0.3 + ux * 3, a.y - ny * w * 0.3 + uy * 3);
  g.lineTo(b.x - ux * 12 - nx * w * 0.15, b.y - uy * 12 - ny * w * 0.15);
  g.stroke();
  if (head) {
    g.fillStyle = INK;
    g.beginPath();
    g.moveTo(b.x + ux * 2, b.y + uy * 2);
    g.lineTo(b.x - ux * 10 + nx * 2.6, b.y - uy * 10 + ny * 2.6);
    g.lineTo(b.x - ux * 10 - nx * 2.6, b.y - uy * 10 - ny * 2.6);
    g.closePath();
    g.fill();
  }
}

// ---------------------------------------------------------------------------
// SANCHO PANZA on his donkey
// ---------------------------------------------------------------------------
function drawSancho(g, T) {
  g.save();
  g.translate(SANCHO_X, crestY(SANCHO_X) + 1);
  g.scale(KF, KF);
  drawSanchoLocal(g, T);
  g.restore();
}

function drawSanchoLocal(g, T) {
  const X = 0;
  const gy = 0;
  const sc = 0.95;
  const beat = T * 2; // beats
  const fear = sstep(3.9, 4.35, T); // hands to head
  const warn = env(T, 0.2, 0.6, 3.7, 4.1);
  const startle = env(T, 4.25, 4.45, 5.6, 6.4);
  const bounce = fear * Math.abs(Math.sin(beat * Math.PI)) * 2.2;
  const pose = {
    gait: 'stand',
    bob: 0,
    neck: -0.55 - 0.1 * Math.sin(T * 1.7),
    headTilt: 1.55,
    tail: Math.sin(T * 2.6) * 0.6,
    ear: -0.2 + 0.25 * Math.sin(T * 3.1) * (1 - startle) - 0.55 * startle,
    paw: 0,
  };
  const pts = drawQuadruped(g, X, gy, pose, { sc, donkey: true });
  void pts;
  // saddle bags (alforjas)
  const sb = P(X - 14, gy - 40);
  g.save();
  g.fillStyle = PAPER;
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.rect(sb.x - 9, sb.y, 16, 16);
  g.fill();
  g.stroke();
  g.lineWidth = 1.4;
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    g.moveTo(sb.x - 9, sb.y + 2 + k * 4);
    g.lineTo(sb.x + 7, sb.y + 2 + k * 4);
  }
  g.stroke();
  g.restore();

  // Sancho: short and stout, broad hat, beard
  const lean = -0.12 * fear + 0.05 * warn;
  const hip = P(X - 2, gy - 50 - bounce);
  const up = rot(0, -1, lean);
  const sh = P(hip.x + up.x * 24, hip.y + up.y * 24);
  const head = P(sh.x + up.x * 11 + 2, sh.y + up.y * 11);
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // far arm (when both hands go to the head)
  const farHand = P(lerp(sh.x + 6, head.x - 7, fear), lerp(sh.y + 16, head.y - 3, fear));
  const farElb = P(lerp(sh.x + 8, sh.x - 14, fear), lerp(sh.y + 10, sh.y - 4, fear));
  {
    const p = new Path2D();
    capsulePath(p, P(sh.x + 2, sh.y + 2), farElb, 3.4, 3);
    capsulePath(p, farElb, farHand, 3, 2.6);
    g.fillStyle = PAPER;
    g.fill(p);
    hatchIn(g, p, pathBB([sh, farElb, farHand], 6), 0.9, 1.8, 0.9);
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.stroke(p);
  }
  // legs: short, dangling, with the near foot in front of the donkey's side
  const knee = P(hip.x + 9, hip.y + 10);
  const foot = P(hip.x + 6 + Math.sin(T * 3) * 0.6, hip.y + 25);
  {
    const p = new Path2D();
    capsulePath(p, hip, knee, 5.5, 4.2);
    capsulePath(p, knee, foot, 4.2, 3.4);
    g.fillStyle = PAPER;
    g.fill(p);
    shadeCrescent(g, p, pathBB([hip, knee, foot], 7), -1.5, -2, 1.0, 1.9, 0.8);
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.stroke(p);
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(foot.x + 3, foot.y + 2, 4.5, 2.4, 0, 0, TAU);
    g.fill();
  }
  // round belly & jerkin
  const tp = [
    P(hip.x - 8, hip.y + 2),
    P(hip.x + 9, hip.y + 2),
    P(hip.x + 15 + up.x * 10, hip.y - 2 + up.y * 10),
    P(sh.x + 8, sh.y + 2),
    P(sh.x - 6, sh.y + 1),
    P(hip.x - 10 + up.x * 12, hip.y + up.y * 12),
  ];
  const torso = new Path2D();
  smoothClosed(torso, tp);
  g.fillStyle = PAPER;
  g.fill(torso);
  const tbb = pathBB(tp, 6);
  hatchIn(g, torso, tbb, 0.35, 2.4, 0.75);
  shadeCrescent(g, torso, tbb, -3, -4, -0.9, 2.0, 0.9);
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  g.stroke(torso);
  // belt
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(hip.x - 9 + up.x * 6, hip.y + up.y * 6 + 1);
  g.quadraticCurveTo(hip.x + 4 + up.x * 6, hip.y + up.y * 6 + 4, hip.x + 15 + up.x * 6, hip.y + up.y * 6);
  g.stroke();
  // head: round face, short beard, broad-brimmed hat
  const face = new Path2D();
  face.arc(head.x, head.y, 6.8, 0, TAU);
  g.fillStyle = PAPER;
  g.fill(face);
  g.lineWidth = 1.1;
  g.stroke(face);
  const brd = new Path2D();
  brd.moveTo(head.x - 3, head.y + 3);
  brd.quadraticCurveTo(head.x + 2, head.y + 11, head.x + 7, head.y + 3);
  brd.lineTo(head.x + 5, head.y + 1);
  brd.quadraticCurveTo(head.x + 1, head.y + 5, head.x - 3, head.y + 3);
  g.fillStyle = INK;
  g.fill(brd);
  g.beginPath();
  g.arc(head.x + 3, head.y - 1.5, 0.9, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(head.x + 7, head.y + 0.5, 1.8, 1.4, 0, 0, TAU); // nose
  g.fillStyle = PAPER;
  g.fill();
  g.stroke();
  // hat (pushed back when frightened)
  const hatLift = fear * (3 + Math.abs(Math.sin(beat * Math.PI)) * 2);
  const hc = P(head.x - 0.5, head.y - 6 - hatLift);
  g.save();
  g.translate(hc.x, hc.y);
  g.rotate(-0.15 - 0.2 * fear);
  const hat = new Path2D();
  hat.ellipse(0, 0, 13, 3.4, 0, 0, TAU);
  hat.moveTo(-6.5, -1);
  hat.quadraticCurveTo(-6, -9, 0, -9.5);
  hat.quadraticCurveTo(6, -9, 6.5, -1);
  hat.closePath();
  g.fillStyle = PAPER;
  g.fill(hat);
  hatchIn(g, hat, [-14, -11, 14, 4], 0.5, 1.6, 0.8);
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.stroke(hat);
  g.restore();
  // near arm: on the reins -> pointing / waving -> clutching the head
  const wave = Math.sin(T * 9) * 0.25;
  let elb;
  let hand;
  if (fear > 0.01) {
    elb = P(lerp(sh.x + 6, sh.x + 15, fear), lerp(sh.y + 12, sh.y - 9, fear));
    hand = P(lerp(sh.x + 18, head.x + 1, fear), lerp(sh.y + 8, head.y - 8 - hatLift * 0.5, fear));
  } else {
    const pt = warn;
    elb = P(sh.x + lerp(6, 11, pt), sh.y + lerp(12, 1, pt));
    const ang = lerp(0.6, -0.55 + wave, pt);
    hand = P(elb.x + Math.cos(ang) * 12, elb.y + Math.sin(ang) * 12);
  }
  {
    const p = new Path2D();
    capsulePath(p, sh, elb, 3.6, 3.1);
    capsulePath(p, elb, hand, 3.1, 2.6);
    g.fillStyle = PAPER;
    g.fill(p);
    shadeCrescent(g, p, pathBB([sh, elb, hand], 6), -1.5, -2, 0.9, 1.8, 0.85);
    g.strokeStyle = INK;
    g.lineWidth = 1.1;
    g.stroke(p);
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(hand.x, hand.y, 2.8, 0, TAU);
    g.fill();
    g.stroke();
  }
  // far hand over the hat crown too
  if (fear > 0.3) {
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(farHand.x, farHand.y, 2.6, 0, TAU);
    g.fill();
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// KNIGHT + ROCINANTE choreography
// ---------------------------------------------------------------------------
const KF = 1.3; // figure scale (figures are drawn in local units, then scaled)
const CHARGE_T0 = 2.0;
const CATCH_TIP = sailPoint(Math.PI / 2, STUCK.r, STUCK.n);
const GRIP_OFF = P(6, -70); // grip relative to the horse anchor (local units)
const GY_C = crestY(440) + 1;
const BETA_C = Math.asin(clamp((CATCH_TIP.y - (GY_C + KF * GRIP_OFF.y)) / (KF * LANCE_F), -0.6, 0.6));
const X_CATCH = CATCH_TIP.x - KF * GRIP_OFF.x - KF * LANCE_F * Math.cos(BETA_C);
const GALLOP_HZ = 2.4;
const HANG_D = 74; // grip -> stuck point once he has slid up the shaft (local units)

function horseX(T) {
  if (T <= CHARGE_T0) return KNIGHT_X0 - 5 * env(T, 1.3, 1.7, 1.85, 2.0);
  if (T <= T_CATCH) {
    const u = (T - CHARGE_T0) / (T_CATCH - CHARGE_T0);
    return lerp(KNIGHT_X0, X_CATCH, Math.pow(u, 1.35));
  }
  const tau = T - T_CATCH;
  return X_CATCH + 26 * (1 - Math.exp(-3.5 * tau)) - 14 * sstep(1.6, 3.2, tau);
}

function horsePose(T) {
  if (T < CHARGE_T0 - 0.12) {
    const paw = T > 0.9 ? Math.max(0, Math.sin((T - 0.9) * 7.5)) * env(T, 0.9, 1.0, 1.7, 1.85) : 0;
    return { gait: 'stand', neck: -0.95 + 0.05 * Math.sin(T * 2.2), headTilt: 1.3, tail: Math.sin(T * 2.1) * 0.5, paw, ear: 0.2 };
  }
  if (T < T_CATCH) {
    const ph = (T - CHARGE_T0) * GALLOP_HZ;
    const ramp = sstep(CHARGE_T0 - 0.12, CHARGE_T0 + 0.25, T);
    return {
      gait: 'gallop',
      phase: ph,
      bob: ramp * 3.5 * Math.abs(Math.sin(ph * Math.PI)),
      pitch: ramp * 0.045 * Math.sin(ph * TAU),
      pivot: P(0, -40),
      neck: -0.5,
      headTilt: 1.32,
      tail: -0.8,
      ear: -0.5,
    };
  }
  const tau = T - T_CATCH;
  if (tau < 1.5) {
    const rear = env(tau, 0.1, 0.45, 0.85, 1.4);
    return {
      gait: rear > 0.45 ? 'rear' : tau < 0.5 ? 'skid' : 'stand',
      splay: 1,
      phase: tau * 3,
      pitch: -0.36 * rear,
      pivot: P(-34, 0),
      neck: -0.95 - 0.12 * rear,
      headTilt: 1.55,
      tail: -0.4,
      ear: -0.7,
    };
  }
  const tr = Math.sin(T * 23) * 0.012 * (1 - sstep(3.5, 5, tau));
  return { gait: 'stand', splay: 1, neck: lerp(-0.6, 0.25, sstep(1.5, 2.6, tau)), headTilt: 1.55, tail: Math.sin(T * 1.3) * 0.3, pitch: tr, pivot: P(0, 0), ear: 0.9 };
}

function riderJoints(hp, T, lanceAng) {
  // knight seated in the saddle (horse-local units -> via hp.T, which includes pitch)
  const L = (x, y) => hp.T(P(x, y));
  const charge = sstep(CHARGE_T0 - 0.3, CHARGE_T0 + 0.2, T);
  const lean = 0.18 * charge;
  const hipL = P(-6, -66);
  const shL = P(hipL.x + Math.sin(lean) * 30, hipL.y - Math.cos(lean) * 30);
  const headL = P(shL.x + 3 + Math.sin(lean) * 12, shL.y - 12);
  const J = {
    facing: 1,
    hip: L(hipL.x, hipL.y),
    sh: L(shL.x, shL.y),
    head: { ...L(headL.x, headL.y), a: (hp.pitch || 0) + lean * 0.5 },
    nKnee: L(hipL.x + 12, hipL.y + 19),
    nFoot: L(hipL.x + 7, hipL.y + 44),
    fKnee: L(hipL.x + 10, hipL.y + 18),
    fFoot: L(hipL.x + 5, hipL.y + 40),
    fElbow: L(shL.x + 9, shL.y + 12),
    fHand: L(shL.x + 18, shL.y + 14),
    shield: { ...L(shL.x + 12, shL.y + 9), a: 0.25 },
    nElbow: L(shL.x - 5, shL.y + 16),
  };
  J.nHand = L(GRIP_OFF.x, GRIP_OFF.y);
  J.grip = J.nHand;
  J.lanceAng = lanceAng;
  return J;
}

// seated pose relative to the grip (used to blend into the dangling pose at the catch)
const SEATED_REL = (() => {
  const id = { T: (p) => P(p.x, p.y), pitch: 0 };
  const J = riderJoints(id, T_CATCH, BETA_C);
  const out = {};
  for (const k of Object.keys(J)) {
    const v = J[k];
    if (v && typeof v === 'object' && 'x' in v) out[k] = { ...v, x: v.x - GRIP_OFF.x, y: v.y - GRIP_OFF.y };
  }
  out.facing = 1;
  return out;
})();

function hangingJoints(T) {
  // dangling below the grip (origin), knees pulled up, legs pedalling the air
  const kick = T * 10.5;
  const k1 = Math.sin(kick);
  const k2 = Math.sin(kick + Math.PI);
  return {
    facing: 1,
    nHand: P(0, 0),
    fHand: P(3, -1),
    nElbow: P(-8, 9),
    fElbow: P(9, 9),
    sh: P(0, 18),
    hip: P(-1, 46),
    head: { x: 7, y: 13, a: 0.3 },
    shield: { x: 11, y: 31, a: 0.4 },
    nKnee: P(13 + 5 * k1, 54 + 4 * Math.cos(kick)),
    nFoot: P(7 + 9 * k1, 72 + 4 * Math.cos(kick)),
    fKnee: P(13 + 5 * k2, 54 + 4 * Math.cos(kick + Math.PI)),
    fFoot: P(7 + 9 * k2, 72 + 4 * Math.cos(kick + Math.PI)),
  };
}

function lerpJoints(A, B, s) {
  const out = { facing: B.facing };
  for (const k of Object.keys(B)) {
    const b = B[k];
    const a = A[k];
    if (b && typeof b === 'object' && 'x' in b) {
      if (!a) {
        out[k] = b;
        continue;
      }
      out[k] = { x: lerp(a.x, b.x, s), y: lerp(a.y, b.y, s) };
      if ('a' in b) out[k].a = lerp(a.a || 0, b.a, s);
    }
  }
  return out;
}

const FLY = { v: P(-112, 0), dur: 1.4, g: 900 };
function knightState(T) {
  if (T < T_CATCH) return { mode: 'ride' };
  if (T < T_SNAP) {
    const tau = T - T_CATCH;
    const th = sailAngle(T, 0);
    const stuck = sailPoint(th, STUCK.r, STUCK.n);
    const a0 = Math.PI + BETA_C;
    // the lance stays on its line while he is yanked along it, then swings down to hang
    const keep = 1 - sstep(1.35, 2.0, tau);
    const settle = tau > 2.0 ? 0.22 * Math.exp(-1.8 * (tau - 2.0)) * Math.sin(4.2 * (tau - 2.0)) : 0;
    const alpha = Math.PI / 2 + (a0 - Math.PI / 2) * keep + settle;
    const d = KF * (HANG_D + (LANCE_F - HANG_D) * Math.exp(-6 * tau));
    const G = P(stuck.x + Math.cos(alpha) * d, stuck.y + Math.sin(alpha) * d);
    const blend = sstep(0, 0.22, tau);
    // body: flung out horizontally behind his hands (cartoon yank), then dangling
    const flagged = env(tau, 0.05, 0.25, 1.35, 2.0);
    const swing = (Math.PI / 2) * 0.92 * flagged + (-settle * 0.8 + 0.08 * Math.sin(T * 5.2)) * blend * (1 - flagged);
    return { mode: 'hang', stuck, alpha, G, tau, blend, swing };
  }
  // snapped: the knight (with the butt of the lance) flies off in a comic arc
  const st = knightState(T_SNAP - 1e-4);
  const c0 = P(st.G.x, st.G.y + KF * 40); // body centre
  const landX = c0.x + FLY.v.x * FLY.dur;
  const landY = crestY(landX) - KF * 8;
  const g = FLY.g;
  const vy = (landY - c0.y - 0.5 * g * FLY.dur * FLY.dur) / FLY.dur;
  const tau = T - T_SNAP;
  if (tau < FLY.dur) {
    const C = P(c0.x + FLY.v.x * tau, c0.y + vy * tau + 0.5 * g * tau * tau);
    const spin = st.swing - tau * 4.2;
    return { mode: 'fly', C, tau, spin, snap: st };
  }
  return { mode: 'down', land: P(landX, crestY(landX)), since: tau - FLY.dur, snap: st };
}

function drawDust(g, x, y, age, size, seed) {
  if (age < 0 || age > 1.3) return;
  const a = 1 - age / 1.3;
  g.save();
  g.strokeStyle = ink(0.8 * a);
  g.lineWidth = 0.9;
  for (let k = 0; k < 8; k++) {
    const ang = Math.PI + (k / 7) * Math.PI;
    const r = size * (0.4 + age * 0.9) * (0.6 + 0.4 * h1(seed + k));
    const cx = x + Math.cos(ang) * r * 0.95;
    const cy = y + Math.sin(ang) * r * 0.45 - age * 7;
    const rr = size * 0.3 * (0.6 + age);
    g.beginPath();
    g.arc(cx, cy, rr, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    // engraved shading on the underside of each puff
    g.beginPath();
    for (let j = 1; j < 3; j++) {
      g.moveTo(cx - rr * 0.7, cy + j * 1.8 - 1);
      g.lineTo(cx + rr * 0.7, cy + j * 1.8 - 1);
    }
    g.stroke();
  }
  g.fillStyle = ink(0.65 * a);
  for (let k = 0; k < 18; k++) {
    const ang = Math.PI * (1 + h1(seed * 3 + k));
    const r = size * (0.2 + age) * h1(seed + k * 7.1);
    g.fillRect(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.5 - age * 4, 1.2, 1.2);
  }
  g.restore();
}

function drawKnightGroup(g, T) {
  const X = horseX(T);
  const gy = crestY(X) + 1;
  const pose = horsePose(T);
  const ks = knightState(T);
  const riderless = ks.mode !== 'ride';

  // gallop dust behind the hooves, skid dust at the catch
  if (T > CHARGE_T0 && T < T_CATCH + 1.4) {
    for (let k = 0; k < 6; k++) {
      const tk = CHARGE_T0 + 0.22 + k * 0.26;
      if (tk > T_CATCH) break;
      const hx = horseX(tk);
      drawDust(g, hx - 40 * KF, crestY(hx), T - tk, 16, k * 13);
    }
  }
  drawDust(g, X_CATCH + 34, crestY(X_CATCH) + 1, T - T_CATCH - 0.05, 26, 77);

  g.save();
  g.translate(X, gy);
  g.scale(KF, KF);
  const hp = drawQuadruped(g, 0, 0, pose, { sc: 1, saddle: true });
  if (!riderless) {
    const lower = sstep(0.9, 1.7, T);
    const ang = lerp(-1.3, BETA_C, lower) + (T > CHARGE_T0 ? 0.015 * Math.sin((T - CHARGE_T0) * GALLOP_HZ * TAU) : 0);
    const J = riderJoints(hp, T, ang);
    drawKnight(g, J);
    const dir = P(Math.cos(ang), Math.sin(ang));
    const tip = P(J.grip.x + dir.x * LANCE_F, J.grip.y + dir.y * LANCE_F);
    const butt = P(J.grip.x - dir.x * LANCE_B, J.grip.y - dir.y * LANCE_B);
    drawLance(g, butt, tip);
    drawKnightArm(g, J);
    g.restore();
    return;
  }
  // empty saddle: stirrup dangling
  {
    const s0 = hp.T(P(-4, -58));
    const s1 = hp.T(P(-2, -30));
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(s0.x, s0.y);
    g.lineTo(s1.x, s1.y);
    g.stroke();
    g.beginPath();
    g.arc(s1.x, s1.y + 2, 2.5, 0, TAU);
    g.stroke();
  }
  g.restore();

  if (ks.mode === 'hang') {
    const J = lerpJoints(SEATED_REL, hangingJoints(T), ks.blend);
    const u = P(ks.stuck.x - ks.G.x, ks.stuck.y - ks.G.y);
    const L = Math.hypot(u.x, u.y) || 1;
    u.x /= L;
    u.y /= L;
    g.save();
    g.translate(ks.G.x, ks.G.y);
    g.scale(KF, KF);
    g.rotate(ks.swing);
    drawKnight(g, J);
    g.restore();
    drawLance(g, P(ks.G.x - u.x * LANCE_B * KF, ks.G.y - u.y * LANCE_B * KF), ks.stuck, 2.6 * KF, false);
    g.save();
    g.translate(ks.G.x, ks.G.y);
    g.scale(KF, KF);
    g.rotate(ks.swing);
    drawKnightArm(g, J);
    g.restore();
    // splinters + a jolt of cut lines at the moment of impact
    if (ks.tau < 0.55) {
      const a = 1 - ks.tau / 0.55;
      g.save();
      g.strokeStyle = INK;
      g.lineCap = 'round';
      g.globalAlpha = a;
      for (let k = 0; k < 10; k++) {
        const ang = -Math.PI * 0.95 + k * 0.31 + 0.2 * h1(k);
        const r0 = 8 + ks.tau * (70 + 40 * h1(k + 5));
        g.lineWidth = 1.4 - 0.08 * k;
        g.beginPath();
        g.moveTo(ks.stuck.x + Math.cos(ang) * r0, ks.stuck.y + Math.sin(ang) * r0 + ks.tau * ks.tau * 120);
        g.lineTo(ks.stuck.x + Math.cos(ang + 0.4) * (r0 + 6), ks.stuck.y + Math.sin(ang + 0.4) * (r0 + 6) + ks.tau * ks.tau * 120);
        g.stroke();
      }
      g.restore();
    }
    return;
  }
  // the middle piece of the broken lance tumbles down
  {
    const tauS = T - T_SNAP;
    const st = ks.snap;
    const a0 = st.alpha;
    const p0 = P(st.stuck.x + Math.cos(a0) * 10, st.stuck.y + Math.sin(a0) * 10 - 20);
    const fall = 0.8;
    const tt = Math.min(tauS, fall);
    const gyp = crestY(p0.x + 60) - 3;
    const c = P(p0.x + 75 * tt, p0.y - 120 * tt + 0.5 * 1150 * tt * tt);
    let ang = 1.2 + tt * 8;
    if (tauS >= fall || c.y > gyp) {
      c.y = gyp;
      c.x = p0.x + 75 * fall;
      ang = 0.06;
    }
    const d = P(Math.cos(ang) * 32, Math.sin(ang) * 32);
    drawLance(g, P(c.x - d.x, c.y - d.y), P(c.x + d.x, c.y + d.y), 2.4 * KF, false);
  }
  if (ks.mode === 'fly') {
    const J = hangingJoints(T * 1.6);
    g.save();
    g.translate(ks.C.x, ks.C.y);
    g.scale(KF, KF);
    g.rotate(ks.spin);
    g.translate(0, -40);
    drawKnight(g, J);
    drawLance(g, P(-4, 18), P(6, -32), 2.6, false); // stub still in his fist
    drawKnightArm(g, J);
    g.restore();
    return;
  }
  // down: sprawled on his back, legs in the air, shield on his chest
  const L0 = ks.land;
  drawDust(g, L0.x, L0.y, ks.since, 40, 91);
  drawDust(g, L0.x + 30, L0.y + 2, ks.since - 0.08, 26, 37);
  const wob = Math.sin(ks.since * 9) * Math.exp(-ks.since * 2.2) * 0.12;
  const kick = Math.sin(ks.since * 11) * Math.exp(-ks.since * 0.7);
  const J = {
    facing: -1,
    hip: P(10, -6),
    sh: P(-18, -8),
    head: { x: -29, y: -11, a: -Math.PI / 2 + 0.35 },
    nKnee: P(22 + 3 * kick, -26),
    nFoot: P(32 + 5 * kick, -44),
    fKnee: P(17 - 2 * kick, -24),
    fFoot: P(10 - 4 * kick, -43),
    nElbow: P(-12, -22),
    nHand: P(-5, -32 - 4 * kick),
    fElbow: P(-25, -18),
    fHand: P(-33, -24),
    shield: { x: -4, y: -14, a: 1.45 },
  };
  g.save();
  g.translate(L0.x, L0.y);
  g.scale(KF, KF);
  g.rotate(wob);
  drawKnight(g, J);
  drawLance(g, J.nHand, P(J.nHand.x + 20, J.nHand.y - 20), 2.6, false);
  drawKnightArm(g, J);
  g.restore();
}

/** Broken lance stub still jammed in the sail after the snap (rides round forever). */
function drawStuckTip(g, T) {
  if (T < T_SNAP) return;
  const th = sailAngle(T, 0);
  const p = sailPoint(th, STUCK.r, STUCK.n);
  const st = knightState(T_SNAP - 1e-4);
  const rel = st.alpha - sailAngle(T_SNAP, 0);
  const a = th + rel;
  const end = P(p.x + Math.cos(a) * 34 * KX, p.y + Math.sin(a) * 34);
  drawLance(g, end, p, 2.6 * KF, false);
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(end.x, end.y);
  g.lineTo(end.x + Math.cos(a + 2.5) * 5, end.y + Math.sin(a + 2.5) * 5);
  g.moveTo(end.x, end.y);
  g.lineTo(end.x + Math.cos(a - 2.6) * 6, end.y + Math.sin(a - 2.6) * 6);
  g.moveTo(end.x, end.y);
  g.lineTo(end.x + Math.cos(a) * 5, end.y + Math.sin(a) * 5);
  g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// birds: rooks lifting off the cap when the lance strikes
// ---------------------------------------------------------------------------
function drawBirds(g, T) {
  g.save();
  g.fillStyle = INK;
  g.strokeStyle = INK;
  g.lineCap = 'round';
  const flock = 7;
  for (let i = 0; i < flock; i++) {
    const t0 = T_CATCH + 0.05 + i * 0.07;
    const tau = T - t0;
    let x;
    let y;
    let flap;
    if (tau < 0) {
      // perched on the cap
      x = TX - 30 + i * 9;
      y = CAP.rim - 6 - (CAP.rim - CAP.apex.y) * (1 - Math.abs(x - CAP.apex.x) / CAP.r) * 0.85 - 2;
      flap = 0;
      g.beginPath();
      g.ellipse(x, y, 2.6, 1.8, 0.3, 0, TAU);
      g.fill();
      continue;
    }
    const dirx = -60 - 25 * h1(i);
    const diry = -50 - 30 * h1(i + 9);
    x = TX - 30 + i * 9 + dirx * tau + Math.sin(tau * 2 + i) * 10;
    y = CAP.rim - 30 + diry * tau + 6 * tau * tau;
    flap = Math.sin(tau * 16 + i * 1.3);
    const s = 1 + 0.15 * h1(i + 3);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x - 7 * s, y - 3 * flap * s);
    g.quadraticCurveTo(x - 3 * s, y - 2 * s, x, y);
    g.quadraticCurveTo(x + 3 * s, y - 2 * s, x + 7 * s, y - 3 * flap * s);
    g.stroke();
  }
  // a few rooks wheeling high over the plain all the time
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 60 + Math.sin(T * 0.4 + i * 2) * 40 + T * 4;
    const y = 120 + i * 16 + Math.cos(T * 0.5 + i) * 10;
    const flap = Math.sin(T * 7 + i * 2);
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(x - 5, y - 2.5 * flap);
    g.quadraticCurveTo(x - 2, y - 1.5, x, y);
    g.quadraticCurveTo(x + 2, y - 1.5, x + 5, y - 2.5 * flap);
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------------------
// THE RIDER — the spoonbill engraved as a book-plate figure
// ---------------------------------------------------------------------------
function cubicPts(p0, p1, p2, p3, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const iu = 1 - u;
    out.push(
      P(
        iu * iu * iu * p0.x + 3 * iu * iu * u * p1.x + 3 * iu * u * u * p2.x + u * u * u * p3.x,
        iu * iu * iu * p0.y + 3 * iu * iu * u * p1.y + 3 * iu * u * u * p2.y + u * u * u * p3.y,
      ),
    );
  }
  return out;
}

function drawRiderEngraved(g, rig, kit, scene) {
  const s = rig.root.scale;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const line = (a, b, w, c = INK) => {
    g.strokeStyle = c;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
  };
  // pole + mini post-mill rotor
  line(rig.poleBase, rig.poleTop, 2.6);
  line(P(rig.poleBase.x - 0.6, rig.poleBase.y - 0.5), P(rig.poleTop.x - 0.6, rig.poleTop.y - 0.5), 0.6, PAPER);
  kit.drawPinwheel(g, rig.pinHub, rig.pinwheelAngle, {
    ...(scene.pinwheel || { type: 'post' }),
    colors: [PAPER],
    stroke: INK,
    lineWidth: 1.15,
  });
  g.fillStyle = INK;
  g.beginPath();
  g.arc(rig.pinHub.x, rig.pinHub.y, 2.6 * s, 0, TAU);
  g.fill();

  const crank = (pedal) => {
    line(rig.bb, pedal, 3);
    line(P(pedal.x - 7 * s, pedal.y + 1.5 * s), P(pedal.x + 7 * s, pedal.y + 1.5 * s), 3.4);
  };
  const leg = (hip, knee, foot, far) => {
    g.strokeStyle = INK;
    g.lineWidth = 3.6 * s;
    g.beginPath();
    g.moveTo(hip.x, hip.y);
    g.lineTo(knee.x, knee.y);
    g.lineTo(foot.x, foot.y);
    g.stroke();
    if (!far) {
      g.strokeStyle = PAPER;
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(hip.x - 0.8, hip.y - 0.4);
      g.lineTo(knee.x - 0.8, knee.y - 0.6);
      g.lineTo(foot.x - 1, foot.y - 0.6);
      g.stroke();
    }
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(foot.x, foot.y);
    g.lineTo(foot.x + 13 * s, foot.y + 2.5 * s);
    g.moveTo(foot.x, foot.y);
    g.lineTo(foot.x + 10 * s, foot.y + 5 * s);
    g.moveTo(foot.x, foot.y);
    g.lineTo(foot.x - 6 * s, foot.y + 2 * s);
    g.stroke();
  };
  crank(rig.farPedal);
  leg(rig.farHip, rig.farKnee, rig.farFoot, true);

  // wheels: engraved tyre with a white cut, fine spokes
  for (const w of [rig.rearWheel, rig.frontWheel]) {
    g.strokeStyle = INK;
    g.lineWidth = 0.7;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = rig.wheelAngle + (i * TAU) / 16;
      const a2 = a + 0.18;
      g.moveTo(w.x + Math.cos(a) * 3, w.y + Math.sin(a) * 3);
      g.lineTo(w.x + Math.cos(a2) * (w.r - 4), w.y + Math.sin(a2) * (w.r - 4));
    }
    g.stroke();
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(w.x, w.y, w.r - 4.2, 0, TAU);
    g.stroke();
    g.lineWidth = 4.4;
    g.beginPath();
    g.arc(w.x, w.y, w.r - 0.6, 0, TAU);
    g.stroke();
    g.strokeStyle = PAPER;
    g.lineWidth = 0.9;
    g.beginPath();
    g.arc(w.x, w.y, w.r - 0.9, Math.PI * 1.05, Math.PI * 1.55);
    g.stroke();
    g.fillStyle = INK;
    g.beginPath();
    g.arc(w.x, w.y, 3.6, 0, TAU);
    g.fill();
    g.fillStyle = PAPER;
    g.beginPath();
    g.arc(w.x - 0.8, w.y - 0.8, 1.1, 0, TAU);
    g.fill();
  }
  // chainring + chain
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(rig.bb.x, rig.bb.y, 11 * s, 0, TAU);
  g.moveTo(rig.rearWheel.x, rig.rearWheel.y - 4.5 * s);
  g.lineTo(rig.bb.x, rig.bb.y - 11 * s);
  g.moveTo(rig.rearWheel.x, rig.rearWheel.y + 4.5 * s);
  g.lineTo(rig.bb.x, rig.bb.y + 11 * s);
  g.stroke();
  // frame tubes: black with a white highlight cut
  const tube = (a, b, w) => {
    line(a, b, w);
    line(P(a.x - 0.5, a.y - 0.7), P(b.x - 0.5, b.y - 0.7), 0.75, PAPER);
  };
  tube(rig.rearWheel, rig.seatCluster, 3.4);
  tube(rig.seatCluster, rig.bb, 3.6);
  tube(rig.bb, rig.rearWheel, 3.2);
  tube(rig.seatCluster, rig.headTop, 3.6);
  tube(rig.headBot, rig.bb, 3.8);
  tube(rig.headTop, rig.headBot, 4);
  tube(rig.headBot, rig.frontWheel, 3.2);
  line(rig.seatCluster, rig.saddle, 3);
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(rig.headTop.x, rig.headTop.y);
  g.lineTo(rig.stemTop.x, rig.stemTop.y);
  g.quadraticCurveTo(rig.stemTop.x - 5 * s, rig.stemTop.y - 5 * s, rig.grip.x, rig.grip.y);
  g.stroke();
  line(P(rig.saddle.x - 12 * s, rig.saddle.y), P(rig.saddle.x + 11 * s, rig.saddle.y + 1 * s), 5.5);

  // tail + body
  const b = rig.body;
  const tail = new Path2D();
  tail.moveTo(b.x - b.rx * 0.6, b.y - b.ry * 0.35);
  tail.lineTo(rig.tailTip.x, rig.tailTip.y);
  tail.lineTo(b.x - b.rx * 0.55, b.y + b.ry * 0.45);
  tail.closePath();
  g.fillStyle = PAPER;
  g.fill(tail);
  hatchIn(g, tail, pathBB([rig.tailTip, P(b.x, b.y - b.ry), P(b.x, b.y + b.ry)], 4), 0.5, 2.2, 0.75);
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  g.stroke(tail);
  const body = new Path2D();
  body.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  g.fillStyle = PAPER;
  g.fill(body);
  const bbb = [b.x - b.rx - 4, b.y - b.ry - 6, b.x + b.rx + 4, b.y + b.ry + 6];
  shadeCrescent(g, body, bbb, -5, -9, -0.42, 2.3, 0.8);
  shadeCrescent(g, body, bbb, -2, -17, 0.55, 2.6, 0.7);
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.stroke(body);

  // folded far wing on the body
  const sh = rig.wingShoulder;
  const fw = new Path2D();
  fw.moveTo(sh.x, sh.y);
  fw.bezierCurveTo(sh.x - 24 * s, sh.y - 8 * s, sh.x - 58 * s, sh.y + 2 * s, rig.tailTip.x - 4 * s, rig.tailTip.y + 3 * s);
  fw.bezierCurveTo(sh.x - 46 * s, sh.y + 20 * s, sh.x - 16 * s, sh.y + 20 * s, sh.x + 2 * s, sh.y + 10 * s);
  fw.closePath();
  g.fillStyle = PAPER;
  g.fill(fw);
  shadeCrescent(g, fw, [sh.x - 70, sh.y - 14, sh.x + 8, sh.y + 26], -2, -5, -0.3, 2.2, 0.75);
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke(fw);
  g.lineWidth = 0.9;
  g.beginPath();
  for (let k = 0; k < 5; k++) {
    const fx = sh.x - (20 + k * 8) * s;
    g.moveTo(fx, sh.y + (5 + k * 1.4) * s);
    g.quadraticCurveTo(fx - 6 * s, sh.y + (8 + k * 1.3) * s, fx - 13 * s, sh.y + (12 + k * 1.1) * s);
  }
  g.stroke();

  // neck as a tapered polygon (so it can be shaded)
  const np = cubicPts(rig.neckBase, rig.neckC1, rig.neckC2, rig.head, 16);
  const left = [];
  const right = [];
  for (let i = 0; i < np.length; i++) {
    const a = np[Math.max(0, i - 1)];
    const c = np[Math.min(np.length - 1, i + 1)];
    let tx = c.x - a.x;
    let ty = c.y - a.y;
    const L = Math.hypot(tx, ty) || 1;
    tx /= L;
    ty /= L;
    const w = lerp(7.5, 5.2, i / (np.length - 1)) * s;
    left.push(P(np[i].x - ty * w, np[i].y + tx * w));
    right.push(P(np[i].x + ty * w, np[i].y - tx * w));
  }
  const neck = new Path2D();
  polyPath(neck, left.concat(right.reverse()));
  g.fillStyle = PAPER;
  g.fill(neck);
  shadeCrescent(g, neck, pathBB(np, 10), 3, -4, -1.0, 2.1, 0.7);
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.stroke(neck);
  // re-cover the neck root on the body
  g.fillStyle = PAPER;
  g.beginPath();
  g.ellipse(rig.neckBase.x, rig.neckBase.y + 2, 6.5 * s, 5 * s, 0, 0, TAU);
  g.fill();
  // breast patch: a light stipple
  g.fillStyle = ink(0.75);
  for (let k = 0; k < 16; k++) {
    const a = h1(k * 3.1) * TAU;
    const r = Math.sqrt(h1(k * 7.7)) * 7 * s;
    g.fillRect(rig.chest.x - 3 * s + Math.cos(a) * r, rig.chest.y + 1 * s + Math.sin(a) * r * 0.75, 0.9, 0.9);
  }

  // crest plumes
  const cr = rig.crestRoot;
  g.strokeStyle = INK;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cr.x, cr.y);
  g.quadraticCurveTo((cr.x + rig.crestTip1.x) / 2, cr.y - 6 * s, rig.crestTip1.x, rig.crestTip1.y);
  g.moveTo(cr.x, cr.y + 2 * s);
  g.quadraticCurveTo((cr.x + rig.crestTip2.x) / 2, cr.y - 1 * s, rig.crestTip2.x, rig.crestTip2.y);
  g.moveTo(cr.x, cr.y + 1 * s);
  g.quadraticCurveTo((cr.x + rig.crestTip2.x) / 2, cr.y - 3 * s, (rig.crestTip1.x + rig.crestTip2.x) / 2 + 4 * s, (rig.crestTip1.y + rig.crestTip2.y) / 2);
  g.stroke();

  // head
  const h = rig.head;
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(h.x, h.y, h.r, 0, TAU);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.stroke();
  // black facial mask with white engraver's cuts
  const ca = Math.cos(h.angle);
  const sa = Math.sin(h.angle);
  const R = (px, py) => P(h.x + px * ca - py * sa, h.y + px * sa + py * ca);
  const m0 = R(-1, -h.r * 0.95);
  const m1 = R(h.r * 0.95, -h.r * 0.5);
  const m2 = R(h.r * 1.05, h.r * 0.55);
  const m3 = R(h.r * 0.1, h.r * 0.9);
  const m4 = R(-h.r * 0.15, 0);
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(m0.x, m0.y);
  g.quadraticCurveTo(R(h.r * 0.8, -h.r * 1.0).x, R(h.r * 0.8, -h.r * 1.0).y, m1.x, m1.y);
  g.lineTo(m2.x, m2.y);
  g.quadraticCurveTo(R(h.r * 0.6, h.r * 1.0).x, R(h.r * 0.6, h.r * 1.0).y, m3.x, m3.y);
  g.quadraticCurveTo(m4.x - 2 * s, m4.y + 4 * s, m4.x, m4.y);
  g.quadraticCurveTo(m4.x - 1 * s, m4.y - 6 * s, m0.x, m0.y);
  g.closePath();
  g.fill();
  g.strokeStyle = paperA(0.55);
  g.lineWidth = 0.6;
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = R(h.r * (0.15 + k * 0.22), -h.r * (0.75 - k * 0.05));
    const c = R(h.r * (0.25 + k * 0.22), h.r * (0.6 - k * 0.1));
    g.moveTo(a.x, a.y);
    g.quadraticCurveTo(R(h.r * (0.55 + k * 0.15), 0).x, R(h.r * (0.55 + k * 0.15), 0).y, c.x, c.y);
  }
  g.stroke();

  // bill: black spatula with a white ridge cut
  const bb0 = rig.billBase;
  const bt = rig.billTip;
  const d = rig.billDir;
  const nx = -Math.sin(d);
  const ny = Math.cos(d);
  const L = Math.hypot(bt.x - bb0.x, bt.y - bb0.y);
  const ux = (bt.x - bb0.x) / L;
  const uy = (bt.y - bb0.y) / L;
  const spoonC = P(bt.x - ux * 8 * s, bt.y - uy * 8 * s);
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(bb0.x + nx * -4.6 * s, bb0.y + ny * -4.6 * s);
  g.lineTo(spoonC.x - ux * 6 * s + nx * -2.2 * s, spoonC.y - uy * 6 * s + ny * -2.2 * s);
  g.quadraticCurveTo(bt.x + nx * -6.5 * s, bt.y + ny * -6.5 * s, bt.x + ux * 1.5 * s, bt.y + uy * 1.5 * s);
  g.quadraticCurveTo(bt.x + nx * 7.5 * s + ux * -1 * s, bt.y + ny * 7.5 * s + uy * -1 * s, spoonC.x - ux * 6 * s + nx * 2.4 * s, spoonC.y - uy * 6 * s + ny * 2.4 * s);
  g.lineTo(bb0.x + nx * 4.4 * s, bb0.y + ny * 4.4 * s);
  g.closePath();
  g.fill();
  g.strokeStyle = paperA(0.75);
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(bb0.x + ux * 7 * s - nx * 1.6, bb0.y + uy * 7 * s - ny * 1.6);
  g.lineTo(spoonC.x - ux * 5 * s - nx * 1.2, spoonC.y - uy * 5 * s - ny * 1.2);
  g.stroke();
  g.beginPath();
  g.arc(spoonC.x + ux * 1.5 * s, spoonC.y + uy * 1.5 * s, 3.2 * s, d - 2.2, d - 0.9);
  g.stroke();

  // eye: a white ring cut into the mask
  const e = rig.eye;
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(e.x, e.y, 3 * s, 0, TAU);
  g.fill();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(e.x + 0.4 * s, e.y, 1.7 * s, 0, TAU);
  g.fill();
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(e.x - 0.3 * s, e.y - 0.8 * s, 0.6 * s, 0, TAU);
  g.fill();

  // near leg + crank
  crank(rig.nearPedal);
  leg(rig.nearHip, rig.nearKnee, rig.nearFoot, false);

  // near wing reaching for the bar
  const el = rig.wingElbow;
  const hd = rig.wingHand;
  const wing = new Path2D();
  wing.moveTo(sh.x - 12 * s, sh.y - 5 * s);
  wing.bezierCurveTo(el.x - 6 * s, el.y - 16 * s, hd.x - 6 * s, hd.y - 12 * s, hd.x + 4 * s, hd.y - 5 * s);
  wing.quadraticCurveTo(hd.x + 9 * s, hd.y - 1 * s, hd.x + 5 * s, hd.y + 3.5 * s);
  wing.quadraticCurveTo(hd.x + 1 * s, hd.y + 6 * s, hd.x - 3 * s, hd.y + 3 * s);
  wing.quadraticCurveTo(hd.x - 5 * s, hd.y + 8 * s, hd.x - 10 * s, hd.y + 4 * s);
  wing.quadraticCurveTo(el.x - 2 * s, el.y + 9 * s, el.x - 9 * s, el.y + 6 * s);
  wing.quadraticCurveTo(el.x - 14 * s, el.y + 13 * s, sh.x - 8 * s, sh.y + 12 * s);
  wing.quadraticCurveTo(sh.x - 18 * s, sh.y + 12 * s, sh.x - 20 * s, sh.y + 5 * s);
  wing.closePath();
  g.fillStyle = PAPER;
  g.fill(wing);
  shadeCrescent(g, wing, [sh.x - 26, Math.min(sh.y, hd.y) - 18, hd.x + 12, Math.max(sh.y, el.y) + 18], -1, -5, -0.25, 2.1, 0.75);
  g.strokeStyle = INK;
  g.lineWidth = 1.3;
  g.stroke(wing);
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(sh.x - 10 * s, sh.y + 3 * s);
  g.quadraticCurveTo(el.x - 4 * s, el.y - 4 * s, hd.x - 4 * s, hd.y - 2 * s);
  g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 5.6 : params.rawLocalT;
  const sky = getSky(kit);
  const land = getLand(kit);
  const plate = getPlate(kit);

  ctx.save();
  ctx.save();
  ctx.beginPath();
  ctx.rect(IMG.x0, IMG.y0, IMG.x1 - IMG.x0, IMG.y1 - IMG.y0);
  ctx.clip();
  // the sky drifts with the wind (left -> right)
  const drift = clamp(T + 8, 0, 26) * 6.2;
  ctx.drawImage(sky, Math.round(-SKY_PAD + drift), 0);
  drawBirdsBehind(ctx, T);
  ctx.drawImage(land, 0, 0);
  drawFarSails(ctx, T);
  drawMainSails(ctx, kit, T);
  drawStuckTip(ctx, T);
  drawBirds(ctx, T);
  drawSancho(ctx, T);
  drawKnightGroup(ctx, T);
  ctx.restore();
  ctx.drawImage(plate, 0, 0);

  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params, { arch: 0 });
    drawRiderEngraved(ctx, rig, kit, scene);
  }
  ctx.restore();
}

function drawBirdsBehind() {
  // (reserved: distant birds are drawn with the main flock)
}
