// src/scenes/china.js
// #06 · 明清 · 中國立帆式風車 — Chinese vertical-axis sail windmill of the coastal salt works.
//
// Medium: ink & light-colour painting (淺絳) on aged silk — tapered "bone" brush lines,
// soft bleeding washes of ochre (赭石) and indigo (花青), dry-brush (飛白) and hemp-fibre
// texture strokes (披麻皴), moss dots (苔點), generous empty silk (留白), a vertical
// calligraphic colophon and red seals.
//
// Machine (historically): a tall vertical wooden shaft (立軸) carries an octagonal frame
// of radial spokes (upper + lower) ending in eight masts. On each mast hangs a junk-type
// mat sail stiffened by bamboo battens. The sails pivot freely on their masts: on the side
// that runs downwind a sheet (rope to the shaft) holds each sail square to the wind; on the
// return side it swings loose and weathercocks edge-on — so the rotor turns whatever the
// wind direction. At the foot a large horizontal crown gear (平輪, peg teeth) drives a
// lantern pinion on the head axle of a square-pallet chain pump (翻車 / 龍骨水車) that
// lifts sea water from a tidal creek into the evaporation pans.
//
// Gag (bar 3): a mud crab scuttles onto the dike path — the spoonbill hops the front wheel,
// then the rear wheel over it; the crab ducks twice, then shakes its claws at the bike.
// The salt workers stop raking and shade their eyes.

const P = 1000;
const ROAD_Y = 700;
const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;

const C = {
  silk: '#e3d3af',
  ink: '#1c1915',
  ink2: '#3b342b',
  ochre: '#9c6535',
  ochreL: '#c39561',
  ochreXL: '#dbc195',
  indigo: '#4c6774',
  indigoL: '#87a0a6',
  indigoXL: '#b5c2bb',
  red: '#b02f28',
  gamboge: '#d4a239',
  white: '#f7f1e2',
  skin: '#d9b48a',
};

// --- wind & sail feathering ---------------------------------------------------
// Wind blows mostly towards the viewer (+z) and a little to the right (+x).
const WIND = (() => {
  const x = 0.36;
  const z = 0.93;
  const l = Math.hypot(x, z);
  return { x: x / l, z: z / l };
})();
const BETA = Math.atan2(WIND.z, WIND.x);
// masts move with velocity (-sin φ, cos φ); the downwind-going (driving) side is centred here
const PHI_DRIVE = BETA - HALF_PI;

// --- machine placements --------------------------------------------------------
const MILL = { cx: 556, gy: 642, s: 1, ky: 0.24, R: 222, Ws: 132, hb: 72, ht: 262, top: 376, gh: 24, Rg: 82, pr: 17, alpha: 1 };
const MILL2 = { cx: 236, gy: 488, s: 0.28, ky: 0.24, R: 222, Ws: 132, hb: 72, ht: 262, top: 376, alpha: 0.62 };
const MILL3 = { cx: 676, gy: 433, s: 0.14, ky: 0.24, R: 222, Ws: 132, hb: 72, ht: 262, top: 376, alpha: 0.45 };

// chain pump (翻車): head sprocket next to the pinion, tail dipping into the creek
const PUMP_TAIL = { x: 868, y: 684 };

// crab gag
const CRAB_X = 646;
const CRAB_S = 1.35;
const BURROW = { x: 712, y: 744 };

// --- inscription ----------------------------------------------------------------
const TITLE = '借風汲鹵';
const COLOPHON = ['海隅斥鹵之地豎木作軸', '張帆八面風至則輪自轉', '引翻車汲潮入池曝日成鹽'];
const SIGN = '琵鷺生寫';
const SEALS = '乘風琵鷺騎行';
const ALL_TEXT = TITLE + COLOPHON.join('') + SIGN + SEALS;

// Preload the CJK glyph slices this panel needs (the boot loader only knows the
// era captions). Runs at module evaluation, i.e. before boot awaits document.fonts.ready.
if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
  try {
    document.fonts.load('400 40px "LXGW WenKai TC"', ALL_TEXT).catch(() => {});
    document.fonts.load('700 40px "LXGW WenKai TC"', ALL_TEXT).catch(() => {});
    document.fonts.load('900 40px "Noto Serif TC"', SEALS).catch(() => {});
  } catch (e) {
    /* offline: fall back silently */
  }
}

let _fontsOk = false;
function fontsReady() {
  if (_fontsOk) return true;
  try {
    _fontsOk = document.fonts.check('400 40px "LXGW WenKai TC"', ALL_TEXT) && document.fonts.check('900 40px "Noto Serif TC"', SEALS);
    return _fontsOk;
  } catch (e) {
    return true;
  }
}

// =============================================================================
// small math helpers (self-contained, deterministic)
// =============================================================================
function h1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function vnoise(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return h1(i) * (1 - u) + h1(i + 1) * u;
}
function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function sstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpP(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const _rgbaCache = new Map();
function rgba(hex, a) {
  const k = hex + a.toFixed(3);
  let v = _rgbaCache.get(k);
  if (!v) {
    const [r, g, b] = hexRgb(hex);
    v = `rgba(${r},${g},${b},${a.toFixed(3)})`;
    _rgbaCache.set(k, v);
  }
  return v;
}
function quadPts(p0, p1, p2, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = (1 - u) * (1 - u);
    const b = 2 * u * (1 - u);
    const c = u * u;
    out.push({ x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y });
  }
  return out;
}
function cubicPts(p0, p1, p2, p3, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const iu = 1 - u;
    out.push({
      x: iu * iu * iu * p0.x + 3 * iu * iu * u * p1.x + 3 * iu * u * u * p2.x + u * u * u * p3.x,
      y: iu * iu * iu * p0.y + 3 * iu * iu * u * p1.y + 3 * iu * u * u * p2.y + u * u * u * p3.y,
    });
  }
  return out;
}
/** resample a polyline to roughly `step` px spacing */
function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) out.push(lerpP(a, b, k / n));
  }
  return out;
}

// =============================================================================
// brush primitives
// =============================================================================
/**
 * Tapered "bone" brush stroke: filled outline of a variable-width stroke.
 * o.base  width factor at the entry (press), o.tip width factor at the exit,
 * o.t0/o.t1 fraction of length used by entry/exit tapers, o.jit width jitter, o.seed.
 */
function taper(ctx, pts, w, o = {}) {
  const n = pts.length;
  if (n < 2) return;
  const L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = L[n - 1] || 1;
  const t0 = o.t0 ?? 0.18;
  const t1 = o.t1 ?? 0.35;
  const base = o.base ?? 0.45;
  const tip = o.tip ?? 0.08;
  const jit = o.jit ?? 0;
  const seed = o.seed ?? 0;
  const lx = [];
  const ly = [];
  const rx = [];
  const ry = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i > 0 ? i - 1 : 0];
    const b = pts[i < n - 1 ? i + 1 : n - 1];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl;
    dy /= dl;
    const u = L[i] / total;
    let f = 1;
    if (u < t0) f = base + (1 - base) * Math.sin((u / t0) * HALF_PI);
    else if (u > 1 - t1) f = tip + (1 - tip) * Math.cos(((u - (1 - t1)) / t1) * HALF_PI);
    if (jit) f *= 1 + jit * (vnoise(L[i] * 0.08 + seed * 13.1) - 0.5);
    const hw = 0.5 * w * f;
    lx.push(pts[i].x - dy * hw);
    ly.push(pts[i].y + dx * hw);
    rx.push(pts[i].x + dy * hw);
    ry.push(pts[i].y - dx * hw);
  }
  ctx.beginPath();
  ctx.moveTo(lx[0], ly[0]);
  for (let i = 1; i < n; i++) ctx.lineTo(lx[i], ly[i]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(rx[i], ry[i]);
  ctx.closePath();
  ctx.fill();
}
/** two-point taper (adds a mid point so the profile works) */
function seg(ctx, a, b, w, o) {
  taper(ctx, [a, lerpP(a, b, 0.33), lerpP(a, b, 0.66), b], w, o);
}

/** Dry brush (飛白): many hairs with gaps that grow towards the end. Bake-time only. */
function dryBrush(g, ptsIn, w, color, rng, o = {}) {
  const pts = resample(ptsIn, o.step || 2.5);
  const n = pts.length;
  if (n < 2) return;
  const nx = [];
  const ny = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i > 0 ? i - 1 : 0];
    const b = pts[i < n - 1 ? i + 1 : n - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    nx.push(-dy / l);
    ny.push(dx / l);
  }
  const hairs = o.hairs || Math.max(3, Math.round(w * 1.3));
  const dry0 = o.dry ?? 0.22;
  const dry1 = o.dryEnd ?? 0.62;
  const freq = o.freq ?? 0.25;
  g.save();
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let k = 0; k < hairs; k++) {
    const off = (hairs === 1 ? 0 : k / (hairs - 1) - 0.5) * w;
    const seed = rng() * 1000;
    g.globalAlpha = (o.alpha ?? 0.85) * (0.4 + 0.6 * rng());
    g.lineWidth = (o.hair ?? 1.2) * (0.55 + 0.9 * rng());
    g.beginPath();
    let on = false;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const tp = Math.sin(clamp(Math.min(u / 0.1, (1 - u) / 0.25), 0, 1) * HALF_PI);
      const thr = dry0 + (dry1 - dry0) * u + Math.abs(off / w) * 0.25;
      const v = vnoise(i * freq + seed);
      const x = pts[i].x + nx[i] * off * (0.35 + 0.65 * tp);
      const y = pts[i].y + ny[i] * off * (0.35 + 0.65 * tp);
      if (v > thr) {
        if (!on) {
          g.moveTo(x, y);
          on = true;
        } else g.lineTo(x, y);
      } else on = false;
    }
    g.stroke();
  }
  g.restore();
}

/** cluster of moss dots (苔點) */
function mossDots(g, x, y, count, spread, rng, alpha = 0.85, size = 1.8) {
  g.save();
  for (let i = 0; i < count; i++) {
    const a = rng() * TAU;
    const r = Math.sqrt(rng()) * spread;
    const px = x + Math.cos(a) * r * 1.6;
    const py = y + Math.sin(a) * r * 0.6;
    g.fillStyle = rgba(C.ink, alpha * (0.5 + 0.5 * rng()));
    g.beginPath();
    g.ellipse(px, py, size * (0.7 + 0.8 * rng()), size * (0.45 + 0.4 * rng()), -0.4 + rng() * 0.8, 0, TAU);
    g.fill();
  }
  g.restore();
}

// =============================================================================
// washes (bake-time): shape -> absorbency mask -> blurred blit
// =============================================================================
function makeWasher(kit, g) {
  // the scratch canvas is sized to each wash's bounding box (blurring a full-panel
  // layer per wash made the first bake take > 1 s)
  let tmp = kit.createCanvas(256, 256);
  let tg = tmp.getContext('2d');
  let small = kit.createCanvas(64, 64);
  let sm = small.getContext('2d');
  const absorb = kit.bake('china_absorb', P, P, (ng) => {
    const lw = 160;
    const small = kit.createCanvas(lw, lw);
    const sg = small.getContext('2d');
    const img = sg.createImageData(lw, lw);
    for (let y = 0; y < lw; y++) {
      for (let x = 0; x < lw; x++) {
        const v = kit.fbm2(x * 0.07, y * 0.07, 4, 5);
        const a = 120 + 135 * clamp((v - 0.28) / 0.48, 0, 1);
        const i = (y * lw + x) * 4;
        img.data[i] = 0;
        img.data[i + 1] = 0;
        img.data[i + 2] = 0;
        img.data[i + 3] = a;
      }
    }
    sg.putImageData(img, 0, 0);
    ng.imageSmoothingEnabled = true;
    ng.drawImage(small, 0, 0, P, P);
  });
  return function wash(shapeFn, fill, alpha, blur = 0, bbox = null, useAbsorb = true) {
    const [bx, by, bw, bh] = bbox || [0, 0, P, P];
    const x0 = Math.max(0, Math.floor(bx - blur * 3));
    const y0 = Math.max(0, Math.floor(by - blur * 3));
    const x1 = Math.min(P, Math.ceil(bx + bw + blur * 3));
    const y1 = Math.min(P, Math.ceil(by + bh + blur * 3));
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    if (tmp.width < w || tmp.height < h) {
      tmp = kit.createCanvas(Math.max(w, tmp.width), Math.max(h, tmp.height));
      tg = tmp.getContext('2d');
    }
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    tg.globalAlpha = 1;
    tg.clearRect(0, 0, w, h);
    tg.setTransform(1, 0, 0, 1, -x0, -y0);
    tg.fillStyle = fill;
    tg.strokeStyle = fill;
    shapeFn(tg);
    tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-over';
    if (useAbsorb) {
      tg.globalCompositeOperation = 'destination-in';
      tg.drawImage(absorb, x0, y0, w, h, 0, 0, w, h);
      tg.globalCompositeOperation = 'source-over';
    }
    g.save();
    g.globalAlpha = alpha;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    if (blur > 0) {
      // soft edges by down/up-sampling (ctx.filter blur cost ~1 s for this bake)
      const f = clamp(1 / (1 + blur * 0.9), 1 / 14, 1);
      const sw = Math.max(2, Math.round(w * f));
      const sh = Math.max(2, Math.round(h * f));
      if (small.width < sw || small.height < sh) {
        small = kit.createCanvas(Math.max(sw, small.width), Math.max(sh, small.height));
        sm = small.getContext('2d');
      }
      sm.globalCompositeOperation = 'source-over';
      sm.clearRect(0, 0, sw, sh);
      sm.imageSmoothingEnabled = true;
      sm.imageSmoothingQuality = 'high';
      sm.drawImage(tmp, 0, 0, w, h, 0, 0, sw, sh);
      g.drawImage(small, 0, 0, sw, sh, x0, y0, w, h);
    } else {
      g.drawImage(tmp, 0, 0, w, h, x0, y0, w, h);
    }
    g.restore();
  };
}

function polyPath(g, pts) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
}

// =============================================================================
// salt-pan field geometry (oblique 界畫 projection: depth recedes up-left)
// =============================================================================
const PAN_ROWS = [455, 467, 481, 498, 518, 542, 570, 603, 640];
const PAN_SLANT = 0.62; // x shift per px of rise
const PAN_COL = 150;
function panX(u, y) {
  return u - (640 - y) * PAN_SLANT;
}

// =============================================================================
// background (static) — painted once
// =============================================================================
function paintBackground(kit, g, rng) {
  const wash = makeWasher(kit, g);

  // ---- silk ground
  const sky = g.createLinearGradient(0, 0, 0, P);
  sky.addColorStop(0, '#ddcca6');
  sky.addColorStop(0.35, '#e4d5b2');
  sky.addColorStop(0.7, '#e2d2ad');
  sky.addColorStop(1, '#d9c7a0');
  g.fillStyle = sky;
  g.fillRect(0, 0, P, P);

  // faint atmospheric indigo haze over the sea horizon
  wash(
    (t) => {
      t.beginPath();
      t.ellipse(380, 392, 520, 60, 0, 0, TAU);
      t.fill();
    },
    C.indigoL,
    0.22,
    26,
    [0, 300, P, 180],
  );

  // ---- the sun that dries the brine (曝日): soft vermilion disc
  wash(
    (t) => {
      t.beginPath();
      t.arc(188, 178, 31, 0, TAU);
      t.fill();
    },
    C.red,
    0.5,
    1.6,
    [150, 140, 80, 80],
    false,
  );
  wash(
    (t) => {
      t.beginPath();
      t.ellipse(188, 178, 70, 44, 0, 0, TAU);
      t.fill();
    },
    '#e2a272',
    0.12,
    18,
    [100, 120, 180, 120],
  );
  // ---- drifting cloud vapour (雲氣): long pale washes across the upper sky
  for (const [cx, cy, rx, ry, a] of [
    [430, 238, 300, 14, 0.16],
    [760, 300, 260, 10, 0.12],
    [260, 318, 220, 9, 0.1],
  ]) {
    wash(
      (t) => {
        t.beginPath();
        t.ellipse(cx, cy, rx, ry, 0, 0, TAU);
        t.fill();
      },
      C.ink2,
      a,
      9,
      [cx - rx - 10, cy - ry - 30, rx * 2 + 20, ry * 2 + 60],
    );
  }

  // ---- far islands on the sea horizon (pale ink, soft tops)
  for (const [x0, w, hgt] of [
    [36, 150, 22],
    [150, 120, 14],
    [300, 70, 9],
  ]) {
    wash(
      (t) => {
        t.beginPath();
        t.moveTo(x0, 384);
        for (let k = 0; k <= 20; k++) {
          const u = k / 20;
          t.lineTo(x0 + u * w, 384 - hgt * Math.pow(Math.sin(u * Math.PI), 0.8) * (0.8 + 0.4 * vnoise(u * 6 + x0)));
        }
        t.lineTo(x0 + w, 388);
        t.closePath();
        t.fill();
      },
      C.indigo,
      0.32,
      1.6,
      [x0 - 5, 384 - hgt - 8, w + 10, hgt + 14],
    );
  }

  // ---- far sea (y 378-452): pale indigo wash fading into mist at the horizon
  wash(
    (t) => {
      const gr = t.createLinearGradient(0, 372, 0, 452);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.35, 'rgba(0,0,0,0.65)');
      gr.addColorStop(1, 'rgba(0,0,0,1)');
      t.fillStyle = gr;
      t.fillRect(0, 372, 760, 82);
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = C.indigo;
      t.fillRect(0, 372, 760, 82);
      t.globalCompositeOperation = 'source-over';
    },
    C.indigo,
    0.32,
    3,
    [0, 368, 780, 90],
  );
  // water ripple lines (水紋)
  g.save();
  g.lineCap = 'round';
  for (let row = 0; row < 15; row++) {
    const y = 382 + row * 4.6 + row * row * 0.12;
    const alpha = 0.08 + row * 0.012;
    let x = 30 + rng() * 40;
    while (x < 740 - row * 4) {
      const len = 18 + rng() * 46;
      if (rng() < 0.72) {
        g.strokeStyle = rgba(C.ink, alpha * (0.6 + 0.6 * rng()));
        g.lineWidth = 0.7 + rng() * 0.5;
        g.beginPath();
        for (let k = 0; k <= 8; k++) {
          const px = x + (len * k) / 8;
          const py = y + Math.sin(k * 0.9 + row) * 0.9;
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.stroke();
      }
      x += len + 6 + rng() * 22;
    }
  }
  g.restore();

  // ---- far shore & village on the right (y ~400-432)
  wash(
    (t) => {
      t.beginPath();
      t.moveTo(560, 438);
      let x = 560;
      while (x < P) {
        const y = 426 - 10 * vnoise(x * 0.02 + 3) - 6 * vnoise(x * 0.07);
        t.lineTo(x, y);
        x += 8;
      }
      t.lineTo(P, 446);
      t.lineTo(560, 446);
      t.closePath();
      t.fill();
    },
    C.ink2,
    0.2,
    2.2,
    [550, 395, 450, 55],
  );
  // village trees (點葉) and roofs on the far shore
  for (let i = 0; i < 14; i++) {
    const x = 610 + i * 27 + rng() * 14;
    const y = 424 - 4 * vnoise(x * 0.02 + 3);
    const hgt = 7 + rng() * 9;
    g.strokeStyle = rgba(C.ink, 0.35);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 0.6, y - hgt);
    g.stroke();
    mossDots(g, x, y - hgt - 2, 9, 4.2, rng, 0.3, 1.5);
  }
  for (const [x, y] of [
    [655, 427],
    [742, 424],
    [884, 425],
  ]) {
    g.fillStyle = rgba(C.ink, 0.28);
    g.beginPath();
    g.moveTo(x - 9, y);
    g.lineTo(x - 6, y - 5);
    g.lineTo(x + 7, y - 5);
    g.lineTo(x + 10, y);
    g.closePath();
    g.fill();
  }

  // ---- sea dike (海堤) with a tidal sluice
  wash(
    (t) => {
      t.fillRect(0, 447, P, 9);
    },
    C.ochreL,
    0.45,
    1.2,
    [0, 444, P, 14],
  );
  dryBrush(g, [{ x: 30, y: 448 }, { x: 330, y: 447 }, { x: 640, y: 448.5 }, { x: 980, y: 447 }], 2.2, C.ink, rng, { alpha: 0.42, dry: 0.3, dryEnd: 0.55, hair: 0.8 });
  // sluice gate
  g.fillStyle = rgba(C.ink, 0.5);
  g.fillRect(452, 440, 3, 12);
  g.fillRect(468, 440, 3, 12);
  g.fillStyle = rgba(C.ochre, 0.5);
  g.fillRect(455, 443, 13, 7);
  g.strokeStyle = rgba(C.ink, 0.5);
  g.lineWidth = 1;
  g.strokeRect(449.5, 438.5, 24, 2);

  // ---- salt pans
  paintPans(kit, g, rng, wash);

  // mist band between far pans and the sea dike (雲氣)
  wash(
    (t) => {
      t.beginPath();
      t.ellipse(300, 462, 330, 10, 0, 0, TAU);
      t.ellipse(820, 470, 260, 9, 0, 0, TAU);
      t.fill();
    },
    '#efe5cc',
    0.75,
    7,
    [0, 440, P, 50],
  );

  // ---- creek on the right (tidal inlet that feeds the pump)
  const creekTop = (x) => 662 - 8 * sstep(720, 1000, x) + 2.5 * Math.sin(x * 0.045);
  const creekBot = (x) => 692 - 1.5 * Math.sin(x * 0.03 + 1);
  wash(
    (t) => {
      t.beginPath();
      t.moveTo(724, 678);
      for (let x = 724; x <= P; x += 6) t.lineTo(x, lerp(678, creekTop(x), sstep(724, 790, x)));
      for (let x = P; x >= 724; x -= 6) t.lineTo(x, lerp(678, creekBot(x), sstep(724, 790, x)));
      t.closePath();
      t.fill();
    },
    C.indigo,
    0.42,
    1.6,
    [715, 645, 290, 55],
  );
  // creek banks: far bank dry-brush, reeds
  const farBank = [];
  for (let x = 735; x <= P; x += 12) farBank.push({ x, y: lerp(678, creekTop(x), sstep(724, 790, x)) - 1 });
  dryBrush(g, farBank, 3, C.ink, rng, { alpha: 0.6, dry: 0.25, dryEnd: 0.5 });
  for (let i = 0; i < 26; i++) {
    const x = 770 + rng() * 225;
    if (x > 840 && x < 890) continue;
    const y = creekTop(x) - 1;
    reedTuft(g, x, y, 14 + rng() * 22, rng, 0.55);
  }
  // water sheen lines in the creek
  g.save();
  for (let i = 0; i < 22; i++) {
    const x = 760 + rng() * 230;
    const y = lerp(creekTop(x), creekBot(x), 0.25 + rng() * 0.6);
    g.strokeStyle = rgba(C.white, 0.5);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 8 + rng() * 14, y + 0.3);
    g.stroke();
  }
  g.restore();

  // ---- hut, tamarisk and salt heaps at left
  paintHutAndHeaps(kit, g, rng, wash);

  // ---- mill platform (earth mound) and head channel
  wash(
    (t) => {
      t.beginPath();
      t.ellipse(MILL.cx + 4, MILL.gy + 4, 150, 30, 0, 0, TAU);
      t.fill();
    },
    C.ochreL,
    0.42,
    3,
    [MILL.cx - 170, MILL.gy - 40, 340, 85],
  );
  dryBrush(
    g,
    quadPts({ x: MILL.cx - 148, y: MILL.gy + 6 }, { x: MILL.cx, y: MILL.gy + 46 }, { x: MILL.cx + 150, y: MILL.gy + 4 }, 18),
    3,
    C.ink,
    rng,
    { alpha: 0.5, dry: 0.3, dryEnd: 0.6 },
  );
  // basin + channel carrying the lifted water back to the pans (left)
  wash(
    (t) => {
      t.beginPath();
      t.moveTo(MILL.cx - 26, MILL.gy + 18);
      t.quadraticCurveTo(MILL.cx - 120, MILL.gy + 22, MILL.cx - 190, MILL.gy + 2);
      t.lineTo(MILL.cx - 196, MILL.gy - 6);
      t.quadraticCurveTo(MILL.cx - 120, MILL.gy + 12, MILL.cx - 22, MILL.gy + 8);
      t.closePath();
      t.fill();
      t.beginPath();
      t.ellipse(MILL.cx - 14, MILL.gy + 14, 18, 7, 0, 0, TAU);
      t.fill();
    },
    C.indigo,
    0.5,
    1,
    [MILL.cx - 210, MILL.gy - 20, 230, 50],
  );
  g.strokeStyle = rgba(C.ink, 0.45);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(MILL.cx - 30, MILL.gy + 20);
  g.quadraticCurveTo(MILL.cx - 120, MILL.gy + 25, MILL.cx - 192, MILL.gy + 3);
  g.stroke();

  // ---- dike path (the road) at y = 700, slope and mud flat below
  paintRoadAndForeground(kit, g, rng, wash);

  // ---- far mill platforms
  for (const m of [MILL2, MILL3]) {
    wash(
      (t) => {
        t.beginPath();
        t.ellipse(m.cx, m.gy + 2, 150 * m.s, 26 * m.s, 0, 0, TAU);
        t.fill();
      },
      C.ochre,
      0.3 * m.alpha + 0.1,
      1.5,
      [m.cx - 60, m.gy - 15, 120, 30],
    );
  }
}

function paintPans(kit, g, rng, wash) {
  const rows = PAN_ROWS;
  // cells
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r];
    const y1 = rows[r + 1];
    const depth = 1 - r / (rows.length - 1); // 1 far .. 0 near
    for (let c = -1; c < 9; c++) {
      const u0 = 30 + c * PAN_COL + (r % 2) * 12;
      const u1 = u0 + PAN_COL;
      const quad = [
        { x: panX(u0, y1), y: y1 },
        { x: panX(u1, y1), y: y1 },
        { x: panX(u1, y0), y: y0 },
        { x: panX(u0, y0), y: y0 },
      ];
      if (quad[1].x < 0 || quad[0].x > P + 60) continue;
      // keep the creek zone clear on the near rows at right
      const k = h1(r * 31.7 + c * 7.3);
      let type = k < 0.42 ? 'brine' : k < 0.76 ? 'salt' : 'mud';
      if (r >= 6 && c >= 5) type = 'brine';
      const inset = 2.2 + (1 - depth) * 2.5;
      const q = [
        { x: quad[0].x + inset, y: quad[0].y - inset * 0.6 },
        { x: quad[1].x - inset, y: quad[1].y - inset * 0.6 },
        { x: quad[2].x - inset, y: quad[2].y + inset * 0.5 },
        { x: quad[3].x + inset, y: quad[3].y + inset * 0.5 },
      ];
      const bbox = [Math.min(q[0].x, q[3].x) - 4, y0 - 4, PAN_COL + (y1 - y0) * PAN_SLANT + 12, y1 - y0 + 8];
      if (type === 'brine') {
        wash((t) => polyPath(t, q) || t.fill(), C.indigo, 0.16 + 0.16 * (1 - depth), 1.2, bbox);
        // reflection streak
        const yy = lerp(y0, y1, 0.35 + 0.3 * h1(r + c * 3.1));
        g.strokeStyle = rgba(C.white, 0.45 * (1 - depth * 0.5));
        g.lineWidth = 1 + (1 - depth);
        g.beginPath();
        g.moveTo(panX(u0 + 20, yy), yy);
        g.lineTo(panX(u0 + 20 + 50 + 40 * h1(c + r), yy), yy);
        g.stroke();
      } else if (type === 'salt') {
        wash((t) => polyPath(t, q) || t.fill(), '#fbf7ec', 0.75 - depth * 0.25, 0.8, bbox, false);
        // crust texture: tiny grey flecks & raked furrows
        g.save();
        polyPath(g, q);
        g.clip();
        g.strokeStyle = rgba(C.ink, 0.06 + 0.05 * (1 - depth));
        g.lineWidth = 0.7;
        for (let f = 0; f < 6; f++) {
          const yy = lerp(y0, y1, (f + 0.5) / 6);
          g.beginPath();
          g.moveTo(panX(u0, yy), yy);
          g.lineTo(panX(u1, yy), yy);
          g.stroke();
        }
        for (let f = 0; f < 30; f++) {
          const yy = lerp(y0, y1, rng());
          const xx = panX(u0 + rng() * PAN_COL, yy);
          g.fillStyle = rgba(C.white, 0.9);
          g.fillRect(xx, yy, 1.5, 1.2);
        }
        g.restore();
      } else {
        wash((t) => polyPath(t, q) || t.fill(), C.ochreL, 0.18 + 0.12 * (1 - depth), 1.4, bbox);
      }
    }
  }
  // dikes: horizontal double lines + slanted cross dikes
  g.save();
  g.lineCap = 'round';
  for (let r = 0; r < rows.length; r++) {
    const y = rows[r];
    const depth = 1 - r / (rows.length - 1);
    const a = 0.16 + 0.3 * (1 - depth);
    dryBrush(g, [{ x: 26, y }, { x: 500, y: y + 0.5 }, { x: 990, y }], 1.2 + (1 - depth) * 1.6, C.ink, rng, { alpha: a, dry: 0.2, dryEnd: 0.45, hair: 0.75, freq: 0.15 });
  }
  for (let c = -1; c < 10; c++) {
    for (let r = 0; r < rows.length - 1; r++) {
      const y0 = rows[r];
      const y1 = rows[r + 1];
      const u = 30 + c * PAN_COL + (r % 2) * 12;
      const xa = panX(u, y1);
      const xb = panX(u, y0);
      if (xb < 10 || xa > 995) continue;
      const depth = 1 - r / (rows.length - 1);
      g.strokeStyle = rgba(C.ink, 0.14 + 0.26 * (1 - depth));
      g.lineWidth = 0.8 + (1 - depth) * 0.9;
      g.beginPath();
      g.moveTo(xa, y1);
      g.lineTo(xb, y0);
      g.stroke();
      g.strokeStyle = rgba(C.ochre, 0.18);
      g.lineWidth = 2 + (1 - depth) * 2;
      g.beginPath();
      g.moveTo(xa + 2.5, y1);
      g.lineTo(xb + 2.5, y0);
      g.stroke();
    }
  }
  g.restore();
}

function reedTuft(g, x, y, h, rng, alpha = 0.7) {
  g.save();
  g.fillStyle = rgba(C.ink, alpha);
  const n = 3 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const lean = (rng() - 0.35) * h * 0.7;
    const tip = { x: x + lean, y: y - h * (0.6 + 0.4 * rng()) };
    const mid = { x: x + lean * 0.3 + (rng() - 0.5) * 3, y: (y + tip.y) / 2 };
    taper(g, quadPts({ x: x + (rng() - 0.5) * 4, y }, mid, tip, 8), 1.6 + rng() * 1.4, { base: 0.9, tip: 0.05, t0: 0.05, t1: 0.7 });
  }
  g.restore();
}

function paintHutAndHeaps(kit, g, rng, wash) {
  // tamarisk (檉柳) behind the hut: feathery drooping foliage
  const tx = 64;
  const ty = 612;
  g.fillStyle = rgba(C.ink, 0.75);
  taper(g, quadPts({ x: tx, y: ty }, { x: tx + 6, y: ty - 40 }, { x: tx - 2, y: ty - 78 }, 10), 5, { base: 1, tip: 0.3 });
  taper(g, quadPts({ x: tx + 3, y: ty - 44 }, { x: tx + 20, y: ty - 60 }, { x: tx + 34, y: ty - 70 }, 8), 2.6, { base: 1, tip: 0.2 });
  for (let i = 0; i < 70; i++) {
    const a = rng() * TAU;
    const r = Math.sqrt(rng());
    const cx = tx + 10 + Math.cos(a) * 38 * r;
    const cy = ty - 80 + Math.sin(a) * 22 * r;
    g.strokeStyle = rgba(i % 3 === 0 ? C.indigo : C.ink, 0.18 + 0.25 * rng());
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(cx, cy);
    g.quadraticCurveTo(cx + 2, cy + 6, cx + (rng() - 0.5) * 6, cy + 10 + rng() * 10);
    g.stroke();
  }
  // thatched hut (草寮)
  const hx = 128;
  const hy = 612;
  wash(
    (t) => {
      t.beginPath();
      t.moveTo(hx - 42, hy - 26);
      t.lineTo(hx - 8, hy - 50);
      t.lineTo(hx + 40, hy - 46);
      t.lineTo(hx + 52, hy - 22);
      t.closePath();
      t.fill();
    },
    C.ochre,
    0.5,
    1,
    [hx - 50, hy - 60, 110, 45],
  );
  g.fillStyle = rgba(C.ink, 0.8);
  taper(g, [{ x: hx - 44, y: hy - 24 }, { x: hx - 26, y: hy - 37 }, { x: hx - 8, y: hy - 51 }], 2.4, { base: 0.6 });
  taper(g, [{ x: hx - 8, y: hy - 51 }, { x: hx + 20, y: hy - 49 }, { x: hx + 41, y: hy - 47 }], 2, { base: 0.8 });
  taper(g, [{ x: hx - 8, y: hy - 51 }, { x: hx + 18, y: hy - 37 }, { x: hx + 54, y: hy - 21 }], 2.6, { base: 0.9 });
  for (let i = 0; i < 16; i++) {
    const u = i / 15;
    const p = lerpP({ x: hx - 6, y: hy - 49 }, { x: hx + 50, y: hy - 23 }, u);
    g.strokeStyle = rgba(C.ink, 0.35);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x - 22 + u * 4, p.y + 11 - u * 1);
    g.stroke();
  }
  // walls and door
  g.fillStyle = rgba(C.ochreXL, 0.7);
  g.fillRect(hx - 36, hy - 28, 80, 28);
  g.strokeStyle = rgba(C.ink, 0.75);
  g.lineWidth = 1.3;
  g.beginPath();
  g.moveTo(hx - 36, hy - 27);
  g.lineTo(hx - 36, hy);
  g.moveTo(hx + 44, hy - 22);
  g.lineTo(hx + 44, hy);
  g.stroke();
  g.fillStyle = rgba(C.ink, 0.55);
  g.fillRect(hx + 6, hy - 18, 11, 18);

  // salt heaps (鹽坨): white cones, ink contour, dry-brush shading, one under a straw mat
  const heaps = [
    { x: 92, y: 662, w: 66, h: 56, mat: false },
    { x: 172, y: 656, w: 88, h: 74, mat: true },
    { x: 238, y: 664, w: 54, h: 40, mat: false },
  ];
  for (const hp of heaps) {
    const L = { x: hp.x - hp.w / 2, y: hp.y };
    const T = { x: hp.x + 2, y: hp.y - hp.h };
    const Rr = { x: hp.x + hp.w / 2, y: hp.y };
    g.fillStyle = '#f6f1e3';
    g.beginPath();
    g.moveTo(L.x, L.y);
    g.quadraticCurveTo(hp.x - hp.w * 0.22, hp.y - hp.h * 0.7, T.x, T.y);
    g.quadraticCurveTo(hp.x + hp.w * 0.25, hp.y - hp.h * 0.68, Rr.x, Rr.y);
    g.quadraticCurveTo(hp.x, hp.y + 6, L.x, L.y);
    g.fill();
    // shade on the right flank
    wash(
      (t) => {
        t.beginPath();
        t.moveTo(T.x, T.y + 4);
        t.quadraticCurveTo(hp.x + hp.w * 0.25, hp.y - hp.h * 0.68, Rr.x, Rr.y);
        t.lineTo(hp.x + 6, hp.y + 2);
        t.closePath();
        t.fill();
      },
      C.indigoL,
      0.35,
      2,
      [hp.x - 10, hp.y - hp.h - 6, hp.w, hp.h + 12],
    );
    g.fillStyle = rgba(C.ink, 0.82);
    taper(g, quadPts(L, { x: hp.x - hp.w * 0.22, y: hp.y - hp.h * 0.7 }, T, 10), 1.8, { base: 0.4, tip: 0.3 });
    taper(g, quadPts(T, { x: hp.x + hp.w * 0.25, y: hp.y - hp.h * 0.68 }, Rr, 10), 2.4, { base: 0.5, tip: 0.2 });
    dryBrush(g, quadPts({ x: hp.x + 4, y: hp.y - hp.h * 0.8 }, { x: hp.x + hp.w * 0.2, y: hp.y - hp.h * 0.4 }, { x: hp.x + hp.w * 0.3, y: hp.y - 2 }, 8), 5, C.ink, rng, { alpha: 0.28, dry: 0.4, dryEnd: 0.7, hair: 0.8 });
    if (hp.mat) {
      // straw mat cap with hatching
      g.fillStyle = rgba(C.ochre, 0.6);
      g.beginPath();
      g.moveTo(T.x, T.y - 3);
      g.lineTo(T.x - hp.w * 0.32, T.y + hp.h * 0.42);
      g.quadraticCurveTo(T.x, T.y + hp.h * 0.52, T.x + hp.w * 0.34, T.y + hp.h * 0.42);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba(C.ink, 0.55);
      g.lineWidth = 0.8;
      for (let i = 0; i < 9; i++) {
        const u = (i + 0.5) / 9;
        g.beginPath();
        g.moveTo(T.x, T.y - 2);
        g.lineTo(lerp(T.x - hp.w * 0.32, T.x + hp.w * 0.34, u), T.y + hp.h * 0.42 + Math.sin(u * Math.PI) * 4);
        g.stroke();
      }
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(T.x - hp.w * 0.32, T.y + hp.h * 0.42);
      g.quadraticCurveTo(T.x, T.y + hp.h * 0.52, T.x + hp.w * 0.34, T.y + hp.h * 0.42);
      g.stroke();
    }
  }
  // a wooden rake and baskets leaning by the heaps
  g.strokeStyle = rgba(C.ink, 0.7);
  g.lineWidth = 1.3;
  g.beginPath();
  g.moveTo(262, 664);
  g.lineTo(240, 612);
  g.moveTo(234, 612);
  g.lineTo(247, 610);
  g.stroke();
  g.fillStyle = rgba(C.ochre, 0.55);
  g.beginPath();
  g.ellipse(276, 662, 9, 6, 0, 0, TAU);
  g.fill();
  g.strokeStyle = rgba(C.ink, 0.6);
  g.lineWidth = 1;
  g.stroke();
}

function paintRoadAndForeground(kit, g, rng, wash) {
  // ground strip between pans and the road (back slope of the dike)
  wash(
    (t) => {
      t.fillRect(0, 640, P, 52);
    },
    C.ochreXL,
    0.35,
    3,
    [0, 630, P, 70],
  );
  // dike-top path band (wheels touch at y = 700)
  wash(
    (t) => {
      t.fillRect(0, 690, P, 24);
    },
    C.ochreL,
    0.5,
    1.5,
    [0, 684, P, 36],
  );
  // back edge of the path (light) and front edge (strong dry brush)
  dryBrush(g, [{ x: 0, y: 690 }, { x: 330, y: 689.4 }, { x: 680, y: 690.6 }, { x: P, y: 690 }], 1.5, C.ink, rng, { alpha: 0.35, dry: 0.3, dryEnd: 0.5, hair: 0.8, freq: 0.12 });
  dryBrush(g, [{ x: -4, y: 713 }, { x: 260, y: 714.5 }, { x: 520, y: 712.5 }, { x: 790, y: 714.5 }, { x: 1004, y: 713 }], 5, C.ink, rng, { alpha: 0.75, dry: 0.12, dryEnd: 0.35, freq: 0.18 });
  // wheel ruts / path texture
  for (let i = 0; i < 40; i++) {
    const x = rng() * P;
    const y = 694 + rng() * 16;
    g.strokeStyle = rgba(C.ink, 0.12 + rng() * 0.1);
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 10 + rng() * 30, y + (rng() - 0.5));
    g.stroke();
  }

  // dike front slope (y 714-800): ochre wash + hemp-fibre strokes (披麻皴)
  wash(
    (t) => {
      t.beginPath();
      t.moveTo(0, 712);
      t.lineTo(P, 712);
      for (let x = P; x >= 0; x -= 20) t.lineTo(x, 786 + 18 * vnoise(x * 0.012 + 7) + 8 * Math.sin(x * 0.03));
      t.closePath();
      t.fill();
    },
    C.ochre,
    0.34,
    5,
    [0, 705, P, 120],
  );
  for (let i = 0; i < 70; i++) {
    const x = rng() * P;
    const y = 718 + rng() * 54;
    const len = 18 + rng() * 34;
    const pts = quadPts({ x, y }, { x: x - len * 0.35 + (rng() - 0.5) * 6, y: y + len * 0.4 }, { x: x - len * 0.5, y: y + len * 0.95 }, 8);
    dryBrush(g, pts, 2.5, C.ink, rng, { alpha: 0.2, dry: 0.3, dryEnd: 0.7, hair: 0.7, hairs: 3 });
  }
  // grass tufts on the dike slope
  for (let i = 0; i < 14; i++) {
    const x = 20 + rng() * 960;
    const y = 720 + rng() * 48;
    const gs = 0.7 + rng() * 1.1;
    g.fillStyle = rgba(rng() < 0.4 ? C.indigo : C.ink, 0.25 + rng() * 0.3);
    const n = 4 + Math.floor(rng() * 4);
    for (let k = 0; k < n; k++) {
      const a = -HALF_PI + (k / (n - 1) - 0.5) * 1.3 + (rng() - 0.5) * 0.3;
      const len = (6 + rng() * 9) * gs;
      taper(g, quadPts({ x, y }, { x: x + Math.cos(a) * len * 0.5 + 1, y: y + Math.sin(a) * len * 0.6 }, { x: x + Math.cos(a) * len, y: y + Math.sin(a) * len }, 4), 1.6, { base: 1, tip: 0.05, t0: 0.05, t1: 0.7 });
    }
  }
  // texture on the strip between the pans and the path
  for (let i = 0; i < 40; i++) {
    const x = rng() * P;
    const y = 646 + rng() * 40;
    if (x > 700 && y > 655) continue;
    g.strokeStyle = rgba(C.ink, 0.1 + rng() * 0.1);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 8 + rng() * 22, y + (rng() - 0.5) * 2);
    g.stroke();
  }
  for (let x = 40; x < 700; x += 70 + rng() * 80) mossDots(g, x, 650 + rng() * 30, 4, 3, rng, 0.55, 1.5);
  // moss dots along the path edge
  for (let x = 30; x < P; x += 46 + rng() * 60) mossDots(g, x, 716 + rng() * 6, 5 + Math.floor(rng() * 6), 4, rng, 0.75, 1.9);

  // ---- tidal water below the dike (y ~780-960), fading into blank silk at the bottom
  const shoreY = (x) => 784 + 16 * vnoise(x * 0.012 + 7) + 7 * Math.sin(x * 0.03);
  wash(
    (t) => {
      const gr = t.createLinearGradient(0, 770, 0, 980);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(0.55, 'rgba(0,0,0,0.7)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      t.fillStyle = gr;
      t.beginPath();
      t.moveTo(0, shoreY(0));
      for (let x = 0; x <= P; x += 20) t.lineTo(x, shoreY(x));
      t.lineTo(P, 990);
      t.lineTo(0, 990);
      t.closePath();
      t.fill();
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = C.indigo;
      t.fillRect(0, 760, P, 240);
      t.globalCompositeOperation = 'source-over';
    },
    C.indigo,
    0.4,
    3,
    [0, 760, P, 240],
  );
  // dark wet edge under the bank
  dryBrush(g, Array.from({ length: 26 }, (_, i) => ({ x: i * 40, y: shoreY(i * 40) + 1 })), 3.5, C.ink, rng, { alpha: 0.5, dry: 0.25, dryEnd: 0.5, freq: 0.15 });
  // net-pattern waves (網巾水紋)
  g.save();
  g.lineCap = 'round';
  for (let row = 0; row < 15; row++) {
    const y = 800 + row * 9.5 + row * row * 0.25;
    const fade = 1 - sstep(880, 975, y);
    const aw = 20 + row * 1.2;
    for (let x = (row % 2) * aw * 0.5 - 10; x < P; x += aw) {
      if (h1(x * 0.37 + row * 11.1) < 0.35) continue;
      if (y < shoreY(x) + 8) continue;
      g.strokeStyle = rgba(C.ink, (0.12 + 0.12 * h1(x + row)) * fade);
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + aw * 0.5, y - 4 - row * 0.15, x + aw, y);
      g.stroke();
    }
  }
  g.restore();
  // mud spits with moss dots (left and right) where the reed clumps stand
  for (const [x0, x1, y0] of [
    [-20, 270, 812],
    [760, 1020, 838],
  ]) {
    wash(
      (t) => {
        t.beginPath();
        t.ellipse((x0 + x1) / 2, y0, (x1 - x0) / 2, 26, 0, 0, TAU);
        t.fill();
      },
      C.ochre,
      0.5,
      3,
      [x0 - 10, y0 - 40, x1 - x0 + 20, 80],
    );
    dryBrush(g, quadPts({ x: x0 + 10, y: y0 + 14 }, { x: (x0 + x1) / 2, y: y0 + 34 }, { x: x1 - 10, y: y0 + 12 }, 12), 4, C.ink, rng, { alpha: 0.6, dry: 0.2, dryEnd: 0.5 });
    for (let k = 0; k < 6; k++) mossDots(g, lerp(x0 + 30, x1 - 30, k / 5), y0 + 10 + rng() * 10, 5, 4, rng, 0.8, 2);
  }
  // crab holes on the slope
  for (let i = 0; i < 16; i++) {
    const x = 60 + rng() * 880;
    const y = 736 + rng() * 36;
    g.fillStyle = rgba(C.ink, 0.5 + rng() * 0.3);
    g.beginPath();
    g.ellipse(x, y, 1.6 + rng() * 1.6, 1 + rng(), 0, 0, TAU);
    g.fill();
  }
  // the gag crab's burrow
  g.fillStyle = rgba(C.ochre, 0.45);
  g.beginPath();
  g.ellipse(BURROW.x + 3, BURROW.y + 4, 15, 4, 0, 0, Math.PI);
  g.fill();
  g.fillStyle = rgba(C.ink, 0.9);
  g.beginPath();
  g.ellipse(BURROW.x, BURROW.y + 2, 10, 4, 0, 0, TAU);
  g.fill();
}

/** small moored sampan with an arched mat awning (烏篷), baked */
function paintSampan(kit, g, w, h, rng) {
  g.save();
  g.translate(w / 2, h - 22);
  // hull
  g.fillStyle = rgba(C.ochre, 0.75);
  g.beginPath();
  g.moveTo(-92, -16);
  g.quadraticCurveTo(-60, 6, 0, 6);
  g.quadraticCurveTo(62, 6, 96, -20);
  g.lineTo(88, -12);
  g.quadraticCurveTo(0, -4, -86, -10);
  g.closePath();
  g.fill();
  g.fillStyle = rgba(C.ink, 0.92);
  taper(g, quadPts({ x: -92, y: -16 }, { x: -50, y: 8 }, { x: 0, y: 6 }, 10), 3.5, { base: 0.5, tip: 0.9, t1: 0.1 });
  taper(g, quadPts({ x: 0, y: 6 }, { x: 62, y: 6 }, { x: 96, y: -20 }, 10), 3.5, { base: 1, tip: 0.3 });
  taper(g, quadPts({ x: -88, y: -12 }, { x: 0, y: -2 }, { x: 90, y: -15 }, 12), 2, { base: 0.4, tip: 0.3 });
  // awning: arched woven mat, dark ink wash
  g.fillStyle = rgba(C.ink, 0.78);
  g.beginPath();
  g.moveTo(-40, -6);
  g.quadraticCurveTo(-36, -40, 0, -42);
  g.quadraticCurveTo(36, -40, 40, -5);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(230,215,180,0.35)';
  g.lineWidth = 0.8;
  for (let k = 1; k < 7; k++) {
    const x = -40 + (80 * k) / 7;
    g.beginPath();
    g.moveTo(x, -5);
    g.quadraticCurveTo(x * 0.98, -30, x * 0.85, -40 + Math.abs(x) * 0.05);
    g.stroke();
  }
  // a fish trap basket and a coil of rope at the bow
  g.strokeStyle = rgba(C.ink, 0.8);
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(62, -14, 8, 4, 0, 0, TAU);
  g.stroke();
  // mooring pole (篙) stuck in the mud, with the line
  g.fillStyle = rgba(C.ink, 0.9);
  taper(g, [{ x: -118, y: 20 }, { x: -114, y: -40 }, { x: -110, y: -96 }], 3.2, { base: 1, tip: 0.5 });
  g.strokeStyle = rgba(C.ink, 0.65);
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(-113, -48);
  g.quadraticCurveTo(-100, -18, -88, -14);
  g.stroke();
  g.restore();
}

// =============================================================================
// overlay: silk weave, stains, foxing, scroll creases (multiplied over everything)
// =============================================================================
function paintOverlay(kit, g, rng) {
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, P, P);
  // edge darkening (aged, handled silk)
  const vg = g.createRadialGradient(P / 2, P / 2, 300, P / 2, P / 2, 760);
  vg.addColorStop(0, 'rgba(255,255,255,0)');
  vg.addColorStop(1, 'rgba(150,112,62,0.30)');
  g.fillStyle = vg;
  g.fillRect(0, 0, P, P);
  const top = g.createLinearGradient(0, 0, 0, 160);
  top.addColorStop(0, 'rgba(140,100,55,0.22)');
  top.addColorStop(1, 'rgba(140,100,55,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, P, 160);
  // water stains
  kit.addBlotches(g, P, P, rng, 'rgba(160,118,64,0.10)', 26, 50, 190);
  kit.addBlotches(g, P, P, rng, 'rgba(120,90,50,0.07)', 30, 20, 70);
  // foxing spots
  for (let i = 0; i < 60; i++) {
    const x = rng() * P;
    const y = rng() * P;
    const r = 0.8 + rng() * 2.6;
    g.fillStyle = `rgba(130,85,40,${0.12 + rng() * 0.2})`;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  // horizontal scroll creases (light ridge + dark fold + hairline cracks)
  for (const cy of [262, 618]) {
    const cg = g.createLinearGradient(0, cy - 8, 0, cy + 6);
    cg.addColorStop(0, 'rgba(120,85,45,0)');
    cg.addColorStop(0.6, 'rgba(120,85,45,0.07)');
    cg.addColorStop(0.75, 'rgba(255,255,255,0)');
    cg.addColorStop(1, 'rgba(120,85,45,0)');
    g.fillStyle = cg;
    g.fillRect(0, cy - 8, P, 14);
    g.strokeStyle = 'rgba(90,60,30,0.11)';
    g.lineWidth = 0.7;
    let x = 0;
    while (x < P) {
      const len = 20 + rng() * 80;
      if (rng() < 0.5) {
        g.beginPath();
        g.moveTo(x, cy + 1 + (rng() - 0.5) * 2);
        for (let k = 1; k <= 6; k++) g.lineTo(x + (len * k) / 6, cy + 1 + (rng() - 0.5) * 3);
        g.stroke();
      }
      x += len;
    }
  }
  // silk weave: per-thread tone variation + fine grain
  const img = g.getImageData(0, 0, P, P);
  const d = img.data;
  const rowV = new Float32Array(P);
  const colV = new Float32Array(P);
  for (let i = 0; i < P; i++) {
    rowV[i] = (rng() - 0.5) * 10 + (i % 2 ? 2.5 : -2.5) + 6 * (vnoise(i * 0.05 + 3) - 0.5);
    colV[i] = (rng() - 0.5) * 7 + (i % 2 ? 1.8 : -1.8);
  }
  for (let y = 0; y < P; y++) {
    for (let x = 0; x < P; x++) {
      const i = (y * P + x) * 4;
      const n = rowV[y] + colV[x] + (rng() - 0.5) * 10 - 4;
      d[i] = clamp(d[i] + n, 0, 255);
      d[i + 1] = clamp(d[i + 1] + n * 0.97, 0, 255);
      d[i + 2] = clamp(d[i + 2] + n * 0.9, 0, 255);
    }
  }
  g.putImageData(img, 0, 0);
}

// =============================================================================
// inscription: vertical colophon + seals (baked into a sprite)
// =============================================================================
const TXT_X0 = 740;
const TXT_Y0 = 36;
const TXT_W = 230;
const TXT_H = 420;

function paintSeal(kit, g, x, y, size, chars, mode, rng) {
  const c = kit.createCanvas(size + 4, size + 4);
  const s = c.getContext('2d');
  s.translate(2, 2);
  const fs = chars.length > 2 ? size * 0.44 : size * 0.48;
  s.font = `900 ${fs}px ${kit.FONT.serif}`;
  s.textAlign = 'center';
  s.textBaseline = 'middle';
  const cells =
    chars.length > 2
      ? [
          [size * 0.73, size * 0.27],
          [size * 0.73, size * 0.73],
          [size * 0.27, size * 0.27],
          [size * 0.27, size * 0.73],
        ]
      : [
          [size * 0.5, size * 0.27],
          [size * 0.5, size * 0.73],
        ];
  if (mode === 'white') {
    s.fillStyle = C.red;
    s.beginPath();
    s.moveTo(1, 0);
    s.lineTo(size - 0.5, 1);
    s.lineTo(size, size - 1);
    s.lineTo(0, size);
    s.closePath();
    s.fill();
    s.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < chars.length; i++) {
      s.save();
      s.translate(cells[i][0], cells[i][1]);
      s.scale(chars.length > 2 ? 1 : 1.05, chars.length > 2 ? 1.05 : 0.95);
      s.fillText(chars[i], 0, 1);
      s.restore();
    }
  } else {
    s.strokeStyle = C.red;
    s.lineWidth = size * 0.07;
    s.strokeRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9);
    s.fillStyle = C.red;
    for (let i = 0; i < chars.length; i++) s.fillText(chars[i], cells[i][0], cells[i][1] + 1);
  }
  // wear of the stone / uneven paste
  s.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < size * 1.6; i++) {
    s.fillStyle = `rgba(0,0,0,${0.3 + rng() * 0.7})`;
    s.beginPath();
    s.arc(rng() * size, rng() * size, 0.4 + rng() * 1.3, 0, TAU);
    s.fill();
  }
  g.save();
  g.globalAlpha = 0.9;
  g.drawImage(c, x - 2, y - 2);
  g.restore();
}

/**
 * Brush-ify text: the kai face is a pen-weight font, so the glyphs are thickened,
 * bled (blur) and re-thresholded into organic ink edges, with ink density fading as
 * the brush runs dry down each column and a little dry-brush break-up.
 */
function inkify(kit, w0, h0, drawFn, density, rng) {
  // work at 2x so small glyphs keep their counters, then downsample
  const SS = 2;
  const w = w0 * SS;
  const h = h0 * SS;
  const c1 = kit.createCanvas(w, h);
  const g1 = c1.getContext('2d');
  g1.scale(SS, SS);
  drawFn(g1);
  const c2 = kit.createCanvas(w, h);
  const g2 = c2.getContext('2d');
  g2.filter = 'blur(1.3px)';
  g2.drawImage(c1, 0, 0);
  g2.filter = 'none';
  const img = g2.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, gg, b] = hexRgb(C.ink);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = d[i + 3] / 255;
      if (a < 0.02) {
        d[i + 3] = 0;
        continue;
      }
      let k = sstep(0.22, 0.5, a);
      // dry-brush streaks: fine directional noise breaks the edges
      const n = vnoise(x * 0.45 + y * 0.12 + 17.3) * 0.6 + vnoise(y * 0.85 + x * 0.05) * 0.4;
      k *= 0.8 + 0.2 * n;
      // ink pools a little in the stroke centres
      const core = sstep(0.75, 0.98, a);
      d[i] = r * (1 - core * 0.4);
      d[i + 1] = gg * (1 - core * 0.4);
      d[i + 2] = b * (1 - core * 0.4);
      d[i + 3] = 255 * k * density(x / SS, y / SS);
    }
  }
  g2.clearRect(0, 0, w, h);
  g2.putImageData(img, 0, 0);
  const out = kit.createCanvas(w0, h0);
  const go = out.getContext('2d');
  go.imageSmoothingEnabled = true;
  go.imageSmoothingQuality = 'high';
  go.drawImage(c2, 0, 0, w0, h0);
  return out;
}

function paintInscription(kit, g, rng) {
  // local coords: sprite origin = (TXT_X0, TXT_Y0); columns read right → left
  const tx = 192;
  const tSize = 50;
  const cSize = 20;
  const sx = 56;
  const layout = (t) => {
    t.fillStyle = '#000';
    t.strokeStyle = '#000';
    t.textAlign = 'center';
    t.textBaseline = 'top';
    t.lineJoin = 'round';
    // title column
    let y = 12;
    for (let i = 0; i < TITLE.length; i++) {
      t.save();
      t.translate(tx + (rng() - 0.5) * 3, y);
      t.rotate((rng() - 0.5) * 0.05);
      t.font = `700 ${tSize + (rng() - 0.5) * 5}px ${kit.FONT.kai}`;
      t.lineWidth = 2.6;
      t.strokeText(TITLE[i], 0, 0);
      t.fillText(TITLE[i], 0, 0);
      t.restore();
      y += tSize + 7;
    }
    // colophon
    COLOPHON.forEach((line, ci) => {
      const x = 140 - ci * 31;
      let yy = 24 + ci * 5;
      for (let i = 0; i < line.length; i++) {
        t.font = `400 ${cSize}px ${kit.FONT.kai}`;
        t.lineWidth = 0.7;
        const jx = x + (rng() - 0.5) * 1.4;
        t.strokeText(line[i], jx, yy);
        t.fillText(line[i], jx, yy);
        yy += cSize + 3.5;
      }
    });
    // signature
    let sy = 120;
    for (let i = 0; i < SIGN.length; i++) {
      t.font = `400 ${cSize}px ${kit.FONT.kai}`;
      t.lineWidth = 0.8;
      t.strokeText(SIGN[i], sx, sy);
      t.fillText(SIGN[i], sx, sy);
      sy += cSize + 3;
    }
  };
  const density = (x, y) => {
    if (x > 160) return 0.97 - 0.3 * clamp((y - 12) / 230, 0, 1) + 0.12 * sstep(150, 175, y) * (1 - sstep(175, 200, y));
    const col = Math.round((140 - x) / 31);
    const local = ((y - 24) % 150) / 150;
    return 0.9 - 0.28 * local - col * 0.03;
  };
  const inked = inkify(kit, TXT_W, TXT_H, layout, density, rng);
  g.drawImage(inked, 0, 0);
  // seals below the signature + leading seal beside the title
  const sy = 120 + SIGN.length * (cSize + 3);
  paintSeal(kit, g, sx - 15, sy + 8, 30, ['乘', '風'], 'white', rng);
  paintSeal(kit, g, sx - 13, sy + 46, 26, ['琵', '鷺'], 'red', rng);
  paintSeal(kit, g, tx + 24, 14, 18, ['騎', '行'], 'red', rng);
}

// =============================================================================
// sprites: junk boat, foreground reed clump
// =============================================================================
function paintJunk(kit, g, w, h, rng, variant) {
  const s = variant === 2 ? 0.75 : 1;
  g.save();
  g.translate(w / 2, h - 10);
  g.scale(s, s);
  // hull: high stern on the left
  g.fillStyle = rgba(C.ink, 0.72);
  g.beginPath();
  g.moveTo(-34, -10);
  g.quadraticCurveTo(-18, 2, 22, 0);
  g.lineTo(32, -6);
  g.quadraticCurveTo(0, -4, -34, -10);
  g.fill();
  // sails (lug-shaped, battened, fan-like) on two masts
  const sail = (mx, top, bot, wdt) => {
    g.fillStyle = rgba(C.ochre, 0.55);
    g.beginPath();
    g.moveTo(mx - 3, top);
    g.quadraticCurveTo(mx + wdt * 0.6, top - 4, mx + wdt, top + 4);
    g.quadraticCurveTo(mx + wdt + 4, (top + bot) / 2, mx + wdt - 2, bot);
    g.lineTo(mx - 4, bot);
    g.closePath();
    g.fill();
    g.strokeStyle = rgba(C.ink, 0.6);
    g.lineWidth = 0.7;
    g.stroke();
    for (let k = 1; k < 6; k++) {
      const yy = lerp(top, bot, k / 6);
      g.beginPath();
      g.moveTo(mx - 3, yy);
      g.lineTo(mx + wdt + 1, yy + 1.5 - k * 0.3);
      g.stroke();
    }
    g.strokeStyle = rgba(C.ink, 0.8);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(mx, bot + 4);
    g.lineTo(mx, top - 4);
    g.stroke();
  };
  sail(-12, -54, -10, 22);
  sail(10, -40, -8, 16);
  g.restore();
}

function paintReedClump(kit, g, w, h, rng, variant) {
  const n = variant === 0 ? 15 : 12;
  for (let i = 0; i < n; i++) {
    const bx = w * 0.35 + (rng() - 0.5) * w * 0.45;
    const by = h;
    const hgt = h * (0.55 + 0.42 * rng());
    const lean = (rng() - 0.45) * w * 0.35;
    const tip = { x: bx + lean, y: by - hgt };
    const mid = { x: bx + lean * 0.25 + (rng() - 0.5) * 8, y: by - hgt * 0.5 };
    g.fillStyle = rgba(C.ink, 0.55 + rng() * 0.35);
    taper(g, quadPts({ x: bx, y: by }, mid, tip, 14), 2.2 + rng() * 1.2, { base: 1, tip: 0.2, t0: 0.02, t1: 0.3 });
    // leaves: long blades peeling off the stem
    const leaves = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < leaves; k++) {
      const u = 0.25 + rng() * 0.5;
      const p0 = quadPts({ x: bx, y: by }, mid, tip, 10)[Math.round(u * 10)];
      const dir = rng() < 0.5 ? -1 : 1;
      const len = 40 + rng() * 70;
      const p2 = { x: p0.x + dir * len * 0.8, y: p0.y - len * 0.25 + rng() * len * 0.5 };
      const p1 = { x: p0.x + dir * len * 0.35, y: p0.y - len * 0.45 };
      g.fillStyle = rgba(rng() < 0.3 ? C.indigo : C.ink, 0.35 + rng() * 0.45);
      taper(g, quadPts(p0, p1, p2, 12), 4 + rng() * 4, { base: 0.4, tip: 0.02, t0: 0.15, t1: 0.65 });
    }
    // plume (蘆花): soft drooping tuft
    if (rng() < 0.7) {
      for (let k = 0; k < 9; k++) {
        const a = -HALF_PI + 0.9 + (rng() - 0.5) * 0.9;
        const len = 10 + rng() * 14;
        g.strokeStyle = rgba(k % 3 ? C.ochre : C.ink2, 0.35 + rng() * 0.25);
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(tip.x, tip.y);
        g.quadraticCurveTo(tip.x + Math.cos(a) * len * 0.6, tip.y + Math.sin(a) * len * 0.6 - 4, tip.x + Math.cos(a) * len, tip.y + Math.sin(a) * len + 6);
        g.stroke();
      }
    }
  }
}

// =============================================================================
// the windmill (立帆式風車), drawn each frame
// =============================================================================
function sailState(phi, t, i) {
  const drive = sstep(-0.3, 0.55, Math.cos(phi - PHI_DRIVE));
  let a = BETA + HALF_PI * drive;
  a += (1 - drive) * 0.1 * Math.sin(t * 6.1 + i * 1.9); // loose sail flutters while weathercocking
  return { a, drive };
}

/** mat-sail texture: woven reed mat (herringbone), pooled wash at the edges. */
const SAIL_TW = 160;
const SAIL_TH = 220;
function paintSailTexture(kit, g, rng, w, h, back) {
  g.fillStyle = back ? '#a9774a' : '#c99a64';
  g.fillRect(0, 0, w, h);
  kit.addBlotches(g, w, h, rng, back ? 'rgba(90,50,20,0.2)' : 'rgba(140,80,35,0.22)', 16, 18, 60);
  kit.addBlotches(g, w, h, rng, 'rgba(255,240,215,0.2)', 8, 20, 50);
  // herringbone weave in bands
  const band = 11;
  g.lineWidth = 0.8;
  for (let y0 = 0; y0 < h; y0 += band) {
    const dir = (y0 / band) % 2 ? 1 : -1;
    g.strokeStyle = back ? 'rgba(50,30,12,0.2)' : 'rgba(80,48,18,0.18)';
    g.beginPath();
    for (let x = -band; x < w + band; x += 3.2) {
      g.moveTo(x, y0);
      g.lineTo(x + dir * band * 0.7, y0 + band);
    }
    g.stroke();
    g.strokeStyle = 'rgba(90,60,25,0.12)';
    g.beginPath();
    g.moveTo(0, y0 + 0.5);
    g.lineTo(w, y0 + 0.5);
    g.stroke();
  }
  // wash pooled at the edges (ink-wash "drying ring")
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, 'rgba(120,80,35,0.22)');
  gr.addColorStop(0.12, 'rgba(120,80,35,0)');
  gr.addColorStop(0.85, 'rgba(120,80,35,0)');
  gr.addColorStop(1, 'rgba(120,80,35,0.28)');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  const gv = g.createLinearGradient(0, 0, 0, h);
  gv.addColorStop(0, 'rgba(255,250,235,0.18)');
  gv.addColorStop(0.5, 'rgba(255,250,235,0)');
  gv.addColorStop(1, 'rgba(120,80,35,0.2)');
  g.fillStyle = gv;
  g.fillRect(0, 0, w, h);
  kit.addGrain(g, w, h, rng, 0.03);
}

const _patCache = new WeakMap();
function sailPatterns(ctx, kit) {
  let p = _patCache.get(ctx);
  if (!p) {
    const f = kit.bake('china_sailtex_f2', SAIL_TW, SAIL_TH, (g, rng, w, h) => paintSailTexture(kit, g, rng, w, h, false));
    const bk = kit.bake('china_sailtex_b2', SAIL_TW, SAIL_TH, (g, rng, w, h) => paintSailTexture(kit, g, rng, w, h, true));
    p = { front: ctx.createPattern(f, 'repeat'), back: ctx.createPattern(bk, 'repeat') };
    _patCache.set(ctx, p);
  }
  return p;
}

function drawMill(ctx, m, theta, t, detail, pats) {
  const s = m.s;
  const ky = m.ky;
  const P3 = (x, h, z) => ({ x: m.cx + x * s, y: m.gy + (z * ky - h) * s });
  const N = 8;
  const R = m.R;
  const masts = [];
  for (let i = 0; i < N; i++) {
    const phi = theta + (i * TAU) / N;
    const st = sailState(phi, t, i);
    masts.push({ i, phi, x: R * Math.cos(phi), z: R * Math.sin(phi), a: st.a, drive: st.drive, dx: Math.cos(st.a), dz: Math.sin(st.a) });
  }
  const items = [];
  const hLow = m.hb - 8;
  const hUp = m.ht + 18;
  const beam = (a, b, w, washA, inkA) => {
    if (detail) {
      ctx.strokeStyle = rgba(C.ochre, washA);
      ctx.lineWidth = w * 2.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = rgba(C.ink, inkA);
      seg(ctx, a, b, w, { base: 0.95, tip: 0.5, t1: 0.25, jit: 0.5, seed: a.x * 0.1 + b.y * 0.07 });
    } else {
      ctx.strokeStyle = rgba(C.ink, inkA);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  };
  const depthA = (z) => 0.55 + 0.4 * (z / R + 1) * 0.5; // far side paler (atmosphere)

  for (let i = 0; i < N; i++) {
    const mm = masts[i];
    const nx = masts[(i + 1) % N];
    // radial spokes, lower and upper
    items.push({
      z: mm.z * 0.5 - 2,
      draw: () => {
        const da = depthA(mm.z * 0.5);
        if (detail) beam(P3(0, hLow, 0), P3(mm.x, hLow, mm.z), 3.4 * s, 0.35, 0.8 * da);
        beam(P3(0, hUp, 0), P3(mm.x, hUp, mm.z), 4 * s, 0.35, 0.9 * da);
        if (detail) {
          // light stays from the shaft head to the mast tops
          const c0 = P3(0, m.top - 8, 0);
          const b1 = P3(mm.x, m.ht + 44, mm.z);
          ctx.strokeStyle = rgba(C.ink, 0.28 * da);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(c0.x, c0.y);
          ctx.lineTo(b1.x, b1.y);
          ctx.stroke();
        }
      },
    });
    // octagon ties (rim of the frame)
    items.push({
      z: (mm.z + nx.z) * 0.5 - 1,
      draw: () => {
        const da = depthA((mm.z + nx.z) * 0.5);
        beam(P3(mm.x, hUp, mm.z), P3(nx.x, hUp, nx.z), 2.8 * s, 0.3, 0.8 * da);
        if (detail) beam(P3(mm.x, hLow, mm.z), P3(nx.x, hLow, nx.z), 2 * s, 0.25, 0.55 * da);
      },
    });
  }
  for (const mm of masts) {
    items.push({ z: mm.z + mm.dz * m.Ws * 0.5, draw: () => drawSail(ctx, m, mm, P3, t, detail, pats, depthA(mm.z)) });
  }
  items.push({ z: 0, draw: () => drawShaft(ctx, m, P3, t, theta, detail) });
  if (detail) {
    items.push({ z: -1e4, draw: () => drawCrownGear(ctx, m, P3, theta, true) });
    items.push({ z: m.Rg + 60, draw: () => drawCrownGear(ctx, m, P3, theta, false) });
  }
  items.sort((a, b) => a.z - b.z);
  for (const it of items) it.draw();
}

function drawSail(ctx, m, mm, P3, t, detail, pats, da) {
  const s = m.s;
  const W = m.Ws;
  const { x, z, dx, dz, drive } = mm;
  const L0 = P3(x, m.hb, z);
  const L1 = P3(x, m.ht, z);
  const ex = x + dx * W;
  const ez = z + dz * W;
  // junk-sail profile: the yard peaks up towards the leech, the foot is near level
  const E0 = P3(ex, m.hb + 4, ez);
  const E1 = P3(ex, m.ht + 34, ez);
  const bil = (3 + 12 * drive + 1.5 * Math.sin(t * 3 + mm.i)) * s;
  const bx = WIND.x * bil;
  const by = WIND.z * m.ky * bil;
  const nb = detail ? 6 : 4;
  // leech points at each batten (scalloped between them)
  const lp = [];
  const ep = [];
  for (let k = 0; k <= nb; k++) {
    const f = k / nb; // 0 bottom .. 1 top
    lp.push(lerpP(L0, L1, f));
    const bul = Math.sin(f * Math.PI);
    // battens fan slightly: leech ends rise progressively towards the peak
    const fe = Math.pow(f, 0.85);
    ep.push({ x: lerp(E0.x, E1.x, fe) + bx * (0.6 + bul), y: lerp(E0.y, E1.y, fe) + by * (0.6 + bul) });
  }
  const front = dx > 0;
  const face = Math.abs(dx);
  ctx.beginPath();
  ctx.moveTo(L0.x, L0.y);
  ctx.lineTo(L1.x, L1.y);
  ctx.quadraticCurveTo((L1.x + ep[nb].x) / 2 + bx * 0.3, (L1.y + ep[nb].y) / 2 + by * 0.3 - 3 * s, ep[nb].x, ep[nb].y);
  for (let k = nb - 1; k >= 0; k--) {
    const a = ep[k + 1];
    const b = ep[k];
    // panel cloth bulges out a little between battens
    const ox = dx * 3.5 * s + bx * 0.25;
    const oy = dz * m.ky * 3.5 * s + by * 0.25;
    ctx.quadraticCurveTo((a.x + b.x) / 2 + ox, (a.y + b.y) / 2 + oy, b.x, b.y);
  }
  ctx.quadraticCurveTo((L0.x + ep[0].x) / 2 + bx * 0.5, (L0.y + ep[0].y) / 2 + by * 0.5 + 2 * s, L0.x, L0.y);
  ctx.closePath();
  // texture-mapped mat (follows the sail, foreshortens when edge-on)
  const ax = (E1.x - L1.x) / SAIL_TW;
  const ay = (E1.y - L1.y) / SAIL_TW;
  const qx = (L0.x - L1.x) / SAIL_TH;
  const qy = (L0.y - L1.y) / SAIL_TH;
  if (pats && Math.abs(ax * qy - ay * qx) > 0.004) {
    const pat = front ? pats.front : pats.back;
    pat.setTransform(new DOMMatrix([ax, ay, qx, qy, L1.x, L1.y]));
    ctx.fillStyle = pat;
    ctx.fill();
    if (da < 0.9) {
      ctx.fillStyle = rgba('#e6d6b2', (0.9 - da) * 0.9);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = front ? rgba('#c49660', 0.95) : rgba('#a87b4c', 0.95);
    ctx.fill();
  }
  // outline: bone line on the leech, lighter on yard & foot
  if (detail) {
    ctx.fillStyle = rgba(C.ink, 0.85 * da);
    taper(ctx, ep.slice().reverse(), 2.2 * s, { base: 0.7, tip: 0.35, t1: 0.3, jit: 0.4, seed: mm.i });
    ctx.strokeStyle = rgba(C.ink, 0.7 * da);
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(L0.x, L0.y);
    ctx.quadraticCurveTo((L0.x + ep[0].x) / 2 + bx * 0.5, (L0.y + ep[0].y) / 2 + by * 0.5 + 2 * s, ep[0].x, ep[0].y);
    ctx.stroke();
    // yard (a heavier spar at the head)
    ctx.fillStyle = rgba(C.ink, 0.9 * da);
    taper(ctx, quadPts(L1, { x: (L1.x + ep[nb].x) / 2 + bx * 0.3, y: (L1.y + ep[nb].y) / 2 + by * 0.3 - 3 * s }, { x: ep[nb].x + dx * 6 * s, y: ep[nb].y + dz * m.ky * 6 * s - 1 }, 6), 3 * s, { base: 1, tip: 0.4 });
    // bamboo battens, ends projecting past the leech
    ctx.fillStyle = rgba(C.ink, 0.82 * da);
    for (let k = 1; k < nb; k++) {
      const a = lp[k];
      const b = { x: ep[k].x + dx * 5 * s, y: ep[k].y + dz * m.ky * 5 * s };
      const mid = { x: (a.x + b.x) / 2 + bx * 0.8, y: (a.y + b.y) / 2 + by * 0.8 };
      taper(ctx, quadPts(a, mid, b, 5), 2 * s, { base: 1, tip: 0.55, t0: 0.1, t1: 0.25 });
    }
    // sheetlets (bridles) from the batten ends converge on the sheet, which runs to the shaft
    const em = ep[nb >> 1];
    const Q = { x: em.x + dx * 0.3 * W * s, y: em.y + dz * m.ky * 0.3 * W * s + 2 };
    const shaftP = P3(0, (m.hb + m.ht) * 0.5, 0);
    ctx.strokeStyle = rgba(C.ink, 0.4 * da);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let k = 1; k < nb; k++) {
      ctx.moveTo(ep[k].x, ep[k].y);
      ctx.lineTo(Q.x, Q.y);
    }
    const sag = (1 - drive) * 24;
    ctx.moveTo(Q.x, Q.y);
    ctx.quadraticCurveTo((Q.x + shaftP.x) / 2, (Q.y + shaftP.y) / 2 + sag, shaftP.x, shaftP.y);
    ctx.stroke();
  } else {
    ctx.strokeStyle = rgba(C.ink, 0.8);
    ctx.lineWidth = Math.max(0.6, 1.4 * s);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.5, 1.1 * s);
    ctx.beginPath();
    for (let k = 1; k < nb; k++) {
      ctx.moveTo(lp[k].x, lp[k].y);
      ctx.lineTo(ep[k].x, ep[k].y);
    }
    ctx.stroke();
  }
  // mast (in front of the luff)
  ctx.fillStyle = rgba(C.ink, 0.95 * da);
  seg(ctx, P3(x, m.hb - 16, z), P3(x, m.ht + 46, z), Math.max(1, 4.6 * s), { base: 0.9, tip: 0.55, t1: 0.2, jit: 0.4, seed: mm.i * 3.1 });
}

function drawShaft(ctx, m, P3, t, theta, detail) {
  const s = m.s;
  const b = P3(0, 0, 0);
  const tp = P3(0, m.top, 0);
  const wb = 7 * s;
  const wt = 4.6 * s;
  ctx.fillStyle = rgba(C.ochreL, 0.95);
  ctx.beginPath();
  ctx.moveTo(b.x - wb, b.y);
  ctx.lineTo(tp.x - wt, tp.y);
  ctx.lineTo(tp.x + wt, tp.y);
  ctx.lineTo(b.x + wb, b.y);
  ctx.closePath();
  ctx.fill();
  // shaded right side
  ctx.fillStyle = rgba(C.ochre, 0.55);
  ctx.beginPath();
  ctx.moveTo(b.x + wb * 0.2, b.y);
  ctx.lineTo(tp.x + wt * 0.2, tp.y);
  ctx.lineTo(tp.x + wt, tp.y);
  ctx.lineTo(b.x + wb, b.y);
  ctx.closePath();
  ctx.fill();
  // contour strokes (bone lines)
  ctx.fillStyle = rgba(C.ink, 0.9);
  taper(ctx, [{ x: b.x - wb, y: b.y }, { x: lerp(b.x - wb, tp.x - wt, 0.5), y: lerp(b.y, tp.y, 0.5) }, { x: tp.x - wt, y: tp.y }], Math.max(0.8, 2.2 * s), { base: 0.9, tip: 0.4 });
  taper(ctx, [{ x: b.x + wb, y: b.y }, { x: lerp(b.x + wb, tp.x + wt, 0.5), y: lerp(b.y, tp.y, 0.5) }, { x: tp.x + wt, y: tp.y }], Math.max(0.8, 2.8 * s), { base: 1, tip: 0.5 });
  if (detail) {
    // hubs where the spokes are mortised + iron hoops
    for (const hh of [m.hb - 8, m.ht + 16]) {
      const c = P3(0, hh, 0);
      ctx.fillStyle = rgba(C.ochre, 0.95);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 13 * s, 5 * s, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(c.x - 13 * s, c.y - 10 * s, 26 * s, 10 * s);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 10 * s, 13 * s, 5 * s, 0, 0, TAU);
      ctx.fillStyle = rgba(C.ochreL, 1);
      ctx.fill();
      ctx.strokeStyle = rgba(C.ink, 0.85);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x - 13 * s, c.y - 10 * s);
      ctx.lineTo(c.x - 13 * s, c.y);
      ctx.moveTo(c.x + 13 * s, c.y - 10 * s);
      ctx.lineTo(c.x + 13 * s, c.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 13 * s, 5 * s, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(C.ink, 0.75);
    ctx.lineWidth = 1.4;
    for (const hh of [30, 150, 210, m.top - 30]) {
      const c = P3(0, hh, 0);
      const w = lerp(wb, wt, hh / m.top);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, w + 0.5, 1.8, 0, 0, Math.PI);
      ctx.stroke();
    }
  }
  // finial + wind pennant (streams downwind)
  const flu = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 11.1 + 1) * 0.5;
  const L = 34 * s;
  const ex = WIND.x * L;
  const ey = WIND.z * m.ky * L;
  ctx.fillStyle = rgba(C.red, 0.78);
  ctx.beginPath();
  ctx.moveTo(tp.x, tp.y - 2 * s);
  ctx.quadraticCurveTo(tp.x + ex * 0.5, tp.y - 2 * s + ey * 0.5 + flu * 4 * s - 3 * s, tp.x + ex, tp.y + ey + flu * 3 * s + 2 * s);
  ctx.quadraticCurveTo(tp.x + ex * 0.45, tp.y + ey * 0.5 + 6 * s - flu * 3 * s, tp.x, tp.y + 9 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(C.ink, 0.95);
  ctx.beginPath();
  ctx.ellipse(tp.x, tp.y - 3 * s, 4.5 * s, 3 * s, 0, 0, TAU);
  ctx.fill();
}

/** crown gear + lantern pinion + chain pump; back=true draws the parts behind the shaft */
function drawCrownGear(ctx, m, P3, theta, back) {
  const s = m.s;
  const Rg = m.Rg;
  const gh = m.gh;
  const c = P3(0, gh, 0);
  const rx = Rg * s;
  const ry = Rg * m.ky * s;
  const nT = 32;
  if (back) {
    // rim side band + top face
    ctx.fillStyle = rgba(C.ochre, 0.85);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 4, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 7 * s;
    ctx.strokeStyle = rgba(C.ochreL, 1);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx - 3.5, ry - 1, 0, 0, TAU);
    ctx.stroke();
    // inner hole shows the ground
    ctx.fillStyle = rgba('#cdb487', 0.95);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 1.5, rx - 7.5, ry - 2.6, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(C.ink, 0.85);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 1, rx - 7.5, ry - 2.4, 0, Math.PI, TAU);
    ctx.stroke();
    // arms (rotate with the shaft)
    ctx.strokeStyle = rgba(C.ink, 0.88);
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = theta + (k * Math.PI) / 2 + 0.3;
      const p = P3(Math.cos(a) * (Rg - 5), gh, Math.sin(a) * (Rg - 5));
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    // back pegs
    ctx.strokeStyle = rgba(C.ink, 0.6);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let k = 0; k < nT; k++) {
      const a = theta + (k * TAU) / nT;
      if (Math.sin(a) >= 0) continue;
      const p = P3(Math.cos(a) * (Rg - 3.5), gh, Math.sin(a) * (Rg - 3.5));
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - 7);
    }
    ctx.stroke();
    // stone pivot under the shaft
    ctx.fillStyle = rgba(C.ink2, 0.7);
    ctx.beginPath();
    ctx.ellipse(c.x, P3(0, 0, 0).y + 2, 16, 5, 0, 0, TAU);
    ctx.fill();
    return;
  }
  // front pegs
  ctx.strokeStyle = rgba(C.ink, 0.92);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let k = 0; k < nT; k++) {
    const a = theta + (k * TAU) / nT;
    if (Math.sin(a) < 0) continue;
    const p = P3(Math.cos(a) * (Rg - 3.5), gh, Math.sin(a) * (Rg - 3.5));
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - 7);
  }
  ctx.stroke();
  // front rim edge stroke (heavier, brush)
  ctx.strokeStyle = rgba(C.ink, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 4, rx, ry, 0, 0.05, Math.PI - 0.05);
  ctx.stroke();

  // ---- chain pump (翻車): trough from the head (by the pinion) down to the creek
  const pc = P3(0, gh + 7 + m.pr, Rg + 4); // pinion centre (meshes on the front rim)
  const head = { x: pc.x + 22, y: pc.y + 8 };
  const tail = PUMP_TAIL;
  const ux = tail.x - head.x;
  const uy = tail.y - head.y;
  const len = Math.hypot(ux, uy);
  const tx = ux / len;
  const ty = uy / len;
  const nx = ty;
  const ny = -tx; // up-normal
  // trestles
  ctx.strokeStyle = rgba(C.ink, 0.8);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (const f of [0.3, 0.62]) {
    const p = { x: head.x + tx * len * f, y: head.y + ty * len * f + 12 };
    const gy = f < 0.5 ? 652 : 668;
    ctx.moveTo(p.x - 8, gy);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x + 8, gy);
  }
  ctx.stroke();
  // return run of the chain above the trough + pallets moving down to the tail
  const lift = 9;
  const ra = { x: head.x + nx * lift, y: head.y + ny * lift };
  const rb = { x: tail.x + nx * lift, y: tail.y + ny * lift };
  ctx.strokeStyle = rgba(C.ink, 0.75);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(ra.x, ra.y);
  ctx.lineTo(rb.x, rb.y);
  ctx.stroke();
  const spacing = 19;
  const speed = 26; // px/s along the chain
  const ph = ((m._t || 0) * speed) % spacing;
  ctx.fillStyle = rgba(C.ochre, 0.95);
  ctx.strokeStyle = rgba(C.ink, 0.85);
  ctx.lineWidth = 0.9;
  for (let d = ph; d < len - 4; d += spacing) {
    const p = { x: ra.x + tx * d, y: ra.y + ty * d };
    // square pallet standing on the chain
    ctx.beginPath();
    ctx.moveTo(p.x - tx * 3, p.y - ty * 3);
    ctx.lineTo(p.x - tx * 3 + nx * 7, p.y - ty * 3 + ny * 7);
    ctx.lineTo(p.x + tx * 3 + nx * 7, p.y + ty * 3 + ny * 7);
    ctx.lineTo(p.x + tx * 3, p.y + ty * 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // trough side board (hides the loaded lower run)
  const tw = 13;
  ctx.fillStyle = rgba('#b88752', 1);
  ctx.beginPath();
  ctx.moveTo(head.x + nx * 3, head.y + ny * 3);
  ctx.lineTo(tail.x + nx * 3, tail.y + ny * 3);
  ctx.lineTo(tail.x - nx * tw, tail.y - ny * tw);
  ctx.lineTo(head.x - nx * tw, head.y - ny * tw);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(C.ochre, 0.5);
  ctx.beginPath();
  ctx.moveTo(head.x - nx * 4, head.y - ny * 4);
  ctx.lineTo(tail.x - nx * 4, tail.y - ny * 4);
  ctx.lineTo(tail.x - nx * tw, tail.y - ny * tw);
  ctx.lineTo(head.x - nx * tw, head.y - ny * tw);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(C.ink, 0.9);
  seg(ctx, { x: head.x + nx * 3, y: head.y + ny * 3 }, { x: tail.x + nx * 3, y: tail.y + ny * 3 }, 2.2, { base: 1, tip: 0.5 });
  seg(ctx, { x: head.x - nx * tw, y: head.y - ny * tw }, { x: tail.x - nx * tw, y: tail.y - ny * tw }, 2.6, { base: 1, tip: 0.4 });
  // cleats on the side board
  ctx.strokeStyle = rgba(C.ink, 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let d = 26; d < len - 10; d += 44) {
    const p = { x: head.x + tx * d, y: head.y + ty * d };
    ctx.moveTo(p.x + nx * 3, p.y + ny * 3);
    ctx.lineTo(p.x - nx * tw, p.y - ny * tw);
  }
  ctx.stroke();
  // tops of the loaded pallets peeking above the board, travelling up
  ctx.fillStyle = rgba(C.ink, 0.7);
  for (let d = spacing - ph; d < len - 6; d += spacing) {
    const p = { x: head.x + tx * d + nx * 3, y: head.y + ty * d + ny * 3 };
    ctx.fillRect(p.x - 1.2, p.y - 2.5, 2.4, 2.6);
  }
  // water slopping in the trough + pouring out at the head into the basin
  ctx.strokeStyle = rgba(C.white, 0.85);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const tt = m._t || 0;
  for (let k = 0; k < 4; k++) {
    const u = (tt * 1.6 + k / 4) % 1;
    const x0 = head.x - 6 - u * 10;
    const y0 = head.y + 2 + u * u * 20;
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 - 2, y0 + 4);
  }
  ctx.stroke();
  ctx.fillStyle = rgba(C.indigo, 0.55);
  ctx.beginPath();
  ctx.moveTo(head.x - 2, head.y);
  ctx.quadraticCurveTo(head.x - 16, head.y + 6, head.x - 18, head.y + 22);
  ctx.lineTo(head.x - 10, head.y + 22);
  ctx.quadraticCurveTo(head.x - 9, head.y + 8, head.x + 2, head.y + 3);
  ctx.closePath();
  ctx.fill();

  // ---- lantern pinion (face-on) meshing on the crown gear's front pegs
  const pr = m.pr * s;
  const pa = theta * 3.2;
  ctx.fillStyle = rgba(C.ochreL, 1);
  ctx.beginPath();
  ctx.arc(pc.x, pc.y, pr, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(C.ink, 0.92);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = pa + (k * Math.PI) / 2;
    ctx.moveTo(pc.x + Math.cos(a) * pr, pc.y + Math.sin(a) * pr);
    ctx.lineTo(pc.x - Math.cos(a) * pr, pc.y - Math.sin(a) * pr);
  }
  ctx.stroke();
  ctx.fillStyle = rgba(C.ink, 0.95);
  for (let k = 0; k < 8; k++) {
    const a = pa + (k * TAU) / 8 + 0.39;
    ctx.beginPath();
    ctx.arc(pc.x + Math.cos(a) * (pr - 3), pc.y + Math.sin(a) * (pr - 3), 1.8, 0, TAU);
    ctx.fill();
  }
  // axle to the head sprocket
  ctx.strokeStyle = rgba(C.ink, 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pc.x, pc.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  // head sprocket (dragon-bone star wheel)
  ctx.fillStyle = rgba('#a7773f', 1);
  ctx.beginPath();
  ctx.arc(head.x, head.y, 8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(C.ink, 0.95);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = -pa * 0.9 + (k * TAU) / 6;
    ctx.moveTo(head.x + Math.cos(a) * 3, head.y + Math.sin(a) * 3);
    ctx.lineTo(head.x + Math.cos(a) * 11, head.y + Math.sin(a) * 11);
  }
  ctx.stroke();
  // tail splash ripples
  ctx.strokeStyle = rgba(C.white, 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const u = (tt * 0.7 + k / 3) % 1;
    const r = 6 + u * 16;
    ctx.ellipse(tail.x, tail.y + 2, r, r * 0.22, 0, Math.PI + 0.3, TAU - 0.3);
  }
  ctx.stroke();
}

// =============================================================================
// small figures: salt workers, geese, crab
// =============================================================================
function drawWorker(ctx, x, y, s, f, act, ph, shade) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f * s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const pull = act === 'rake' ? Math.sin(ph) * (1 - shade) : 0;
  const lean = act === 'rake' ? 0.12 + pull * 0.08 : 0;
  const walk = act === 'carry' ? ph : 0;
  // legs (bare, trousers rolled to the knee)
  const footA = act === 'carry' ? { x: -4 + Math.sin(walk) * 6, y: 0 } : { x: -5, y: 0 };
  const footB = act === 'carry' ? { x: 4 - Math.sin(walk) * 6, y: 0 } : { x: 7, y: 0 };
  const hip = { x: 1 + lean * 10, y: -24 };
  ctx.fillStyle = rgba(C.ink, 0.9);
  seg(ctx, { x: hip.x - 2, y: hip.y + 8 }, footA, 2, { base: 1, tip: 0.6 });
  seg(ctx, { x: hip.x + 2, y: hip.y + 8 }, footB, 2, { base: 1, tip: 0.6 });
  // trousers
  ctx.fillStyle = rgba(C.ochreXL, 0.95);
  ctx.beginPath();
  ctx.moveTo(hip.x - 6, hip.y - 1);
  ctx.lineTo(hip.x + 6, hip.y - 1);
  ctx.lineTo(lerp(hip.x + 3, footB.x, 0.45) + 3, -11);
  ctx.lineTo(lerp(hip.x - 3, footA.x, 0.45) - 3, -11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(C.ink, 0.75);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // torso (short jacket, indigo wash), leaning
  ctx.save();
  ctx.translate(hip.x, hip.y);
  ctx.rotate(lean);
  ctx.fillStyle = rgba(C.indigoL, 0.95);
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.lineTo(-5, -20);
  ctx.lineTo(6, -21);
  ctx.lineTo(9, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(C.ink, 0.85);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // sash
  ctx.strokeStyle = rgba(C.ink2, 0.8);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6.5, -3);
  ctx.lineTo(8.5, -3);
  ctx.stroke();
  // head + conical bamboo hat (斗笠)
  const hx = 1.5;
  const hy = -25;
  ctx.fillStyle = rgba(C.skin, 1);
  ctx.beginPath();
  ctx.arc(hx, hy, 3.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba('#cfa769', 1);
  ctx.beginPath();
  ctx.moveTo(hx - 13, hy - 1);
  ctx.quadraticCurveTo(hx, hy - 12, hx + 13, hy - 1);
  ctx.quadraticCurveTo(hx, hy + 1.5, hx - 13, hy - 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(C.ink, 0.9);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(hx, hy - 7.5);
  ctx.lineTo(hx - 7, hy - 0.5);
  ctx.moveTo(hx, hy - 7.5);
  ctx.lineTo(hx + 7, hy - 0.5);
  ctx.stroke();
  // arms + tools
  ctx.strokeStyle = rgba(C.ink, 0.9);
  ctx.lineWidth = 1.8;
  if (act === 'rake' || act === 'stand') {
    // rake handle held in both hands, head on the ground ahead
    const reach = act === 'rake' ? 30 + pull * 9 : 22;
    const handA = { x: 6 + pull * 3, y: -12 };
    const handB = { x: 11 + pull * 4, y: -8 };
    const rakeHead = { x: reach, y: 24 - lean * 6 };
    if (shade < 0.5) {
      ctx.beginPath();
      ctx.moveTo(2, -18);
      ctx.lineTo(handA.x, handA.y);
      ctx.moveTo(4, -17);
      ctx.lineTo(handB.x, handB.y);
      ctx.stroke();
      ctx.strokeStyle = rgba(C.ink2, 0.95);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(handA.x - 8, handA.y - 6);
      ctx.lineTo(rakeHead.x, rakeHead.y);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rakeHead.x - 1, rakeHead.y - 4);
      ctx.lineTo(rakeHead.x + 1, rakeHead.y + 4);
      ctx.stroke();
    } else {
      // stops work: rake stood upright, other hand shading the eyes
      ctx.beginPath();
      ctx.moveTo(4, -17);
      ctx.lineTo(10, -9);
      ctx.stroke();
      ctx.strokeStyle = rgba(C.ink2, 0.95);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(11, -34);
      ctx.lineTo(13, 24);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -34);
      ctx.lineTo(14, -34);
      ctx.stroke();
      ctx.strokeStyle = rgba(C.ink, 0.9);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(1, -18);
      ctx.lineTo(7, -24);
      ctx.lineTo(4.5, -27.5);
      ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(2, -28);
      ctx.lineTo(7.5, -27);
      ctx.stroke();
    }
  } else if (act === 'carry') {
    // shoulder pole (扁擔) with two baskets of salt, bouncing
    const bob = Math.sin(walk * 2) * 1.6;
    ctx.strokeStyle = rgba(C.ink2, 0.95);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-22, -19 + bob);
    ctx.quadraticCurveTo(1, -23, 24, -19 + bob);
    ctx.stroke();
    ctx.strokeStyle = rgba(C.ink, 0.9);
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-1, -18);
    ctx.lineTo(5, -20);
    ctx.stroke();
    if (shade > 0.5) {
      ctx.beginPath();
      ctx.moveTo(3, -17);
      ctx.lineTo(8, -23);
      ctx.lineTo(4.5, -27.5);
      ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(2, -28);
      ctx.lineTo(7.5, -27);
      ctx.stroke();
    }
    for (const bxp of [-22, 24]) {
      ctx.strokeStyle = rgba(C.ink, 0.6);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(bxp, -19 + bob);
      ctx.lineTo(bxp - 4, -6 + bob);
      ctx.moveTo(bxp, -19 + bob);
      ctx.lineTo(bxp + 4, -6 + bob);
      ctx.stroke();
      ctx.fillStyle = rgba(C.ochre, 0.85);
      ctx.beginPath();
      ctx.moveTo(bxp - 6, -6 + bob);
      ctx.lineTo(bxp + 6, -6 + bob);
      ctx.lineTo(bxp + 4.5, 2 + bob);
      ctx.lineTo(bxp - 4.5, 2 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(C.ink, 0.85);
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = rgba(C.white, 1);
      ctx.beginPath();
      ctx.ellipse(bxp, -6.5 + bob, 5.5, 2.4, 0, Math.PI, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.restore();
}

function drawGeese(ctx, t) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.fillStyle = rgba(C.ink, 0.7);
  for (let i = 0; i < 6; i++) {
    const x = 470 - t * 7 + i * 22 + (i % 2) * 6;
    const y = 132 + i * 9 + Math.sin(t * 0.8 + i) * 2;
    if (x < 30 || x > 720) continue;
    const fl = Math.sin(t * 5.2 + i * 1.3);
    const wy = -4 * fl;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y - 0.5);
    ctx.lineTo(x + 1, y + 1.2);
    ctx.closePath();
    ctx.fill();
    taper(ctx, quadPts({ x: x, y: y }, { x: x - 2, y: y - 3 + wy * 0.6 }, { x: x - 1, y: y - 7 + wy * 1.4 }, 5), 2.2, { base: 1, tip: 0.1 });
    taper(ctx, quadPts({ x: x, y: y }, { x: x + 2, y: y + 1 - wy * 0.2 }, { x: x - 6, y: y - 3 + wy * 1.2 }, 5), 2, { base: 1, tip: 0.1 });
  }
  ctx.restore();
}

/** ink crab (frontal 3/4 view). pose: walk phase, claws 0..1 raised, duck 0..1 */
function drawCrab(ctx, x, y, s, walk, claws, duck, shake) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const bodyY = -9 + duck * 5;
  // legs: 4 per side
  ctx.strokeStyle = rgba(C.ink, 0.9);
  for (let side = -1; side <= 1; side += 2) {
    for (let k = 0; k < 4; k++) {
      const ph = walk + k * 1.4 + (side > 0 ? Math.PI : 0);
      const lift = Math.max(0, Math.sin(ph)) * 3 * (1 - duck);
      const ax = side * (8 + k * 1.5);
      const ay = bodyY + 1 + k * 1.2;
      const kx = side * (17 + k * 2.5 + duck * 3);
      const ky2 = bodyY - 5 + k * 2 - lift + duck * 4;
      const fx = side * (19 + k * 3.2 + duck * 5) + Math.cos(ph) * 2;
      const fy = -lift * 0.5;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(kx, ky2);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }
  }
  // carapace: broken-ink (破墨) — dark rim, lighter centre
  ctx.fillStyle = rgba(C.ink, 0.88);
  ctx.beginPath();
  ctx.ellipse(0, bodyY, 15, 9.5 - duck * 2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(C.ink2, 0.55);
  ctx.beginPath();
  ctx.ellipse(-2, bodyY - 2.5, 7, 3.5, -0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(C.ochre, 0.35);
  ctx.beginPath();
  ctx.ellipse(3, bodyY - 1, 8, 4, 0.1, 0, TAU);
  ctx.fill();
  // eyestalks
  const eh = 6 * (1 - duck);
  ctx.strokeStyle = rgba(C.ink, 0.95);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-4, bodyY - 8);
  ctx.lineTo(-5, bodyY - 8 - eh);
  ctx.moveTo(4, bodyY - 8);
  ctx.lineTo(5, bodyY - 8 - eh);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(-5, bodyY - 8 - eh, 1.7, 0, TAU);
  ctx.arc(5, bodyY - 8 - eh, 1.7, 0, TAU);
  ctx.fill();
  // claws (chelae), raised in threat
  for (let side = -1; side <= 1; side += 2) {
    const sh = shake * Math.sin(walk * 3 + side) * 3;
    const up = claws * (1 - duck);
    const ax = side * 11;
    const ay = bodyY - 3;
    const ex = side * (19 - up * 3);
    const ey = bodyY - 6 - up * 10 + sh * 0.5;
    const cx = side * (15 - up * 1) + sh * 0.3;
    const cy = bodyY - 10 - up * 16 + sh;
    ctx.strokeStyle = rgba(C.ink, 0.92);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ex, ey);
    ctx.lineTo(cx, cy + 5);
    ctx.stroke();
    // pincer: fat palm + two fingers
    ctx.fillStyle = rgba(C.ink, 0.9);
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 4.6, 6, side * 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(C.ochre, 0.45);
    ctx.beginPath();
    ctx.ellipse(cx - side * 1, cy + 3, 2, 3.2, side * 0.3, 0, TAU);
    ctx.fill();
    const open = 0.3 + 0.35 * Math.max(0, Math.sin(walk * 2.5)) * up;
    ctx.strokeStyle = rgba(C.ink, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.lineTo(cx + side * Math.sin(open) * 4, cy - 8);
    ctx.moveTo(cx, cy - 2);
    ctx.lineTo(cx - side * Math.sin(open) * 3, cy - 7);
    ctx.stroke();
  }
  ctx.restore();
}

// =============================================================================
// the rider, re-painted in ink & light colour
// =============================================================================
function drawInkRider(ctx, kit, rig, scene, t) {
  const s = rig.root.scale;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const INK = C.ink;

  // 1. flag pole + mini Chinese sail rotor
  ctx.fillStyle = rgba(C.ink2, 0.92);
  seg(ctx, rig.poleBase, rig.poleTop, 3 * s, { base: 1, tip: 0.5 });
  kit.drawPinwheel(ctx, rig.pinHub, rig.pinwheelAngle, {
    ...(scene.pinwheel || {}),
    type: 'chinese',
    colors: ['#dcc497', '#cfae79', '#c39a62'],
    stroke: INK,
    lineWidth: 1.1,
    time: t,
  });

  const crank = (pedal, alpha) => {
    ctx.strokeStyle = rgba(INK, alpha);
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(rig.bb.x, rig.bb.y);
    ctx.lineTo(pedal.x, pedal.y);
    ctx.stroke();
    ctx.lineWidth = 3.2 * s;
    ctx.beginPath();
    ctx.moveTo(pedal.x - 6 * s, pedal.y + 1.5 * s);
    ctx.lineTo(pedal.x + 6 * s, pedal.y + 1.5 * s);
    ctx.stroke();
  };
  const leg = (hip, knee, foot, alpha) => {
    ctx.fillStyle = rgba(INK, alpha);
    taper(ctx, [hip, lerpP(hip, knee, 0.5), knee, lerpP(knee, foot, 0.5), foot], 3.6 * s, { base: 0.9, tip: 0.55, t1: 0.2 });
    ctx.strokeStyle = rgba(INK, alpha);
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(foot.x, foot.y);
    ctx.lineTo(foot.x + 12 * s, foot.y + 2.5 * s);
    ctx.moveTo(foot.x, foot.y);
    ctx.lineTo(foot.x + 9 * s, foot.y + 5 * s);
    ctx.moveTo(foot.x, foot.y);
    ctx.lineTo(foot.x - 5 * s, foot.y + 2 * s);
    ctx.stroke();
  };

  // 2. far leg & crank
  crank(rig.farPedal, 0.55);
  leg(rig.farHip, rig.farKnee, rig.farFoot, 0.55);

  // 3. wheels: light spokes, ochre rim, ink tyre pressed heavier at the bottom
  for (const w of [rig.rearWheel, rig.frontWheel]) {
    ctx.strokeStyle = rgba(INK, 0.32);
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rig.wheelAngle + (i * TAU) / 10;
      ctx.moveTo(w.x + Math.cos(a) * 3 * s, w.y + Math.sin(a) * 3 * s);
      ctx.lineTo(w.x + Math.cos(a) * (w.r - 3 * s), w.y + Math.sin(a) * (w.r - 3 * s));
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(C.ochreL, 0.75);
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r - 3.4 * s, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = rgba(INK, 0.9);
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r + 1.6 * s, 0, TAU);
    ctx.arc(w.x + 0.6 * s, w.y - 1.6 * s, w.r - 0.9 * s, 0, TAU, true);
    ctx.fill('evenodd');
    ctx.beginPath();
    ctx.arc(w.x, w.y, 3.2 * s, 0, TAU);
    ctx.fill();
  }

  // 4. chain ring + chain
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.arc(rig.bb.x, rig.bb.y, 10 * s, 0, TAU);
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y - 4 * s);
  ctx.lineTo(rig.bb.x, rig.bb.y - 10 * s);
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y + 4 * s);
  ctx.lineTo(rig.bb.x, rig.bb.y + 10 * s);
  ctx.stroke();

  // 5. frame: ochre wash under bone-line ink
  const tubes = [
    [rig.rearWheel, rig.seatCluster],
    [rig.seatCluster, rig.bb],
    [rig.bb, rig.rearWheel],
    [rig.seatCluster, rig.headTop],
    [rig.headBot, rig.bb],
    [rig.headTop, rig.headBot],
    [rig.headBot, rig.frontWheel],
  ];
  ctx.strokeStyle = rgba(C.ochre, 0.5);
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  for (const [a, b] of tubes) {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.fillStyle = rgba(INK, 0.92);
  for (const [a, b] of tubes) seg(ctx, a, b, 2.4 * s, { base: 0.9, tip: 0.45, t1: 0.25 });
  ctx.strokeStyle = rgba(INK, 0.9);
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.moveTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.saddle.x, rig.saddle.y);
  ctx.moveTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.stemTop.x, rig.stemTop.y);
  ctx.quadraticCurveTo(rig.stemTop.x - 5 * s, rig.stemTop.y - 5 * s, rig.grip.x, rig.grip.y);
  ctx.stroke();
  ctx.fillStyle = rgba(INK, 0.95);
  seg(ctx, { x: rig.saddle.x - 12 * s, y: rig.saddle.y }, { x: rig.saddle.x + 11 * s, y: rig.saddle.y + 1 * s }, 5 * s, { base: 1, tip: 0.5 });

  // 6. bird: tail, body
  const b = rig.body;
  const ct = Math.cos(b.tilt);
  const st = Math.sin(b.tilt);
  const E = (th, k = 1) => ({ x: b.x + b.rx * k * Math.cos(th) * ct - b.ry * k * Math.sin(th) * st, y: b.y + b.rx * k * Math.cos(th) * st + b.ry * k * Math.sin(th) * ct });
  ctx.fillStyle = C.white;
  ctx.beginPath();
  const t1 = { x: b.x - b.rx * 0.6, y: b.y - b.ry * 0.35 };
  const t2 = { x: b.x - b.rx * 0.55, y: b.y + b.ry * 0.45 };
  ctx.moveTo(t1.x, t1.y);
  ctx.lineTo(rig.tailTip.x, rig.tailTip.y);
  ctx.lineTo(t2.x, t2.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(INK, 0.75);
  taper(ctx, [t1, lerpP(t1, rig.tailTip, 0.5), rig.tailTip], 1.4 * s, { base: 0.6, tip: 0.3 });
  taper(ctx, [rig.tailTip, lerpP(rig.tailTip, t2, 0.5), t2], 1.6 * s, { base: 0.3, tip: 0.6 });
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  ctx.fill();
  // pale ink-blue wash on the belly (shadow)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  ctx.clip();
  ctx.fillStyle = rgba(C.indigoL, 0.38);
  ctx.beginPath();
  ctx.ellipse(b.x - 4 * s, b.y + b.ry * 0.7, b.rx * 1.05, b.ry * 0.55, b.tilt, 0, TAU);
  ctx.fill();
  ctx.restore();
  // contour: heavier belly line, broken light back line
  const belly = [];
  for (let k = 0; k <= 12; k++) belly.push(E(0.12 + (k / 12) * 2.6));
  ctx.fillStyle = rgba(INK, 0.88);
  taper(ctx, belly, 2.6 * s, { base: 0.5, tip: 0.15, jit: 0.4, seed: 2 });
  const backL = [];
  for (let k = 0; k <= 8; k++) backL.push(E(3.5 + (k / 8) * 1.7));
  taper(ctx, backL, 1.6 * s, { base: 0.3, tip: 0.1, jit: 0.3, seed: 5 });

  // folded wing on the body
  const sh = rig.wingShoulder;
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y);
  ctx.bezierCurveTo(sh.x - 24 * s, sh.y - 8 * s, sh.x - 58 * s, sh.y + 2 * s, rig.tailTip.x - 4 * s, rig.tailTip.y + 3 * s);
  ctx.bezierCurveTo(sh.x - 46 * s, sh.y + 20 * s, sh.x - 16 * s, sh.y + 20 * s, sh.x + 2 * s, sh.y + 10 * s);
  ctx.closePath();
  ctx.fillStyle = '#efe7d3';
  ctx.fill();
  ctx.fillStyle = rgba(INK, 0.7);
  taper(ctx, cubicPts({ x: rig.tailTip.x - 4 * s, y: rig.tailTip.y + 3 * s }, { x: sh.x - 46 * s, y: sh.y + 20 * s }, { x: sh.x - 16 * s, y: sh.y + 20 * s }, { x: sh.x + 2 * s, y: sh.y + 10 * s }, 10), 1.6 * s, { base: 0.2, tip: 0.3 });
  ctx.fillStyle = rgba(INK, 0.45);
  for (let k = 0; k < 4; k++) {
    const fx = sh.x - (22 + k * 9) * s;
    taper(ctx, [{ x: fx, y: sh.y + (6 + k * 1.5) * s }, { x: fx - 6 * s, y: sh.y + (9 + k * 1.3) * s }, { x: fx - 12 * s, y: sh.y + (12 + k * 1.2) * s }], 1.5 * s, { base: 1, tip: 0.1 });
  }

  // 7. neck (S-curve), white with two contour lines
  const neck = cubicPts(rig.neckBase, rig.neckC1, rig.neckC2, rig.head, 14);
  const nw = 6 * s;
  const left = [];
  const right = [];
  for (let i = 0; i < neck.length; i++) {
    const a = neck[i > 0 ? i - 1 : 0];
    const c = neck[i < neck.length - 1 ? i + 1 : neck.length - 1];
    let dx = c.x - a.x;
    let dy = c.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const w = nw * (1.15 - 0.3 * (i / (neck.length - 1)));
    left.push({ x: neck[i].x - dy * w, y: neck[i].y + dx * w });
    right.push({ x: neck[i].x + dy * w, y: neck[i].y - dx * w });
  }
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(INK, 0.85);
  taper(ctx, left.slice(1, 13), 1.9 * s, { base: 0.5, tip: 0.2, jit: 0.3, seed: 9 });
  taper(ctx, right.slice(2, 12), 1.3 * s, { base: 0.3, tip: 0.2, jit: 0.3, seed: 11 });
  // breeding-plumage breast patch (gamboge wash)
  ctx.fillStyle = rgba(C.gamboge, 0.5);
  ctx.beginPath();
  ctx.ellipse(rig.chest.x - 3 * s, rig.chest.y + 1 * s, 9 * s, 7 * s, -0.5, 0, TAU);
  ctx.fill();

  // crest plumes
  const cr = rig.crestRoot;
  ctx.fillStyle = rgba(C.gamboge, 0.9);
  taper(ctx, quadPts(cr, { x: (cr.x + rig.crestTip1.x) / 2, y: cr.y - 6 * s }, rig.crestTip1, 8), 2.4 * s, { base: 1, tip: 0.05 });
  taper(ctx, quadPts({ x: cr.x, y: cr.y + 2 * s }, { x: (cr.x + rig.crestTip2.x) / 2, y: cr.y - 1 * s }, rig.crestTip2, 8), 2 * s, { base: 1, tip: 0.05 });

  // head
  const h = rig.head;
  ctx.fillStyle = C.white;
  ctx.beginPath();
  ctx.arc(h.x, h.y, h.r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(INK, 0.85);
  const headArc = [];
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * 0.75 + (k / 8) * Math.PI * 0.95;
    headArc.push({ x: h.x + Math.cos(a) * h.r, y: h.y + Math.sin(a) * h.r });
  }
  taper(ctx, headArc, 1.6 * s, { base: 0.4, tip: 0.2 });
  // black facial mask (dense scorched ink 焦墨)
  {
    const ca = Math.cos(h.angle);
    const sa = Math.sin(h.angle);
    const Rm = (px, py) => ({ x: h.x + px * ca - py * sa, y: h.y + px * sa + py * ca });
    const m0 = Rm(-1, -h.r * 0.95);
    const m1 = Rm(h.r * 0.95, -h.r * 0.5);
    const m2 = Rm(h.r * 1.05, h.r * 0.55);
    const m3 = Rm(h.r * 0.1, h.r * 0.9);
    const m4 = Rm(-h.r * 0.15, 0);
    const q1 = Rm(h.r * 0.8, -h.r * 1.0);
    const q2 = Rm(h.r * 0.6, h.r * 1.0);
    ctx.beginPath();
    ctx.moveTo(m0.x, m0.y);
    ctx.quadraticCurveTo(q1.x, q1.y, m1.x, m1.y);
    ctx.lineTo(m2.x, m2.y);
    ctx.quadraticCurveTo(q2.x, q2.y, m3.x, m3.y);
    ctx.quadraticCurveTo(m4.x - 2 * s, m4.y + 4 * s, m4.x, m4.y);
    ctx.quadraticCurveTo(m4.x - 1 * s, m4.y - 6 * s, m0.x, m0.y);
    ctx.closePath();
    ctx.fillStyle = rgba(INK, 0.96);
    ctx.fill();
  }
  // bill with spoon tip
  {
    const bb0 = rig.billBase;
    const bt = rig.billTip;
    const d = rig.billDir;
    const nx = -Math.sin(d);
    const ny = Math.cos(d);
    const L = Math.hypot(bt.x - bb0.x, bt.y - bb0.y);
    const ux = (bt.x - bb0.x) / L;
    const uy = (bt.y - bb0.y) / L;
    const spoonC = { x: bt.x - ux * 8 * s, y: bt.y - uy * 8 * s };
    ctx.beginPath();
    ctx.moveTo(bb0.x + nx * -4.6 * s, bb0.y + ny * -4.6 * s);
    ctx.lineTo(spoonC.x - ux * 6 * s + nx * -2.2 * s, spoonC.y - uy * 6 * s + ny * -2.2 * s);
    ctx.quadraticCurveTo(bt.x + nx * -6.5 * s, bt.y + ny * -6.5 * s, bt.x + ux * 1.5 * s, bt.y + uy * 1.5 * s);
    ctx.quadraticCurveTo(bt.x + nx * 7.5 * s + ux * -1 * s, bt.y + ny * 7.5 * s + uy * -1 * s, spoonC.x - ux * 6 * s + nx * 2.4 * s, spoonC.y - uy * 6 * s + ny * 2.4 * s);
    ctx.lineTo(bb0.x + nx * 4.4 * s, bb0.y + ny * 4.4 * s);
    ctx.closePath();
    ctx.fillStyle = rgba(INK, 0.95);
    ctx.fill();
    // dry-brush highlight along the culmen
    ctx.strokeStyle = 'rgba(240,230,210,0.28)';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(bb0.x + ux * 6 * s - nx * 1.2 * s, bb0.y + uy * 6 * s - ny * 1.2 * s);
    ctx.lineTo(spoonC.x - ux * 6 * s, spoonC.y - uy * 6 * s);
    ctx.stroke();
  }
  // eye
  const e = rig.eye;
  ctx.fillStyle = rgba(C.gamboge, 0.95);
  ctx.beginPath();
  ctx.arc(e.x, e.y, 2.6 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0b0a09';
  ctx.beginPath();
  ctx.arc(e.x + 0.4 * s, e.y, 1.5 * s, 0, TAU);
  ctx.fill();

  // 8. near crank + leg
  crank(rig.nearPedal, 0.92);
  leg(rig.nearHip, rig.nearKnee, rig.nearFoot, 0.92);

  // 9. near wing reaching for the bar
  {
    const el = rig.wingElbow;
    const hd = rig.wingHand;
    ctx.beginPath();
    ctx.moveTo(sh.x - 12 * s, sh.y - 5 * s);
    ctx.bezierCurveTo(el.x - 6 * s, el.y - 16 * s, hd.x - 6 * s, hd.y - 12 * s, hd.x + 4 * s, hd.y - 5 * s);
    ctx.quadraticCurveTo(hd.x + 9 * s, hd.y - 1 * s, hd.x + 5 * s, hd.y + 3.5 * s);
    ctx.quadraticCurveTo(hd.x + 1 * s, hd.y + 6 * s, hd.x - 3 * s, hd.y + 3 * s);
    ctx.quadraticCurveTo(hd.x - 5 * s, hd.y + 8 * s, hd.x - 10 * s, hd.y + 4 * s);
    ctx.quadraticCurveTo(el.x - 2 * s, el.y + 9 * s, el.x - 9 * s, el.y + 6 * s);
    ctx.quadraticCurveTo(el.x - 14 * s, el.y + 13 * s, sh.x - 8 * s, sh.y + 12 * s);
    ctx.quadraticCurveTo(sh.x - 18 * s, sh.y + 12 * s, sh.x - 20 * s, sh.y + 5 * s);
    ctx.closePath();
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.fillStyle = rgba(INK, 0.85);
    taper(ctx, cubicPts({ x: sh.x - 12 * s, y: sh.y - 5 * s }, { x: el.x - 6 * s, y: el.y - 16 * s }, { x: hd.x - 6 * s, y: hd.y - 12 * s }, { x: hd.x + 4 * s, y: hd.y - 5 * s }, 10), 1.8 * s, { base: 0.4, tip: 0.3, jit: 0.3, seed: 4 });
    ctx.fillStyle = rgba(INK, 0.7);
    taper(ctx, [{ x: hd.x + 5 * s, y: hd.y + 3.5 * s }, { x: hd.x - 3 * s, y: hd.y + 4 * s }, { x: el.x - 4 * s, y: el.y + 8 * s }, { x: sh.x - 8 * s, y: sh.y + 12 * s }], 1.4 * s, { base: 0.5, tip: 0.2 });
    ctx.fillStyle = rgba(INK, 0.4);
    taper(ctx, [{ x: sh.x - 10 * s, y: sh.y + 3 * s }, { x: el.x - 4 * s, y: el.y - 4 * s }, { x: hd.x - 4 * s, y: hd.y - 2 * s }], 1.2 * s, { base: 0.4, tip: 0.1 });
  }
  ctx.restore();
}

// =============================================================================
// render
// =============================================================================
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const { t, rawLocalT, isThumbnail } = params;
  ctx.save();

  // ---- static layers
  const bg = kit.bake('china_bg_v4', P, P, (g, rng) => paintBackground(kit, g, rng));
  const overlay = kit.bake('china_silk_v1', P, P, (g, rng) => paintOverlay(kit, g, rng));
  const textKey = fontsReady() ? 'china_text_v3' : 'china_text_fallback_v3';
  const text = kit.bake(textKey, TXT_W, TXT_H, (g, rng) => paintInscription(kit, g, rng));
  const junks = [0, 1, 2].map((v) => kit.bake(`china_junk_${v}`, 90, 76, (g, rng, w, h) => paintJunk(kit, g, w, h, rng, v)));
  const reedL = kit.bake('china_reeds_L2', 250, 170, (g, rng, w, h) => paintReedClump(kit, g, w, h, rng, 0));
  const reedR = kit.bake('china_reeds_R2', 240, 180, (g, rng, w, h) => paintReedClump(kit, g, w, h, rng, 1));
  const sampan = kit.bake('china_sampan', 260, 150, (g, rng, w, h) => paintSampan(kit, g, w, h, rng));

  ctx.drawImage(bg, 0, 0);

  // ---- far: junks drifting along the horizon, geese
  const drift = t * 1.6;
  const junkPos = [
    [170, 404, 0],
    [430, 398, 2],
    [580, 413, 1],
  ];
  ctx.save();
  ctx.globalAlpha = 0.78;
  for (const [x0, y0, v] of junkPos) {
    const x = ((x0 + drift - 40 + 700) % 700) + 20;
    const bob = Math.sin(t * 1.3 + x0) * 0.6;
    ctx.drawImage(junks[v], x - 28, y0 - 42 + bob, 56, 47);
  }
  ctx.restore();
  drawGeese(ctx, rawLocalT + 8);

  // ---- distant windmills
  ctx.save();
  ctx.globalAlpha = MILL3.alpha;
  drawMill(ctx, MILL3, t * 0.62 + 2.1, t, 0);
  ctx.globalAlpha = MILL2.alpha;
  drawMill(ctx, MILL2, t * 0.58 + 0.7, t, 0);
  ctx.restore();

  // ---- salt glints (crystals glistening in the white pans)
  ctx.save();
  ctx.strokeStyle = 'rgba(255,253,245,0.95)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 14; k++) {
    const r = 3 + (k % 5);
    const y = lerp(PAN_ROWS[r], PAN_ROWS[r + 1], 0.5);
    const x = panX(60 + h1(k * 3.3) * 900, y);
    const tw = Math.pow(Math.max(0, Math.sin(t * 1.9 + k * 2.17)), 10);
    if (tw < 0.05) continue;
    const L = 2 + 4 * tw;
    ctx.globalAlpha = tw;
    ctx.beginPath();
    ctx.moveTo(x - L, y);
    ctx.lineTo(x + L, y);
    ctx.moveTo(x, y - L);
    ctx.lineTo(x, y + L);
    ctx.stroke();
  }
  ctx.restore();

  // ---- moored sampan in the tidal water, with a wavering reflection
  {
    const bx = 455;
    const by = 765;
    const bob = Math.sin(t * 1.1) * 1.2;
    const rock = Math.sin(t * 1.1 + 0.6) * 0.012;
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let k = 0; k < 6; k++) {
      const sy = 92 + k * 8;
      const off = Math.sin(t * 2.2 + k * 1.3) * 3;
      ctx.drawImage(sampan, 0, sy, 260, 8, bx + off, by + 128 + (128 - sy) * 0.6 + bob, 260, 5);
    }
    ctx.restore();
    ctx.save();
    ctx.translate(bx + 130, by + 128 + bob);
    ctx.rotate(rock);
    ctx.drawImage(sampan, -130, -128);
    ctx.restore();
  }

  // ---- gag timing
  const gag = !isThumbnail;
  const lt = rawLocalT;
  const shade = gag ? sstep(4.0, 4.4, lt) * (1 - sstep(6.8, 7.3, lt)) : 0;

  // ---- salt workers (mid-ground)
  drawWorker(ctx, 236, 592, 1.25, 1, 'rake', t * 2.0 + 1.7, shade);
  drawWorker(ctx, 312, 628, 1.5, 1, 'rake', t * 2.2, shade);
  const carryX = 150 + 4.5 * (rawLocalT + 8);
  drawWorker(ctx, carryX, 684, 1.4, 1, 'carry', t * 5.2, shade * sstep(3.5, 4.2, lt));
  drawWorker(ctx, 934, 652, 1.4, -1, 'stand', 0, shade);

  // ---- main windmill + crown gear + chain pump
  MILL._t = t;
  const theta = t * 0.66 + 0.12 * Math.sin(t * 0.45);
  drawMill(ctx, MILL, theta, t, 1, sailPatterns(ctx, kit));

  // creek ripples drifting
  ctx.save();
  ctx.strokeStyle = 'rgba(248,243,228,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const x = 760 + ((k * 37 + t * 9) % 230);
    const y = 668 + (k % 3) * 7;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 5, y - 1.5, x + 11, y);
  }
  ctx.stroke();
  ctx.restore();

  // ---- crab gag (bar 3)
  let crab = null;
  if (gag && lt > 2.4 && lt < 7.8) {
    const road = { x: CRAB_X, y: 703 };
    let x = BURROW.x;
    let y = BURROW.y;
    let walk = t * 16;
    let claws = 0;
    let duck = 0;
    let shake = 0;
    let peek = 1;
    if (lt < 3.4) {
      // eyes peeking out of the burrow
      peek = sstep(2.4, 2.9, lt);
      duck = 1;
      walk = 0;
    } else if (lt < 4.15) {
      const u = sstep(3.4, 4.15, lt);
      x = lerp(BURROW.x, road.x, u);
      y = lerp(BURROW.y, road.y, u) - Math.sin(u * Math.PI) * 6;
    } else if (lt < 6.85) {
      x = road.x;
      y = road.y;
      walk = t * 3;
      claws = 1;
      shake = lt > 6.0 ? 1 : 0.3;
      // ducks as each wheel passes over
      const fw = params.riderLocalX + 84 - CRAB_X;
      const rw = params.riderLocalX - 84 - CRAB_X;
      duck = Math.max(1 - sstep(25, 60, Math.abs(fw)), 1 - sstep(25, 60, Math.abs(rw)));
    } else {
      const u = sstep(6.85, 7.6, lt);
      x = lerp(road.x, BURROW.x, u);
      y = lerp(road.y, BURROW.y, u) - Math.sin(u * Math.PI) * 5;
      claws = 1 - u;
      peek = 1 - sstep(7.45, 7.7, lt);
    }
    crab = { x, y, walk, claws, duck, shake, peek };
    if (lt < 3.4) {
      // peeking eyes only
      ctx.save();
      ctx.fillStyle = rgba(C.ink, 0.95 * peek);
      ctx.strokeStyle = rgba(C.ink, 0.95 * peek);
      ctx.lineWidth = 1.4;
      const ey = BURROW.y - 3 - 6 * peek;
      const look = Math.sin(lt * 5) * 1.5;
      ctx.beginPath();
      ctx.moveTo(BURROW.x - 3, BURROW.y);
      ctx.lineTo(BURROW.x - 4 + look, ey);
      ctx.moveTo(BURROW.x + 3, BURROW.y);
      ctx.lineTo(BURROW.x + 4 + look, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(BURROW.x - 4 + look, ey, 1.9, 0, TAU);
      ctx.arc(BURROW.x + 4 + look, ey, 1.9, 0, TAU);
      ctx.fill();
      ctx.restore();
      crab = null;
    } else if (crab.y > ROAD_Y) {
      // on the slope: draw before the rider
      drawCrab(ctx, crab.x, crab.y, CRAB_S, crab.walk, crab.claws, crab.duck, crab.shake);
      crab = null;
    }
  }

  // ---- rider (with the two-stage hop over the crab)
  if (kit.riderVisible(params)) {
    let roadFn = null;
    if (gag && lt > 3.6 && lt < 6.9) {
      const liftAt = (dx) => {
        const u = (dx + 6) / 58;
        return Math.abs(u) < 1 ? 30 * (1 - u * u) : 0;
      };
      roadFn = (x) => {
        const lf = liftAt(x + 84 - CRAB_X);
        const lr = liftAt(x - 84 - CRAB_X);
        const sn = clamp((lr - lf) / 168, -0.5, 0.5);
        return { y: ROAD_Y - (lf + lr) / 2, slope: Math.asin(sn) };
      };
    }
    const rig = kit.riderRig(params, roadFn ? { roadFn } : {});
    // soft shadow on the path
    ctx.fillStyle = rgba(C.ink, 0.12);
    ctx.beginPath();
    ctx.ellipse(params.riderLocalX, ROAD_Y + 3, 105, 4.5, 0, 0, TAU);
    ctx.fill();
    drawInkRider(ctx, kit, rig, scene, t);
  }
  // crab on the path is in front of the far leg but drawn over the road after the rider? keep it
  // between the wheels: draw it after the rider so it stays visible under the frame
  if (crab) drawCrab(ctx, crab.x, crab.y, CRAB_S, crab.walk, crab.claws, crab.duck, crab.shake);

  // landing puffs (dust/ink spatter) where the wheels come down
  if (gag) {
    for (const tl of [4.95, 6.3]) {
      const u = (lt - tl) / 0.45;
      if (u > 0 && u < 1) {
        ctx.save();
        ctx.fillStyle = rgba(C.ink2, 0.35 * (1 - u));
        for (let k = 0; k < 6; k++) {
          const a = Math.PI + (k / 5) * Math.PI;
          const r = 6 + u * 16 + (k % 2) * 4;
          ctx.beginPath();
          ctx.arc(CRAB_X + 58 + Math.cos(a) * r * 1.4, ROAD_Y - 2 + Math.sin(a) * r * 0.45, 1.6 + (1 - u) * 1.6, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  // ---- foreground reeds sway (in front of everything)
  const sway = (base, amp, ph) => base + amp * Math.sin(t * 1.3 + ph) + amp * 0.4 * Math.sin(t * 2.7 + ph * 2);
  // (skew about each clump's base line, relative to the current transform)
  let k = sway(0.05, 0.06, 0);
  ctx.save();
  ctx.transform(1, 0, -k, 1, k * 850, 0);
  ctx.drawImage(reedL, 6, 680);
  ctx.restore();
  k = sway(0.06, 0.06, 1.7);
  ctx.save();
  ctx.transform(1, 0, -k, 1, k * 868, 0);
  ctx.drawImage(reedR, 768, 688);
  ctx.restore();

  // ---- inscription & seals
  ctx.drawImage(text, TXT_X0, TXT_Y0);
  // collector's seal bottom-left (baked separately to keep the text sprite small)
  const seal = kit.bake(fontsReady() ? 'china_seal_v1' : 'china_seal_fb_v1', 64, 64, (g, rng) => paintSeal(kit, g, 4, 4, 52, ['乘', '風', '騎', '行'], 'white', rng));
  ctx.drawImage(seal, 34, 918);

  // ---- silk: weave, stains, creases multiplied over everything
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(overlay, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}
