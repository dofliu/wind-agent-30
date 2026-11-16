// src/scenes/vindeby.js
// #16 1991 · 第一座離岸風場 — Vindeby, off the north coast of Lolland, Denmark: the world's
// first offshore wind farm. Painted as an early-90s 16-bit video-game stage: everything is
// drawn pixel by pixel into a 250x250 low-res buffer (no anti-aliasing), with a fixed
// 20-colour palette, Bayer-dithered sky and sea gradients, sprites, a HUD with a bitmap
// font, and the whole stage ticking at 12 fps (kit.quantizeTime). The buffer is blown up
// x4 with smoothing off, plus faint CRT scanlines.
//
// Machine (historically): ELEVEN Bonus 450 kW turbines (4.95 MW) in TWO rows (6 + 5) in
// 2–7 m of shallow water 1.5–3 km off the coast; white tubular towers (hub ≈ 38 m),
// three-bladed UPWIND rotors (Ø ≈ 35 m), standing on concrete gravity (caisson)
// foundations with an access platform and ladder; a service boat works the rows.
//
// Gag (game logic): the rider's road is a wooden pier / causeway across the water. Each
// time the spoonbill passes under a turbine column, that turbine "powers up" (spins up
// from idle), a pixel "+450 kW" pops out of its nacelle and the HUD score counts up —
// eleven columns, 11 x 450 = 4950 kW. A gull perched on the railing takes off as the
// bicycle approaches; after the last column the HUD flashes STAGE CLEAR / 4.95 MW.

const P = 1000;
const LR = 250; // low-res buffer size (1 pixel = 4 panel px)
const SCALE = P / LR;
const ROAD = 175; // pier deck top in low-res px (= 700 panel px)
const FPS = 12;
let K = null;

// --- palette (20 colours) ------------------------------------------------------------
const PAL = {
  ink: '#0b1a2e',
  navy: '#0b2a4a',
  sea3: '#1b4f7a',
  sea2: '#2e6fae',
  blue: '#3f8fd2',
  sky2: '#6fb3e8',
  sky1: '#9ad0f5',
  haze: '#d4ecfa',
  white: '#f4f4f4',
  lgray: '#b8c2cc',
  gray: '#7b8794',
  dgray: '#4a5561',
  yellow: '#f2c14e',
  pale: '#ffe9a8',
  orange: '#e07a2e',
  red: '#c8402e',
  dred: '#8a2a20',
  green: '#3c8c4a',
  lgreen: '#8cc25a',
  brown: '#6b4a2e',
  tan: '#a77b4f',
};
const PAL_LIST = Object.values(PAL);

// --- stage layout (low-res px) --------------------------------------------------------
const HORIZON = 96;
const BACK = { water: 104, R: 13, hubH: 28, xs: [20, 62, 104, 146, 188, 230] };
const FRONT = { water: 130, R: 22, hubH: 47, xs: [41, 83, 125, 167, 209] };
const FORESHORT = 0.8; // rotors yawed a little toward the left (upwind of the tower)
const HUD = { y0: 0, y1: 29 };

// eleven columns in the order the rider passes them
const COLUMNS = [];
for (const x of BACK.xs) COLUMNS.push({ x, row: 'back' });
for (const x of FRONT.xs) COLUMNS.push({ x, row: 'front' });
COLUMNS.sort((a, b) => a.x - b.x);
COLUMNS.forEach((c, i) => {
  c.i = i;
  c.ta = (c.x * SCALE) / 125; // rawLocalT at which the rider's centre passes under it
  c.phase = i * 1.37;
  if (c.row === 'back') {
    c.hub = { x: c.x - 1, y: BACK.water - BACK.hubH };
    c.R = BACK.R;
  } else {
    c.hub = { x: c.x - 2, y: FRONT.water - FRONT.hubH };
    c.R = FRONT.R;
  }
});

// =============================================================================
// pixel primitives (integer pixels only, never anti-aliased)
// =============================================================================
function rect(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

function px(g, x, y, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Bresenham line, `w` = 1 or 2 px thick. */
function line(g, x0, y0, x1, y1, c, w = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  g.fillStyle = c;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 400; n++) {
    g.fillRect(x0, y0, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

function hexRGB(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Dithered vertical gradient written straight into ImageData. stops: [[y, hex], ...] */
function ditherGradient(img, x0, x1, stops) {
  const d = img.data;
  const W = img.width;
  for (let s = 0; s < stops.length - 1; s++) {
    const [ya, ca] = stops[s];
    const [yb, cb] = stops[s + 1];
    const A = hexRGB(ca);
    const B = hexRGB(cb);
    for (let y = ya; y < yb; y++) {
      const f = (y - ya) / Math.max(1, yb - ya);
      for (let x = x0; x < x1; x++) {
        const c = f > bayer(x, y) ? B : A;
        const i = (y * W + x) * 4;
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
        d[i + 3] = 255;
      }
    }
  }
}

// =============================================================================
// 5x7 bitmap font
// =============================================================================
const GLYPHS = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  k: ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
  x: ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '·': ['00000', '00000', '00000', '01100', '01100', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function textWidth(str, s = 1) {
  return str.length * 6 * s - s;
}

/** Bitmap text at integer position; `shadow` adds a 1px drop shadow, `outline` a ring. */
function drawText(g, str, x, y, col, opts = {}) {
  const s = opts.scale || 1;
  const pass = (ox, oy, c) => {
    g.fillStyle = c;
    let cx = Math.round(x);
    for (const ch of str) {
      const gl = GLYPHS[ch] || GLYPHS[' '];
      for (let r = 0; r < 7; r++) {
        const row = gl[r];
        for (let q = 0; q < 5; q++) if (row[q] === '1') g.fillRect(cx + q * s + ox, Math.round(y) + r * s + oy, s, s);
      }
      cx += 6 * s;
    }
  };
  if (opts.outline) {
    for (const [ox, oy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
    ])
      pass(ox, oy, opts.outline);
  }
  if (opts.shadow) pass(s, s, opts.shadow);
  pass(0, 0, col);
}

// =============================================================================
// BAKE: back layer (sky, coast, sea, back-row towers)
// =============================================================================
function paintBack(g, rng) {
  const img = g.createImageData(LR, LR);
  ditherGradient(img, 0, LR, [
    [0, PAL.blue],
    [42, PAL.sky2],
    [76, PAL.sky1],
    [HORIZON, PAL.haze],
  ]);
  ditherGradient(img, 0, LR, [
    [HORIZON, PAL.sky1],
    [106, PAL.sky2],
    [134, PAL.blue],
    [ROAD + 1, PAL.sea2],
  ]);
  ditherGradient(img, 0, LR, [
    [ROAD + 1, PAL.sea2],
    [196, PAL.sea3],
    [226, PAL.navy],
    [LR, PAL.navy],
  ]);
  g.putImageData(img, 0, 0);

  // sun (behind the clouds, upper right)
  disc(g, 196, 48, 8, PAL.yellow);
  disc(g, 196, 48, 6, PAL.pale);
  px(g, 193, 45, PAL.white);
  px(g, 194, 45, PAL.white);
  px(g, 193, 46, PAL.white);

  // Lolland coast on the horizon (left): fields, tree clumps, farm houses, a church
  for (let x = 0; x < 132; x++) {
    const h = x < 120 ? 3 + Math.round(1.2 * Math.sin(x * 0.11) + (x > 100 ? (100 - x) * 0.15 : 0)) : 0;
    if (h <= 0) continue;
    rect(g, x, HORIZON - h, 1, h, (x + Math.floor(x / 7)) % 9 === 0 ? PAL.lgreen : PAL.green);
  }
  for (let i = 0; i < 9; i++) {
    const x = 6 + i * 12 + Math.floor(rng() * 6);
    const r = 2 + Math.floor(rng() * 2);
    disc(g, x, HORIZON - 4, r, '#2c6b3a');
    px(g, x - 1, HORIZON - 5 - r + 1, PAL.green);
  }
  for (const [x, roof] of [
    [24, PAL.red],
    [53, PAL.red],
    [86, PAL.dred],
  ]) {
    rect(g, x, HORIZON - 5, 5, 3, PAL.white);
    rect(g, x - 1, HORIZON - 7, 7, 2, roof);
    px(g, x + 2, HORIZON - 4, PAL.dgray);
  }
  // white church with a stepped gable tower (a Danish landmark type)
  rect(g, 66, HORIZON - 6, 8, 4, PAL.white);
  rect(g, 65, HORIZON - 7, 10, 1, PAL.dred);
  rect(g, 62, HORIZON - 11, 4, 9, PAL.white);
  px(g, 62, HORIZON - 12, PAL.white);
  px(g, 65, HORIZON - 12, PAL.white);
  rect(g, 63, HORIZON - 13, 2, 2, PAL.white);
  px(g, 63, HORIZON - 9, PAL.dgray);
  // far freighter on the right horizon
  rect(g, 214, HORIZON - 2, 16, 2, PAL.gray);
  rect(g, 216, HORIZON - 4, 3, 2, PAL.lgray);
  rect(g, 226, HORIZON - 5, 2, 3, PAL.lgray);
  px(g, 227, HORIZON - 6, PAL.red);

  // sea surface texture: long pixel streaks, lighter far away, dark ripples near
  for (let i = 0; i < 140; i++) {
    const y = HORIZON + 2 + Math.floor(Math.pow(rng(), 1.4) * (ROAD - HORIZON - 4));
    const x = Math.floor(rng() * LR);
    const len = 2 + Math.floor(rng() * (2 + (y - HORIZON) * 0.12));
    const near = (y - HORIZON) / (ROAD - HORIZON);
    rect(g, x, y, len, 1, rng() < 0.5 ? (near < 0.3 ? PAL.haze : PAL.sky1) : near < 0.5 ? PAL.blue : PAL.sea3);
  }

  // under the pier: light shafts through shallow water, sandy seabed, stones
  const SEABED = 234;
  for (let y = ROAD + 12; y < SEABED; y++) {
    for (let x = 0; x < LR; x++) {
      const band = ((x + (y - ROAD) * 0.55) % 46 + 46) % 46;
      if (band < 9 && bayer(x, y) < 0.32 * (1 - (y - ROAD) / 70)) px(g, x, y, PAL.sea2);
    }
  }
  for (let y = SEABED - 3; y < LR; y++) {
    for (let x = 0; x < LR; x++) {
      const edge = SEABED + Math.round(2 * Math.sin(x * 0.09) + Math.sin(x * 0.31));
      if (y < edge) continue;
      const f = (y - edge) / 8;
      px(g, x, y, f > bayer(x, y) ? PAL.brown : y === edge ? PAL.pale : PAL.tan);
    }
  }
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rng() * LR);
    const w = 3 + Math.floor(rng() * 5);
    rect(g, x, SEABED - 1, w, 2, PAL.gray);
    rect(g, x + 1, SEABED - 2, w - 2, 1, PAL.lgray);
    rect(g, x, SEABED + 1, w, 1, PAL.dgray);
  }
  // shells / pebbles
  for (let i = 0; i < 40; i++) px(g, Math.floor(rng() * LR), SEABED + 2 + Math.floor(rng() * 8), rng() < 0.5 ? PAL.pale : PAL.dgray);

  // back row: six smaller turbines (hazier, further away)
  for (const c of COLUMNS) if (c.row === 'back') paintTurbineStatic(g, c, false);
}

/** Tower + nacelle + concrete gravity foundation (rotor is animated separately). */
function paintTurbineStatic(g, c, front) {
  const wy = front ? FRONT.water : BACK.water;
  const hub = c.hub;
  const x = c.x;
  const lit = PAL.white;
  const shade = front ? PAL.lgray : PAL.lgray;
  if (front) {
    // concrete caisson: wide, sloped top, dark waterline
    rect(g, x - 5, wy - 4, 11, 5, PAL.gray);
    rect(g, x - 5, wy - 4, 4, 5, PAL.lgray);
    rect(g, x + 4, wy - 4, 2, 5, PAL.dgray);
    rect(g, x - 6, wy + 1, 13, 1, PAL.dgray);
    // access platform with railing
    rect(g, x - 7, wy - 6, 15, 2, PAL.dgray);
    rect(g, x - 7, wy - 6, 15, 1, PAL.gray);
    for (let k = -7; k <= 7; k += 3) rect(g, x + k, wy - 9, 1, 3, PAL.lgray);
    rect(g, x - 7, wy - 9, 15, 1, PAL.lgray);
    // boat-landing ladder into the water
    rect(g, x - 9, wy - 6, 1, 8, PAL.yellow);
    rect(g, x - 11, wy - 6, 1, 8, PAL.yellow);
    for (let k = 0; k < 8; k += 2) px(g, x - 10, wy - 5 + k, PAL.yellow);
    // tower: tapered tube from 4 to 3 px wide, lit left / shaded right
    const top = hub.y + 3;
    const bot = wy - 6;
    for (let y = top; y < bot; y++) {
      const u = (y - top) / (bot - top);
      const w = u > 0.45 ? 4 : 3;
      rect(g, x - 1, y, w - 1, 1, lit);
      rect(g, x - 1 + w - 1, y, 1, 1, shade);
    }
    // door + flange
    rect(g, x, bot - 4, 1, 3, PAL.dgray);
    rect(g, x - 2, bot - 1, 6, 1, PAL.lgray);
    // nacelle: box behind the hub (rotor upwind, to the left)
    rect(g, hub.x + 1, hub.y - 2, 8, 4, lit);
    rect(g, hub.x + 1, hub.y + 1, 8, 1, shade);
    rect(g, hub.x + 8, hub.y - 2, 1, 4, shade);
    rect(g, hub.x + 2, hub.y - 3, 6, 1, lit);
    px(g, hub.x + 7, hub.y - 4, PAL.lgray); // anemometer mast
    px(g, hub.x + 7, hub.y - 5, PAL.red); // aviation light
  } else {
    rect(g, x - 3, wy - 2, 7, 3, PAL.gray);
    rect(g, x - 3, wy - 2, 3, 3, PAL.lgray);
    rect(g, x - 4, wy - 3, 9, 1, PAL.dgray);
    rect(g, x - 4, wy + 1, 9, 1, PAL.sea2);
    const top = hub.y + 2;
    const bot = wy - 3;
    for (let y = top; y < bot; y++) {
      rect(g, x - 1, y, 1, 1, lit);
      rect(g, x, y, 1, 1, y > (top + bot) / 2 ? shade : lit);
    }
    rect(g, hub.x + 1, hub.y - 1, 5, 3, lit);
    rect(g, hub.x + 1, hub.y + 1, 5, 1, shade);
    px(g, hub.x + 5, hub.y - 2, PAL.red);
  }
}

// =============================================================================
// BAKE: front layer (front-row turbines, pier, railing, piles, sign, HUD frame)
// =============================================================================
function paintFront(g, rng) {
  for (const c of COLUMNS) {
    if (c.row !== 'front') continue;
    // broken reflection of the white tower in the shallow water
    for (let k = 0; k < 9; k++) {
      const y = FRONT.water + 3 + k * 2;
      const w = k < 4 ? 3 : 2;
      rect(g, c.x - 1 + (k % 2), y, w, 1, k < 5 ? PAL.haze : PAL.sky2);
    }
    rect(g, c.x - 6, FRONT.water + 2, 13, 1, PAL.sea2);
    paintTurbineStatic(g, c, true);
  }

  // pier deck (the road): planks seen slightly from above
  rect(g, 0, ROAD, LR, 1, PAL.pale);
  rect(g, 0, ROAD + 1, LR, 2, PAL.tan);
  rect(g, 0, ROAD + 3, LR, 3, PAL.brown);
  for (let x = 0; x < LR; x += 7) {
    px(g, x, ROAD + 1, PAL.brown);
    px(g, x, ROAD + 2, PAL.brown);
    px(g, x + 3, ROAD + 4, PAL.ink);
  }
  rect(g, 0, ROAD + 6, LR, 1, PAL.ink);
  // far railing (behind the rider)
  for (let x = 4; x < LR; x += 12) {
    rect(g, x, ROAD - 10, 2, 10, PAL.brown);
    px(g, x, ROAD - 10, PAL.tan);
  }
  rect(g, 0, ROAD - 11, LR, 2, PAL.tan);
  rect(g, 0, ROAD - 10, LR, 1, PAL.brown);
  rect(g, 0, ROAD - 6, LR, 1, PAL.brown);
  // dark gap under the deck down to the water surface
  rect(g, 0, ROAD + 7, LR, 3, PAL.navy);
  for (let x = 0; x < LR; x++) if (x % 2 === 0) px(g, x, ROAD + 9, PAL.sea3);
  // piles: timber above the surface, darker and weedy below, driven into the sand
  for (let x = 4; x < LR; x += 24) {
    rect(g, x, ROAD + 7, 3, 4, PAL.brown);
    rect(g, x + 2, ROAD + 7, 1, 4, PAL.ink);
    for (let y = ROAD + 11; y < 237; y++) {
      rect(g, x, y, 2, 1, y % 5 === 0 ? PAL.sea3 : PAL.dgray);
      px(g, x + 2, y, PAL.ink);
      if (y > 222 && (x * 7 + y) % 4 === 0) px(g, x - 1 + ((y >> 1) & 1) * 3, y, PAL.green);
    }
    rect(g, x - 1, 235, 5, 1, PAL.dgray);
  }
  // horizontal wale just under the surface
  rect(g, 0, ROAD + 14, LR, 1, PAL.dgray);

  // name board on the railing: "VINDEBY"
  const bx = 150;
  const by = ROAD - 25;
  rect(g, bx + 8, by + 11, 2, 14, PAL.brown);
  rect(g, bx + 38, by + 11, 2, 14, PAL.brown);
  rect(g, bx - 2, by - 2, 52, 13, PAL.ink);
  rect(g, bx - 1, by - 1, 50, 11, PAL.sea2);
  rect(g, bx - 1, by - 1, 50, 1, PAL.blue);
  drawText(g, 'VINDEBY', bx + 3, by + 1, PAL.white, { shadow: PAL.ink });

  // flag pole at the pier head (left); the flag itself waves per frame
  rect(g, 12, ROAD - 40, 1, 40, PAL.lgray);
  px(g, 12, ROAD - 41, PAL.yellow);

  // HUD band
  rect(g, 0, HUD.y0, LR, HUD.y1 - HUD.y0, PAL.ink);
  rect(g, 0, HUD.y1, LR, 1, PAL.blue);
  rect(g, 0, HUD.y1 + 1, LR, 1, PAL.navy);
  drawText(g, 'STAGE 1991', 10, HUD.y0 + 10, PAL.yellow, { shadow: PAL.dred });
  drawText(g, '· OFFSHORE', 10 + textWidth('STAGE 1991') + 4, HUD.y0 + 10, PAL.white, { shadow: PAL.dgray });
  drawText(g, 'LOLLAND DK', 10, HUD.y0 + 19, PAL.sky2);
  drawText(g, 'kW', 184, HUD.y0 + 10, PAL.sky1);
  void rng;
}

// =============================================================================
// sprites (baked once)
// =============================================================================
function cloudSprite(key, w, h, seed) {
  return K.bake(key, w, h, (g) => {
    const rng = K.makePRNG(seed);
    const bumps = [];
    let x = 4;
    while (x < w - 6) {
      const r = 3 + Math.floor(rng() * (h * 0.38));
      bumps.push([x + r, h - 4 - r * 0.9, r]);
      x += r + 1 + Math.floor(rng() * 3);
    }
    // shadow pass then light pass (classic two-tone pixel cloud with flat base)
    for (const [cx, cy, r] of bumps) disc(g, cx, cy + 1, r, PAL.lgray);
    rect(g, 3, h - 5, w - 8, 3, PAL.lgray);
    for (const [cx, cy, r] of bumps) disc(g, cx - 1, cy - 1, r - 1, PAL.white);
    rect(g, 4, h - 6, w - 10, 1, PAL.white);
    // haze line under the base
    rect(g, 6, h - 2, w - 14, 1, PAL.sky1);
  });
}

function gullSprite(frame) {
  // 11x6, frame 0 wings up, 1 level, 2 down
  return K.bake(`vindeby_gull_${frame}`, 11, 7, (g) => {
    rect(g, 3, 3, 5, 2, PAL.white); // body
    px(g, 8, 3, PAL.white); // head
    px(g, 9, 3, PAL.yellow); // bill
    px(g, 2, 3, PAL.lgray); // tail
    if (frame === 0) {
      line(g, 4, 3, 2, 0, PAL.lgray);
      line(g, 6, 3, 7, 0, PAL.lgray);
      px(g, 2, 0, PAL.ink);
      px(g, 7, 0, PAL.ink);
    } else if (frame === 1) {
      rect(g, 0, 2, 4, 1, PAL.lgray);
      rect(g, 7, 2, 3, 1, PAL.lgray);
      px(g, 0, 2, PAL.ink);
      px(g, 10, 2, PAL.ink);
    } else {
      line(g, 4, 4, 1, 6, PAL.lgray);
      line(g, 6, 4, 8, 6, PAL.lgray);
      px(g, 1, 6, PAL.ink);
      px(g, 8, 6, PAL.ink);
    }
  });
}

function perchedGull() {
  return K.bake('vindeby_gull_perch', 8, 8, (g) => {
    rect(g, 1, 3, 5, 3, PAL.white);
    rect(g, 2, 3, 4, 1, PAL.lgray); // folded wing
    px(g, 1, 3, PAL.ink); // wing tip
    rect(g, 5, 1, 2, 2, PAL.white); // head
    px(g, 6, 1, PAL.ink); // eye
    px(g, 7, 2, PAL.yellow); // bill
    px(g, 3, 6, PAL.orange);
    px(g, 4, 6, PAL.orange);
    px(g, 3, 7, PAL.orange);
    px(g, 4, 7, PAL.orange);
  });
}

function boatSprite() {
  // service boat, 28x13, facing left
  return K.bake('vindeby_boat', 30, 14, (g) => {
    // hull
    rect(g, 3, 8, 24, 3, PAL.red);
    rect(g, 1, 7, 4, 2, PAL.red);
    rect(g, 3, 11, 22, 1, PAL.dred);
    rect(g, 2, 8, 26, 1, PAL.white);
    rect(g, 26, 7, 2, 2, PAL.red);
    // wheelhouse
    rect(g, 13, 2, 10, 6, PAL.white);
    rect(g, 13, 2, 10, 1, PAL.lgray);
    rect(g, 22, 3, 1, 5, PAL.lgray);
    rect(g, 14, 4, 2, 2, PAL.ink);
    rect(g, 17, 4, 2, 2, PAL.ink);
    rect(g, 20, 4, 1, 2, PAL.ink);
    // mast + light
    rect(g, 19, 0, 1, 2, PAL.lgray);
    px(g, 19, 0, PAL.yellow);
    // fender / bow push-knees
    rect(g, 1, 6, 2, 2, PAL.ink);
    // deck crate
    rect(g, 6, 6, 4, 2, PAL.orange);
  });
}

function popupSprite() {
  return K.bake('vindeby_popup', 48, 11, (g) => {
    drawText(g, '+450 kW', 2, 2, PAL.yellow, { outline: PAL.ink });
  });
}

/**
 * 12 pedal phases of the spoonbill, hand-pixelled from the rig: every rig joint is mapped
 * to the low-res grid and the bird + bicycle are rasterised pixel by pixel (no AA).
 */
function riderSheet() {
  const CW = 100;
  const CH = 80;
  return K.bake('vindeby_rider_px', CW * 12, CH, (g) => {
    const img = g.createImageData(CW * 12, CH);
    const IK = 1;
    const IW = 2;
    const IL = 3;
    const IG = 4;
    const ID = 5;
    const IY = 6;
    const IR = 7;
    const IDR = 8;
    const COLS = [null, PAL.ink, PAL.white, PAL.lgray, PAL.gray, PAL.dgray, PAL.yellow, PAL.red, PAL.dred].map((c) => c && hexRGB(c));
    for (let k = 0; k < 12; k++) {
      const buf = new Uint8Array(CW * CH);
      const set = (x, y, c) => {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x >= 0 && y >= 0 && x < CW && y < CH) buf[y * CW + x] = c;
      };
      const get = (x, y) => (x >= 0 && y >= 0 && x < CW && y < CH ? buf[y * CW + x] : 0);
      const rig = K.computeRiderRig({ x: 0, y: 0, pedalAngle: (k * Math.PI * 2) / 12, time: 0.3, speedScale: 1, pinwheelAngle: 0 });
      const T = (p) => ({ x: 50 + p.x / SCALE, y: 72 + p.y / SCALE });
      const lineB = (pa, pb, c, w = 1) => {
        let x0 = Math.round(pa.x - 0.5);
        let y0 = Math.round(pa.y - 0.5);
        const x1 = Math.round(pb.x - 0.5);
        const y1 = Math.round(pb.y - 0.5);
        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (let n = 0; n < 300; n++) {
          set(x0, y0, c);
          if (w > 1) {
            set(x0 + 1, y0, c);
            set(x0, y0 + 1, c);
          }
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) {
            err += dy;
            x0 += sx;
          }
          if (e2 <= dx) {
            err += dx;
            y0 += sy;
          }
        }
      };
      const poly = (pts, c) => {
        for (let i = 0; i < pts.length - 1; i++) lineB(pts[i], pts[i + 1], c);
      };
      const ellipse = (cx, cy, rx, ry, tilt, fn) => {
        const ct = Math.cos(-tilt);
        const st = Math.sin(-tilt);
        const R = Math.max(rx, ry) + 1;
        for (let y = Math.floor(cy - R); y <= cy + R; y++) {
          for (let x = Math.floor(cx - R); x <= cx + R; x++) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            const u = dx * ct - dy * st;
            const v = dx * st + dy * ct;
            if ((u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1) fn(x, y, u, v);
          }
        }
      };
      const ring = (c0, r0, r1, c) => {
        for (let y = Math.floor(c0.y - r1 - 1); y <= c0.y + r1 + 1; y++) {
          for (let x = Math.floor(c0.x - r1 - 1); x <= c0.x + r1 + 1; x++) {
            const d = Math.hypot(x + 0.5 - c0.x, y + 0.5 - c0.y);
            if (d >= r0 && d <= r1) set(x, y, c);
          }
        }
      };
      const tri = (a, b, c, col) => {
        const minX = Math.floor(Math.min(a.x, b.x, c.x));
        const maxX = Math.ceil(Math.max(a.x, b.x, c.x));
        const minY = Math.floor(Math.min(a.y, b.y, c.y));
        const maxY = Math.ceil(Math.max(a.y, b.y, c.y));
        const s = (p, q, r) => (p.x - r.x) * (q.y - r.y) - (q.x - r.x) * (p.y - r.y);
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const pt = { x: x + 0.5, y: y + 0.5 };
            const d1 = s(pt, a, b);
            const d2 = s(pt, b, c);
            const d3 = s(pt, c, a);
            const neg = d1 < 0 || d2 < 0 || d3 < 0;
            const pos = d1 > 0 || d2 > 0 || d3 > 0;
            if (!(neg && pos)) set(x, y, col);
          }
        }
      };

      const rw = T(rig.rearWheel);
      const fw = T(rig.frontWheel);
      const bb = T(rig.bb);
      // wheels: 2px tyre + grey rim (spokes are animated per frame)
      for (const w of [rw, fw]) {
        ring(w, 9.7, 11.3, IK);
        ring(w, 8.6, 9.6, IG);
      }
      // chain + chainring
      ring(bb, 2.0, 3.1, IG);
      lineB({ x: rw.x, y: rw.y - 1 }, { x: bb.x, y: bb.y - 3 }, ID);
      lineB({ x: rw.x, y: rw.y + 1 }, { x: bb.x, y: bb.y + 3 }, ID);
      // far leg + far crank
      const fp = T(rig.farPedal);
      lineB(bb, fp, ID);
      lineB({ x: fp.x - 1.5, y: fp.y }, { x: fp.x + 1.5, y: fp.y }, ID);
      poly([T(rig.farHip), T(rig.farKnee), T(rig.farFoot)], ID);
      // frame: red tubes with a dark-red underside pixel
      const sc = T(rig.seatCluster);
      const ht = T(rig.headTop);
      const hb = T(rig.headBot);
      for (const [p, q] of [
        [rw, sc],
        [sc, bb],
        [bb, rw],
        [sc, ht],
        [hb, bb],
      ]) {
        lineB({ x: p.x, y: p.y + 1 }, { x: q.x, y: q.y + 1 }, IDR);
        lineB(p, q, IR);
      }
      lineB(ht, hb, IR);
      lineB(hb, fw, IDR);
      // seat post + saddle, stem + bar
      const sd = T(rig.saddle);
      lineB(sc, sd, ID);
      lineB({ x: sd.x - 3, y: sd.y }, { x: sd.x + 2.5, y: sd.y }, IK);
      lineB({ x: sd.x - 2, y: sd.y - 1 }, { x: sd.x + 1, y: sd.y - 1 }, ID);
      const st = T(rig.stemTop);
      const gr = T(rig.grip);
      lineB(ht, st, ID);
      lineB(st, gr, ID);
      // tail + body (white, lower third shaded)
      const b = rig.body;
      const bc = T(b);
      const tt = T(rig.tailTip);
      const brx = b.rx / SCALE;
      const bry = b.ry / SCALE;
      tri(
        T({ x: b.x - b.rx * 0.6, y: b.y - b.ry * 0.35 }),
        tt,
        T({ x: b.x - b.rx * 0.55, y: b.y + b.ry * 0.45 }),
        IL,
      );
      ellipse(bc.x, bc.y, brx, bry, b.tilt, (x, y, u, v) => set(x, y, v > bry * 0.42 ? IL : IW));
      // folded wing: grey lens along the back with darker primaries
      const sh = T(rig.wingShoulder);
      const wc = { x: (sh.x + tt.x) / 2 - 1, y: (sh.y + tt.y) / 2 + 1.2 };
      const wl = Math.hypot(sh.x - tt.x, sh.y - tt.y) / 2;
      const wa = Math.atan2(tt.y - sh.y, tt.x - sh.x);
      ellipse(wc.x, wc.y, wl, 2.2, wa, (x, y, u) => set(x, y, u > wl * 0.45 ? IG : IL));
      // neck (S-curve, 3 px)
      const n0 = T(rig.neckBase);
      const n1 = T(rig.neckC1);
      const n2 = T(rig.neckC2);
      const hd = T(rig.head);
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const iu = 1 - u;
        const x = iu * iu * iu * n0.x + 3 * iu * iu * u * n1.x + 3 * iu * u * u * n2.x + u * u * u * hd.x;
        const y = iu * iu * iu * n0.y + 3 * iu * iu * u * n1.y + 3 * iu * u * u * n2.y + u * u * u * hd.y;
        ellipse(x, y, 1.5, 1.5, 0, (px2, py2) => set(px2, py2, IW));
      }
      const ch = T(rig.chest);
      set(ch.x - 1, ch.y, IY);
      set(ch.x - 2, ch.y, IY);
      set(ch.x - 1, ch.y + 1, IY);
      // breeding crest streaming back (yellow)
      const cr = T(rig.crestRoot);
      lineB(cr, T(rig.crestTip1), IY);
      lineB({ x: cr.x, y: cr.y + 1 }, T(rig.crestTip2), IY);
      // head + black face mask + eye
      const hr = rig.head.r / SCALE + 0.35;
      ellipse(hd.x, hd.y, hr, hr, 0, (x, y, u, v) => set(x, y, u > -0.6 && v > -hr * 0.75 ? IK : IW));
      const bb0 = T(rig.billBase);
      const bt = T(rig.billTip);
      // bill: black, 2 px at the base, spatulate tip
      lineB({ x: bb0.x - 1, y: bb0.y - 1 }, { x: bt.x - 2, y: bt.y - 1 }, IK);
      lineB(bb0, bt, IK);
      const ux = (bt.x - bb0.x) / Math.hypot(bt.x - bb0.x, bt.y - bb0.y);
      const uy = (bt.y - bb0.y) / Math.hypot(bt.x - bb0.x, bt.y - bb0.y);
      ellipse(bt.x - ux * 1.6, bt.y - uy * 1.6, 2.1, 1.5, Math.atan2(uy, ux), (x, y) => set(x, y, IK));
      const ey = T(rig.eye);
      set(ey.x, ey.y, IY);
      // near leg + crank + pedal (black legs, grey crank)
      const np = T(rig.nearPedal);
      poly([T(rig.nearHip), T(rig.nearKnee), T(rig.nearFoot)], IK);
      const nf = T(rig.nearFoot);
      lineB(nf, { x: nf.x + 3, y: nf.y + 0.6 }, IK);
      lineB(bb, np, IG);
      lineB({ x: np.x - 1.5, y: np.y + 0.5 }, { x: np.x + 1.5, y: np.y + 0.5 }, ID);
      // near wing reaching for the bar
      const el = T(rig.wingElbow);
      const wh = T(rig.wingHand);
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        const a = u < 0.5 ? { x: sh.x - 2.5, y: sh.y } : el;
        const c = u < 0.5 ? el : wh;
        const f = u < 0.5 ? u * 2 : (u - 0.5) * 2;
        const x = a.x + (c.x - a.x) * f;
        const y = a.y + (c.y - a.y) * f;
        const r = 1.9 - u * 0.9;
        ellipse(x, y, r, r, 0, (px2, py2) => set(px2, py2, IW));
      }
      lineB({ x: sh.x - 3, y: sh.y + 2 }, { x: el.x - 1, y: el.y + 1.5 }, IL);

      // outline the light (bird) pixels with ink
      const out = buf.slice();
      for (let y = 0; y < CH; y++) {
        for (let x = 0; x < CW; x++) {
          if (buf[y * CW + x]) continue;
          const isLight = (c) => c === IW || c === IL || c === IY;
          if (isLight(get(x - 1, y)) || isLight(get(x + 1, y)) || isLight(get(x, y - 1)) || isLight(get(x, y + 1))) out[y * CW + x] = IK;
        }
      }
      const d = img.data;
      for (let y = 0; y < CH; y++) {
        for (let x = 0; x < CW; x++) {
          const c = out[y * CW + x];
          if (!c) continue;
          const i = (y * CW * 12 + k * CW + x) * 4;
          d[i] = COLS[c][0];
          d[i + 1] = COLS[c][1];
          d[i + 2] = COLS[c][2];
          d[i + 3] = 255;
        }
      }
    }
    g.putImageData(img, 0, 0);
  });
}

function scanlines() {
  return K.bake('vindeby_scan', P, P, (g) => {
    g.fillStyle = 'rgba(0,0,0,0.085)';
    for (let y = 3; y < P; y += 4) g.fillRect(0, y, P, 1);
    // soft CRT bloom toward the corners
    K.vignette(g, P, P, 0.22, '4,10,24');
  });
}

// =============================================================================
// animation helpers
// =============================================================================
const W_IDLE = 0.45; // rad/s, idling before the column is "powered up"
const W_RUN = 3.7; // rad/s (~35 rpm, Bonus 450 kW fixed-speed rotor)
const RAMP = 0.7;

function rotorAngle(c, lt, thumb) {
  if (thumb) return c.phase + 2.1;
  let a = c.phase + W_IDLE * lt;
  const u = lt - c.ta;
  if (u > 0) {
    if (u < RAMP) a += ((W_RUN - W_IDLE) * u * u) / (2 * RAMP);
    else a += ((W_RUN - W_IDLE) * RAMP) / 2 + (W_RUN - W_IDLE) * (u - RAMP);
  }
  return a; // clockwise when seen from the front (upwind side, as here)
}

function drawRotor(g, c, ang, front) {
  const { x, y } = c.hub;
  const R = c.R;
  for (let i = 0; i < 3; i++) {
    const a = ang + (i * Math.PI * 2) / 3;
    const sx = Math.sin(a) * FORESHORT;
    const sy = -Math.cos(a);
    const tx = x + sx * R;
    const ty = y + sy * R;
    // root section 2 px (lit + shaded edge), outer section 1 px
    const mx = x + sx * R * 0.45;
    const my = y + sy * R * 0.45;
    if (front) {
      line(g, x, y, mx, my, PAL.lgray, 2);
      line(g, x, y, mx, my, PAL.white, 1);
      line(g, mx, my, tx, ty, PAL.white, 1);
      // a shaded trailing pixel along the outer blade for weight
      line(g, x + sx * R * 0.5 + 1, y + sy * R * 0.5, x + sx * R * 0.78 + 1, y + sy * R * 0.78, PAL.lgray, 1);
    } else {
      line(g, x, y, tx, ty, PAL.white, 1);
    }
  }
  // spinner (nose cone) in front of the blade roots
  if (front) {
    rect(g, x - 1, y - 1, 3, 3, PAL.white);
    px(g, x + 1, y + 1, PAL.lgray);
    px(g, x - 2, y, PAL.lgray);
  } else {
    rect(g, x - 1, y, 2, 1, PAL.white);
  }
}

// =============================================================================
// render
// =============================================================================
export function render(kit, slot, scene, params) {
  K = kit;
  const { ctx } = slot;
  const { t, rawLocalT, isThumbnail } = params;
  const thumb = Boolean(isThumbnail);
  // the whole stage ticks at 12 fps
  const tq = kit.quantizeTime(t, FPS);
  const lt = thumb ? 7.0 : kit.quantizeTime(rawLocalT, FPS);
  const frame = Math.floor(tq * FPS + 1e-6);

  const back = kit.bake('vindeby_back', LR, LR, (g, rng) => paintBack(g, rng));
  const front = kit.bake('vindeby_front', LR, LR, (g, rng) => paintFront(g, rng));
  const buf = kit.bake('vindeby_buffer', LR, LR, () => {});
  const g = buf.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, LR, LR);
  g.drawImage(back, 0, 0);

  // --- clouds drift downwind (wind from the left/west: the upwind rotors face left and
  //     the flag streams to the right) -----------------------------------------------
  const clouds = [
    { key: 'vindeby_cloud_a', w: 46, h: 16, seed: 11, x: 40, y: 34, v: 1.6 },
    { key: 'vindeby_cloud_b', w: 34, h: 13, seed: 23, x: 150, y: 48, v: 1.1 },
    { key: 'vindeby_cloud_c', w: 58, h: 18, seed: 37, x: 236, y: 30, v: 2.0 },
    { key: 'vindeby_cloud_d', w: 26, h: 10, seed: 41, x: 102, y: 60, v: 0.8 },
  ];
  for (const c of clouds) {
    const spr = cloudSprite(c.key, c.w, c.h, c.seed);
    const span = LR + c.w + 20;
    let x = c.x + c.v * (thumb ? 3 : tq - 120);
    x = ((((x + c.w + 10) % span) + span) % span) - c.w - 10;
    g.drawImage(spr, Math.round(x), c.y);
  }

  // --- back-row rotors ------------------------------------------------------------
  for (const c of COLUMNS) if (c.row === 'back') drawRotor(g, c, rotorAngle(c, lt, thumb), false);

  // --- sea sparkle (twinkling pixels) ----------------------------------------------
  for (let i = 0; i < 46; i++) {
    const hy = HORIZON + 3 + Math.floor(K.hash11(i * 3.1) ** 1.3 * (ROAD - HORIZON - 16));
    const hx = Math.floor(K.hash11(i * 7.7) * LR);
    const on = (frame + i * 5) % 14 < 3;
    if (on) rect(g, hx, hy, (hy - HORIZON) > 30 ? 2 : 1, 1, PAL.white);
  }

  // --- service boat between the rows -------------------------------------------------
  {
    const bl = clamp(thumb ? 2 : lt, -8, 16);
    const bx = Math.round(214 - 4.5 * bl);
    const bob = frame % 12 < 6 ? 0 : 1;
    const by = 106 + bob;
    // wake behind (to the right)
    for (let k = 0; k < 4; k++) {
      const wx = bx + 29 + k * 4 + ((frame + k) % 3);
      rect(g, wx, by + 10 - (k % 2), 3, 1, k % 2 ? PAL.haze : PAL.white);
    }
    rect(g, bx - 2, by + 11, 3, 1, PAL.white); // bow wave
    g.drawImage(boatSprite(), bx, by);
  }

  g.drawImage(front, 0, 0);

  // --- front-row rotors ----------------------------------------------------------------
  for (const c of COLUMNS) if (c.row === 'front') drawRotor(g, c, rotorAngle(c, lt, thumb), true);

  // aviation lights on the nacelles blink once a second
  if (frame % 12 < 3) {
    for (const c of COLUMNS) {
      if (c.row === 'front') rect(g, c.hub.x + 7, c.hub.y - 5, 1, 1, PAL.yellow);
      else px(g, c.hub.x + 5, c.hub.y - 2, PAL.yellow);
    }
  }

  // waterline foam around the front foundations
  for (const c of COLUMNS) {
    if (c.row !== 'front') continue;
    const ph = (frame + c.i * 3) % 6;
    rect(g, c.x - 7 - (ph < 3 ? 1 : 0), FRONT.water + 1, 2, 1, PAL.white);
    rect(g, c.x + 6 + (ph < 3 ? 0 : 1), FRONT.water + 1, 2, 1, PAL.white);
  }

  // --- Danish flag on the pier head (2-frame wave) --------------------------------------
  {
    const fx = 13;
    const fy = ROAD - 40;
    const wave = frame % 4 < 2 ? 0 : 1;
    for (let x = 0; x < 12; x++) {
      const dy = x > 6 ? wave : 0;
      for (let y = 0; y < 8; y++) {
        const cross = x === 3 || x === 4 || y === 3 || y === 4;
        px(g, fx + x, fy + y + dy, cross ? PAL.white : PAL.red);
      }
    }
  }

  // --- under the pier: surface ripples, seaweed, fish, bubbles (12 fps) ---------------
  {
    const off = frame % 12;
    for (let x = -12 + off; x < LR; x += 12) {
      rect(g, x, ROAD + 10, 6, 1, PAL.sky2);
      rect(g, x + 2, ROAD + 11, 4, 1, PAL.blue);
    }
    for (let x = -12 + ((frame * 2) % 12); x < LR; x += 12) rect(g, x + 6, ROAD + 12, 3, 1, PAL.sea2);
    // seaweed swaying
    for (let i = 0; i < 9; i++) {
      const sx = 10 + i * 27 + (i % 3) * 5;
      const h = 6 + (i % 4) * 2;
      for (let k = 0; k < h; k++) {
        const sway = Math.round(Math.sin(frame * 0.5 + i + k * 0.5) * (k / h) * 1.6);
        px(g, sx + sway, 234 - k, k % 3 === 0 ? PAL.lgreen : PAL.green);
      }
    }
    // a small shoal of fish
    const fl = clamp(thumb ? 2 : lt, -8, 16);
    for (let i = 0; i < 3; i++) {
      const fxp = Math.round(((40 + i * 9 + 6 * (fl + 8) + 400) % 290) - 20);
      const fyp = 206 + i * 4 + Math.round(Math.sin(fl * 2 + i) * 1.5);
      const tail = (frame + i) % 4 < 2 ? 0 : 1;
      rect(g, fxp, fyp, 4, 2, PAL.orange);
      px(g, fxp + 3, fyp, PAL.yellow);
      px(g, fxp + 3, fyp, PAL.ink);
      px(g, fxp - 1, fyp + tail, PAL.orange);
      px(g, fxp - 2, fyp - 1 + tail * 2, PAL.orange);
    }
    // a crab scuttling along the sand (sideways, of course)
    {
      const cl = clamp(thumb ? 1 : lt, -8, 16);
      const cx = Math.round(60 + 9 * cl + 3 * Math.sin(cl * 3));
      const cy = 230;
      const step = frame % 2;
      rect(g, cx - 3, cy, 7, 3, PAL.red);
      rect(g, cx - 2, cy - 1, 5, 1, PAL.red);
      px(g, cx - 1, cy - 2, PAL.white);
      px(g, cx + 1, cy - 2, PAL.white);
      px(g, cx - 1, cy - 1, PAL.ink);
      px(g, cx + 1, cy - 1, PAL.ink);
      rect(g, cx - 5, cy - 2 + step, 2, 2, PAL.orange);
      rect(g, cx + 4, cy - 2 + (1 - step), 2, 2, PAL.orange);
      for (let k = -1; k <= 1; k++) {
        px(g, cx - 4, cy + 3 + ((k + step) & 1), PAL.dred);
        px(g, cx + 4, cy + 3 + ((k + 1 + step) & 1), PAL.dred);
      }
    }
    // bubbles rising from the seabed
    for (let i = 0; i < 6; i++) {
      const bx = 30 + i * 41;
      const cyc = (frame + i * 7) % 30;
      const by = 230 - cyc * 1.4;
      if (by > ROAD + 13) px(g, bx + ((cyc >> 2) & 1), by, PAL.sky1);
    }
  }

  // --- gulls -----------------------------------------------------------------------
  const flap = (i) => [0, 1, 2, 1][(Math.floor(frame / 2) + i) % 4];
  {
    const gl = clamp(thumb ? 3 : lt, -8, 16);
    const g1x = Math.round(230 - 9 * (gl + 8));
    g.drawImage(gullSprite(flap(0)), ((g1x % 290) + 290) % 290 - 20, 44 + Math.round(Math.sin(gl * 2) * 2));
    const g2x = Math.round(-20 + 7 * (gl + 8));
    g.drawImage(gullSprite(flap(1)), ((g2x % 290) + 290) % 290 - 20, 58 + Math.round(Math.sin(gl * 1.6 + 1) * 2));
    // the perched gull on the railing flies off as the bicycle approaches
    const perchX = 96;
    const take = thumb ? 99 : lt - 2.5;
    if (thumb) {
      // calm outro frame: the perched gull has already flown off
    } else if (take < 0) {
      const hop = frame % 24 === 0 ? 1 : 0;
      g.drawImage(perchedGull(), perchX, ROAD - 19 - hop);
    } else {
      const u = take;
      const gx = Math.round(perchX + 10 * u + 22 * u * u);
      const gy = Math.round(ROAD - 18 - 26 * u - 6 * u * u);
      if (gy > -10) g.drawImage(gullSprite(flap(2)), gx, gy);
    }
  }

  // --- the rider: pixel sprite from the rig ------------------------------------------
  if (kit.riderVisible(params)) {
    const sheet = riderSheet();
    const rig = kit.riderRig(params);
    const k = ((Math.round(params.pedalAngle / ((Math.PI * 2) / 12)) % 12) + 12) % 12;
    const lx = Math.round(params.riderLocalX / SCALE);
    // pole + three-bladed mini rotor (drawn first: behind the bird)
    const pb = { x: lx + (rig.poleBase.x - params.riderLocalX) / SCALE, y: ROAD + (rig.poleBase.y - 700) / SCALE };
    const pt = { x: lx + (rig.poleTop.x - params.riderLocalX) / SCALE, y: ROAD + (rig.poleTop.y - 700) / SCALE };
    line(g, pb.x, pb.y, pt.x, pt.y, PAL.dgray, 1);
    const hub = { x: lx + (rig.pinHub.x - params.riderLocalX) / SCALE, y: ROAD + (rig.pinHub.y - 700) / SCALE };
    const pa = kit.quantizeTime(params.pinwheelAngle, 6) * 0.5;
    const blades = [];
    for (let i = 0; i < 3; i++) {
      const a = pa + (i * Math.PI * 2) / 3;
      blades.push({ a, tx: hub.x + Math.sin(a) * 6.5, ty: hub.y - Math.cos(a) * 6.5 });
    }
    // 1-px ink keyline under the blades (classic sprite outline)
    for (const b of blades) {
      for (const [ox, oy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ])
        line(g, hub.x + ox, hub.y + oy, b.tx + ox, b.ty + oy, PAL.navy, 1);
    }
    for (const b of blades) {
      const { a } = b;
      line(g, hub.x + Math.cos(a), hub.y + Math.sin(a), hub.x + Math.cos(a) + Math.sin(a) * 4, hub.y + Math.sin(a) - Math.cos(a) * 4, PAL.sky1, 1);
      line(g, hub.x, hub.y, b.tx, b.ty, PAL.white, 1);
    }
    rect(g, hub.x - 1, hub.y - 1, 2, 2, PAL.yellow);
    g.drawImage(sheet, k * 100, 0, 100, 80, lx - 50, ROAD - 72, 100, 80);
    // rotating spokes (2 crossing spokes per wheel)
    const wa = kit.quantizeTime(rig.wheelAngle, 8);
    for (const w of [rig.rearWheel, rig.frontWheel]) {
      const cx = lx + Math.round((w.x - params.riderLocalX) / SCALE);
      const cy = ROAD - 11;
      for (let s = 0; s < 2; s++) {
        const a = wa + (s * Math.PI) / 2;
        const dx = Math.cos(a) * 8;
        const dy = Math.sin(a) * 8;
        line(g, cx - dx, cy - dy, cx + dx, cy + dy, PAL.gray, 1);
      }
      px(g, cx, cy, PAL.yellow);
    }
  }

  // --- power-up popups: "+450 kW" out of each nacelle ----------------------------------
  let passed = 0;
  let rolling = 0;
  for (const c of COLUMNS) {
    const u = thumb ? 99 : lt - c.ta;
    if (u >= 0) passed++;
    if (u >= 0 && u < 0.35) rolling = 1 - u / 0.35;
    if (u >= 0 && u < 1.1 && !thumb) {
      const blinkOff = u > 0.75 && frame % 2 === 0;
      if (!blinkOff) {
        const rise = Math.round(u * 16);
        const spr = popupSprite();
        const x = clamp(c.hub.x - 22, 4, LR - 50);
        g.drawImage(spr, x, c.hub.y - 16 - rise - (c.row === 'front' ? 6 : 0));
      }
      // a ring burst at the hub on the first frames
      if (u < 0.25) {
        const r = 2 + Math.round(u * 20);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          px(g, c.hub.x + Math.cos(a) * r, c.hub.y + Math.sin(a) * r, PAL.yellow);
        }
      }
    }
  }

  // --- HUD: score + eleven turbine pips ---------------------------------------------------
  {
    let score = passed * 450;
    if (rolling > 0) score -= Math.round((rolling * 450) / 50) * 50;
    const s = String(Math.max(0, score)).padStart(4, '0');
    const flash = rolling > 0 && frame % 2 === 0;
    drawText(g, s, 184 + textWidth('kW ') + 1, HUD.y0 + 10, flash ? PAL.yellow : PAL.white, { shadow: PAL.dgray });
    for (let i = 0; i < 11; i++) {
      const counting = rolling > 0 && i === passed - 1;
      const on = i < passed && (!counting || frame % 2 === 0);
      const ix = 129 + i * 10;
      const iy = HUD.y0 + 18;
      // tiny turbine pictogram: a "Y" rotor on a tower
      const col = on ? PAL.yellow : PAL.dgray;
      const hx = ix + 3;
      const hy = iy + 3;
      px(g, hx, hy, col);
      px(g, hx, hy - 1, col);
      px(g, hx, hy - 2, col);
      px(g, hx, hy - 3, col);
      px(g, hx - 1, hy + 1, col);
      px(g, hx - 2, hy + 2, col);
      px(g, hx + 1, hy + 1, col);
      px(g, hx + 2, hy + 2, col);
      rect(g, hx, hy + 1, 1, 6, on ? PAL.white : PAL.dgray);
    }
  }

  // --- STAGE CLEAR -------------------------------------------------------------------------
  if (!thumb) {
    const u = lt - (COLUMNS[COLUMNS.length - 1].ta + 0.25);
    if (u >= 0) {
      const show = u > 0.5 || frame % 2 === 0;
      if (show) {
        const t1 = 'STAGE CLEAR!';
        const w1 = textWidth(t1, 2);
        drawText(g, t1, Math.round((LR - w1) / 2), 36, PAL.yellow, { scale: 2, outline: PAL.ink, shadow: PAL.dred });
        const t2 = '11 x 450 kW = 4.95 MW';
        const w2 = textWidth(t2);
        drawText(g, t2, Math.round((LR - w2) / 2), 55, PAL.white, { outline: PAL.ink });
      }
    }
  }

  // --- blow the buffer up x4, crisp -----------------------------------------------------
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, 0, 0, LR, LR, 0, 0, P, P);
  ctx.drawImage(scanlines(), 0, 0);
  ctx.restore();
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
