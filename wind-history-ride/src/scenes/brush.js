// src/scenes/brush.js
// #09 · 1887–1888 · 第一批發電風機 — The first electric wind turbines.
//
// Medium: the cover of a Victorian popular-science weekly, cut as a WOOD ENGRAVING
// (end-grain boxwood): cream newsprint, an engraved masthead band, tone built from
// machine-ruled parallel lines of varying thickness (skies), white-line cutting in the
// darks, cross-hatching on the figures, numbered views and a caption block.
//
//   1. "The windmill in the park" (Cleveland, Ohio, 1888) — after the Dec. 1890 account:
//      a wheel 56 ft in diameter with 144 twisted cedar blades (~1,800 sq ft of sail),
//      on a rectangular tapered tower ~60 ft high that turns bodily on a wrought-iron
//      gudgeon (circular rail at its foot), a tail 60 ft long and 20 ft wide, a small
//      auxiliary vane on one side (furls the wheel in gales). Inside, a 12 kW dynamo
//      geared 50 : 1 by belts charges the storage cells in the mansion's basement.
//   2. Inset: Blyth's cloth-sailed wind engine (tripod, upright windshaft, four arms with
//      canvas sails) lighting his cottage at Marykirk, Scotland, 1887.
//
// Gag: the mansion's lamps brighten and dim with the gusts (and the rider's pinwheel);
// on bar 3 a big gust lifts a gentleman's top hat, which tumbles over the drive and
// lands on the rider's pinwheel pole.

const S = 1000;
const ROAD_Y = 700;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const INK = '#1c1915';
const IR = 28;
const IG = 25;
const IB = 21;
const PAPER = '#efe7d3';
const ink = (a) => `rgba(28,25,21,${a})`;
const paper = (a) => `rgba(241,234,216,${a})`;
const PIC = { y0: 152, y1: 890 };

// -----------------------------------------------------------------------------
// small math
// -----------------------------------------------------------------------------
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function ss(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
/** integral of smoothstep(a,b,x) dx from a to T (closed form, 0 before a) */
function intSmooth(T, a, b) {
  const s = clamp01((T - a) / (b - a));
  return (b - a) * (s * s * s - 0.5 * s * s * s * s) + Math.max(0, T - b);
}
function h1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
const lerp = (a, b, t) => a + (b - a) * t;
const pmod = (a, m) => ((a % m) + m) % m;
const lerpP = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

// -----------------------------------------------------------------------------
// wind, wheel speed, lamps
// -----------------------------------------------------------------------------
// gusts: [rise0, rise1, fall0, fall1, amplitude]; bar 3 (4–6 s) carries the big one
const GUSTS = [
  [0.1, 0.7, 1.2, 2.0, 0.28],
  [2.0, 2.5, 3.0, 3.7, 0.34],
  [3.75, 4.15, 5.5, 6.6, 0.8],
  [7.0, 7.35, 7.8, 8.7, 0.22],
];
const W0 = 0.86;
function wind(T) {
  let w = W0 + 0.07 * Math.sin(1.7 * T + 0.3) + 0.05 * Math.sin(3.1 * T + 1.2);
  for (const g of GUSTS) w += g[4] * (ss(g[0], g[1], T) - ss(g[2], g[3], T));
  return w;
}
function windInt(T) {
  let w = W0 * T - (0.07 / 1.7) * Math.cos(1.7 * T + 0.3) - (0.05 / 3.1) * Math.cos(3.1 * T + 1.2);
  for (const g of GUSTS) w += g[4] * (intSmooth(T, g[0], g[1]) - intSmooth(T, g[2], g[3]));
  return w;
}
/** gust strength above the base breeze, 0..~1 */
function gustLevel(T) {
  let g = 0;
  for (const q of GUSTS) g += q[4] * (ss(q[0], q[1], T) - ss(q[2], q[3], T));
  return g;
}
/** the engine's pinwheel spin rate (derivative of pinwheelAngleAt), normalised around 0 */
function pinRate(t) {
  const d = 0.9 * 0.73 * Math.cos(t * 0.73) + 0.45 * 1.91 * Math.cos(t * 1.91 + 1.3);
  return d / 1.5;
}
function lampLevel(T, t) {
  const w = wind(T);
  const base = clamp01((w - 0.74) / 0.95);
  return clamp01(0.12 + 0.86 * base + 0.1 * pinRate(t));
}

// -----------------------------------------------------------------------------
// tiny orthographic 3D for the windmill (feet; Y up; wheel faces -X)
// -----------------------------------------------------------------------------
const V = { cx: 700, gy: 655, s: 5.0, A: 48 * DEG, P: 0.06 };
const cA = Math.cos(V.A);
const sA = Math.sin(V.A);
const cP = Math.cos(V.P);
const sP = Math.sin(V.P);
function pr(X, Y, Z) {
  const xr = X * cA + Z * sA;
  const zr = -X * sA + Z * cA;
  return { x: V.cx + V.s * xr, y: V.gy - V.s * (Y * cP - zr * sP), d: zr };
}
const TOWER_H = 56;
const HB = 10; // half-width at the foot
const HT = 4.3; // half-width at the top
const tw = (Y) => HB - ((HB - HT) * Y) / TOWER_H;
const WHEEL = { X: -9.5, Y: 58.5, R: 28, r0: 8.6, n: 144 };
const HUB = pr(WHEEL.X, WHEEL.Y, 0);
// disc basis: point = HUB + r*(cos(phi)*DU + sin(phi)*DV)
const DU = { x: 0, y: -V.s * cP };
const DV = { x: V.s * sA, y: V.s * cA * sP };
const disc = (r, phi) => ({
  x: HUB.x + r * (Math.cos(phi) * DU.x + Math.sin(phi) * DV.x),
  y: HUB.y + r * (Math.cos(phi) * DU.y + Math.sin(phi) * DV.y),
});

// -----------------------------------------------------------------------------
// tone canvas: R = darkness, G = line angle (0..180°), B = line spacing
// -----------------------------------------------------------------------------
function tone(t, angDeg = 0, sp = 3) {
  const r = Math.round(clamp01(t) * 255);
  const a = ((angDeg % 180) + 180) % 180;
  const g = Math.round((a / 180) * 255);
  const b = Math.round(clamp01((sp - 1.5) / 8) * 255);
  return `rgb(${r},${g},${b})`;
}
function toneA(t, angDeg, sp, alpha) {
  const r = Math.round(clamp01(t) * 255);
  const a = ((angDeg % 180) + 180) % 180;
  const g = Math.round((a / 180) * 255);
  const b = Math.round(clamp01((sp - 1.5) / 8) * 255);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Engrave: turn the tone map into ruled lines of varying width (bake time only). */
function engrave(g, tcv, y0, y1) {
  const W = S;
  const H = y1 - y0;
  const src = tcv.getContext('2d').getImageData(0, y0, W, H).data;
  const img = g.getImageData(0, y0, W, H);
  const d = img.data;
  const COS = new Float32Array(256);
  const SIN = new Float32Array(256);
  for (let k = 0; k < 256; k++) {
    const a = (k / 255) * Math.PI;
    COS[k] = Math.cos(a);
    SIN[k] = Math.sin(a);
  }
  const JIT = new Float32Array(4096);
  for (let k = 0; k < 4096; k++) JIT[k] = h1(k * 0.731 + 3.1);
  for (let y = 0; y < H; y++) {
    const Y = y + y0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const al = src[i + 3];
      if (al === 0) continue;
      const T = src[i] / 255;
      if (T < 0.012) continue;
      const k = src[i + 1];
      const sp = 1.5 + (src[i + 2] / 255) * 8;
      const wv = 0.75 * Math.sin(x * 0.0123 + Y * 0.0047) + 0.4 * Math.sin(x * 0.031 - Y * 0.017 + 1.3);
      const ph = (-x * SIN[k] + Y * COS[k] + wv) / sp;
      const li = Math.floor(ph);
      const f = ph - li;
      const jit = 0.8 + 0.4 * JIT[(li + k * 37 + 8192) & 4095];
      let hw = T * 0.5 * jit;
      if (T > 0.9) hw += (T - 0.9) * 1.6;
      const dd = Math.abs(f - 0.5);
      let cov = (hw - dd) * sp + 0.5;
      if (cov <= 0) continue;
      if (cov > 1) cov = 1;
      cov *= al / 255;
      d[i] = d[i] * (1 - cov) + IR * cov;
      d[i + 1] = d[i + 1] * (1 - cov) + IG * cov;
      d[i + 2] = d[i + 2] * (1 - cov) + IB * cov;
    }
  }
  g.putImageData(img, 0, y0);
}

// -----------------------------------------------------------------------------
// geometry helpers
// -----------------------------------------------------------------------------
function poly(g, pts, close = true) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
}
function line(g, a, b) {
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.stroke();
}
function spacedText(g, str, x, y, spacing, align = 'center') {
  let w = 0;
  const ws = [];
  for (const ch of str) {
    const cw = g.measureText(ch).width;
    ws.push(cw);
    w += cw + spacing;
  }
  w -= spacing;
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const prev = g.textAlign;
  g.textAlign = 'left';
  let k = 0;
  for (const ch of str) {
    g.fillText(ch, cx, y);
    cx += ws[k++] + spacing;
  }
  g.textAlign = prev;
  return w;
}

// -----------------------------------------------------------------------------
// MANSION (2D elevation, rear facade facing us)
// -----------------------------------------------------------------------------
const MAN = {
  x0: 18,
  x1: 330,
  eave: 436,
  base: 668,
  ridge: 352,
  turret: { cx: 368, r: 38, top: 418, apex: 298 },
  gable: { x0: 178, x1: 314, apex: 338 },
};
// windows: {x, y, w, h, arch}
const WINDOWS = [
  // upper floor
  { x: 44, y: 470, w: 24, h: 48, arch: true },
  { x: 96, y: 470, w: 24, h: 48, arch: true },
  { x: 196, y: 466, w: 26, h: 52, arch: true },
  { x: 236, y: 466, w: 26, h: 52, arch: true },
  { x: 276, y: 466, w: 26, h: 52, arch: true },
  // ground floor
  { x: 42, y: 572, w: 28, h: 62, arch: true },
  { x: 94, y: 572, w: 28, h: 62, arch: true },
  { x: 192, y: 570, w: 112, h: 66, arch: false, bay: true },
  // gable
  { x: 232, y: 384, w: 26, h: 36, arch: true },
  // dormers
  { x: 64, y: 392, w: 18, h: 24, arch: false },
  { x: 130, y: 392, w: 18, h: 24, arch: false },
  // turret
  { x: 359, y: 452, w: 18, h: 40, arch: true },
  { x: 359, y: 552, w: 18, h: 46, arch: true },
  // conservatory
  { x: 410, y: 600, w: 46, h: 46, arch: false, glass: true },
];

function windowPath(g, w) {
  g.beginPath();
  if (w.arch) {
    const r = w.w / 2;
    g.moveTo(w.x, w.y + w.h);
    g.lineTo(w.x, w.y + r);
    g.arc(w.x + r, w.y + r, r, Math.PI, 0);
    g.lineTo(w.x + w.w, w.y + w.h);
    g.closePath();
  } else {
    g.rect(w.x, w.y, w.w, w.h);
  }
}

function paintMansionTones(t) {
  // main wall (stone, shaded side of the evening) — horizontal ruled courses
  t.fillStyle = tone(0.66, 0, 2.6);
  t.fillRect(MAN.x0, MAN.eave, MAN.x1 - MAN.x0, MAN.base - MAN.eave);
  // projecting gable bay: a touch lighter (faces the afterglow)
  const gb = MAN.gable;
  t.fillStyle = tone(0.54, 0, 2.6);
  t.beginPath();
  t.moveTo(gb.x0, MAN.base);
  t.lineTo(gb.x0, MAN.eave - 6);
  t.lineTo((gb.x0 + gb.x1) / 2, gb.apex);
  t.lineTo(gb.x1, MAN.eave - 6);
  t.lineTo(gb.x1, MAN.base);
  t.closePath();
  t.fill();
  // main hipped roof (slate): lines along the slope
  t.fillStyle = tone(0.8, 28, 2.4);
  t.beginPath();
  t.moveTo(MAN.x0 - 12, MAN.eave);
  t.lineTo(60, MAN.ridge);
  t.lineTo(gb.x0 + 10, MAN.ridge);
  t.lineTo(gb.x0 + 20, MAN.eave);
  t.closePath();
  t.fill();
  // gable roof slopes
  t.fillStyle = tone(0.84, 140, 2.4);
  t.beginPath();
  t.moveTo(gb.x0 - 10, MAN.eave - 2);
  t.lineTo((gb.x0 + gb.x1) / 2, gb.apex - 12);
  t.lineTo((gb.x0 + gb.x1) / 2, gb.apex);
  t.lineTo(gb.x0 + 2, MAN.eave - 2);
  t.closePath();
  t.fill();
  t.fillStyle = tone(0.7, 40, 2.4);
  t.beginPath();
  t.moveTo(gb.x1 + 10, MAN.eave - 2);
  t.lineTo((gb.x0 + gb.x1) / 2, gb.apex - 12);
  t.lineTo((gb.x0 + gb.x1) / 2, gb.apex);
  t.lineTo(gb.x1 - 2, MAN.eave - 2);
  t.closePath();
  t.fill();
  // chimneys
  t.fillStyle = tone(0.72, 90, 2.2);
  t.fillRect(84, 336, 20, 52);
  t.fillRect(150, 340, 18, 38);
  t.fillRect(306, 336, 18, 70);
  // dormers
  for (const dx of [58, 124]) {
    t.fillStyle = tone(0.5, 0, 2.4);
    t.fillRect(dx, 388, 30, 40);
    t.fillStyle = tone(0.86, 0, 2.2);
    t.beginPath();
    t.moveTo(dx - 5, 390);
    t.lineTo(dx + 15, 372);
    t.lineTo(dx + 35, 390);
    t.closePath();
    t.fill();
  }
  // turret: cylinder with vertical lines, lit on the left
  const tr = MAN.turret;
  const cg = t.createLinearGradient(tr.cx - tr.r, 0, tr.cx + tr.r, 0);
  cg.addColorStop(0, tone(0.36, 90, 2.4));
  cg.addColorStop(0.45, tone(0.5, 90, 2.4));
  cg.addColorStop(1, tone(0.9, 90, 2.4));
  t.fillStyle = cg;
  t.fillRect(tr.cx - tr.r, tr.top, tr.r * 2, MAN.base - tr.top);
  // conical roof
  const rg = t.createLinearGradient(tr.cx - tr.r, 0, tr.cx + tr.r, 0);
  rg.addColorStop(0, tone(0.6, 75, 2.2));
  rg.addColorStop(1, tone(0.95, 105, 2.2));
  t.fillStyle = rg;
  t.beginPath();
  t.moveTo(tr.cx - tr.r - 8, tr.top + 2);
  t.lineTo(tr.cx, tr.apex);
  t.lineTo(tr.cx + tr.r + 8, tr.top + 2);
  t.closePath();
  t.fill();
  // conservatory (glass house) with its own lean-to roof
  t.fillStyle = tone(0.62, 0, 2.4);
  t.fillRect(404, 592, 60, 76);
  t.fillStyle = tone(0.8, 160, 2.2);
  t.beginPath();
  t.moveTo(400, 594);
  t.lineTo(404, 578);
  t.lineTo(470, 588);
  t.lineTo(468, 596);
  t.closePath();
  t.fill();
  // dark windows (unlit)
  for (const w of WINDOWS) {
    t.fillStyle = tone(0.97, 0, 2.0);
    windowPath(t, w);
    t.fill();
  }
}

function paintMansionDetails(g, rng) {
  g.save();
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const gb = MAN.gable;
  const tr = MAN.turret;
  // rough-cut stone: irregular short joints
  g.lineWidth = 0.8;
  g.strokeStyle = ink(0.55);
  for (let y = MAN.eave + 8; y < MAN.base - 4; y += 9) {
    let x = MAN.x0 + rng() * 14;
    while (x < MAN.x1 - 4) {
      const L = 12 + rng() * 18;
      const inGable = x > gb.x0 && x < gb.x1;
      if (!inGable || rng() < 0.85) {
        g.beginPath();
        g.moveTo(x, y + (rng() - 0.5));
        g.lineTo(Math.min(x + L, MAN.x1 - 2), y + (rng() - 0.5));
        g.stroke();
      }
      x += L + 3;
    }
  }
  // string course and plinth (white line above a dark band)
  g.fillStyle = INK;
  g.fillRect(MAN.x0, 546, MAN.x1 - MAN.x0, 4);
  g.fillRect(MAN.x0, 652, MAN.x1 - MAN.x0 + 140, 3);
  g.strokeStyle = paper(0.9);
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(MAN.x0, 544.5);
  g.lineTo(MAN.x1, 544.5);
  g.stroke();
  // eaves cornice
  g.fillStyle = INK;
  g.fillRect(MAN.x0 - 12, MAN.eave - 3, gb.x0 - MAN.x0 + 22, 5);
  // outlines of masses
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(MAN.x0 - 12, MAN.eave);
  g.lineTo(60, MAN.ridge);
  g.lineTo(gb.x0 + 10, MAN.ridge);
  g.moveTo(gb.x0 - 10, MAN.eave - 2);
  g.lineTo((gb.x0 + gb.x1) / 2, gb.apex - 12);
  g.lineTo(gb.x1 + 10, MAN.eave - 2);
  g.stroke();
  // gable bargeboards with a white line inside (white-line cut)
  g.strokeStyle = paper(0.95);
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(gb.x0 - 4, MAN.eave - 6);
  g.lineTo((gb.x0 + gb.x1) / 2, gb.apex - 6);
  g.lineTo(gb.x1 + 4, MAN.eave - 6);
  g.stroke();
  // ridge cresting
  g.strokeStyle = INK;
  g.lineWidth = 1;
  for (let x = 64; x < gb.x0 + 8; x += 6) {
    g.beginPath();
    g.moveTo(x, MAN.ridge);
    g.lineTo(x, MAN.ridge - 5);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(60, MAN.ridge - 5);
  g.lineTo(gb.x0 + 10, MAN.ridge - 5);
  g.stroke();
  // chimney caps
  g.fillStyle = INK;
  for (const [x, y, w] of [[82, 332, 24], [148, 336, 22], [304, 332, 22]]) {
    g.fillRect(x, y, w, 6);
    g.fillRect(x + 4, y - 6, 5, 6);
    g.fillRect(x + w - 9, y - 6, 5, 6);
  }
  // turret details: belt courses, finial, cone outline
  g.strokeStyle = INK;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(tr.cx - tr.r - 8, tr.top + 2);
  g.lineTo(tr.cx, tr.apex);
  g.lineTo(tr.cx + tr.r + 8, tr.top + 2);
  g.stroke();
  g.fillStyle = INK;
  g.fillRect(tr.cx - tr.r - 9, tr.top, tr.r * 2 + 18, 5);
  g.beginPath();
  g.moveTo(tr.cx, tr.apex);
  g.lineTo(tr.cx, tr.apex - 18);
  g.stroke();
  g.beginPath();
  g.arc(tr.cx, tr.apex - 8, 2.4, 0, TAU);
  g.fill();
  for (const y of [536, 640]) {
    g.beginPath();
    g.ellipse(tr.cx, y, tr.r, 4, 0, 0, Math.PI);
    g.lineWidth = 2;
    g.stroke();
  }
  // conservatory glazing bars
  g.lineWidth = 1;
  g.strokeStyle = INK;
  g.strokeRect(404, 592, 60, 76);
  // windows: stone surrounds, sills, mullions (drawn over the dark panes)
  for (const w of WINDOWS) {
    g.lineWidth = 2;
    g.strokeStyle = INK;
    windowPath(g, w);
    g.stroke();
    // light stone voussoir / surround line
    g.strokeStyle = paper(0.85);
    g.lineWidth = 1;
    g.save();
    g.translate(w.x + w.w / 2, w.y + w.h / 2);
    g.scale((w.w + 6) / w.w, (w.h + 5) / w.h);
    g.translate(-(w.x + w.w / 2), -(w.y + w.h / 2));
    windowPath(g, w);
    g.restore();
    g.stroke();
    // sill
    g.fillStyle = INK;
    g.fillRect(w.x - 4, w.y + w.h, w.w + 8, 3);
  }
  g.restore();
}

/** The lit-window overlay (paper panes + radiating white-line rays). */
function paintLitWindows(g, strong) {
  g.save();
  for (const w of WINDOWS) {
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    // rays cut out of the dark wall
    const nR = strong ? 26 : 18;
    for (let k = 0; k < nR; k++) {
      const a = (k / nR) * TAU + h1(k + w.x) * 0.2;
      const r0 = Math.max(w.w, w.h) * 0.5 + 2;
      const L = (strong ? 20 : 14) + h1(k * 3.3 + w.y) * (strong ? 16 : 10);
      g.strokeStyle = paper(strong ? 0.75 : 0.85);
      g.lineWidth = strong ? 1.3 : 1.0;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0 * (w.w / Math.max(w.w, w.h)), cy + Math.sin(a) * r0 * (w.h / Math.max(w.w, w.h)));
      g.lineTo(cx + Math.cos(a) * (r0 + L), cy + Math.sin(a) * (r0 + L));
      g.stroke();
    }
    if (strong) continue;
    // the pane itself: paper, with sash bars and a hint of the lamp
    g.fillStyle = PAPER;
    windowPath(g, w);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    g.beginPath();
    if (w.bay) {
      for (let k = 1; k < 4; k++) {
        g.moveTo(w.x + (w.w * k) / 4, w.y);
        g.lineTo(w.x + (w.w * k) / 4, w.y + w.h);
      }
      g.moveTo(w.x, w.y + w.h * 0.36);
      g.lineTo(w.x + w.w, w.y + w.h * 0.36);
    } else if (w.glass) {
      for (let k = 1; k < 4; k++) {
        g.moveTo(w.x + (w.w * k) / 4, w.y);
        g.lineTo(w.x + (w.w * k) / 4, w.y + w.h);
      }
      g.moveTo(w.x, w.y + w.h / 2);
      g.lineTo(w.x + w.w, w.y + w.h / 2);
    } else {
      g.moveTo(cx, w.y + (w.arch ? w.w * 0.3 : 0));
      g.lineTo(cx, w.y + w.h);
      g.moveTo(w.x, w.y + w.h * 0.55);
      g.lineTo(w.x + w.w, w.y + w.h * 0.55);
    }
    g.stroke();
    windowPath(g, w);
    g.lineWidth = 2;
    g.stroke();
    // a little electrolier glowing in the pane (radiating hairlines)
    g.strokeStyle = ink(0.5);
    g.lineWidth = 0.6;
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      g.moveTo(cx + Math.cos(a) * 2.5, cy + Math.sin(a) * 2.5 - 3);
      g.lineTo(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5 - 3);
    }
    g.stroke();
  }
  g.restore();
}

// -----------------------------------------------------------------------------
// THE WINDMILL (static parts)
// -----------------------------------------------------------------------------
function towerFaces() {
  const Y1 = TOWER_H;
  const fL = [pr(-HB, 0, -HB), pr(-HB, 0, HB), pr(-HT, Y1, HT), pr(-HT, Y1, -HT)]; // -X face (windward, lit)
  const fR = [pr(-HB, 0, HB), pr(HB, 0, HB), pr(HT, Y1, HT), pr(-HT, Y1, HT)]; // +Z face (shaded)
  return { fL, fR };
}
const CAP = { y0: TOWER_H, y1: TOWER_H + 6.5, h: 5.2 };
function capFaces() {
  const { y0, y1, h } = CAP;
  return {
    L: [pr(-h, y0, -h), pr(-h, y0, h), pr(-h, y1, h), pr(-h, y1, -h)],
    R: [pr(-h, y0, h), pr(h, y0, h), pr(h, y1, h), pr(-h, y1, h)],
    top: [pr(-h, y1, -h), pr(-h, y1, h), pr(h, y1, h), pr(h, y1, -h)],
  };
}
// tail: vane from X=16..64 ft, Y=48.5..68.5 (20 ft x 48 ft of boards + framing to 64)
const TAIL = { x0: 4, xv: 15, x1: 64, yb: 48.5, yt: 68.5 };

function paintWindmillTones(t) {
  // tail vane (boards along the boom, mid tone)
  const v = [pr(TAIL.xv, TAIL.yb, 0), pr(TAIL.x1, TAIL.yb, 0), pr(TAIL.x1, TAIL.yt, 0), pr(TAIL.xv, TAIL.yt, 0)];
  const angX = Math.atan2(pr(1, 0, 0).y - pr(0, 0, 0).y, pr(1, 0, 0).x - pr(0, 0, 0).x) / DEG;
  t.fillStyle = tone(0.64, angX, 2.3);
  poly(t, v);
  t.fill();
  // auxiliary vane on the +Z side (seen almost face-on, small)
  const aux = auxVane();
  t.fillStyle = tone(0.5, 90, 2.2);
  poly(t, aux);
  t.fill();
  // tower faces
  const { fL, fR } = towerFaces();
  const lg = t.createLinearGradient(0, fL[3].y, 0, fL[0].y);
  lg.addColorStop(0, tone(0.24, 90, 2.4));
  lg.addColorStop(1, tone(0.42, 90, 2.4));
  t.fillStyle = lg;
  poly(t, fL);
  t.fill();
  const rg = t.createLinearGradient(fR[0].x, 0, fR[1].x, 0);
  rg.addColorStop(0, tone(0.66, angX, 2.2));
  rg.addColorStop(1, tone(0.86, angX, 2.2));
  t.fillStyle = rg;
  poly(t, fR);
  t.fill();
  // cap
  const c = capFaces();
  t.fillStyle = tone(0.5, 90, 2.2);
  poly(t, c.L);
  t.fill();
  t.fillStyle = tone(0.88, angX, 2.2);
  poly(t, c.R);
  t.fill();
  t.fillStyle = tone(0.3, 0, 2.2);
  poly(t, c.top);
  t.fill();
}

function auxVane() {
  // a small vane on an arm projecting sideways (+Z) from the cap, in the plane X = const
  const X = -1.5;
  return [pr(X, 57, 10), pr(X, 57, 20), pr(X, 64, 20), pr(X, 64, 10)];
}

function paintWindmillDetails(g) {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // --- tail framing: boom, rails, struts, diagonal braces
  g.strokeStyle = INK;
  const P = (x, y) => pr(x, y, 0);
  g.lineWidth = 2.6;
  line(g, P(TAIL.x0, TAIL.yt), P(TAIL.x1, TAIL.yt));
  line(g, P(TAIL.x0, TAIL.yb), P(TAIL.x1, TAIL.yb));
  line(g, P(TAIL.x0, 58.5), P(TAIL.x1 + 1, 58.5));
  g.lineWidth = 1.8;
  for (let x = TAIL.xv; x <= TAIL.x1 + 0.01; x += 12) line(g, P(x, TAIL.yb), P(x, TAIL.yt));
  g.lineWidth = 1.3;
  for (let x = TAIL.xv; x < TAIL.x1 - 1; x += 12) {
    line(g, P(x, TAIL.yb), P(x + 12, TAIL.yt));
  }
  // boards
  g.lineWidth = 0.7;
  g.strokeStyle = ink(0.6);
  for (let y = TAIL.yb + 2; y < TAIL.yt - 0.5; y += 2) line(g, P(TAIL.xv, y), P(TAIL.x1, y));
  // braces from the cap to the boom ends
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  line(g, P(3, 63), P(30, TAIL.yt));
  line(g, P(3, 54), P(30, TAIL.yb));
  line(g, P(2, 50), P(TAIL.xv, TAIL.yb));
  // --- auxiliary side vane on its arm
  const aux = auxVane();
  g.lineWidth = 1.5;
  line(g, pr(-1.5, 60.5, 4.6), pr(-1.5, 60.5, 20));
  poly(g, aux);
  g.stroke();
  g.lineWidth = 0.6;
  for (let k = 1; k < 5; k++) line(g, lerpP(aux[0], aux[3], k / 5), lerpP(aux[1], aux[2], k / 5));

  // --- tower: clapboard courses, corner posts, girts, door, windows
  const { fL, fR } = towerFaces();
  // left face boards (vertical battens)
  g.lineWidth = 0.6;
  g.strokeStyle = ink(0.45);
  for (let k = 1; k < 12; k++) {
    const z = -1 + (2 * k) / 12;
    line(g, pr(-HB, 0, HB * z), pr(-HT, TOWER_H, HT * z));
  }
  // girts (horizontal bands) on both faces, with a white line above each (white-line cut)
  for (const Y of [14, 28, 42]) {
    const h = tw(Y);
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    poly(g, [pr(-h, Y, -h), pr(-h, Y, h), pr(h, Y, h)], false);
    g.stroke();
    g.strokeStyle = paper(0.85);
    g.lineWidth = 0.9;
    const Y2 = Y + 0.6;
    const h2 = tw(Y2);
    poly(g, [pr(-h2, Y2, -h2), pr(-h2, Y2, h2), pr(h2, Y2, h2)], false);
    g.stroke();
  }
  // corner posts
  g.strokeStyle = INK;
  g.lineWidth = 2.4;
  line(g, fL[0], fL[3]);
  line(g, fR[0], fR[3]);
  line(g, fR[1], fR[2]);
  // the lit corner gets a white line
  g.strokeStyle = paper(0.9);
  g.lineWidth = 1;
  line(g, { x: fL[0].x + 1.6, y: fL[0].y }, { x: fL[3].x + 1.4, y: fL[3].y });
  // small windows on the windward face
  g.fillStyle = INK;
  for (const [Y, z] of [[34, -0.1], [20, -0.1]]) {
    const h = tw(Y);
    const q = [pr(-h, Y, z * h - 1.6), pr(-h, Y, z * h + 1.6), pr(-h, Y + 3.2, z * h + 1.6), pr(-h, Y + 3.2, z * h - 1.6)];
    poly(g, q);
    g.fill();
  }
  // door on the shaded face
  {
    const q = [pr(-2, 0, HB), pr(2.5, 0, HB), pr(2.4, 8, tw(8)), pr(-1.9, 8, tw(8))];
    g.fillStyle = INK;
    poly(g, q);
    g.fill();
  }
  // cap outline + bearing
  const c = capFaces();
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  poly(g, c.L);
  g.stroke();
  poly(g, c.R);
  g.stroke();
  poly(g, c.top);
  g.stroke();
  // --- circular rail at the foot (the whole tower turns on its gudgeon)
  g.strokeStyle = INK;
  g.lineWidth = 2;
  const railR = 15;
  g.beginPath();
  for (let k = 0; k <= 72; k++) {
    const a = (k / 72) * TAU;
    const p = pr(Math.cos(a) * railR, 0, Math.sin(a) * railR);
    if (k === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.stroke();
  g.restore();
}

// -----------------------------------------------------------------------------
// THE WHEEL (per frame): 144 twisted blades, hoops, arms, stays
// -----------------------------------------------------------------------------
const BLADE_J = new Float32Array(WHEEL.n);
const BLADE_H = new Uint8Array(WHEEL.n);
for (let i = 0; i < WHEEL.n; i++) {
  BLADE_J[i] = 0.9 + 0.2 * h1(i * 7.7 + 1.3);
  BLADE_H[i] = h1(i * 3.1 + 9.2) < 0.12 ? 0 : 1;
}
const PHI_L = -50 * DEG; // the afterglow lights the upper-left of the wheel
function discPath(ctx, r, n = 64) {
  for (let k = 0; k <= n; k++) {
    const p = disc(r, (k / n) * TAU);
    if (k === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
}
function drawWheel(ctx, rot) {
  const { R, r0, n } = WHEEL;
  const rm = R * 0.6;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // main shaft running back into the cap bearing
  const back = pr(2, WHEEL.Y, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  line(ctx, HUB, back);
  ctx.strokeStyle = paper(0.8);
  ctx.lineWidth = 1;
  line(ctx, { x: HUB.x, y: HUB.y - 2 }, { x: back.x, y: back.y - 2 });
  // radial arms (12), oak, with a white-line edge
  const nArms = 12;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k < nArms; k++) {
    const a = rot + (k / nArms) * TAU + 0.6 * DEG;
    const p0 = disc(2.2, a);
    const p1 = disc(R * 0.97, a);
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
  }
  ctx.stroke();
  // 144 twisted blades in three tonal groups: lit (paper, inked trailing edge),
  // turning (paper with a centre cut), shaded (solid ink with a white leading edge)
  const g0 = [];
  const g1 = [];
  const g2 = [];
  const g2w = [];
  const quad = (i, a) => {
    const a1 = a + 1.6 * DEG; // twist / sweep toward the tip
    const j = BLADE_J[i];
    const w0 = 0.42 * j;
    const w1 = 0.98 * j;
    const c0 = Math.cos(a);
    const s0 = Math.sin(a);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const uv = [
      [r0 * c0 + s0 * w0 * 0.5, r0 * s0 - c0 * w0 * 0.5],
      [R * c1 + s1 * w1 * 0.5, R * s1 - c1 * w1 * 0.5],
      [R * c1 - s1 * w1 * 0.5, R * s1 + c1 * w1 * 0.5],
      [r0 * c0 - s0 * w0 * 0.5, r0 * s0 + c0 * w0 * 0.5],
    ];
    return uv.map(([u, v]) => ({ x: HUB.x + u * DU.x + v * DV.x, y: HUB.y + u * DU.y + v * DV.y }));
  };
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    const lit = Math.cos(a - PHI_L) + (BLADE_H[i] ? 0 : -0.35);
    const q = quad(i, a);
    if (lit > 0.35) g0.push(q);
    else if (lit > -0.12) g1.push(q);
    else g2.push(q);
    if (lit <= -0.12 && i % 3 === 0) g2w.push(q);
  }
  const fillGroup = (grp, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (const q of grp) {
      ctx.moveTo(q[0].x, q[0].y);
      ctx.lineTo(q[1].x, q[1].y);
      ctx.lineTo(q[2].x, q[2].y);
      ctx.lineTo(q[3].x, q[3].y);
      ctx.closePath();
    }
    ctx.fill();
  };
  fillGroup(g0, PAPER);
  fillGroup(g1, PAPER);
  fillGroup(g2, INK);
  // edges
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (const q of g0) {
    ctx.moveTo(q[3].x, q[3].y);
    ctx.lineTo(q[2].x, q[2].y);
  }
  for (const q of g1) {
    ctx.moveTo(q[3].x, q[3].y);
    ctx.lineTo(q[2].x, q[2].y);
    ctx.moveTo(q[0].x, q[0].y);
    ctx.lineTo(q[1].x, q[1].y);
  }
  ctx.stroke();
  // turning blades get a ruled centre line (a half-tone)
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (const q of g1) {
    ctx.moveTo((q[0].x + q[3].x) / 2, (q[0].y + q[3].y) / 2);
    ctx.lineTo((q[1].x + q[2].x) / 2, (q[1].y + q[2].y) / 2);
  }
  ctx.stroke();
  ctx.strokeStyle = paper(0.9);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const q of g2w) {
    ctx.moveTo(q[0].x * 0.7 + q[3].x * 0.3, q[0].y * 0.7 + q[3].y * 0.3);
    ctx.lineTo(q[1].x * 0.7 + q[2].x * 0.3, q[1].y * 0.7 + q[2].y * 0.3);
  }
  ctx.stroke();
  // hoops carrying the blades (inner at the roots, middle) — rings look still as they turn
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  discPath(ctx, r0);
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  discPath(ctx, rm);
  ctx.stroke();
  ctx.strokeStyle = paper(0.85);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  discPath(ctx, r0 - 0.9);
  ctx.stroke();
  // forward shaft nose with tension stays to the middle hoop
  const nose = pr(WHEEL.X - 6, WHEEL.Y, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let k = 0; k < nArms; k++) {
    const a = rot + (k / nArms) * TAU + 0.6 * DEG;
    const p1 = disc(rm, a);
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(p1.x, p1.y);
  }
  ctx.stroke();
  // hub boss + nose
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(HUB.x, HUB.y, 2.6 * V.s * sA, 2.6 * V.s, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paper(0.9);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(HUB.x - 1, HUB.y - 1, 2.0 * V.s * sA, 2.0 * V.s, 0, Math.PI * 0.9, Math.PI * 1.6);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.5;
  line(ctx, HUB, nose);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(nose.x, nose.y, 2.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// -----------------------------------------------------------------------------
// BLYTH INSET (Marykirk, 1887)
// -----------------------------------------------------------------------------
const OV = { cx: 172, cy: 242, rx: 130, ry: 76 };
// the wind engine: tripod, upright windshaft, four arms carrying canvas sails
const BL = { x: 236, ground: 298, top: 186, armTop: 196, armBot: 234, arm: 48 };
const COT = { x0: 70, x1: 150, wall: 272, ground: 298, ridge: 250 };

function ovalPath(g, grow = 0) {
  g.beginPath();
  g.ellipse(OV.cx, OV.cy, OV.rx + grow, OV.ry + grow, 0, 0, TAU);
}

function paintBlythTones(t) {
  // white margin around the vignette
  t.save();
  ovalPath(t, 9);
  t.clip();
  t.clearRect(0, 0, S, S);
  t.restore();
  t.save();
  ovalPath(t, 0);
  t.clip();
  // Scottish sky: fine ruled lines, darker above
  const sk = t.createLinearGradient(0, OV.cy - OV.ry, 0, OV.cy + OV.ry);
  sk.addColorStop(0, tone(0.55, 0, 2.0));
  sk.addColorStop(0.7, tone(0.14, 0, 2.0));
  sk.addColorStop(1, tone(0.1, 0, 2.0));
  t.fillStyle = sk;
  t.fillRect(OV.cx - OV.rx, OV.cy - OV.ry, OV.rx * 2, OV.ry * 2);
  // a cloud bank behind the cottage
  t.fillStyle = tone(0.04, 0, 2.0);
  for (const [x, y, rx, ry] of [[96, 216, 40, 9], [130, 208, 32, 11], [74, 226, 30, 6], [300, 236, 26, 6]]) {
    t.beginPath();
    t.ellipse(x, y, rx, ry, 0, 0, TAU);
    t.fill();
  }
  // foothills of the Mearns
  t.fillStyle = tone(0.48, 8, 1.9);
  t.beginPath();
  t.moveTo(OV.cx - OV.rx, 286);
  t.bezierCurveTo(80, 262, 130, 268, 170, 276);
  t.bezierCurveTo(210, 270, 270, 256, OV.cx + OV.rx, 276);
  t.lineTo(OV.cx + OV.rx, 340);
  t.lineTo(OV.cx - OV.rx, 340);
  t.closePath();
  t.fill();
  // garden
  t.fillStyle = tone(0.34, 0, 2.4);
  t.fillRect(OV.cx - OV.rx, 296, OV.rx * 2, 40);
  // cottage: whitewashed walls, slate roof, shaded gable end
  t.fillStyle = tone(0.1, 0, 2.0);
  t.fillRect(COT.x0, COT.wall, COT.x1 - COT.x0, COT.ground - COT.wall);
  t.fillStyle = tone(0.5, 90, 1.9);
  t.beginPath();
  t.moveTo(COT.x1, COT.ground);
  t.lineTo(COT.x1, COT.wall);
  t.lineTo(COT.x1 + 11, COT.ridge + 4);
  t.lineTo(COT.x1 + 22, COT.wall);
  t.lineTo(COT.x1 + 22, COT.ground);
  t.closePath();
  t.fill();
  t.fillStyle = tone(0.84, 160, 1.9);
  t.beginPath();
  t.moveTo(COT.x0 - 6, COT.wall + 1);
  t.lineTo(COT.x0 + 8, COT.ridge);
  t.lineTo(COT.x1 + 11, COT.ridge);
  t.lineTo(COT.x1 + 2, COT.wall + 1);
  t.closePath();
  t.fill();
  // chimneys
  t.fillStyle = tone(0.62, 90, 1.9);
  t.fillRect(COT.x0 + 6, COT.ridge - 11, 8, 13);
  t.fillRect(COT.x1 + 7, COT.ridge - 9, 8, 11);
  // windows + door (dark)
  t.fillStyle = tone(0.97, 0, 1.8);
  for (const x of [80, 124]) t.fillRect(x, 279, 10, 11);
  t.fillRect(102, 277, 10, 21);
  t.restore();
}

function paintBlythDetails(g, rng) {
  g.save();
  g.lineCap = 'round';
  // oval border: thick + thin rule
  g.strokeStyle = INK;
  g.lineWidth = 2.4;
  ovalPath(g, 0);
  g.stroke();
  g.lineWidth = 0.8;
  ovalPath(g, 4.5);
  g.stroke();
  g.save();
  ovalPath(g, -1);
  g.clip();
  // cottage outlines
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.strokeRect(COT.x0, COT.wall, COT.x1 - COT.x0, COT.ground - COT.wall);
  g.beginPath();
  g.moveTo(COT.x0 - 6, COT.wall + 1);
  g.lineTo(COT.x0 + 8, COT.ridge);
  g.lineTo(COT.x1 + 11, COT.ridge);
  g.lineTo(COT.x1 + 22, COT.wall);
  g.lineTo(COT.x1 + 22, COT.ground);
  g.stroke();
  // garden wall and grass ticks
  g.lineWidth = 0.7;
  for (let x = OV.cx - OV.rx; x < OV.cx + OV.rx; x += 3 + rng() * 3) {
    g.beginPath();
    g.moveTo(x, 300 + rng() * 14);
    g.lineTo(x + 1, 296 + rng() * 14);
    g.stroke();
  }
  // tripod: three legs braced to the upright windshaft
  g.strokeStyle = INK;
  const apex = { x: BL.x, y: BL.armBot + 10 };
  g.lineWidth = 2;
  line(g, apex, { x: BL.x - 34, y: BL.ground });
  line(g, apex, { x: BL.x + 32, y: BL.ground + 1 });
  g.lineWidth = 1.3;
  line(g, apex, { x: BL.x + 7, y: BL.ground - 7 });
  g.lineWidth = 0.8;
  line(g, { x: BL.x - 22, y: 280 }, { x: BL.x + 21, y: 280 });
  line(g, { x: BL.x - 22, y: 280 }, { x: BL.x + 7, y: BL.ground - 7 });
  // windshaft, foot bearing, rope drive to the dynamo in the lean-to
  g.lineWidth = 2.2;
  line(g, { x: BL.x, y: BL.ground }, { x: BL.x, y: BL.top });
  g.fillStyle = INK;
  g.fillRect(BL.x - 4, BL.ground - 6, 8, 6);
  g.fillRect(BL.x + 16, BL.ground - 11, 16, 11);
  g.strokeStyle = paper(0.9);
  g.lineWidth = 0.7;
  g.strokeRect(BL.x + 18, BL.ground - 9, 6, 5);
  g.strokeStyle = INK;
  g.lineWidth = 0.6;
  // wire to the cottage (accumulators charged within)
  g.beginPath();
  g.moveTo(BL.x + 20, BL.ground - 11);
  g.quadraticCurveTo(190, 262, COT.x1 + 18, COT.wall - 6);
  g.stroke();
  g.restore();
  // cartouche label
  const lx = OV.cx;
  const ly = OV.cy + OV.ry + 3;
  g.fillStyle = PAPER;
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(lx - 62, ly - 10);
  g.lineTo(lx + 62, ly - 10);
  g.lineTo(lx + 72, ly);
  g.lineTo(lx + 62, ly + 10);
  g.lineTo(lx - 62, ly + 10);
  g.lineTo(lx - 72, ly);
  g.closePath();
  g.fill();
  g.stroke();
  g.lineWidth = 0.6;
  g.beginPath();
  g.moveTo(lx - 59, ly - 7);
  g.lineTo(lx + 59, ly - 7);
  g.lineTo(lx + 67, ly);
  g.lineTo(lx + 59, ly + 7);
  g.lineTo(lx - 59, ly + 7);
  g.lineTo(lx - 67, ly);
  g.closePath();
  g.stroke();
  g.fillStyle = INK;
  g.font = 'italic 400 15px "IM Fell English", Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Marykirk, 1887.', lx, ly + 1);
  g.restore();
}

function drawBlythDynamic(ctx, T, bri) {
  ctx.save();
  ovalPath(ctx, -1);
  ctx.clip();
  // four arms (upper and lower) carrying canvas sails, turning about the upright shaft;
  // seen a little from above, so the arms sweep an ellipse
  const ang = 1.9 * windInt(T) + 0.4;
  const R = BL.arm;
  const tilt = 9;
  const rin = 0.36;
  const sails = [];
  for (let k = 0; k < 4; k++) {
    const a = ang + (k * Math.PI) / 2;
    sails.push({ a, z: Math.sin(a) });
  }
  sails.sort((p, q) => p.z - q.z);
  // faint path of the arm tips (engraver's motion line), far half first
  ctx.strokeStyle = ink(0.35);
  ctx.lineWidth = 0.6;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.ellipse(BL.x, BL.armTop, R, tilt, 0, Math.PI, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const sl of sails) {
    const ca = Math.cos(sl.a);
    const sa = Math.sin(sl.a);
    const xo = BL.x + ca * R;
    const xi = BL.x + ca * R * rin;
    const dyo = sa * tilt;
    const dyi = sa * tilt * rin;
    const yT = BL.armTop;
    const yB = BL.armBot;
    // arms
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(BL.x, yT);
    ctx.lineTo(xo, yT + dyo);
    ctx.moveTo(BL.x, yB);
    ctx.lineTo(xo, yB + dyo);
    ctx.stroke();
    // canvas: radial plane, bellied to leeward (tangential, seen as a sideways bulge)
    const bx = -sa * 6;
    const by = ca * 1.5;
    const near = sl.z > -0.05;
    ctx.fillStyle = near ? PAPER : '#d3c9b2';
    ctx.beginPath();
    ctx.moveTo(xi, yT + dyi + 1);
    ctx.lineTo(xo, yT + dyo + 1);
    ctx.quadraticCurveTo(xo + bx, (yT + yB) / 2 + dyo + by, xo, yB + dyo - 1);
    ctx.lineTo(xi, yB + dyi - 1);
    ctx.quadraticCurveTo(xi + bx * 0.4, (yT + yB) / 2 + dyi, xi, yT + dyi + 1);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();
    // engraved shading: sails turned away (or edge-on) are ruled; lit ones show seams
    const edge = Math.abs(ca) < 0.4;
    ctx.lineWidth = !near || edge ? 0.6 : 0.45;
    ctx.beginPath();
    const rows = !near || edge ? 9 : 3;
    for (let k = 1; k < rows; k++) {
      const u = k / rows;
      const y0 = yT + (yB - yT) * u;
      const bul = 4 * u * (1 - u);
      ctx.moveTo(xi + bx * 0.4 * bul, y0 + dyi);
      ctx.lineTo(xo + bx * bul, y0 + dyo + by * bul);
    }
    ctx.stroke();
  }
  // shaft head
  ctx.fillStyle = INK;
  ctx.fillRect(BL.x - 2.5, BL.top - 2, 5, 7);
  ctx.beginPath();
  ctx.moveTo(BL.x - 3, BL.top - 2);
  ctx.lineTo(BL.x, BL.top - 7);
  ctx.lineTo(BL.x + 3, BL.top - 2);
  ctx.fill();
  // cottage windows glow with the charge
  if (bri > 0.04) {
    ctx.globalAlpha = clamp01(bri * 1.4);
    ctx.fillStyle = PAPER;
    for (const x of [80, 124]) ctx.fillRect(x, 279, 10, 11);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    for (const x of [80, 124]) {
      ctx.strokeRect(x, 279, 10, 11);
      ctx.beginPath();
      ctx.moveTo(x + 5, 279);
      ctx.lineTo(x + 5, 290);
      ctx.stroke();
    }
    ctx.globalAlpha = clamp01(bri);
    ctx.strokeStyle = paper(0.85);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const x of [85, 129]) {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + 0.3;
        ctx.moveTo(x + Math.cos(a) * 9, 284.5 + Math.sin(a) * 9);
        ctx.lineTo(x + Math.cos(a) * 15, 284.5 + Math.sin(a) * 15);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// -----------------------------------------------------------------------------
// trees (bare winter elms), hedge, ground
// -----------------------------------------------------------------------------
function branch(g, rng, x, y, ang, len, w, depth, spread) {
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  const mx = (x + x2) / 2 + (rng() - 0.5) * len * 0.25;
  const my = (y + y2) / 2 + (rng() - 0.5) * len * 0.15;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(mx, my, x2, y2);
  g.stroke();
  if (depth <= 0 || w < 0.3) return;
  const n = depth > 4 ? 2 : rng() < 0.55 ? 2 : 3;
  for (let k = 0; k < n; k++) {
    const off = (k - (n - 1) / 2) * spread + (rng() - 0.5) * 0.35;
    const na = ang + off;
    const pull = -Math.PI / 2 - na; // elm limbs stay upswept
    branch(g, rng, x2, y2, na + pull * 0.18, len * (0.66 + rng() * 0.16), w * 0.66, depth - 1, spread * 0.95);
  }
}
function elm(g, rng, x, y, h, w) {
  g.save();
  g.strokeStyle = INK;
  g.lineCap = 'round';
  // trunk
  g.fillStyle = INK;
  g.beginPath();
  g.moveTo(x - w, y);
  g.quadraticCurveTo(x - w * 0.6, y - h * 0.2, x - w * 0.45, y - h * 0.32);
  g.lineTo(x + w * 0.45, y - h * 0.32);
  g.quadraticCurveTo(x + w * 0.6, y - h * 0.2, x + w, y);
  g.closePath();
  g.fill();
  // white-line bark on the lit side
  g.strokeStyle = paper(0.8);
  g.lineWidth = 0.7;
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.moveTo(x - w * 0.7 + k * 1.6, y - 2);
    g.lineTo(x - w * 0.35 + k * 1.4, y - h * 0.3);
    g.stroke();
  }
  g.strokeStyle = INK;
  const n = 4;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.38 + (rng() - 0.5) * 0.15;
    branch(g, rng, x + (k - 1.5) * w * 0.3, y - h * 0.3, a, h * 0.27, w * 0.55, 7, 0.55);
  }
  g.restore();
}

const MOON = { x: 888, y: 224, r: 15 };
function paintSkyTones(t, kit) {
  // evening sky: ruled horizontal lines, heavier at the zenith, finer toward the afterglow
  const sk = t.createLinearGradient(0, PIC.y0, 0, 660);
  sk.addColorStop(0, tone(0.74, 0, 3.0));
  sk.addColorStop(0.3, tone(0.52, 0, 3.0));
  sk.addColorStop(0.72, tone(0.2, 0, 3.0));
  sk.addColorStop(1, tone(0.07, 0, 3.0));
  t.fillStyle = sk;
  t.fillRect(0, PIC.y0, S, 680 - PIC.y0);
  // afterglow in the west (left) and a pale field behind the wheel
  const gl = t.createRadialGradient(150, 640, 20, 150, 640, 520);
  gl.addColorStop(0, toneA(0.02, 0, 3.0, 0.9));
  gl.addColorStop(1, toneA(0.02, 0, 3.0, 0));
  t.fillStyle = gl;
  t.fillRect(0, PIC.y0, S, 520);
  const wg = t.createRadialGradient(HUB.x - 10, HUB.y, 60, HUB.x - 10, HUB.y, 260);
  wg.addColorStop(0, toneA(0.22, 0, 3.0, 0.6));
  wg.addColorStop(1, toneA(0.22, 0, 3.0, 0));
  t.fillStyle = wg;
  t.fillRect(400, PIC.y0, 600, 560);
  // a young moon in the east
  t.fillStyle = tone(0, 0, 3.0);
  t.beginPath();
  t.arc(MOON.x, MOON.y, MOON.r, 0, TAU);
  t.fill();
  t.fillStyle = sk;
  t.beginPath();
  t.arc(MOON.x + 6, MOON.y - 3, MOON.r - 1, 0, TAU);
  t.fill();
  // long sunset cloud banks: light tops, darker undersides, slanted lines
  const banks = [
    [430, 214, 300, 16, -3],
    [820, 186, 220, 13, -2],
    [520, 300, 200, 12, -4],
    [900, 470, 150, 10, -2],
    [470, 520, 120, 8, -3],
    [70, 420, 110, 9, -3],
  ];
  for (const [x, y, w, h, ang] of banks) {
    const cg = t.createLinearGradient(0, y - h, 0, y + h);
    cg.addColorStop(0, tone(0.03, ang, 2.6));
    cg.addColorStop(0.6, tone(0.16, ang, 2.6));
    cg.addColorStop(1, tone(0.5, ang, 2.6));
    t.fillStyle = cg;
    t.beginPath();
    t.moveTo(x - w / 2, y + h * 0.6);
    for (let k = 0; k <= 10; k++) {
      const u = k / 10;
      const bump = Math.sin(u * Math.PI) * h * (0.8 + 0.5 * Math.sin(u * 17 + x));
      t.lineTo(x - w / 2 + u * w, y + h * 0.3 - bump);
    }
    t.lineTo(x + w / 2, y + h * 0.7);
    t.quadraticCurveTo(x, y + h * 1.1, x - w / 2, y + h * 0.6);
    t.closePath();
    t.fill();
  }
  void kit;
}

function paintGroundTones(t) {
  // distant city / tree line on the horizon
  t.fillStyle = tone(0.5, 90, 2.0);
  t.beginPath();
  t.moveTo(0, 646);
  for (let x = 0; x <= S; x += 10) {
    const y = 628 - 14 * Math.abs(Math.sin(x * 0.021)) - 8 * Math.abs(Math.sin(x * 0.057 + 1));
    t.lineTo(x, y);
  }
  t.lineTo(S, 660);
  t.lineTo(0, 660);
  t.closePath();
  t.fill();
  // distant steeple and factory chimney (Cleveland, toward the lake)
  t.fillStyle = tone(0.55, 90, 2.0);
  t.beginPath();
  t.moveTo(560, 616);
  t.lineTo(566, 560);
  t.lineTo(572, 616);
  t.closePath();
  t.fill();
  t.fillRect(870, 560, 8, 70);
  t.fillRect(910, 584, 6, 50);
  // park lawn behind the drive
  const lg = t.createLinearGradient(0, 640, 0, 690);
  lg.addColorStop(0, tone(0.28, 0, 2.6));
  lg.addColorStop(1, tone(0.42, 0, 2.6));
  t.fillStyle = lg;
  t.fillRect(0, 644, S, 46);
  // dark hedge before the mansion (a ground for the white rider)
  t.fillStyle = tone(0.84, 0, 2.2);
  t.beginPath();
  t.moveTo(0, 690);
  t.lineTo(0, 664);
  for (let x = 0; x <= 520; x += 12) t.lineTo(x, 662 - 4 * Math.abs(Math.sin(x * 0.09)));
  t.quadraticCurveTo(536, 664, 540, 690);
  t.closePath();
  t.fill();
  // right hedge (beyond the tower)
  t.beginPath();
  t.moveTo(1000, 690);
  t.lineTo(1000, 668);
  for (let x = 1000; x >= 830; x -= 12) t.lineTo(x, 666 - 4 * Math.abs(Math.sin(x * 0.11)));
  t.quadraticCurveTo(818, 670, 814, 690);
  t.closePath();
  t.fill();
  // the carriage drive (the road): pale gravel
  t.fillStyle = tone(0.07, 0, 4.2);
  t.fillRect(0, 689, S, 25);
  // foreground lawn, darkening to the bottom edge
  const fg = t.createLinearGradient(0, 714, 0, PIC.y1);
  fg.addColorStop(0, tone(0.42, 0, 2.8));
  fg.addColorStop(1, tone(0.78, 0, 2.8));
  t.fillStyle = fg;
  t.fillRect(0, 714, S, PIC.y1 - 714);
}

function paintGroundDetails(g, rng) {
  g.save();
  g.lineCap = 'round';
  // hedge foliage: white-line nicks and dark scallops
  for (const [x0, x1, y0] of [[0, 536, 664], [818, 1000, 668]]) {
    for (let k = 0; k < (x1 - x0) * 0.9; k++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + 3 + rng() * 22;
      g.strokeStyle = rng() < 0.6 ? paper(0.7) : INK;
      g.lineWidth = 0.8;
      g.beginPath();
      g.arc(x, y, 1.5 + rng() * 2, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
  }
  // drive edges: a dark kerb line on the far side, a grass edge near side
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(0, 689.5);
  g.lineTo(S, 689.5);
  g.stroke();
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, 714);
  g.lineTo(S, 714);
  g.stroke();
  // gravel
  g.fillStyle = ink(0.55);
  for (let k = 0; k < 520; k++) {
    const x = rng() * S;
    const y = 692 + rng() * 20;
    g.fillRect(x, y, 1 + rng() * 2, 0.8);
  }
  // wheel ruts
  g.strokeStyle = ink(0.35);
  g.lineWidth = 0.7;
  for (const y of [697, 707]) {
    g.beginPath();
    for (let x = 0; x <= S; x += 20) {
      const yy = y + Math.sin(x * 0.013) * 0.8;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }
  // foreground grass: tufts with white-line blades
  for (let k = 0; k < 900; k++) {
    const x = rng() * S;
    const y = 718 + rng() * (PIC.y1 - 724);
    if (y > CE.y0 - 12 && ((x > CE.x0 - 10 && x < CE.x1 + 10) || (x > DY.x0 - 10 && x < DY.x1 + 10))) continue;
    const L = 4 + (y - 714) * 0.05 + rng() * 5;
    const lean = (rng() - 0.3) * 3;
    g.strokeStyle = rng() < 0.5 ? paper(0.75) : INK;
    g.lineWidth = 0.7 + (y - 714) / 250;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + lean * 0.3, y - L * 0.6, x + lean, y - L);
    g.stroke();
  }
  // lawn behind the drive: mower stripes
  g.strokeStyle = paper(0.55);
  g.lineWidth = 0.8;
  for (let k = 0; k < 6; k++) {
    g.beginPath();
    g.moveTo(560 + k * 40, 686);
    g.lineTo(600 + k * 30, 646);
    g.stroke();
  }
  g.restore();
}

// -----------------------------------------------------------------------------
// lower insets: "The Storage Cells" (cellar) and "The Dynamo" (in the tower)
// -----------------------------------------------------------------------------
const CE = { x0: 44, y0: 730, x1: 300, y1: 880, lab: 864 };
const DY = { x0: 700, y0: 730, x1: 956, y1: 880, lab: 864 };
const JARS = [];
for (const [top, base] of [[768, 796], [814, 842]]) {
  for (let k = 0; k < 12; k++) JARS.push({ x: 56 + k * 19.6, y: top, w: 14.5, h: base - top });
}
const LAMP = { x: 168, y: 756 };
const AMM = { x: 268, y: 748, r: 12 };
const PUL = { x: 752, y: 776, r: 32 }; // countershaft pulley (6 ft)
const DPUL = { x: 887, y: 832, r: 8 }; // dynamo pulley

function insetClear(t, box) {
  t.clearRect(box.x0 - 7, box.y0 - 7, box.x1 - box.x0 + 14, box.y1 - box.y0 + 14);
}
function paintInsetTones(t) {
  // --- the cellar
  insetClear(t, CE);
  t.save();
  t.beginPath();
  t.rect(CE.x0, CE.y0, CE.x1 - CE.x0, CE.lab - CE.y0);
  t.clip();
  t.fillStyle = tone(0.7, 90, 2.1);
  t.fillRect(CE.x0, CE.y0, CE.x1 - CE.x0, CE.lab - CE.y0);
  // brick vault
  t.fillStyle = tone(0.92, 0, 2.0);
  t.beginPath();
  t.moveTo(CE.x0, CE.y0);
  t.lineTo(CE.x1, CE.y0);
  t.lineTo(CE.x1, CE.y0 + 30);
  t.quadraticCurveTo((CE.x0 + CE.x1) / 2, CE.y0 - 6, CE.x0, CE.y0 + 30);
  t.closePath();
  t.fill();
  // lamp-lit patch of wall
  const lg = t.createRadialGradient(LAMP.x, LAMP.y, 4, LAMP.x, LAMP.y, 110);
  lg.addColorStop(0, toneA(0.2, 90, 2.1, 1));
  lg.addColorStop(1, toneA(0.2, 90, 2.1, 0));
  t.fillStyle = lg;
  t.fillRect(CE.x0, CE.y0, CE.x1 - CE.x0, CE.lab - CE.y0);
  // floor
  t.fillStyle = tone(0.45, 0, 2.2);
  t.fillRect(CE.x0, 846, CE.x1 - CE.x0, CE.lab - 846);
  // shelves
  t.fillStyle = tone(0.75, 0, 1.9);
  t.fillRect(CE.x0 + 4, 796, CE.x1 - CE.x0 - 8, 6);
  t.fillRect(CE.x0 + 4, 842, CE.x1 - CE.x0 - 8, 5);
  // glass cells (light)
  for (const j of JARS) {
    t.fillStyle = tone(0.06, 0, 2.0);
    t.fillRect(j.x, j.y, j.w, j.h);
  }
  // ammeter face
  t.fillStyle = tone(0, 0, 2);
  t.beginPath();
  t.arc(AMM.x, AMM.y, AMM.r, 0, TAU);
  t.fill();
  t.restore();
  // --- the dynamo room (inside the foot of the tower)
  insetClear(t, DY);
  t.save();
  t.beginPath();
  t.rect(DY.x0, DY.y0, DY.x1 - DY.x0, DY.lab - DY.y0);
  t.clip();
  t.fillStyle = tone(0.58, 90, 2.1);
  t.fillRect(DY.x0, DY.y0, DY.x1 - DY.x0, DY.lab - DY.y0);
  const wl = t.createLinearGradient(DY.x0, 0, DY.x1, 0);
  wl.addColorStop(0, toneA(0.3, 90, 2.1, 0.9));
  wl.addColorStop(1, toneA(0.3, 90, 2.1, 0));
  t.fillStyle = wl;
  t.fillRect(DY.x0, DY.y0, DY.x1 - DY.x0, DY.lab - DY.y0);
  // floor boards
  t.fillStyle = tone(0.4, 0, 2.2);
  t.fillRect(DY.x0, 848, DY.x1 - DY.x0, DY.lab - 848);
  // heavy diagonal brace of the tower frame
  t.fillStyle = tone(0.88, 90, 1.9);
  t.fillRect(DY.x1 - 18, DY.y0, 12, 118);
  t.fillRect(DY.x0 + 6, DY.y0, 10, 118);
  // field coils (wound wire: fine ruled lines across), yoke & pole pieces
  t.fillStyle = tone(0.55, 0, 1.7);
  t.fillRect(848, 780, 24, 46);
  t.fillRect(902, 780, 24, 46);
  const cg = t.createLinearGradient(848, 0, 872, 0);
  cg.addColorStop(0, toneA(0.15, 0, 1.7, 1));
  cg.addColorStop(1, toneA(0.85, 0, 1.7, 1));
  t.fillStyle = cg;
  t.fillRect(848, 780, 24, 46);
  const cg2 = t.createLinearGradient(902, 0, 926, 0);
  cg2.addColorStop(0, toneA(0.15, 0, 1.7, 1));
  cg2.addColorStop(1, toneA(0.85, 0, 1.7, 1));
  t.fillStyle = cg2;
  t.fillRect(902, 780, 24, 46);
  t.fillStyle = tone(0.9, 90, 1.8);
  t.fillRect(842, 772, 90, 9);
  t.fillRect(844, 825, 86, 15);
  t.restore();
}

function insetFrame(g, box, label) {
  g.save();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.strokeRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
  g.lineWidth = 0.7;
  g.strokeRect(box.x0 - 3.5, box.y0 - 3.5, box.x1 - box.x0 + 7, box.y1 - box.y0 + 7);
  g.fillStyle = PAPER;
  g.fillRect(box.x0 + 1, box.lab, box.x1 - box.x0 - 2, box.y1 - box.lab - 1);
  g.fillStyle = INK;
  g.fillRect(box.x0, box.lab, box.x1 - box.x0, 1.2);
  g.font = '400 11.5px "IM Fell English", Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  spacedText(g, label, (box.x0 + box.x1) / 2, (box.lab + box.y1) / 2 + 1, 1.2);
  g.restore();
}

function paintInsetDetails(g, rng) {
  g.save();
  g.lineCap = 'round';
  // --- cellar
  g.save();
  g.beginPath();
  g.rect(CE.x0, CE.y0, CE.x1 - CE.x0, CE.lab - CE.y0);
  g.clip();
  // vault bricks: white-line voussoirs
  g.strokeStyle = paper(0.6);
  g.lineWidth = 0.7;
  for (let k = 0; k < 26; k++) {
    const u = k / 25;
    const x = CE.x0 + u * (CE.x1 - CE.x0);
    const yv = CE.y0 + 30 - 4 * (CE.y0 + 30 - (CE.y0 - 6)) * u * (1 - u) * 0.5;
    g.beginPath();
    g.moveTo(x, yv - 1);
    g.lineTo(x + (u - 0.5) * 6, yv - 9);
    g.stroke();
  }
  // shelf brackets
  g.fillStyle = INK;
  for (const x of [CE.x0 + 14, (CE.x0 + CE.x1) / 2, CE.x1 - 18]) {
    g.fillRect(x, 802, 4, 40);
    g.fillRect(x, 847, 4, 17);
  }
  // the cells: glass jars with lead plates, terminals and connecting straps
  for (const j of JARS) {
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.strokeRect(j.x, j.y, j.w, j.h);
    // liquid line
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(j.x + 1, j.y + 6);
    g.lineTo(j.x + j.w - 1, j.y + 6);
    g.stroke();
    // plates
    g.fillStyle = INK;
    for (let p = 0; p < 4; p++) g.fillRect(j.x + 2.2 + p * 3.1, j.y + 3, 1.6, j.h - 6);
    // glass highlight (white line)
    g.strokeStyle = paper(0.95);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(j.x + 1.4, j.y + 8);
    g.lineTo(j.x + 1.4, j.y + j.h - 3);
    g.stroke();
    // terminals
    g.fillStyle = INK;
    g.fillRect(j.x + 2, j.y - 3, 2.4, 3);
    g.fillRect(j.x + j.w - 4.4, j.y - 3, 2.4, 3);
  }
  // straps between neighbours
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  for (let k = 0; k < JARS.length - 1; k++) {
    const a = JARS[k];
    const b = JARS[k + 1];
    if (a.y !== b.y) continue;
    g.beginPath();
    g.moveTo(a.x + a.w - 3, a.y - 3);
    g.quadraticCurveTo((a.x + a.w + b.x) / 2, a.y - 7, b.x + 3, b.y - 3);
    g.stroke();
  }
  // mains up the wall to the house
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(JARS[11].x + JARS[11].w - 3, JARS[11].y - 3);
  g.lineTo(JARS[11].x + JARS[11].w + 3, JARS[11].y - 10);
  g.lineTo(AMM.x + 2, AMM.y + AMM.r);
  g.moveTo(AMM.x, AMM.y - AMM.r);
  g.lineTo(AMM.x, CE.y0);
  g.stroke();
  // ammeter
  g.lineWidth = 1.4;
  g.beginPath();
  g.arc(AMM.x, AMM.y, AMM.r, 0, TAU);
  g.stroke();
  g.lineWidth = 0.6;
  g.beginPath();
  for (let k = 0; k <= 8; k++) {
    const a = -Math.PI * 0.85 + (k / 8) * Math.PI * 0.7;
    g.moveTo(AMM.x + Math.cos(a) * (AMM.r - 2), AMM.y + 3 + Math.sin(a) * (AMM.r - 2));
    g.lineTo(AMM.x + Math.cos(a) * (AMM.r - 5), AMM.y + 3 + Math.sin(a) * (AMM.r - 5));
  }
  g.stroke();
  // lamp flex
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(LAMP.x, CE.y0);
  g.lineTo(LAMP.x, LAMP.y - 6);
  g.stroke();
  g.fillRect(LAMP.x - 3, LAMP.y - 8, 6, 3);
  g.restore();
  insetFrame(g, CE, 'THE STORAGE CELLS.');

  // --- dynamo room
  g.save();
  g.beginPath();
  g.rect(DY.x0, DY.y0, DY.x1 - DY.x0, DY.lab - DY.y0);
  g.clip();
  // vertical sliding guides of the dynamo support
  g.fillStyle = INK;
  g.fillRect(836, 760, 4, 88);
  g.fillRect(934, 760, 4, 88);
  g.strokeStyle = paper(0.85);
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(836.8, 762);
  g.lineTo(836.8, 846);
  g.moveTo(934.8, 762);
  g.lineTo(934.8, 846);
  g.stroke();
  // bedplate
  g.fillStyle = INK;
  g.fillRect(830, 840, 112, 8);
  g.strokeStyle = paper(0.8);
  g.beginPath();
  g.moveTo(832, 841.5);
  g.lineTo(940, 841.5);
  g.stroke();
  // coil windings: white-line turns across the ruled copper
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.strokeRect(848, 780, 24, 46);
  g.strokeRect(902, 780, 24, 46);
  g.strokeStyle = paper(0.55);
  g.lineWidth = 0.6;
  for (const x0 of [848, 902]) {
    for (let y = 783; y < 825; y += 3) {
      g.beginPath();
      g.moveTo(x0 + 1, y);
      g.lineTo(x0 + 23, y + 1);
      g.stroke();
    }
  }
  // armature tunnel between the pole pieces
  g.fillStyle = PAPER;
  g.beginPath();
  g.arc(DPUL.x, DPUL.y, 13, 0, TAU);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  g.stroke();
  // countershaft hangers (the main belt from the wheel shaft comes down through the roof)
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(PUL.x - 30, DY.y0);
  g.lineTo(PUL.x - PUL.r + 1, PUL.y);
  g.moveTo(PUL.x + 26, DY.y0);
  g.lineTo(PUL.x + PUL.r - 1, PUL.y - 4);
  g.stroke();
  g.restore();
  insetFrame(g, DY, 'THE DYNAMO.');
  g.restore();
}

/** Belt between two pulleys: returns the two straight runs (external tangents). */
function beltRuns(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const off = Math.acos((a.r - b.r) / d);
  const runs = [];
  for (const sgn of [1, -1]) {
    const th = base + sgn * off;
    runs.push([
      { x: a.x + Math.cos(th) * a.r, y: a.y + Math.sin(th) * a.r },
      { x: b.x + Math.cos(th) * b.r, y: b.y + Math.sin(th) * b.r },
    ]);
  }
  return runs;
}

function drawInsetsDynamic(ctx, T, bri, wheelRate, wheelRot) {
  ctx.save();
  ctx.lineCap = 'round';
  // --- cellar: lamp, bubbles of gas in charging cells, ammeter needle
  ctx.save();
  ctx.beginPath();
  ctx.rect(CE.x0, CE.y0, CE.x1 - CE.x0, CE.lab - CE.y0);
  ctx.clip();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(LAMP.x, LAMP.y, 4, 5.5, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = clamp01(bri * 1.4);
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.ellipse(LAMP.x, LAMP.y, 3.2, 4.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paper(0.9);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    const L = 10 + bri * 18 + (k % 2) * 6;
    ctx.moveTo(LAMP.x + Math.cos(a) * 9, LAMP.y + Math.sin(a) * 9);
    ctx.lineTo(LAMP.x + Math.cos(a) * L, LAMP.y + Math.sin(a) * L);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  // gas bubbles (charging): more and quicker in a gust
  const chg = clamp01((wheelRate - 0.75) / 0.8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let k = 0; k < JARS.length; k++) {
    const j = JARS[k];
    for (let b = 0; b < 3; b++) {
      if (h1(k * 3 + b) > chg + 0.1) continue;
      const ph = pmod(T * (0.9 + h1(k + b * 7) * 0.8) + h1(k * 5 + b), 1);
      const y = j.y + j.h - 3 - ph * (j.h - 10);
      const x = j.x + 3 + h1(k * 2 + b * 3) * (j.w - 6);
      ctx.moveTo(x + 1, y);
      ctx.arc(x, y, 1, 0, TAU);
    }
  }
  ctx.stroke();
  // ammeter needle
  const na = -Math.PI * 0.85 + Math.PI * 0.7 * clamp01(0.08 + 0.9 * chg);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(AMM.x, AMM.y + 3);
  ctx.lineTo(AMM.x + Math.cos(na) * (AMM.r - 3), AMM.y + 3 + Math.sin(na) * (AMM.r - 3));
  ctx.stroke();
  ctx.restore();

  // --- dynamo: countershaft pulley, belt, armature
  ctx.save();
  ctx.beginPath();
  ctx.rect(DY.x0, DY.y0, DY.x1 - DY.x0, DY.lab - DY.y0);
  ctx.clip();
  const aC = wheelRot * 6.25; // countershaft: x6.25 of the wheel; dynamo pulley x8 more = x50
  const aD = aC * (PUL.r / DPUL.r);
  // belt: two straight runs with travelling lacing marks
  const runs = beltRuns(PUL, DPUL);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6;
  for (const [p, q] of runs) line(ctx, p, q);
  ctx.strokeStyle = paper(0.85);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 9]);
  ctx.lineDashOffset = -aC * PUL.r;
  line(ctx, runs[0][0], runs[0][1]);
  ctx.lineDashOffset = aC * PUL.r;
  line(ctx, runs[1][0], runs[1][1]);
  ctx.setLineDash([]);
  // main belt up to the wheel shaft (moving)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  const ub = [[{ x: PUL.x - PUL.r + 2, y: PUL.y - 6 }, { x: PUL.x - 22, y: DY.y0 }], [{ x: PUL.x + PUL.r - 2, y: PUL.y - 6 }, { x: PUL.x + 18, y: DY.y0 }]];
  for (const [p, q] of ub) line(ctx, p, q);
  ctx.strokeStyle = paper(0.85);
  ctx.lineWidth = 0.9;
  ctx.setLineDash([2, 8]);
  ctx.lineDashOffset = -aC * PUL.r;
  line(ctx, ub[0][0], ub[0][1]);
  ctx.lineDashOffset = aC * PUL.r;
  line(ctx, ub[1][0], ub[1][1]);
  ctx.setLineDash([]);
  // countershaft pulley: rim + 6 curved spokes
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(PUL.x, PUL.y, PUL.r - 2, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = aC + (k / 6) * TAU;
    ctx.moveTo(PUL.x + Math.cos(a) * 5, PUL.y + Math.sin(a) * 5);
    ctx.quadraticCurveTo(
      PUL.x + Math.cos(a + 0.25) * 16,
      PUL.y + Math.sin(a + 0.25) * 16,
      PUL.x + Math.cos(a + 0.18) * (PUL.r - 4),
      PUL.y + Math.sin(a + 0.18) * (PUL.r - 4),
    );
  }
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(PUL.x, PUL.y, 6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paper(0.9);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(PUL.x, PUL.y, PUL.r - 3.5, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  // dynamo pulley & armature: spinning far too fast to see — motion arcs
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(DPUL.x, DPUL.y, DPUL.r + 1, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paper(0.85);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = aD * 0.013 + k * 2.1;
    ctx.moveTo(DPUL.x + Math.cos(a) * (DPUL.r - 2), DPUL.y + Math.sin(a) * (DPUL.r - 2));
    ctx.arc(DPUL.x, DPUL.y, DPUL.r - 2, a, a + 1.3);
  }
  ctx.stroke();
  // sparks at the brushes when the charge runs high
  if (bri > 0.6) {
    const sp = (bri - 0.6) / 0.4;
    ctx.strokeStyle = paper(0.95);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -0.6 + k * 0.3 + Math.sin(T * 40 + k) * 0.2;
      const L = 4 + sp * 6 * h1(Math.floor(T * 20) + k);
      ctx.moveTo(DPUL.x + 15 * Math.cos(a), DPUL.y - 8 + 15 * Math.sin(a));
      ctx.lineTo(DPUL.x + (15 + L) * Math.cos(a), DPUL.y - 8 + (15 + L) * Math.sin(a));
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// -----------------------------------------------------------------------------
// masthead & caption (letterpress over the cut)
// -----------------------------------------------------------------------------
function paintMasthead(g) {
  g.save();
  g.fillStyle = INK;
  g.strokeStyle = INK;
  const x0 = 40;
  const x1 = 960;
  // top rules: thick + thin
  g.fillRect(x0, 34, x1 - x0, 3.5);
  g.fillRect(x0, 40, x1 - x0, 1);
  // running head
  g.font = '400 12px "IM Fell English", Georgia, serif';
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  spacedText(g, 'VOL. LIX.—No. 25.', x0 + 2, 56, 0.8, 'left');
  g.textAlign = 'right';
  spacedText(g, '[PRICE TEN CENTS.]', x1 - 2, 56, 0.8, 'right');
  g.font = 'italic 400 12.5px "IM Fell English", Georgia, serif';
  g.textAlign = 'center';
  g.fillText('An Illustrated Weekly Journal of Electricity, Mechanics, and the Useful Arts.', 500, 56);
  // title band: fat-face capitals with an engraved (hatched) drop shadow
  g.font = '900 60px "Playfair Display", Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const title = 'THE WIND DYNAMO';
  // shadow: draw text offset into an offscreen-like clip and rule it with lines
  g.save();
  g.beginPath();
  g.rect(x0, 62, x1 - x0, 60);
  g.clip();
  g.fillStyle = 'rgba(28,25,21,1)';
  g.globalAlpha = 1;
  // build hatch by drawing the shadow text, then knocking out lines with paper
  g.fillText(title.split('').join(' '), 503.5, 116.5);
  g.fillStyle = PAPER;
  for (let y = 62; y < 124; y += 2.2) g.fillRect(x0, y, x1 - x0, 1.1);
  g.restore();
  g.fillStyle = INK;
  g.fillText(title.split('').join(' '), 500, 113);
  // inline white line through the letters (Victorian "inline" face)
  g.strokeStyle = PAPER;
  g.lineWidth = 0.9;
  g.save();
  g.beginPath();
  g.rect(x0, 70, x1 - x0, 50);
  g.clip();
  g.strokeText(title.split('').join(' '), 500, 113);
  g.restore();
  // ornaments either side
  g.fillStyle = INK;
  for (const sx of [-1, 1]) {
    const cx = 500 + sx * 330;
    g.beginPath();
    g.moveTo(cx - 40 * sx, 92);
    g.lineTo(cx + 34 * sx, 92);
    g.lineWidth = 1;
    g.stroke();
    g.beginPath();
    g.arc(cx + 38 * sx, 92, 3, 0, TAU);
    g.fill();
  }
  // lower rules with the dateline
  g.fillRect(x0, 126, x1 - x0, 1);
  g.fillRect(x0, 129, x1 - x0, 3);
  g.fillStyle = PAPER;
  g.fillRect(500 - 140, 122, 280, 14);
  g.fillStyle = INK;
  g.font = 'italic 400 15px "IM Fell English", Georgia, serif';
  g.textAlign = 'center';
  g.fillText('Cleveland, Ohio · 1888', 500, 134);
  g.font = '400 11px "IM Fell English", Georgia, serif';
  g.textAlign = 'left';
  g.fillText('NEW YORK, DECEMBER 22, 1888.', x0 + 2, 145);
  g.textAlign = 'right';
  g.fillText('$3.00 A YEAR.', x1 - 2, 145);
  g.restore();
}

function paintCaption(g) {
  g.save();
  g.fillStyle = INK;
  // picture border (rules above / below the cut, full bleed sideways)
  g.fillRect(0, PIC.y0 - 1.5, S, 1.5);
  g.fillRect(0, PIC.y1, S, 2);
  g.fillRect(0, PIC.y1 + 4, S, 0.8);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = '400 17px "IM Fell English", Georgia, serif';
  spacedText(g, "THE WINDMILL DYNAMO AT CLEVELAND, OHIO.", 500, 920, 1.4);
  g.font = 'italic 400 13.5px "IM Fell English", Georgia, serif';
  g.fillText('Wheel 56 ft. in diameter, of 144 twisted blades; tower 60 ft., turning bodily on its gudgeon; tail 60 ft. by 20 ft.', 500, 940);
  g.fillText('Dynamo of 12,000 watts, geared 50 to 1 by belts, charging 408 storage cells in the cellar of the residence.', 500, 957);
  g.font = '400 9px "IM Fell English", Georgia, serif';
  g.textAlign = 'left';
  g.fillText('[See page 389.]', 44, 970);
  g.restore();
}

// -----------------------------------------------------------------------------
// BACKGROUND BAKE
// -----------------------------------------------------------------------------
function paintBackground(kit, g0, rng) {
  // all pixel work happens on a read-optimised work canvas, then is blitted once
  const wc = kit.createCanvas(S, S);
  const g = wc.getContext('2d', { willReadFrequently: true });
  // newsprint
  g.fillStyle = PAPER;
  g.fillRect(0, 0, S, S);
  kit.addBlotches(g, S, S, rng, 'rgba(160,130,80,0.05)', 26, 80, 260);
  paintMasthead(g);
  // the cut: build a tone map, then engrave it
  const tcv = kit.createCanvas(S, S);
  const t = tcv.getContext('2d', { willReadFrequently: true });
  paintSkyTones(t, kit);
  paintGroundTones(t);
  paintWindmillTones(t);
  paintMansionTones(t);
  paintBlythTones(t);
  paintInsetTones(t);
  engrave(g, tcv, PIC.y0, PIC.y1);
  // bare elms over the sky, then the house is re-engraved over their twigs
  const trng = kit.makePRNG(1888);
  g.save();
  g.beginPath();
  g.rect(0, PIC.y0, S, 690 - PIC.y0);
  g.clip();
  elm(g, trng, 500, 664, 330, 9);
  elm(g, trng, 960, 668, 250, 7);
  g.restore();
  repaintRegion(kit, g, tcv, (c) => {
    c.beginPath();
    c.rect(MAN.x0 - 14, MAN.ridge - 2, MAN.x1 - MAN.x0 + 28, MAN.base - MAN.ridge + 2);
    c.rect(MAN.turret.cx - MAN.turret.r - 10, MAN.turret.apex, MAN.turret.r * 2 + 20, MAN.base - MAN.turret.apex);
    c.rect(398, 576, 74, 92);
    c.rect(MAN.gable.x0 - 12, MAN.gable.apex - 14, MAN.gable.x1 - MAN.gable.x0 + 24, 120);
    c.rect(80, 324, 30, 32);
    c.rect(146, 326, 26, 30);
    c.rect(300, 320, 30, 40);
  });
  paintMansionDetails(g, rng);
  paintWindmillDetails(g);
  paintGroundDetails(g, rng);
  paintArcLampStandard(g);
  paintBlythDetails(g, rng);
  paintInsetDetails(g, rng);
  paintCaption(g);
  kit.addGrain(g, S, S, rng, 0.025);
  g0.drawImage(wc, 0, 0);
}

/** Re-engrave the tone map inside a clip (to restore a region over drawn strokes). */
function repaintRegion(kit, g, tcv, clipFn) {
  const tmp = kit.createCanvas(S, S);
  const c = tmp.getContext('2d', { willReadFrequently: true });
  c.fillStyle = PAPER;
  c.fillRect(0, 0, S, S);
  engrave(c, tcv, PIC.y0, PIC.y1);
  // only keep pixels where the tone map has a house (alpha) — mask with the tone map itself
  const m = kit.createCanvas(S, S);
  const mc = m.getContext('2d');
  clipFn(mc);
  mc.fillStyle = '#000';
  mc.fill();
  // restrict to mansion-ish tone pixels: intersect with the mansion silhouette
  mc.globalCompositeOperation = 'source-in';
  mc.drawImage(houseMask(kit), 0, 0);
  mc.globalCompositeOperation = 'source-in';
  mc.drawImage(tmp, 0, 0);
  g.drawImage(m, 0, 0);
}

let _houseMask = null;
function houseMask(kit) {
  if (_houseMask) return _houseMask;
  const c = kit.createCanvas(S, S);
  const t = c.getContext('2d');
  // silhouette of the mansion masses
  t.fillStyle = '#000';
  t.fillRect(MAN.x0, MAN.eave - 2, MAN.x1 - MAN.x0, MAN.base - MAN.eave + 2);
  const gb = MAN.gable;
  t.beginPath();
  t.moveTo(MAN.x0 - 12, MAN.eave);
  t.lineTo(60, MAN.ridge);
  t.lineTo(gb.x0 + 10, MAN.ridge);
  t.lineTo(gb.x0 + 20, MAN.eave);
  t.closePath();
  t.fill();
  t.beginPath();
  t.moveTo(gb.x0 - 10, MAN.eave);
  t.lineTo((gb.x0 + gb.x1) / 2, gb.apex - 12);
  t.lineTo(gb.x1 + 10, MAN.eave);
  t.closePath();
  t.fill();
  const tr = MAN.turret;
  t.fillRect(tr.cx - tr.r, tr.top, tr.r * 2, MAN.base - tr.top);
  t.beginPath();
  t.moveTo(tr.cx - tr.r - 8, tr.top + 2);
  t.lineTo(tr.cx, tr.apex);
  t.lineTo(tr.cx + tr.r + 8, tr.top + 2);
  t.closePath();
  t.fill();
  t.fillRect(404, 578, 66, 90);
  t.fillRect(84, 326, 20, 62);
  t.fillRect(150, 330, 18, 48);
  t.fillRect(306, 330, 18, 76);
  for (const dx of [58, 124]) {
    t.fillRect(dx, 388, 30, 40);
    t.beginPath();
    t.moveTo(dx - 5, 390);
    t.lineTo(dx + 15, 372);
    t.lineTo(dx + 35, 390);
    t.closePath();
    t.fill();
  }
  _houseMask = c;
  return c;
}

// -----------------------------------------------------------------------------
// the gentleman (and his hat)
// -----------------------------------------------------------------------------
const GENT = { x: 566, y: 690 };
const HAT_T0 = 4.0; // the gust takes it
const HAT_TL = 5.7; // it lands on the pole
const POLE_F = 0.58; // where on the pole it hangs

function drawHat(ctx, x, y, ang, sc = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.scale(sc, sc);
  // paper knock-out halo so the black hat reads on dark ground
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  const crown = () => {
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-6.2, -17);
    ctx.quadraticCurveTo(0, -18.5, 6.2, -17);
    ctx.lineTo(7, 0);
    ctx.closePath();
  };
  const brim = () => {
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 3.2, 0, 0, TAU);
  };
  crown();
  ctx.stroke();
  brim();
  ctx.stroke();
  ctx.fillStyle = INK;
  crown();
  ctx.fill();
  brim();
  ctx.fill();
  // white-line sheen on the silk and the band
  ctx.strokeStyle = paper(0.9);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-3.6, -2.5);
  ctx.lineTo(-3.2, -15.5);
  ctx.moveTo(-6.3, -4.6);
  ctx.lineTo(6.3, -4.6);
  ctx.stroke();
  ctx.restore();
}

function gentPose(T) {
  // 0 = admiring (arm pointing at the wheel), 1 = clutching for the hat
  return ss(HAT_T0 - 0.05, HAT_T0 + 0.35, T);
}

function drawGentleman(ctx, T, hatOn) {
  const { x, y } = GENT;
  const p = gentPose(T);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // shadow on the gravel
  ctx.strokeStyle = ink(0.6);
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(x - 2 + k * 2, y + 1.5 + k * 1.4);
    ctx.lineTo(x + 26 - k * 3, y + 1.5 + k * 1.4);
    ctx.stroke();
  }
  // legs (trousers): ink with a white line on the lit edge
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 50);
  ctx.lineTo(x - 8, y - 2);
  ctx.lineTo(x - 1, y - 2);
  ctx.lineTo(x, y - 40);
  ctx.lineTo(x + 2, y - 2);
  ctx.lineTo(x + 9, y - 2);
  ctx.lineTo(x + 8, y - 50);
  ctx.closePath();
  ctx.fill();
  // boots
  ctx.beginPath();
  ctx.ellipse(x - 3, y - 1.5, 6, 2.2, 0, 0, TAU);
  ctx.ellipse(x + 8, y - 1.5, 6, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paper(0.8);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x - 7.4, y - 48);
  ctx.lineTo(x - 6.6, y - 5);
  ctx.stroke();
  // frock coat with flared skirts
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 92);
  ctx.quadraticCurveTo(x - 14, y - 70, x - 15, y - 34);
  ctx.lineTo(x + 12, y - 34);
  ctx.quadraticCurveTo(x + 13, y - 70, x + 10, y - 92);
  ctx.quadraticCurveTo(x, y - 96, x - 10, y - 92);
  ctx.closePath();
  ctx.fill();
  // white-line modelling of the coat (lit from the west)
  ctx.strokeStyle = paper(0.85);
  ctx.lineWidth = 0.8;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(x - 11 + k * 1.7, y - 88 + k * 2);
    ctx.quadraticCurveTo(x - 13 + k * 1.6, y - 64, x - 13 + k * 2, y - 37);
    ctx.stroke();
  }
  // waistcoat / shirt front & collar
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 92);
  ctx.lineTo(x + 5, y - 92);
  ctx.lineTo(x + 3, y - 74);
  ctx.closePath();
  ctx.fill();
  // head (profile looking up to the right), whiskers
  const hx = x + 2;
  const hy = y - 101;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6.4, 7.6, -0.2, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath(); // mutton-chop whiskers & beard
  ctx.moveTo(hx - 5, hy - 1);
  ctx.quadraticCurveTo(hx - 4, hy + 10, hx + 3, hy + 9);
  ctx.quadraticCurveTo(hx + 6, hy + 6, hx + 6, hy + 3);
  ctx.quadraticCurveTo(hx + 1, hy + 5, hx - 1, hy - 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(hx + 2.5, hy - 2.5, 2.2, 1.4); // eye
  ctx.beginPath(); // nose
  ctx.moveTo(hx + 6, hy - 2);
  ctx.lineTo(hx + 8.5, hy + 1.5);
  ctx.lineTo(hx + 6, hy + 2);
  ctx.fill();
  if (!hatOn) {
    // hair, ruffled by the gust
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      ctx.moveTo(hx - 5 + k * 2.2, hy - 6.5);
      ctx.quadraticCurveTo(hx - 2 + k * 2.2, hy - 11 - k * 0.4, hx + 3 + k * 2.6, hy - 10 + Math.sin(T * 30 + k) * 1.2);
    }
    ctx.stroke();
  } else {
    drawHat(ctx, hx - 0.5, hy - 5.5, -0.12, 0.92);
  }
  // arms: the near arm points at the wheel, then flies up after the hat
  const sh = { x: x + 4, y: y - 88 };
  const aPoint = -0.95; // up-right toward the wheel
  const aReach = -1.35;
  const a = lerp(aPoint, aReach, p) + Math.sin(T * 9) * 0.05 * p;
  const el = { x: sh.x + Math.cos(a + 0.35) * 15, y: sh.y + Math.sin(a + 0.35) * 15 };
  const hd = { x: el.x + Math.cos(a) * 15, y: el.y + Math.sin(a) * 15 };
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y);
  ctx.lineTo(el.x, el.y);
  ctx.lineTo(hd.x, hd.y);
  ctx.stroke();
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(hd.x + Math.cos(a) * 2.5, hd.y + Math.sin(a) * 2.5, 2.6, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // far arm: resting on the cane, then clapped to the head
  const fsh = { x: x - 6, y: y - 88 };
  const canePt = { x: x - 18, y: y - 50 };
  const headPt = { x: hx - 5, y: hy - 6 };
  const fh = lerpP(canePt, headPt, p);
  const fel = { x: lerp(x - 16, x - 18, p), y: lerp(y - 70, y - 92, p) };
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(fsh.x, fsh.y);
  ctx.lineTo(fel.x, fel.y);
  ctx.lineTo(fh.x, fh.y);
  ctx.stroke();
  ctx.strokeStyle = paper(0.8);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(fsh.x - 1.5, fsh.y + 1);
  ctx.lineTo(fel.x - 2, fel.y);
  ctx.stroke();
  // cane (dropped to lean when the hand leaves it)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  const caneTop = lerpP(canePt, { x: x - 30, y: y - 44 }, p);
  ctx.beginPath();
  ctx.moveTo(caneTop.x, caneTop.y);
  ctx.lineTo(lerp(x - 22, x - 34, p), y - 1);
  ctx.stroke();
  ctx.restore();
}

/** Where the hat is, given T and the current rider bicycle x. */
function hatState(T, riderX, thumb) {
  if (thumb || T < HAT_T0) return { mode: 'head' };
  const poleAt = (bx, f) => ({ x: bx - 64 - 36 * f, y: ROAD_Y - 74 - 126 * f });
  if (T >= HAT_TL) {
    // settled on the pole: bounces and slides a little, then rides along
    const dt = T - HAT_TL;
    const bounce = Math.exp(-dt * 4.5) * Math.sin(dt * 18);
    const f = POLE_F - 0.05 * (1 - Math.exp(-dt * 6)) + 0.03 * bounce;
    const p = poleAt(riderX, f);
    return { mode: 'pole', x: p.x, y: p.y, ang: -15.9 * DEG + 0.25 * bounce };
  }
  const u = (T - HAT_T0) / (HAT_TL - HAT_T0);
  // where the pole will be at landing time (the bicycle moves 125 px/s)
  const bxL = riderX + 125 * (HAT_TL - T);
  const E = poleAt(bxL, POLE_F);
  const S0 = { x: GENT.x + 1.5, y: GENT.y - 107 };
  const C1 = { x: S0.x + 40, y: S0.y - 150 };
  const C2 = { x: E.x + 60, y: E.y - 120 };
  // ease: quick lift, slow hang, drop
  const v = u < 0.5 ? 0.62 * Math.sin((u / 0.5) * (Math.PI / 2)) : 0.62 + 0.38 * Math.pow((u - 0.5) / 0.5, 1.6);
  const iu = 1 - v;
  const x = iu * iu * iu * S0.x + 3 * iu * iu * v * C1.x + 3 * iu * v * v * C2.x + v * v * v * E.x;
  const y = iu * iu * iu * S0.y + 3 * iu * iu * v * C1.y + 3 * iu * v * v * C2.y + v * v * v * E.y;
  const spin = -0.12 + v * (TAU * 2 - 15.9 * DEG + 0.12) + Math.sin(u * 9) * 0.3 * (1 - u);
  return { mode: 'fly', x, y, ang: spin };
}

// -----------------------------------------------------------------------------
// wind streaks (white-line gusts cut through the ruled sky)
// -----------------------------------------------------------------------------
function drawGustStreaks(ctx, T) {
  const gl = gustLevel(T);
  if (gl < 0.05) return;
  ctx.save();
  // the open sky only (not over the house, the vignette or the wheel's hub)
  ctx.beginPath();
  ctx.rect(0, PIC.y0, S, 640 - PIC.y0);
  ctx.clip();
  // punch out each solid object (successive clips intersect)
  const hole = (fn) => {
    ctx.beginPath();
    ctx.rect(0, 0, S, S);
    fn();
    ctx.clip('evenodd');
  };
  hole(() => ctx.ellipse(OV.cx, OV.cy, OV.rx + 12, OV.ry + 22, 0, 0, TAU));
  hole(() => ctx.rect(0, 296, 478, 380));
  hole(() => ctx.rect(322, 280, 92, 30));
  hole(() => ctx.ellipse(HUB.x, HUB.y, WHEEL.R * V.s * sA + 6, WHEEL.R * V.s + 6, 0, 0, TAU));
  hole(() => ctx.rect(626, 480, 150, 200));
  ctx.lineCap = 'round';
  for (let k = 0; k < 12; k++) {
    const y0 = 190 + h1(k * 3.7) * 420;
    const speed = 420 + h1(k * 5.1) * 300;
    const len = 200 + h1(k * 2.3) * 160;
    const span = S + len + 260;
    const x = pmod(T * speed + h1(k * 9.1) * span, span) - len - 130;
    const a = Math.min(1, gl * 1.3) * (0.6 + 0.4 * h1(k + 0.5));
    for (let j = 0; j < 3; j++) {
      const off = (j - 1) * 3.4;
      const lj = len * (1 - Math.abs(j - 1) * 0.28);
      const xj = x + (len - lj) * 0.5;
      const path = (dy) => {
        ctx.beginPath();
        for (let q = 0; q <= 14; q++) {
          const u = q / 14;
          const px = xj + u * lj;
          const py = y0 + off + dy + Math.sin(px * 0.022 + k + T * 3) * 9 - u * 14;
          if (q === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      };
      // a cut groove: dark burr under a clean white line
      ctx.strokeStyle = ink(a * 0.85);
      ctx.lineWidth = j === 1 ? 1.3 : 0.9;
      path(1.6);
      ctx.stroke();
      ctx.strokeStyle = paper(Math.min(1, a * 1.1));
      ctx.lineWidth = j === 1 ? 2.2 : 1.3;
      path(0);
      ctx.stroke();
    }
  }
  ctx.restore();
  // leaves tumbling across the drive on the gust
  ctx.save();
  ctx.fillStyle = INK;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 1;
  for (let k = 0; k < 8; k++) {
    const sp = 280 + h1(k * 1.9) * 220;
    const span = S + 200;
    const x = pmod(T * sp + h1(k * 4.4) * span, span) - 100;
    const y = 440 + h1(k * 8.8) * 240 + Math.sin(T * 5 + k) * 18;
    ctx.globalAlpha = Math.min(1, gl * 1.6);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(T * 7 + k);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.8, 1.8, 0, 0, TAU);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// -----------------------------------------------------------------------------
// the rider, cut as an engraving
// -----------------------------------------------------------------------------
function cubicPts(p0, p1, p2, p3, n) {
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
function strokePts(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function drawMiniWheel(ctx, hub, ang) {
  const { x, y, r } = hub;
  ctx.save();
  // paper disc behind (knock-out), then a 32-blade Brush-type fan
  ctx.fillStyle = paper(0.9);
  ctx.beginPath();
  ctx.arc(x, y, r + 2.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  const n = 32;
  for (let i = 0; i < n; i++) {
    const a = ang + (i / n) * TAU;
    const a1 = a + 4 * DEG;
    const w0 = 0.05;
    const w1 = 0.065;
    const r0 = r * 0.32;
    ctx.moveTo(x + Math.cos(a - w0) * r0, y + Math.sin(a - w0) * r0);
    ctx.lineTo(x + Math.cos(a1 - w1) * r, y + Math.sin(a1 - w1) * r);
    ctx.lineTo(x + Math.cos(a1 + w1) * r, y + Math.sin(a1 + w1) * r);
    ctx.lineTo(x + Math.cos(a + w0) * r0, y + Math.sin(a + w0) * r0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.32, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.66, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = paper(0.9);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < n; i += 2) {
    const a = ang + (i / n) * TAU + 1.5 * DEG;
    if (Math.cos(a + 0.9) < -0.2) continue;
    ctx.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4);
    ctx.lineTo(x + Math.cos(a + 3.5 * DEG) * r * 0.95, y + Math.sin(a + 3.5 * DEG) * r * 0.95);
  }
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(x - 1, y - 1, 1.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawEngravedRider(ctx, rig) {
  const s = rig.root.scale;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // cast shadow on the gravel (ruled)
  ctx.strokeStyle = ink(0.75);
  ctx.lineWidth = 1;
  for (let k = 0; k < 5; k++) {
    const y = rig.root.y + 1.5 + k * 2;
    const half = 120 - k * 18;
    ctx.beginPath();
    ctx.moveTo(rig.root.x - half + 14, y);
    ctx.lineTo(rig.root.x + half + 14, y);
    ctx.stroke();
  }
  // pole + mini wheel
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 5.5;
  line(ctx, rig.poleBase, rig.poleTop);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  line(ctx, rig.poleBase, rig.poleTop);
  drawMiniWheel(ctx, rig.pinHub, rig.pinwheelAngle * 0.7);

  // far leg + far crank
  const crank = (pedal) => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    line(ctx, rig.bb, pedal);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(pedal.x - 7 * s, pedal.y + 1.5 * s);
    ctx.lineTo(pedal.x + 7 * s, pedal.y + 1.5 * s);
    ctx.stroke();
  };
  const leg = (hip, knee, foot, far) => {
    ctx.strokeStyle = far ? '#4a443a' : INK;
    ctx.lineWidth = 3.4 * s;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(foot.x, foot.y);
    ctx.lineTo(foot.x + 13 * s, foot.y + 2.5 * s);
    ctx.moveTo(foot.x, foot.y);
    ctx.lineTo(foot.x + 10 * s, foot.y + 5 * s);
    ctx.moveTo(foot.x, foot.y);
    ctx.lineTo(foot.x - 6 * s, foot.y + 2 * s);
    ctx.stroke();
  };
  crank(rig.farPedal);
  leg(rig.farHip, rig.farKnee, rig.farFoot, true);

  // wheels: pneumatic tyre (black, white-line sheen), rim, tangent-ish spokes
  for (const w of [rig.rearWheel, rig.frontWheel]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = rig.wheelAngle + (i * TAU) / n;
      const hubOff = (i % 2 ? 1 : -1) * 0.35;
      ctx.moveTo(w.x + Math.cos(a + hubOff) * 4, w.y + Math.sin(a + hubOff) * 4);
      ctx.lineTo(w.x + Math.cos(a) * (w.r - 4), w.y + Math.sin(a) * (w.r - 4));
    }
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r - 4, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r - 0.5, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = paper(0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r - 1, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 4, 0, TAU);
    ctx.fill();
  }
  // chain & chainring
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(rig.bb.x, rig.bb.y, 11 * s, 0, TAU);
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y - 4.5 * s);
  ctx.lineTo(rig.bb.x, rig.bb.y - 11 * s);
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y + 4.5 * s);
  ctx.lineTo(rig.bb.x, rig.bb.y + 11 * s);
  ctx.stroke();
  // frame: black tubes with a white-line highlight (a "safety" of 1888)
  const tube = (pts, w) => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = w;
    strokePts(ctx, pts);
    ctx.strokeStyle = paper(0.85);
    ctx.lineWidth = 0.8;
    strokePts(ctx, pts.map((p) => ({ x: p.x - 0.6, y: p.y - 1 })));
  };
  tube([rig.rearWheel, rig.seatCluster, rig.bb, rig.rearWheel], 3.4);
  tube([rig.seatCluster, rig.headTop], 3.6);
  tube([rig.headBot, rig.bb], 3.6);
  tube([rig.headTop, rig.headBot, rig.frontWheel], 3.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  line(ctx, rig.seatCluster, rig.saddle);
  ctx.beginPath();
  ctx.moveTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.stemTop.x, rig.stemTop.y);
  ctx.quadraticCurveTo(rig.stemTop.x - 5 * s, rig.stemTop.y - 5 * s, rig.grip.x, rig.grip.y);
  ctx.stroke();
  // sprung leather saddle
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(rig.saddle.x - 13 * s, rig.saddle.y - 2);
  ctx.quadraticCurveTo(rig.saddle.x, rig.saddle.y - 6, rig.saddle.x + 12 * s, rig.saddle.y);
  ctx.lineTo(rig.saddle.x - 10 * s, rig.saddle.y + 3);
  ctx.closePath();
  ctx.fill();

  // --- the bird ---
  const b = rig.body;
  const sh = rig.wingShoulder;
  // paper halo behind neck/head/bill (white-line separation from dark grounds)
  const neckPts = cubicPts(rig.neckBase, rig.neckC1, rig.neckC2, rig.head, 14);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 19;
  strokePts(ctx, neckPts);
  ctx.lineWidth = 7;
  line(ctx, rig.billBase, rig.billTip);
  ctx.beginPath();
  ctx.arc(rig.head.x, rig.head.y, rig.head.r + 3.5, 0, TAU);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.rx + 3, b.ry + 3, b.tilt, 0, TAU);
  ctx.fill();

  // tail
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(b.x - b.rx * 0.6, b.y - b.ry * 0.35);
  ctx.lineTo(rig.tailTip.x, rig.tailTip.y);
  ctx.lineTo(b.x - b.rx * 0.55, b.y + b.ry * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // body with tonal hatching underneath (lines get heavier toward the belly)
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.tilt);
  ctx.strokeStyle = INK;
  for (let k = 0; k < 9; k++) {
    const yy = b.ry * 0.05 + k * 2.6;
    ctx.lineWidth = 0.35 + k * 0.13;
    ctx.beginPath();
    ctx.moveTo(-b.rx, yy);
    ctx.quadraticCurveTo(0, yy + 3, b.rx, yy - 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  ctx.stroke();
  // folded wing, feather lines
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y);
  ctx.bezierCurveTo(sh.x - 24 * s, sh.y - 8 * s, sh.x - 58 * s, sh.y + 2 * s, rig.tailTip.x - 4 * s, rig.tailTip.y + 3 * s);
  ctx.bezierCurveTo(sh.x - 46 * s, sh.y + 20 * s, sh.x - 16 * s, sh.y + 20 * s, sh.x + 2 * s, sh.y + 10 * s);
  ctx.closePath();
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const fx = sh.x - (14 + k * 7.5) * s;
    ctx.moveTo(fx, sh.y + (5 + k * 1.2) * s);
    ctx.quadraticCurveTo(fx - 6 * s, sh.y + (11 + k) * s, fx - 13 * s, sh.y + (12 + k * 1.1) * s);
  }
  ctx.stroke();
  // neck: outlined S-curve, hatched on the shaded (rear) side
  ctx.strokeStyle = INK;
  ctx.lineWidth = 14.5;
  strokePts(ctx, neckPts);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 11.5;
  strokePts(ctx, neckPts);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.6;
  for (let k = 2; k < neckPts.length - 2; k++) {
    const p = neckPts[k];
    const q = neckPts[k + 1];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    ctx.beginPath();
    ctx.moveTo(p.x - nx * 5.5, p.y - ny * 5.5);
    ctx.lineTo(p.x - nx * 2.5, p.y - ny * 2.5);
    ctx.stroke();
  }
  // ochre breast patch is rendered as a stipple in this monochrome medium
  ctx.fillStyle = ink(0.7);
  for (let k = 0; k < 14; k++) {
    const a = k * 2.4;
    const rr = 2 + (k % 5) * 1.3;
    ctx.fillRect(rig.chest.x - 3 + Math.cos(a) * rr * 1.3, rig.chest.y + 1 + Math.sin(a) * rr, 0.9, 0.9);
  }
  // crest plumes (fine engraved lines)
  const cr = rig.crestRoot;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const tip = lerpP(rig.crestTip1, rig.crestTip2, k / 4);
    ctx.moveTo(cr.x, cr.y + k * 0.5);
    ctx.quadraticCurveTo((cr.x + tip.x) / 2, cr.y - 6 + k * 1.2, tip.x, tip.y);
  }
  ctx.stroke();
  // head
  const h = rig.head;
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(h.x, h.y, h.r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // black face mask
  {
    const ca = Math.cos(h.angle);
    const sa = Math.sin(h.angle);
    const R = (px, py) => ({ x: h.x + px * ca - py * sa, y: h.y + px * sa + py * ca });
    const m0 = R(-1, -h.r * 0.95);
    const m1 = R(h.r * 0.95, -h.r * 0.5);
    const m2 = R(h.r * 1.05, h.r * 0.55);
    const m3 = R(h.r * 0.1, h.r * 0.9);
    const m4 = R(-h.r * 0.15, 0);
    const q1 = R(h.r * 0.8, -h.r * 1.0);
    const q2 = R(h.r * 0.6, h.r * 1.0);
    ctx.beginPath();
    ctx.moveTo(m0.x, m0.y);
    ctx.quadraticCurveTo(q1.x, q1.y, m1.x, m1.y);
    ctx.lineTo(m2.x, m2.y);
    ctx.quadraticCurveTo(q2.x, q2.y, m3.x, m3.y);
    ctx.quadraticCurveTo(m4.x - 2 * s, m4.y + 4 * s, m4.x, m4.y);
    ctx.quadraticCurveTo(m4.x - 1 * s, m4.y - 6 * s, m0.x, m0.y);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
  }
  // spoon bill: solid black, white-line ridge
  {
    const bb0 = rig.billBase;
    const bt = rig.billTip;
    const L = Math.hypot(bt.x - bb0.x, bt.y - bb0.y);
    const ux = (bt.x - bb0.x) / L;
    const uy = (bt.y - bb0.y) / L;
    const nx = -uy;
    const ny = ux;
    const spoonC = { x: bt.x - ux * 8 * s, y: bt.y - uy * 8 * s };
    ctx.beginPath();
    ctx.moveTo(bb0.x + nx * -4.6 * s, bb0.y + ny * -4.6 * s);
    ctx.lineTo(spoonC.x - ux * 6 * s + nx * -2.2 * s, spoonC.y - uy * 6 * s + ny * -2.2 * s);
    ctx.quadraticCurveTo(bt.x + nx * -6.5 * s, bt.y + ny * -6.5 * s, bt.x + ux * 1.5 * s, bt.y + uy * 1.5 * s);
    ctx.quadraticCurveTo(bt.x + nx * 7.5 * s - ux * s, bt.y + ny * 7.5 * s - uy * s, spoonC.x - ux * 6 * s + nx * 2.4 * s, spoonC.y - uy * 6 * s + ny * 2.4 * s);
    ctx.lineTo(bb0.x + nx * 4.4 * s, bb0.y + ny * 4.4 * s);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.strokeStyle = paper(0.9);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(bb0.x + ux * 7 * s - nx * 1.6, bb0.y + uy * 7 * s - ny * 1.6);
    ctx.lineTo(spoonC.x - ux * 5 * s - nx * 0.8, spoonC.y - uy * 5 * s - ny * 0.8);
    ctx.stroke();
    // spoon highlight
    ctx.beginPath();
    ctx.arc(spoonC.x + ux * 2, spoonC.y + uy * 2, 3, Math.atan2(uy, ux) - 2.2, Math.atan2(uy, ux) - 0.6);
    ctx.stroke();
  }
  // eye: paper ring so it reads on the mask
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(rig.eye.x, rig.eye.y, 2.8 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(rig.eye.x + 0.4, rig.eye.y, 1.5 * s, 0, TAU);
  ctx.fill();

  // near leg & crank
  crank(rig.nearPedal);
  leg(rig.nearHip, rig.nearKnee, rig.nearFoot, false);
  // near wing reaching for the bar
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
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 0.55;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(sh.x - 20 * s, sh.y + (5 + k * 2.2) * s);
      ctx.quadraticCurveTo(el.x - 6 * s, el.y + (2 + k * 2) * s, hd.x - 4 * s, hd.y + (1 + k * 1.6) * s);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

// -----------------------------------------------------------------------------
// tower-base window: the dynamo room glows with the charge
// -----------------------------------------------------------------------------
// an ornamental arc-lamp standard by the drive (the house had two arc lights)
const ARC = { x: 812, base: 688, top: 536, hx: 790, hy: 560 };
function paintArcLampStandard(g) {
  g.save();
  g.lineCap = 'round';
  g.fillStyle = INK;
  g.strokeStyle = INK;
  // fluted cast-iron post
  g.beginPath();
  g.moveTo(ARC.x - 6, ARC.base);
  g.lineTo(ARC.x - 3, ARC.base - 34);
  g.lineTo(ARC.x - 2, ARC.top);
  g.lineTo(ARC.x + 2, ARC.top);
  g.lineTo(ARC.x + 3, ARC.base - 34);
  g.lineTo(ARC.x + 6, ARC.base);
  g.closePath();
  g.fill();
  g.fillRect(ARC.x - 7, ARC.base - 36, 14, 4);
  g.strokeStyle = paper(0.85);
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(ARC.x - 1.2, ARC.top + 4);
  g.lineTo(ARC.x - 2.6, ARC.base - 38);
  g.stroke();
  // shepherd's-crook bracket
  g.strokeStyle = INK;
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(ARC.x, ARC.top);
  g.bezierCurveTo(ARC.x, ARC.top - 16, ARC.hx - 2, ARC.top - 18, ARC.hx, ARC.top - 4);
  g.lineTo(ARC.hx, ARC.hy - 16);
  g.stroke();
  g.lineWidth = 1;
  g.beginPath();
  g.arc(ARC.x - 6, ARC.top - 4, 4, 0, TAU);
  g.stroke();
  // carbon-holder case
  g.fillRect(ARC.hx - 3.5, ARC.hy - 17, 7, 9);
  g.restore();
}

function drawArcLamp(ctx, T, bri) {
  ctx.save();
  // globe
  const fl = bri > 0.15 ? 0.9 + 0.1 * Math.sin(T * 47) * Math.sin(T * 13) : 1;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(ARC.hx, ARC.hy, 7, 8.5, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = clamp01(bri * 1.6) * fl;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.ellipse(ARC.hx, ARC.hy, 5.6, 7.1, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paper(0.95);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  const n = 20;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    const L = 16 + bri * 26 * (k % 2 ? 0.6 : 1) * fl;
    ctx.moveTo(ARC.hx + Math.cos(a) * 11, ARC.hy + Math.sin(a) * 12);
    ctx.lineTo(ARC.hx + Math.cos(a) * L, ARC.hy + Math.sin(a) * L);
  }
  ctx.stroke();
  // on the pale sky the light is drawn the engraver's way: fine ink rays
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) / n) * TAU;
    const L = 14 + bri * 18 * (k % 2 ? 1 : 0.6) * fl;
    ctx.moveTo(ARC.hx + Math.cos(a) * 12, ARC.hy + Math.sin(a) * 13);
    ctx.lineTo(ARC.hx + Math.cos(a) * L, ARC.hy + Math.sin(a) * L);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(ARC.hx, ARC.hy, 7, 8.5, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawDynamoGlow(ctx, bri) {
  const Y = 6;
  const h = tw(Y);
  const q = [pr(-h, Y, -2.2), pr(-h, Y, 1.2), pr(-h, Y + 4.4, 1.2), pr(-h, Y + 4.4, -2.2)];
  ctx.save();
  ctx.fillStyle = INK;
  poly(ctx, q);
  ctx.fill();
  ctx.globalAlpha = clamp01(bri * 1.1);
  ctx.fillStyle = PAPER;
  poly(ctx, q);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  poly(ctx, q);
  ctx.stroke();
  // the dynamo's belt seen through the window, running
  const c = lerpP(q[0], q[2], 0.5);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(c.x, c.y + 3, 3.2, 0, TAU);
  ctx.moveTo(c.x - 2, c.y + 1);
  ctx.lineTo(c.x - 3, q[2].y);
  ctx.moveTo(c.x + 2, c.y + 1);
  ctx.lineTo(c.x + 1, q[2].y);
  ctx.stroke();
  ctx.restore();
}

// -----------------------------------------------------------------------------
// gardener with a push mower at the foot of the tower (for scale, as in the photographs)
// -----------------------------------------------------------------------------
function drawGardener(ctx, T) {
  const x = 724 + Math.sin(T * 0.35) * 22;
  const y = 674;
  const dir = Math.cos(T * 0.35) >= 0 ? -1 : 1;
  const step = Math.sin(T * 6) * 2;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  // body
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x - 2 + step * 0.5, y);
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x + 2 - step * 0.5, y);
  ctx.stroke();
  ctx.fillRect(x - 3, y - 25, 6, 12);
  ctx.beginPath();
  ctx.arc(x, y - 28, 2.6, 0, TAU);
  ctx.fill();
  ctx.fillRect(x - 4, y - 31.5, 8, 1.5);
  // handle & mower
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 2 * -dir, y - 20);
  ctx.lineTo(x - 13 * dir, y - 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - 15 * dir, y - 2.5, 3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = paper(0.8);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(x - 15 * dir, y - 2.5, 1.8, T * 9, T * 9 + 4);
  ctx.stroke();
  ctx.restore();
}

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 2.6 : params.rawLocalT;
  ctx.save();
  const bg = kit.bake('brush_bg_v1', S, S, (g, rng) => paintBackground(kit, g, rng));
  ctx.drawImage(bg, 0, 0);

  // lamps follow the wind (and the rider's pinwheel)
  const bri = thumb ? 0.8 : lampLevel(T, params.t);
  const lit = kit.bake('brush_lit_v1', 500, 420, (g) => {
    g.translate(0, -280);
    paintLitWindows(g, false);
  });
  const flare = kit.bake('brush_flare_v1', 500, 420, (g) => {
    g.translate(0, -280);
    paintLitWindows(g, true);
  });
  ctx.globalAlpha = clamp01(bri * 1.45);
  ctx.drawImage(lit, 0, 280);
  const fl = clamp01((bri - 0.6) / 0.3);
  if (fl > 0) {
    ctx.globalAlpha = fl;
    ctx.drawImage(flare, 0, 280);
  }
  ctx.globalAlpha = 1;

  drawBlythDynamic(ctx, T, bri);
  drawGardener(ctx, T);
  drawDynamoGlow(ctx, bri);
  drawArcLamp(ctx, T, bri);

  // the wheel: ~10 rev/min at full load, faster in the gusts
  const rot = thumb ? 0.3 : 0.3 + 1.05 * windInt(T);
  drawWheel(ctx, rot);
  drawInsetsDynamic(ctx, T, bri, thumb ? 1.2 : wind(T), rot);

  if (!thumb) drawGustStreaks(ctx, T);

  const hs = hatState(T, params.riderLocalX, thumb);
  drawGentleman(ctx, T, hs.mode === 'head');

  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params);
    drawEngravedRider(ctx, rig);
  }
  if (hs.mode === 'fly' || hs.mode === 'pole') {
    drawHat(ctx, hs.x, hs.y, hs.ang, 1);
    if (hs.mode === 'pole') {
      // the pole pokes through the crown
      const dx = Math.sin(-hs.ang);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(hs.x - dx * 14, hs.y - Math.cos(hs.ang) * 14);
      ctx.lineTo(hs.x - dx * 24, hs.y - Math.cos(hs.ang) * 24);
      ctx.stroke();
    }
  }
  ctx.restore();
}
