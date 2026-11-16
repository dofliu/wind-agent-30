// src/scenes/persia.js
// #02 約 900 · 波斯垂直軸風車 — the Sistan panemone (as still standing at Nashtifan),
// painted as a Persian miniature: flat jewel colours, lapis sky with Chinese-style
// "chi" cloud ribbons, spiky pastel rocks on a high horizon, cypress + blossoming tree,
// figures in robes and turbans, illuminated border strips that the road breaks through.
//
// Machine (historically): a row of tall mud-brick walls; in each slot a VERTICAL wooden
// shaft carries six radial arms with reed-mat sails. A shield wall covers half of each
// rotor so the north "wind of 120 days" only pushes the open half (a drag machine).
// The millstones sit in a chamber BELOW the rotor, driven directly by the same shaft.
//
// Story (4 bars): bar 1–2 the mills turn, the miller waits by his door, the donkey grazes;
// bar 3 the door rumbles (beat 1) and a cloud of flour bursts out onto the miller (beat 2);
// the startled donkey decides to trot after the bicycle; bar 4 the floured miller shouts
// after it; the donkey only stops at the painted border of the picture.

const P = 1000;
const ROAD_Y = 700;
const IN = { x0: 58, y0: 80, x1: 942, y1: 912 }; // picture field inside the border strips
const FG_Y = 676; // foreground bake starts here

const C = {
  lapis: '#2654a3',
  lapisDeep: '#163a7c',
  lapisDark: '#0f2a5c',
  lapisLight: '#5a86cc',
  gold: '#d8ab45',
  goldDeep: '#a47a24',
  goldLight: '#f1d686',
  vermilion: '#c4462c',
  carmine: '#a3303a',
  turq: '#2f9f98',
  turqLight: '#79c9bb',
  green: '#3f8a58',
  leaf: '#2e6a43',
  leafLight: '#6ea867',
  cypress: '#1f4a37',
  cypressLight: '#3b7356',
  ground: '#bcc98c',
  groundDeep: '#9fb070',
  groundLight: '#d3dcaa',
  cream: '#f4e9d0',
  border: '#7e2326',
  paper: '#efe3c6',
  ink: '#2b1d14',
  adobe: '#c8996a',
  adobeLight: '#dcb487',
  adobeDeep: '#a9784a',
  adobeDark: '#6e4a2e',
  interior: '#2a1a12',
  lilac: '#b7a2c9',
  rose: '#e2a493',
  sky2: '#8fb0d6',
  ochre: '#d9b25f',
  silver: '#59636e',
  silverDark: '#38404a',
  silverLight: '#aab4bd',
  reed: '#e6cf93',
  reedDeep: '#a98a4f',
  wood: '#7a5230',
  woodDark: '#4a2f1b',
  woodLight: '#a2764a',
  skin: '#f0d6b4',
  white: '#fbf7ee',
  flour: '#f7f3ea',
  donkey: '#8e8a86',
  donkeyLight: '#d8d2c6',
  donkeyDark: '#4b4541',
};

// --- mill geometry -----------------------------------------------------------
const MILL = {
  x0: 186,
  pier: 44,
  open: 150,
  n: 3,
  top: 150, // top of the mud band over the openings
  beamY: 170, // upper bearing beam
  rotTop: 200, // sail tops (at the shaft)
  rotBot: 350, // sail bottoms (at the shaft)
  floorTop: 382,
  floorBot: 404,
  base: 606,
};
const MILL_X1 = MILL.x0 + MILL.n * (MILL.pier + MILL.open) + MILL.pier;
const ROT_R = 70;
const SHIELD_FRAC = 0.46; // far (north) wall: shielded part of the slot
const ROT_PHASE = [0.0, 2.3, 4.4];
const ROT_SPEED = Math.PI * 2 * 0.42; // rad/s
function opening(i) {
  const ox = MILL.x0 + MILL.pier + i * (MILL.pier + MILL.open);
  return { ox, cx: ox + MILL.open / 2, w: MILL.open };
}
const DOOR1 = { x: opening(0).cx, y: MILL.base };
const IWAN = { cx: opening(1).cx, x0: opening(1).cx - 56, x1: opening(1).cx + 56, top: 430, base: MILL.base };
const STONE = { cx: IWAN.cx + 8, y: 560, rx: 34, ry: 7.5, h: 15 };
const MILLER = { x: 384, y: 664 };
const DONKEY = { x: 112, y: 668 };
const ELEV = 0.2; // miniature painters look slightly down onto things

let K = null;

// -----------------------------------------------------------------------------
// small math helpers
// -----------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}
function rgba(h, a) {
  const A = hexRgb(h);
  return `rgba(${A[0]},${A[1]},${A[2]},${a})`;
}

// -----------------------------------------------------------------------------
// ornament primitives
// -----------------------------------------------------------------------------

/** Chinese-style "chi" cloud ribbon with lobed upper edge and curled ends. */
function chiCloud(g, cx, cy, len, th, fill, line, seed = 0, flip = 1) {
  const N = 64;
  const top = [];
  const bot = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = cx + (u - 0.5) * len;
    const yc = cy + Math.sin(u * Math.PI * 2 + seed) * th * 0.45 * flip;
    const env = Math.pow(Math.sin(Math.PI * u), 0.55);
    const lob = Math.pow(Math.abs(Math.sin(u * Math.PI * 4.5 + seed)), 0.55);
    top.push({ x, y: yc - th * (0.3 + 0.7 * lob) * env, yc });
    bot.push({ x, y: yc + th * (0.35 + 0.15 * Math.abs(Math.sin(u * 9 + seed))) * env });
  }
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(top[0].x, top[0].y);
  for (let i = 1; i <= N; i++) g.lineTo(top[i].x, top[i].y);
  for (let i = N; i >= 0; i--) g.lineTo(bot[i].x, bot[i].y);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = 1.3;
  g.stroke();
  // inner echo line
  g.lineWidth = 0.9;
  g.strokeStyle = rgba(line, 0.75);
  g.beginPath();
  for (let i = 5; i <= N - 5; i++) {
    const y = lerp(top[i].y, bot[i].y, 0.42);
    if (i === 5) g.moveTo(top[i].x, y);
    else g.lineTo(top[i].x, y);
  }
  g.stroke();
  // curled ends
  curl(g, top[0].x - th * 0.15, top[0].yc - th * 0.2, th * 0.62, -1, fill, line);
  curl(g, top[N].x + th * 0.15, top[N].yc + th * 0.1, th * 0.55, 1, fill, line);
  g.restore();
}

function curl(g, x, y, r, dir, fill, line) {
  g.beginPath();
  const n = 34;
  for (let k = 0; k <= n; k++) {
    const f = k / n;
    const a = -Math.PI / 2 + dir * f * Math.PI * 2.3;
    const rr = r * (1 - f * 0.78);
    const px = x + Math.cos(a) * rr * dir;
    const py = y + Math.sin(a) * rr;
    if (k === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.strokeStyle = fill;
  g.lineWidth = r * 0.42;
  g.stroke();
  g.strokeStyle = line;
  g.lineWidth = 1.1;
  g.stroke();
}

/** Six-petal rosette. */
function rosette(g, x, y, r, petal, centre, line) {
  g.save();
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, r * 0.28, a, 0, Math.PI * 2);
    g.fillStyle = petal;
    g.fill();
    if (line) {
      g.strokeStyle = line;
      g.lineWidth = 0.6;
      g.stroke();
    }
  }
  g.beginPath();
  g.arc(x, y, r * 0.28, 0, Math.PI * 2);
  g.fillStyle = centre;
  g.fill();
  g.restore();
}

/** Pointed leaf (for islimi scrolls and trees). */
function leafShape(g, x, y, len, wid, ang, fill, line) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const tx = x + ca * len;
  const ty = y + sa * len;
  const nx = -sa * wid;
  const ny = ca * wid;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + ca * len * 0.5 + nx, y + sa * len * 0.5 + ny, tx, ty);
  g.quadraticCurveTo(x + ca * len * 0.5 - nx, y + sa * len * 0.5 - ny, x, y);
  g.fillStyle = fill;
  g.fill();
  if (line) {
    g.strokeStyle = line;
    g.lineWidth = 0.7;
    g.stroke();
  }
}

/** Illuminated border strip: lapis ground, gold islimi scroll with rosettes. */
function borderStrip(g, x, y, w, h, vertical) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.translate(x, y);
  let L = w;
  let T = h;
  if (vertical) {
    g.translate(w, 0);
    g.rotate(Math.PI / 2);
    L = h;
    T = w;
  }
  g.fillStyle = C.border;
  g.fillRect(-2, -2, L + 4, T + 4);
  // pigment speckle
  const rng = K.makePRNG(Math.round(x * 7 + y * 13 + w));
  for (let i = 0; i < L * T * 0.02; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(60,10,10,0.3)' : 'rgba(230,140,120,0.14)';
    g.fillRect(rng() * L, rng() * T, 1.2, 1.2);
  }
  const pad = 5;
  const mid = T / 2;
  const amp = (T - pad * 2) * 0.24;
  const per = T * 2.4;
  const vine = (u) => mid + amp * Math.sin((u / per) * Math.PI * 2);
  // tendrils + leaves in each bay
  for (let k = -2; k < (L / per) * 2 + 2; k++) {
    const uc = per / 4 + (k * per) / 2;
    const side = k % 2 === 0 ? -1 : 1; // bay on the opposite side of the bulge
    const vb = vine(uc);
    const vc = mid + side * (T * 0.17);
    if (Math.abs(k) % 2 === 0) {
      // spiral tendril ending in a split palmette
      g.strokeStyle = C.gold;
      g.lineWidth = 1.2;
      g.beginPath();
      const r0 = T * 0.2;
      for (let s = 0; s <= 26; s++) {
        const f = s / 26;
        const a = Math.PI * (side > 0 ? 1.5 : 0.5) + f * Math.PI * 1.6;
        const rr = r0 * (1 - 0.6 * f);
        const px = uc - per * 0.06 + Math.cos(a) * rr;
        const py = vc + Math.sin(a) * rr;
        if (s === 0) g.moveTo(uc - per * 0.18, vb);
        g.lineTo(px, py);
      }
      g.stroke();
      leafShape(g, uc + per * 0.02, vc, T * 0.26, T * 0.09, side > 0 ? 0.5 : -0.5, C.gold, C.goldDeep);
      leafShape(g, uc + per * 0.02, vc, T * 0.22, T * 0.08, side > 0 ? -0.3 : 0.3, C.goldLight, C.goldDeep);
    } else {
      rosette(g, uc, vc, T * 0.17, k % 4 === 1 || k % 4 === -3 ? '#f2ead6' : C.turqLight, C.gold, null);
    }
    // small leaves along the vine
    leafShape(g, uc + per * 0.12, vine(uc + per * 0.12), T * 0.16, T * 0.06, side > 0 ? -2.3 : 2.3, C.turqLight, null);
  }
  g.strokeStyle = C.gold;
  g.lineWidth = 1.8;
  g.beginPath();
  for (let u = -4; u <= L + 4; u += 2) {
    const v = vine(u);
    if (u === -4) g.moveTo(u, v);
    else g.lineTo(u, v);
  }
  g.stroke();
  // edge rulings
  g.fillStyle = C.gold;
  g.fillRect(-2, 0, L + 4, 2);
  g.fillRect(-2, T - 2, L + 4, 2);
  g.fillStyle = C.ink;
  g.fillRect(-2, 2, L + 4, 0.8);
  g.fillRect(-2, T - 2.8, L + 4, 0.8);
  g.restore();
}

/** Ruled "jadval" lines around the picture field (gold between black, plus colour rules). */
function jadval(g, yFrom, yTo) {
  const r = IN;
  const lines = [
    [0, 1.0, C.ink],
    [1.0, 3.2, C.gold],
    [4.2, 0.9, C.ink],
    [5.6, 1.4, C.vermilion],
    [7.4, 0.8, C.turq],
  ];
  g.save();
  g.beginPath();
  g.rect(0, yFrom, P, yTo - yFrom);
  g.clip();
  for (const [off, wdt, col] of lines) {
    g.fillStyle = col;
    // top & bottom
    g.fillRect(r.x0 + off, r.y0 + off, r.x1 - r.x0 - off * 2, wdt);
    g.fillRect(r.x0 + off, r.y1 - off - wdt, r.x1 - r.x0 - off * 2, wdt);
    // sides
    g.fillRect(r.x0 + off, r.y0 + off, wdt, r.y1 - r.y0 - off * 2);
    g.fillRect(r.x1 - off - wdt, r.y0 + off, wdt, r.y1 - r.y0 - off * 2);
  }
  g.restore();
}

/** Spiky pastel "Persian" rock lump. */
function rockLump(g, rng, cx, by, w, h, col) {
  const dark = mix(col, C.ink, 0.45);
  const light = mix(col, '#ffffff', 0.4);
  const n = 7 + Math.floor(rng() * 4);
  const pts = [];
  pts.push({ x: cx - w / 2, y: by });
  for (let i = 0; i <= n; i++) {
    const u = (i + 0.5) / (n + 1);
    const env = Math.pow(Math.sin(Math.PI * u), 0.7);
    const px = cx - w / 2 + w * u + (rng() - 0.5) * (w / n) * 0.5;
    const peak = by - h * env * (0.7 + 0.45 * rng());
    pts.push({ x: px, y: peak, peak: true });
  }
  pts.push({ x: cx + w / 2, y: by });
  const path = new Path2D();
  path.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    // valley between peaks: curve dips down, peaks stay sharp
    const mx = (a.x + b.x) / 2;
    const my = Math.max(a.y, b.y) + (by - Math.max(a.y, b.y)) * 0.28;
    path.quadraticCurveTo(mx, my, b.x, b.y);
  }
  path.closePath();
  g.fillStyle = col;
  g.fill(path);
  // internal contour strata (concentric, typical of miniature rocks)
  g.save();
  g.clip(path);
  for (let k = 1; k <= 3; k++) {
    const s = 1 - k * 0.2;
    g.strokeStyle = rgba(dark.startsWith('rgb') ? '#5a4a40' : dark, 0.4);
    g.strokeStyle = `rgba(60,40,40,${0.28 - k * 0.04})`;
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const x = cx + (p.x - cx) * s + (rng() - 0.5) * 3;
      const y = by + (p.y - by) * s + k * 4;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // light edge on the left flanks of peaks
  g.strokeStyle = light;
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    g.moveTo(p.x, p.y + 1);
    g.lineTo(p.x - 5, p.y + 14);
  }
  g.stroke();
  // pigment dabs
  for (let i = 0; i < w * h * 0.004; i++) {
    g.fillStyle = rng() < 0.5 ? rgba('#ffffff', 0.12) : 'rgba(60,40,40,0.1)';
    g.beginPath();
    g.arc(cx + (rng() - 0.5) * w, by - rng() * h, 0.8 + rng() * 1.6, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.strokeStyle = dark;
  g.lineWidth = 1.2;
  g.stroke(path);
}

/** A small flowering sprig / tuft (miniature ground decoration). */
function sprig(g, rng, x, y, s, kind) {
  g.save();
  g.lineCap = 'round';
  const stems = 3 + Math.floor(rng() * 3);
  g.strokeStyle = C.leaf;
  g.lineWidth = 1.1 * s;
  const tips = [];
  for (let i = 0; i < stems; i++) {
    const a = -Math.PI / 2 + (i / (stems - 1) - 0.5) * 1.3 + (rng() - 0.5) * 0.2;
    const L = (7 + rng() * 6) * s;
    const tx = x + Math.cos(a) * L;
    const ty = y + Math.sin(a) * L;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * L * 0.3, y + Math.sin(a) * L * 0.7, tx, ty);
    g.stroke();
    tips.push({ x: tx, y: ty, a });
  }
  // leaves
  leafShape(g, x, y, 7 * s, 1.8 * s, -2.4, C.leafLight, null);
  leafShape(g, x, y, 7 * s, 1.8 * s, -0.7, C.leafLight, null);
  if (kind === 'tulip') {
    const t = tips[Math.floor(stems / 2)];
    g.fillStyle = C.vermilion;
    g.beginPath();
    g.moveTo(t.x - 2.4 * s, t.y);
    g.lineTo(t.x - 2.6 * s, t.y - 5 * s);
    g.lineTo(t.x - 1 * s, t.y - 3 * s);
    g.lineTo(t.x, t.y - 6 * s);
    g.lineTo(t.x + 1 * s, t.y - 3 * s);
    g.lineTo(t.x + 2.6 * s, t.y - 5 * s);
    g.lineTo(t.x + 2.4 * s, t.y);
    g.closePath();
    g.fill();
  } else if (kind === 'iris') {
    const t = tips[Math.floor(stems / 2)];
    g.fillStyle = '#4a5fb0';
    g.beginPath();
    g.ellipse(t.x, t.y - 2 * s, 2 * s, 3.2 * s, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.goldLight;
    g.fillRect(t.x - 0.5 * s, t.y - 3 * s, 1 * s, 2 * s);
  } else {
    // daisies / dots
    const col = kind === 'white' ? '#fbf6ea' : kind === 'pink' ? '#ef9fae' : kind === 'yellow' ? '#f0cb4c' : '#fbf6ea';
    for (const t of tips) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(t.x, t.y, 1.7 * s, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = kind === 'yellow' ? C.vermilion : C.gold;
      g.beginPath();
      g.arc(t.x, t.y, 0.6 * s, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.restore();
}

/** Brick-course texture over a rect (mud brick, miniature style). */
function bricks(g, rng, x, y, w, h, base, lineCol, course = 8, len = 17) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  // mud plaster patches
  for (let i = 0; i < (w * h) / 900; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(255,240,210,0.12)' : 'rgba(90,55,25,0.09)';
    g.beginPath();
    g.ellipse(x + rng() * w, y + rng() * h, 4 + rng() * 14, 2 + rng() * 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = lineCol;
  g.lineWidth = 0.7;
  g.beginPath();
  let row = 0;
  for (let yy = y + course; yy < y + h; yy += course, row++) {
    g.moveTo(x, yy + 0.5);
    g.lineTo(x + w, yy + 0.5);
  }
  row = 0;
  for (let yy = y; yy < y + h; yy += course, row++) {
    const off = (row % 2) * (len / 2);
    for (let xx = x - len + off; xx < x + w; xx += len) {
      g.moveTo(xx + 0.5, yy);
      g.lineTo(xx + 0.5, yy + course);
    }
  }
  g.stroke();
  g.restore();
}

/** Pointed (four-centred) Persian arch path. */
function archPath(g, x0, x1, springY, baseY, rise) {
  const cx = (x0 + x1) / 2;
  g.beginPath();
  g.moveTo(x0, baseY);
  g.lineTo(x0, springY);
  g.bezierCurveTo(x0, springY - rise * 0.62, cx - (x1 - x0) * 0.12, springY - rise * 0.9, cx, springY - rise);
  g.bezierCurveTo(cx + (x1 - x0) * 0.12, springY - rise * 0.9, x1, springY - rise * 0.62, x1, springY);
  g.lineTo(x1, baseY);
  g.closePath();
}

// -----------------------------------------------------------------------------
// trees
// -----------------------------------------------------------------------------
function cypress(g, rng, x, baseY, h, w) {
  const tipX = x + 4;
  const tipY = baseY - h;
  const path = new Path2D();
  path.moveTo(x - w * 0.18, baseY - h * 0.04);
  path.bezierCurveTo(x - w * 0.62, baseY - h * 0.3, x - w * 0.5, baseY - h * 0.72, tipX, tipY);
  path.bezierCurveTo(x + w * 0.55, baseY - h * 0.72, x + w * 0.62, baseY - h * 0.3, x + w * 0.2, baseY - h * 0.04);
  path.closePath();
  // trunk
  g.fillStyle = C.woodDark;
  g.fillRect(x - 3, baseY - h * 0.06, 6, h * 0.06);
  g.fillStyle = C.cypress;
  g.fill(path);
  g.save();
  g.clip(path);
  // scale-like foliage marks in rows
  for (let yy = tipY + 6; yy < baseY; yy += 7) {
    const row = Math.round((yy - tipY) / 7);
    for (let xx = x - w * 0.6 + (row % 2) * 5; xx < x + w * 0.6; xx += 10) {
      g.strokeStyle = rng() < 0.6 ? C.cypressLight : '#5c8f5e';
      g.lineWidth = 1.1;
      g.beginPath();
      g.arc(xx, yy, 4, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
  }
  g.fillStyle = 'rgba(8,30,20,0.25)';
  g.fillRect(x + w * 0.08, tipY, w, h);
  g.restore();
  g.strokeStyle = '#13301f';
  g.lineWidth = 1.2;
  g.stroke(path);
}

function poplar(g, rng, x, baseY, h, w) {
  g.strokeStyle = C.woodDark;
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(x, baseY);
  g.lineTo(x + 1, baseY - h * 0.92);
  g.stroke();
  const path = new Path2D();
  path.ellipse(x, baseY - h * 0.55, w / 2, h * 0.45, 0, 0, Math.PI * 2);
  g.fillStyle = '#5f9a5a';
  g.fill(path);
  g.save();
  g.clip(path);
  for (let i = 0; i < h * 1.6; i++) {
    const yy = baseY - h * 0.1 - rng() * h * 0.9;
    const xx = x + (rng() - 0.5) * w;
    leafShape(g, xx, yy, 5, 1.8, -Math.PI / 2 + (rng() - 0.5) * 1.5, rng() < 0.5 ? '#8cc07a' : '#3f7a45', null);
  }
  g.restore();
  g.strokeStyle = '#27512f';
  g.lineWidth = 1;
  g.stroke(path);
}

/** Blossoming tree (almond / plum) with twisting dark branches. */
function blossomTree(g, rng, x, baseY, h, spread, lean = 0) {
  const branches = [];
  const grow = (x0, y0, ang, len, wdt, depth) => {
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;
    const cx = (x0 + x1) / 2 + Math.cos(ang + Math.PI / 2) * len * 0.18 * (rng() - 0.5) * 2;
    const cy = (y0 + y1) / 2 + Math.sin(ang + Math.PI / 2) * len * 0.18 * (rng() - 0.5) * 2;
    branches.push({ x0, y0, cx, cy, x1, y1, wdt });
    if (depth <= 0) return;
    const nb = depth > 2 ? 2 : 2 + (rng() < 0.4 ? 1 : 0);
    for (let i = 0; i < nb; i++) {
      grow(x1, y1, ang + (i - (nb - 1) / 2) * 0.75 + (rng() - 0.5) * 0.4, len * (0.64 + rng() * 0.12), wdt * 0.62, depth - 1);
    }
  };
  grow(x, baseY, -Math.PI / 2 + lean, h * 0.36, spread * 0.09, 4);
  g.lineCap = 'round';
  for (const b of branches) {
    g.strokeStyle = '#2d1f18';
    g.lineWidth = Math.max(0.8, b.wdt);
    g.beginPath();
    g.moveTo(b.x0, b.y0);
    g.quadraticCurveTo(b.cx, b.cy, b.x1, b.y1);
    g.stroke();
  }
  // leaves + blossoms on outer twigs
  for (const b of branches) {
    if (b.wdt > spread * 0.03) continue;
    for (let k = 0; k < 7; k++) {
      const u = rng();
      const px = lerp(b.x0, b.x1, u) + (rng() - 0.5) * 10;
      const py = lerp(b.y0, b.y1, u) + (rng() - 0.5) * 10;
      if (rng() < 0.35) leafShape(g, px, py, 6, 2, rng() * Math.PI * 2, C.leafLight, null);
      else {
        const col = rng() < 0.55 ? '#fdf7ef' : '#f2b8c2';
        for (let p = 0; p < 5; p++) {
          const a = (p * Math.PI * 2) / 5;
          g.fillStyle = col;
          g.beginPath();
          g.arc(px + Math.cos(a) * 1.9, py + Math.sin(a) * 1.9, 1.5, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = C.vermilion;
        g.fillRect(px - 0.6, py - 0.6, 1.2, 1.2);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// layer 0: sky
// -----------------------------------------------------------------------------
function paintSky(g, rng) {
  g.fillStyle = C.lapis;
  g.fillRect(0, 0, P, P);
  // granular ultramarine (ground lapis is never perfectly smooth)
  for (let i = 0; i < 26000; i++) {
    const x = rng() * P;
    const y = rng() * 560;
    const r = rng();
    g.fillStyle = r < 0.45 ? 'rgba(12,30,85,0.32)' : r < 0.9 ? 'rgba(110,150,225,0.18)' : 'rgba(230,240,255,0.18)';
    g.fillRect(x, y, 1 + rng() * 1.4, 1 + rng() * 1.2);
  }
  // soft brush streaks (pigment laid in horizontal strokes)
  for (let i = 0; i < 90; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(20,45,110,0.08)' : 'rgba(90,130,200,0.07)';
    g.beginPath();
    g.ellipse(rng() * P, rng() * 520, 40 + rng() * 120, 3 + rng() * 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  K.addGrain(g, P, 600, rng, 0.014);
}

/** One baked cloud sprite. */
function cloudSprite(key, len, th, fill, line, seed, flip) {
  const pad = th * 1.6;
  return K.bake(key, Math.ceil(len + pad * 2), Math.ceil(th * 3.4), (g, rng, w, h) => {
    chiCloud(g, w / 2, h / 2, len, th, fill, line, seed, flip);
  });
}

// -----------------------------------------------------------------------------
// layer 1: landscape + architecture (transparent above the skyline)
// -----------------------------------------------------------------------------
function horizonY(x) {
  return 322 + 8 * Math.sin(x * 0.011) + 5 * Math.sin(x * 0.027 + 1.3);
}

function paintScene(g, rng) {
  // --- far rocks along the high horizon ---
  const rockCols = [C.lilac, C.rose, '#9fb3cf', C.ochre, '#a9c7a6', '#d7b9a8', '#c7a6c9'];
  const clusters = [
    { x: 84, w: 110, h: 190 },
    { x: 150, w: 110, h: 170 },
    { x: 214, w: 110, h: 150 },
    { x: 260, w: 140, h: 100 },
    { x: 420, w: 160, h: 90 },
    { x: 600, w: 150, h: 95 },
    { x: 760, w: 160, h: 110 },
    { x: 870, w: 120, h: 150 },
    { x: 930, w: 90, h: 120 },
  ];
  for (const cl of clusters) {
    const lumps = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < lumps; i++) {
      const lx = cl.x + (rng() - 0.5) * cl.w * 0.7;
      const lw = cl.w * (0.4 + rng() * 0.35);
      const lh = cl.h * (0.55 + rng() * 0.45) * (i === 0 ? 1 : 0.8);
      rockLump(g, rng, lx, horizonY(lx) + 12, lw, lh, rockCols[Math.floor(rng() * rockCols.length)]);
    }
  }
  // --- ground plane (high horizon: the ground fills most of the picture) ---
  g.beginPath();
  g.moveTo(0, P);
  for (let x = 0; x <= P; x += 10) g.lineTo(x, horizonY(x));
  g.lineTo(P, P);
  g.closePath();
  g.fillStyle = C.ground;
  g.fill();
  g.strokeStyle = rgba(C.groundDeep, 0.9);
  g.lineWidth = 1.4;
  g.beginPath();
  for (let x = 0; x <= P; x += 10) {
    if (x === 0) g.moveTo(x, horizonY(x));
    else g.lineTo(x, horizonY(x));
  }
  g.stroke();
  // ground mottling
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rng() < 0.5 ? rgba(C.groundLight, 0.35) : rgba(C.groundDeep, 0.22);
    g.beginPath();
    g.ellipse(rng() * P, 330 + rng() * 360, 10 + rng() * 40, 3 + rng() * 6, 0, 0, Math.PI * 2);
    g.fill();
  }

  // --- distant row of mills (left, stacked perspective: further = higher) ---
  paintDistantMills(g, rng);

  // --- poplars behind the main complex (right) ---
  poplar(g, rng, 912, 580, 320, 30);
  poplar(g, rng, 834, 560, 270, 26);

  // --- ground sprigs (rows, stacked) ---
  const kinds = ['white', 'tulip', 'pink', 'iris', 'white', 'yellow', 'tuft'];
  for (let yy = 350; yy < 664; yy += 26) {
    for (let xx = 70 + ((yy / 26) % 2) * 26; xx < 930; xx += 52) {
      const x = xx + (rng() - 0.5) * 18;
      const y = yy + (rng() - 0.5) * 8;
      if (rng() < 0.22) continue;
      if (x > MILL.x0 - 8 && x < MILL_X1 + 8 && y < MILL.base + 14) continue;
      if (x < MILL.x0 && y < 392) continue;
      sprig(g, rng, x, y, 0.9 + rng() * 0.3, kinds[Math.floor(rng() * kinds.length)]);
    }
  }

  // --- main mill complex ---
  paintMillComplex(g, rng);

  // --- right: cypress embraced by a blossoming tree (classic pairing) ---
  blossomTree(g, rng, 846, 610, 300, 120, 0.25);
  cypress(g, rng, 884, 622, 380, 44);
  blossomTree(g, rng, 900, 628, 200, 90, -0.35);

  // --- left: little tree near the donkey ---
  blossomTree(g, rng, 84, 612, 230, 84, 0.3);

  // --- the donkey's heap of hay ---
  hay(g, rng, 200, 676);

  // --- grain sacks by mill 3's door ---
  const o3 = opening(2);
  sack(g, o3.cx + 40, MILL.base + 6, 1, C.cream);
  sack(g, o3.cx + 62, MILL.base + 8, 0.95, '#e8d4a6');
  sack(g, o3.cx + 51, MILL.base - 16, 0.9, '#efe0be');
  sack(g, o3.cx - 46, MILL.base + 8, 0.9, '#e8d4a6');
  // grain sacks by the miller
  sack(g, MILLER.x + 34, MILL.base + 40, 0.9, C.cream);

  // --- cartouche (Persian inscription, upper left) ---
  cartouche(g, rng);

  // --- illuminated border strips & rulings (upper part; foreground layer does the rest) ---
  g.save();
  g.beginPath();
  g.rect(0, 0, P, FG_Y);
  g.clip();
  borderStrip(g, 26, 26, P - 52, IN.y0 - 26, false);
  borderStrip(g, 26, IN.y0, IN.x0 - 26, IN.y1 - IN.y0, true);
  borderStrip(g, IN.x1, IN.y0, P - 26 - IN.x1, IN.y1 - IN.y0, true);
  corners(g);
  g.restore();
  jadval(g, 0, FG_Y);
  K.addGrain(g, P, P, rng, 0.014);
}

function corners(g) {
  for (const [x, y] of [
    [IN.x0 - 16, IN.y0 - 26],
    [IN.x1 + 16, IN.y0 - 26],
  ]) {
    g.fillStyle = C.lapisDeep;
    g.beginPath();
    g.arc(x, y, 13, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = C.gold;
    g.lineWidth = 1.2;
    g.stroke();
    rosette(g, x, y, 11, C.gold, C.vermilion, C.goldDeep);
  }
}

function hay(g, rng, x, y) {
  g.save();
  g.beginPath();
  g.moveTo(x - 26, y);
  g.quadraticCurveTo(x - 20, y - 20, x, y - 22);
  g.quadraticCurveTo(x + 20, y - 20, x + 26, y);
  g.closePath();
  g.fillStyle = '#d9b55a';
  g.fill();
  g.clip();
  g.lineWidth = 0.9;
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.6;
    const px = x + (rng() - 0.5) * 46;
    const py = y - rng() * 20;
    g.strokeStyle = rng() < 0.5 ? '#a8822f' : '#f1d684';
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + Math.cos(a) * 8, py + Math.sin(a) * 6);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = '#8a6a26';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - 26, y);
  g.quadraticCurveTo(x - 20, y - 20, x, y - 22);
  g.quadraticCurveTo(x + 20, y - 20, x + 26, y);
  g.stroke();
}

function sack(g, x, y, s, col) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(-11, 0);
  g.bezierCurveTo(-15, -10, -12, -22, -6, -26);
  g.lineTo(-3, -30);
  g.lineTo(3, -30);
  g.lineTo(6, -26);
  g.bezierCurveTo(12, -22, 15, -10, 11, 0);
  g.closePath();
  g.fillStyle = col;
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 0.9;
  g.stroke();
  g.strokeStyle = C.vermilion;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-5, -26);
  g.lineTo(5, -26);
  g.stroke();
  g.strokeStyle = rgba(C.goldDeep, 0.6);
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(-6, -18);
  g.quadraticCurveTo(0, -14, 7, -17);
  g.moveTo(-8, -9);
  g.quadraticCurveTo(0, -5, 8, -8);
  g.stroke();
  g.restore();
}

function cartouche(g, rng) {
  const x0 = 70;
  const y0 = 96;
  const w = 104;
  const h = 62;
  g.save();
  // gold frame
  g.fillStyle = C.gold;
  g.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
  g.fillStyle = C.ink;
  g.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
  g.fillStyle = C.cream;
  g.fillRect(x0, y0, w, h);
  // cloud-band illumination in the corners
  g.fillStyle = C.gold;
  for (const [cx, cy, sx, sy] of [
    [x0, y0, 1, 1],
    [x0 + w, y0, -1, 1],
    [x0, y0 + h, 1, -1],
    [x0 + w, y0 + h, -1, -1],
  ]) {
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + sx * 13, cy);
    g.quadraticCurveTo(cx + sx * 5, cy + sy * 4, cx, cy + sy * 10);
    g.closePath();
    g.fill();
  }
  // central divider rule
  g.fillStyle = C.goldDeep;
  g.fillRect(x0 + 6, y0 + h / 2 - 0.5, w - 12, 1);
  // two half-lines of text (Persian): "the wind-mill" / "wind of a hundred and twenty days"
  g.fillStyle = C.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.direction = 'rtl';
  const fam = '"Noto Nastaliq Urdu", "Noto Naskh Arabic", "Geeza Pro", "Tahoma", "Segoe UI", "DejaVu Sans", serif';
  g.font = `600 19px ${fam}`;
  g.fillText('آسیاب بادی', x0 + w / 2, y0 + h * 0.28, w - 10);
  g.font = `500 12px ${fam}`;
  g.fillText('باد صد و بیست روزه', x0 + w / 2, y0 + h * 0.74, w - 10);
  g.restore();
}

const DSC = 0.31; // distant row: same mills, further away = higher up and smaller
const DTX = 62 - MILL.x0 * DSC;
const DTY = 386 - MILL.base * DSC;

function paintDistantMills(g, rng) {
  g.save();
  g.translate(DTX, DTY);
  g.scale(DSC, DSC);
  millMass(g, rng);
  // little doors at the grinding level
  for (let i = 0; i < MILL.n; i++) {
    const o = opening(i);
    archPath(g, o.cx - 26, o.cx + 26, MILL.base - 80, MILL.base - 10, 30);
    g.fillStyle = C.interior;
    g.fill();
  }
  g.restore();
  // haze: distance pales the colours a little
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(220,230,240,0.18)';
  g.fillRect(DTX + MILL.x0 * DSC - 20, DTY, (MILL_X1 - MILL.x0) * DSC + 40, MILL.base * DSC + 10);
  g.restore();
}

/** The mud-brick mass of a row of mills, in MILL coordinates (used at full and at distant scale). */
function millMass(g, rng) {
  const m = MILL;
  const wall = C.adobe;
  const brickLine = rgba(C.adobeDark, 0.3);
  // whole mass (piers + bands)
  bricks(g, rng, m.x0, m.top, MILL_X1 - m.x0, m.base - m.top, wall, brickLine);
  // pier tops: thick mud walls rise above the roof band with rounded, hand-smoothed crowns
  for (let i = 0; i <= m.n; i++) {
    const px = m.x0 + i * (m.pier + m.open);
    const rise = 26 + (i % 2) * 6;
    const crown = new Path2D();
    crown.moveTo(px - 1, m.top + 2);
    crown.lineTo(px - 1, m.top - rise + 8);
    crown.quadraticCurveTo(px - 1, m.top - rise - 2, px + 10, m.top - rise - 1);
    crown.lineTo(px + m.pier - 10, m.top - rise + 1);
    crown.quadraticCurveTo(px + m.pier + 1, m.top - rise, px + m.pier + 1, m.top - rise + 10);
    crown.lineTo(px + m.pier + 1, m.top + 2);
    crown.closePath();
    g.save();
    g.clip(crown);
    bricks(g, rng, px - 4, m.top - rise - 6, m.pier + 8, rise + 10, wall, brickLine);
    g.restore();
    g.strokeStyle = C.adobeDark;
    g.lineWidth = 1.2;
    g.stroke(crown);
    // light and shade stripes down the pier face
    g.fillStyle = 'rgba(255,235,200,0.16)';
    g.fillRect(px + 3, m.top - rise + 6, 5, m.floorTop - m.top + rise - 6);
    g.fillStyle = 'rgba(80,45,20,0.13)';
    g.fillRect(px + m.pier - 8, m.top - rise + 6, 5, m.floorTop - m.top + rise - 6);
    g.strokeStyle = rgba(C.adobeDark, 0.55);
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(px + 0.5, m.top);
    g.lineTo(px + 0.5, m.floorTop);
    g.moveTo(px + m.pier - 0.5, m.top);
    g.lineTo(px + m.pier - 0.5, m.floorTop);
    g.stroke();
  }
  // roof band: a strip of glazed-brick (banna'i) lozenges, then the projecting roof beams
  g.fillStyle = mix(C.adobe, C.adobeLight, 0.4);
  g.fillRect(m.x0, m.top + 2, MILL_X1 - m.x0, 9);
  for (let x = m.x0 + 6, k = 0; x < MILL_X1 - 4; x += 10, k++) {
    g.fillStyle = k % 3 === 1 ? C.lapis : C.turq;
    g.beginPath();
    g.moveTo(x, m.top + 2.5);
    g.lineTo(x + 4, m.top + 6.5);
    g.lineTo(x, m.top + 10.5);
    g.lineTo(x - 4, m.top + 6.5);
    g.closePath();
    g.fill();
  }
  g.strokeStyle = C.adobeDark;
  g.lineWidth = 0.8;
  g.strokeRect(m.x0 + 0.5, m.top + 2.5, MILL_X1 - m.x0 - 1, 9);
  for (let i = 0; i < m.n; i++) {
    const o = opening(i);
    for (let x = o.ox + 8; x < o.ox + o.w - 4; x += 18) {
      g.fillStyle = C.woodDark;
      g.beginPath();
      g.arc(x, m.top + 16, 2.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.strokeStyle = C.adobeDark;
  g.lineWidth = 1.3;
  g.beginPath();
  g.moveTo(m.x0, m.top + 0.5);
  g.lineTo(MILL_X1, m.top + 0.5);
  g.stroke();
  // rotor chambers. We look in from the lee (south) side: through the rotor we see the
  // far north wall, solid on the left (the shield) and open on the right, where the
  // "wind of 120 days" pours in and pushes the sails toward us.
  for (let i = 0; i < m.n; i++) {
    const o = opening(i);
    const y0 = m.beamY - 8;
    const y1 = m.floorTop;
    const sw = o.w * SHIELD_FRAC;
    g.fillStyle = C.interior;
    g.fillRect(o.ox, y0, o.w, y1 - y0);
    // far shield wall (in shade)
    bricks(g, rng, o.ox + 6, y0 + 14, sw - 6, y1 - y0 - 26, '#8a6342', 'rgba(40,22,10,0.35)');
    // far slot open to the north: pale sky with the wind streaming in
    const sx0 = o.ox + sw;
    const sx1 = o.ox + o.w - 6;
    const sy0 = y0 + 14;
    const sy1 = y1 - 12;
    g.fillStyle = '#9dbbe0';
    g.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    g.fillStyle = '#c7d9ef';
    g.fillRect(sx0, sy0 + (sy1 - sy0) * 0.55, sx1 - sx0, (sy1 - sy0) * 0.45);
    // distant ground seen through the slot
    g.fillStyle = mix(C.ground, '#c7d9ef', 0.35);
    g.fillRect(sx0, sy1 - 18, sx1 - sx0, 18);
    g.save();
    g.beginPath();
    g.rect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = 1.2;
    for (let k = 0; k < 7; k++) {
      const yy = sy0 + 16 + k * ((sy1 - sy0 - 30) / 6);
      g.beginPath();
      g.moveTo(sx0 + 4, yy);
      g.bezierCurveTo(sx0 + 20, yy - 5, sx0 + 34, yy + 5, sx0 + 52, yy);
      g.stroke();
      g.beginPath();
      g.arc(sx0 + 56, yy - 3, 3, Math.PI * 0.5, Math.PI * 2.2);
      g.stroke();
    }
    g.restore();
    // reed-mat regulator rolled up above the far slot (let down to slow the mill in a gale)
    g.fillStyle = C.reedDeep;
    g.beginPath();
    g.roundRect(sx0, sy0 - 4, sx1 - sx0, 9, 4.5);
    g.fill();
    g.strokeStyle = C.woodDark;
    g.lineWidth = 0.8;
    g.stroke();
    // edge of the shield wall
    g.fillStyle = '#5b3c24';
    g.fillRect(sx0 - 3, sy0 - 2, 4, sy1 - sy0 + 4);
    // soft shade along the chamber edges
    g.fillStyle = 'rgba(20,10,5,0.35)';
    g.fillRect(o.ox, y0, 8, y1 - y0);
    g.fillRect(o.ox + o.w - 8, y0, 8, y1 - y0);
    g.strokeStyle = C.adobeDark;
    g.lineWidth = 1.2;
    g.strokeRect(o.ox + 0.5, y0 + 0.5, o.w - 1, y1 - y0 - 1);
  }
  // floor band between rotor chamber and grinding room (beam ends)
  g.fillStyle = mix(C.adobe, C.adobeDeep, 0.5);
  g.fillRect(m.x0, m.floorTop, MILL_X1 - m.x0, m.floorBot - m.floorTop);
  for (let x = m.x0 + 10; x < MILL_X1 - 6; x += 22) {
    g.fillStyle = C.woodDark;
    g.beginPath();
    g.arc(x, (m.floorTop + m.floorBot) / 2, 3.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = C.woodLight;
    g.beginPath();
    g.arc(x - 0.8, (m.floorTop + m.floorBot) / 2 - 0.8, 1.4, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = C.adobeDark;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(m.x0, m.floorTop + 0.5);
  g.lineTo(MILL_X1, m.floorTop + 0.5);
  g.moveTo(m.x0, m.floorBot + 0.5);
  g.lineTo(MILL_X1, m.floorBot + 0.5);
  g.stroke();
  // outer outline of the mass
  g.strokeStyle = C.adobeDark;
  g.lineWidth = 1.4;
  g.strokeRect(m.x0 + 0.5, m.top + 0.5, MILL_X1 - m.x0 - 1, m.base - m.top - 1);
  // plinth
  g.fillStyle = mix(C.adobe, C.adobeDeep, 0.6);
  g.fillRect(m.x0 - 6, m.base - 10, MILL_X1 - m.x0 + 12, 12);
  g.strokeStyle = C.adobeDark;
  g.strokeRect(m.x0 - 6 + 0.5, m.base - 10 + 0.5, MILL_X1 - m.x0 + 11, 11);
}

function paintMillComplex(g, rng) {
  const m = MILL;
  millMass(g, rng);
  // doors of mill 1 (the miller's door) and mill 3, in tiled arch frames
  for (const i of [0, 2]) {
    const o = opening(i);
    const fx0 = o.cx - 38;
    const fx1 = o.cx + 38;
    g.fillStyle = C.turq;
    archPath(g, fx0, fx1, m.base - 98, m.base - 10, 42);
    g.fill();
    tilePattern(g, fx0, m.base - 142, fx1 - fx0, 134);
    archPath(g, fx0, fx1, m.base - 98, m.base - 10, 42);
    g.strokeStyle = C.ink;
    g.lineWidth = 1.1;
    g.stroke();
    archPath(g, o.cx - 28, o.cx + 28, m.base - 92, m.base - 10, 34);
    g.fillStyle = C.interior;
    g.fill();
    g.strokeStyle = C.gold;
    g.lineWidth = 1.6;
    g.stroke();
    // open door leaf (planks with gilt studs)
    g.fillStyle = C.wood;
    g.beginPath();
    g.moveTo(o.cx - 28, m.base - 10);
    g.lineTo(o.cx - 28, m.base - 90);
    g.lineTo(o.cx - 15, m.base - 98);
    g.lineTo(o.cx - 15, m.base - 13);
    g.closePath();
    g.fill();
    g.strokeStyle = C.woodDark;
    g.lineWidth = 1;
    g.stroke();
    g.beginPath();
    g.moveTo(o.cx - 21.5, m.base - 94);
    g.lineTo(o.cx - 21.5, m.base - 12);
    g.stroke();
    for (let k = 0; k < 5; k++) {
      g.fillStyle = C.goldLight;
      g.fillRect(o.cx - 25, m.base - 80 + k * 15, 2, 2);
      g.fillRect(o.cx - 19, m.base - 82 + k * 15, 2, 2);
    }
  }
  paintIwan(g, rng);
}

/** Turquoise / lapis tile mosaic inside an already-built arch frame. */
function tilePattern(g, x, y, w, h) {
  g.save();
  g.clip();
  for (let yy = y; yy < y + h; yy += 8) {
    for (let xx = x + ((yy - y) / 8) % 2 * 4; xx < x + w; xx += 8) {
      g.fillStyle = (Math.round(xx + yy) / 8) % 3 < 1 ? C.lapis : C.turqLight;
      g.beginPath();
      g.moveTo(xx, yy - 3);
      g.lineTo(xx + 3, yy);
      g.lineTo(xx, yy + 3);
      g.lineTo(xx - 3, yy);
      g.closePath();
      g.fill();
    }
  }
  g.restore();
}

/** The cut-away grinding room of mill 2: millstones below the rotor (static parts). */
function paintIwan(g, rng) {
  const w = IWAN;
  // spandrel frame with tiles
  g.fillStyle = C.lapisDeep;
  g.fillRect(w.x0 - 10, w.top - 16, w.x1 - w.x0 + 20, w.base - w.top + 6);
  g.save();
  g.beginPath();
  g.rect(w.x0 - 10, w.top - 16, w.x1 - w.x0 + 20, w.base - w.top + 6);
  tilePattern(g, w.x0 - 10, w.top - 16, w.x1 - w.x0 + 20, w.base - w.top + 6);
  g.restore();
  g.strokeStyle = C.gold;
  g.lineWidth = 2;
  g.strokeRect(w.x0 - 9, w.top - 15, w.x1 - w.x0 + 18, w.base - w.top + 4);
  // interior
  archPath(g, w.x0, w.x1, w.top + 40, w.base - 10, 46);
  g.save();
  g.clip();
  g.fillStyle = '#ead9b6';
  g.fillRect(w.x0, w.top - 20, w.x1 - w.x0, w.base - w.top + 20);
  // plaster back wall + a niche with an oil lamp
  g.fillStyle = '#d9c39a';
  g.fillRect(w.x0, w.base - 44, w.x1 - w.x0, 34);
  g.fillStyle = '#b89c6c';
  archPath(g, w.x1 - 30, w.x1 - 12, w.top + 64, w.top + 84, 10);
  g.fill();
  g.fillStyle = C.goldDeep;
  g.beginPath();
  g.ellipse(w.x1 - 21, w.top + 80, 5, 2.2, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f6c45a';
  g.beginPath();
  g.ellipse(w.x1 - 18, w.top + 75, 1.6, 3, 0.2, 0, Math.PI * 2);
  g.fill();
  // carpet floor
  g.fillStyle = C.carmine;
  g.fillRect(w.x0, w.base - 18, w.x1 - w.x0, 8);
  g.fillStyle = C.goldLight;
  for (let x = w.x0 + 3; x < w.x1; x += 7) g.fillRect(x, w.base - 15, 2, 2);
  // bed stone (static, the runner turns on it)
  const s = STONE;
  const by = s.y + s.h;
  g.fillStyle = '#8f8a84';
  g.beginPath();
  g.ellipse(s.cx, by + s.h - 2, s.rx + 4, s.ry + 1, 0, 0, Math.PI);
  g.lineTo(s.cx - s.rx - 4, by);
  g.ellipse(s.cx, by, s.rx + 4, s.ry + 1, 0, Math.PI, 0, true);
  g.closePath();
  g.fill();
  g.strokeStyle = C.ink;
  g.lineWidth = 0.9;
  g.stroke();
  // flour heap + wooden tray in front of the stones
  g.fillStyle = '#7a5230';
  g.fillRect(s.cx - 44, by + 6, 16, 6);
  g.fillStyle = C.flour;
  g.beginPath();
  g.moveTo(s.cx - 47, by + 7);
  g.quadraticCurveTo(s.cx - 37, by - 8, s.cx - 25, by + 7);
  g.closePath();
  g.fill();
  // hopper (grain box) hanging above the stones, fed from a sack
  g.fillStyle = C.woodLight;
  g.beginPath();
  g.moveTo(s.cx - 34, w.top + 52);
  g.lineTo(s.cx - 10, w.top + 52);
  g.lineTo(s.cx - 17, w.top + 76);
  g.lineTo(s.cx - 26, w.top + 76);
  g.closePath();
  g.fill();
  g.strokeStyle = C.woodDark;
  g.stroke();
  // feed shoe to the eye of the stone
  g.strokeStyle = C.woodDark;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(s.cx - 22, w.top + 78);
  g.lineTo(s.cx - 8, s.y - 12);
  g.stroke();
  // hanging cords
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(s.cx - 32, w.top + 52);
  g.lineTo(s.cx - 28, w.top + 20);
  g.moveTo(s.cx - 12, w.top + 52);
  g.lineTo(s.cx - 16, w.top + 20);
  g.stroke();
  g.restore();
  // arch outline in gold & ink
  archPath(g, w.x0, w.x1, w.top + 40, w.base - 10, 46);
  g.strokeStyle = C.ink;
  g.lineWidth = 2.6;
  g.stroke();
  g.strokeStyle = C.gold;
  g.lineWidth = 1.2;
  g.stroke();
}

// -----------------------------------------------------------------------------
// mill front overlay (shield walls and bearing beams over the rotors)
// -----------------------------------------------------------------------------
const FRONT_BOX = { x: MILL.x0 - 4, y: MILL.beamY - 14, w: MILL_X1 - MILL.x0 + 8, h: MILL.floorTop - MILL.beamY + 18 };

function paintMillFront(g, rng) {
  const m = MILL;
  g.translate(-FRONT_BOX.x, -FRONT_BOX.y);
  for (let i = 0; i < m.n; i++) {
    const o = opening(i);
    // upper bearing beam
    const beam = (y) => {
      g.fillStyle = C.wood;
      g.fillRect(o.ox - 4, y, o.w + 8, 8);
      g.fillStyle = C.woodLight;
      g.fillRect(o.ox - 4, y, o.w + 8, 2);
      g.strokeStyle = C.woodDark;
      g.lineWidth = 1;
      g.strokeRect(o.ox - 3.5, y + 0.5, o.w + 7, 7);
      g.fillStyle = C.woodDark;
      g.fillRect(o.cx - 9, y - 2, 18, 12);
      g.fillStyle = C.goldDeep;
      g.fillRect(o.cx - 9, y + 4, 18, 1.5);
    };
    beam(m.beamY + 2);
    // lower bearing beam (the shaft passes on down to the millstones)
    beam(m.floorTop - 9);
  }
}

// -----------------------------------------------------------------------------
// layer 2: foreground (road, silver stream, flowers, lower border)
// -----------------------------------------------------------------------------
const streamTop = (x) => 778 + 16 * Math.sin(x * 0.009 + 0.6) + 6 * Math.sin(x * 0.031);
const streamBot = (x) => 836 + 14 * Math.sin(x * 0.008 + 2.0) + 5 * Math.sin(x * 0.027 + 1);

function paintForeground(g, rng, w, h) {
  g.translate(0, -FG_Y);
  // ground continues
  g.fillStyle = C.ground;
  g.fillRect(0, FG_Y, P, P - FG_Y);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = rng() < 0.5 ? rgba(C.groundLight, 0.35) : rgba(C.groundDeep, 0.22);
    g.beginPath();
    g.ellipse(rng() * P, FG_Y + rng() * 240, 10 + rng() * 40, 3 + rng() * 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  // silver stream (tarnished silver leaf: dark with pale wave scrolls)
  const sp = new Path2D();
  sp.moveTo(0, streamTop(0));
  for (let x = 0; x <= P; x += 8) sp.lineTo(x, streamTop(x));
  for (let x = P; x >= 0; x -= 8) sp.lineTo(x, streamBot(x));
  sp.closePath();
  g.fillStyle = C.silver;
  g.fill(sp);
  g.save();
  g.clip(sp);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(30,35,40,0.25)' : 'rgba(200,210,220,0.1)';
    g.fillRect(rng() * P, 760 + rng() * 100, 2, 1);
  }
  g.strokeStyle = rgba(C.silverLight, 0.75);
  g.lineWidth = 1.1;
  for (let row = 0; row < 5; row++) {
    for (let x = -20 + row * 13; x < P; x += 46) {
      const y = lerp(streamTop(x), streamBot(x), 0.15 + row * 0.18);
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + 8, y - 6, x + 16, y - 6, x + 20, y);
      g.bezierCurveTo(x + 22, y + 3, x + 18, y + 4, x + 16, y + 1);
      g.stroke();
    }
  }
  g.restore();
  g.strokeStyle = C.silverDark;
  g.lineWidth = 1.4;
  g.stroke(sp);
  // stones on the banks
  for (let i = 0; i < 26; i++) {
    const x = 70 + rng() * 860;
    const top = rng() < 0.5;
    const y = top ? streamTop(x) - 2 : streamBot(x) + 2;
    g.fillStyle = [C.lilac, C.rose, '#9fb3cf', C.ochre][Math.floor(rng() * 4)];
    g.beginPath();
    g.ellipse(x, y, 5 + rng() * 6, 3 + rng() * 2, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(60,40,40,0.6)';
    g.lineWidth = 0.8;
    g.stroke();
  }
  // flowers in stacked rows
  const kinds = ['white', 'tulip', 'pink', 'iris', 'yellow', 'tulip', 'white'];
  for (let yy = 740; yy < 905; yy += 20) {
    for (let xx = 74 + ((yy / 20) % 2) * 20; xx < 930; xx += 40) {
      const x = xx + (rng() - 0.5) * 12;
      const y = yy + (rng() - 0.5) * 6;
      if (y > streamTop(x) - 8 && y < streamBot(x) + 10) continue;
      sprig(g, rng, x, y, 1.05 + rng() * 0.3, kinds[Math.floor(rng() * kinds.length)]);
    }
  }
  // bigger iris clumps at the front
  for (const x of [120, 300, 520, 700, 880]) {
    for (let k = 0; k < 3; k++) sprig(g, rng, x + k * 9 - 9, 896 - (k % 2) * 4, 1.6, k === 1 ? 'iris' : 'tulip');
  }
  // lower border strip, side strips (lower part) and rulings
  g.save();
  g.beginPath();
  g.rect(0, FG_Y, P, P - FG_Y);
  g.clip();
  borderStrip(g, 26, IN.y0, IN.x0 - 26, IN.y1 - IN.y0, true);
  borderStrip(g, IN.x1, IN.y0, P - 26 - IN.x1, IN.y1 - IN.y0, true);
  borderStrip(g, 26, IN.y1, P - 52, P - 26 - IN.y1, false);
  for (const [x, y] of [
    [IN.x0 - 16, IN.y1 + 30],
    [IN.x1 + 16, IN.y1 + 30],
  ]) {
    g.fillStyle = C.lapisDeep;
    g.beginPath();
    g.arc(x, y, 13, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = C.gold;
    g.lineWidth = 1.2;
    g.stroke();
    rosette(g, x, y, 11, C.gold, C.vermilion, C.goldDeep);
  }
  g.restore();
  jadval(g, FG_Y, P);
  // spiky rocks in the near corners, breaking over the rulings into the margin
  const fr = K.makePRNG(77);
  rockLump(g, fr, 92, 924, 70, 92, C.lilac);
  rockLump(g, fr, 132, 926, 62, 64, C.rose);
  rockLump(g, fr, 70, 930, 44, 50, '#9fb3cf');
  sprig(g, fr, 160, 922, 1.7, 'iris');
  sprig(g, fr, 172, 926, 1.5, 'tulip');
  rockLump(g, fr, 902, 926, 70, 96, C.ochre);
  rockLump(g, fr, 866, 928, 56, 62, '#a9c7a6');
  rockLump(g, fr, 930, 932, 40, 46, C.rose);
  sprig(g, fr, 836, 924, 1.6, 'tulip');
  sprig(g, fr, 824, 928, 1.4, 'white');
  // the road: a pale path that breaks out through the painted border on both sides
  const rt = (x) => 684 + 1.5 * Math.sin(x * 0.05);
  const rb = (x) => 717 + 1.5 * Math.sin(x * 0.043 + 1);
  const rp = new Path2D();
  rp.moveTo(0, rt(0));
  for (let x = 0; x <= P; x += 5) rp.lineTo(x, rt(x));
  for (let x = P; x >= 0; x -= 5) rp.lineTo(x, rb(x));
  rp.closePath();
  g.fillStyle = '#ead7ab';
  g.fill(rp);
  g.save();
  g.clip(rp);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = rng() < 0.6 ? 'rgba(150,115,70,0.35)' : 'rgba(255,250,235,0.5)';
    g.beginPath();
    g.arc(rng() * P, 682 + rng() * 38, 0.6 + rng() * 1.3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.strokeStyle = C.goldDeep;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let x = 0; x <= P; x += 5) (x === 0 ? g.moveTo(x, rt(x)) : g.lineTo(x, rt(x)));
  g.stroke();
  g.beginPath();
  for (let x = 0; x <= P; x += 5) (x === 0 ? g.moveTo(x, rb(x)) : g.lineTo(x, rb(x)));
  g.stroke();
  g.setTransform(1, 0, 0, 1, 0, 0);
  K.addGrain(g, w, h, rng, 0.014);
}

// -----------------------------------------------------------------------------
// animated parts
// -----------------------------------------------------------------------------
const VANE_TONES = [];
function vaneTone(lum) {
  const i = clamp(Math.round(lum * 20), 0, 20);
  if (!VANE_TONES[i]) VANE_TONES[i] = mix(C.reedDeep, C.reed, i / 20);
  return VANE_TONES[i];
}

/**
 * Vertical-axis rotor seen from the side and slightly from above (the miniature's
 * raised viewpoint): six radial arms carrying reed-bundle sails. A point at radius r,
 * angle a projects to (cx + r cos a, y + r sin a * ELEV): near sails sit lower.
 */
function drawRotor(ctx, cx, top, bot, R, theta, scale = 1, shaftTop = top - 16 * scale, shaftBot = bot + 16 * scale) {
  const n = 6;
  const vanes = [];
  for (let k = 0; k < n; k++) {
    const a = theta + (k * Math.PI * 2) / n;
    vanes.push({ c: Math.cos(a), s: Math.sin(a) });
  }
  vanes.sort((A, B) => A.s - B.s);
  const h = bot - top;
  const r0 = R * 0.2;
  const armYs = [top - 4 * scale, top + h * 0.5, bot + 4 * scale];
  const ties = [0.24, 0.76];
  const lw = Math.max(0.6, scale);
  const drawVane = (v) => {
    const back = v.s < 0;
    const dzi = r0 * v.s * ELEV;
    const dzo = R * v.s * ELEV;
    const xi = cx + r0 * v.c;
    const xo = cx + R * v.c;
    // arms (spokes) reaching past the sail
    ctx.strokeStyle = back ? C.woodDark : C.wood;
    ctx.lineWidth = 2.8 * lw;
    ctx.beginPath();
    for (const y of armYs) {
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + R * 1.06 * v.c, y + R * 1.06 * v.s * ELEV);
    }
    ctx.stroke();
    const w = Math.abs(xo - xi);
    const facing = Math.abs(v.c);
    let lum = 0.3 + 0.7 * facing;
    if (v.c < 0) lum *= 0.82;
    if (back) lum *= 0.45;
    // sail quad
    ctx.beginPath();
    ctx.moveTo(xi, top + dzi);
    ctx.lineTo(xo, top + dzo);
    ctx.lineTo(xo, bot + dzo);
    ctx.lineTo(xi, bot + dzi);
    ctx.closePath();
    ctx.fillStyle = vaneTone(lum);
    ctx.fill();
    if (scale >= 0.6 && w > 3) {
      // reed bundles (vertical), squeezed by the projection
      ctx.strokeStyle = back ? 'rgba(50,30,10,0.5)' : 'rgba(115,82,32,0.55)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const nb = 9;
      for (let j = 1; j < nb; j++) {
        const f = j / nb;
        const x = lerp(xi, xo, f);
        const dz = lerp(dzi, dzo, f);
        ctx.moveTo(x, top + dz + 1);
        ctx.lineTo(x, bot + dz - 1);
      }
      ctx.stroke();
      // cord ties binding the bundles to the frame
      ctx.strokeStyle = back ? C.woodDark : C.carmine;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const f of ties) {
        const y = top + h * f;
        ctx.moveTo(xi, y + dzi);
        ctx.lineTo(xo, y + dzo);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = back ? 'rgba(25,15,8,0.85)' : C.woodDark;
    ctx.lineWidth = 1.1 * lw;
    ctx.beginPath();
    ctx.moveTo(xi, top + dzi);
    ctx.lineTo(xo, top + dzo);
    ctx.lineTo(xo, bot + dzo);
    ctx.lineTo(xi, bot + dzi);
    ctx.closePath();
    ctx.stroke();
    // outer stile of the sail frame
    ctx.strokeStyle = back ? C.woodDark : C.wood;
    ctx.lineWidth = 2.2 * lw;
    ctx.beginPath();
    ctx.moveTo(xo, top + dzo - 2 * scale);
    ctx.lineTo(xo, bot + dzo + 2 * scale);
    ctx.stroke();
  };
  let i = 0;
  for (; i < n && vanes[i].s < 0; i++) drawVane(vanes[i]);
  // shaft (a single tree trunk)
  const sh = shaftBot - shaftTop;
  ctx.fillStyle = C.wood;
  ctx.fillRect(cx - 5 * scale, shaftTop, 10 * scale, sh);
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(cx - 5 * scale, shaftTop, 3.5 * scale, sh);
  ctx.fillStyle = C.woodLight;
  ctx.fillRect(cx + 1.5 * scale, shaftTop, 1.5 * scale, sh);
  // iron-bound hub collars where the arms are morticed into the shaft
  ctx.fillStyle = C.woodDark;
  for (const y of armYs) ctx.fillRect(cx - 6.5 * scale, y - 3 * scale, 13 * scale, 6 * scale);
  for (; i < n; i++) drawVane(vanes[i]);
}

function drawDistantRotors(ctx, at) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, MILL.x0 - 0.5, P);
  ctx.clip();
  ctx.translate(DTX, DTY);
  ctx.scale(DSC, DSC);
  for (let i = 0; i < MILL.n; i++) {
    const o = opening(i);
    if (DTX + o.ox * DSC > MILL.x0) break;
    ctx.save();
    ctx.beginPath();
    ctx.rect(o.ox, MILL.beamY - 8, o.w, MILL.floorTop - MILL.beamY + 8);
    ctx.clip();
    drawRotor(ctx, o.cx, MILL.rotTop, MILL.rotBot, ROT_R, at * ROT_SPEED * 0.93 + 1.3 + i * 2.2, 1, MILL.beamY + 4, MILL.floorTop - 4);
    ctx.restore();
    ctx.fillStyle = C.wood;
    ctx.fillRect(o.ox - 4, MILL.beamY + 2, o.w + 8, 8);
    ctx.fillRect(o.ox - 4, MILL.floorTop - 9, o.w + 8, 8);
  }
  // distance haze over the little rotors too
  ctx.fillStyle = 'rgba(220,230,240,0.16)';
  ctx.fillRect(MILL.x0, MILL.beamY - 8, MILL_X1 - MILL.x0, MILL.floorTop - MILL.beamY + 8);
  ctx.restore();
}

function drawMillstone(ctx, at, rumble) {
  const s = STONE;
  const phi = at * ROT_SPEED + ROT_PHASE[1];
  const jx = rumble ? Math.sin(at * 90) * 0.8 : 0;
  ctx.save();
  // shaft down from the ceiling into the runner stone
  ctx.save();
  archPath(ctx, IWAN.x0, IWAN.x1, IWAN.top + 40, IWAN.base - 10, 46);
  ctx.clip();
  ctx.fillStyle = C.wood;
  ctx.fillRect(s.cx - 4 + jx, IWAN.top - 10, 8, s.y - IWAN.top + 12);
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(s.cx - 4 + jx, IWAN.top - 10, 3, s.y - IWAN.top + 12);
  ctx.restore();
  const cx = s.cx + jx;
  // runner stone: cylinder
  ctx.fillStyle = '#a7a29b';
  ctx.beginPath();
  ctx.ellipse(cx, s.y + s.h, s.rx, s.ry, 0, 0, Math.PI);
  ctx.lineTo(cx - s.rx, s.y);
  ctx.ellipse(cx, s.y, s.rx, s.ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // rotating dressing marks on the rim (only the front half is visible)
  ctx.strokeStyle = 'rgba(60,55,50,0.8)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = phi + (k * Math.PI * 2) / 8;
    if (Math.sin(a) <= 0.05) continue;
    const x = cx + Math.cos(a) * s.rx;
    const yo = Math.sin(a) * s.ry;
    ctx.moveTo(x, s.y + yo + 2);
    ctx.lineTo(x, s.y + yo + s.h - 2);
  }
  ctx.stroke();
  // top face with furrows
  ctx.fillStyle = '#c3beb6';
  ctx.beginPath();
  ctx.ellipse(cx, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,75,70,0.6)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = phi + (k * Math.PI) / 3;
    ctx.moveTo(cx + Math.cos(a) * s.rx * 0.3, s.y + Math.sin(a) * s.ry * 0.3);
    ctx.lineTo(cx + Math.cos(a) * s.rx * 0.92, s.y + Math.sin(a) * s.ry * 0.92);
  }
  ctx.stroke();
  // eye of the stone + grain trickling in
  ctx.fillStyle = '#4b453f';
  ctx.beginPath();
  ctx.ellipse(cx, s.y, 6, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.ochre;
  for (let k = 0; k < 5; k++) {
    const f = (at * 2.2 + k / 5) % 1;
    ctx.fillRect(lerp(s.cx - 9, cx - 3, f), lerp(s.y - 12, s.y - 1, f), 1.6, 1.6);
  }
  // flour dust escaping at the rim
  ctx.fillStyle = 'rgba(250,247,240,0.85)';
  for (let k = 0; k < 6; k++) {
    const f = (at * 0.9 + k / 6) % 1;
    const x = cx - s.rx - 2 - f * 12;
    const y = s.y + s.h + 4 - f * 6 + Math.sin(k * 3 + at * 3) * 2;
    ctx.globalAlpha = 1 - f;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + f * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Small red pennant on the roof of mill 2 — shows the wind. */
function drawPennant(ctx, at) {
  const px = MILL.x0 + 2 * (MILL.pier + MILL.open) + MILL.pier / 2;
  const py = MILL.top - 30;
  ctx.save();
  ctx.strokeStyle = C.woodDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py + 8);
  ctx.lineTo(px, py - 36);
  ctx.stroke();
  ctx.fillStyle = C.gold;
  ctx.beginPath();
  ctx.arc(px, py - 38, 3, 0, Math.PI * 2);
  ctx.fill();
  const L = 44;
  ctx.beginPath();
  ctx.moveTo(px, py - 34);
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const x = px + u * L;
    const y = py - 34 + u * 7 + Math.sin(at * 9 - u * 5) * 4 * u;
    ctx.lineTo(x, y);
  }
  for (let i = 12; i >= 0; i--) {
    const u = i / 12;
    const x = px + u * L * 0.98;
    const y = py - 21 - u * 6 + Math.sin(at * 9 - u * 5) * 4 * u;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = C.vermilion;
  ctx.fill();
  ctx.strokeStyle = C.goldDeep;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Two small birds crossing the sky. */
function drawBirds(ctx, at) {
  for (let k = 0; k < 2; k++) {
    const x = 250 + ((at * 22 + k * 40) % 900) - 120;
    const y = 112 + k * 18 + Math.sin(at * 0.9 + k) * 6;
    const flap = Math.sin(at * 10 + k * 2);
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#1f1a24';
    ctx.fillStyle = '#f5efe2';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-6, -6 * flap - 2, -11, -9 * flap);
    ctx.moveTo(1, 0);
    ctx.quadraticCurveTo(4, -6 * flap - 2, 8, -9 * flap);
    ctx.stroke();
    ctx.restore();
  }
}

// -----------------------------------------------------------------------------
// figures
// -----------------------------------------------------------------------------
/**
 * Miniature-style figure in a long robe and turban. Feet at (0,0), ~100 px tall at s = 1,
 * facing +x (dir = -1 mirrors). Arms: angles from straight down, positive = forward.
 */
function drawPerson(ctx, x, y, s, o) {
  const f = o.flour || 0;
  const tint = (c) => (f > 0 ? mix(c, C.flour, f * 0.9) : c);
  const tintSkin = (c) => (f > 0 ? mix(c, C.flour, f * 0.4) : c);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (o.dir || 1), s);
  ctx.rotate(o.lean || 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const ink = f > 0.5 ? '#6b6258' : C.ink;
  const arm = (sh, a1, a2, col, far) => {
    const L1 = 18;
    const L2 = 16;
    const ex = sh.x + Math.sin(a1) * L1;
    const ey = sh.y + Math.cos(a1) * L1;
    const hx = ex + Math.sin(a1 + a2) * L2;
    const hy = ey + Math.cos(a1 + a2) * L2;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8.6;
    ctx.beginPath();
    ctx.moveTo(sh.x, sh.y);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = far ? tint(mix(col, C.ink, 0.25)) : tint(col);
    ctx.lineWidth = 6.8;
    ctx.stroke();
    // gold cuff + hand
    ctx.fillStyle = tintSkin(C.skin);
    ctx.beginPath();
    ctx.arc(hx + Math.sin(a1 + a2) * 2, hy + Math.cos(a1 + a2) * 2, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  };
  // far arm
  arm({ x: -3, y: -68 }, o.armFar[0], o.armFar[1], o.robe, true);
  // shoes
  ctx.fillStyle = tint('#2a1a12');
  ctx.beginPath();
  ctx.ellipse(-5, -2, 6, 2.6, 0, 0, Math.PI * 2);
  ctx.ellipse(7, -2, 6.5, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tint(C.vermilion);
  ctx.beginPath();
  ctx.moveTo(12, -3);
  ctx.quadraticCurveTo(16, -4, 15, -7);
  ctx.lineTo(11, -4);
  ctx.fill();
  // under-robe hem
  ctx.fillStyle = tint(o.under);
  ctx.beginPath();
  ctx.moveTo(-15, -4);
  ctx.lineTo(15, -4);
  ctx.lineTo(12, -16);
  ctx.lineTo(-12, -16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // robe (jama)
  ctx.beginPath();
  ctx.moveTo(-10, -72);
  ctx.quadraticCurveTo(0, -76, 10, -72);
  ctx.quadraticCurveTo(14, -40, 18, -9);
  ctx.quadraticCurveTo(0, -5, -17, -8);
  ctx.quadraticCurveTo(-14, -40, -10, -72);
  ctx.closePath();
  ctx.fillStyle = tint(o.robe);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  // robe pattern: tiny gold flowers
  ctx.fillStyle = tint(C.goldLight);
  for (let k = 0; k < 9; k++) {
    const px = -9 + (k % 3) * 8 + ((k / 3) | 0) * 1.5;
    const py = -62 + ((k / 3) | 0) * 18;
    ctx.fillRect(px, py, 1.5, 1.5);
  }
  // front edge + hem border in gold
  ctx.strokeStyle = tint(C.gold);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(4, -73);
  ctx.quadraticCurveTo(8, -40, 11, -8);
  ctx.moveTo(-16, -9);
  ctx.quadraticCurveTo(0, -6, 17, -10);
  ctx.stroke();
  // sash
  ctx.fillStyle = tint(o.sash);
  ctx.beginPath();
  ctx.moveTo(-12, -50);
  ctx.lineTo(12, -50);
  ctx.lineTo(12.5, -44);
  ctx.lineTo(-12.5, -44);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, -45);
  ctx.quadraticCurveTo(10, -36, 8, -28);
  ctx.lineTo(11, -29);
  ctx.quadraticCurveTo(12, -37, 9, -45);
  ctx.closePath();
  ctx.fill();
  // neck + head (3/4 view)
  ctx.fillStyle = tintSkin(C.skin);
  ctx.fillRect(-2, -78, 6, 6);
  ctx.beginPath();
  ctx.arc(2, -83, 7.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // beard
  ctx.fillStyle = f > 0.5 ? '#efe9de' : o.beard;
  ctx.beginPath();
  ctx.moveTo(-3, -82);
  ctx.quadraticCurveTo(-2, -73, 3, -70);
  ctx.quadraticCurveTo(9, -71, 9.5, -79);
  ctx.quadraticCurveTo(5, -77, 2, -79);
  ctx.closePath();
  ctx.fill();
  // eye & brow (blinking through the flour)
  if (f > 0.5) {
    ctx.fillStyle = 'rgba(205,150,120,0.55)';
    ctx.beginPath();
    ctx.ellipse(5.4, -84.5, 2.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1a1210';
  ctx.beginPath();
  ctx.ellipse(5.4, -84.5, 1.3, o.shock ? 1.5 : 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1210';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(3, o.shock ? -88.5 : -87.2);
  ctx.quadraticCurveTo(5.5, o.shock ? -90 : -88.4, 8, o.shock ? -88.5 : -87.2);
  ctx.stroke();
  if (o.shout) {
    ctx.fillStyle = '#5a1a14';
    ctx.beginPath();
    ctx.ellipse(7.5, -77.5, 1.6, 1.8 + o.shout, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // turban
  ctx.fillStyle = tint(o.turban);
  ctx.beginPath();
  ctx.ellipse(1, -90, 9.6, 6.4, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.strokeStyle = tint('#b9ad98');
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-7, -92);
  ctx.quadraticCurveTo(1, -86, 9, -93);
  ctx.moveTo(-8, -88);
  ctx.quadraticCurveTo(1, -83, 10, -89);
  ctx.stroke();
  ctx.fillStyle = tint(o.cap || C.vermilion);
  ctx.beginPath();
  ctx.ellipse(0, -96, 3.4, 2.6, 0, Math.PI, 0);
  ctx.fill();
  // near arm
  arm({ x: 5, y: -68 }, o.armNear[0], o.armNear[1], o.robe, false);
  ctx.restore();
}

/** Grey donkey with striped saddle bags. Feet at (0,0), facing +x. */
function drawDonkey(ctx, x, y, s, st) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const ink = C.ink;
  const ph = st.phase;
  const amp = st.trot;
  const bob = -amp * 2.5 * Math.abs(Math.sin(ph));
  const legs = [
    { hx: 22, far: true, off: Math.PI },
    { hx: -22, far: true, off: 0 },
    { hx: 26, far: false, off: 0 },
    { hx: -18, far: false, off: Math.PI },
  ];
  const drawLeg = (L) => {
    const ph2 = ph + L.off;
    const sw = Math.sin(ph2) * 0.42 * amp;
    const lift = Math.max(0, Math.cos(ph2)) * amp;
    const top = { x: L.hx, y: -34 + bob };
    const hoof = { x: top.x + Math.sin(sw) * 34, y: -1 - lift * 8 };
    const fold = (L.hx > 0 ? -1 : 1) * lift * 7;
    const knee = { x: (top.x + hoof.x) / 2 + fold, y: (top.y + hoof.y) / 2 + 1 };
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6.4;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(hoof.x, hoof.y);
    ctx.stroke();
    ctx.strokeStyle = L.far ? mix(C.donkey, C.ink, 0.3) : C.donkey;
    ctx.lineWidth = 4.8;
    ctx.stroke();
    ctx.fillStyle = '#2a2420';
    ctx.fillRect(hoof.x - 3, hoof.y - 2, 6, 3);
  };
  drawLeg(legs[0]);
  drawLeg(legs[1]);
  // tail
  const tw = Math.sin(st.t * 5) * 0.3 + (amp > 0 ? 0.4 : 0);
  ctx.strokeStyle = C.donkeyDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-34, -46 + bob);
  ctx.quadraticCurveTo(-42 - tw * 6, -36 + bob, -41 - tw * 12, -24 + bob + tw * 4);
  ctx.stroke();
  ctx.fillStyle = C.donkeyDark;
  ctx.beginPath();
  ctx.ellipse(-41 - tw * 12, -22 + bob + tw * 4, 2.4, 4.5, tw, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.beginPath();
  ctx.ellipse(0, -45 + bob, 34, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.donkey;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = C.donkeyLight;
  ctx.beginPath();
  ctx.ellipse(2, -33 + bob, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // shoulder cross-stripe (typical donkey marking)
  ctx.strokeStyle = C.donkeyDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, -58 + bob);
  ctx.lineTo(16, -42 + bob);
  ctx.stroke();
  // saddle bags (khurjin, kilim-woven)
  ctx.fillStyle = C.carmine;
  ctx.fillRect(-18, -62 + bob, 30, 26);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.9;
  ctx.strokeRect(-18, -62 + bob, 30, 26);
  ctx.fillStyle = C.goldLight;
  for (let k = 0; k < 3; k++) {
    const cx = -11 + k * 8;
    const cy = -49 + bob;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 3.5, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 3.5, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = C.lapisDeep;
  ctx.fillRect(-18, -62 + bob, 30, 3);
  ctx.fillRect(-18, -39 + bob, 30, 3);
  // fringe
  ctx.strokeStyle = C.gold;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    ctx.moveTo(-17 + k * 4, -36 + bob);
    ctx.lineTo(-17 + k * 4, -32 + bob);
  }
  ctx.stroke();
  // grain sack on top
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  ctx.ellipse(-3, -64 + bob, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.stroke();
  // neck + head
  const hd = st.head; // 0 = grazing (down), 1 = up / alert
  const nx = 28;
  const ny = -52 + bob;
  const hx = lerp(54, 52, hd);
  const hy = lerp(-14, -78, hd) + bob;
  ctx.beginPath();
  ctx.moveTo(nx - 8, ny - 8);
  ctx.quadraticCurveTo(lerp(44, 40, hd), lerp(-48, -70, hd) + bob, hx - 2, hy - 6);
  ctx.lineTo(hx + 4, hy + 4);
  ctx.quadraticCurveTo(lerp(44, 46, hd), lerp(-34, -56, hd) + bob, nx + 4, ny + 10);
  ctx.closePath();
  ctx.fillStyle = C.donkey;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.stroke();
  // mane
  ctx.strokeStyle = C.donkeyDark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(nx - 6, ny - 9);
  ctx.quadraticCurveTo(lerp(42, 38, hd), lerp(-50, -72, hd) + bob, hx - 4, hy - 8);
  ctx.stroke();
  // head: long muzzle
  const ha = lerp(1.25, 0.55, hd) + (st.bray ? -0.35 : 0);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ha);
  // ears
  const ew = st.earFlick || 0;
  ctx.fillStyle = C.donkey;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  for (const [ox, a] of [
    [-4, -2.4 - ew],
    [0, -2.0 + (st.bray ? 0.6 : 0)],
  ]) {
    ctx.save();
    ctx.translate(ox, -4);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, -11, 3.2, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e9c7b8';
    ctx.beginPath();
    ctx.ellipse(0, -11, 1.4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.donkey;
    ctx.restore();
  }
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.quadraticCurveTo(10, -9, 24, -4);
  ctx.quadraticCurveTo(28, 1, 24, 6);
  ctx.quadraticCurveTo(10, 8, -6, 6);
  ctx.closePath();
  ctx.fillStyle = C.donkey;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.donkeyLight;
  ctx.beginPath();
  ctx.ellipse(21, 1, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1512';
  ctx.beginPath();
  ctx.arc(2, -2, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(24, -1, 0.9, 0, Math.PI * 2);
  ctx.fill();
  if (st.bray) {
    ctx.fillStyle = '#5a2a22';
    ctx.beginPath();
    ctx.moveTo(26, 3);
    ctx.lineTo(16, 6);
    ctx.lineTo(25, 10 + st.bray * 3);
    ctx.closePath();
    ctx.fill();
  }
  // bridle
  ctx.strokeStyle = C.vermilion;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(8, -7);
  ctx.lineTo(10, 7);
  ctx.moveTo(10, 0);
  ctx.lineTo(22, -4);
  ctx.stroke();
  ctx.restore();
  // near legs
  drawLeg(legs[2]);
  drawLeg(legs[3]);
  ctx.restore();
}

/** Apprentice on the roof hauling the regulator rope; watches the flour burst, then laughs. */
const ROOFER = { x: 322, y: MILL.top + 1 };
function drawRoofer(ctx, lt, at) {
  let pose;
  if (lt < PUFF_T - 0.1) {
    const h = Math.sin(lt * Math.PI * 2); // hand over hand, one pull per beat pair
    pose = { dir: 1, armNear: [2.55 + 0.35 * h, 0.35], armFar: [2.55 - 0.35 * h, 0.35], lean: 0.08, shock: false, dx: 0 };
  } else if (lt < PUFF_T + 0.9) {
    pose = { dir: 1, armNear: [1.3, 0.2], armFar: [0.4, -0.6], lean: 0.28, shock: true, dx: 0 };
  } else {
    const shake = Math.sin(at * 30) * 0.6;
    pose = { dir: 1, armNear: [0.55, -1.7], armFar: [0.5, -1.6], lean: -0.06, shock: false, shout: 0.8 + 0.5 * Math.abs(Math.sin(at * 12)), dx: shake };
  }
  // the rope runs from his hands over the roof edge down to the reed-mat regulator
  const hands = handPos(ROOFER.x + pose.dx, ROOFER.y, 0.62, pose);
  ctx.save();
  ctx.strokeStyle = '#7a5a2a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(hands.x, hands.y);
  const slack = lt < PUFF_T - 0.1 ? 0 : 5;
  ctx.quadraticCurveTo(ROOFER.x + 26, ROOFER.y - 2 + slack, ROOFER.x + 30, ROOFER.y + 4);
  ctx.lineTo(ROOFER.x + 32, MILL.beamY - 2);
  ctx.stroke();
  ctx.restore();
  drawPerson(ctx, ROOFER.x + pose.dx, ROOFER.y, 0.62, {
    ...pose,
    robe: C.turq,
    under: C.carmine,
    sash: C.gold,
    turban: '#d65a3c',
    beard: C.skin,
    cap: C.lapis,
  });
}

/** Approximate near-hand position of drawPerson (for ropes). */
function handPos(x, y, s, o) {
  const dir = o.dir || 1;
  const lean = o.lean || 0;
  const [a1, a2] = o.armNear;
  let hx = 5 + Math.sin(a1) * 18 + Math.sin(a1 + a2) * 18;
  let hy = -68 + Math.cos(a1) * 18 + Math.cos(a1 + a2) * 18;
  const c = Math.cos(lean);
  const sn = Math.sin(lean);
  const rx = hx * c - hy * sn;
  const ry = hx * sn + hy * c;
  return { x: x + rx * s * dir, y: y + ry * s };
}

/** Moving glints on the silver water. */
function drawStreamGlints(ctx, at) {
  ctx.save();
  ctx.strokeStyle = 'rgba(232,238,244,0.8)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let k = 0; k < 16; k++) {
    const span = 900;
    const x = 70 + ((k * 61 + at * 18) % span);
    const f = 0.25 + 0.5 * K.hash11(k * 3.7);
    const y = lerp(streamTop(x), streamBot(x), f);
    const L = 6 + 6 * K.hash11(k);
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + L * 0.5, y - 3, x + L, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** A pair of ducks drifting down the silver stream. */
function drawDucks(ctx, lt, at) {
  const lc = clamp(lt, -10, 18);
  for (let k = 0; k < 2; k++) {
    const x = 560 + lc * 7 + k * 40;
    const y = (streamTop(x) + streamBot(x)) / 2 + 4 + Math.sin(at * 2.6 + k * 1.7) * 1.2 + k * 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.5, 1.5);
    // wake
    ctx.strokeStyle = 'rgba(205,214,222,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.lineTo(-30, -2);
    ctx.moveTo(-14, 3);
    ctx.lineTo(-30, 7);
    ctx.stroke();
    // body
    ctx.fillStyle = k === 0 ? '#f3ecdc' : '#c9a46a';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-15, -1);
    ctx.quadraticCurveTo(-14, -9, -2, -8);
    ctx.quadraticCurveTo(8, -8, 10, -3);
    ctx.quadraticCurveTo(8, 4, -6, 4);
    ctx.quadraticCurveTo(-14, 4, -15, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // wing
    ctx.fillStyle = k === 0 ? '#b8bfc4' : '#8a6738';
    ctx.beginPath();
    ctx.ellipse(-4, -3, 7, 3, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.lapis;
    ctx.fillRect(-6, -2.5, 4, 1.6);
    // neck & head
    ctx.fillStyle = k === 0 ? '#2e6b4c' : '#7a5530';
    ctx.beginPath();
    ctx.arc(9, -10 + Math.sin(at * 1.3 + k) * 0.8, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(7, -9, 4, 6);
    ctx.fillStyle = '#e8a33a';
    ctx.beginPath();
    ctx.moveTo(12, -10);
    ctx.lineTo(17, -9);
    ctx.lineTo(12, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(9.5, -11.5, 1.2, 1.2);
    ctx.restore();
  }
}

// --- story state --------------------------------------------------------------
const PUFF_T = 4.5;
const RUMBLE_T = 4.0;
const DONKEY_GO = 4.85;
const DONKEY_V = 190;
const DPATH = [
  { x: DONKEY.x, y: DONKEY.y },
  { x: 300, y: 716 },
  { x: 884, y: 716 },
];
const DPATH_LEN = Math.hypot(DPATH[1].x - DPATH[0].x, DPATH[1].y - DPATH[0].y) + (DPATH[2].x - DPATH[1].x);

function donkeyState(lt) {
  if (lt < DONKEY_GO) {
    const startle = sstep(PUFF_T + 0.05, PUFF_T + 0.25, lt);
    return {
      x: DONKEY.x,
      y: DONKEY.y,
      head: startle,
      trot: 0,
      phase: 0,
      dist: 0,
      earFlick: Math.max(0, Math.sin(lt * 3.1)) > 0.97 ? 0.4 : 0,
      bray: 0,
      t: lt,
    };
  }
  const tt = lt - DONKEY_GO;
  const ramp = 0.4;
  let d = tt < ramp ? (0.5 * DONKEY_V * tt * tt) / ramp : DONKEY_V * (ramp / 2 + (tt - ramp));
  const soft = 70;
  const lim = DPATH_LEN;
  let speedF = 1;
  if (d > lim - soft) {
    const over = d - (lim - soft);
    d = lim - soft + soft * (1 - Math.exp(-over / soft));
    speedF = Math.exp(-over / soft);
  }
  if (tt < ramp) speedF = tt / ramp;
  const l1 = Math.hypot(DPATH[1].x - DPATH[0].x, DPATH[1].y - DPATH[0].y);
  let x;
  let y;
  if (d < l1) {
    x = lerp(DPATH[0].x, DPATH[1].x, d / l1);
    y = lerp(DPATH[0].y, DPATH[1].y, d / l1);
  } else {
    x = DPATH[1].x + (d - l1);
    y = DPATH[1].y;
  }
  const stopped = speedF < 0.08;
  return {
    x,
    y,
    head: 0.85,
    trot: clamp(speedF * 1.4, 0, 1),
    phase: d / 15,
    dist: d,
    earFlick: 0,
    bray: stopped ? 0.5 + 0.5 * Math.sin(lt * 9) : 0,
    t: lt,
  };
}

function millerPose(lt) {
  const flour = sstep(PUFF_T + 0.12, PUFF_T + 0.4, lt);
  if (lt < PUFF_T) {
    // waiting by the door, gesturing up at the turning sails
    const g = Math.sin(lt * Math.PI) * 0.1;
    return {
      dir: -1,
      flour: 0,
      armNear: [2.3 + g, 0.5],
      armFar: [0.25, -0.2],
      lean: 0,
      shock: lt > RUMBLE_T,
      dx: 0,
    };
  }
  if (lt < PUFF_T + 1.0) {
    const k = sstep(PUFF_T, PUFF_T + 0.2, lt);
    return {
      dir: -1,
      flour,
      armNear: [lerp(2.3, 2.9, k), lerp(0.5, 0.3, k)],
      armFar: [lerp(0.25, 2.7, k), 0.2],
      lean: -0.12 * k,
      shock: true,
      dx: -4 * k,
    };
  }
  if (lt < PUFF_T + 1.45) {
    // ...a-a-a-CHOO: leans back, then snaps forward
    const k = sstep(PUFF_T + 1.0, PUFF_T + 1.3, lt);
    const snap = sstep(PUFF_T + 1.3, PUFF_T + 1.38, lt);
    return {
      dir: -1,
      flour: 1,
      armNear: [lerp(2.9, 1.2, k), lerp(0.3, 1.4, k)],
      armFar: [lerp(2.7, 0.9, k), 1.2],
      lean: lerp(-0.12, -0.2, k) + snap * 0.36,
      shock: k < 0.5,
      shout: snap * 1.2,
      dx: -4,
    };
  }
  // turns to shout after the runaway donkey: points with one hand, shakes a fist on the beat
  const fist = Math.abs(Math.sin((lt - PUFF_T) * Math.PI * 2));
  return {
    dir: 1,
    flour: 1,
    armNear: [1.75, 0.1 + 0.08 * fist],
    armFar: [3.05 - 0.22 * fist, 0.35],
    lean: 0.06,
    shock: true,
    shout: 0.6 + 0.8 * fist,
    dx: -4,
  };
}

/** Sneeze puff and flour sifting off the miller's robe. */
function drawFlourAfter(ctx, lt, mx, my) {
  const t = lt - (PUFF_T + 1.33);
  ctx.save();
  if (t > 0 && t < 1.2) {
    const k = sstep(0, 0.25, t);
    const fade = 1 - sstep(0.4, 1.2, t);
    ctx.globalAlpha = fade;
    ctx.fillStyle = C.flour;
    ctx.strokeStyle = 'rgba(190,150,70,0.9)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = -0.5 + (i - 2.5) * 0.35;
      const r = 6 + 22 * k * (0.7 + 0.3 * K.hash11(i));
      const x = mx - 22 - Math.cos(a) * r - t * 10;
      const y = my - 118 + Math.sin(a) * r * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, 4 + 5 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  // flour still sifting off his robe through bar 4
  if (lt > PUFF_T + 0.6) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(250,246,236,0.9)';
    for (let i = 0; i < 12; i++) {
      const ph = (lt * 0.9 + K.hash11(i * 7.1)) % 1;
      const x = mx - 16 + K.hash11(i * 2.3) * 34 + ph * 6;
      const y = my - 100 + K.hash11(i * 4.9) * 60 + ph * 70;
      ctx.globalAlpha = 0.9 * (1 - ph);
      ctx.fillRect(x, y, 1.8, 1.8);
    }
  }
  ctx.restore();
}

function drawFlourPuff(ctx, lt) {
  const t = lt - PUFF_T;
  if (t < -0.02 || t > 1.85) return;
  const dx = DOOR1.x + 16;
  const dy = DOOR1.y - 46;
  const grow = sstep(0, 0.35, t);
  const fade = 1 - sstep(0.6, 1.8, t);
  const drift = t * 26;
  ctx.save();
  ctx.globalAlpha = fade;
  // main billow: lobed chi-cloud puff rolling out of the door toward the miller
  const cx = lerp(dx, MILLER.x - 4, sstep(0, 0.45, t)) + drift * 0.6;
  const cy = lerp(dy, MILLER.y - 82, sstep(0, 0.45, t)) - t * 8;
  const R = lerp(10, 68, grow) * (1 + 0.1 * t);
  const lobes = 9;
  ctx.fillStyle = C.flour;
  ctx.strokeStyle = 'rgba(184,150,80,0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k < lobes; k++) {
    const a = (k / lobes) * Math.PI * 2 + t * 0.6;
    const rr = R * (0.62 + 0.18 * Math.sin(k * 2.3));
    const lx = cx + Math.cos(a) * rr;
    const ly = cy + Math.sin(a) * rr * 0.75;
    ctx.moveTo(lx + R * 0.42, ly);
    ctx.arc(lx, ly, R * 0.42, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, R * 0.75, R * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // gold spiral curls in the billow (chi-cloud convention)
  ctx.strokeStyle = 'rgba(190,150,70,0.85)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    const sx = cx + (k - 1) * R * 0.45;
    const sy = cy + (k % 2 ? -1 : 1) * R * 0.18;
    ctx.beginPath();
    for (let j = 0; j <= 20; j++) {
      const f = j / 20;
      const a = f * Math.PI * 2.2 + k;
      const rr = R * 0.22 * (1 - f * 0.8);
      const px = sx + Math.cos(a) * rr;
      const py = sy + Math.sin(a) * rr;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // trail from the door
  ctx.fillStyle = C.flour;
  for (let k = 0; k < 5; k++) {
    const f = k / 5;
    ctx.beginPath();
    ctx.arc(lerp(dx, cx, f), lerp(dy, cy, f) + 6, R * 0.3 * (0.5 + f), 0, Math.PI * 2);
    ctx.fill();
  }
  // specks drifting downwind
  for (let k = 0; k < 22; k++) {
    const f = K.hash11(k * 1.7);
    const sp = 30 + 60 * K.hash11(k * 3.1);
    const px = cx + (f - 0.4) * R * 1.6 + t * sp;
    const py = cy + (K.hash11(k * 5.3) - 0.5) * R * 1.2 - t * 10 + Math.sin(t * 3 + k) * 4;
    ctx.globalAlpha = fade * (0.9 - 0.5 * K.hash11(k));
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + 1.6 * K.hash11(k * 9.1), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// -----------------------------------------------------------------------------
// main render
// -----------------------------------------------------------------------------
const RIDER_STYLE = {
  plumage: '#fbf8ef',
  plumageShade: '#e9e0cb',
  mask: '#141110',
  bill: '#1b1613',
  eyeRing: '#e2b13f',
  legs: '#2b221c',
  crest: '#e9b94c',
  breast: '#ecbd5c',
  frame: '#c4462c',
  frameShade: '#8d2f20',
  metal: '#4c3c2e',
  tire: '#2b1d14',
  rim: '#d8ab45',
  saddle: '#163a7c',
  outline: '#9e7421',
  outlineWidth: 1.1,
  shading: true,
  spokes: 10,
};

export function render(kit, slot, scene, params) {
  K = kit;
  const { ctx } = slot;
  const { t, rawLocalT, isThumbnail } = params;
  const lt = isThumbnail ? 2.2 : rawLocalT;
  const at = t;
  ctx.save();

  const sky = kit.bake('persia_sky', P, 600, (g, rng) => paintSky(g, rng));
  ctx.drawImage(sky, 0, 0);

  // drifting chi clouds (behind the skyline)
  const clouds = [
    { key: 'persia_cloud_a', len: 230, th: 15, fill: '#f6f1e4', line: C.gold, seed: 0.4, flip: 1, x: 330, y: 104, v: 5 },
    { key: 'persia_cloud_b', len: 170, th: 12, fill: '#f6f1e4', line: '#7f9fd0', seed: 2.1, flip: -1, x: 640, y: 120, v: 3.5 },
    { key: 'persia_cloud_c', len: 150, th: 12, fill: C.goldLight, line: C.goldDeep, seed: 1.2, flip: 1, x: 860, y: 176, v: 4.2 },
    { key: 'persia_cloud_d', len: 120, th: 10, fill: '#f6f1e4', line: C.gold, seed: 3.3, flip: -1, x: 520, y: 220, v: 2.6 },
    { key: 'persia_cloud_e', len: 110, th: 10, fill: '#cfe0f2', line: '#f6f1e4', seed: 0.9, flip: 1, x: 120, y: 214, v: 3.0 },
  ];
  const lclamp = clamp(lt, -10, 18);
  for (const c of clouds) {
    const spr = cloudSprite(c.key, c.len, c.th, c.fill, c.line, c.seed, c.flip);
    ctx.drawImage(spr, Math.round(c.x + c.v * lclamp - spr.width / 2), Math.round(c.y - spr.height / 2));
  }
  drawBirds(ctx, at);

  const scn = kit.bake('persia_scene', P, P, (g, rng) => paintScene(g, rng));
  ctx.drawImage(scn, 0, 0);

  drawDistantRotors(ctx, at);

  // rotors in the main row (behind the shield walls)
  for (let i = 0; i < MILL.n; i++) {
    const o = opening(i);
    const rumble = i === 0 && lt > RUMBLE_T && lt < PUFF_T ? Math.sin(at * 70) * 0.6 : 0;
    drawRotor(ctx, o.cx + rumble, MILL.rotTop, MILL.rotBot, ROT_R, at * ROT_SPEED + ROT_PHASE[i], 1, MILL.beamY + 4, MILL.floorTop - 4);
  }
  const front = kit.bake('persia_front', FRONT_BOX.w, FRONT_BOX.h, (g, rng) => paintMillFront(g, rng));
  ctx.drawImage(front, FRONT_BOX.x, FRONT_BOX.y);
  drawPennant(ctx, at);
  drawRoofer(ctx, lt, at);
  drawMillstone(ctx, at, false);

  // door rumble before the burst (bar 3, beat 1)
  if (lt > RUMBLE_T && lt < PUFF_T + 0.1) {
    const k = sstep(RUMBLE_T, PUFF_T, lt);
    ctx.fillStyle = 'rgba(250,247,240,0.9)';
    for (let i = 0; i < 6; i++) {
      const f = (lt * 3 + i / 6) % 1;
      ctx.beginPath();
      ctx.arc(DOOR1.x - 22 + i * 9 + Math.sin(at * 40 + i) * 1.5, DOOR1.y - 92 + f * 76, 1.4 + k * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const fg = kit.bake('persia_fg', P, P - FG_Y, (g, rng, w, h) => paintForeground(g, rng, w, h));
  ctx.drawImage(fg, 0, FG_Y);
  drawStreamGlints(ctx, at);
  drawDucks(ctx, lt, at);

  // the miller and his donkey
  const mp = millerPose(lt);
  drawPerson(ctx, MILLER.x + mp.dx + (mp.flour > 0.9 && lt < PUFF_T + 1.6 ? Math.sin(at * 40) * 0.8 : 0), MILLER.y, 1.45, {
    ...mp,
    robe: C.vermilion,
    under: C.lapis,
    sash: C.turq,
    turban: C.white,
    beard: '#2a1d18',
    cap: C.vermilion,
  });
  drawFlourPuff(ctx, lt);
  drawFlourAfter(ctx, lt, MILLER.x, MILLER.y);
  const ds = donkeyState(lt);
  drawDonkey(ctx, ds.x, ds.y, 1.3, ds);

  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params);
    const pin = { ...(scene.pinwheel || { type: 'panemone' }), stroke: '#6e4a1c' };
    // miniature contour: a dark ink line under a fine gold hairline
    kit.drawRider(ctx, rig, { ...RIDER_STYLE, outline: '#3a2414', outlineWidth: 2.3, pinwheel: { ...pin, stroke: '#3a2414', lineWidth: 2.4 } });
    kit.drawRider(ctx, rig, { ...RIDER_STYLE, pinwheel: pin });
  }
  ctx.restore();
}
