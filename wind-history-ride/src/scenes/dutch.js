// src/scenes/dutch.js
// 《乘風騎行》 #04 荷蘭風車造地 · 1594–1612 — Dutch Windmills Make Land.
//
// Medium: a Delftware tile tableau (tegeltableau). 8 × 8 square tin-glazed tiles,
// one picture painted across them in cobalt on white: dark "trek" outlines drawn with
// a fine brush, then "dieken" washes of several blue values that pool at their edges.
// Each tile was painted and fired on its own, so the picture is very slightly out of
// register from tile to tile and every tile has its own glaze tone; grout joints,
// pillowed tile edges, a reflection on each glossy tile, crazing (crackle), pin-holes,
// two chipped corners showing the buff earthenware body, and the classic "ossekop"
// corner motifs where four tiles meet (only where the picture leaves white glaze).
//
// Machines (the wind from the viewer's left, every rotor facing it):
//   * an octagonal thatched smock mill (achtkante grondzeiler) draining the polder:
//     rotating thatched cap, tail pole with struts and the winding wheel (kruirad),
//     four "old-Dutch" lattice sails (stock near the leading edge, cloth on the
//     trailing lattice), turning counter-clockwise as Dutch mills do; it drives a
//     scoop wheel (scheprad) that lifts water from the low polder ditch into the
//     higher outlet basin, which runs under the dike road into the ring canal.
//   * a paltrok sawmill — the whole wooden mill house with its two side wings turns on
//     rollers on a low brick ring; a log runs in across the mill through the wing.
//   * an engraved roundel (copied by the tile painter from a print, as Delft painters
//     did) shows Cornelis Corneliszoon's crank: the sails' rotation turned into the
//     up-and-down stroke of a frame saw (first wind sawmill 1594).
//   Polder fields, ditches, pollard willows, a stolp farm, cows, distant mills along
//   the far ring dike, and a spritsail "kaag" with leeboards on the ring canal.
//
// Story (4 bars): a sawyer counts the planks — "EEN · TWEE · DRIE · VIER", one per bar.
// Bar 3: the old wind-head in the clouds puffs, both mills race, the scoop wheel throws
// a splash that arcs over the dike road and the spoonbill rides straight through it,
// leaving a trail of drips; the cows look up as the soaked rider comes past.

const P = 1000;
const TILE = 125;
const TAU = Math.PI * 2;

const GLAZE = '#f4f1ea';
const C = {
  dark: '#0b1850',
  ink: '#142d84',
  mid: '#264ea5',
  wash: '#4a6ebc',
  light: '#7590ca',
  pale: '#b0c1e5',
};

const HORIZON = 552;
const ROAD = 700;

// big drainage smock mill
const MILL = { cx: 620, base: 668, plinthTop: 642, top: 420, rB: 84, rT: 48, plinthR: 90 };
const HUB = { x: 594, y: 400 };
const SAIL_R = 226;
const KX = 0.8; // 3/4 view: sail disc foreshortening
// scoop wheel in front of the tower
const WHEEL = { x: 548, y: 616, R: 58 };
const DITCH_Y = 670; // polder water level (low)
const BASIN_Y = 645; // outlet water level (high)
// paltrok sawmill
const PF = { x: 192, y: 612 };
const PAL_HUB = { x: 187.6, y: 471 };
const PAL_R = 138;
// wind head, roundel, boat
const MED2 = { x: 186, y: 150, r: 76 };
const MED = { x: 810, y: 148, r: 76 };
const BOAT = { x: 842, y: 905 };

// -----------------------------------------------------------------------------
// small math
// -----------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const sstep5 = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const fract = (x) => x - Math.floor(x);
const mod = (a, n) => a - Math.floor(a / n) * n;
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function vnoise(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
}
function cubic(p0, p1, p2, p3, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = 1 - u;
    out.push({
      x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
      y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
    });
  }
  return out;
}
function quad(p0, p1, p2, n = 12) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = 1 - u;
    out.push({ x: v * v * p0.x + 2 * v * u * p1.x + u * u * p2.x, y: v * v * p0.y + 2 * v * u * p1.y + u * u * p2.y });
  }
  return out;
}
/** points along a-b with a smooth hand wobble */
function seg(a, b, n, amp, seed) {
  const out = [];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const w = (vnoise(seed + u * 3.1) - 0.5) * 2 * amp * Math.sin(Math.PI * u);
    out.push({ x: a.x + dx * u + nx * w, y: a.y + dy * u + ny * w });
  }
  return out;
}
function polyPath(pts, close = true) {
  const p = new Path2D();
  pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
  if (close) p.closePath();
  return p;
}

// -----------------------------------------------------------------------------
// brush vocabulary (bake time)
// -----------------------------------------------------------------------------
/** "trek" line: a filled brush stroke whose width swells and tapers. */
function trek(g, pts, w, color, rng, alpha = 1, taper = 0.45) {
  const n = pts.length;
  if (n < 2) return;
  const seed = rng() * 1000;
  const L = [];
  const R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const u = i / (n - 1);
    const prof = 0.28 + 0.72 * Math.pow(Math.sin(Math.PI * u), taper);
    const ww = 0.5 * w * prof * (0.75 + 0.5 * vnoise(seed + i * 0.37));
    L.push({ x: pts[i].x - dy * ww, y: pts[i].y + dx * ww });
    R.push({ x: pts[i].x + dy * ww, y: pts[i].y - dx * ww });
  }
  g.beginPath();
  g.moveTo(L[0].x, L[0].y);
  for (let i = 1; i < n; i++) g.lineTo(L[i].x, L[i].y);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i].x, R[i].y);
  g.closePath();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.fill();
  g.globalAlpha = 1;
}
function trekSeg(g, a, b, w, color, rng, alpha = 1, amp = 0.6) {
  const n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 7));
  trek(g, seg(a, b, n, amp, rng() * 100), w, color, rng, alpha);
}

/** cobalt wash: multiply fill, pooled edge, mottled pigment. */
function wash(g, path, color, alpha, mottle, edge = 1.6) {
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.fill(path);
  if (edge > 0) {
    g.globalAlpha = alpha * 0.5;
    g.strokeStyle = color;
    g.lineWidth = edge;
    g.lineJoin = 'round';
    g.stroke(path);
  }
  if (mottle) {
    g.clip(path);
    g.globalAlpha = clamp(alpha * 1.3, 0, 1);
    g.fillStyle = mottle;
    g.fill(path);
  }
  g.restore();
}
function washPts(g, pts, color, alpha, mottle, rng, jit = 0.8, edge = 1.6) {
  const q = pts.map((p) => ({ x: p.x + (rng() - 0.5) * 2 * jit, y: p.y + (rng() - 0.5) * 2 * jit }));
  wash(g, polyPath(q), color, alpha, mottle, edge);
}
/** parallel brush hatching clipped to a path */
function hatch(g, path, x0, y0, x1, y1, angle, gap, w, color, rng, alpha = 1) {
  g.save();
  g.clip(path);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  for (let d = -R; d <= R; d += gap * (0.8 + rng() * 0.4)) {
    const a = { x: cx + ca * -R - sa * d, y: cy + sa * -R + ca * d };
    const b = { x: cx + ca * R - sa * d, y: cy + sa * R + ca * d };
    trekSeg(g, a, b, w, color, rng, alpha, 0.8);
  }
  g.restore();
}

function makeMottle(kit, key, color) {
  return kit.bake(key, 220, 220, (g, rng, w, h) => {
    for (let i = 0; i < 520; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = 2 + rng() * 11;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, kit.rgba(color, 0.05 + rng() * 0.08));
      gr.addColorStop(1, kit.rgba(color, 0));
      g.fillStyle = gr;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) g.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
    }
    // a few drag marks of the wash brush
    g.strokeStyle = kit.rgba(color, 0.06);
    g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const x = rng() * w;
      const y = rng() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 20, y + (rng() - 0.5) * 8, x + 30 + rng() * 30, y + (rng() - 0.5) * 6);
      g.stroke();
    }
  });
}

// -----------------------------------------------------------------------------
// motifs
// -----------------------------------------------------------------------------
function cloud(g, rng, mottle, x, y, w, h) {
  // billowing cumulus: lobes along an arched crown, outlined only where they show,
  // washed from the belly upward; streaks of wind trail beneath
  const lobes = [];
  const n = Math.max(4, Math.round(w / (h * 0.62)));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const arch = Math.sin(Math.PI * u);
    const r = h * (0.26 + 0.3 * arch) * (0.85 + rng() * 0.3);
    lobes.push({ x: x + u * w + (rng() - 0.5) * 6, y: y + h - r * 0.75 - arch * h * 0.22, r });
  }
  for (let i = 0; i < n - 2; i++) {
    const u = (i + 1) / (n - 1);
    const arch = Math.sin(Math.PI * u);
    const r = h * (0.22 + 0.26 * arch) * (0.8 + rng() * 0.35);
    lobes.push({ x: x + u * w + (rng() - 0.5) * 10, y: y + h * 0.95 - arch * h * 0.62 - r * 0.6, r });
  }
  const body = new Path2D();
  for (const l of lobes) {
    body.moveTo(l.x + l.r, l.y);
    body.arc(l.x, l.y, l.r, 0, TAU);
  }
  body.rect(x + w * 0.06, y + h * 0.55, w * 0.88, h * 0.42);
  g.save();
  g.fillStyle = GLAZE;
  g.fill(body);
  g.clip(body);
  g.globalCompositeOperation = 'multiply';
  const gr = g.createLinearGradient(0, y + h, 0, y);
  gr.addColorStop(0, kit_rgba(C.light, 0.62));
  gr.addColorStop(0.45, kit_rgba(C.pale, 0.35));
  gr.addColorStop(1, kit_rgba(C.pale, 0));
  g.fillStyle = gr;
  g.fillRect(x - 40, y - h, w + 80, h * 2.2);
  g.globalAlpha = 0.6;
  g.fillStyle = mottle;
  g.fillRect(x - 40, y - h, w + 80, h * 2.2);
  g.restore();
  // crown outline: arcs only where a lobe is not covered by another
  for (let li = 0; li < lobes.length; li++) {
    const l = lobes[li];
    let run = [];
    const flush = () => {
      if (run.length > 2) trek(g, run, 1.9, C.mid, rng, 0.9, 0.6);
      run = [];
    };
    for (let k = 0; k <= 28; k++) {
      const a = Math.PI * 0.92 + (k / 28) * Math.PI * 1.16;
      const px = l.x + Math.cos(a) * l.r;
      const py = l.y + Math.sin(a) * l.r;
      let inside = py > y + h * 0.6;
      for (let lj = 0; lj < lobes.length && !inside; lj++) {
        if (lj === li) continue;
        const o = lobes[lj];
        if (Math.hypot(px - o.x, py - o.y) < o.r - 1.2) inside = true;
      }
      if (inside) flush();
      else run.push({ x: px, y: py });
    }
    flush();
  }
  // inner curls (a few lobes echoed inside)
  for (let i = 0; i < 3; i++) {
    const l = lobes[Math.floor(rng() * lobes.length)];
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI * 1.1 + (k / 8) * Math.PI * 0.8;
      pts.push({ x: l.x + Math.cos(a) * l.r * 0.6, y: l.y + l.r * 0.35 + Math.sin(a) * l.r * 0.5 });
    }
    trek(g, pts, 1.2, C.light, rng, 0.7);
  }
  // belly line and trailing streaks
  trek(g, seg({ x: x + w * 0.04, y: y + h * 0.97 }, { x: x + w * 0.96, y: y + h * 0.95 }, 14, 1.4, rng() * 9), 1.5, C.light, rng, 0.9);
  trek(g, seg({ x: x - 10, y: y + h * 1.12 }, { x: x + w * 0.65, y: y + h * 1.14 }, 12, 1.5, rng() * 9), 1.3, C.light, rng, 0.75);
  trek(g, seg({ x: x + w * 0.3, y: y + h * 1.26 }, { x: x + w + 14, y: y + h * 1.22 }, 12, 1.5, rng() * 9), 1.1, C.light, rng, 0.6);
}
function kit_rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function willow(g, rng, mottle, x, y, s) {
  // pollard willow: stubby trunk, knob, a fan of whippy shoots dabbed with foliage
  trek(g, seg({ x, y }, { x: x + 1, y: y - 16 * s }, 4, 0.8, rng() * 9), 5 * s, C.ink, rng);
  const crown = new Path2D();
  crown.ellipse(x, y - 24 * s, 15 * s, 11 * s, 0, 0, TAU);
  wash(g, crown, C.light, 0.55, mottle, 1);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.33;
    const L = (11 + rng() * 7) * s;
    trek(g, quad({ x, y: y - 17 * s }, { x: x + Math.cos(a) * L * 0.4, y: y - 17 * s + Math.sin(a) * L * 0.8 }, { x: x + Math.cos(a) * L, y: y - 17 * s + Math.sin(a) * L }, 5), 1.3 * s, C.ink, rng, 0.85);
  }
  for (let i = 0; i < 14; i++) {
    const a = rng() * TAU;
    const r = rng() * 12 * s;
    g.fillStyle = C.mid;
    g.globalAlpha = 0.5;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r, y - 24 * s + Math.sin(a) * r * 0.7, 2.2 * s, 1.4 * s, a, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

function tree(g, rng, mottle, x, y, s) {
  trek(g, seg({ x, y }, { x: x - 1, y: y - 22 * s }, 4, 1, rng() * 9), 3.5 * s, C.ink, rng);
  // loopy Delft foliage
  const blobs = 7;
  const cr = new Path2D();
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * TAU;
    cr.moveTo(x + Math.cos(a) * 12 * s + 9 * s, y - 34 * s + Math.sin(a) * 10 * s);
    cr.arc(x + Math.cos(a) * 12 * s, y - 34 * s + Math.sin(a) * 10 * s, 9 * s, 0, TAU);
  }
  wash(g, cr, C.light, 0.45, mottle, 0);
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * TAU;
    const bx = x + Math.cos(a) * 12 * s;
    const by = y - 34 * s + Math.sin(a) * 10 * s;
    const pts = [];
    for (let k = 0; k <= 7; k++) {
      const aa = a - 1.2 + (k / 7) * 2.4;
      pts.push({ x: bx + Math.cos(aa) * 9 * s, y: by + Math.sin(aa) * 9 * s });
    }
    trek(g, pts, 1.6 * s, C.mid, rng, 0.9);
  }
}

function tinyMillBody(g, rng, x, y, s) {
  // distant drainage mill (body only; its sails turn per frame)
  const p = polyPath([
    { x: x - 6 * s, y },
    { x: x - 3.5 * s, y: y - 20 * s },
    { x: x + 3.5 * s, y: y - 20 * s },
    { x: x + 6 * s, y },
  ]);
  wash(g, p, C.mid, 0.75, null, 0);
  const cap = new Path2D();
  cap.ellipse(x, y - 21 * s, 5 * s, 3 * s, 0, Math.PI, TAU);
  wash(g, cap, C.ink, 0.9, null, 0);
}

function cowBody(g, rng, mottle, x, y, s, dir = 1) {
  // body + legs (head drawn per frame)
  const b = new Path2D();
  b.moveTo(x - 20 * s * dir, y - 18 * s);
  b.bezierCurveTo(x - 6 * s * dir, y - 22 * s, x + 10 * s * dir, y - 21 * s, x + 19 * s * dir, y - 17 * s);
  b.quadraticCurveTo(x + 22 * s * dir, y - 9 * s, x + 18 * s * dir, y - 5 * s);
  b.lineTo(x - 19 * s * dir, y - 6 * s);
  b.quadraticCurveTo(x - 24 * s * dir, y - 12 * s, x - 20 * s * dir, y - 18 * s);
  b.closePath();
  g.save();
  g.fillStyle = GLAZE;
  g.fill(b);
  g.restore();
  // patches
  g.save();
  g.clip(b);
  for (const [px, py, r] of [
    [-10, -14, 6],
    [6, -11, 7],
    [15, -17, 4],
  ]) {
    const pp = new Path2D();
    pp.ellipse(x + px * s * dir, y + py * s, r * s * 1.2, r * s * 0.8, 0.3, 0, TAU);
    wash(g, pp, C.ink, 0.85, mottle, 0);
  }
  g.restore();
  g.save();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.3;
  g.stroke(b);
  g.restore();
  // legs
  for (const lx of [-15, -10, 11, 15]) {
    trekSeg(g, { x: x + lx * s * dir, y: y - 7 * s }, { x: x + lx * s * dir + 0.5, y: y + 2 * s }, 2.2 * s, C.ink, rng, 1, 0.3);
  }
  // udder
  g.fillStyle = C.light;
  g.beginPath();
  g.ellipse(x + 6 * s * dir, y - 4 * s, 3 * s, 2 * s, 0, 0, TAU);
  g.fill();
}

function cornerMotif(g, jx, jy, rng) {
  // "ossekop" (ox-head): four quarter motifs meet across the joint
  g.save();
  g.translate(jx, jy);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    g.save();
    g.rotate(a);
    // head (teardrop) pointing into the tile
    g.beginPath();
    g.moveTo(4, 0);
    g.quadraticCurveTo(9, -4.2, 15.5, 0);
    g.quadraticCurveTo(9, 4.2, 4, 0);
    g.closePath();
    g.fillStyle = C.ink;
    g.globalAlpha = 0.9;
    g.fill();
    // horns
    g.strokeStyle = C.ink;
    g.lineWidth = 1.25;
    g.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.moveTo(6, 1.2 * sgn);
      g.quadraticCurveTo(8, 8 * sgn, 13, 8.5 * sgn);
      g.quadraticCurveTo(15.5, 8 * sgn, 14, 5.6 * sgn);
      g.stroke();
    }
    // eye dot
    g.fillStyle = GLAZE;
    g.beginPath();
    g.arc(10.5, 0, 0.9, 0, TAU);
    g.fill();
    g.restore();
  }
  // tiny lozenge at the joint
  g.fillStyle = C.ink;
  g.globalAlpha = 0.85;
  g.beginPath();
  g.moveTo(0, -3);
  g.lineTo(3, 0);
  g.lineTo(0, 3);
  g.lineTo(-3, 0);
  g.closePath();
  g.fill();
  g.restore();
}

// -----------------------------------------------------------------------------
// paltrok projection: a = along the windshaft (rear +), b = across (mill's left +), h = up
// -----------------------------------------------------------------------------
function pq(a, b, h) {
  return { x: PF.x + 0.82 * b + 0.55 * a, y: PF.y - h - 0.06 * b - 0.13 * a };
}

// big mill: octagon geometry
function millR(y) {
  return lerp(MILL.rB, MILL.rT, (MILL.plinthTop - y) / (MILL.plinthTop - MILL.top));
}
function octCorners(y, r) {
  const out = [];
  for (let k = 0; k < 8; k++) {
    const phi = (k + 0.5) * (Math.PI / 4) + 0.22;
    out.push({ phi, x: MILL.cx + r * Math.sin(phi), y: y + 0.13 * r * Math.cos(phi), front: Math.cos(phi) });
  }
  return out;
}

// -----------------------------------------------------------------------------
// the static picture (painted, then cut into tiles slightly out of register)
// -----------------------------------------------------------------------------
function paintPicture(kit, g, rng) {
  const M = makeMottle(kit, 'dutch_mottle', C.ink);
  const mottle = g.createPattern(M, 'repeat');
  g.fillStyle = GLAZE;
  g.fillRect(0, 0, P, P);
  g.lineCap = 'round';
  g.lineJoin = 'round';

  // ---------------- sky ----------------
  // soft horizon haze
  {
    const p = new Path2D();
    p.rect(0, HORIZON - 70, P, 70);
    g.save();
    g.globalCompositeOperation = 'multiply';
    const gr = g.createLinearGradient(0, HORIZON - 70, 0, HORIZON);
    gr.addColorStop(0, 'rgba(185,200,232,0)');
    gr.addColorStop(1, 'rgba(185,200,232,0.55)');
    g.fillStyle = gr;
    g.fill(p);
    g.restore();
  }
  // horizontal sky strokes (the painter's long wavy "lucht" lines, denser low down)
  for (let i = 0; i < 30; i++) {
    const u = rng();
    const y = 60 + Math.sqrt(u) * 460;
    const x = 20 + rng() * 860;
    const L = 60 + rng() * 160;
    trek(g, seg({ x, y }, { x: x + L, y: y + (rng() - 0.5) * 4 }, 14, 2.2, rng() * 50), 1.0 + u * 1.2, C.light, rng, 0.35 + u * 0.35);
  }
  // clouds
  cloud(g, rng, mottle, 300, 64, 210, 64);
  cloud(g, rng, mottle, 760, 270, 200, 62);
  cloud(g, rng, mottle, 196, 300, 170, 52);
  cloud(g, rng, mottle, 470, 420, 150, 46);
  cloud(g, rng, mottle, 18, 444, 150, 50);
  cloud(g, rng, mottle, 820, 446, 160, 44);
  // birds
  for (const [bx, by, s] of [
    [430, 250, 1],
    [452, 238, 0.8],
    [700, 120, 0.9],
  ]) {
    trek(g, quad({ x: bx - 7 * s, y: by - 2 * s }, { x: bx - 3 * s, y: by - 5 * s }, { x: bx, y: by }, 4), 1.4, C.ink, rng);
    trek(g, quad({ x: bx, y: by }, { x: bx + 3 * s, y: by - 5 * s }, { x: bx + 7 * s, y: by - 2 * s }, 4), 1.4, C.ink, rng);
  }

  // ---------------- far land ----------------
  // far ring dike with trees and a church
  {
    const p = polyPath([
      { x: 0, y: HORIZON + 2 },
      { x: 0, y: HORIZON - 4 },
      { x: P, y: HORIZON - 5 },
      { x: P, y: HORIZON + 3 },
    ]);
    wash(g, p, C.light, 0.55, mottle, 0);
    trek(g, seg({ x: 0, y: HORIZON - 4 }, { x: P, y: HORIZON - 5 }, 60, 0.8, 3), 1.3, C.mid, rng, 0.8);
    for (let i = 0; i < 16; i++) {
      const x = 20 + rng() * 960;
      if (x > 520 && x < 700) continue;
      const w = 10 + rng() * 22;
      const h = 6 + rng() * 9;
      const t = new Path2D();
      t.ellipse(x, HORIZON - 4 - h * 0.5, w * 0.5, h * 0.6, 0, Math.PI, TAU);
      t.closePath();
      wash(g, t, C.light, 0.6, mottle, 1);
    }
    // church (spire) on the far dike
    const cx = 392;
    const cy = HORIZON - 4;
    wash(g, polyPath([{ x: cx - 16, y: cy }, { x: cx - 16, y: cy - 12 }, { x: cx + 12, y: cy - 12 }, { x: cx + 12, y: cy }]), C.light, 0.75, null, 1);
    wash(g, polyPath([{ x: cx + 6, y: cy - 12 }, { x: cx + 6, y: cy - 24 }, { x: cx + 13, y: cy - 24 }, { x: cx + 13, y: cy - 12 }]), C.wash, 0.8, null, 1);
    wash(g, polyPath([{ x: cx + 5, y: cy - 24 }, { x: cx + 9.5, y: cy - 44 }, { x: cx + 14, y: cy - 24 }]), C.mid, 0.85, null, 1);
    // a far sail on the far ring canal
    wash(g, polyPath([{ x: 966, y: HORIZON - 5 }, { x: 966, y: HORIZON - 28 }, { x: 952, y: HORIZON - 9 }]), C.light, 0.6, null, 1);
    trekSeg(g, { x: 966, y: HORIZON - 4 }, { x: 966, y: HORIZON - 31 }, 1.2, C.mid, rng);
  }
  // distant mills of the drainage gang along the far dike (sails live)
  for (const [x, s] of [
    [72, 0.8],
    [748, 0.95],
    [800, 1.05],
    [858, 0.9],
  ]) tinyMillBody(g, rng, x, HORIZON - 3, s);

  // ---------------- polder ----------------
  {
    const land = polyPath([
      { x: 0, y: HORIZON + 1 },
      { x: P, y: HORIZON + 1 },
      { x: P, y: 692 },
      { x: 0, y: 692 },
    ]);
    wash(g, land, C.pale, 0.28, mottle, 0);
    // field bands in perspective
    for (let k = 1; k < 12; k++) {
      const u = k / 12;
      const y = HORIZON + 2 + (690 - HORIZON) * Math.pow(u, 1.7);
      const x0 = rng() * 120;
      trek(g, seg({ x: x0, y }, { x: P - rng() * 80, y: y + (rng() - 0.5) * 2 }, 40, 0.6, rng() * 40), 0.8 + u * 1.2, C.light, rng, 0.75);
      if (k % 3 === 1) {
        const band = polyPath([
          { x: 0, y },
          { x: P, y },
          { x: P, y: y + 4 + u * 9 },
          { x: 0, y: y + 4 + u * 9 },
        ]);
        wash(g, band, C.light, 0.22, mottle, 0);
      }
    }
    // converging ditches (sloten) toward a vanishing point on the horizon
    const vp = { x: 520, y: HORIZON + 1 };
    for (const bx of [-500, -200, 60, 980, 1300, 1700]) {
      const a = { x: vp.x + (bx - vp.x) * 0.04, y: vp.y + (692 - vp.y) * 0.04 };
      trek(g, seg(a, { x: bx, y: 692 }, 30, 0.6, bx), 1.4, C.wash, rng, 0.6, 0.2);
    }
    // grass tufts
    for (let i = 0; i < 160; i++) {
      const x = rng() * P;
      const u = rng();
      const y = HORIZON + 8 + (680 - HORIZON) * u * u;
      const s = 0.4 + u * 1.1;
      for (let k = -1; k <= 1; k++) {
        trekSeg(g, { x: x + k * 2.2 * s, y }, { x: x + k * 3 * s + 1, y: y - (4 + rng() * 3) * s }, 0.9 * s + 0.3, C.mid, rng, 0.55, 0.2);
      }
    }
    // pollard willows along a ditch
    for (const [x, y, s] of [
      [372, 598, 0.85],
      [418, 603, 0.9],
      [930, 612, 1.0],
      [968, 622, 1.05],
      [700, 590, 0.7],
      [668, 586, 0.62],
    ]) willow(g, rng, mottle, x, y, s);
    // stolp farm with trees
    tree(g, rng, mottle, 958, 590, 1.0);
    stolp(g, rng, mottle, 902, 592);
    tree(g, rng, mottle, 846, 588, 0.85);
    // cows
    cowBody(g, rng, mottle, 800, 684, 1.1, 1);
    cowBody(g, rng, mottle, 905, 676, 0.95, -1);
  }

  // ---------------- paltrok sawmill ----------------
  paintPaltrok(g, rng, mottle);
  // log pond in front of it
  {
    const pond = new Path2D();
    pond.moveTo(30, 664);
    pond.bezierCurveTo(60, 640, 220, 640, 290, 660);
    pond.bezierCurveTo(300, 676, 200, 686, 40, 684);
    pond.closePath();
    g.save();
    g.fillStyle = GLAZE;
    g.fill(pond);
    g.restore();
    wash(g, pond, C.pale, 0.5, mottle, 1.2);
    hatch(g, pond, 30, 640, 300, 690, 0, 4.2, 0.9, C.light, rng, 0.8);
    for (let i = 0; i < 5; i++) {
      const x = 70 + i * 40 + rng() * 10;
      const y = 660 + (i % 2) * 8 + rng() * 4;
      logShape(g, rng, mottle, x, y, 46, 5, -0.04);
    }
    trek(g, seg({ x: 36, y: 664 }, { x: 290, y: 660 }, 20, 1.5, 7), 1.3, C.ink, rng, 0.8);
  }

  // ---------------- drainage mill ----------------
  paintMill(g, rng, mottle);
  // polder ditch at the low side of the wheel, outlet basin at the high side
  {
    const ditch = polyPath([
      { x: 360, y: DITCH_Y - 1 },
      { x: 492, y: DITCH_Y - 1 },
      { x: 492, y: 688 },
      { x: 360, y: 688 },
    ]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(ditch);
    g.restore();
    wash(g, ditch, C.light, 0.55, mottle, 0);
    hatch(g, ditch, 360, DITCH_Y, 492, 688, 0, 3.6, 0.9, C.mid, rng, 0.7);
    trek(g, seg({ x: 360, y: DITCH_Y - 1 }, { x: 492, y: DITCH_Y - 1 }, 14, 0.6, 2), 1.4, C.ink, rng);
    // outlet basin walls (brick) — water surface at BASIN_Y
    const front = polyPath([
      { x: 604, y: BASIN_Y + 6 },
      { x: 712, y: BASIN_Y + 4 },
      { x: 714, y: 688 },
      { x: 606, y: 690 },
    ]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(front);
    g.restore();
    wash(g, front, C.light, 0.45, mottle, 0);
    for (let y = BASIN_Y + 10; y < 688; y += 6) {
      trekSeg(g, { x: 606, y }, { x: 712, y: y - 1 }, 0.9, C.mid, rng, 0.7, 0.3);
      for (let x = 610 + ((y / 6) % 2) * 6; x < 712; x += 12) trekSeg(g, { x, y }, { x, y: y + 5 }, 0.8, C.mid, rng, 0.5, 0.1);
    }
    const water = polyPath([
      { x: 600, y: BASIN_Y },
      { x: 716, y: BASIN_Y - 2 },
      { x: 712, y: BASIN_Y + 5 },
      { x: 604, y: BASIN_Y + 7 },
    ]);
    wash(g, water, C.mid, 0.65, mottle, 1);
    trek(g, seg({ x: 600, y: BASIN_Y }, { x: 716, y: BASIN_Y - 2 }, 12, 0.5, 4), 1.5, C.ink, rng);
    trek(g, seg({ x: 604, y: BASIN_Y + 6 }, { x: 714, y: BASIN_Y + 4 }, 12, 0.5, 5), 1.5, C.ink, rng);
  }

  // ---------------- the dike with the road ----------------
  {
    // back edge of the crest
    trek(g, seg({ x: 0, y: 690 }, { x: P, y: 690 }, 60, 0.8, 11), 1.4, C.mid, rng, 0.8);
    // road surface stipple
    for (let i = 0; i < 420; i++) {
      const x = rng() * P;
      const y = 692 + rng() * 14;
      g.fillStyle = C.light;
      g.globalAlpha = 0.45;
      g.fillRect(x, y, 1.6, 1.1);
    }
    g.globalAlpha = 1;
    // ruts
    trek(g, seg({ x: 0, y: 703 }, { x: P, y: 703 }, 60, 0.6, 12), 1.0, C.light, rng, 0.7);
    // front edge
    trek(g, seg({ x: 0, y: 708 }, { x: P, y: 708 }, 60, 0.9, 13), 2.2, C.ink, rng);
    // front slope
    const slope = polyPath([
      { x: 0, y: 709 },
      { x: P, y: 709 },
      { x: P, y: 764 },
      { x: 0, y: 764 },
    ]);
    wash(g, slope, C.pale, 0.35, mottle, 0);
    for (let i = 0; i < 260; i++) {
      const x = rng() * P;
      if (x > 640 && x < 712) continue;
      const y = 714 + rng() * 46;
      const s = 0.7 + (y - 714) / 50;
      trekSeg(g, { x, y }, { x: x + 2 + rng() * 3, y: y - 5 * s }, 1.0, C.mid, rng, 0.6, 0.2);
    }
    // culvert (sluice) mouth under the road: the lifted water leaves the polder here
    const cx = 676;
    const arch = new Path2D();
    arch.moveTo(cx - 22, 750);
    arch.lineTo(cx - 22, 734);
    arch.arc(cx, 734, 22, Math.PI, TAU);
    arch.lineTo(cx + 22, 750);
    arch.closePath();
    wash(g, arch, C.ink, 0.85, mottle, 1);
    const ring = new Path2D();
    ring.arc(cx, 734, 30, Math.PI, TAU);
    ring.lineTo(cx + 22, 734);
    ring.arc(cx, 734, 22, TAU, Math.PI, true);
    ring.closePath();
    wash(g, ring, C.light, 0.6, mottle, 1);
    for (let k = 0; k <= 8; k++) {
      const a = Math.PI + (k / 8) * Math.PI;
      trekSeg(g, { x: cx + Math.cos(a) * 22, y: 734 + Math.sin(a) * 22 }, { x: cx + Math.cos(a) * 30, y: 734 + Math.sin(a) * 30 }, 1.1, C.ink, rng, 0.9, 0.1);
    }
    for (const sx of [-1, 1]) {
      const wing = polyPath([
        { x: cx + sx * 30, y: 734 },
        { x: cx + sx * 44, y: 742 },
        { x: cx + sx * 46, y: 766 },
        { x: cx + sx * 24, y: 766 },
      ]);
      wash(g, wing, C.light, 0.5, mottle, 1);
      for (let y = 740; y < 766; y += 6) trekSeg(g, { x: cx + sx * 26, y }, { x: cx + sx * 44, y }, 0.8, C.mid, rng, 0.7, 0.1);
    }
  }

  // fence on the dike slope, reed clumps along the bank
  {
    for (const [x0, n] of [
      [96, 4],
      [846, 3],
    ]) {
      for (let i = 0; i < n; i++) {
        const x = x0 + i * 34;
        trekSeg(g, { x, y: 712 }, { x: x + 1, y: 742 }, 3.6, C.dark, rng, 1, 0.3);
      }
      trekSeg(g, { x: x0 - 4, y: 719 }, { x: x0 + (n - 1) * 34 + 8, y: 720 }, 2, C.ink, rng, 1, 0.5);
      trekSeg(g, { x: x0 - 4, y: 731 }, { x: x0 + (n - 1) * 34 + 8, y: 733 }, 2, C.ink, rng, 1, 0.5);
    }
    for (const [rx, n, sc] of [
      [240, 6, 0.6],
      [530, 5, 0.55],
      [800, 5, 0.6],
    ]) reeds(g, rng, rx, 770, n, sc);
  }

  // ---------------- ring canal (foreground) ----------------
  {
    trek(g, seg({ x: 0, y: 765 }, { x: P, y: 765 }, 60, 1.2, 21), 1.8, C.ink, rng, 0.9);
    // dark reflection of the dike
    const refl = polyPath([
      { x: 0, y: 766 },
      { x: P, y: 766 },
      { x: P, y: 792 },
      { x: 0, y: 792 },
    ]);
    wash(g, refl, C.wash, 0.5, mottle, 0);
    for (let i = 0; i < 40; i++) {
      const y = 768 + rng() * 22;
      const x = rng() * P;
      trekSeg(g, { x, y }, { x: x + 20 + rng() * 60, y }, 1.2 + rng(), C.ink, rng, 0.55, 0.6);
    }
    for (let i = 0; i < 120; i++) {
      const u = rng();
      const y = 770 + u * u * 200;
      const x = rng() * P;
      const L = 18 + rng() * 70 * (0.5 + u);
      const pts = [];
      for (let k = 0; k <= 8; k++) pts.push({ x: x + (k / 8) * L, y: y + Math.sin(k * 1.4 + x) * (0.8 + u * 1.6) });
      trek(g, pts, 1.0 + u * 1.6, u < 0.35 ? C.ink : u < 0.7 ? C.mid : C.light, rng, 0.75);
    }
    // log raft waiting for the saw
    // (wash of water darkened around the raft)
    const rw = new Path2D();
    rw.ellipse(200, 846, 170, 34, 0, 0, TAU);
    wash(g, rw, C.light, 0.3, mottle, 0);
    for (let i = 0; i < 5; i++) {
      logShape(g, rng, mottle, 64 + (i % 2) * 22 + rng() * 10, 812 + i * 12, 238 - (i % 3) * 18 - rng() * 12, 7 + rng() * 1.5, -0.006 + rng() * 0.012);
    }
    for (const rx of [118, 262]) {
      trek(g, seg({ x: rx, y: 802 }, { x: rx + 4, y: 870 }, 8, 1.2, rx), 1.6, C.dark, rng);
      trek(g, seg({ x: rx - 3, y: 806 }, { x: rx + 7, y: 866 }, 8, 1.5, rx + 1), 0.9, C.ink, rng, 0.8);
    }
    // the raftsman's pole
    trekSeg(g, { x: 330, y: 760 }, { x: 300, y: 878 }, 2.2, C.dark, rng);
    // reeds
    for (const [rx, ry, n, s] of [
      [40, 960, 13, 1.25],
      [972, 958, 9, 1.0],
      [392, 772, 7, 0.7],
      [940, 772, 6, 0.65],
    ]) reeds(g, rng, rx, ry, n, s);
    // lily pads
    for (const [lx, ly] of [
      [470, 900],
      [492, 912],
      [530, 950],
      [420, 940],
    ]) {
      const p = new Path2D();
      p.ellipse(lx, ly, 9, 3.4, 0, 0.3, TAU - 0.1);
      p.lineTo(lx, ly);
      p.closePath();
      wash(g, p, C.wash, 0.55, mottle, 1);
    }
  }

  // ---------------- roundels (engravings copied by the tile painter) ----------------
  paintRoundel(g, rng, mottle);
  paintBeemster(g, rng, mottle);
}

function stolp(g, rng, mottle, x, y) {
  // North-Holland stolp farm: square pyramid roof over a low brick wall
  const L = { x: x - 44, y };
  const R = { x: x + 40, y: y - 3 };
  const apex = { x: x - 4, y: y - 46 };
  const mid = { x: x + 6, y: y + 2 };
  // walls
  wash(g, polyPath([{ x: L.x, y: L.y - 10 }, { x: mid.x, y: mid.y - 10 }, { x: mid.x, y: mid.y + 4 }, { x: L.x, y: L.y + 4 }]), C.light, 0.55, mottle, 1);
  wash(g, polyPath([{ x: mid.x, y: mid.y - 10 }, { x: R.x, y: R.y - 10 }, { x: R.x, y: R.y + 3 }, { x: mid.x, y: mid.y + 4 }]), C.wash, 0.6, mottle, 1);
  // roof planes
  const lp = polyPath([{ x: L.x - 4, y: L.y - 9 }, apex, { x: mid.x, y: mid.y - 9 }]);
  const rp = polyPath([{ x: mid.x, y: mid.y - 9 }, apex, { x: R.x + 4, y: R.y - 10 }]);
  wash(g, lp, C.pale, 0.6, mottle, 1);
  wash(g, rp, C.light, 0.7, mottle, 1);
  hatch(g, lp, L.x - 4, apex.y, mid.x, mid.y, -1.2, 4, 0.9, C.mid, rng, 0.6);
  hatch(g, rp, mid.x, apex.y, R.x + 4, R.y, -1.95, 3, 0.9, C.ink, rng, 0.6);
  trek(g, [{ x: L.x - 4, y: L.y - 9 }, apex, { x: R.x + 4, y: R.y - 10 }], 1.6, C.ink, rng);
  trekSeg(g, apex, { x: mid.x, y: mid.y - 9 }, 1.3, C.ink, rng);
  // door + windows + chimney
  wash(g, polyPath([{ x: x - 16, y: y - 7 }, { x: x - 9, y: y - 7 }, { x: x - 9, y: y + 3 }, { x: x - 16, y: y + 3 }]), C.ink, 0.9, null, 0);
  wash(g, polyPath([{ x: x + 18, y: y - 6 }, { x: x + 25, y: y - 7 }, { x: x + 25, y: y - 1 }, { x: x + 18, y: y }]), C.ink, 0.9, null, 0);
  wash(g, polyPath([{ x: x + 2, y: y - 40 }, { x: x + 8, y: y - 40 }, { x: x + 8, y: y - 30 }, { x: x + 2, y: y - 28 }]), C.ink, 0.9, null, 0);
}

function reeds(g, rng, x, y, n, s) {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - n / 2) * 4 * s + (rng() - 0.5) * 3;
    const h = (24 + rng() * 26) * s;
    const lean = (rng() - 0.3) * 10 * s;
    trek(g, quad({ x: bx, y }, { x: bx + lean * 0.3, y: y - h * 0.6 }, { x: bx + lean, y: y - h }, 6), 1.6 * s, C.ink, rng, 0.9);
    if (rng() < 0.4) {
      const t = new Path2D();
      t.ellipse(bx + lean * 0.95, y - h - 4 * s, 1.8 * s, 5 * s, lean * 0.03, 0, TAU);
      wash(g, t, C.dark, 0.9, null, 0);
    }
  }
  for (let i = 0; i < n / 2; i++) {
    const bx = x + (rng() - 0.5) * n * 4 * s;
    trek(g, quad({ x: bx, y }, { x: bx + 10 * s, y: y - 12 * s }, { x: bx + 18 * s, y: y - 10 * s }, 6), 1.3 * s, C.mid, rng, 0.8);
  }
}

function logShape(g, rng, mottle, x, y, len, r, tilt) {
  // a felled trunk: thick butt end (cut face, growth rings) tapering to the top end
  const n = Math.max(8, Math.round(len / 8));
  const top = [];
  const bot = [];
  const seed = rng() * 100;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const rr = r * (1 - 0.28 * u) * (0.94 + 0.12 * vnoise(seed + u * 6));
    const cx = x + u * len;
    const cy = y + u * len * tilt;
    top.push({ x: cx, y: cy - rr });
    bot.push({ x: cx, y: cy + rr * (0.96 + 0.08 * vnoise(seed + 9 + u * 5)) });
  }
  const p = polyPath([...top, ...bot.slice().reverse()]);
  g.save();
  g.fillStyle = GLAZE;
  g.fill(p);
  g.restore();
  wash(g, p, C.light, 0.5, mottle, 0);
  // shadow underside
  const sh = polyPath([...top.map((q, i) => ({ x: q.x, y: lerp(q.y, bot[i].y, 0.55) })), ...bot.slice().reverse()]);
  wash(g, sh, C.wash, 0.45, mottle, 0);
  // bark: short curved strokes around the trunk, a few long cracks
  for (let i = 1; i < n; i++) {
    if (rng() < 0.25) continue;
    const t0 = top[i];
    const b0 = bot[i];
    const off = (rng() - 0.5) * 4;
    trek(g, quad({ x: t0.x + off, y: t0.y + 1 }, { x: t0.x + off + 3, y: (t0.y + b0.y) / 2 }, { x: b0.x + off, y: b0.y - 1 }, 5), 0.9, C.ink, rng, 0.6);
  }
  for (let k = 0; k < 2; k++) {
    const i0 = Math.floor(rng() * n * 0.5);
    const i1 = Math.min(n, i0 + 2 + Math.floor(rng() * n * 0.4));
    const f = 0.3 + rng() * 0.4;
    trek(g, top.slice(i0, i1 + 1).map((q, j) => ({ x: q.x, y: lerp(q.y, bot[i0 + j].y, f) })), 0.8, C.mid, rng, 0.7);
  }
  // knot / branch stub
  const ki = Math.floor(n * (0.4 + rng() * 0.4));
  const kp = { x: top[ki].x, y: top[ki].y + 1.5 };
  const knot = new Path2D();
  knot.ellipse(kp.x, kp.y, 2.4, 1.6, 0, 0, TAU);
  wash(g, knot, C.dark, 0.9, null, 0);
  trek(g, top, 1.3, C.ink, rng, 1, 0.3);
  trek(g, bot, 1.8, C.dark, rng, 1, 0.3);
  // cut butt end with rings
  const e = new Path2D();
  e.ellipse(x, y, r * 0.48, r, 0, 0, TAU);
  g.save();
  g.fillStyle = GLAZE;
  g.fill(e);
  g.restore();
  wash(g, e, C.pale, 0.55, null, 0);
  g.save();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.3;
  g.stroke(e);
  g.lineWidth = 0.7;
  g.beginPath();
  g.ellipse(x, y, r * 0.28, r * 0.6, 0, 0, TAU);
  g.stroke();
  g.fillStyle = C.ink;
  g.beginPath();
  g.arc(x, y, 1, 0, TAU);
  g.fill();
  g.restore();
}

function paintPaltrok(g, rng, mottle) {
  const ink = (pts, w = 1.6, a = 1) => trek(g, pts, w, C.ink, rng, a);
  // brick base ring (kruirollen sit on it)
  {
    const ring = [];
    const ring2 = [];
    // near half of the circle (nearest direction in (a,b) is (-0.82, 0.55))
    for (let k = 0; k <= 24; k++) {
      const t = -Math.PI / 2 + (k / 24) * Math.PI;
      const a = 58 + 80 * (Math.cos(t) * -0.82 + Math.sin(t) * 0.55);
      const b = 80 * (Math.cos(t) * 0.55 + Math.sin(t) * 0.82);
      ring.push(pq(a, b, 0));
      ring2.push(pq(a, b, -24));
    }
    const wall = polyPath([...ring, ...ring2.slice().reverse()]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(wall);
    g.restore();
    wash(g, wall, C.light, 0.55, mottle, 1);
    for (let row = 1; row < 4; row++) {
      const pts = ring.map((p, i) => ({ x: p.x, y: lerp(p.y, ring2[i].y, row / 4) }));
      trek(g, pts, 0.9, C.mid, rng, 0.7);
    }
    ink(ring2, 1.5);
    // rollers
    for (let k = 2; k < 23; k += 2) {
      const p = ring[k];
      g.fillStyle = C.ink;
      g.beginPath();
      g.ellipse(p.x, p.y - 2, 3.4, 2.2, 0, 0, TAU);
      g.fill();
    }
  }
  // rear: open sawing floor with crane
  {
    const post = [pq(150, 30, 0), pq(150, 30, 74)];
    trekSeg(g, post[0], post[1], 3, C.ink, rng);
    trekSeg(g, pq(150, 30, 70), pq(150, 70, 62), 2.4, C.ink, rng);
    trekSeg(g, pq(150, 30, 46), pq(150, 58, 66), 1.4, C.ink, rng);
    trekSeg(g, pq(150, 70, 62), pq(150, 70, 30), 0.9, C.ink, rng);
    const deck = polyPath([pq(112, -44, 0), pq(170, -44, 0), pq(170, 44, 0), pq(112, 44, 0)]);
    wash(g, deck, C.light, 0.5, mottle, 1);
    for (let b = -40; b <= 40; b += 10) trekSeg(g, pq(170, b, 0), pq(170, b, 12), 0.9, C.ink, rng);
    trekSeg(g, pq(170, -44, 12), pq(170, 44, 12), 1.2, C.ink, rng);
  }
  // left wing (front gable only)
  {
    const f = polyPath([pq(10, -88, 0), pq(10, -88, 32), pq(10, -44, 74), pq(10, -44, 0)]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(f);
    g.restore();
    wash(g, f, C.pale, 0.55, mottle, 1);
    hatch(g, f, 100, 520, 200, 620, 0.05, 5, 0.9, C.mid, rng, 0.7);
    ink([pq(10, -88, 0), pq(10, -88, 32), pq(10, -44, 74)], 1.6);
  }
  // main body: right side wall (shaded) + front face (lit)
  const H = 118;
  {
    const side = polyPath([pq(0, 44, 0), pq(118, 44, 0), pq(118, 44, H), pq(0, 44, H)]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(side);
    g.restore();
    wash(g, side, C.mid, 0.72, mottle, 1);
    hatch(g, side, 220, 470, 300, 615, -0.13, 4.2, 1.1, C.dark, rng, 0.7);
    const front = polyPath([pq(0, -44, 0), pq(0, 44, 0), pq(0, 44, H), pq(0, -44, H)]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(front);
    g.restore();
    wash(g, front, C.light, 0.55, mottle, 1);
    hatch(g, front, 150, 490, 232, 615, -0.06, 5, 1.0, C.ink, rng, 0.7);
    // door & windows on the front
    const door = polyPath([pq(0, -12, 0), pq(0, 12, 0), pq(0, 12, 34), pq(0, -12, 34)]);
    wash(g, door, C.ink, 0.85, mottle, 1);
    for (const [b, h] of [
      [-28, 64],
      [22, 64],
      [-6, 96],
    ]) {
      const w = polyPath([pq(0, b, h), pq(0, b + 12, h), pq(0, b + 12, h + 14), pq(0, b, h + 14)]);
      wash(g, w, C.ink, 0.85, null, 1);
    }
    ink([pq(0, -44, 0), pq(0, -44, H)], 1.8);
    ink([pq(0, 44, 0), pq(0, 44, H)], 1.8);
    ink([pq(0, 44, 0), pq(118, 44, 0)], 1.4);
  }
  // curved roof (hood) over the body
  {
    const prof = (a) => {
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        const b = -50 + u * 100;
        const h = H + 48 * Math.sqrt(Math.max(0, 1 - Math.pow((b / 50), 2)));
        pts.push(pq(a, b, h));
      }
      return pts;
    };
    const frontArc = prof(-6);
    const backArc = prof(126);
    // visible roof surface: right half of the front arc → right half of back arc
    const top = [...frontArc.slice(4), ...backArc.slice(4).reverse()];
    const roof = polyPath(top);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(roof);
    g.restore();
    wash(g, roof, C.wash, 0.62, mottle, 1);
    for (let k = 4; k <= 12; k++) trekSeg(g, frontArc[k], backArc[k], 1.0, C.ink, rng, 0.75, 0.3);
    // front gable boards
    const gable = polyPath(frontArc);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(gable);
    g.restore();
    wash(g, gable, C.pale, 0.4, mottle, 1);
    for (let h = H + 6; h < H + 48; h += 6) trekSeg(g, pq(-6, -48, h), pq(-6, 48, h), 0.7, C.mid, rng, 0.6, 0.2);
    g.save();
    g.clip(gable);
    g.restore();
    ink(frontArc, 2.2);
    ink(backArc.slice(4), 1.6);
  }
  // right wing (lean-to) with the log opening
  {
    const roof = polyPath([pq(8, 44, 76), pq(110, 44, 76), pq(110, 90, 32), pq(8, 90, 32)]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(roof);
    g.restore();
    wash(g, roof, C.light, 0.6, mottle, 1);
    for (let a = 12; a < 110; a += 6) trekSeg(g, pq(a, 44, 76), pq(a, 90, 32), 0.9, C.ink, rng, 0.75, 0.2);
    const wall = polyPath([pq(8, 90, 0), pq(110, 90, 0), pq(110, 90, 32), pq(8, 90, 32)]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(wall);
    g.restore();
    wash(g, wall, C.mid, 0.7, mottle, 1);
    hatch(g, wall, 260, 560, 330, 612, -0.13, 4, 1.0, C.dark, rng, 0.65);
    const front = polyPath([pq(8, 44, 0), pq(8, 90, 0), pq(8, 90, 32), pq(8, 44, 76)]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(front);
    g.restore();
    wash(g, front, C.pale, 0.5, mottle, 1);
    hatch(g, front, 228, 530, 270, 612, -0.06, 5, 0.9, C.mid, rng, 0.7);
    ink([pq(8, 44, 76), pq(8, 90, 32), pq(110, 90, 32)], 1.6);
    ink([pq(8, 90, 0), pq(8, 90, 32)], 1.4);
    // log opening in the wing wall
    const hole = polyPath([pq(44, 90, 2), pq(74, 90, 2), pq(74, 90, 26), pq(44, 90, 26)]);
    wash(g, hole, C.dark, 0.9, null, 1);
  }
}

function paintMill(g, rng, mottle) {
  const ink = (pts, w = 1.6, a = 1) => trek(g, pts, w, C.ink, rng, a);
  // tail pole + struts + winding wheel (behind the tower)
  {
    const top = { x: 668, y: 412 };
    const foot = { x: 750, y: 646 };
    trekSeg(g, top, foot, 4.2, C.ink, rng);
    trekSeg(g, { x: 640, y: 418 }, { x: 712, y: 540 }, 2.2, C.ink, rng);
    trekSeg(g, { x: 690, y: 404 }, { x: 716, y: 530 }, 2.2, C.ink, rng);
    // winding wheel (kruirad)
    const w = new Path2D();
    w.ellipse(752, 628, 7, 17, 0.15, 0, TAU);
    g.save();
    g.strokeStyle = C.ink;
    g.lineWidth = 2;
    g.stroke(w);
    g.restore();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      trekSeg(g, { x: 752 + Math.sin(a) * 7, y: 628 - Math.cos(a) * 17 }, { x: 752 - Math.sin(a) * 7, y: 628 + Math.cos(a) * 17 }, 0.8, C.ink, rng);
    }
    // chain to a winding post
    trekSeg(g, { x: 752, y: 640 }, { x: 790, y: 660 }, 0.9, C.mid, rng, 0.9, 1.5);
    trekSeg(g, { x: 790, y: 650 }, { x: 791, y: 666 }, 3, C.ink, rng);
    trekSeg(g, { x: 560, y: 664 }, { x: 561, y: 678 }, 3, C.ink, rng);
  }
  // brick plinth
  {
    const yb = MILL.base;
    const yt = MILL.plinthTop;
    const cb = octCorners(yb, MILL.plinthR + 2);
    const ct = octCorners(yt, MILL.plinthR);
    for (let k = 0; k < 8; k++) {
      const k2 = (k + 1) % 8;
      const nrm = Math.cos((cb[k].phi + cb[k2].phi) / 2 + (k2 === 0 ? Math.PI : 0));
      if (cb[k].front < -0.05 && cb[k2].front < -0.05) continue;
      if (nrm < -0.2) continue;
      const face = polyPath([cb[k], cb[k2], ct[k2], ct[k]]);
      g.save();
      g.fillStyle = GLAZE;
      g.fill(face);
      g.restore();
      const midPhi = (cb[k].phi + cb[k2].phi) / 2;
      const lit = clamp(0.5 - Math.sin(midPhi) * 0.6, 0, 1);
      wash(g, face, C.wash, 0.25 + (1 - lit) * 0.45, mottle, 1);
      for (let r = 1; r < 5; r++) {
        const u = r / 5;
        trekSeg(g, { x: lerp(cb[k].x, ct[k].x, u), y: lerp(cb[k].y, ct[k].y, u) }, { x: lerp(cb[k2].x, ct[k2].x, u), y: lerp(cb[k2].y, ct[k2].y, u) }, 0.8, C.mid, rng, 0.7, 0.2);
      }
    }
    // door
    const d = new Path2D();
    d.moveTo(600, yb + 2);
    d.lineTo(600, yb - 16);
    d.arc(609, yb - 16, 9, Math.PI, TAU);
    d.lineTo(618, yb + 2);
    d.closePath();
    wash(g, d, C.dark, 0.9, null, 1);
  }
  // thatched octagonal body
  {
    const yb = MILL.plinthTop;
    const yt = MILL.top;
    const cb = octCorners(yb, MILL.rB);
    const ct = octCorners(yt, MILL.rT);
    for (let k = 0; k < 8; k++) {
      const k2 = (k + 1) % 8;
      let midPhi = (cb[k].phi + cb[k2].phi) / 2;
      if (k2 === 0) midPhi += Math.PI;
      if (Math.cos(midPhi) < 0.0) continue;
      const face = polyPath([cb[k], cb[k2], ct[k2], ct[k]]);
      g.save();
      g.fillStyle = GLAZE;
      g.fill(face);
      g.restore();
      const lit = clamp(0.55 - Math.sin(midPhi) * 0.7, 0, 1);
      wash(g, face, C.light, 0.38 + (1 - lit) * 0.55, mottle, 0);
      // reed thatch strokes converging upward
      const n = Math.round(Math.abs(cb[k2].x - cb[k].x) / 3.2);
      for (let i = 0; i <= n; i++) {
        const u = (i + rng() * 0.6) / (n + 0.6);
        const a = { x: lerp(cb[k].x, cb[k2].x, u), y: lerp(cb[k].y, cb[k2].y, u) };
        const b = { x: lerp(ct[k].x, ct[k2].x, u), y: lerp(ct[k].y, ct[k2].y, u) };
        const s0 = rng() * 0.3;
        const s1 = 0.55 + rng() * 0.45;
        trekSeg(g, { x: lerp(a.x, b.x, s0), y: lerp(a.y, b.y, s0) }, { x: lerp(a.x, b.x, s1), y: lerp(a.y, b.y, s1) }, 1.0 + (1 - lit) * 0.7, lit > 0.5 ? C.mid : C.ink, rng, 0.75, 0.6);
      }
      // a darker edge band on the shadow faces
      if (lit < 0.3) hatch(g, face, Math.min(cb[k].x, ct[k].x), yt, Math.max(cb[k2].x, ct[k2].x), yb, 1.45, 3.2, 0.9, C.ink, rng, 0.45);
    }
    // corner posts
    for (let k = 0; k < 8; k++) {
      if (cb[k].front < -0.02) continue;
      ink(seg(cb[k], ct[k], 12, 0.6, k * 7), 1.6, 0.95);
    }
    // windows
    for (const [x, y] of [
      [606, 552],
      [612, 478],
    ]) {
      const w = polyPath([{ x, y }, { x: x + 11, y: y - 1 }, { x: x + 11, y: y + 15 }, { x, y: y + 16 }]);
      g.save();
      g.fillStyle = GLAZE;
      g.fill(w);
      g.restore();
      wash(g, w, C.dark, 0.85, null, 1.2);
      trekSeg(g, { x: x + 5.5, y: y - 1 }, { x: x + 5.5, y: y + 15 }, 0.8, C.pale, rng);
    }
    // the "lijfhout" ring at the top of the body
    const ring = octCorners(yt + 4, MILL.rT + 2).filter((c) => c.front > -0.05).sort((a, b) => a.x - b.x);
    ink(ring, 2.2);
  }
  // cap: thatched hood, front boards with the windshaft
  {
    const cap = new Path2D();
    cap.moveTo(560, 422);
    cap.bezierCurveTo(560, 392, 586, 372, 622, 371);
    cap.bezierCurveTo(656, 372, 680, 392, 682, 420);
    cap.quadraticCurveTo(622, 430, 560, 422);
    cap.closePath();
    g.save();
    g.fillStyle = GLAZE;
    g.fill(cap);
    g.restore();
    wash(g, cap, C.wash, 0.62, mottle, 1);
    g.save();
    g.clip(cap);
    for (let i = 0; i < 26; i++) {
      const x = 562 + i * 4.8;
      trekSeg(g, { x, y: 428 }, { x: x + (x - 620) * 0.15, y: 376 }, 1.0, i > 13 ? C.dark : C.ink, rng, 0.75, 0.8);
    }
    g.restore();
    // shadow half of the cap
    const sh = new Path2D();
    sh.moveTo(630, 371);
    sh.bezierCurveTo(660, 374, 680, 394, 682, 420);
    sh.quadraticCurveTo(656, 426, 630, 427);
    sh.closePath();
    wash(g, sh, C.mid, 0.4, mottle, 0);
    // front boarding (voorkeuvel) around the windshaft
    const fb = new Path2D();
    fb.moveTo(566, 421);
    fb.quadraticCurveTo(568, 392, 594, 384);
    fb.quadraticCurveTo(610, 386, 616, 400);
    fb.lineTo(616, 425);
    fb.closePath();
    g.save();
    g.fillStyle = GLAZE;
    g.fill(fb);
    g.restore();
    wash(g, fb, C.pale, 0.5, mottle, 1);
    for (let y = 392; y < 425; y += 5) trekSeg(g, { x: 568, y }, { x: 616, y: y + 1 }, 0.8, C.mid, rng, 0.7, 0.3);
    trek(g, cubic({ x: 560, y: 422 }, { x: 560, y: 392 }, { x: 586, y: 372 }, { x: 622, y: 371 }, 14), 2, C.ink, rng);
    trek(g, cubic({ x: 622, y: 371 }, { x: 656, y: 372 }, { x: 680, y: 392 }, { x: 682, y: 420 }, 14), 2, C.ink, rng);
    trek(g, quad({ x: 558, y: 423 }, { x: 622, y: 432 }, { x: 684, y: 421 }, 14), 2.4, C.ink, rng);
  }
}

function roundelFrame(g, rng, mottle, x, y, r) {
  const disc = new Path2D();
  disc.arc(x, y, r + 1, 0, TAU);
  g.save();
  g.fillStyle = GLAZE;
  g.fill(disc);
  g.restore();
  // pearl border
  const band = new Path2D();
  band.arc(x, y, r, 0, TAU);
  band.arc(x, y, r - 10, 0, TAU, true);
  wash(g, band, C.wash, 0.75, mottle, 0);
  for (let k = 0; k < 44; k++) {
    const a = (k / 44) * TAU;
    g.fillStyle = GLAZE;
    g.beginPath();
    g.arc(x + Math.cos(a) * (r - 5), y + Math.sin(a) * (r - 5), 2.1, 0, TAU);
    g.fill();
    g.fillStyle = C.dark;
    g.beginPath();
    g.arc(x + Math.cos(a) * (r - 5) + 0.5, y + Math.sin(a) * (r - 5) + 0.5, 0.9, 0, TAU);
    g.fill();
  }
  const ringPts = (rr) => {
    const out = [];
    for (let k = 0; k <= 72; k++) out.push({ x: x + Math.cos((k / 72) * TAU) * rr, y: y + Math.sin((k / 72) * TAU) * rr });
    return out;
  };
  trek(g, ringPts(r + 0.5), 2.8, C.dark, rng, 1, 0.05);
  trek(g, ringPts(r - 10), 1.6, C.dark, rng, 1, 0.05);
  return disc;
}

// the Beemster "molengang": three mills lift the polder water up in steps to the ring canal
const GANG = [
  { x: -40, base: 22, lo: 36, hi: 24 },
  { x: -8, base: 10, lo: 24, hi: 12 },
  { x: 24, base: -2, lo: 12, hi: 0 },
];
function paintBeemster(g, rng, mottle) {
  const { x, y, r } = MED2;
  const disc = roundelFrame(g, rng, mottle, x, y, r);
  g.save();
  g.clip(disc);
  // sky hatching
  const sky = polyPath([
    { x: x - 70, y: y - 70 },
    { x: x + 70, y: y - 70 },
    { x: x + 70, y: y + 40 },
    { x: x - 70, y: y + 40 },
  ]);
  hatch(g, sky, x - 70, y - 70, x + 70, y - 10, 0, 7, 0.7, C.light, rng, 0.35);
  // water bodies at four levels (polder ditch, two basins, ring canal)
  const waters = [
    [x - 70, x - 47, y + 36],
    [x - 34, x - 15, y + 24],
    [x - 2, x + 17, y + 12],
    [x + 30, x + 72, y + 0],
  ];
  for (const [x0, x1, wy] of waters) {
    const wpath = polyPath([
      { x: x0, y: wy },
      { x: x1, y: wy },
      { x: x1 - 3, y: wy + 9 },
      { x: x0 + 3, y: wy + 9 },
    ]);
    g.fillStyle = GLAZE;
    g.fill(wpath);
    wash(g, wpath, C.mid, 0.7, mottle, 0);
    trekSeg(g, { x: x0, y: wy }, { x: x1, y: wy }, 1.4, C.dark, rng, 1, 0.2);
    trekSeg(g, { x: x0 + 3, y: wy + 4 }, { x: x1 - 5, y: wy + 4 }, 0.7, GLAZE, rng, 0.8, 0.2);
  }
  // earth: dikes between the steps (hatched section)
  const earth = new Path2D();
  earth.moveTo(x - 72, y + 36);
  earth.lineTo(x - 47, y + 36);
  earth.lineTo(x - 44, y + 45);
  earth.lineTo(x - 37, y + 45);
  earth.lineTo(x - 34, y + 22);
  earth.lineTo(x - 46, y + 22);
  earth.lineTo(x - 50, y + 45);
  earth.closePath();
  const ground = polyPath([
    { x: x - 72, y: y + 45 },
    { x: x - 47, y: y + 45 },
    { x: x - 47, y: y + 22 },
    { x: x - 34, y: y + 22 },
    { x: x - 34, y: y + 33 },
    { x: x - 15, y: y + 33 },
    { x: x - 15, y: y + 10 },
    { x: x - 2, y: y + 10 },
    { x: x - 2, y: y + 21 },
    { x: x + 17, y: y + 21 },
    { x: x + 17, y: y - 2 },
    { x: x + 30, y: y - 2 },
    { x: x + 30, y: y + 9 },
    { x: x + 72, y: y + 9 },
    { x: x + 72, y: y + 72 },
    { x: x - 72, y: y + 72 },
  ]);
  void earth;
  g.fillStyle = GLAZE;
  g.fill(ground);
  wash(g, ground, C.pale, 0.5, mottle, 0);
  hatch(g, ground, x - 72, y - 4, x + 72, y + 72, -0.8, 4.2, 0.8, C.ink, rng, 0.6);
  g.save();
  g.strokeStyle = C.dark;
  g.lineWidth = 1.5;
  g.stroke(ground);
  g.restore();
  // mill bodies on the dikes (sails & scoop wheels live)
  for (const m of GANG) {
    const mx = x + m.x;
    const by = y + m.base;
    const body = polyPath([
      { x: mx - 6, y: by },
      { x: mx - 4, y: by - 24 },
      { x: mx + 4, y: by - 24 },
      { x: mx + 6, y: by },
    ]);
    g.fillStyle = GLAZE;
    g.fill(body);
    wash(g, body, C.wash, 0.75, null, 0);
    g.strokeStyle = C.dark;
    g.lineWidth = 1.1;
    g.stroke(body);
    const cap = new Path2D();
    cap.ellipse(mx, by - 24, 6, 4, 0, Math.PI, TAU);
    cap.closePath();
    wash(g, cap, C.dark, 0.95, null, 0);
  }
  g.restore();
  banner(g, rng, mottle, x, y - r - 3, 132, 'DE BEEMSTER');
  banner(g, rng, mottle, x, y + r + 5, 112, 'ANNO 1612');
}

function drawBeemsterLive(ctx, T, thumb) {
  const { x, y } = MED2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, MED2.r - 11, 0, TAU);
  ctx.clip();
  ctx.lineCap = 'round';
  GANG.forEach((m, i) => {
    const mx = x + m.x;
    const by = y + m.base;
    const ang = thumb ? 0.3 + i * 0.4 : -T * 1.9 + i * 0.7;
    drawTinySails(ctx, mx, by - 26, 1.05, ang);
    // scoop wheel at the foot, lifting from the lower water (left) to the higher (right)
    const wx = mx - 1;
    const wy = by + 3;
    const wa = thumb ? 0 : -T * 1.4 - i;
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(wx, wy, 6.5, 0, TAU);
    for (let k = 0; k < 8; k++) {
      const a = wa + (k / 8) * TAU;
      ctx.moveTo(wx + Math.cos(a) * 2, wy + Math.sin(a) * 2);
      ctx.lineTo(wx + Math.cos(a) * 8.5, wy + Math.sin(a) * 8.5);
    }
    ctx.stroke();
    // water poured over into the next, higher basin
    const ph = fract(T * 1.8 + i * 0.33);
    ctx.strokeStyle = C.mid;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mx + 5, y + m.hi - 3);
    ctx.quadraticCurveTo(mx + 9 + ph * 3, y + m.hi - 4, mx + 12 + ph * 5, y + m.hi + 0.5);
    ctx.stroke();
  });
  // a little boat on the ring canal (higher than the land)
  const bx = x + 50 + (thumb ? 0 : Math.sin(T * 0.6) * 4);
  const byy = y;
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.moveTo(bx - 8, byy - 2);
  ctx.lineTo(bx + 8, byy - 2);
  ctx.lineTo(bx + 5, byy + 2);
  ctx.lineTo(bx - 6, byy + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GLAZE;
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx, byy - 3);
  ctx.lineTo(bx, byy - 19);
  ctx.lineTo(bx - 9, byy - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function paintRoundel(g, rng, mottle) {
  const { x, y, r } = MED;
  const disc = roundelFrame(g, rng, mottle, x, y, r);
  // inside: the saw hall seen from the side — floor, the two guide posts and their
  // head beam, the crank pit; the moving frame, log and crank are live
  const fl = y + 26;
  const floor = polyPath([
    { x: x - 64, y: fl },
    { x: x + 64, y: fl },
    { x: x + 64, y: fl + 40 },
    { x: x - 64, y: fl + 40 },
  ]);
  g.save();
  g.clip(disc);
  wash(g, floor, C.light, 0.45, mottle, 0);
  for (let i = 0; i < 14; i++) trekSeg(g, { x: x - 66 + i * 10, y: fl + 2 }, { x: x - 72 + i * 10, y: fl + 9 }, 0.8, C.mid, rng, 0.7);
  const pit = new Path2D();
  pit.ellipse(x - 4, y + 45, 19, 15, 0, 0, TAU);
  g.fillStyle = GLAZE;
  g.fill(pit);
  wash(g, pit, C.pale, 0.55, mottle, 1);
  g.restore();
  trekSeg(g, { x: x - 66, y: fl }, { x: x + 66, y: fl }, 1.8, C.ink, rng);
  for (const gx of [x - 30, x + 22]) {
    trekSeg(g, { x: gx, y: y - 56 }, { x: gx, y: fl }, 3.6, C.ink, rng, 1, 0.2);
  }
  trekSeg(g, { x: x - 36, y: y - 54 }, { x: x + 28, y: y - 54 }, 3, C.ink, rng, 1, 0.2);
  // hatching of the hall's back wall
  const wall = polyPath([
    { x: x - 70, y: y - 70 },
    { x: x + 70, y: y - 70 },
    { x: x + 70, y: fl },
    { x: x - 70, y: fl },
  ]);
  g.save();
  g.clip(disc);
  hatch(g, wall, x - 70, y - 70, x + 70, fl, 0, 7, 0.7, C.light, rng, 0.45);
  g.restore();
  // banners
  banner(g, rng, mottle, x, y - r - 3, 132, 'C. CORNELISZ.');
  banner(g, rng, mottle, x, y + r + 5, 112, 'ANNO 1594');
}

function banner(g, rng, mottle, cx, cy, w, text) {
  const h = 22;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const body = new Path2D();
  body.moveTo(x0, cy - h / 2);
  body.quadraticCurveTo(cx, cy - h / 2 - 5, x1, cy - h / 2);
  body.lineTo(x1, cy + h / 2);
  body.quadraticCurveTo(cx, cy + h / 2 - 5, x0, cy + h / 2);
  body.closePath();
  // curled ends
  for (const s of [-1, 1]) {
    const ex = s < 0 ? x0 : x1;
    const end = polyPath([
      { x: ex, y: cy - h / 2 + 5 },
      { x: ex + s * 18, y: cy - h / 2 + 7 },
      { x: ex + s * 11, y: cy + 2 },
      { x: ex + s * 18, y: cy + h / 2 + 6 },
      { x: ex, y: cy + h / 2 + 4 },
    ]);
    g.save();
    g.fillStyle = GLAZE;
    g.fill(end);
    g.restore();
    wash(g, end, C.light, 0.6, mottle, 0);
    g.save();
    g.strokeStyle = C.ink;
    g.lineWidth = 1.4;
    g.stroke(end);
    g.restore();
  }
  g.save();
  g.fillStyle = GLAZE;
  g.fill(body);
  g.restore();
  wash(g, body, C.pale, 0.35, mottle, 0);
  g.save();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.6;
  g.stroke(body);
  g.fillStyle = C.ink;
  g.font = `400 14px ${FONT_ENGRAVING}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, cx, cy - 1);
  g.restore();
}

let FONT_ENGRAVING = '"IM Fell English", Georgia, serif';

// -----------------------------------------------------------------------------
// tiles: cut the picture into 8x8 tiles slightly out of register
// -----------------------------------------------------------------------------
function bakePicture(kit) {
  return kit.bake('dutch_picture_v1', P, P, (g, rng) => {
    const raw = kit.createCanvas(P, P);
    const r = raw.getContext('2d');
    paintPicture(kit, r, rng);
    // corner motifs where four tiles meet on white glaze
    const img = r.getImageData(0, 0, P, P).data;
    for (let jy = 1; jy < 8; jy++) {
      for (let jx = 1; jx < 8; jx++) {
        const X = jx * TILE;
        const Y = jy * TILE;
        let ink = 0;
        let maxInk = 0;
        let n = 0;
        for (let yy = Y - 22; yy <= Y + 22; yy += 2) {
          for (let xx = X - 22; xx <= X + 22; xx += 2) {
            const i = (yy * P + xx) * 4;
            const lum = (img[i] * 0.3 + img[i + 1] * 0.59 + img[i + 2] * 0.11) / 255;
            const k = clamp(0.94 - lum, 0, 1);
            ink += k;
            if (k > maxInk) maxInk = k;
            n++;
          }
        }
        if (ink / n < 0.045 && maxInk < 0.45) cornerMotif(r, X, Y, rng);
      }
    }
    // tiles were painted and fired one by one: offset + slight value shift
    g.fillStyle = GLAZE;
    g.fillRect(0, 0, P, P);
    for (let ty = 0; ty < 8; ty++) {
      for (let tx = 0; tx < 8; tx++) {
        const ox = (rng() - 0.5) * 2.4;
        const oy = (rng() - 0.5) * 2.4;
        g.save();
        g.beginPath();
        g.rect(tx * TILE, ty * TILE, TILE, TILE);
        g.clip();
        g.drawImage(raw, tx * TILE, ty * TILE, TILE, TILE, tx * TILE + ox, ty * TILE + oy, TILE, TILE);
        // firing: some tiles a touch paler (cobalt burnt out), some deeper
        const v = rng();
        if (v < 0.35) {
          g.fillStyle = `rgba(244,241,234,${0.06 + rng() * 0.08})`;
          g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        } else if (v > 0.8) {
          g.globalCompositeOperation = 'multiply';
          g.fillStyle = `rgba(214,222,242,${0.25 + rng() * 0.2})`;
          g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        }
        g.restore();
      }
    }
    // soften: cobalt melts a little into the glaze when fired
    const soft = kit.createCanvas(P, P);
    const s = soft.getContext('2d');
    s.filter = 'blur(0.7px)';
    s.drawImage(g.canvas, 0, 0);
    g.globalAlpha = 0.55;
    g.drawImage(soft, 0, 0);
    g.globalAlpha = 1;
  });
}

/** glaze tone (multiplied over everything, incl. the live parts) */
function bakeTone(kit) {
  return kit.bake('dutch_tone_v1', P, P, (g, rng) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, P, P);
    for (let ty = 0; ty < 8; ty++) {
      for (let tx = 0; tx < 8; tx++) {
        const warm = rng();
        const r = 255;
        const gg = Math.round(254 - warm * 4);
        const b = Math.round(251 - warm * 9 + rng() * 4);
        g.fillStyle = `rgb(${r},${gg},${b})`;
        g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        // glaze pooling: thicker glaze toward the centre, thinner (darker, warmer) at the rim
        const gr = g.createRadialGradient(tx * TILE + 62, ty * TILE + 62, 30, tx * TILE + 62, ty * TILE + 62, 92);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(1, `rgba(228,224,212,${0.12 + rng() * 0.12})`);
        g.fillStyle = gr;
        g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        // orange-peel unevenness
        for (let i = 0; i < 26; i++) {
          const x = tx * TILE + rng() * TILE;
          const y = ty * TILE + rng() * TILE;
          const rr = 6 + rng() * 22;
          const gb = g.createRadialGradient(x, y, 0, x, y, rr);
          gb.addColorStop(0, `rgba(230,230,224,${0.08 + rng() * 0.1})`);
          gb.addColorStop(1, 'rgba(230,230,224,0)');
          g.fillStyle = gb;
          g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        }
      }
    }
  });
}

/** joints, bevels, reflections, crazing, pin-holes, chips (drawn over everything) */
function bakeGlaze(kit) {
  return kit.bake('dutch_glaze_v1', P, P, (g, rng) => {
    // per-tile bevel + gloss
    for (let ty = 0; ty < 8; ty++) {
      for (let tx = 0; tx < 8; tx++) {
        const x0 = tx * TILE;
        const y0 = ty * TILE;
        // pillowed edges: light top-left, shade bottom-right
        g.fillStyle = 'rgba(255,255,255,0.32)';
        g.fillRect(x0 + 2, y0 + 2, TILE - 4, 1);
        g.fillRect(x0 + 2, y0 + 2, 1, TILE - 4);
        g.fillStyle = 'rgba(40,46,80,0.10)';
        g.fillRect(x0 + 2, y0 + TILE - 3.5, TILE - 4, 1.5);
        g.fillRect(x0 + TILE - 3.5, y0 + 2, 1.5, TILE - 4);
        const e = g.createLinearGradient(x0, y0, x0 + 9, y0);
        e.addColorStop(0, 'rgba(70,60,40,0.10)');
        e.addColorStop(1, 'rgba(70,60,40,0)');
        g.fillStyle = e;
        g.fillRect(x0, y0, 9, TILE);
        // window reflection on the glossy glaze (each tile a little tilted)
        const hx = x0 + 26 + (rng() - 0.5) * 12;
        const hy = y0 + 22 + (rng() - 0.5) * 12;
        const gl = g.createRadialGradient(hx, hy, 0, hx, hy, 46);
        gl.addColorStop(0, `rgba(255,255,255,${0.16 + rng() * 0.08})`);
        gl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gl;
        g.fillRect(x0, y0, TILE, TILE);
        g.save();
        g.translate(hx, hy);
        g.rotate(-0.5 + (rng() - 0.5) * 0.2);
        g.fillStyle = `rgba(255,255,255,${0.22 + rng() * 0.12})`;
        g.beginPath();
        g.ellipse(0, 0, 11, 2.4, 0, 0, TAU);
        g.fill();
        g.beginPath();
        g.ellipse(4, 6, 6, 1.4, 0, 0, TAU);
        g.fill();
        g.restore();
        // crazing (craquelure)
        const nCr = Math.floor(rng() * rng() * 9);
        g.strokeStyle = 'rgba(92,86,78,0.16)';
        g.lineWidth = 0.6;
        for (let c = 0; c < nCr; c++) {
          let x = x0 + rng() * TILE;
          let y = y0 + rng() * TILE;
          let a = rng() * TAU;
          g.beginPath();
          g.moveTo(x, y);
          const steps = 6 + Math.floor(rng() * 14);
          for (let s = 0; s < steps; s++) {
            a += (rng() - 0.5) * 1.1;
            x += Math.cos(a) * (3 + rng() * 6);
            y += Math.sin(a) * (3 + rng() * 6);
            if (x < x0 + 3 || x > x0 + TILE - 3 || y < y0 + 3 || y > y0 + TILE - 3) break;
            g.lineTo(x, y);
            if (rng() < 0.12) {
              g.moveTo(x, y);
              g.lineTo(x + Math.cos(a + 1.4) * 6, y + Math.sin(a + 1.4) * 6);
              g.moveTo(x, y);
            }
          }
          g.stroke();
        }
        // pin-holes and kiln specks
        const nP = Math.floor(rng() * 5);
        for (let p = 0; p < nP; p++) {
          const x = x0 + 6 + rng() * (TILE - 12);
          const y = y0 + 6 + rng() * (TILE - 12);
          g.fillStyle = 'rgba(120,104,80,0.35)';
          g.beginPath();
          g.arc(x, y, 0.6 + rng() * 0.8, 0, TAU);
          g.fill();
        }
        if (rng() < 0.3) {
          g.fillStyle = 'rgba(30,40,90,0.5)';
          g.beginPath();
          g.arc(x0 + rng() * TILE, y0 + rng() * TILE, 0.7 + rng() * 0.6, 0, TAU);
          g.fill();
        }
      }
    }
    // grout joints (irregular, hand-cut tiles)
    for (let k = 0; k <= 8; k++) {
      const c = k * TILE;
      for (const vertical of [true, false]) {
        g.beginPath();
        const pts = [];
        for (let s = 0; s <= 40; s++) {
          const u = s * 25;
          const w = 0.9 + rng() * 0.8;
          pts.push({ u, w });
        }
        if (vertical) {
          g.moveTo(c - pts[0].w, 0);
          for (const p of pts) g.lineTo(c - p.w, p.u);
          for (let i = pts.length - 1; i >= 0; i--) g.lineTo(c + pts[i].w * 0.9, pts[i].u);
        } else {
          g.moveTo(0, c - pts[0].w);
          for (const p of pts) g.lineTo(p.u, c - p.w);
          for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i].u, c + pts[i].w * 0.9);
        }
        g.closePath();
        g.fillStyle = '#dedad0';
        g.fill();
        g.strokeStyle = 'rgba(80,74,64,0.3)';
        g.lineWidth = 0.6;
        g.stroke();
      }
    }
    // grout grain
    for (let i = 0; i < 2200; i++) {
      const k = 1 + Math.floor(rng() * 7);
      const along = rng() * P;
      const off = (rng() - 0.5) * 3;
      g.fillStyle = rng() < 0.5 ? 'rgba(150,140,120,0.35)' : 'rgba(255,255,255,0.35)';
      if (rng() < 0.5) g.fillRect(k * TILE + off, along, 1, 1);
      else g.fillRect(along, k * TILE + off, 1, 1);
    }
    // chipped corners: buff earthenware body shows
    for (const [jx, jy, q] of [
      [1, 7, 0],
      [7, 6, 2],
      [3, 1, 1],
    ]) {
      const X = jx * TILE;
      const Y = jy * TILE;
      const sx = q === 0 || q === 3 ? 1 : -1;
      const sy = q === 0 || q === 1 ? 1 : -1;
      const pts = [
        { x: X + sx * 2, y: Y + sy * 2 },
        { x: X + sx * (11 + rng() * 6), y: Y + sy * 2 },
        { x: X + sx * (8 + rng() * 3), y: Y + sy * (5 + rng() * 3) },
        { x: X + sx * (4 + rng() * 3), y: Y + sy * (10 + rng() * 5) },
        { x: X + sx * 2, y: Y + sy * (12 + rng() * 4) },
      ];
      const p = polyPath(pts);
      g.fillStyle = '#d7b98f';
      g.fill(p);
      g.strokeStyle = 'rgba(110,80,50,0.6)';
      g.lineWidth = 0.9;
      g.stroke(p);
      g.fillStyle = 'rgba(160,120,80,0.35)';
      for (let i = 0; i < 12; i++) g.fillRect(X + sx * (3 + rng() * 8), Y + sy * (3 + rng() * 8), 1, 1);
    }
  });
}

// -----------------------------------------------------------------------------
// live parts
// -----------------------------------------------------------------------------
const W_MILL = TAU / 4; // 15 rpm
const W_PAL = TAU / 3.4;

function gustInt(T, t0) {
  // extra rotation (rad) added by the bar-3 gust, smooth speed bump starting at t0
  return 3.2 * sstep5(t0, t0 + 2.4, T);
}
function millAngle(T) {
  return 0.35 - (W_MILL * T + gustInt(T, 3.75));
}
function palAngle(T) {
  return 0.1 - (W_PAL * T + gustInt(T, 3.6) * 0.9);
}

function inkLine(ctx, x0, y0, x1, y1, w, color = C.ink) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** four old-Dutch lattice sails, counter-clockwise; cloth on the trailing lattice */
function drawSails(ctx, hub, R, kx, ang, s = 1, cloth = 0.92) {
  const W = R * 0.21;
  const lead = W * 0.24;
  const trail = W * 0.76;
  const r0 = R * 0.19;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 4; i++) {
    const a = ang + (i * Math.PI) / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const nx = -sa;
    const ny = ca;
    const pt = (r, w) => ({ x: hub.x + (ca * r + nx * w) * kx, y: hub.y + (sa * r + ny * w) });
    // sail cloth (slightly bellied)
    const c0 = pt(r0 + 3, 2);
    const c1 = pt(R * cloth, 2);
    const c2 = pt(R * cloth, trail - 1);
    const c3 = pt(r0 + 3, trail - 1);
    const belly = pt(R * (cloth + 0.19) / 2, trail + 3);
    ctx.beginPath();
    ctx.moveTo(c0.x, c0.y);
    ctx.lineTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.quadraticCurveTo(belly.x, belly.y, c3.x, c3.y);
    ctx.closePath();
    ctx.fillStyle = GLAZE;
    ctx.fill();
    ctx.fillStyle = 'rgba(125,152,207,0.42)';
    ctx.fill();
    // shading along the stock
    const d0 = pt(r0 + 3, 2);
    const d1 = pt(R * cloth, 2);
    const d2 = pt(R * cloth, trail * 0.35);
    const d3 = pt(r0 + 3, trail * 0.35);
    ctx.fillStyle = 'rgba(44,84,168,0.28)';
    ctx.beginPath();
    ctx.moveTo(d0.x, d0.y);
    ctx.lineTo(d1.x, d1.y);
    ctx.lineTo(d2.x, d2.y);
    ctx.lineTo(d3.x, d3.y);
    ctx.closePath();
    ctx.fill();
    // lattice: sail bars across, laths along
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    const nb = Math.round(16 * s + 2);
    for (let k = 0; k <= nb; k++) {
      const r = r0 + ((R - r0) * k) / nb;
      const p0 = pt(r, -lead);
      const p1 = pt(r, trail);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    }
    for (const w of [-lead, trail * 0.5]) {
      const p0 = pt(r0, w);
      const p1 = pt(R, w);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    }
    ctx.stroke();
    ctx.lineWidth = 1.5 * s;
    const e0 = pt(r0, trail);
    const e1 = pt(R, trail);
    inkLine(ctx, e0.x, e0.y, e1.x, e1.y, 1.6 * s, C.ink);
    // stock (whip), tapering
    const s0 = pt(0, 0);
    const s1 = pt(R * 1.02, 0);
    ctx.strokeStyle = 'rgba(125,152,207,0.6)';
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    ctx.moveTo(s0.x, s0.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.stroke();
    const sm = pt(R * 0.55, 0);
    inkLine(ctx, s0.x, s0.y, sm.x, sm.y, 4.2 * s, C.dark);
    inkLine(ctx, sm.x, sm.y, s1.x, s1.y, 2.8 * s, C.dark);
  }
  // shaft head
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.ellipse(hub.x, hub.y, 7 * s * kx, 7 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.pale;
  ctx.beginPath();
  ctx.ellipse(hub.x - 1.5 * s, hub.y - 1.5 * s, 2.2 * s, 2.2 * s, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawTinySails(ctx, x, y, s, ang) {
  ctx.save();
  ctx.strokeStyle = C.ink;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = ang + (i * Math.PI) / 2;
    const ex = x + Math.cos(a) * 15 * s * 0.85;
    const ey = y + Math.sin(a) * 15 * s;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineWidth = 2.4 * s;
    ctx.strokeStyle = 'rgba(44,84,168,0.65)';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 5 * s * 0.85 - Math.sin(a) * 1.6 * s, y + Math.sin(a) * 5 * s + Math.cos(a) * 1.6 * s);
    ctx.lineTo(ex - Math.sin(a) * 1.6 * s, ey + Math.cos(a) * 1.6 * s);
    ctx.stroke();
    ctx.strokeStyle = C.ink;
  }
  ctx.restore();
}

function drawGust(ctx, T, thumb) {
  // brushed wind lines blowing in from the west; on bar 3 a gust sweeps across to the mills
  if (thumb) return;
  const blow = sstep(3.2, 3.65, T) * (1 - sstep(5.3, 6.3, T));
  ctx.save();
  ctx.lineCap = 'round';
  const streams = [
    [262, 0, 30],
    [300, 1, 60],
    [232, 2, 30],
    [330, 3, 40],
    [205, 4, 80],
    [280, 5, 110],
  ];
  for (const [y0, i, xs] of streams) {
    const calm = i < 2 ? 0.45 : 0;
    const amt = Math.max(blow, calm);
    if (amt <= 0.01) continue;
    const L = 110 + (480 + i * 25) * blow;
    const path = (u) => ({
      x: xs + u * L,
      y: y0 + Math.sin(u * 6.2 - T * 5 + i * 1.3) * (2.5 + 4 * blow) + u * u * 70 * blow,
    });
    const nSeg = blow > 0.05 ? 4 : 2;
    for (let k = 0; k < nSeg; k++) {
      const head = fract(T * (0.45 + 0.75 * blow) + k / nSeg + i * 0.17);
      const u0 = Math.max(0, head - 0.2);
      const fade = Math.sin(Math.PI * head);
      ctx.globalAlpha = amt * (0.55 + 0.4 * blow) * fade;
      for (let q = 0; q < 7; q++) {
        const p0 = path(u0 + ((head - u0) * q) / 7);
        const p1 = path(u0 + ((head - u0) * (q + 1)) / 7);
        ctx.strokeStyle = q > 4 ? C.ink : C.mid;
        ctx.lineWidth = 0.6 + q * (0.3 + 0.28 * blow);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      // the head of a gust stroke curls over, as wind is drawn in prints
      if (blow > 0.2) {
        const h = path(head);
        const r = 4 + 2.5 * blow;
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let q = 0; q <= 10; q++) {
          const a = -Math.PI / 2 + (q / 10) * Math.PI * 1.6;
          const rr = r * (1 - q / 14);
          const px = h.x + Math.cos(a) * rr;
          const py = h.y + r + Math.sin(a) * rr;
          if (q === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawRoundelLive(ctx, palAng, T) {
  // Corneliszoon's crank: rotation -> up/down stroke of the frame saw, log fed in steps
  const { x, y } = MED;
  const phi = -palAng * 5.2; // crankshaft geared up from the sails
  const C0 = { x: x - 4, y: y + 45 };
  const rc = 8;
  const Lr = 26;
  const pin = { x: C0.x + Math.cos(phi) * rc, y: C0.y + Math.sin(phi) * rc };
  const att = { x: C0.x, y: pin.y - Math.sqrt(Lr * Lr - (pin.x - C0.x) * (pin.x - C0.x)) };
  const fb = att.y; // frame bottom
  const ft = fb - 58;
  const strokes = phi / TAU;
  const fr = strokes - Math.floor(strokes);
  const feed = (Math.floor(strokes) + sstep(0.55, 0.85, fr)) * 2.4;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, MED.r - 11, 0, TAU);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // log on the carriage (moves right in ratchet steps)
  const ly = y - 12;
  const lr = 8.5;
  const sawX = x - 4;
  ctx.fillStyle = GLAZE;
  ctx.fillRect(x - 76, ly - lr, 152, lr * 2);
  ctx.fillStyle = 'rgba(117,144,202,0.5)';
  ctx.fillRect(x - 76, ly - lr, sawX - 14 - (x - 76), lr * 2);
  ctx.fillStyle = 'rgba(176,193,229,0.5)';
  ctx.fillRect(sawX - 14, ly - lr, 90, lr * 2);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.2;
  // bark marks on the uncut part, shifting with the feed
  ctx.beginPath();
  for (let k = 0; k < 9; k++) {
    const bx = x - 78 + mod(k * 11 + feed, 99);
    if (bx > sawX - 16) continue;
    ctx.moveTo(bx, ly - lr + 2);
    ctx.quadraticCurveTo(bx + 4, ly - 1, bx + 1, ly + lr - 2);
  }
  ctx.stroke();
  // kerfs: the cut part falls apart into boards
  ctx.beginPath();
  for (const dy of [-4.2, 0, 4.2]) {
    ctx.moveTo(sawX - 12, ly + dy);
    ctx.lineTo(x + 76, ly + dy);
  }
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - 76, ly - lr);
  ctx.lineTo(x + 76, ly - lr);
  ctx.moveTo(x - 76, ly + lr);
  ctx.lineTo(x + 76, ly + lr);
  ctx.stroke();
  // carriage rollers
  for (let k = 0; k < 6; k++) {
    const rx = x - 70 + k * 26 + mod(feed, 26);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(rx, ly + lr + 2.5, 2.2, 0, TAU);
    ctx.fill();
  }
  // saw frame (gate) with three blades
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 3;
  ctx.strokeRect(sawX - 18, ft, 36, fb - ft);
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = C.ink;
  ctx.beginPath();
  for (const bx of [sawX - 9, sawX, sawX + 9]) {
    ctx.moveTo(bx, ft + 2);
    ctx.lineTo(bx, fb - 2);
    for (let ty = ft + 5; ty < fb - 3; ty += 4.5) {
      ctx.moveTo(bx, ty);
      ctx.lineTo(bx - 2, ty + 2.2);
    }
  }
  ctx.stroke();
  // sawdust falling on the down-stroke
  const down = Math.sin(phi);
  if (down > 0.1) {
    ctx.fillStyle = C.mid;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.arc(sawX - 12 + k * 6, ly + lr + 5 + down * 5 + (k % 2) * 2, 1.0, 0, TAU);
      ctx.fill();
    }
  }
  // connecting rod (pitman) and crank
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(att.x, att.y);
  ctx.lineTo(pin.x, pin.y);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(C0.x, C0.y, rc + 4, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(C0.x, C0.y);
  ctx.lineTo(pin.x, pin.y);
  ctx.stroke();
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.arc(C0.x, C0.y, 2.6, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pin.x, pin.y, 2.3, 0, TAU);
  ctx.fill();
  // rotation arrow (engraver's convention)
  ctx.strokeStyle = C.mid;
  ctx.lineWidth = 1.2;
  const ar = rc + 9;
  ctx.beginPath();
  ctx.arc(C0.x, C0.y, ar, -2.6, -1.4);
  ctx.stroke();
  const ah = { x: C0.x + Math.cos(-1.4) * ar, y: C0.y + Math.sin(-1.4) * ar };
  ctx.beginPath();
  ctx.moveTo(ah.x, ah.y);
  ctx.lineTo(ah.x - 4.5, ah.y - 2.5);
  ctx.moveTo(ah.x, ah.y);
  ctx.lineTo(ah.x - 3, ah.y + 3.5);
  ctx.stroke();
  ctx.restore();
}

function drawScoopWheel(kit, ctx, wang, T, thumb) {
  const { x, y, R } = WHEEL;
  const n = 20;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // dark inside of the wheel pit behind the wheel
  ctx.fillStyle = 'rgba(38,78,165,0.35)';
  ctx.beginPath();
  ctx.arc(x, y, R + 3, 0, TAU);
  ctx.fill();
  // race (curved masonry trough) hugging the lower half
  ctx.strokeStyle = 'rgba(20,45,132,0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, R + 4, Math.PI * 0.02, Math.PI * 0.9);
  ctx.stroke();
  // water held between paddles, climbing from the ditch (left, low) to the basin (right, high)
  ctx.fillStyle = 'rgba(38,78,165,0.62)';
  ctx.beginPath();
  ctx.moveTo(x - R - 2, DITCH_Y);
  for (let k = 0; k <= 22; k++) {
    const a = Math.PI * 0.9 - (k / 22) * Math.PI * 0.88;
    ctx.lineTo(x + Math.cos(a) * (R + 3), y + Math.sin(a) * (R + 3));
  }
  const steps = 8;
  for (let k = steps; k >= 0; k--) {
    const u = k / steps;
    const sx = lerp(x - R - 2, x + R + 2, u);
    const sy = lerp(DITCH_Y, BASIN_Y + 1, Math.pow(u, 1.15)) + Math.sin(T * 9 + k * 2.1) * 1.2;
    ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();
  // hub ring & arms
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(x, y, R * 0.56, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = wang + (k / 6) * TAU;
    ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
    ctx.lineTo(x + Math.cos(a) * R * 0.56, y + Math.sin(a) * R * 0.56);
  }
  ctx.stroke();
  // broad paddle boards (scheplepels), raked a little
  for (let k = 0; k < n; k++) {
    const a = wang + (k / n) * TAU;
    const r0 = R * 0.52;
    const r1 = R + 1;
    const tilt = -0.16;
    const w = 3.2;
    const ca0 = Math.cos(a);
    const sa0 = Math.sin(a);
    const ca1 = Math.cos(a + tilt);
    const sa1 = Math.sin(a + tilt);
    ctx.beginPath();
    ctx.moveTo(x + ca0 * r0 - sa0 * w, y + sa0 * r0 + ca0 * w);
    ctx.lineTo(x + ca1 * r1 - sa1 * w, y + sa1 * r1 + ca1 * w);
    ctx.lineTo(x + ca1 * r1 + sa1 * w, y + sa1 * r1 - ca1 * w);
    ctx.lineTo(x + ca0 * r0 + sa0 * w, y + sa0 * r0 - ca0 * w);
    ctx.closePath();
    ctx.fillStyle = GLAZE;
    ctx.fill();
    ctx.fillStyle = 'rgba(117,144,202,0.55)';
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // hub
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.arc(x, y, 6.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.pale;
  ctx.beginPath();
  ctx.arc(x - 1.5, y - 1.5, 2, 0, TAU);
  ctx.fill();
  // water streaming off the paddles that rise out on the right
  ctx.fillStyle = C.mid;
  for (let k = 0; k < n; k++) {
    const a = mod(wang + (k / n) * TAU, TAU);
    if (a > Math.PI * 1.6 && a < Math.PI * 1.98) {
      const p = { x: x + Math.cos(a - 0.16) * R, y: y + Math.sin(a - 0.16) * R };
      for (let q = 0; q < 2; q++) {
        const ph = fract(T * 2.6 + k * 0.37 + q * 0.5);
        const dy = ph * ph * 50;
        if (p.y + dy < BASIN_Y - 1) {
          ctx.beginPath();
          ctx.ellipse(p.x + 3, p.y + dy, 1.5, 2.8, 0, 0, TAU);
          ctx.fill();
        }
      }
    }
  }
  // spill over the lip into the basin
  ctx.strokeStyle = 'rgba(20,45,132,0.85)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 6; k++) {
    const ph = fract(T * 2.2 + k / 6);
    ctx.beginPath();
    ctx.moveTo(x + R - 2, BASIN_Y - 3 + k * 0.5);
    ctx.quadraticCurveTo(x + R + 8 + ph * 10, BASIN_Y - 6, x + R + 18 + ph * 30, BASIN_Y + Math.sin(ph * 6) * 1.2);
    ctx.stroke();
  }
  // ripples in the low ditch where paddles dip in
  ctx.strokeStyle = 'rgba(20,45,132,0.6)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    const ph = fract(T * 0.9 + k / 3);
    ctx.globalAlpha = 1 - ph;
    ctx.beginPath();
    ctx.ellipse(x - R * 0.85, DITCH_Y + 4, 6 + ph * 30, 1.5 + ph * 3, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function bakeWheelFront(kit) {
  // housing posts, hood and the low race wall in front of the wheel
  return kit.bake('dutch_wheelfront_v1', P, P, (g, rng) => {
    const M = makeMottle(kit, 'dutch_mottle', C.ink);
    const mottle = g.createPattern(M, 'repeat');
    const { x, y, R } = WHEEL;
    g.lineCap = 'round';
    // hood over the top (planked casing)
    const hood = new Path2D();
    hood.arc(x, y, R + 14, Math.PI * 1.0, Math.PI * 2.0);
    hood.arc(x, y, R + 4, Math.PI * 2.0, Math.PI * 1.0, true);
    hood.closePath();
    g.fillStyle = GLAZE;
    g.fill(hood);
    wash(g, hood, C.mid, 0.75, mottle, 1);
    for (let k = 0; k <= 14; k++) {
      const a = Math.PI * 1.0 + (k / 14) * Math.PI;
      trekSeg(g, { x: x + Math.cos(a) * (R + 4), y: y + Math.sin(a) * (R + 4) }, { x: x + Math.cos(a) * (R + 14), y: y + Math.sin(a) * (R + 14) }, 1, C.dark, rng, 0.85, 0.1);
    }
    const arcPts = (rr, a0, a1) => {
      const out = [];
      for (let k = 0; k <= 20; k++) {
        const a = a0 + ((a1 - a0) * k) / 20;
        out.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
      }
      return out;
    };
    trek(g, arcPts(R + 14, Math.PI * 1.0, Math.PI * 2.0), 2.4, C.dark, rng, 1, 0.1);
    trek(g, arcPts(R + 4, Math.PI * 1.0, Math.PI * 2.0), 1.4, C.dark, rng, 1, 0.1);
    // posts
    for (const px of [x - R - 12, x + R + 12]) {
      trekSeg(g, { x: px, y: y - 4 }, { x: px, y: 688 }, 5, C.dark, rng, 1, 0.3);
    }
    // low race wall (brick) in front
    const wall = polyPath([
      { x: x - R - 14, y: 678 },
      { x: x + R + 12, y: 676 },
      { x: x + R + 12, y: 690 },
      { x: x - R - 14, y: 690 },
    ]);
    g.fillStyle = GLAZE;
    g.fill(wall);
    wash(g, wall, C.light, 0.55, mottle, 1);
    for (let yy = 681; yy < 690; yy += 4.5) trekSeg(g, { x: x - R - 14, y: yy }, { x: x + R + 12, y: yy - 0.5 }, 0.8, C.mid, rng, 0.7, 0.2);
    trekSeg(g, { x: x - R - 14, y: 677 }, { x: x + R + 12, y: 675 }, 1.6, C.ink, rng);
  });
}

function bakeBoat(kit) {
  // a "kaag": round Dutch hull, leeboard, spritsail; sailing right before the wind
  return kit.bake('dutch_boat_v1', 260, 230, (g, rng) => {
    const M = makeMottle(kit, 'dutch_mottle', C.ink);
    const mottle = g.createPattern(M, 'repeat');
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const bx = 130;
    const by = 190; // waterline centre
    // mast & sprit & sail
    const mastX = bx + 22;
    const mastTop = 30;
    const sail = new Path2D();
    sail.moveTo(mastX - 2, mastTop + 10);
    sail.lineTo(bx - 64, mastTop - 8);
    sail.quadraticCurveTo(bx - 56, 110, bx - 70, by - 26);
    sail.lineTo(mastX - 2, by - 22);
    sail.closePath();
    g.fillStyle = GLAZE;
    g.fill(sail);
    wash(g, sail, C.pale, 0.55, mottle, 1.5);
    const shade = new Path2D();
    shade.moveTo(mastX - 2, mastTop + 10);
    shade.lineTo(mastX - 2, by - 22);
    shade.lineTo(mastX - 26, by - 23);
    shade.quadraticCurveTo(mastX - 14, 100, mastX - 18, mastTop + 9);
    shade.closePath();
    wash(g, shade, C.light, 0.5, mottle, 0);
    for (let k = 1; k < 6; k++) trekSeg(g, { x: mastX - 2, y: mastTop + 10 + k * 22 }, { x: bx - 60 - k * 1.5, y: mastTop - 8 + k * 25 }, 0.8, C.mid, rng, 0.6, 0.8);
    trek(g, [{ x: mastX - 2, y: mastTop + 10 }, { x: bx - 64, y: mastTop - 8 }], 1.4, C.ink, rng);
    trek(g, quad({ x: bx - 64, y: mastTop - 8 }, { x: bx - 56, y: 110 }, { x: bx - 70, y: by - 26 }, 12), 1.6, C.ink, rng);
    trek(g, [{ x: bx - 70, y: by - 26 }, { x: mastX - 2, y: by - 22 }], 1.3, C.ink, rng);
    // sprit (diagonal spar)
    trekSeg(g, { x: mastX - 1, y: by - 40 }, { x: bx - 66, y: mastTop - 10 }, 2.4, C.dark, rng);
    trekSeg(g, { x: mastX, y: by - 12 }, { x: mastX, y: mastTop - 8 }, 3, C.dark, rng);
    // pennant
    trek(g, quad({ x: mastX, y: mastTop - 8 }, { x: mastX + 14, y: mastTop - 12 }, { x: mastX + 30, y: mastTop - 6 }, 8), 2.2, C.ink, rng);
    // stay
    trekSeg(g, { x: mastX, y: mastTop - 4 }, { x: bx + 92, y: by - 26 }, 0.8, C.ink, rng);
    // hull
    const hull = new Path2D();
    hull.moveTo(bx - 92, by - 30);
    hull.quadraticCurveTo(bx - 90, by + 4, bx - 40, by + 8);
    hull.lineTo(bx + 50, by + 8);
    hull.quadraticCurveTo(bx + 92, by + 4, bx + 98, by - 34);
    hull.quadraticCurveTo(bx + 10, by - 16, bx - 92, by - 30);
    hull.closePath();
    g.fillStyle = GLAZE;
    g.fill(hull);
    wash(g, hull, C.wash, 0.6, mottle, 1.5);
    hatch(g, hull, bx - 95, by - 36, bx + 100, by + 10, 0.05, 4, 1, C.ink, rng, 0.55);
    trek(g, quad({ x: bx - 92, y: by - 30 }, { x: bx + 10, y: by - 16 }, { x: bx + 98, y: by - 34 }, 16), 2.2, C.dark, rng);
    trek(g, cubic({ x: bx - 92, y: by - 30 }, { x: bx - 90, y: by + 4 }, { x: bx - 40, y: by + 8 }, { x: bx + 50, y: by + 8 }, 16), 1.8, C.ink, rng);
    trek(g, quad({ x: bx + 50, y: by + 8 }, { x: bx + 92, y: by + 4 }, { x: bx + 98, y: by - 34 }, 10), 1.8, C.ink, rng);
    // gunwale strake
    trek(g, quad({ x: bx - 88, y: by - 22 }, { x: bx + 10, y: by - 8 }, { x: bx + 94, y: by - 26 }, 16), 1.2, C.ink, rng, 0.8);
    // leeboard (pear-shaped)
    const lb = new Path2D();
    lb.moveTo(bx + 4, by - 16);
    lb.lineTo(bx + 26, by - 14);
    lb.quadraticCurveTo(bx + 36, by + 20, bx + 18, by + 26);
    lb.quadraticCurveTo(bx + 2, by + 22, bx + 4, by - 16);
    lb.closePath();
    g.fillStyle = GLAZE;
    g.fill(lb);
    wash(g, lb, C.mid, 0.7, mottle, 1.4);
    g.strokeStyle = C.dark;
    g.lineWidth = 1.4;
    g.stroke(lb);
    // skipper at the tiller
    trekSeg(g, { x: bx - 70, y: by - 30 }, { x: bx - 70, y: by - 52 }, 6, C.ink, rng);
    g.fillStyle = C.ink;
    g.beginPath();
    g.arc(bx - 70, by - 57, 4.5, 0, TAU);
    g.fill();
    trekSeg(g, { x: bx - 78, y: by - 61 }, { x: bx - 62, y: by - 61 }, 2.2, C.dark, rng);
    trekSeg(g, { x: bx - 70, y: by - 44 }, { x: bx - 88, y: by - 36 }, 1.6, C.ink, rng);
    // reflection strokes
    for (let k = 0; k < 6; k++) {
      trekSeg(g, { x: bx - 80 + rng() * 20, y: by + 12 + k * 4 }, { x: bx + 40 + rng() * 40, y: by + 12 + k * 4 }, 1.2, C.light, rng, 0.7, 1);
    }
  });
}

function drawLog(ctx, T, palAng) {
  // the sawn log leaves the saw through the wing on its carriage, a step per stroke:
  // already cut into boards (kerfs along it), bark left on the outer slabs
  const strokes = (-palAng * 5.2) / TAU;
  const fr = strokes - Math.floor(strokes);
  const feed = clamp((Math.floor(strokes) + sstep(0.55, 0.85, fr)) * 0.5 + 8, 0, 40);
  const bEnd = 118 + feed;
  const a = 58;
  const h = 13;
  const r = 9;
  const p0 = pq(a, 90, h);
  const p1 = pq(a, bEnd, h);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // carriage rail
  const q1 = pq(a, 168, h);
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y + r + 2);
  ctx.lineTo(q1.x, q1.y + r + 2);
  ctx.stroke();
  // boards: four horizontal layers, outer ones keep their bark
  const layers = [-r, -r * 0.5, 0, r * 0.5, r];
  for (let L = 0; L < 4; L++) {
    const y0 = layers[L];
    const y1 = layers[L + 1];
    const outer = L === 0 || L === 3;
    const lag = (L % 2) * 1.6; // boards slip a hair apart
    const e0 = pq(a, 90, h);
    const e1 = pq(a, bEnd - lag, h);
    const k0 = outer ? 0.25 * (L === 0 ? 1 : -1) : 0;
    ctx.beginPath();
    ctx.moveTo(e0.x, e0.y + y0 + (L === 0 ? 1.5 : 0));
    ctx.lineTo(e1.x, e1.y + y0 + (L === 0 ? 1.5 : 0) + k0 * 4);
    ctx.lineTo(e1.x, e1.y + y1 - (L === 3 ? 1.5 : 0) + k0 * 4);
    ctx.lineTo(e0.x, e0.y + y1 - (L === 3 ? 1.5 : 0));
    ctx.closePath();
    ctx.fillStyle = GLAZE;
    ctx.fill();
    ctx.fillStyle = outer ? 'rgba(74,110,188,0.62)' : 'rgba(176,193,229,0.55)';
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (outer) {
      // bark texture travelling with the wood
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const bb = bEnd - lag - 3 - k * 4.2;
        if (bb < 92) break;
        const q = pq(a, bb, h);
        const yy = q.y + (L === 0 ? -r + 2 : r - 3);
        ctx.moveTo(q.x, yy);
        ctx.lineTo(q.x + 2.5, yy + 1.2);
      }
      ctx.strokeStyle = C.dark;
      ctx.lineWidth = 0.9;
      ctx.stroke();
    } else {
      // grain lines
      ctx.beginPath();
      const qm0 = pq(a, 94, h);
      const qm1 = pq(a, bEnd - lag - 4, h);
      const ym = (y0 + y1) / 2;
      ctx.moveTo(qm0.x, qm0.y + ym);
      ctx.lineTo(qm1.x, qm1.y + ym);
      ctx.strokeStyle = 'rgba(38,78,165,0.6)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }
  // end grain of the sawn ends
  ctx.strokeStyle = C.dark;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(p1.x + 0.5, p1.y, 3.4, r, 0, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  // sawdust puffing out of the opening on each down-stroke
  const puff = Math.sin(fr * TAU);
  if (puff > 0) {
    const o = pq(48, 90, 4);
    ctx.fillStyle = 'rgba(38,78,165,0.7)';
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.arc(o.x + 2 + k * 3.2 * puff, o.y + 3 - k * 2 * puff + (k % 2) * 2, 1.1 + puff * 0.7, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawDucks(ctx, T, thumb) {
  // a duck and her ducklings paddle along the ring canal
  const tt = thumb ? 4 : T;
  const x0 = 600 - (tt + 8) * 6;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const one = (x, y, s, k) => {
    const bob = Math.sin(tt * 3 + k * 1.3) * 1.2;
    const yy = y + bob;
    // wake
    ctx.strokeStyle = 'rgba(38,78,165,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8 * s, yy + 3 * s);
    ctx.quadraticCurveTo(x + 18 * s, yy + 5 * s, x + 30 * s, yy + 4 * s);
    ctx.moveTo(x + 10 * s, yy + 5.5 * s);
    ctx.quadraticCurveTo(x + 20 * s, yy + 8 * s, x + 28 * s, yy + 8 * s);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.moveTo(x - 9 * s, yy);
    ctx.quadraticCurveTo(x - 8 * s, yy + 5 * s, x + 2 * s, yy + 5 * s);
    ctx.quadraticCurveTo(x + 11 * s, yy + 4 * s, x + 12 * s, yy - 4 * s);
    ctx.quadraticCurveTo(x + 4 * s, yy - 1 * s, x - 2 * s, yy - 2 * s);
    ctx.closePath();
    ctx.fillStyle = GLAZE;
    ctx.fill();
    ctx.fillStyle = 'rgba(117,144,202,0.5)';
    ctx.fill();
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // neck + head + bill
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, yy - 1.5 * s);
    ctx.quadraticCurveTo(x - 6 * s, yy - 6 * s, x - 5 * s, yy - 9 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 5 * s, yy - 10 * s, 3 * s, 0, TAU);
    ctx.fillStyle = C.mid;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 7.5 * s, yy - 10.5 * s);
    ctx.lineTo(x - 12 * s, yy - 9.2 * s);
    ctx.lineWidth = 1.6 * s;
    ctx.stroke();
  };
  one(x0, 912, 1.25, 0);
  one(x0 + 34, 918, 0.7, 1);
  one(x0 + 56, 914, 0.66, 2);
  one(x0 + 78, 920, 0.62, 3);
  ctx.restore();
}

const COUNT = ['EEN', 'TWEE', 'DRIE', 'VIER'];

function drawSawyer(ctx, T, thumb) {
  // plank stack beside the wing; one plank added per bar; the sawyer counts aloud
  const bar = thumb ? 2 : clamp(Math.floor(T / 2), -1, 3);
  const inBar = thumb ? 1 : T - Math.floor(T / 2) * 2;
  const base = pq(-14, 168, -22);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const nStatic = 3;
  const n = nStatic + Math.max(0, bar + 1);
  for (let i = 0; i < n; i++) {
    let slide = 0;
    if (!thumb && i === n - 1 && bar >= 0) slide = (1 - sstep(0, 0.45, inBar)) * 30;
    const y = base.y - i * 3.2;
    const x0 = base.x - 6 + slide;
    const x1 = base.x + 58 + slide;
    ctx.fillStyle = GLAZE;
    ctx.fillRect(x0, y - 3, x1 - x0, 3);
    ctx.fillStyle = 'rgba(125,152,207,0.5)';
    ctx.fillRect(x0, y - 3, x1 - x0, 3);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.9;
    ctx.strokeRect(x0, y - 3, x1 - x0, 3);
  }
  // sawyer (wide breeches, jerkin, flat cap) standing right of the stack
  const fx = base.x + 74;
  const fy = base.y + 2;
  const lift = thumb ? 0.6 : bar >= 0 ? sstep(0.0, 0.25, inBar) * (1 - sstep(1.4, 1.9, inBar)) : 0;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(fx - 3, fy);
  ctx.lineTo(fx - 2, fy - 9);
  ctx.moveTo(fx + 3, fy);
  ctx.lineTo(fx + 2, fy - 9);
  ctx.stroke();
  // breeches
  ctx.fillStyle = 'rgba(44,84,168,0.85)';
  ctx.beginPath();
  ctx.ellipse(fx, fy - 12, 6.5, 5, 0, 0, TAU);
  ctx.fill();
  // jerkin
  ctx.fillStyle = GLAZE;
  ctx.beginPath();
  ctx.moveTo(fx - 5, fy - 15);
  ctx.lineTo(fx - 4, fy - 27);
  ctx.lineTo(fx + 4, fy - 27);
  ctx.lineTo(fx + 5, fy - 15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(125,152,207,0.6)';
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // head + cap
  ctx.fillStyle = GLAZE;
  ctx.beginPath();
  ctx.arc(fx, fy - 31, 4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.dark;
  ctx.beginPath();
  ctx.ellipse(fx, fy - 34.5, 6, 2.2, -0.1, 0, TAU);
  ctx.fill();
  // counting arm: points at the stack, raised on the count
  const sh = { x: fx - 3, y: fy - 25 };
  const hand = { x: sh.x - 9 + lift * 2, y: sh.y + 6 - lift * 16 };
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(fx + 3, fy - 25);
  ctx.lineTo(fx + 7, fy - 16);
  ctx.stroke();
  // banderol with the count
  if (bar >= 0 && !thumb) {
    const word = COUNT[bar];
    const a = thumb ? 1 : sstep(0.0, 0.2, inBar);
    ctx.globalAlpha = a;
    // the banderol floats high above the sawyer (y ≈ 436–456), clear of the rider's
    // head, crest and pole rotor (top ≈ 467) — at bird height the passing spoonbill hid
    // "TWEE" for most of bar 2 — and left of the big mill's sail sweep (x > 416)
    const bx = fx - 22;
    const by = fy - 180;
    ctx.font = `400 18px ${FONT_ENGRAVING}`;
    const w = ctx.measureText(word).width + 20;
    ctx.fillStyle = GLAZE;
    ctx.beginPath();
    ctx.moveTo(bx - w / 2, by - 8);
    ctx.quadraticCurveTo(bx, by - 12, bx + w / 2, by - 8);
    ctx.lineTo(bx + w / 2 + 7, by - 1);
    ctx.lineTo(bx + w / 2, by + 8);
    ctx.quadraticCurveTo(bx, by + 4, bx - w / 2, by + 8);
    ctx.lineTo(bx - w / 2 - 7, by + 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // long ribbon tail of the scroll curling down to the speaker (print-style banderol)
    ctx.beginPath();
    ctx.moveTo(bx - 6, by + 7);
    ctx.bezierCurveTo(bx - 26, by + 48, fx + 22, fy - 112, fx + 3, fy - 40);
    ctx.stroke();
    ctx.fillStyle = C.dark;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(word, bx, by);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCowsLive(ctx, T, riderX, thumb) {
  // heads: cow 1 grazes, then both look up at the dripping rider. The turn starts as
  // the soaked rider approaches (bar 3, just after the splash): from T ≈ 5.8 the bike
  // passes in front of the cows, so a turn timed on bar 4 was hidden behind its wheels.
  const look = thumb ? 0 : sstep(4.9, 5.4, T) * (1 - sstep(9.5, 10.5, T));
  const cows = [
    { x: 800, y: 684, s: 1.1, dir: 1, graze: 1 },
    { x: 905, y: 676, s: 0.95, dir: -1, graze: 0 },
  ];
  ctx.save();
  ctx.lineCap = 'round';
  for (const c of cows) {
    const s = c.s;
    const d = c.dir;
    const chew = Math.sin(T * 5 + c.x) * 0.6;
    const down = c.graze * (1 - look);
    const nx = c.x + 20 * s * d;
    const ny = c.y - 16 * s;
    const hx = nx + (6 + 3 * down) * s * d;
    const hy = ny + (-4 + 14 * down + chew * down) * s;
    // neck
    ctx.strokeStyle = C.ink;
    ctx.fillStyle = GLAZE;
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(nx - 3 * s * d, ny + 2 * s);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = GLAZE;
    ctx.lineWidth = 4.6 * s;
    ctx.stroke();
    // head (turns to the viewer when looking)
    ctx.beginPath();
    ctx.ellipse(hx + 2 * s * d * (1 - look), hy + 2 * s, (4.6 - look) * s, 6.2 * s, d * (0.9 - 0.9 * look) + (down * 0.5 * d), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.ellipse(hx + 2 * s * d * (1 - look), hy - 1 * s, 2.4 * s, 2 * s, 0, 0, TAU);
    ctx.fill();
    // horns
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(hx - 3 * s, hy - 4 * s);
    ctx.lineTo(hx - 5 * s, hy - 8 * s);
    ctx.moveTo(hx + 3 * s, hy - 4 * s);
    ctx.lineTo(hx + 5 * s, hy - 8 * s);
    ctx.stroke();
    // tail swish
    const tx = c.x - 21 * s * d;
    const ty = c.y - 16 * s;
    const sw = Math.sin(T * 2.4 + c.x * 0.1) * 5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx - 4 * s * d + sw, ty + 8 * s, tx - 2 * s * d + sw * 1.4, ty + 15 * s);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the splash gag
const SPLASH_N = 72;
const GRAV = 900;
function dropParams(i) {
  const h = (k) => hash(i * 13.17 + k * 3.31);
  const tl = 3.98 + 0.42 * h(1);
  const x0 = 572 + 26 * h(2);
  const y0 = 554 + 12 * h(3);
  const vx = 66 + 96 * h(4);
  const vy = -(430 + 160 * h(5));
  const landY = 778 + 70 * h(6);
  const tau = (-vy + Math.sqrt(vy * vy + 2 * GRAV * (landY - y0))) / GRAV;
  return { tl, x0, y0, vx, vy, landY, tau, r: 2.4 + 3.8 * h(7) * h(8) + 1.4 * h(9) };
}
const DROPS = Array.from({ length: SPLASH_N }, (_, i) => dropParams(i));

function drawSplash(ctx, T, part) {
  ctx.save();
  ctx.lineCap = 'round';
  // the thrown tongue of water: a brushed arc that breaks into drops
  if (part === 0) {
    const tt = T - 3.98;
    if (tt > 0 && tt < 1.25) {
      const fade = 1 - sstep(0.55, 1.25, tt);
      for (const [vx, vy, w] of [
        [104, -520, 1],
        [82, -470, 0.75],
        [128, -560, 0.6],
      ]) {
        const head = Math.min(tt, 0.95);
        const t0 = Math.max(0, head - 0.55);
        const pts = [];
        for (let k = 0; k <= 14; k++) {
          const q = t0 + ((head - t0) * k) / 14;
          pts.push({ x: 580 + vx * q, y: 556 + vy * q + 0.5 * GRAV * q * q });
        }
        for (const [col, extra, al] of [
          [C.dark, 3.0, 0.9],
          [GLAZE, 0, 1],
          [C.pale, -3.2, 0.9],
        ]) {
          ctx.strokeStyle = col;
          for (let k = 0; k < 14; k++) {
            const u = k / 13;
            ctx.globalAlpha = fade * al * (0.35 + 0.65 * u);
            ctx.lineWidth = Math.max(0.5, (2 + u * 10) * w + extra);
            ctx.beginPath();
            ctx.moveTo(pts[k].x, pts[k].y);
            ctx.lineTo(pts[k + 1].x, pts[k + 1].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  for (let i = part; i < SPLASH_N; i += 2) {
    const d = DROPS[i];
    const tt = T - d.tl;
    if (tt < 0) continue;
    if (tt < d.tau) {
      const x = d.x0 + d.vx * tt;
      const y = d.y0 + d.vy * tt + 0.5 * GRAV * tt * tt;
      const vx = d.vx;
      const vy = d.vy + GRAV * tt;
      const sp = Math.hypot(vx, vy);
      const L = clamp(sp * 0.03, 3, 14);
      // teardrop dab, tail pointing back along the flight
      const ux = vx / sp;
      const uy = vy / sp;
      const rr = d.r * 1.15;
      const tail = rr + L * 0.45;
      ctx.beginPath();
      ctx.moveTo(x - ux * tail, y - uy * tail);
      ctx.quadraticCurveTo(x - ux * rr * 0.6 - uy * rr * 1.1, y - uy * rr * 0.6 + ux * rr * 1.1, x + ux * rr, y + uy * rr);
      ctx.quadraticCurveTo(x - ux * rr * 0.6 + uy * rr * 1.1, y - uy * rr * 0.6 - ux * rr * 1.1, x - ux * tail, y - uy * tail);
      ctx.closePath();
      ctx.fillStyle = GLAZE;
      ctx.fill();
      ctx.fillStyle = 'rgba(117,144,202,0.55)';
      ctx.fill();
      ctx.strokeStyle = C.dark;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = C.mid;
      ctx.beginPath();
      ctx.arc(x + ux * rr * 0.15 + uy * rr * 0.3, y + uy * rr * 0.15 - ux * rr * 0.3, rr * 0.38, 0, TAU);
      ctx.fill();
    } else if (tt < d.tau + 1.2 && part === 0) {
      // rings where it lands in the canal
      const u = (tt - d.tau) / 1.2;
      const lx = d.x0 + d.vx * d.tau;
      ctx.strokeStyle = `rgba(26,51,132,${0.7 * (1 - u)})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(lx, d.landY, 3 + u * 18, 1 + u * 4.5, 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDrips(ctx, rig, T) {
  // the soaked rider drips for a while
  const wet = sstep(4.9, 5.15, T) * (1 - sstep(7.6, 8.6, T));
  if (wet <= 0) return;
  ctx.save();
  const srcs = [rig.billTip, rig.tailTip, rig.body, rig.crestTip1, rig.frontWheel];
  for (let s = 0; s < srcs.length; s++) {
    const p = srcs[s];
    const py = s === 2 ? p.y + p.ry * 0.9 : s === 4 ? p.y + 30 : p.y + 2;
    for (let k = 0; k < 2; k++) {
      const ph = fract(T * 2.6 + s * 0.29 + k * 0.5);
      const y = py + ph * ph * 46;
      // drips trail behind as the rider moves on
      const x = p.x - ph * 18;
      ctx.globalAlpha = wet * (1 - ph * 0.7);
      ctx.fillStyle = 'rgba(44,84,168,0.9)';
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.quadraticCurveTo(x + 2.4, y + 0.5, x, y + 2);
      ctx.quadraticCurveTo(x - 2.4, y + 0.5, x, y - 4);
      ctx.fill();
    }
  }
  // droplet marks on the plumage
  ctx.globalAlpha = wet;
  ctx.fillStyle = 'rgba(44,84,168,0.7)';
  const b = rig.body;
  for (let k = 0; k < 7; k++) {
    const a = k * 2.1;
    ctx.beginPath();
    ctx.ellipse(b.x + Math.cos(a) * b.rx * 0.6, b.y + Math.sin(a) * b.ry * 0.5, 1.4, 2.4, 0.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// -----------------------------------------------------------------------------
// rider in cobalt
// -----------------------------------------------------------------------------
const RIDER_STYLE = {
  plumage: GLAZE,
  plumageShade: '#b7c6e7',
  mask: C.dark,
  bill: C.ink,
  eyeRing: '#9fb3e0',
  legs: C.ink,
  crest: C.mid,
  breast: '#a9bbe3',
  frame: C.mid,
  frameShade: C.ink,
  metal: C.ink,
  tire: C.dark,
  rim: '#9fb3e0',
  saddle: C.ink,
  outline: C.dark,
  outlineWidth: 1.6,
  spokes: 12,
};

function drawDelftRider(kit, ctx, params, scene) {
  const rig = kit.riderRig(params);
  const pin = { ...(scene.pinwheel || { type: 'post' }), colors: [GLAZE], stroke: C.ink, lineWidth: 1.5, time: rig.time };
  // pole + mini post-mill rotor in cobalt (the rig's default pole is brown)
  const pole = () => {
    ctx.beginPath();
    ctx.moveTo(rig.poleBase.x, rig.poleBase.y);
    ctx.lineTo(rig.poleTop.x, rig.poleTop.y);
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(159,179,224,0.6)';
  ctx.lineWidth = 5;
  ctx.translate(1.4, 1);
  pole();
  ctx.restore();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.6;
  pole();
  ctx.restore();
  kit.drawPinwheel(ctx, rig.pinHub, rig.pinwheelAngle, pin);
  // pigment halo: the wash spreads a hair beyond the trek line
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.translate(1.6, 1.2);
  kit.drawRider(ctx, rig, { ...RIDER_STYLE, silhouette: '#9fb3e0', showPinwheel: false });
  ctx.restore();
  kit.drawRider(ctx, rig, { ...RIDER_STYLE, showPinwheel: false });
  return rig;
}

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 4 : params.rawLocalT;
  FONT_ENGRAVING = kit.FONT.engraving;

  const picture = bakePicture(kit);
  const wheelFront = bakeWheelFront(kit);
  const boat = bakeBoat(kit);
  const tone = bakeTone(kit);
  const glaze = bakeGlaze(kit);

  const mAng = thumb ? 0.3 : millAngle(T);
  const pAng = thumb ? 0.55 : palAngle(T);
  const wAng = thumb ? 0.4 : -(-millAngle(T) * 0.42);

  ctx.save();
  ctx.drawImage(picture, 0, 0);

  // distant mills turning on the far dike
  const tA = thumb ? 0.3 : -T * 1.9;
  drawTinySails(ctx, 72, HORIZON - 24, 0.8, tA + 0.4);
  drawTinySails(ctx, 748, HORIZON - 26, 0.95, tA * 1.1 + 1.0);
  drawTinySails(ctx, 800, HORIZON - 28, 1.05, tA * 0.95 + 0.2);
  drawTinySails(ctx, 858, HORIZON - 25, 0.9, tA * 1.05 + 0.7);

  drawRoundelLive(ctx, pAng, thumb ? 0 : T);
  drawBeemsterLive(ctx, T, thumb);
  drawGust(ctx, T, thumb);

  // paltrok: log + sawdust, sails, sawyer
  drawLog(ctx, T, pAng);
  drawSails(ctx, PAL_HUB, PAL_R, KX, pAng, 0.75);
  drawSawyer(ctx, T, thumb);

  // the drainage mill
  drawSails(ctx, HUB, SAIL_R, KX, mAng, 1);
  drawScoopWheel(kit, ctx, wAng, thumb ? 0 : T, thumb);
  ctx.drawImage(wheelFront, 0, 0);

  drawCowsLive(ctx, T, params.riderLocalX, thumb);

  // outflow from the culvert into the ring canal
  {
    const t2 = thumb ? 0.4 : T;
    ctx.save();
    ctx.strokeStyle = 'rgba(44,84,168,0.75)';
    ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const ph = fract(t2 * 1.6 + k / 7);
      const x = 662 + k * 4.5;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, 748);
      ctx.quadraticCurveTo(x + 3, 756 + ph * 4, x + 2 + ph * 3, 770 + ph * 6);
      ctx.stroke();
    }
    for (let k = 0; k < 3; k++) {
      const ph = fract(t2 * 0.8 + k / 3);
      ctx.globalAlpha = 1 - ph;
      ctx.beginPath();
      ctx.ellipse(676, 776, 10 + ph * 34, 2 + ph * 6, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  // the kaag drifts along the ring canal, bobbing
  {
    const bxp = BOAT.x + (thumb ? 0 : clamp(T, -8, 16) * 2.2);
    const bob = thumb ? 0 : Math.sin(T * 2.2) * 2;
    const roll = thumb ? 0 : Math.sin(T * 2.2 - 0.6) * 0.025;
    ctx.save();
    ctx.translate(bxp, BOAT.y + bob);
    ctx.rotate(roll);
    ctx.drawImage(boat, -130, -190);
    ctx.restore();
  }

  drawDucks(ctx, T, thumb);

  if (!thumb) drawSplash(ctx, T, 0);
  let rig = null;
  if (kit.riderVisible(params)) rig = drawDelftRider(kit, ctx, params, scene);
  if (!thumb) {
    drawSplash(ctx, T, 1);
    if (rig) drawDrips(ctx, rig, T);
  }

  // glaze over everything: tile tone, joints, gloss, crazing
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(tone, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(glaze, 0, 0);
  ctx.restore();
}
