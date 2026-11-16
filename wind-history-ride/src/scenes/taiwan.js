// src/scenes/taiwan.js — #18 · 2019 · 台灣離岸風電
//
// Medium: Taiwanese floral cloth (the big-peony 花布 print: flat colour, white
// highlight strokes, slightly off-register colour plates, cotton weave) blended with
// temple painting (廟宇彩繪): a painted beam (樑枋) with a gilt plaque, auspicious
// curl-clouds (祥雲) shaded in stepped colour bands (退暈) and gold outlines (描金).
//
// Machine: the Formosa 1 offshore wind farm off Zhunan, Miaoli — three-bladed
// upwind turbines on monopiles with yellow transition pieces and access platforms,
// standing in rows out in the Taiwan Strait. Coast: dunes, a casuarina windbreak,
// a lighthouse. Foreground: a lagoon where wild black-faced spoonbills winter.
//
// Gag (4 bars @ 120 BPM): bars 1–2 the wild spoonbills feed, each at its own pace;
// bar 3 they sweep their spoon bills side to side in perfect time with the beat,
// splashing on every count, as the cyclist rides by; bar 4 they lift their heads and
// flap like a cheering crowd. A bamboo raft poles slowly past on the sea.

const S = 1000;
const ROAD_Y = 700;
const TAU = Math.PI * 2;

const C = {
  red: '#c8102e',
  deepRed: '#8e0f22',
  wine: '#5e0a18',
  pink: '#f6c1cf',
  pink2: '#ec8fa9',
  rose: '#e2557a',
  green: '#2e8b57',
  dgreen: '#1b5a37',
  lgreen: '#7cc36e',
  teal: '#1f7f8c',
  blue: '#1e5aa8',
  navy: '#14306b',
  sky: '#1f4f9c',
  sky2: '#2d66b6',
  gold: '#f4d35e',
  dgold: '#c7932a',
  cream: '#fbf3df',
  white: '#fffdf6',
  sand: '#ecc983',
  sand2: '#d7a85b',
  ink: '#1c1a2e',
};

// layout
const BEAM = { y0: 0, y1: 100 };
const HORIZON = 366;
const SHORE = 612;
const LAGOON_Y = 716;
const HEM_Y = 884;

// ---------------------------------------------------------------------------
// tiny helpers (self-contained)
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
const P = (x, y) => ({ x, y });
const fract = (v) => v - Math.floor(v); // always in [0, 1), also for negative time

function shoreY(x) {
  return SHORE + 4 * Math.sin(x * 0.013 + 0.5) + 2 * Math.sin(x * 0.041);
}
function duneTop(x) {
  // dunes behind the coast road; low gap around the near turbine
  let y = 628 + 12 * Math.sin(x * 0.011 + 1.2) + 6 * Math.sin(x * 0.031 + 0.4);
  y += 18 * Math.exp(-(((x - 640) / 90) ** 2));
  return Math.max(y, shoreY(x) + 8);
}

/** Gold outline with a dark keyline outside it (temple 描金 look). */
function goldStroke(g, path, w = 1.6, key = C.ink) {
  g.strokeStyle = key;
  g.lineWidth = w + 1.6;
  g.stroke(path);
  g.strokeStyle = C.gold;
  g.lineWidth = w;
  g.stroke(path);
}

function ellipsePath(x, y, rx, ry, rot = 0) {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, TAU);
  return p;
}

// ---------------------------------------------------------------------------
// FLORAL CLOTH motifs (peony, leaf, plum blossom)
// ---------------------------------------------------------------------------
function petalPath(a, r0, r1, hw, sc = 3, wav = 0.07) {
  // a big rounded petal: soft flanks and a scalloped (ruffled) rim
  const p = new Path2D();
  const pt = (ang, r) => [Math.cos(ang) * r, Math.sin(ang) * r];
  let [x, y] = pt(a - hw * 0.3, r0);
  p.moveTo(x, y);
  let [cx, cy] = pt(a - hw * 1.08, (r0 + r1) * 0.55);
  let [ex, ey] = pt(a - hw, r1 * 0.88);
  p.quadraticCurveTo(cx, cy, ex, ey);
  for (let i = 0; i < sc; i++) {
    const u0 = -hw + (2 * hw * i) / sc;
    const u1 = -hw + (2 * hw * (i + 1)) / sc;
    const um = (u0 + u1) / 2;
    [cx, cy] = pt(a + um, r1 * (1 + wav) * 1.05);
    [ex, ey] = pt(a + u1, i === sc - 1 ? r1 * 0.88 : r1 * 0.95);
    p.quadraticCurveTo(cx, cy, ex, ey);
  }
  [cx, cy] = pt(a + hw * 1.08, (r0 + r1) * 0.55);
  [ex, ey] = pt(a + hw * 0.3, r0);
  p.quadraticCurveTo(cx, cy, ex, ey);
  p.closePath();
  return p;
}

/** A big printed peony (牡丹) as on Taiwanese floral cloth: layered ruffled petals,
 *  each with a pale rim band, a few white vein strokes and a golden heart. */
function peony(g, x, y, r, rot, pal, squash = 1, reg = P(1.6, 1.2)) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(1, squash);
  const rings = [
    { n: 6, r0: 0.22, r1: 1.0, hw: 0.6, sc: 3, base: pal.outer, rim: pal.outerRim, off: 0 },
    { n: 5, r0: 0.16, r1: 0.74, hw: 0.68, sc: 3, base: pal.mid, rim: pal.midRim, off: 0.33 },
    { n: 4, r0: 0.1, r1: 0.48, hw: 0.82, sc: 2, base: pal.inner, rim: pal.innerRim, off: 0.9 },
  ];
  // dark under-plate, printed slightly off register
  g.fillStyle = pal.dark;
  g.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const rr = r * (0.96 + 0.06 * (i % 2));
    if (i === 0) g.moveTo(Math.cos(a) * rr + reg.x * 2, Math.sin(a) * rr + reg.y * 2);
    else g.lineTo(Math.cos(a) * rr + reg.x * 2, Math.sin(a) * rr + reg.y * 2);
  }
  g.closePath();
  g.fill();
  g.lineCap = 'round';
  for (let ri = 0; ri < rings.length; ri++) {
    const ring = rings[ri];
    for (let i = 0; i < ring.n; i++) {
      const a = ring.off + (i / ring.n) * TAU + (ri === 0 ? 0.08 * Math.sin(i * 2.3) : 0);
      const outer = petalPath(a, ring.r0 * r, ring.r1 * r, ring.hw, ring.sc);
      const inner = petalPath(a, ring.r0 * r, ring.r1 * r * 0.8, ring.hw * 0.86, ring.sc);
      g.fillStyle = ring.rim;
      g.fill(outer);
      g.save();
      g.translate(reg.x, reg.y);
      g.fillStyle = ring.base;
      g.fill(inner);
      g.restore();
      // a deeper tone at the petal's base
      g.fillStyle = pal.dark;
      g.globalAlpha = 0.45;
      g.fill(petalPath(a, ring.r0 * r, (ring.r0 + (ring.r1 - ring.r0) * 0.35) * r, ring.hw * 0.6, 2, 0));
      g.globalAlpha = 1;
      // veins: two or three soft white strokes
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = Math.max(0.8, r * 0.018);
      g.beginPath();
      for (let k = -1; k <= 1; k++) {
        if (ring.sc === 2 && k === 0) continue;
        const aa = a + k * ring.hw * 0.45;
        const r0 = ring.r1 * r * 0.42;
        const r1 = ring.r1 * r * 0.74;
        g.moveTo(Math.cos(aa) * r0, Math.sin(aa) * r0);
        g.quadraticCurveTo(Math.cos(aa + 0.08) * (r0 + r1) * 0.5, Math.sin(aa + 0.08) * (r0 + r1) * 0.5, Math.cos(aa) * r1, Math.sin(aa) * r1);
      }
      g.stroke();
      g.strokeStyle = ring.base;
      g.globalAlpha = 0.6;
      g.lineWidth = Math.max(0.6, r * 0.012);
      g.stroke(outer);
      g.globalAlpha = 1;
    }
  }
  // golden heart with stamens
  g.fillStyle = pal.heart;
  g.beginPath();
  g.arc(0, 0, r * 0.15, 0, TAU);
  g.fill();
  g.fillStyle = C.gold;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    const rr = r * (0.08 + 0.05 * (i % 2));
    g.beginPath();
    g.arc(Math.cos(a) * rr, Math.sin(a) * rr, Math.max(1, r * 0.028), 0, TAU);
    g.fill();
  }
  g.restore();
}

const PEONY_RED = { outer: '#c8102e', outerRim: '#f79ab2', mid: '#e23e62', midRim: '#fbd0dc', inner: '#f48aa6', innerRim: '#fff1f5', heart: '#8e0f22', dark: '#5e0a18' };
const PEONY_PINK = { outer: '#ef7598', outerRim: '#fde2ea', mid: '#f6a5bb', midRim: '#fff4f7', inner: '#fbd0dc', innerRim: '#ffffff', heart: '#c8102e', dark: '#9b1c42' };
const PEONY_WHITE = { outer: '#f7e7c4', outerRim: '#fffaf0', mid: '#fbe9b8', midRim: '#ffffff', inner: '#f6d27e', innerRim: '#fff6dc', heart: '#c8102e', dark: '#b07a2a' };

function leaf(g, x, y, len, ang, wid, colA, colB, vein = 'rgba(255,255,255,0.75)', reg = P(1.4, 1)) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  const half = (side) => {
    const p = new Path2D();
    p.moveTo(0, 0);
    p.quadraticCurveTo(len * 0.35, side * wid * 1.2, len * 0.62, side * wid * 0.9);
    p.quadraticCurveTo(len * 0.86, side * wid * 0.5, len, 0);
    p.closePath();
    return p;
  };
  g.save();
  g.translate(reg.x, reg.y);
  g.fillStyle = colA;
  g.fill(half(-1));
  g.fillStyle = colB;
  g.fill(half(1));
  g.restore();
  g.strokeStyle = vein;
  g.lineWidth = Math.max(0.8, wid * 0.12);
  g.beginPath();
  g.moveTo(len * 0.06, 0);
  g.quadraticCurveTo(len * 0.5, -wid * 0.08, len * 0.92, 0);
  for (let k = 1; k <= 3; k++) {
    const u = k / 4;
    g.moveTo(len * u, -wid * 0.04);
    g.lineTo(len * (u + 0.12), -wid * 0.62 * (1 - u * 0.5));
  }
  g.stroke();
  g.restore();
}

function blossom(g, x, y, r, col, heart = C.gold) {
  g.fillStyle = col;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2;
    g.beginPath();
    g.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, 0, TAU);
    g.fill();
  }
  g.fillStyle = heart;
  g.beginPath();
  g.arc(x, y, r * 0.3, 0, TAU);
  g.fill();
}

/** A spray of the cloth print: peonies + leaves + blossoms. */
function floralSpray(g, items, rng) {
  for (const it of items) {
    if (it.leaves) {
      for (let k = 0; k < it.leaves; k++) {
        const a = it.leafBase + (k / it.leaves) * it.leafSpread + (rng() - 0.5) * 0.3;
        const L = it.r * (1.3 + rng() * 0.6);
        leaf(g, it.x + Math.cos(a) * it.r * 0.55, it.y + Math.sin(a) * it.r * 0.55, L, a, L * 0.27, k % 2 ? C.green : '#237a4a', k % 2 ? '#145233' : C.dgreen);
      }
    }
  }
  for (const it of items) peony(g, it.x, it.y, it.r, it.rot || 0, it.pal || PEONY_RED, it.squash || 1);
}

// ---------------------------------------------------------------------------
// TEMPLE motifs: auspicious cloud (祥雲) with stepped bands (退暈) and gilt edge
// ---------------------------------------------------------------------------
function cloudPath(lobes) {
  const p = new Path2D();
  for (const l of lobes) {
    p.moveTo(l.x + l.r, l.y);
    p.arc(l.x, l.y, l.r, 0, TAU);
  }
  return p;
}

function auspiciousCloud(g, x, y, s, bands, dir = 1) {
  // lobes: a cluster of curl-heads + a trailing ribbon tail
  const lobes = [
    { x: 0, y: 0, r: 26 },
    { x: 30, y: -10, r: 22 },
    { x: 56, y: 2, r: 18 },
    { x: -26, y: 6, r: 18 },
    { x: 14, y: 14, r: 16 },
    { x: 42, y: 16, r: 13 },
  ].map((l) => ({ x: x + l.x * s * dir, y: y + l.y * s, r: l.r * s }));
  // tail
  const tail = new Path2D();
  const tx0 = x - 30 * s * dir;
  tail.moveTo(tx0, y - 6 * s);
  tail.bezierCurveTo(tx0 - 40 * s * dir, y - 14 * s, tx0 - 70 * s * dir, y + 10 * s, tx0 - 108 * s * dir, y - 4 * s);
  tail.bezierCurveTo(tx0 - 74 * s * dir, y + 22 * s, tx0 - 36 * s * dir, y + 14 * s, tx0 + 4 * s * dir, y + 18 * s);
  tail.closePath();
  const outer = cloudPath(lobes);
  // gilt keyline under everything
  g.lineJoin = 'round';
  g.strokeStyle = C.ink;
  g.lineWidth = 5.4 * Math.max(0.6, s);
  g.stroke(outer);
  g.stroke(tail);
  g.strokeStyle = C.gold;
  g.lineWidth = 3.2 * Math.max(0.6, s);
  g.stroke(outer);
  g.stroke(tail);
  // stepped colour bands, darkest outside
  for (let b = 0; b < bands.length; b++) {
    const k = 1 - b * 0.2;
    g.fillStyle = bands[b];
    g.fill(cloudPath(lobes.map((l) => ({ x: l.x + (1 - k) * l.r * 0.15, y: l.y + (1 - k) * l.r * 0.2, r: l.r * k }))));
    if (b === 0) g.fill(tail);
    if (b === 1) {
      const t2 = new Path2D();
      t2.moveTo(tx0 - 6 * s * dir, y + 1 * s);
      t2.bezierCurveTo(tx0 - 40 * s * dir, y - 4 * s, tx0 - 64 * s * dir, y + 12 * s, tx0 - 92 * s * dir, y + 3 * s);
      t2.bezierCurveTo(tx0 - 64 * s * dir, y + 16 * s, tx0 - 36 * s * dir, y + 10 * s, tx0 - 2 * s * dir, y + 12 * s);
      t2.closePath();
      g.fill(t2);
    }
  }
  // curls (如意 heads) in gold
  g.strokeStyle = C.dgold;
  g.lineWidth = 1.6 * Math.max(0.6, s);
  g.lineCap = 'round';
  for (const l of lobes.slice(0, 4)) {
    g.beginPath();
    for (let k = 0; k <= 26; k++) {
      const u = k / 26;
      const a = -Math.PI / 2 + u * Math.PI * 3.1 * dir;
      const rr = l.r * 0.62 * (1 - u * 0.78);
      const px = l.x + Math.cos(a) * rr * dir;
      const py = l.y + Math.sin(a) * rr + l.r * 0.05;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
  }
}

// ---------------------------------------------------------------------------
// BAKES
// ---------------------------------------------------------------------------
function getSky(kit) {
  return kit.bake('tw_sky_v1', S, HORIZON + 6, (g, rng, w, h) => {
    // deep-blue cloth ground with a tone-on-tone sprig print
    const gr = g.createLinearGradient(0, BEAM.y1, 0, HORIZON);
    gr.addColorStop(0, '#173f86');
    gr.addColorStop(0.55, C.sky);
    gr.addColorStop(1, '#4d86c9');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // stepped horizon bands (退暈)
    const bandsY = [[HORIZON - 64, '#3a74bd'], [HORIZON - 36, '#5b93d0'], [HORIZON - 16, '#86b4df']];
    for (const [y, col] of bandsY) {
      g.fillStyle = col;
      g.fillRect(0, y, w, HORIZON - y + 6);
    }
    // printed sprigs
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 12; col++) {
        const x = col * 92 + (row % 2) * 46 + 10;
        const y = BEAM.y1 + 18 + row * 34;
        if (y > HORIZON - 70) continue;
        g.globalAlpha = 0.22;
        blossom(g, x, y, 6, '#6f9be0', '#9cc0f0');
        g.globalAlpha = 0.16;
        leaf(g, x + 6, y + 4, 14, 0.6, 4, '#6f9be0', '#5a88d0', 'rgba(0,0,0,0)', P(0, 0));
        g.globalAlpha = 1;
      }
    }
    // the sun: red disc, gilt rim and stepped rays
    const sx = 196;
    const sy = 214;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      g.fillStyle = k % 2 ? 'rgba(244,211,94,0.28)' : 'rgba(244,211,94,0.16)';
      g.beginPath();
      g.moveTo(sx, sy);
      g.arc(sx, sy, 104, a - 0.09, a + 0.09);
      g.closePath();
      g.fill();
    }
    for (const [r, col] of [
      [62, C.gold],
      [56, '#f08a24'],
      [50, '#e0402e'],
      [42, C.red],
    ]) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(sx, sy, r, 0, TAU);
      g.fill();
    }
    g.strokeStyle = 'rgba(255,240,200,0.55)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(sx, sy, 32, Math.PI * 1.1, Math.PI * 1.5);
    g.stroke();
    kit.addGrain(g, w, h, rng, 0.025);
  });
}

function getBeam(kit) {
  // the painted temple beam (樑枋彩繪) across the top, with a gilt plaque
  return kit.bake('tw_beam_v1', S, BEAM.y1 + 4, (g, rng, w) => {
    const y0 = 22;
    const y1 = BEAM.y1;
    g.fillStyle = C.wine;
    g.fillRect(0, 0, w, y1 + 4);
    // main field: green with a blue inner band
    g.fillStyle = C.dgreen;
    g.fillRect(0, y0, w, y1 - y0);
    g.fillStyle = C.navy;
    g.fillRect(0, y0 + 8, w, y1 - y0 - 16);
    // brocade lattice (錦紋) in the blue band
    g.save();
    g.beginPath();
    g.rect(0, y0 + 8, w, y1 - y0 - 16);
    g.clip();
    const step = 18;
    for (let x = -step; x < w + step; x += step) {
      for (let y = y0 + 8; y < y1; y += step) {
        const cx = x + (((y - y0) / step) % 2 ? step / 2 : 0);
        g.strokeStyle = 'rgba(244,211,94,0.55)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(cx, y - step / 2);
        g.lineTo(cx + step / 2, y);
        g.lineTo(cx, y + step / 2);
        g.lineTo(cx - step / 2, y);
        g.closePath();
        g.stroke();
        g.fillStyle = (Math.round(cx / step) + Math.round(y / step)) % 2 ? C.red : C.lgreen;
        g.beginPath();
        g.arc(cx, y, 2.4, 0, TAU);
        g.fill();
      }
    }
    g.restore();
    // gilt rules
    g.fillStyle = C.gold;
    g.fillRect(0, y0, w, 3);
    g.fillRect(0, y0 + 8, w, 2);
    g.fillRect(0, y1 - 10, w, 2);
    g.fillRect(0, y1 - 3, w, 3);
    // spiral-flower end blocks (旋花藻頭) left & right
    const swirl = (cx, cy, r) => {
      for (const [rr, col] of [
        [r, C.gold],
        [r * 0.86, C.blue],
        [r * 0.62, C.cream],
        [r * 0.42, C.red],
      ]) {
        g.fillStyle = col;
        g.beginPath();
        g.arc(cx, cy, rr, 0, TAU);
        g.fill();
      }
      g.strokeStyle = C.gold;
      g.lineWidth = 1.4;
      g.beginPath();
      for (let k = 0; k <= 40; k++) {
        const u = k / 40;
        const a = u * Math.PI * 4;
        const rr = r * 0.8 * (1 - u);
        if (k === 0) g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        else g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        g.fillStyle = k % 2 ? C.pink : C.lgreen;
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35, r * 0.42, r * 0.22, a, 0, TAU);
        g.fill();
      }
    };
    const cy = (y0 + y1) / 2 + 1;
    for (const cx of [86, 196, 804, 914]) swirl(cx, cy, 15);
    // central plaque (匾): red field, gilt frame, dragon-ish scroll ends
    const px0 = 340;
    const px1 = 660;
    g.fillStyle = C.ink;
    g.beginPath();
    g.moveTo(px0 - 26, cy);
    g.quadraticCurveTo(px0 - 10, y0 - 2, px0 + 10, y0 + 2);
    g.lineTo(px1 - 10, y0 + 2);
    g.quadraticCurveTo(px1 + 10, y0 - 2, px1 + 26, cy);
    g.quadraticCurveTo(px1 + 10, y1 + 2, px1 - 10, y1 - 2);
    g.lineTo(px0 + 10, y1 - 2);
    g.quadraticCurveTo(px0 - 10, y1 + 2, px0 - 26, cy);
    g.closePath();
    g.fill();
    g.fillStyle = C.gold;
    g.beginPath();
    g.moveTo(px0 - 22, cy);
    g.quadraticCurveTo(px0 - 8, y0 + 1, px0 + 10, y0 + 5);
    g.lineTo(px1 - 10, y0 + 5);
    g.quadraticCurveTo(px1 + 8, y0 + 1, px1 + 22, cy);
    g.quadraticCurveTo(px1 + 8, y1 - 1, px1 - 10, y1 - 5);
    g.lineTo(px0 + 10, y1 - 5);
    g.quadraticCurveTo(px0 - 8, y1 - 1, px0 - 22, cy);
    g.closePath();
    g.fill();
    g.fillStyle = C.red;
    g.fillRect(px0 + 8, y0 + 10, px1 - px0 - 16, y1 - y0 - 20);
    g.strokeStyle = C.gold;
    g.lineWidth = 1;
    g.strokeRect(px0 + 12, y0 + 14, px1 - px0 - 24, y1 - y0 - 28);
    // inscription, read right to left as on a temple plaque
    const chars = ['一', '帆', '風', '順'];
    g.font = `700 40px ${kit.FONT.kai}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const span = (px1 - px0 - 70) / 3;
    for (let i = 0; i < 4; i++) {
      const x = px1 - 35 - i * span;
      g.fillStyle = C.wine;
      g.fillText(chars[i], x + 1.5, cy + 2.5);
      g.fillStyle = C.gold;
      g.fillText(chars[i], x, cy + 1);
    }
    // little clouds flanking the plaque
    g.save();
    auspiciousCloud(g, px0 - 70, cy + 2, 0.36, ['#9cc3ea', '#cfe2f6', C.white], -1);
    auspiciousCloud(g, px1 + 70, cy + 2, 0.36, ['#9cc3ea', '#cfe2f6', C.white], 1);
    g.restore();
    kit.addGrain(g, w, y1 + 4, rng, 0.03);
  });
}

const CLOUDS = [
  { x: 380, y: 172, s: 1.2, dir: 1, bands: ['#f39ab5', '#f9c6d3', C.white], v: 7 },
  { x: 800, y: 150, s: 1.35, dir: -1, bands: ['#9cc3ea', '#cfe2f6', C.white], v: 9 },
  { x: 560, y: 276, s: 0.85, dir: 1, bands: ['#9cc3ea', '#cfe2f6', C.white], v: 6 },
  { x: 990, y: 268, s: 1.0, dir: 1, bands: ['#f39ab5', '#f9c6d3', C.white], v: 8 },
  { x: 110, y: 312, s: 0.78, dir: -1, bands: ['#f39ab5', '#f9c6d3', C.white], v: 5 },
];
function getCloudSprite(kit, i) {
  const c = CLOUDS[i];
  const W = Math.ceil(260 * c.s);
  const H = Math.ceil(116 * c.s);
  return kit.bake(`tw_cloud_${i}_v2`, W, H, (g) => {
    const cx = c.dir > 0 ? W * 0.55 : W * 0.45;
    auspiciousCloud(g, cx, H * 0.5, c.s, c.bands, c.dir);
  });
}

// --- the sea ---------------------------------------------------------------
function getSea(kit) {
  return kit.bake('tw_sea_v2', S, SHORE + 30 - HORIZON, (g, rng, w, h) => {
    const Y = (y) => y - HORIZON;
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5aa7b8');
    gr.addColorStop(0.35, '#2f8a9e');
    gr.addColorStop(1, '#17607a');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // temple-painting wave rows: scalloped crests that grow towards the shore
    let y = HORIZON + 4;
    let row = 0;
    while (y < SHORE + 20) {
      const u = (y - HORIZON) / (SHORE - HORIZON);
      const sz = lerp(5, 30, Math.pow(u, 1.3));
      const off = (row % 2) * sz;
      g.lineCap = 'round';
      for (let x = -sz * 2 + off - (row * 13) % (sz * 2); x < w + sz * 2; x += sz * 2) {
        // crest: a darker trough band + white curl
        g.fillStyle = row % 2 ? `rgba(20,48,107,${lerp(0.1, 0.26, u)})` : 'rgba(255,255,255,0.06)';
        g.beginPath();
        g.arc(x + sz, Y(y) + sz * 0.55, sz, Math.PI, TAU);
        g.fill();
        g.strokeStyle = `rgba(255,253,246,${lerp(0.35, 0.92, Math.min(1, u * 1.6))})`;
        g.lineWidth = Math.max(0.8, sz * 0.09);
        g.beginPath();
        g.arc(x + sz, Y(y) + sz * 0.55, sz * 0.92, Math.PI * 1.08, Math.PI * 1.62);
        g.stroke();
        if (sz > 10) {
          g.strokeStyle = 'rgba(244,211,94,0.7)';
          g.lineWidth = Math.max(0.8, sz * 0.05);
          g.beginPath();
          g.arc(x + sz, Y(y) + sz * 0.55, sz * 0.6, Math.PI * 1.15, Math.PI * 1.55);
          g.stroke();
        }
      }
      y += sz * 0.62;
      row++;
    }
    // foam curls (浪花) riding the nearer crests
    for (let i = 0; i < 46; i++) {
      const u = 0.35 + 0.65 * rng();
      const yy = Y(lerp(HORIZON, SHORE, u));
      const xx = rng() * w;
      const r = lerp(3, 11, u);
      g.strokeStyle = C.white;
      g.lineWidth = Math.max(1, r * 0.22);
      g.lineCap = 'round';
      g.beginPath();
      for (let k = 0; k <= 18; k++) {
        const t = k / 18;
        const a = Math.PI * (1.0 + t * 1.9);
        const rr = r * (1 - t * 0.7);
        const px = xx + Math.cos(a) * rr;
        const py = yy + Math.sin(a) * rr * 0.8;
        if (k === 0) g.moveTo(px - r * 1.6, py + r * 0.3);
        g.lineTo(px, py);
      }
      g.stroke();
      g.fillStyle = C.white;
      g.beginPath();
      g.arc(xx + r * 1.3, yy - r * 0.2, r * 0.18, 0, TAU);
      g.arc(xx + r * 1.7, yy + r * 0.1, r * 0.13, 0, TAU);
      g.fill();
    }
    // horizon gilt line
    g.fillStyle = C.gold;
    g.fillRect(0, 0, w, 2);
    kit.addGrain(g, w, h, rng, 0.02);
  });
}

// --- turbines --------------------------------------------------------------
// Formosa 1: 2 × 4 MW pilot units (2017) + 20 × 6 MW units (2019) in rows offshore.
const TURBINES = [
  { x: 58, b: 372, s: 0.09, ph: 1.4 },
  { x: 134, b: 373, s: 0.095, ph: 2.6 },
  { x: 214, b: 375, s: 0.105, ph: 0.7 },
  { x: 372, b: 376, s: 0.11, ph: 3.3 },
  { x: 650, b: 377, s: 0.12, ph: 1.9 },
  { x: 722, b: 379, s: 0.125, ph: 0.1 },
  { x: 940, b: 384, s: 0.15, ph: 2.2 },
  { x: 300, b: 382, s: 0.15, ph: 0.4 },
  { x: 452, b: 386, s: 0.18, ph: 2.1 },
  { x: 562, b: 393, s: 0.23, ph: 1.2 },
  { x: 168, b: 398, s: 0.26, ph: 3.0 },
  { x: 770, b: 410, s: 0.32, ph: 0.9 },
  { x: 262, b: 420, s: 0.37, ph: 2.6 },
  { x: 886, b: 452, s: 0.48, ph: 1.7 },
  { x: 392, b: 466, s: 0.56, ph: 0.2 },
  { x: 642, b: 566, s: 1.0, ph: 1.0 },
];
const T_H = 262; // hub height above the sea at scale 1
const T_R = 186; // rotor radius at scale 1 (154 m rotor on a ~100 m hub)
const T_KX = 0.82; // rotor plane yawed (faces front-right)
const T_OMEGA = 1.0; // rad/s  (~9.5 rpm)

function turbineGeom(t) {
  const s = t.s;
  const tpH = 46 * s; // transition piece above the waterline
  const hub = P(t.x + 6 * s, t.b - T_H * s);
  return { s, tpH, hub, R: T_R * s, topY: t.b - T_H * s + 6 * s, tpTop: t.b - tpH };
}

function getTurbineSprite(kit, i) {
  const t = TURBINES[i];
  const G = turbineGeom(t);
  const s = t.s;
  const W = Math.ceil(80 * s + 30);
  const H = Math.ceil(T_H * s + 30);
  const ox = W / 2;
  const oy = H - 8; // waterline at (ox, oy)
  return kit.bake(`tw_turb_${i}_v1`, W, H, (g) => {
    g.translate(ox - t.x, oy - t.b);
    const lw = Math.max(0.8, 1.7 * s);
    // tower (tapered, banded shading: 退暈)
    const rb = 9.5 * s;
    const rt = 5.6 * s;
    const yTop = G.topY;
    const yBot = G.tpTop;
    const tower = new Path2D();
    tower.moveTo(t.x - rb, yBot);
    tower.lineTo(t.x - rt, yTop);
    tower.lineTo(t.x + rt, yTop);
    tower.lineTo(t.x + rb, yBot);
    tower.closePath();
    g.fillStyle = C.white;
    g.fill(tower);
    g.save();
    g.clip(tower);
    g.fillStyle = '#d9e3f0';
    g.fillRect(t.x + rb * 0.15, yTop, rb * 2, yBot - yTop);
    g.fillStyle = '#aebfd8';
    g.fillRect(t.x + rb * 0.6, yTop, rb * 2, yBot - yTop);
    g.restore();
    goldStroke(g, tower, lw * 0.8);
    // transition piece: yellow, with a darker band, ladder & platform
    const tp = new Path2D();
    tp.rect(t.x - rb * 1.15, yBot, rb * 2.3, G.tpH);
    g.fillStyle = '#f6c637';
    g.fill(tp);
    g.fillStyle = '#e09a1c';
    g.fillRect(t.x + rb * 0.45, yBot, rb * 0.7, G.tpH);
    g.fillStyle = '#1c1a2e';
    g.fillRect(t.x - rb * 1.15, yBot + G.tpH * 0.62, rb * 2.3, Math.max(1, 2 * s));
    // boat-landing ladder
    g.strokeStyle = '#3a3a48';
    g.lineWidth = Math.max(0.6, 1.1 * s);
    g.beginPath();
    g.moveTo(t.x - rb * 0.55, yBot + 3 * s);
    g.lineTo(t.x - rb * 0.55, yBot + G.tpH);
    g.moveTo(t.x - rb * 0.1, yBot + 3 * s);
    g.lineTo(t.x - rb * 0.1, yBot + G.tpH);
    for (let k = 1; k < 8; k++) {
      const yy = yBot + (G.tpH * k) / 8;
      g.moveTo(t.x - rb * 0.55, yy);
      g.lineTo(t.x - rb * 0.1, yy);
    }
    g.stroke();
    goldStroke(g, tp, lw * 0.8);
    // platform with railing
    const pw = 26 * s;
    g.fillStyle = '#3a3a48';
    g.fillRect(t.x - pw, yBot - 2.5 * s, pw * 2, Math.max(1.2, 3 * s));
    g.strokeStyle = '#f6c637';
    g.lineWidth = Math.max(0.6, 1 * s);
    g.beginPath();
    g.moveTo(t.x - pw, yBot - 9 * s);
    g.lineTo(t.x + pw, yBot - 9 * s);
    for (let k = 0; k <= 8; k++) {
      const xx = t.x - pw + (2 * pw * k) / 8;
      g.moveTo(xx, yBot - 9 * s);
      g.lineTo(xx, yBot - 2 * s);
    }
    g.stroke();
    if (s > 0.4) {
      // davit crane on the platform
      g.strokeStyle = '#f6c637';
      g.lineWidth = Math.max(0.8, 1.6 * s);
      g.beginPath();
      g.moveTo(t.x + pw * 0.7, yBot - 2 * s);
      g.lineTo(t.x + pw * 0.7, yBot - 20 * s);
      g.lineTo(t.x + pw * 1.05, yBot - 18 * s);
      g.stroke();
    }
    // nacelle: compact direct-drive housing behind the hub (rotor faces front-right)
    const nac = new Path2D();
    const nx0 = G.hub.x - 30 * s;
    const ny = G.hub.y;
    nac.moveTo(G.hub.x - 2 * s, ny - 8 * s);
    nac.lineTo(nx0 + 3 * s, ny - 7 * s);
    nac.quadraticCurveTo(nx0 - 2 * s, ny - 6.5 * s, nx0 - 2 * s, ny - 1 * s);
    nac.lineTo(nx0, ny + 6 * s);
    nac.lineTo(G.hub.x - 2 * s, ny + 7.5 * s);
    nac.closePath();
    g.fillStyle = C.white;
    g.fill(nac);
    g.save();
    g.clip(nac);
    g.fillStyle = '#d9e3f0';
    g.fillRect(nx0 - 4 * s, ny + 1.5 * s, 40 * s, 8 * s);
    g.restore();
    goldStroke(g, nac, lw * 0.8);
    // generator ring right behind the hub
    const ring = ellipsePath(G.hub.x - 3 * s, ny, 3.5 * s, 9 * s);
    g.fillStyle = '#d9e3f0';
    g.fill(ring);
    goldStroke(g, ring, lw * 0.7);
    // aviation light
    g.fillStyle = C.red;
    g.beginPath();
    g.arc(nx0 + 8 * s, ny - 9 * s, Math.max(1.2, 2.2 * s), 0, TAU);
    g.fill();
  });
}

function bladePath(R, s) {
  // airfoil plan-form: wide near the root, slender tip (rotor-plane local, along +x)
  const p = new Path2D();
  const c = (u) => (u < 0.22 ? lerp(0.05, 0.082, u / 0.22) : lerp(0.082, 0.016, Math.pow((u - 0.22) / 0.78, 0.9))) * R;
  p.moveTo(R * 0.05, -c(0.05) * 0.4);
  for (let k = 1; k <= 12; k++) {
    const u = 0.05 + (0.95 * k) / 12;
    p.lineTo(R * u, -c(u) * 0.35);
  }
  p.quadraticCurveTo(R * 1.005, 0, R * 0.99, c(1) * 0.5);
  for (let k = 12; k >= 0; k--) {
    const u = 0.05 + (0.95 * k) / 12;
    p.lineTo(R * u, c(u) * (u < 0.3 ? 1.0 : 0.85));
  }
  p.closePath();
  void s;
  return p;
}

function drawRotor(g, t, T) {
  const G = turbineGeom(t);
  const s = t.s;
  const th = T * T_OMEGA * (0.9 + 0.2 * h1(t.ph * 10)) + t.ph; // clockwise (seen from upwind)
  const lw = Math.max(0.7, 1.5 * s);
  const bp = bladePath(G.R, s);
  for (let k = 0; k < 3; k++) {
    const a = th + (k * TAU) / 3;
    g.save();
    g.translate(G.hub.x, G.hub.y);
    g.scale(T_KX, 1);
    g.rotate(a);
    g.fillStyle = C.white;
    g.fill(bp);
    // a pale band along the trailing edge (stepped shading)
    g.save();
    g.clip(bp);
    g.fillStyle = '#d9e3f0';
    g.fillRect(0, G.R * 0.012, G.R, G.R * 0.08);
    g.restore();
    g.lineJoin = 'round';
    g.strokeStyle = C.ink;
    g.lineWidth = (lw + 1.2) / T_KX;
    g.stroke(bp);
    g.strokeStyle = C.gold;
    g.lineWidth = lw / T_KX;
    g.stroke(bp);
    g.restore();
  }
  // spinner
  const sp = new Path2D();
  sp.ellipse(G.hub.x + 1.5 * s, G.hub.y, 6 * s, 7.5 * s, 0, 0, TAU);
  g.fillStyle = C.white;
  g.fill(sp);
  goldStroke(g, sp, lw * 0.8);
  g.fillStyle = '#d9e3f0';
  g.beginPath();
  g.ellipse(G.hub.x + 3 * s, G.hub.y + 2 * s, 3 * s, 4 * s, 0, 0, TAU);
  g.fill();
}

function drawTurbineFoam(g, t, T) {
  const s = t.s;
  const w = 16 * s + 4;
  g.strokeStyle = 'rgba(255,253,246,0.95)';
  g.lineWidth = Math.max(0.8, 2 * s);
  g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const ph = fract(T * 0.9 + k / 3 + t.ph);
    const r = w * (0.7 + ph * 0.9);
    g.globalAlpha = 1 - ph;
    g.beginPath();
    g.ellipse(t.x, t.b + 1, r, r * 0.22, 0, Math.PI * 0.05, Math.PI * 0.95);
    g.stroke();
  }
  g.globalAlpha = 1;
}

// --- coast: dunes, casuarina windbreak, lighthouse, coast road ---------------
const LIGHTHOUSE = { x: 94, base: 642, top: 432 };
function casuarina(g, x, base, hgt, lean, rng) {
  // tall, wind-bent ironwood (木麻黃): slender trunk, clumps of drooping needle-twigs
  g.save();
  g.lineCap = 'round';
  const top = P(x + lean, base - hgt);
  const trunkAt = (u) => P(x + lean * u * u, base - hgt * u);
  g.strokeStyle = '#5b3a1e';
  g.lineWidth = Math.max(2, hgt * 0.032);
  g.beginPath();
  g.moveTo(x, base);
  g.quadraticCurveTo(x + lean * 0.25, base - hgt * 0.5, top.x, top.y);
  g.stroke();
  const clumps = [];
  const n = 6;
  for (let k = 0; k < n; k++) {
    const u = 0.42 + (0.58 * k) / (n - 1);
    const t = trunkAt(u);
    const side = k === n - 1 ? 0 : k % 2 ? 1 : -1;
    const off = side * hgt * (0.1 + 0.08 * rng()) * (1 - u * 0.4);
    clumps.push({ x: t.x + off + lean * 0.15, y: t.y + hgt * 0.02, r: hgt * (0.13 - 0.04 * u) * (0.85 + 0.3 * rng()), tx: t.x, ty: t.y + 6 });
  }
  // branches
  g.lineWidth = Math.max(1, hgt * 0.014);
  g.beginPath();
  for (const c of clumps) {
    g.moveTo(c.tx, c.ty);
    g.quadraticCurveTo((c.tx + c.x) / 2, c.ty - 4, c.x, c.y);
  }
  g.stroke();
  for (let k = 0; k < clumps.length; k++) {
    const c = clumps[k];
    // dark mass of needles
    const blob = new Path2D();
    for (let j = 0; j < 4; j++) {
      const bx = c.x + (j - 1.5) * c.r * 0.45;
      const by = c.y - Math.sin((j / 3) * Math.PI) * c.r * 0.35;
      blob.moveTo(bx + c.r * 0.55, by);
      blob.ellipse(bx, by, c.r * 0.55, c.r * 0.42, 0, 0, TAU);
    }
    g.fillStyle = k % 2 ? '#174d30' : C.dgreen;
    g.fill(blob);
    // drooping twigs hanging from the clump
    g.strokeStyle = k % 2 ? '#2e8b57' : '#3f9a5e';
    g.lineWidth = 1.2;
    g.beginPath();
    for (let j = 0; j < 11; j++) {
      const fx = c.x - c.r * 0.95 + (1.9 * c.r * j) / 10;
      const fy = c.y + c.r * 0.12;
      const L = c.r * (0.45 + 0.35 * h1(j + k * 7 + x));
      g.moveTo(fx, fy - 2);
      g.quadraticCurveTo(fx + 2, fy + L * 0.5, fx - 1 + lean * 0.03, fy + L);
    }
    g.stroke();
    g.strokeStyle = 'rgba(124,195,110,0.9)';
    g.lineWidth = 0.9;
    g.beginPath();
    for (let j = 0; j < 6; j++) {
      const fx = c.x - c.r * 0.7 + (1.4 * c.r * j) / 5;
      g.moveTo(fx, c.y - c.r * 0.25);
      g.quadraticCurveTo(fx + 1.5, c.y, fx - 0.5, c.y + c.r * 0.25);
    }
    g.stroke();
    // gilt touch on the lit (upper-left) side
    g.strokeStyle = C.gold;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(c.x - c.r * 0.3, c.y - c.r * 0.05, c.r * 0.55, Math.PI * 1.1, Math.PI * 1.55);
    g.stroke();
  }
  g.restore();
}

function getCoast(kit) {
  return kit.bake('tw_coast_v1', S, LAGOON_Y + 10 - 380, (g, rng, w, h) => {
    const OY = 380;
    g.translate(0, -OY);
    // beach + dunes
    const dunes = new Path2D();
    dunes.moveTo(0, shoreY(0));
    for (let x = 0; x <= S; x += 5) dunes.lineTo(x, shoreY(x));
    dunes.lineTo(S, LAGOON_Y + 10);
    dunes.lineTo(0, LAGOON_Y + 10);
    dunes.closePath();
    g.fillStyle = '#f5dfa4';
    g.fill(dunes);
    // the dune ridges: stepped bands of ochre (退暈)
    const ridge = (yFn, col) => {
      const p = new Path2D();
      p.moveTo(0, yFn(0));
      for (let x = 0; x <= S; x += 5) p.lineTo(x, yFn(x));
      p.lineTo(S, LAGOON_Y + 10);
      p.lineTo(0, LAGOON_Y + 10);
      p.closePath();
      g.fillStyle = col;
      g.fill(p);
      return p;
    };
    ridge((x) => duneTop(x), C.sand);
    ridge((x) => duneTop(x) + 12 + 4 * Math.sin(x * 0.02), '#e2b86e');
    ridge((x) => duneTop(x) + 28 + 6 * Math.sin(x * 0.017 + 1), C.sand2);
    // ripple marks + sand stipple
    g.strokeStyle = 'rgba(142,15,34,0.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      const x = rng() * S;
      const y = lerp(duneTop(x) + 6, 684, rng());
      g.beginPath();
      g.arc(x, y + 6, 9 + rng() * 6, Math.PI * 1.2, Math.PI * 1.8);
      g.stroke();
    }
    g.fillStyle = 'rgba(142,15,34,0.25)';
    for (let i = 0; i < 500; i++) {
      const x = rng() * S;
      const y = lerp(shoreY(x) + 2, 686, rng());
      g.fillRect(x, y, 1.4, 1.4);
    }
    // gilt crest line on the dunes
    g.strokeStyle = C.gold;
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= S; x += 5) {
      if (x === 0) g.moveTo(x, duneTop(x));
      else g.lineTo(x, duneTop(x));
    }
    g.stroke();
    // surf along the beach
    g.strokeStyle = C.white;
    g.lineWidth = 2.2;
    g.beginPath();
    for (let x = -10; x <= S; x += 22) {
      g.moveTo(x, shoreY(x));
      g.quadraticCurveTo(x + 11, shoreY(x) - 7, x + 22, shoreY(x + 22));
    }
    g.stroke();
    // lighthouse (white tower, red lantern, gilt outline)
    {
      const L = LIGHTHOUSE;
      const tw = new Path2D();
      tw.moveTo(L.x - 15, L.base);
      tw.lineTo(L.x - 10, L.top + 34);
      tw.lineTo(L.x + 10, L.top + 34);
      tw.lineTo(L.x + 15, L.base);
      tw.closePath();
      g.fillStyle = C.white;
      g.fill(tw);
      g.save();
      g.clip(tw);
      g.fillStyle = '#d9e3f0';
      g.fillRect(L.x + 3, L.top, 20, L.base - L.top);
      g.fillStyle = C.red;
      g.fillRect(L.x - 20, L.top + 80, 40, 18);
      g.fillRect(L.x - 20, L.top + 130, 40, 18);
      g.restore();
      goldStroke(g, tw, 1.5);
      // gallery + lantern + dome
      const gal = new Path2D();
      gal.rect(L.x - 16, L.top + 28, 32, 6);
      g.fillStyle = C.navy;
      g.fill(gal);
      goldStroke(g, gal, 1.1);
      const lan = new Path2D();
      lan.rect(L.x - 8, L.top + 10, 16, 18);
      g.fillStyle = C.gold;
      g.fill(lan);
      g.strokeStyle = C.ink;
      g.lineWidth = 1;
      g.stroke(lan);
      g.beginPath();
      g.moveTo(L.x, L.top + 10);
      g.lineTo(L.x, L.top + 28);
      g.stroke();
      const dome = new Path2D();
      dome.moveTo(L.x - 11, L.top + 11);
      dome.quadraticCurveTo(L.x, L.top - 8, L.x + 11, L.top + 11);
      dome.closePath();
      g.fillStyle = C.red;
      g.fill(dome);
      goldStroke(g, dome, 1.1);
      g.fillStyle = C.ink;
      g.fillRect(L.x - 1, L.top - 10, 2, 6);
      // door
      g.fillStyle = C.deepRed;
      g.beginPath();
      g.moveTo(L.x - 5, L.base);
      g.lineTo(L.x - 5, L.base - 16);
      g.quadraticCurveTo(L.x, L.base - 22, L.x + 5, L.base - 16);
      g.lineTo(L.x + 5, L.base);
      g.closePath();
      g.fill();
    }
    // casuarina windbreak in two stands (gap in front of the near turbine)
    const stands = [
      [150, 340, 9],
      [820, 990, 7],
    ];
    for (const [a, b, n] of stands) {
      for (let i = 0; i < n; i++) {
        const x = lerp(a, b, (i + 0.5) / n) + (rng() - 0.5) * 14;
        const hgt = 92 + rng() * 46;
        casuarina(g, x, duneTop(x) + 22 + rng() * 6, hgt, -14 - rng() * 10, rng);
      }
    }
    // low beach shrubs (morning glory, spinifex) along the road
    for (let i = 0; i < 40; i++) {
      const x = rng() * S;
      const y = 676 + rng() * 8;
      g.fillStyle = i % 3 ? C.green : '#237a4a';
      g.beginPath();
      g.ellipse(x, y, 10 + rng() * 10, 5 + rng() * 3, 0, Math.PI, TAU);
      g.fill();
      if (i % 4 === 0) blossom(g, x + 3, y - 4, 3.2, C.pink2, C.white);
    }
    // the coast road: a ribbon of small-flower print with gilt piping
    const road = new Path2D();
    road.rect(0, 688, S, 26);
    g.fillStyle = C.cream;
    g.fill(road);
    for (let x = 8; x < S; x += 22) {
      for (const [dy, off] of [
        [694, 0],
        [706, 11],
      ]) {
        blossom(g, x + off, dy, 3.4, (x / 22 + dy) % 3 < 1 ? C.rose : C.pink2, C.gold);
      }
    }
    g.fillStyle = C.gold;
    g.fillRect(0, 686, S, 3);
    g.fillRect(0, 713, S, 3);
    g.fillStyle = C.deepRed;
    g.fillRect(0, 684, S, 2);
    g.fillRect(0, 716, S, 2);
    kit.addGrain(g, w, h + OY, rng, 0.02);
  });
}

// --- lagoon + floral hem ---------------------------------------------------
function getLagoon(kit) {
  return kit.bake('tw_lagoon_v1', S, S - LAGOON_Y + 2, (g, rng, w, h) => {
    const OY = LAGOON_Y - 2;
    g.translate(0, -OY);
    // shallow lagoon water with stepped bands
    const bands = ['#2a8fa0', '#2380932', '#1d7387'];
    const gr = g.createLinearGradient(0, LAGOON_Y, 0, HEM_Y);
    gr.addColorStop(0, '#45a7b4');
    gr.addColorStop(1, '#1b6c80');
    g.fillStyle = gr;
    g.fillRect(0, LAGOON_Y, S, HEM_Y - LAGOON_Y + 10);
    void bands;
    // mudflats (warm ochre islands)
    const flats = [
      [180, 770, 120, 14],
      [520, 868, 200, 16],
      [860, 760, 110, 12],
      [620, 744, 80, 8],
    ];
    for (const [x, y, rx, ry] of flats) {
      const p = ellipsePath(x, y, rx, ry);
      g.fillStyle = '#c99b5a';
      g.fill(p);
      g.fillStyle = '#e2bd7c';
      g.beginPath();
      g.ellipse(x - rx * 0.1, y - ry * 0.25, rx * 0.8, ry * 0.5, 0, 0, TAU);
      g.fill();
      g.strokeStyle = C.gold;
      g.lineWidth = 1.2;
      g.stroke(p);
    }
    // ripple marks in white and gold
    g.lineCap = 'round';
    for (let i = 0; i < 120; i++) {
      const x = rng() * S;
      const y = lerp(LAGOON_Y + 8, HEM_Y - 6, rng());
      const L = 8 + rng() * 18 * ((y - LAGOON_Y) / 160 + 0.4);
      g.strokeStyle = i % 4 ? 'rgba(255,253,246,0.7)' : 'rgba(244,211,94,0.85)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x - L, y);
      g.quadraticCurveTo(x, y - 3, x + L, y);
      g.stroke();
    }
    // reeds and mangrove clumps at the far bank
    for (let i = 0; i < 26; i++) {
      const x = rng() * S;
      const y = LAGOON_Y + 4 + rng() * 6;
      g.strokeStyle = i % 2 ? C.green : C.dgreen;
      g.lineWidth = 1.6;
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        g.moveTo(x + k * 2, y + 6);
        g.quadraticCurveTo(x + k * 2 + 2, y - 4, x + k * 2 - 2 + rng() * 6, y - 12 - rng() * 10);
      }
      g.stroke();
    }
    // the floral hem: red cloth with a running peony border
    g.fillStyle = C.red;
    g.fillRect(0, HEM_Y, S, S - HEM_Y);
    g.fillStyle = C.gold;
    g.fillRect(0, HEM_Y - 4, S, 4);
    g.fillStyle = C.deepRed;
    g.fillRect(0, HEM_Y, S, 2);
    // small white dots ground
    g.fillStyle = 'rgba(255,253,246,0.6)';
    for (let y = HEM_Y + 8; y < S; y += 12) {
      for (let x = ((y / 12) % 2) * 6; x < S; x += 12) g.fillRect(x, y, 1.6, 1.6);
    }
    const hemY = HEM_Y + 44;
    const items = [];
    for (let i = 0; i < 9; i++) {
      const x = 52 + i * 112;
      items.push({ x, y: hemY + (i % 2 ? 6 : -4), r: 30 + (i % 3) * 3, rot: i * 0.7, pal: i % 2 ? PEONY_PINK : PEONY_WHITE, leaves: 3, leafBase: -0.3 + (i % 2) * 2.4, leafSpread: 2.2 });
    }
    floralSpray(g, items, rng);
    for (let i = 0; i < 9; i++) blossom(g, 108 + i * 112, HEM_Y + 22 + (i % 2) * 40, 5, C.white, C.gold);
    // big corner sprays bursting from the hem (the cloth's signature peonies)
    floralSpray(
      g,
      [
        { x: 92, y: 846, r: 62, rot: 0.3, pal: PEONY_RED, leaves: 5, leafBase: -2.6, leafSpread: 3.2 },
        { x: 196, y: 878, r: 40, rot: 1.1, pal: PEONY_PINK, leaves: 2, leafBase: -1.2, leafSpread: 1.4 },
        { x: 912, y: 840, r: 64, rot: -0.2, pal: PEONY_RED, leaves: 5, leafBase: -2.2, leafSpread: 3.0 },
        { x: 808, y: 876, r: 38, rot: 0.5, pal: PEONY_WHITE, leaves: 2, leafBase: -2.0, leafSpread: 1.4 },
      ],
      rng,
    );
    // buds
    for (const [x, y, a] of [
      [40, 776, -1.2],
      [262, 846, -0.6],
      [960, 772, -1.9],
      [736, 860, -2.4],
    ]) {
      leaf(g, x, y + 8, 22, a + 0.6, 6, C.green, C.dgreen);
      g.fillStyle = C.rose;
      g.beginPath();
      g.ellipse(x, y, 9, 12, a + Math.PI / 2, 0, TAU);
      g.fill();
      g.strokeStyle = C.deepRed;
      g.lineWidth = 1.4;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.beginPath();
      g.moveTo(x - 3, y - 4);
      g.lineTo(x - 1, y + 4);
      g.stroke();
    }
    kit.addGrain(g, w, h + OY, rng, 0.022);
  });
}

function getWeave(kit) {
  // cotton weave + slight print mottling over the whole cloth
  return kit.bake('tw_weave_v1', S, S, (g, rng, w, h) => {
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = (y * w + x) * 4;
        const warp = x % 3 === 0 ? 1 : 0;
        const weft = y % 3 === 0 ? 1 : 0;
        let a = 0;
        let v = 0;
        if (warp && weft) {
          v = 255;
          a = 26;
        } else if (warp || weft) {
          v = 0;
          a = 14 + Math.floor(rng() * 8);
        } else if (rng() < 0.04) {
          v = 255;
          a = 18;
        }
        d[k] = v;
        d[k + 1] = v;
        d[k + 2] = v;
        d[k + 3] = a;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

// ---------------------------------------------------------------------------
// BAMBOO RAFT (竹筏) poled across the shallows
// ---------------------------------------------------------------------------
const RAFT = { y: 474, s: 0.78 };
function drawRaft(g, T) {
  const x = 1090 - 46 * (T + 8);
  if (x < -160 || x > 1160) return;
  const y = RAFT.y + 1.2 * Math.sin(T * 2.1);
  const tilt = 0.02 * Math.sin(T * 1.7);
  g.save();
  g.translate(x, y);
  g.scale(RAFT.s, RAFT.s);
  g.rotate(tilt);
  // raft: bamboo poles lashed together, bow swept up (moving left)
  const L = 112;
  const raft = new Path2D();
  raft.moveTo(-L / 2 - 10, -12);
  raft.quadraticCurveTo(-L / 2, 0, -L / 2 + 14, 2);
  raft.lineTo(L / 2, 2);
  raft.lineTo(L / 2, -5);
  raft.lineTo(-L / 2 + 10, -5);
  raft.quadraticCurveTo(-L / 2 - 2, -6, -L / 2 - 10, -12);
  raft.closePath();
  g.fillStyle = '#c9c25a';
  g.fill(raft);
  g.strokeStyle = '#7a6a1e';
  g.lineWidth = 1;
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const xx = -L / 2 + 16 + k * 9.6;
    g.moveTo(xx, -5);
    g.lineTo(xx, 2);
  }
  g.moveTo(-L / 2 + 8, -1.5);
  g.lineTo(L / 2, -1.5);
  g.stroke();
  goldStroke(g, raft, 1.2);
  // wooden tub + basket of oysters
  const tub = new Path2D();
  tub.rect(8, -15, 22, 10);
  g.fillStyle = '#8a5a2b';
  g.fill(tub);
  goldStroke(g, tub, 1);
  // the fisherman in a bamboo hat (斗笠), poling
  const push = Math.sin(T * 2.4);
  const lean = 0.18 + 0.12 * push;
  g.save();
  g.translate(-14, -5);
  g.rotate(-lean * 0.6);
  // legs
  g.strokeStyle = C.navy;
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-4, 0);
  g.lineTo(-2, -16);
  g.moveTo(5, 0);
  g.lineTo(2, -16);
  g.stroke();
  // body (blue jacket)
  const body = new Path2D();
  body.moveTo(-6, -15);
  body.lineTo(-7, -34);
  body.quadraticCurveTo(0, -38, 7, -34);
  body.lineTo(6, -15);
  body.closePath();
  g.fillStyle = C.blue;
  g.fill(body);
  goldStroke(g, body, 1);
  // head + hat
  g.fillStyle = '#e8b98a';
  g.beginPath();
  g.arc(0, -40, 4.5, 0, TAU);
  g.fill();
  const hat = new Path2D();
  hat.moveTo(-14, -41);
  hat.lineTo(0, -53);
  hat.lineTo(14, -41);
  hat.quadraticCurveTo(0, -38, -14, -41);
  hat.closePath();
  g.fillStyle = '#e6c56a';
  g.fill(hat);
  g.strokeStyle = '#a47e2a';
  g.lineWidth = 0.8;
  g.beginPath();
  for (let k = -2; k <= 2; k++) {
    g.moveTo(0, -52);
    g.lineTo(k * 6, -40.5);
  }
  g.stroke();
  goldStroke(g, hat, 1);
  // arms + pole
  const hx = -10 - 4 * push;
  g.strokeStyle = C.blue;
  g.lineWidth = 3.4;
  g.beginPath();
  g.moveTo(-4, -32);
  g.lineTo(hx, -26);
  g.moveTo(4, -31);
  g.lineTo(hx + 4, -22);
  g.stroke();
  g.restore();
  g.strokeStyle = '#a99a3c';
  g.lineWidth = 2.2;
  g.beginPath();
  const pa = 1.2 + 0.18 * push;
  g.moveTo(-30 - 6 * push + Math.cos(pa) * -40, -50 + Math.sin(pa) * -40 + 14);
  g.lineTo(-30 - 6 * push + Math.cos(pa) * 34, -36 + Math.sin(pa) * 34 + 14);
  g.stroke();
  // wake
  g.strokeStyle = 'rgba(255,253,246,0.9)';
  g.lineWidth = 1.6;
  g.beginPath();
  for (let k = 0; k < 3; k++) {
    const wx = 60 + k * 16;
    g.moveTo(wx, 3 + k);
    g.quadraticCurveTo(wx + 8, 1 + k, wx + 14, 4 + k);
  }
  g.stroke();
  g.restore();
}

// ---------------------------------------------------------------------------
// WILD SPOONBILLS in the lagoon
// ---------------------------------------------------------------------------
const FLOCK = [
  { x: 286, y: 812, f: 1, s: 0.86, ph: 0.3, crest: false },
  { x: 372, y: 846, f: 1, s: 1.0, ph: 1.7, crest: true },
  { x: 452, y: 798, f: -1, s: 0.8, ph: 2.9, crest: false },
  { x: 540, y: 850, f: 1, s: 1.06, ph: 0.9, crest: false },
  { x: 622, y: 806, f: -1, s: 0.86, ph: 3.6, crest: true },
  { x: 700, y: 846, f: 1, s: 0.98, ph: 2.2, crest: false },
  { x: 752, y: 790, f: -1, s: 0.74, ph: 4.4, crest: false },
];

function sweepWave(u) {
  // snappy side-to-side on every beat
  const v = Math.sin(u * Math.PI);
  return Math.tanh(3 * v) / Math.tanh(3);
}

function spoonbillState(b, i, T) {
  const sync = env(T, 3.85, 4.05, 5.9, 6.1); // bar 3: everyone in time
  const cheer = env(T, 6.0, 6.15, 7.7, 8.1); // bar 4: heads up, wings out
  // own feeding rhythm otherwise
  const own = Math.sin(T * (2.2 + 0.3 * h1(i)) + b.ph);
  const ownDown = 0.55 + 0.45 * Math.sin(T * 0.45 + b.ph * 2);
  const beatSweep = sweepWave((T - 4) / 0.5);
  const sweep = lerp(own * 0.6, beatSweep, sync);
  const down = clamp(lerp(ownDown, 1, sync) * (1 - cheer), 0, 1);
  const flap = cheer * (0.5 + 0.5 * Math.sin((T - 6) * Math.PI * 4 + i * 0.7));
  return { sweep, down, flap, sync, cheer };
}

function drawWildSpoonbill(g, b, i, T, reflect = false) {
  const st = spoonbillState(b, i, T);
  const s = b.s;
  g.save();
  g.translate(b.x, b.y);
  if (reflect) {
    g.scale(1, -0.55);
    g.globalAlpha = 0.28;
  }
  g.scale(b.f * s, s);
  // legs (long, black)
  const hop = st.cheer * Math.max(0, Math.sin((T - 6) * Math.PI * 2 + i)) * 4;
  g.translate(0, -hop);
  g.strokeStyle = C.ink;
  g.lineCap = 'round';
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(-4, -44);
  g.lineTo(-7, -22);
  g.lineTo(-4, hop);
  g.moveTo(4, -44);
  g.lineTo(3, -22);
  g.lineTo(6, hop);
  g.stroke();
  // body
  const body = new Path2D();
  body.ellipse(-2, -54, 25, 14, -0.12, 0, TAU);
  const tail = new Path2D();
  tail.moveTo(-20, -60);
  tail.lineTo(-34, -50);
  tail.lineTo(-18, -46);
  tail.closePath();
  // neck + head from pose
  const down = st.down;
  const sw = st.sweep;
  const head = P(lerp(20, 36 + sw * 9, down), lerp(-92, -12, down));
  const billA = lerp(0.55, 1.45 + sw * 0.32, down);
  const n0 = P(14, -60);
  const c1 = P(lerp(30, 34, down), lerp(-66, -58, down));
  const c2 = P(lerp(6, 40 + sw * 4, down), lerp(-82, -34, down));
  // wings (raised when cheering)
  const wingUp = st.flap;
  if (wingUp > 0.02) {
    const wing = new Path2D();
    wing.moveTo(8, -60);
    wing.quadraticCurveTo(-6, -60 - 40 * wingUp, -34, -62 - 46 * wingUp);
    wing.quadraticCurveTo(-26, -58 - 22 * wingUp, -30, -52 - 10 * wingUp);
    wing.quadraticCurveTo(-12, -54, 8, -54);
    wing.closePath();
    g.fillStyle = C.white;
    g.fill(wing);
    g.strokeStyle = '#d9e3f0';
    g.lineWidth = 1;
    g.beginPath();
    for (let k = 0; k < 4; k++) {
      g.moveTo(-6 - k * 7, -58 - 20 * wingUp * (0.6 + k * 0.15));
      g.lineTo(-10 - k * 7, -54 - 6 * wingUp);
    }
    g.stroke();
    goldStroke(g, wing, 1.2);
  }
  g.fillStyle = C.white;
  g.fill(tail);
  goldStroke(g, tail, 1.2);
  g.fillStyle = C.white;
  g.fill(body);
  g.save();
  g.clip(body);
  g.fillStyle = '#f9dce4'; // stepped pink belly band (退暈)
  g.beginPath();
  g.ellipse(-4, -44, 26, 9, -0.12, 0, TAU);
  g.fill();
  g.restore();
  goldStroke(g, body, 1.3);
  // folded wing line
  g.strokeStyle = '#c9d3e3';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(10, -58);
  g.quadraticCurveTo(-8, -64, -26, -54);
  g.stroke();
  // neck
  const neck = new Path2D();
  const N = 12;
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    const iu = 1 - u;
    pts.push(
      P(
        iu * iu * iu * n0.x + 3 * iu * iu * u * c1.x + 3 * iu * u * u * c2.x + u * u * u * head.x,
        iu * iu * iu * n0.y + 3 * iu * iu * u * c1.y + 3 * iu * u * u * c2.y + u * u * u * head.y,
      ),
    );
  }
  const L = [];
  const R = [];
  for (let k = 0; k <= N; k++) {
    const a = pts[Math.max(0, k - 1)];
    const c = pts[Math.min(N, k + 1)];
    const dx = c.x - a.x;
    const dy = c.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const w = lerp(6.5, 4.2, k / N);
    L.push(P(pts[k].x - (dy / l) * w, pts[k].y + (dx / l) * w));
    R.push(P(pts[k].x + (dy / l) * w, pts[k].y - (dx / l) * w));
  }
  neck.moveTo(L[0].x, L[0].y);
  for (const p of L) neck.lineTo(p.x, p.y);
  for (let k = R.length - 1; k >= 0; k--) neck.lineTo(R[k].x, R[k].y);
  neck.closePath();
  goldStroke(g, neck, 1.2);
  g.fillStyle = C.white;
  g.fill(neck);
  g.fill(body);
  // breast patch / crest in late-winter breeding dress
  if (b.crest) {
    g.fillStyle = 'rgba(244,211,94,0.9)';
    g.beginPath();
    g.ellipse(14, -58, 7, 5, -0.4, 0, TAU);
    g.fill();
  }
  // head
  g.save();
  g.translate(head.x, head.y);
  const ha = billA - 0.3;
  if (b.crest) {
    g.strokeStyle = C.gold;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(-6, -4);
    g.quadraticCurveTo(-16, -10, -24, -6 + Math.sin(T * 6 + i) * 2);
    g.moveTo(-6, -2);
    g.quadraticCurveTo(-16, -4, -22, 0);
    g.stroke();
  }
  const hp = ellipsePath(0, 0, 8.5, 7.5, ha);
  goldStroke(g, hp, 1.1);
  g.fillStyle = C.white;
  g.fill(hp);
  // black facial skin + spoon bill
  g.rotate(billA);
  g.fillStyle = C.ink;
  g.beginPath();
  g.moveTo(-3, -6);
  g.quadraticCurveTo(6, -7, 8, -3);
  g.lineTo(8, 3);
  g.quadraticCurveTo(4, 7, -2, 5);
  g.quadraticCurveTo(-5, 0, -3, -6);
  g.closePath();
  g.fill();
  const bl = 34;
  g.beginPath();
  g.moveTo(6, -2.8);
  g.lineTo(bl - 7, -1.4);
  g.quadraticCurveTo(bl + 1, -5.5, bl + 2, 0);
  g.quadraticCurveTo(bl + 1, 5.5, bl - 7, 1.6);
  g.lineTo(6, 2.8);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(244,211,94,0.8)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(9, -1);
  g.lineTo(bl - 8, -0.4);
  g.stroke();
  // eye (dark red with a gilt ring)
  g.rotate(-billA);
  const ex = Math.cos(billA - 0.9) * 3.2;
  const ey = Math.sin(billA - 0.9) * 3.2;
  g.fillStyle = C.gold;
  g.beginPath();
  g.arc(ex, ey, 2.2, 0, TAU);
  g.fill();
  g.fillStyle = C.deepRed;
  g.beginPath();
  g.arc(ex, ey, 1.3, 0, TAU);
  g.fill();
  g.restore();
  g.restore();
  // splash + ripples where the bills sweep (on each beat in bar 3)
  if (!reflect && down > 0.75) {
    const tip = P(b.x + b.f * s * (head.x + Math.cos(billA) * 30), b.y + s * (head.y + Math.sin(billA) * 30));
    const beatPh = st.sync > 0.5 ? fract((T - 4) / 0.5) : fract(T * 0.7 + b.ph);
    g.strokeStyle = 'rgba(255,253,246,0.9)';
    g.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) {
      const ph = fract(beatPh + k * 0.5);
      g.globalAlpha = 1 - ph;
      g.beginPath();
      g.ellipse(tip.x, b.y + 2, 6 + ph * 22 * s, (2 + ph * 6) * s, 0, 0, TAU);
      g.stroke();
    }
    g.globalAlpha = 1;
    if (st.sync > 0.5 && beatPh < 0.35) {
      // droplets thrown sideways with the sweep
      const a = 1 - beatPh / 0.35;
      for (let k = 0; k < 5; k++) {
        const dx = (k - 2) * 4 * s + st.sweep * b.f * 10 * beatPh * 3;
        const dy = -beatPh * 40 * s * (0.6 + 0.4 * h1(k + i)) + beatPh * beatPh * 60;
        g.fillStyle = k % 2 ? `rgba(244,211,94,${a})` : `rgba(255,253,246,${a})`;
        g.beginPath();
        g.arc(tip.x + dx, b.y - 4 + dy, 1.8 * s, 0, TAU);
        g.fill();
      }
    }
  }
}

// a skein of black-faced spoonbills flying in for the winter, high over the strait
function drawSkein(g, T) {
  const n = 6;
  const lead = P(1080 - (T + 8) * 34, 236 + 10 * Math.sin(T * 0.4));
  for (let i = 0; i < n; i++) {
    const k = i === 0 ? 0 : Math.ceil(i / 2);
    const side = i === 0 ? 0 : i % 2 ? 1 : -1;
    const x = lead.x + k * 26;
    const y = lead.y + side * k * 13 + (side < 0 ? -2 : 4) * k;
    if (x < -40 || x > 1040) continue;
    const flap = Math.sin(T * 6.4 + i * 0.9);
    g.save();
    g.translate(x, y);
    g.scale(-1, 1);
    // wings
    g.fillStyle = C.white;
    g.strokeStyle = C.gold;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-4, 0);
    g.quadraticCurveTo(-2, -12 * flap, 4, -16 * flap);
    g.quadraticCurveTo(6, -6 * flap, 8, 0);
    g.closePath();
    g.fill();
    g.stroke();
    // body + neck stretched out + spoon bill
    g.beginPath();
    g.ellipse(0, 0, 9, 3.2, 0, 0, TAU);
    g.fill();
    g.stroke();
    g.strokeStyle = C.white;
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(7, -0.5);
    g.lineTo(14, -1.5);
    g.stroke();
    g.fillStyle = C.ink;
    g.beginPath();
    g.moveTo(14, -3);
    g.lineTo(24, -2.2);
    g.quadraticCurveTo(28, -2.4, 27, -0.6);
    g.quadraticCurveTo(25, 0.6, 14, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = C.ink;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(-8, 0.5);
    g.lineTo(-15, 1.5);
    g.stroke();
    g.restore();
  }
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------
const RIDER_STYLE = {
  plumage: '#fffdf6',
  plumageShade: '#f6c1cf',
  mask: '#14131f',
  bill: '#14131f',
  eyeRing: '#f4d35e',
  legs: '#14131f',
  crest: '#f4d35e',
  breast: '#f4d35e',
  frame: '#c8102e',
  frameShade: '#8e0f22',
  metal: '#14306b',
  tire: '#14306b',
  rim: '#f4d35e',
  saddle: '#1b5a37',
  spokes: 12,
};

export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 4.25 : params.rawLocalT;
  const sky = getSky(kit);
  const beam = getBeam(kit);
  const sea = getSea(kit);
  const coast = getCoast(kit);
  const lagoon = getLagoon(kit);
  const weave = getWeave(kit);

  ctx.save();
  ctx.drawImage(sky, 0, 0);
  // drifting temple clouds (they wrap round)
  for (let i = 0; i < CLOUDS.length; i++) {
    const c = CLOUDS[i];
    const spr = getCloudSprite(kit, i);
    const span = S + spr.width;
    let x = c.x - (T + 8) * c.v;
    x = ((((x + spr.width) % span) + span) % span) - spr.width;
    ctx.drawImage(spr, Math.round(x - spr.width / 2), Math.round(c.y - spr.height / 2));
  }
  drawSkein(ctx, T);
  ctx.drawImage(sea, 0, HORIZON);
  // sun-glints on the sea, twinkling on the beat
  ctx.fillStyle = C.gold;
  for (let k = 0; k < 18; k++) {
    const x = fract((h1(k * 3.1) * 1000 + T * 6) / 1000) * 1000;
    const y = lerp(HORIZON + 10, SHORE - 30, h1(k * 7.7));
    const tw = 0.5 + 0.5 * Math.sin(T * Math.PI * 2 + k * 1.3);
    const r = (1 + 2.5 * tw) * (0.5 + (y - HORIZON) / 300);
    ctx.globalAlpha = 0.5 + 0.5 * tw;
    ctx.beginPath();
    ctx.moveTo(x - r * 2, y);
    ctx.lineTo(x, y - r * 0.6);
    ctx.lineTo(x + r * 2, y);
    ctx.lineTo(x, y + r * 0.6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // the wind farm, far to near
  let raftDone = false;
  for (let i = 0; i < TURBINES.length; i++) {
    const t = TURBINES[i];
    if (!raftDone && t.b > RAFT.y) {
      drawRaft(ctx, T);
      raftDone = true;
    }
    const spr = getTurbineSprite(kit, i);
    const W = spr.width;
    const H = spr.height;
    ctx.drawImage(spr, Math.round(t.x - W / 2), Math.round(t.b - (H - 8)));
    drawTurbineFoam(ctx, t, T);
    drawRotor(ctx, t, T);
  }
  if (!raftDone) drawRaft(ctx, T);
  ctx.drawImage(coast, 0, 380);
  ctx.drawImage(lagoon, 0, LAGOON_Y - 2);
  // reflections, then the wild flock (back row first)
  const order = FLOCK.map((b, i) => i).sort((a, b) => FLOCK[a].y - FLOCK[b].y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, LAGOON_Y + 4, S, HEM_Y - LAGOON_Y - 8);
  ctx.clip();
  for (const i of order) drawWildSpoonbill(ctx, FLOCK[i], i, T, true);
  ctx.restore();
  for (const i of order) drawWildSpoonbill(ctx, FLOCK[i], i, T, false);
  ctx.drawImage(beam, 0, 0);

  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params, { arch: 0 });
    // navy keyline pass, then the gilt-outlined folk-colour pass
    kit.drawRider(ctx, rig, { ...RIDER_STYLE, outline: C.ink, outlineWidth: 3.4, pinwheel: scene.pinwheel });
    kit.drawRider(ctx, rig, { ...RIDER_STYLE, outline: C.gold, outlineWidth: 1.5, pinwheel: scene.pinwheel });
  }
  ctx.globalAlpha = 0.9;
  ctx.drawImage(weave, 0, 0);
  ctx.restore();
}
