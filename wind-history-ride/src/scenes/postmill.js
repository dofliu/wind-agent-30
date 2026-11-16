// src/scenes/postmill.js
// #03 1185 · 歐洲柱式風車 — the medieval POST MILL, painted as a leaf of a Gothic
// illuminated manuscript: vellum with ruling and prickings, a gold-leaf champ initial
// "M", rubric + four lines of blackletter Latin, a framed miniature on a lapis /
// vermilion diaper ground, bar-and-ivy borders, and drolleries in the bas-de-page.
//
// Machine (historically): a wooden box body (the "buck") with a pitched roof, balanced on
// ONE massive upright post. The post stands on a trestle: two crossed horizontal
// crosstrees on stone piers and four diagonal quarterbars. The WHOLE buck turns on the
// post to face the wind, pushed round by a long TAILPOLE at the back (the ladder to the
// rear door rides with it). Four common sails — wooden lattice frames spread with cloth —
// sit on the windshaft at the front. Earliest secure record: Weedley, Yorkshire, 1185.
//
// The rider rides along the bottom bar-border of the miniature, like one more marginal
// creature.
//
// Story (4 bars):
//   bar 1  the monk-scribe in the margin looks up from his book at the passing bird;
//   bar 2  the snail-knight in the bas-de-page stops mid-duel, gapes up at the spoonbill
//          and a speech scroll unrolls: "ecce alia bestia" (behold — another beast);
//   bar 3  the wind-head blows from the right; the miller throws his weight on the
//          tailpole and swings the whole mill round into the wind; a marginal hybrid
//          trumpets on the beats;
//   bar 4  the sails catch the wind and start to turn; the knight shrugs and goes back
//          to fighting his snail.

const P = 1000;
const ROAD_Y = 700;
const DEG = Math.PI / 180;
let K = null;

const C = {
  vellum: '#f2e6c9',
  vellumDeep: '#e3cfa2',
  ink: '#2a1c12',
  brownInk: '#5a3b22',
  lapis: '#1f3f8f',
  lapisLight: '#3d64b8',
  lapisPale: '#9db2e0',
  lapisDeep: '#142a66',
  verm: '#b32d2a',
  vermLight: '#d4553c',
  rose: '#cf7c74',
  roseLight: '#eab0a2',
  gold: '#c99a2e',
  goldLight: '#f1d47a',
  goldPale: '#fff4c4',
  goldDeep: '#8a6316',
  green: '#2f6b3a',
  greenLight: '#5d9a4b',
  greenPale: '#9cc47a',
  greenDeep: '#1d4626',
  white: '#fbf7ec',
  skin: '#f3dcc4',
  cheek: '#e2988a',
  wood: '#c08f55',
  woodLight: '#ddb57c',
  woodDark: '#86592f',
  woodDeep: '#4e3219',
  roof: '#b5473a',
  roofLight: '#d26e57',
  roofDark: '#7f2e25',
  cloth: '#f5edd8',
  clothShade: '#d9cba6',
  mail: '#8f949b',
  mailDark: '#5c6169',
  mailLight: '#c8cbd0',
  donkey: '#8e877d',
  donkeyLight: '#d3cabb',
  donkeyDark: '#4d463f',
  sack: '#f0e6cb',
  sackShade: '#cdbd98',
  path: '#dcc28c',
  pathDeep: '#b89a5e',
  habit: '#3a302b',
  habitLight: '#6a5d55',
  black: '#17120e',
  stone: '#b7ad9c',
  stoneDark: '#7d7466',
};

// --- page layout -----------------------------------------------------------------
const TB = { x0: 106, x1: 894 }; // text block / miniature columns
const INIT = { x: 106, y: 78, s: 132 }; // champ initial box
const MIN = { x0: 106, y0: 256, x1: 894, y1: ROAD_Y }; // miniature outer frame
const PIC = { x0: 116, y0: 266, x1: 884, y1: ROAD_Y }; // painted field inside the frame
const BAR = { y0: ROAD_Y, y1: 718 }; // the bar-border the bicycle rides on
const LBAR_X = 72; // vertical bar-border in the left margin

// --- mill geometry (world units = px) -----------------------------------------------
const MX = 322; // post axis x
const MY = 652; // crosstree level y (screen)
const ES = 0.26; // sin(elevation): ground plane foreshortening
const EC = 0.966;
const BUCK = { A: 43, D: 58, h0: 120, h1: 242, h2: 286 }; // half-width, half-depth, floor, eaves, ridge
const SHAFT_H = 222; // windshaft height
const SAIL = { r0: 30, r1: 188, lead: -8, trail: 45, bars: 10 };
const TAIL = { reach: 160, endH: 52 }; // tailpole reach behind the post, end height
const LADDER = { reach: 82, w: 11 };
const YAW0 = 205 * DEG; // turned away from the wind (sails behind the buck)
const YAW1 = 37 * DEG; // facing the wind-head, front three-quarter to the viewer
const TURN0 = 4.05;
const TURN1 = 5.75;
const SPIN0 = 5.55;

// --- drollery placement ------------------------------------------------------------
const MONK = { x: 150, y: 936, s: 1.22 };
const KNIGHT = { x: 380, y: 936, s: 1.28 };
const SNAIL = { x: 560, y: 936, s: 1.25 };
const HYBRID = { x: 846, y: 858, s: 1.2 };
const WINDHEAD = { x: 790, y: 340, s: 1.35 };

// gold spots for sparkles (filled by the layout below, deterministic)
const GOLD_SPOTS = [];

// =============================================================================
// small helpers
// =============================================================================
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

function goldGrad(g, x0, y0, x1, y1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, C.goldDeep);
  gr.addColorStop(0.25, C.gold);
  gr.addColorStop(0.44, C.goldLight);
  gr.addColorStop(0.52, C.goldPale);
  gr.addColorStop(0.62, C.goldLight);
  gr.addColorStop(0.82, C.gold);
  gr.addColorStop(1, C.goldDeep);
  return gr;
}

function inkStroke(g, w = 1.4, col = C.ink) {
  g.strokeStyle = col;
  g.lineWidth = w;
  g.stroke();
}

function fillInk(g, fill, w = 1.4, col = C.ink) {
  g.fillStyle = fill;
  g.fill();
  if (w > 0) inkStroke(g, w, col);
}

function circle(g, x, y, r) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
}

/** Trilobed ivy leaf: stem at (x,y), pointing along `ang`. */
function ivyPath(g, x, y, s, ang) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const T = (u, v) => [x + u * ca - v * sa, y + u * sa + v * ca];
  g.beginPath();
  g.moveTo(...T(0, 0));
  g.quadraticCurveTo(...T(0.05 * s, -0.55 * s), ...T(0.45 * s, -0.62 * s));
  g.quadraticCurveTo(...T(0.42 * s, -0.3 * s), ...T(0.55 * s, -0.22 * s));
  g.quadraticCurveTo(...T(0.8 * s, -0.32 * s), ...T(1.05 * s, 0));
  g.quadraticCurveTo(...T(0.8 * s, 0.32 * s), ...T(0.55 * s, 0.22 * s));
  g.quadraticCurveTo(...T(0.42 * s, 0.3 * s), ...T(0.45 * s, 0.62 * s));
  g.quadraticCurveTo(...T(0.05 * s, 0.55 * s), ...T(0, 0));
  g.closePath();
}

function ivyLeaf(g, x, y, s, ang, kind) {
  ivyPath(g, x, y, s, ang);
  if (kind === 'gold') {
    g.fillStyle = goldGrad(g, x - s, y - s, x + s, y + s);
    g.fill();
    inkStroke(g, 1.1);
    GOLD_SPOTS.push([x + Math.cos(ang) * s * 0.5, y + Math.sin(ang) * s * 0.5, s * 0.5]);
  } else {
    g.fillStyle = kind === 'lapis' ? C.lapis : kind === 'verm' ? C.verm : C.green;
    g.fill();
    inkStroke(g, 1.1);
    // white-lead vein
    g.strokeStyle = 'rgba(251,247,236,0.85)';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(x + Math.cos(ang) * s * 0.18, y + Math.sin(ang) * s * 0.18);
    g.lineTo(x + Math.cos(ang) * s * 0.8, y + Math.sin(ang) * s * 0.8);
    g.stroke();
  }
}

/** Thin ink tendril along a cubic, with ivy leaves sprouting from it. */
function tendril(g, p0, p1, p2, p3, leaves, rng, size = 13) {
  const pts = K.sampleCubic(p0, p1, p2, p3, 30);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.3;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) g.lineTo(p.x, p.y);
  g.stroke();
  const kinds = ['gold', 'lapis', 'gold', 'verm'];
  for (let i = 0; i < leaves; i++) {
    const u = (i + 0.7) / (leaves + 0.2);
    const k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
    const a = pts[k];
    const b = pts[k + 1];
    const tang = Math.atan2(b.y - a.y, b.x - a.x);
    const side = i % 2 === 0 ? 1 : -1;
    const ang = tang + side * (0.9 + rng() * 0.4);
    const sx = a.x + Math.cos(ang) * 6;
    const sy = a.y + Math.sin(ang) * 6;
    g.strokeStyle = C.ink;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(sx, sy);
    g.stroke();
    ivyLeaf(g, sx, sy, size * (0.8 + rng() * 0.35), ang, kinds[(i + Math.floor(rng() * 4)) % 4]);
  }
  // curl at the end
  const e = pts[pts.length - 1];
  const pe = pts[pts.length - 3];
  const ta = Math.atan2(e.y - pe.y, e.x - pe.x);
  g.beginPath();
  for (let k = 0; k <= 14; k++) {
    const a = ta + (k / 14) * Math.PI * 1.6;
    const r = 6 * (1 - k / 18);
    const cx = e.x + Math.cos(ta + Math.PI / 2) * 6;
    const cy = e.y + Math.sin(ta + Math.PI / 2) * 6;
    const x = cx + Math.cos(a - Math.PI / 2) * r;
    const y = cy + Math.sin(a - Math.PI / 2) * r;
    if (k === 0) g.moveTo(e.x, e.y);
    g.lineTo(x, y);
  }
  g.stroke();
}

function goldBoss(g, x, y, r) {
  // gold quatrefoil boss
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    g.moveTo(x + Math.cos(a) * r * 0.48 + r * 0.5, y + Math.sin(a) * r * 0.48);
    g.arc(x + Math.cos(a) * r * 0.48, y + Math.sin(a) * r * 0.48, r * 0.5, 0, Math.PI * 2);
  }
  g.fillStyle = goldGrad(g, x - r, y - r, x + r, y + r);
  g.fill();
  inkStroke(g, 1.1);
  circle(g, x, y, r * 0.28);
  g.fillStyle = C.verm;
  g.fill();
  inkStroke(g, 0.8);
  GOLD_SPOTS.push([x, y, r]);
}

// =============================================================================
// BAKE: the vellum leaf (text, initial, borders, miniature ground)
// =============================================================================
function paintVellum(g, rng) {
  g.fillStyle = C.vellum;
  g.fillRect(0, 0, P, P);
  K.addBlotches(g, P, P, rng, 'rgba(172,128,62,0.07)', 26, 80, 260);
  K.addBlotches(g, P, P, rng, 'rgba(255,251,236,0.16)', 22, 50, 170);
  K.addBlotches(g, P, P, rng, 'rgba(150,108,52,0.06)', 40, 10, 40);
  // hair-follicle specks of calf skin
  for (let i = 0; i < 2600; i++) {
    const x = rng() * P;
    const y = rng() * P;
    g.fillStyle = `rgba(110,78,40,${0.06 + rng() * 0.14})`;
    g.fillRect(x, y, 0.8 + rng() * 0.9, 0.8 + rng() * 0.9);
  }
  // faint skin fibres
  g.strokeStyle = 'rgba(160,120,70,0.06)';
  g.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const x = rng() * P;
    const y = rng() * P;
    const a = -0.4 + rng() * 0.8;
    const l = 30 + rng() * 90;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + 6, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // warm, handled edges
  K.vignette(g, P, P, 0.26, '120,82,36');
}

function paintRuling(g) {
  // drypoint / plummet ruling: double bounding lines + text lines
  g.strokeStyle = 'rgba(150,100,60,0.22)';
  g.lineWidth = 0.8;
  g.beginPath();
  for (const x of [TB.x0 - 8, TB.x0, TB.x1, TB.x1 + 8]) {
    g.moveTo(x, 36);
    g.lineTo(x, 972);
  }
  for (const y of [64, 114, 156, 198, 240]) {
    g.moveTo(30, y);
    g.lineTo(970, y);
  }
  g.stroke();
  // prickings in the outer margin
  g.fillStyle = 'rgba(70,45,25,0.45)';
  for (const y of [64, 114, 156, 198, 240, 760, 820, 880, 940]) {
    circle(g, 958, y, 1.1);
    g.fill();
  }
}

function blackletter(px) {
  return `${px}px ${K.FONT.blackletter}`;
}

function paintText(g) {
  g.textBaseline = 'alphabetic';
  // rubric (red)
  g.font = blackletter(23);
  g.fillStyle = C.verm;
  g.fillText('Incipit de molendino ad ventum · anno domini m·c·lxxx·v·', TB.x0 + 2, 64);

  // folio number
  g.font = blackletter(20);
  g.fillStyle = C.brownInk;
  g.textAlign = 'right';
  g.fillText('fo. iij', 944, 46);
  g.textAlign = 'left';

  const x1 = INIT.x + INIT.s + 16;
  // display letters after the initial, touched with yellow
  g.font = blackletter(33);
  const disp = 'olendinum';
  const dw = g.measureText(disp).width;
  // each display letter "touched" with a stroke of yellow
  let lx = x1;
  for (const ch of disp) {
    const cw = g.measureText(ch).width;
    g.fillStyle = 'rgba(232,192,80,0.6)';
    g.fillRect(lx + cw * 0.32, 96, Math.max(2.5, cw * 0.36), 20);
    lx += cw;
  }
  g.fillStyle = C.ink;
  g.fillText(disp, x1, 114);
  g.font = blackletter(32);
  g.fillText(' ventriticum apud Wedelai,', x1 + dw, 114);
  g.fillText('ubi ventus de mari flat super colles;', x1, 156);
  const l3 = 'spiritus enim ubi vult spirat.';
  g.fillText(l3, x1, 198);
  const w3 = g.measureText(l3).width;
  // line-filler: red & blue zigzag with gold dots
  let fx = x1 + w3 + 14;
  g.lineWidth = 2;
  let k = 0;
  while (fx < TB.x1 - 16) {
    g.strokeStyle = k % 2 ? C.lapis : C.verm;
    g.beginPath();
    g.moveTo(fx, 188);
    g.lineTo(fx + 8, 180);
    g.lineTo(fx + 16, 188);
    g.stroke();
    circle(g, fx + 8, 192, 1.6);
    g.fillStyle = C.gold;
    g.fill();
    fx += 16;
    k++;
  }
  // full-width line: what the picture shows
  g.font = blackletter(32);
  g.fillStyle = C.ink;
  g.fillText('Molitor trahit caudam, et tota domus vertitur ad ventum.', TB.x0 + 26, 240);
  // paragraph mark (blue paraph) before it
  g.fillStyle = C.lapis;
  g.font = `700 32px ${K.FONT.garamond}`;
  g.fillText('¶', TB.x0 + 2, 240);
}

/** Lombardic champ initial "M": gold letter on a quartered lapis / rose ground. */
function paintInitial(g, rng) {
  const { x, y, s } = INIT;
  // ground: lapis outer, rose inner panel
  g.fillStyle = C.lapis;
  g.fillRect(x, y, s, s);
  g.fillStyle = C.rose;
  g.fillRect(x + 12, y + 12, s - 24, s - 24);
  // white filigree on the lapis
  g.strokeStyle = 'rgba(251,247,236,0.9)';
  g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const along = i % 2 === 0;
    for (let k = 0; k < 9; k++) {
      const u = 8 + k * 14.5;
      let cx;
      let cy;
      if (i === 0) [cx, cy] = [x + u, y + 6];
      if (i === 1) [cx, cy] = [x + s - 6, y + u];
      if (i === 2) [cx, cy] = [x + u, y + s - 6];
      if (i === 3) [cx, cy] = [x + 6, y + u];
      circle(g, cx, cy, 2.2);
      g.stroke();
      g.fillStyle = 'rgba(251,247,236,0.9)';
      circle(g, cx + (along ? 7 : 0), cy + (along ? 0 : 7), 0.9);
      g.fill();
    }
  }
  // foliate scrolls in the rose panel (darker rose + white)
  g.save();
  g.beginPath();
  g.rect(x + 12, y + 12, s - 24, s - 24);
  g.clip();
  g.strokeStyle = '#a9524c';
  g.lineWidth = 2.2;
  for (let i = 0; i < 4; i++) {
    const cx = x + 30 + (i % 2) * 72;
    const cy = y + 30 + Math.floor(i / 2) * 72;
    g.beginPath();
    for (let k = 0; k <= 40; k++) {
      const a = k * 0.32;
      const r = 3 + k * 0.55;
      const px = cx + Math.cos(a + i) * r;
      const py = cy + Math.sin(a + i) * r;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
  }
  g.strokeStyle = 'rgba(251,247,236,0.85)';
  g.lineWidth = 0.9;
  for (let i = 0; i < 4; i++) {
    const cx = x + 30 + (i % 2) * 72;
    const cy = y + 30 + Math.floor(i / 2) * 72;
    g.beginPath();
    for (let k = 0; k <= 40; k++) {
      const a = k * 0.32;
      const r = 3 + k * 0.55;
      const px = cx + Math.cos(a + i) * r - 1;
      const py = cy + Math.sin(a + i) * r - 1;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
  }
  g.restore();
  g.strokeStyle = C.ink;
  g.lineWidth = 1.6;
  g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  g.lineWidth = 1;
  g.strokeRect(x + 12, y + 12, s - 24, s - 24);

  // the Lombardic M: closed left bowl, central stem, open right bowl with a curled foot
  const cx = x + s / 2;
  const top = y + 24;
  const bot = y + s - 22;
  const L = (path) => {
    g.fillStyle = goldGrad(g, x + 10, y + 10, x + s - 10, y + s - 10);
    g.fill(path);
    g.strokeStyle = C.ink;
    g.lineWidth = 1.8;
    g.stroke(path);
  };
  const m = new Path2D();
  // left bowl: a thick "(" closed into an arch with the centre stem
  m.moveTo(cx - 6, top + 6);
  m.bezierCurveTo(cx - 30, top - 6, cx - 52, top + 10, cx - 52, top + 44);
  m.bezierCurveTo(cx - 52, bot - 22, cx - 44, bot - 2, cx - 30, bot);
  m.lineTo(cx - 40, bot + 2);
  m.lineTo(cx - 40, bot - 6);
  m.bezierCurveTo(cx - 36, bot - 18, cx - 36, top + 30, cx - 26, top + 20);
  m.bezierCurveTo(cx - 20, top + 14, cx - 12, top + 16, cx - 9, top + 22);
  m.closePath();
  // centre stem
  m.moveTo(cx - 8, top + 12);
  m.bezierCurveTo(cx - 4, top + 2, cx + 4, top + 2, cx + 8, top + 12);
  m.lineTo(cx + 6, bot - 4);
  m.lineTo(cx + 12, bot + 2);
  m.lineTo(cx - 12, bot + 2);
  m.lineTo(cx - 6, bot - 4);
  m.closePath();
  // right bowl ending in a curled foot
  m.moveTo(cx + 6, top + 10);
  m.bezierCurveTo(cx + 26, top - 8, cx + 54, top + 4, cx + 54, top + 40);
  m.bezierCurveTo(cx + 54, bot - 14, cx + 46, bot + 4, cx + 30, bot + 2);
  m.bezierCurveTo(cx + 22, bot + 1, cx + 20, bot - 10, cx + 28, bot - 12);
  m.bezierCurveTo(cx + 34, bot - 12, cx + 36, bot - 6, cx + 33, bot - 3);
  m.bezierCurveTo(cx + 42, bot - 14, cx + 41, top + 30, cx + 28, top + 20);
  m.bezierCurveTo(cx + 20, top + 14, cx + 14, top + 16, cx + 9, top + 24);
  m.closePath();
  L(m);
  // white highlights on the gold
  g.strokeStyle = 'rgba(255,252,236,0.9)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(cx - 46, top + 26);
  g.quadraticCurveTo(cx - 46, top + 6, cx - 28, top + 6);
  g.moveTo(cx + 26, top + 4);
  g.quadraticCurveTo(cx + 46, top + 6, cx + 48, top + 28);
  g.moveTo(cx - 3, top + 14);
  g.lineTo(cx - 2, bot - 10);
  g.stroke();
  // small punched dots on the letter
  g.fillStyle = 'rgba(110,70,10,0.55)';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI;
    circle(g, cx - 44 + Math.cos(a + Math.PI / 2) * 2, top + 32 + i * 3.4, 0.7);
    g.fill();
  }
  GOLD_SPOTS.push([cx - 44, top + 30, 10], [cx + 46, top + 34, 10], [cx, top + 50, 8], [cx - 30, bot - 4, 6]);

  // pen-flourished extension: the bar runs from the initial down the left margin
  g.fillStyle = C.ink;
}

/** Vertical bar-border in the left margin, joined to the initial and to the road bar. */
function paintLeftBar(g, rng) {
  const x = LBAR_X;
  const y0 = INIT.y + 30;
  const y1 = BAR.y0;
  // stub from the initial
  g.fillStyle = C.lapis;
  g.fillRect(x - 4, y0 - 4, INIT.x - x + 4, 8);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.1;
  g.strokeRect(x - 4, y0 - 4, INIT.x - x + 4, 8);
  // segmented bar
  const seg = 54;
  for (let y = y0; y < y1; y += seg) {
    const k = Math.round((y - y0) / seg);
    const yy = Math.min(y1, y + seg);
    g.fillStyle = k % 2 ? C.verm : C.lapis;
    g.fillRect(x - 4, y, 8, yy - y);
    g.strokeStyle = 'rgba(251,247,236,0.9)';
    g.lineWidth = 0.9;
    g.beginPath();
    for (let q = y + 3; q < yy - 3; q += 6) {
      g.moveTo(x - 1.5, q);
      g.lineTo(x + 1.5, q + 3);
    }
    g.stroke();
  }
  g.strokeStyle = C.ink;
  g.lineWidth = 1.2;
  g.strokeRect(x - 4, y0 - 4, 8, y1 - y0 + 4);
  // leaves sprouting outward (into the margin) and a few inward
  for (let y = y0 + 34; y < y1 - 20; y += 44) {
    const side = Math.round((y - y0) / 44) % 2 === 0 ? -1 : 1;
    if (side > 0 && y > MIN.y0 - 8) {
      // inside the miniature column: keep the frame clear, leaf points up-left instead
      tendril(g, { x: x - 4, y }, { x: x - 18, y: y - 6 }, { x: x - 30, y: y + 4 }, { x: x - 36, y: y + 18 }, 1, rng, 12);
      continue;
    }
    const sx = side < 0 ? x - 4 : x + 4;
    const ex = side < 0 ? x - 40 : x + 28;
    tendril(g, { x: sx, y }, { x: sx + side * 10, y: y - 14 }, { x: ex, y: y - 18 }, { x: ex + side * 4, y: y - 2 }, 2, rng, 12);
  }
  // knot bosses at the joins
  goldBoss(g, x, y0, 9);
  goldBoss(g, x, y1 + 9, 11);
  // spray into the top margin above the initial
  tendril(g, { x, y: y0 - 6 }, { x: x - 6, y: y0 - 34 }, { x: x + 20, y: 44 }, { x: x + 4, y: 40 }, 3, rng, 12);
}

/** Right-margin ivy vine and corner spray. */
function paintRightVine(g, rng) {
  const x = 930;
  tendril(g, { x: MIN.x1, y: MIN.y0 + 6 }, { x: x + 10, y: MIN.y0 - 30 }, { x: x + 20, y: 160 }, { x: x - 4, y: 96 }, 4, rng, 13);
  tendril(g, { x: MIN.x1, y: MIN.y0 + 6 }, { x: x + 26, y: 340 }, { x: x - 18, y: 500 }, { x: x + 8, y: 640 }, 6, rng, 13);
  tendril(g, { x: x + 8, y: 640 }, { x: x + 24, y: 668 }, { x: x + 4, y: 690 }, { x: MIN.x1 + 6, y: BAR.y0 - 2 }, 1, rng, 11);
}

/** The long bar-border at y = 700 — the bicycle road. */
function paintRoadBar(g, rng) {
  const y0 = BAR.y0;
  const y1 = BAR.y1;
  const seg = 66;
  for (let x = -20, k = 0; x < P + 20; x += seg, k++) {
    g.fillStyle = k % 2 ? C.verm : C.lapis;
    g.fillRect(x, y0, seg, y1 - y0);
    // white filigree: a running wave + dots
    g.strokeStyle = 'rgba(251,247,236,0.88)';
    g.lineWidth = 1;
    g.beginPath();
    for (let q = 0; q <= seg; q += 2) {
      const px = x + q;
      const py = (y0 + y1) / 2 + Math.sin((q / seg) * Math.PI * 4) * 3.2;
      if (q === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    g.fillStyle = 'rgba(251,247,236,0.9)';
    for (let q = 8; q < seg; q += 16) {
      circle(g, x + q, y0 + 3.5, 0.9);
      g.fill();
      circle(g, x + q + 8, y1 - 3.5, 0.9);
      g.fill();
    }
  }
  // gold edging
  g.fillStyle = goldGrad(g, 0, y0 - 2, 0, y0 + 3);
  g.fillRect(0, y0, P, 2.5);
  g.fillStyle = goldGrad(g, 0, y1 - 3, 0, y1 + 2);
  g.fillRect(0, y1 - 2.5, P, 2.5);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(0, y0 + 0.5);
  g.lineTo(P, y0 + 0.5);
  g.moveTo(0, y1);
  g.lineTo(P, y1);
  g.stroke();
  // bosses at the joins
  for (let x = -20 + seg, k = 1; x < P; x += seg, k++) {
    if (x < 30 || x > 970) continue;
    goldBoss(g, x, (y0 + y1) / 2, 7.5);
  }
}

/** Frame round the miniature (top + sides; the road bar is its foot). */
function paintMiniFrame(g) {
  const { x0, y0, x1, y1 } = MIN;
  // gold bar
  g.save();
  g.beginPath();
  g.rect(x0, y0, x1 - x0, y1 - y0);
  g.rect(PIC.x0, PIC.y0, PIC.x1 - PIC.x0, PIC.y1 - PIC.y0);
  g.fillStyle = goldGrad(g, x0, y0, x1, y1);
  g.fill('evenodd');
  g.restore();
  // inner lapis fillet with white dots
  g.fillStyle = C.lapis;
  g.fillRect(PIC.x0 - 3, PIC.y0 - 3, PIC.x1 - PIC.x0 + 6, 3);
  g.fillRect(PIC.x0 - 3, PIC.y0, 3, PIC.y1 - PIC.y0);
  g.fillRect(PIC.x1, PIC.y0, 3, PIC.y1 - PIC.y0);
  g.strokeStyle = C.ink;
  g.lineWidth = 1.4;
  g.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 + 4);
  g.lineWidth = 1;
  g.strokeRect(PIC.x0 - 3, PIC.y0 - 3, PIC.x1 - PIC.x0 + 6, PIC.y1 - PIC.y0 + 6);
  // punched dots along the gold bar
  g.fillStyle = 'rgba(105,70,12,0.5)';
  for (let x = x0 + 8; x < x1 - 4; x += 7) {
    circle(g, x, y0 + 5, 0.7);
    g.fill();
  }
  for (let y = y0 + 10; y < y1 - 4; y += 7) {
    circle(g, x0 + 5, y, 0.7);
    g.fill();
    circle(g, x1 - 5, y, 0.7);
    g.fill();
  }
  goldBoss(g, x0 + 2, y0 + 2, 13);
  goldBoss(g, x1 - 2, y0 + 2, 13);
  GOLD_SPOTS.push([(x0 + x1) / 2, y0 + 4, 6], [x0 + 4, (y0 + y1) / 2, 6], [x1 - 4, 420, 6]);
}

// ----- the miniature -----------------------------------------------------------------
function paintDiaper(g, rng) {
  const { x0, y0, x1, y1 } = PIC;
  g.save();
  g.beginPath();
  g.rect(x0, y0, x1 - x0, y1 - y0);
  g.clip();
  const D = 29; // half-diagonal of each lozenge
  for (let j = -1; j * D < y1 - y0 + D * 2; j++) {
    for (let i = -1; i * D < x1 - x0 + D * 2; i++) {
      if ((i + j) % 2 !== 0) continue;
      const cx = x0 + i * D;
      const cy = y0 + j * D;
      const red = Math.abs(i) % 2 === 1;
      g.beginPath();
      g.moveTo(cx, cy - D);
      g.lineTo(cx + D, cy);
      g.lineTo(cx, cy + D);
      g.lineTo(cx - D, cy);
      g.closePath();
      g.fillStyle = red ? C.verm : C.lapis;
      g.fill();
      // little white quatrefoil / cross
      g.fillStyle = 'rgba(251,247,236,0.9)';
      for (const [dx, dy] of [
        [0, -4],
        [4, 0],
        [0, 4],
        [-4, 0],
      ]) {
        circle(g, cx + dx, cy + dy, 1.5);
        g.fill();
      }
      g.fillStyle = red ? '#f0c86a' : '#f0c86a';
      circle(g, cx, cy, 1.4);
      g.fill();
      // inner fillet
      g.strokeStyle = red ? 'rgba(255,214,200,0.35)' : 'rgba(170,190,240,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(cx, cy - D + 6);
      g.lineTo(cx + D - 6, cy);
      g.lineTo(cx, cy + D - 6);
      g.lineTo(cx - D + 6, cy);
      g.closePath();
      g.stroke();
    }
  }
  // gold lattice over the joins
  g.strokeStyle = C.gold;
  g.lineWidth = 1.6;
  g.beginPath();
  for (let k = -40; k < 80; k++) {
    const c = k * 2 * D;
    g.moveTo(x0 + c, y0);
    g.lineTo(x0 + c + 600, y0 + 600);
    g.moveTo(x0 + c, y0);
    g.lineTo(x0 + c - 600, y0 + 600);
  }
  g.stroke();
  g.strokeStyle = 'rgba(42,28,18,0.55)';
  g.lineWidth = 0.6;
  g.stroke();
  // gold dots at the crossings
  for (let j = -1; j * D < y1 - y0 + D; j++) {
    for (let i = -1; i * D < x1 - x0 + D; i++) {
      if ((i + j) % 2 === 0) continue;
      const cx = x0 + i * D;
      const cy = y0 + j * D;
      circle(g, cx, cy, 2.6);
      g.fillStyle = goldGrad(g, cx - 3, cy - 3, cx + 3, cy + 3);
      g.fill();
    }
  }
  // pigment mottling
  K.addBlotches(g, P, P, rng, 'rgba(10,15,40,0.10)', 30, 20, 70);
  K.addBlotches(g, P, P, rng, 'rgba(255,240,220,0.06)', 20, 20, 60);
  g.restore();
}

function hillPath(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p.length === 2) g.lineTo(p[0], p[1]);
    else g.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
  }
  g.closePath();
}

/** Rows of small arcs (stylised grass) clipped to the current path. */
function scallops(g, x0, x1, y0, y1, step, col, rng) {
  g.strokeStyle = col;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let y = y0, row = 0; y < y1; y += step * 0.8, row++) {
    for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step) {
      const jx = (rng() - 0.5) * 3;
      g.moveTo(x - step * 0.36 + jx, y);
      g.quadraticCurveTo(x + jx, y - step * 0.42, x + step * 0.36 + jx, y);
    }
  }
  g.stroke();
}

function flower(g, x, y, r, petal, centre) {
  g.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    circle(g, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75);
    g.fill();
  }
  circle(g, x, y, r * 0.6);
  g.fillStyle = centre;
  g.fill();
}

function gothicTree(g, x, y, h, rng, crownCol = C.green, lightCol = C.greenLight) {
  // trunk
  g.beginPath();
  g.moveTo(x - 5, y);
  g.bezierCurveTo(x - 4, y - h * 0.3, x - 7, y - h * 0.5, x - 3, y - h * 0.62);
  g.lineTo(x + 3, y - h * 0.62);
  g.bezierCurveTo(x + 6, y - h * 0.5, x + 4, y - h * 0.3, x + 6, y);
  g.closePath();
  fillInk(g, C.woodDark, 1.2);
  // branches
  g.strokeStyle = C.ink;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, y - h * 0.55);
  g.quadraticCurveTo(x - h * 0.12, y - h * 0.68, x - h * 0.2, y - h * 0.7);
  g.moveTo(x, y - h * 0.58);
  g.quadraticCurveTo(x + h * 0.12, y - h * 0.7, x + h * 0.2, y - h * 0.74);
  g.stroke();
  // crown of trefoil clumps
  const n = 9;
  const cy = y - h * 0.8;
  const R = h * 0.3;
  const clumps = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.3;
    const rr = i === 0 ? 0 : R * (0.45 + rng() * 0.45);
    clumps.push({ x: x + Math.cos(a) * rr * 1.1, y: cy + Math.sin(a) * rr * 0.85, r: R * (0.42 + rng() * 0.16) });
  }
  clumps.sort((a, b) => a.y - b.y);
  for (const c of clumps) {
    g.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 1.2;
      g.moveTo(c.x + Math.cos(a) * c.r * 0.45 + c.r * 0.55, c.y + Math.sin(a) * c.r * 0.45);
      g.arc(c.x + Math.cos(a) * c.r * 0.45, c.y + Math.sin(a) * c.r * 0.45, c.r * 0.55, 0, Math.PI * 2);
    }
    g.fillStyle = crownCol;
    g.fill();
    g.strokeStyle = C.ink;
    g.lineWidth = 1.1;
    g.stroke();
    g.strokeStyle = lightCol;
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(c.x - c.r * 0.1, c.y - c.r * 0.15, c.r * 0.45, Math.PI * 1.05, Math.PI * 1.6);
    g.stroke();
  }
}

/** Small Romanesque chapel on the far hill (west tower, round-arched door). */
function paintChapel(g, x, y) {
  const stone = '#ece0c4';
  const stoneSh = '#cdbd99';
  // nave
  g.beginPath();
  g.rect(x, y - 34, 52, 34);
  fillInk(g, stone, 1.3);
  // nave roof
  g.beginPath();
  g.moveTo(x - 4, y - 33);
  g.lineTo(x + 8, y - 52);
  g.lineTo(x + 58, y - 52);
  g.lineTo(x + 56, y - 33);
  g.closePath();
  fillInk(g, C.roof, 1.3);
  g.strokeStyle = 'rgba(70,20,14,0.6)';
  g.lineWidth = 0.9;
  g.beginPath();
  for (let k = 1; k < 9; k++) {
    g.moveTo(x - 4 + k * 6.6, y - 33);
    g.lineTo(x + 8 + k * 5.6, y - 52);
  }
  g.stroke();
  // apse at the east end
  g.beginPath();
  g.moveTo(x + 52, y);
  g.lineTo(x + 52, y - 26);
  g.quadraticCurveTo(x + 68, y - 26, x + 68, y - 12);
  g.lineTo(x + 68, y);
  g.closePath();
  fillInk(g, stoneSh, 1.2);
  // round-arched windows
  g.fillStyle = '#2c1a10';
  for (const wx of [x + 14, x + 30, x + 44]) {
    g.beginPath();
    g.moveTo(wx - 2.5, y - 12);
    g.lineTo(wx - 2.5, y - 22);
    g.arc(wx, y - 22, 2.5, Math.PI, 0);
    g.lineTo(wx + 2.5, y - 12);
    g.closePath();
    g.fill();
  }
  // west tower
  g.beginPath();
  g.rect(x - 22, y - 64, 24, 64);
  fillInk(g, stone, 1.3);
  g.strokeStyle = 'rgba(120,96,60,0.55)';
  g.lineWidth = 0.8;
  g.beginPath();
  for (let k = 1; k < 9; k++) {
    g.moveTo(x - 22, y - k * 7.2);
    g.lineTo(x + 2, y - k * 7.2);
  }
  g.stroke();
  g.beginPath();
  g.moveTo(x - 25, y - 63);
  g.lineTo(x - 10, y - 90);
  g.lineTo(x + 5, y - 63);
  g.closePath();
  fillInk(g, C.lapis, 1.3);
  // belfry openings
  g.fillStyle = '#2c1a10';
  for (const wx of [x - 15, x - 6]) {
    g.beginPath();
    g.moveTo(wx - 2, y - 46);
    g.lineTo(wx - 2, y - 54);
    g.arc(wx, y - 54, 2, Math.PI, 0);
    g.lineTo(wx + 2, y - 46);
    g.closePath();
    g.fill();
  }
  // door
  g.beginPath();
  g.moveTo(x - 15, y);
  g.lineTo(x - 15, y - 14);
  g.arc(x - 10, y - 14, 5, Math.PI, 0);
  g.lineTo(x - 5, y);
  g.closePath();
  fillInk(g, C.woodDark, 1);
  // cross on the tower
  g.strokeStyle = C.ink;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x - 10, y - 90);
  g.lineTo(x - 10, y - 104);
  g.moveTo(x - 15, y - 99);
  g.lineTo(x - 5, y - 99);
  g.stroke();
  g.strokeStyle = C.gold;
  g.lineWidth = 1.4;
  g.stroke();
  GOLD_SPOTS.push([x - 10, y - 99, 5]);
}

function paintLandscape(g, rng) {
  g.save();
  g.beginPath();
  g.rect(PIC.x0, PIC.y0, PIC.x1 - PIC.x0, PIC.y1 - PIC.y0);
  g.clip();

  // far hill on the right (lighter green) with trees
  const far = [
    [500, 702],
    [520, 640, 560, 586, 640, 566],
    [700, 552, 760, 520, 830, 506],
    [860, 500, 880, 498, 900, 496],
    [900, 702],
  ];
  hillPath(g, far);
  g.fillStyle = C.greenLight;
  g.fill();
  g.save();
  g.clip();
  scallops(g, 480, 900, 520, 700, 16, 'rgba(29,70,38,0.45)', rng);
  g.restore();
  hillPath(g, far);
  inkStroke(g, 1.6);

  paintChapel(g, 716, 562);
  gothicTree(g, 846, 512, 120, rng, C.green, C.greenPale);
  gothicTree(g, 618, 584, 78, rng, C.greenDeep, C.greenLight);

  // winding path on the far hill toward the mill
  g.beginPath();
  g.moveTo(PIC.x1 + 4, 600);
  g.bezierCurveTo(800, 612, 720, 640, 640, 652);
  g.bezierCurveTo(560, 664, 500, 664, 440, 668);
  g.lineTo(440, 690);
  g.bezierCurveTo(520, 684, 600, 684, 660, 676);
  g.bezierCurveTo(740, 664, 820, 636, PIC.x1 + 4, 628);
  g.closePath();
  g.fillStyle = C.path;
  g.fill();
  g.strokeStyle = C.pathDeep;
  g.lineWidth = 1.2;
  g.stroke();
  // pebbles on the path
  for (let i = 0; i < 40; i++) {
    const u = rng();
    const x = lerp(450, 880, u);
    const y = lerp(678, 616, u * u) + (rng() - 0.5) * 8;
    g.fillStyle = 'rgba(140,110,60,0.5)';
    g.fillRect(x, y, 1.6, 1.2);
  }

  // the mill mound (dark green), rising toward the trestle
  const near = [
    [PIC.x0 - 4, 702],
    [PIC.x0 - 4, 624],
    [150, 602, 220, 590, 300, 588],
    [380, 586, 450, 600, 500, 626],
    [530, 642, 560, 676, 590, 702],
  ];
  hillPath(g, near);
  g.fillStyle = C.green;
  g.fill();
  g.save();
  g.clip();
  scallops(g, 100, 600, 600, 705, 15, 'rgba(156,196,122,0.55)', rng);
  g.restore();
  hillPath(g, near);
  inkStroke(g, 1.8);
  // flowers on both hills
  for (let i = 0; i < 26; i++) {
    const x = lerp(130, 560, rng());
    const y = lerp(618, 694, rng());
    if (y < 602 + Math.abs(x - 320) * 0.18) continue;
    flower(g, x, y, 2.2, i % 3 === 0 ? '#e9b9b0' : C.white, i % 2 ? C.verm : C.gold);
  }
  for (let i = 0; i < 16; i++) {
    const x = lerp(560, 880, rng());
    const y = lerp(560, 700, rng());
    if (y < 520 + (880 - x) * 0.18) continue;
    flower(g, x, y, 2, i % 2 ? C.white : '#f2d27a', C.verm);
  }
  // little plants: three-leaf sprigs
  g.strokeStyle = C.greenDeep;
  g.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) {
    const x = lerp(150, 860, rng());
    const y = lerp(640, 696, rng());
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y - 9);
    g.moveTo(x, y - 5);
    g.lineTo(x - 4, y - 10);
    g.moveTo(x, y - 5);
    g.lineTo(x + 4, y - 10);
    g.stroke();
  }
  // stone piers of the trestle (fixed to the ground)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const X = Math.cos(a) * 78;
    const Z = Math.sin(a) * 78;
    const sx = MX + X;
    const sy = MY + Z * ES;
    g.beginPath();
    g.rect(sx - 9, sy - 2, 18, 13);
    fillInk(g, C.stone, 1.2);
    g.strokeStyle = C.stoneDark;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(sx - 9, sy + 4.5);
    g.lineTo(sx + 9, sy + 4.5);
    g.moveTo(sx, sy - 2);
    g.lineTo(sx, sy + 4.5);
    g.moveTo(sx - 4, sy + 4.5);
    g.lineTo(sx - 4, sy + 11);
    g.moveTo(sx + 5, sy + 4.5);
    g.lineTo(sx + 5, sy + 11);
    g.stroke();
  }
  g.restore();
}

function paintMargins(g, rng) {
  // hanging sprays from the road bar into the bas-de-page
  tendril(g, { x: LBAR_X, y: BAR.y1 + 10 }, { x: LBAR_X - 10, y: 780 }, { x: LBAR_X + 6, y: 850 }, { x: LBAR_X - 4, y: 900 }, 4, rng, 12);
  tendril(g, { x: 280, y: BAR.y1 }, { x: 290, y: 760 }, { x: 250, y: 770 }, { x: 262, y: 806 }, 2, rng, 11);
  tendril(g, { x: 690, y: BAR.y1 }, { x: 700, y: 770 }, { x: 650, y: 780 }, { x: 668, y: 820 }, 2, rng, 11);
  tendril(g, { x: 940, y: BAR.y1 }, { x: 950, y: 790 }, { x: 905, y: 830 }, { x: 930, y: 900 }, 3, rng, 12);
  // ground plots for the drolleries (a line of turf, as in a bas-de-page)
  const plot = (x0, x1, y) => {
    g.beginPath();
    g.moveTo(x0, y + 4);
    g.bezierCurveTo(x0 + 10, y - 6, x1 - 10, y - 6, x1, y + 4);
    g.closePath();
    fillInk(g, C.greenLight, 1.2);
    g.strokeStyle = C.greenDeep;
    g.lineWidth = 1;
    g.beginPath();
    for (let x = x0 + 8; x < x1 - 6; x += 7) {
      g.moveTo(x, y);
      g.lineTo(x - 2, y - 6 - rng() * 4);
      g.moveTo(x, y);
      g.lineTo(x + 2, y - 5 - rng() * 4);
    }
    g.stroke();
  };
  plot(84, 268, MONK.y);
  plot(326, 660, KNIGHT.y);
  // catchword in a red frame, bottom right
  g.font = blackletter(22);
  const cw = 'ventus';
  const w = g.measureText(cw).width;
  g.fillStyle = C.ink;
  g.fillText(cw, 930 - w, 956);
  g.strokeStyle = C.verm;
  g.lineWidth = 1.2;
  g.strokeRect(930 - w - 6, 938, w + 12, 24);
  // lectern for the monk (static)
  const lx = MONK.x + 64;
  g.beginPath();
  g.moveTo(lx - 2, MONK.y);
  g.lineTo(lx + 2, MONK.y - 54);
  g.lineTo(lx + 8, MONK.y - 54);
  g.lineTo(lx + 8, MONK.y);
  g.closePath();
  fillInk(g, C.woodDark, 1.1);
  g.beginPath();
  g.moveTo(lx - 14, MONK.y);
  g.lineTo(lx + 22, MONK.y);
  g.lineTo(lx + 20, MONK.y - 4);
  g.lineTo(lx - 12, MONK.y - 4);
  g.closePath();
  fillInk(g, C.woodDark, 1);
  // sloping desk
  g.beginPath();
  g.moveTo(lx - 30, MONK.y - 62);
  g.lineTo(lx + 26, MONK.y - 82);
  g.lineTo(lx + 30, MONK.y - 72);
  g.lineTo(lx - 26, MONK.y - 52);
  g.closePath();
  fillInk(g, C.wood, 1.2);
  // open book on the desk
  g.beginPath();
  g.moveTo(lx - 26, MONK.y - 64);
  g.quadraticCurveTo(lx - 12, MONK.y - 80, lx - 1, MONK.y - 72);
  g.quadraticCurveTo(lx + 10, MONK.y - 88, lx + 24, MONK.y - 84);
  g.lineTo(lx + 26, MONK.y - 80);
  g.lineTo(lx - 24, MONK.y - 60);
  g.closePath();
  fillInk(g, C.white, 1);
  g.strokeStyle = 'rgba(42,28,18,0.5)';
  g.lineWidth = 0.7;
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    g.moveTo(lx - 20 + k * 1.5, MONK.y - 66 - k * 2.6);
    g.lineTo(lx - 6 + k * 1.5, MONK.y - 72 - k * 2.6);
    g.moveTo(lx + 4 + k * 1.2, MONK.y - 76 - k * 2.2);
    g.lineTo(lx + 20 + k * 1.2, MONK.y - 82 - k * 2.2);
  }
  g.stroke();
  g.fillStyle = C.verm;
  g.fillRect(lx - 21, MONK.y - 70, 3, 3);
  // ink horn on the desk edge
  g.beginPath();
  g.moveTo(lx + 22, MONK.y - 80);
  g.lineTo(lx + 30, MONK.y - 92);
  g.lineTo(lx + 33, MONK.y - 90);
  g.lineTo(lx + 27, MONK.y - 78);
  g.closePath();
  fillInk(g, C.black, 0.8);
  // stool
  g.beginPath();
  g.rect(MONK.x - 22, MONK.y - 34, 30, 6);
  fillInk(g, C.woodDark, 1);
  g.strokeStyle = C.ink;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(MONK.x - 18, MONK.y - 28);
  g.lineTo(MONK.x - 22, MONK.y);
  g.moveTo(MONK.x + 4, MONK.y - 28);
  g.lineTo(MONK.x + 8, MONK.y);
  g.stroke();
}

function paintPage(g, rng) {
  GOLD_SPOTS.length = 0;
  paintVellum(g, rng);
  paintRuling(g);
  paintText(g);
  paintInitial(g, rng);
  paintDiaper(g, rng);
  paintLandscape(g, rng);
  paintMiniFrame(g);
  paintLeftBar(g, rng);
  paintRightVine(g, rng);
  paintRoadBar(g, rng);
  paintMargins(g, rng);
  // the whole leaf shares one skin: fine grain over the pigment too
  K.addGrain(g, P, P, rng, 0.03);
  // slight rubbing of the pigment near the gutter edge
  K.addBlotches(g, P, P, rng, 'rgba(242,230,201,0.10)', 12, 30, 90);
}

// =============================================================================
// THE POST MILL (animated: yaw of the whole buck + sails)
// =============================================================================
function millFrame(phi) {
  const fx = Math.sin(phi);
  const fz = Math.cos(phi);
  const rx = Math.cos(phi);
  const rz = -Math.sin(phi);
  // buck-local (a across, h up, w forward) -> screen
  const P3 = (a, h, w) => {
    const X = a * rx + w * fx;
    const Z = a * rz + w * fz;
    return { x: MX + X, y: MY - h * EC + Z * ES, z: Z };
  };
  return { fx, fz, rx, rz, P3 };
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function beam(ctx, a, b, w, fill, edge = C.ink) {
  ctx.lineCap = 'butt';
  ctx.strokeStyle = edge;
  ctx.lineWidth = w + 2.4;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.lineCap = 'round';
}

function faceTone(nx, ny, nz) {
  // light from the upper left, a little toward the viewer (the picture's convention)
  const L = [-0.62, 0.55, 0.56];
  return clamp(0.5 + 0.5 * (nx * L[0] + ny * L[1] + nz * L[2]), 0, 1);
}

function drawBuck(ctx, M) {
  const { A, D, h0, h1, h2 } = BUCK;
  const { P3, fz, rz } = M;
  const visFront = fz > 0.02;
  const visBack = fz < -0.02;
  const visRight = rz > 0.02;
  const visLeft = rz < -0.02;

  const wall = (pts, n, planks, kind) => {
    const tone = faceTone(n[0], n[1], n[2]);
    poly(ctx, pts);
    ctx.fillStyle = K.mixColor(C.woodDark, C.woodLight, tone);
    ctx.fill();
    // weatherboarding
    ctx.strokeStyle = 'rgba(60,36,16,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [p, q] of planks) {
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    poly(ctx, pts);
    inkStroke(ctx, 1.6);
    return kind;
  };

  const frontPent = (w) => [P3(-A, h0, w), P3(A, h0, w), P3(A, h1, w), P3(0, h2, w), P3(-A, h1, w)];
  const gablePlanks = (w) => {
    const out = [];
    for (let h = h0 + 11; h < h2 - 4; h += 11) {
      const half = h <= h1 ? A : (A * (h2 - h)) / (h2 - h1);
      out.push([P3(-half, h, w), P3(half, h, w)]);
    }
    return out;
  };
  const sidePlanks = (a) => {
    const out = [];
    for (let h = h0 + 11; h < h1 - 2; h += 11) out.push([P3(a, h, -D), P3(a, h, D)]);
    return out;
  };

  if (visBack) {
    wall(frontPent(-D), [-M.fx, 0, -M.fz], gablePlanks(-D));
    // round-headed door
    const d0 = P3(-13, h0 + 2, -D);
    const d1 = P3(13, h0 + 2, -D);
    const d2 = P3(13, h0 + 52, -D);
    const d3 = P3(-13, h0 + 52, -D);
    const top = P3(0, h0 + 66, -D);
    ctx.beginPath();
    ctx.moveTo(d0.x, d0.y);
    ctx.lineTo(d1.x, d1.y);
    ctx.lineTo(d2.x, d2.y);
    ctx.quadraticCurveTo(top.x + (d2.x - d3.x) * 0.5, top.y - 6, d3.x, d3.y);
    ctx.closePath();
    fillInk(ctx, '#3a2416', 1.3);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const hA = P3(-12, h0 + 16, -D);
    const hB = P3(4, h0 + 16, -D);
    const hC = P3(-12, h0 + 40, -D);
    const hD = P3(4, h0 + 40, -D);
    ctx.moveTo(hA.x, hA.y);
    ctx.lineTo(hB.x, hB.y);
    ctx.moveTo(hC.x, hC.y);
    ctx.lineTo(hD.x, hD.y);
    ctx.stroke();
    // small porch / platform at the door
    const p0 = P3(-17, h0, -D);
    const p1 = P3(17, h0, -D);
    const p2 = P3(17, h0, -D - 12);
    const p3 = P3(-17, h0, -D - 12);
    poly(ctx, [p0, p1, p2, p3]);
    fillInk(ctx, C.woodDark, 1.2);
  }
  if (visFront) {
    wall(frontPent(D), [M.fx, 0, M.fz], gablePlanks(D));
    // breast beam
    beam(ctx, P3(-A, SHAFT_H - 12, D), P3(A, SHAFT_H - 12, D), 4, C.woodDark);
  }
  if (visRight) {
    wall([P3(A, h0, -D), P3(A, h0, D), P3(A, h1, D), P3(A, h1, -D)], [M.rx, 0, M.rz], sidePlanks(A));
    windowOn(ctx, P3, A, 1);
  }
  if (visLeft) {
    wall([P3(-A, h0, -D), P3(-A, h0, D), P3(-A, h1, D), P3(-A, h1, -D)], [-M.rx, 0, -M.rz], sidePlanks(-A));
    windowOn(ctx, P3, -A, -1);
  }
  // corner posts (the buck's frame)
  const corners = [
    [-A, -D],
    [A, -D],
    [A, D],
    [-A, D],
  ];
  for (const [a, w] of corners) {
    const zc = P3(a, h0, w).z;
    // only corners on the silhouette's near side
    const near = (w > 0 ? visFront : visBack) || (a > 0 ? visRight : visLeft);
    if (!near || zc < -30) continue;
    beam(ctx, P3(a, h0, w), P3(a, h1, w), 3.2, C.woodDark);
  }
  // sill + plate beams on visible faces
  if (visFront || visBack) {
    const w = visFront ? D : -D;
    beam(ctx, P3(-A, h0 + 2, w), P3(A, h0 + 2, w), 3.4, C.woodDark);
  }

  // roof: two boarded planes with overhang
  const G = h2 - h1;
  const ov = 6;
  const roofPlane = (side) => {
    const a = side * (A + ov);
    const hE = h1 - (ov * G) / A;
    const pts = [P3(a, hE, -D - ov), P3(a, hE, D + ov), P3(0, h2, D + ov), P3(0, h2, -D - ov)];
    const n = [side * M.rx * G, A, side * M.rz * G];
    const len = Math.hypot(n[0], n[1], n[2]);
    const tone = faceTone(n[0] / len, n[1] / len, n[2] / len);
    poly(ctx, pts);
    ctx.fillStyle = K.mixColor(C.roofDark, C.roofLight, tone);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,20,14,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let w = -D - ov + 8; w < D + ov - 2; w += 8.5) {
      const p = P3(a, hE, w);
      const q = P3(0, h2, w);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    poly(ctx, pts);
    inkStroke(ctx, 1.6);
  };
  const vr = A * ES + rz * G * EC; // right plane facing the viewer
  const vl = A * ES - rz * G * EC;
  if (vr < vl) {
    if (vr > 0) roofPlane(1);
    if (vl > 0) roofPlane(-1);
  } else {
    if (vl > 0) roofPlane(-1);
    if (vr > 0) roofPlane(1);
  }
  // ridge
  beam(ctx, P3(0, h2 + 1, -D - ov), P3(0, h2 + 1, D + ov), 3, C.roofDark);
  // gable barge boards on the visible gable end
  if (visFront || visBack) {
    const w = (visFront ? D : -D) + (visFront ? ov : -ov);
    const hE = h1 - (ov * G) / A;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4.4;
    const a1 = P3(-A - ov, hE, w);
    const a2 = P3(0, h2 + 2, w);
    const a3 = P3(A + ov, hE, w);
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(a2.x, a2.y);
    ctx.lineTo(a3.x, a3.y);
    ctx.stroke();
    ctx.strokeStyle = C.woodLight;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function windowOn(ctx, P3, a, side) {
  const w0 = -14;
  const w1 = 2;
  const hA = BUCK.h1 - 46;
  const hB = BUCK.h1 - 24;
  poly(ctx, [P3(a, hA, w0), P3(a, hA, w1), P3(a, hB, w1), P3(a, hB, w0)]);
  fillInk(ctx, '#2c1a10', 1.1);
  void side;
}

/** Point in the sail plane: radius rho along the arm at angle th, offset q across. */
function sailPt(M, hub, th, rho, q) {
  const s = rho * Math.sin(th) + q * Math.cos(th);
  const c = rho * Math.cos(th) - q * Math.sin(th);
  return { x: hub.x + s * M.rx, y: hub.y - c * EC + s * M.rz * ES };
}

function drawSails(ctx, M, theta, front) {
  const hub = M.P3(0, SHAFT_H + 2, BUCK.D + 17);
  const { r0, r1, lead, trail, bars } = SAIL;
  const face = Math.abs(M.rx);
  // the windshaft and its iron poll end
  const sh0 = M.P3(0, SHAFT_H - 1, BUCK.D - 6);
  beam(ctx, sh0, hub, 7, C.woodDark);
  // stocks first (two long timbers through the poll), then each sail
  const order = front ? [0, 1, 2, 3] : [0, 1, 2, 3];
  for (const i of order) {
    const th = theta + (i * Math.PI) / 2;
    const cl = [sailPt(M, hub, th, r0 + 6, 3), sailPt(M, hub, th, r1 - 3, 3), sailPt(M, hub, th, r1 - 6, trail - 3), sailPt(M, hub, th, r0 + 8, trail - 3)];
    // cloth, with a gentle belly between the bars
    poly(ctx, cl);
    ctx.fillStyle = front ? C.cloth : C.clothShade;
    ctx.globalAlpha = face < 0.25 ? 0.9 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;
    // cloth folds (light / shade stripes along the length)
    ctx.strokeStyle = front ? 'rgba(150,128,90,0.45)' : 'rgba(110,90,60,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const qq of [13, 25, 34]) {
      const a = sailPt(M, hub, th, r0 + 10, qq);
      const b = sailPt(M, hub, th, r1 - 8, qq);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    // lattice: sail bars across, hemlath along the outer edge, leading board
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = front ? 1.4 : 1.9;
    ctx.beginPath();
    for (let k = 0; k <= bars; k++) {
      const rho = r0 + ((r1 - r0) * k) / bars;
      const a = sailPt(M, hub, th, rho, lead);
      const b = sailPt(M, hub, th, rho, trail);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    for (const qq of [lead, trail]) {
      const a = sailPt(M, hub, th, r0, qq);
      const b = sailPt(M, hub, th, r1, qq);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.strokeStyle = C.woodLight;
    ctx.lineWidth = front ? 0.6 : 0.9;
    ctx.stroke();
    // reef ties at the tip
    ctx.strokeStyle = C.verm;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const qq of [10, 22, 34]) {
      const a = sailPt(M, hub, th, r1 - 4, qq);
      const b = sailPt(M, hub, th, r1 + 4, qq + 2);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
  // the two stocks (whips) over everything
  for (let i = 0; i < 2; i++) {
    const th = theta + (i * Math.PI) / 2;
    const a = sailPt(M, hub, th, -r1 - 4, 0);
    const b = sailPt(M, hub, th, r1 + 4, 0);
    beam(ctx, a, b, 4.2, C.woodDark);
    ctx.strokeStyle = C.woodLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  circle(ctx, hub.x, hub.y, 6.5);
  fillInk(ctx, '#4a4440', 1.4);
  circle(ctx, hub.x - 1.5, hub.y - 1.5, 2);
  ctx.fillStyle = '#a7a19a';
  ctx.fill();
}

function drawTrestle(ctx, M, which) {
  // crosstrees and quarterbars are fixed (they do not turn); `which`: 'back' | 'front'
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    const isFront = cz > 0;
    if ((which === 'front') !== isFront) continue;
    const end = { x: MX + cx * 80, y: MY + cz * 80 * ES - 2 };
    const mid = { x: MX, y: MY };
    beam(ctx, mid, end, 6, C.woodDark);
    // quarterbar: from the crosstree end up to the post
    const qa = { x: MX + cx * 72, y: MY + cz * 72 * ES - 8 };
    const qb = { x: MX + cx * 6, y: MY - 74 * EC + cz * 6 * ES };
    beam(ctx, qa, qb, 5.2, C.wood);
  }
}

function drawPost(ctx) {
  const top = MY - BUCK.h0 * EC + 4;
  ctx.beginPath();
  ctx.moveTo(MX - 8, MY + 2);
  ctx.lineTo(MX - 7, top);
  ctx.lineTo(MX + 7, top);
  ctx.lineTo(MX + 8, MY + 2);
  ctx.closePath();
  const gr = ctx.createLinearGradient(MX - 8, 0, MX + 8, 0);
  gr.addColorStop(0, C.woodLight);
  gr.addColorStop(0.55, C.wood);
  gr.addColorStop(1, C.woodDeep);
  ctx.fillStyle = gr;
  ctx.fill();
  inkStroke(ctx, 1.5);
  // iron bands
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const yy of [MY - 30, MY - 82]) {
    ctx.moveTo(MX - 8, yy);
    ctx.lineTo(MX + 8, yy);
  }
  ctx.stroke();
}

function drawLadder(ctx, M) {
  const { P3 } = M;
  const D = BUCK.D;
  const top = BUCK.h0 + 1;
  const foot = -D - LADDER.reach;
  const rails = [-LADDER.w, LADDER.w];
  const ra = rails.map((a) => [P3(a, top, -D - 10), P3(a, 0, foot)]);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.2;
  // treads
  for (let k = 1; k < 9; k++) {
    const u = k / 9;
    const a = { x: lerp(ra[0][0].x, ra[0][1].x, u), y: lerp(ra[0][0].y, ra[0][1].y, u) };
    const b = { x: lerp(ra[1][0].x, ra[1][1].x, u), y: lerp(ra[1][0].y, ra[1][1].y, u) };
    beam(ctx, a, b, 2.2, C.wood);
  }
  for (const [a, b] of ra) beam(ctx, a, b, 3.2, C.woodDark);
}

function drawTailpole(ctx, M) {
  const { P3 } = M;
  const D = BUCK.D;
  const a = P3(0, BUCK.h0 - 6, -D + 22);
  const b = P3(0, TAIL.endH, -D - TAIL.reach + D);
  beam(ctx, a, b, 5.6, C.woodDark);
  ctx.strokeStyle = C.woodLight;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y - 1);
  ctx.lineTo(b.x, b.y - 1);
  ctx.stroke();
  // brace from the ladder to the tailpole
  const c = P3(0, 70, -D - 50);
  const d = P3(0, BUCK.h0 - 30, -D - 14);
  beam(ctx, c, d, 2.4, C.wood);
  return b;
}

// ----- figures (manuscript style) ---------------------------------------------------
function limb(ctx, pts, w, fill) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = w + 2.4;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
}

function headProfile(ctx, x, y, r, dir, opts = {}) {
  // pale face, rosy cheek, dark eye — dir = +1 facing right, -1 left
  circle(ctx, x, y, r);
  fillInk(ctx, C.skin, 1.2);
  circle(ctx, x + dir * r * 0.35, y + r * 0.3, r * 0.3);
  ctx.fillStyle = 'rgba(226,152,138,0.75)';
  ctx.fill();
  // nose
  ctx.beginPath();
  ctx.moveTo(x + dir * r * 0.88, y - r * 0.15);
  ctx.lineTo(x + dir * r * 1.18, y + r * 0.22);
  ctx.lineTo(x + dir * r * 0.86, y + r * 0.3);
  ctx.fillStyle = C.skin;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  const ex = x + dir * r * 0.5 + (opts.lookX || 0);
  const ey = y - r * 0.2 + (opts.lookY || 0);
  circle(ctx, ex, ey, r * 0.13 + 0.5);
  ctx.fillStyle = C.black;
  ctx.fill();
  // brow
  ctx.strokeStyle = C.brownInk;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(ex - dir * r * 0.25, ey - r * 0.28 - (opts.brow || 0));
  ctx.lineTo(ex + dir * r * 0.22, ey - r * 0.3 - (opts.brow || 0));
  ctx.stroke();
  // mouth
  ctx.beginPath();
  if (opts.mouthO) {
    circle(ctx, x + dir * r * 0.72, y + r * 0.55, r * 0.14 + opts.mouthO);
    ctx.fillStyle = '#7a2a22';
    ctx.fill();
  } else {
    ctx.moveTo(x + dir * r * 0.5, y + r * 0.58);
    ctx.lineTo(x + dir * r * 0.82, y + r * 0.52);
    ctx.strokeStyle = '#8a3a30';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** The miller, leaning into the tailpole. `dir` = facing, `step` walk phase, `push` 0..1. */
function drawMiller(ctx, hand, dir, step, push, lt) {
  // feet on the ground below the tailpole end
  const footY = hand.y + 44;
  const lean = 0.18 + 0.38 * push; // body leans toward the pole
  const hipX = hand.x - dir * (18 + 10 * push);
  const hipY = footY - 30;
  const sh = { x: hipX + dir * Math.sin(lean) * 30, y: hipY - Math.cos(lean) * 30 };
  // legs (hose) — walking stride
  const sw = Math.sin(step) * 9 * (0.3 + push);
  const legA = [
    [hipX, hipY],
    [hipX + dir * 2 + sw * 0.5, hipY + 16],
    [hipX - dir * 6 + sw, footY],
  ];
  const legB = [
    [hipX, hipY],
    [hipX - dir * 8 - sw * 0.5, hipY + 15],
    [hipX - dir * 16 - sw, footY],
  ];
  limb(ctx, legB, 5, '#6b4a32');
  limb(ctx, legA, 5, '#7d5a3e');
  // shoes
  ctx.fillStyle = C.black;
  for (const L of [legA, legB]) {
    const f = L[2];
    ctx.beginPath();
    ctx.ellipse(f[0] + dir * 3, f[1], 5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // tunic (cote): lapis, belted, knee length
  ctx.beginPath();
  ctx.moveTo(sh.x - dir * 9, sh.y);
  ctx.quadraticCurveTo(sh.x + dir * 10, sh.y - 2, sh.x + dir * 9, sh.y + 6);
  ctx.lineTo(hipX + dir * 10, hipY + 12);
  ctx.quadraticCurveTo(hipX, hipY + 16, hipX - dir * 14, hipY + 10);
  ctx.closePath();
  fillInk(ctx, C.lapisLight, 1.3);
  ctx.strokeStyle = 'rgba(20,42,102,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y + 6);
  ctx.quadraticCurveTo(hipX + dir * 2, hipY, hipX - dir * 2, hipY + 12);
  ctx.moveTo(sh.x - dir * 4, sh.y + 4);
  ctx.quadraticCurveTo(hipX - dir * 6, hipY, hipX - dir * 8, hipY + 10);
  ctx.stroke();
  // belt
  ctx.strokeStyle = C.woodDeep;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hipX - dir * 11, hipY - 2);
  ctx.lineTo(hipX + dir * 9, hipY - 4);
  ctx.stroke();
  // arms to the pole
  limb(
    ctx,
    [
      [sh.x + dir * 2, sh.y + 4],
      [lerp(sh.x, hand.x, 0.55), lerp(sh.y, hand.y, 0.55) + 4],
      [hand.x, hand.y + 1],
    ],
    4.2,
    C.lapisLight,
  );
  circle(ctx, hand.x, hand.y + 1, 2.6);
  fillInk(ctx, C.skin, 0.9);
  // head with red hood (chaperon)
  const hx = sh.x + dir * (5 + 4 * push);
  const hy = sh.y - 9 + push * 2;
  ctx.beginPath();
  ctx.arc(hx - dir * 1, hy - 1, 10, 0, Math.PI * 2);
  fillInk(ctx, C.verm, 1.2);
  headProfile(ctx, hx + dir * 1.5, hy + 1, 6.8, dir, { mouthO: push > 0.5 ? 0.8 : 0, brow: push * 1.2 });
  // hood liripipe tail
  ctx.beginPath();
  ctx.moveTo(hx - dir * 8, hy - 4);
  ctx.quadraticCurveTo(hx - dir * 18, hy - 2 + Math.sin(lt * 6) * 1.5, hx - dir * 22, hy + 8);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4.2;
  ctx.stroke();
  ctx.strokeStyle = C.verm;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // effort lines when pushing hard
  if (push > 0.6) {
    ctx.strokeStyle = 'rgba(42,28,18,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const yy = hy - 6 + k * 6;
      ctx.moveTo(hx - dir * 16, yy);
      ctx.lineTo(hx - dir * 24, yy - 2);
    }
    ctx.stroke();
  }
}

function drawDonkeyTrain(ctx, lt, at) {
  const drift = clamp(lt, -8, 16) * 4.2;
  const x = 744 - drift;
  const y = 650 + (744 - x) * 0.11; // following the path down toward the mill
  const step = at * 5.2;
  const dir = -1;
  ctx.save();
  // donkey body
  const bx = x;
  const by = y - 30;
  const legs = [
    [bx - 20, 0],
    [bx - 13, Math.PI],
    [bx + 14, Math.PI * 0.5],
    [bx + 21, Math.PI * 1.5],
  ];
  for (let i = 0; i < 4; i++) {
    const [lx, ph] = legs[i];
    const sw = Math.sin(step + ph) * 4;
    const far = i % 2 === 1;
    limb(
      ctx,
      [
        [lx, by + 6],
        [lx + sw * 0.6, by + 18],
        [lx + sw, y],
      ],
      3.6,
      far ? C.donkeyDark : C.donkey,
    );
  }
  ctx.beginPath();
  ctx.ellipse(bx, by, 28, 12, 0, 0, Math.PI * 2);
  fillInk(ctx, C.donkey, 1.4);
  ctx.beginPath();
  ctx.ellipse(bx + 2, by + 6, 20, 5, 0, 0, Math.PI);
  ctx.fillStyle = C.donkeyLight;
  ctx.fill();
  // neck + head (facing left)
  ctx.beginPath();
  ctx.moveTo(bx - 20, by - 6);
  ctx.quadraticCurveTo(bx - 32, by - 22, bx - 38, by - 26);
  ctx.lineTo(bx - 48, by - 14);
  ctx.quadraticCurveTo(bx - 52, by - 9, bx - 46, by - 7);
  ctx.lineTo(bx - 34, by - 12);
  ctx.quadraticCurveTo(bx - 28, by - 2, bx - 22, by + 4);
  ctx.closePath();
  fillInk(ctx, C.donkey, 1.3);
  // muzzle
  ctx.beginPath();
  ctx.ellipse(bx - 47, by - 11, 4.5, 3.4, 0.5, 0, Math.PI * 2);
  fillInk(ctx, C.donkeyLight, 1);
  // ears (long) with a flick
  const flick = Math.sin(at * 3.1) > 0.85 ? 0.25 : 0;
  for (const [ox, a] of [
    [0, -0.2 - flick],
    [4, 0.25],
  ]) {
    ctx.save();
    ctx.translate(bx - 36 + ox, by - 26);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -9, 2.6, 9, 0, 0, Math.PI * 2);
    fillInk(ctx, C.donkey, 1);
    ctx.restore();
  }
  circle(ctx, bx - 40, by - 19, 1.2);
  ctx.fillStyle = C.black;
  ctx.fill();
  // mane + tail
  ctx.strokeStyle = C.donkeyDark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(bx - 22, by - 10);
  ctx.quadraticCurveTo(bx - 30, by - 22, bx - 36, by - 26);
  ctx.moveTo(bx + 27, by - 4);
  ctx.quadraticCurveTo(bx + 34, by + 4 + Math.sin(at * 4) * 2, bx + 32, by + 16);
  ctx.stroke();
  // two sacks of grain slung across the back
  for (const [sx, sy, rot] of [
    [bx - 6, by - 12, -0.15],
    [bx + 10, by - 13, 0.18],
  ]) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-9, 8);
    ctx.quadraticCurveTo(-12, -6, -6, -12);
    ctx.lineTo(-3, -16);
    ctx.lineTo(3, -16);
    ctx.lineTo(6, -12);
    ctx.quadraticCurveTo(12, -6, 9, 8);
    ctx.quadraticCurveTo(0, 12, -9, 8);
    ctx.closePath();
    fillInk(ctx, C.sack, 1.2);
    ctx.strokeStyle = C.sackShade;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.quadraticCurveTo(-7, 2, -4, 8);
    ctx.stroke();
    ctx.strokeStyle = C.verm;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -12);
    ctx.lineTo(4, -12);
    ctx.stroke();
    ctx.restore();
  }
  // girth strap
  ctx.strokeStyle = C.verm;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx + 2, by - 10);
  ctx.lineTo(bx + 1, by + 12);
  ctx.stroke();

  // peasant behind with a sack on his back
  const px = bx + 52;
  const py = y + 1;
  const pst = step + 0.6;
  const sw = Math.sin(pst) * 6;
  limb(
    ctx,
    [
      [px, py - 28],
      [px - 2 + sw * 0.4, py - 14],
      [px - 4 + sw, py],
    ],
    4,
    '#5f4a35',
  );
  limb(
    ctx,
    [
      [px + 2, py - 28],
      [px + 2 - sw * 0.4, py - 14],
      [px + 4 - sw, py],
    ],
    4,
    '#7a5d42',
  );
  ctx.beginPath();
  ctx.moveTo(px - 8, py - 52);
  ctx.quadraticCurveTo(px + 4, py - 58, px + 10, py - 46);
  ctx.lineTo(px + 11, py - 22);
  ctx.quadraticCurveTo(px, py - 18, px - 10, py - 22);
  ctx.closePath();
  fillInk(ctx, C.green, 1.2);
  ctx.strokeStyle = 'rgba(29,70,38,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px - 2, py - 46);
  ctx.quadraticCurveTo(px - 4, py - 34, px - 2, py - 22);
  ctx.stroke();
  // the sack on his back (bent forward under it)
  ctx.beginPath();
  ctx.ellipse(px + 9, py - 56, 12, 16, -0.5, 0, Math.PI * 2);
  fillInk(ctx, C.sack, 1.2);
  ctx.strokeStyle = C.sackShade;
  ctx.beginPath();
  ctx.moveTo(px + 4, py - 66);
  ctx.quadraticCurveTo(px + 12, py - 56, px + 8, py - 44);
  ctx.stroke();
  limb(
    ctx,
    [
      [px - 4, py - 48],
      [px - 2, py - 60],
      [px + 2, py - 68],
    ],
    3.4,
    C.green,
  );
  // head with a straw-coloured coif, bowed under the load
  ctx.beginPath();
  ctx.arc(px - 8, py - 60, 7.5, 0, Math.PI * 2);
  fillInk(ctx, '#efe6cf', 1.1);
  headProfile(ctx, px - 10, py - 58, 5.8, dir, {});
  ctx.restore();
}

function drawWindHead(ctx, lt, at) {
  const { x, y } = WINDHEAD;
  const gust = 0.5 + 0.5 * sstep(3.6, 4.2, lt) * (1 - 0.4 * sstep(7.5, 9, lt));
  const puff = 1 + 0.08 * Math.sin(at * Math.PI * 2) + 0.12 * gust;
  // breath: streaming wavy lines toward the mill, flowing
  ctx.save();
  ctx.lineCap = 'round';
  const rays = 5;
  for (let i = 0; i < rays; i++) {
    const a = Math.PI + (-0.22 + (i / (rays - 1)) * 0.5);
    const len = 175 + 60 * gust + i * 8;
    const ox = x - 40;
    const oy = y + 6;
    ctx.beginPath();
    for (let k = 0; k <= 26; k++) {
      const u = k / 26;
      const d = u * len;
      const wav = Math.sin(u * 9 - at * 7 + i) * 5 * u;
      const px = ox + Math.cos(a) * d - Math.sin(a) * wav;
      const py = oy + Math.sin(a) * d + Math.cos(a) * wav;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.setLineDash([16, 9, 4, 9]);
    ctx.lineDashOffset = at * 70 + i * 13;
    ctx.strokeStyle = 'rgba(42,28,18,0.55)';
    ctx.lineWidth = 4.2;
    ctx.stroke();
    ctx.strokeStyle = i % 2 ? C.goldLight : C.white;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // the cloud (nebuly) the head blows from
  ctx.beginPath();
  const lobes = 9;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const r = 13;
    const cx = x + 6 + Math.cos(a) * 40;
    const cy = y + Math.sin(a) * 34;
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.strokeStyle = C.lapis;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + 6, y, 42, 36, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.white;
  ctx.fill();
  // inner scalloped blue line of the cloud
  ctx.strokeStyle = C.lapisPale;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const cx = x + 6 + Math.cos(a) * 44;
    const cy = y + Math.sin(a) * 38;
    ctx.moveTo(cx + Math.cos(a + 1.2) * 7, cy + Math.sin(a + 1.2) * 7);
    ctx.arc(cx, cy, 7, a + 1.2, a + 1.2 + Math.PI);
  }
  ctx.stroke();
  // face (three-quarter, blowing to the left)
  const fx = x;
  const fy = y;
  // golden curls
  ctx.fillStyle = goldGrad(ctx, fx - 30, fy - 30, fx + 30, fy + 10);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 1.05 + (i / 6) * Math.PI * 0.95;
    circle(ctx, fx + 4 + Math.cos(a) * 22, fy - 2 + Math.sin(a) * 22, 8);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(fx + 2, fy + 2, 21, 23, 0, 0, Math.PI * 2);
  fillInk(ctx, C.skin, 1.4);
  // puffed cheeks
  for (const [dx, s] of [
    [-11, 1],
    [11, 0.85],
  ]) {
    circle(ctx, fx + dx, fy + 8, 8.5 * puff * s);
    ctx.fillStyle = 'rgba(226,140,124,0.65)';
    ctx.fill();
  }
  // eyes looking left
  for (const ex of [-8, 8]) {
    ctx.beginPath();
    ctx.ellipse(fx + ex, fy - 4, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
    circle(ctx, fx + ex - 1.8, fy - 4, 1.6);
    ctx.fillStyle = C.black;
    ctx.fill();
  }
  ctx.strokeStyle = C.brownInk;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(fx - 13, fy - 9);
  ctx.quadraticCurveTo(fx - 8, fy - 13, fx - 3, fy - 10);
  ctx.moveTo(fx + 3, fy - 10);
  ctx.quadraticCurveTo(fx + 8, fy - 13, fx + 13, fy - 9);
  ctx.moveTo(fx, fy - 4);
  ctx.lineTo(fx - 2, fy + 5);
  ctx.lineTo(fx + 1, fy + 6);
  ctx.stroke();
  // pursed blowing lips, pushed to the left
  ctx.beginPath();
  ctx.ellipse(fx - 6, fy + 13, 3.4 * puff, 2.8 * puff, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.verm;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  circle(ctx, fx - 6, fy + 13, 1.1);
  ctx.fillStyle = '#5a1a14';
  ctx.fill();
  ctx.restore();
}

// ----- bas-de-page drolleries -------------------------------------------------------
function drawMonk(ctx, lt, at, riderX) {
  const { x, y } = MONK;
  // looks up while the bird crosses above him (bar 1)
  const look = K.envelope(lt, 0.3, 0.8, 2.3, 2.9);
  const writing = 1 - look;
  const gaze = clamp((riderX - x) / 160, -1, 1);
  // habit: seated on the stool, facing right
  ctx.beginPath();
  ctx.moveTo(x - 20, y - 30);
  ctx.quadraticCurveTo(x - 24, y - 70, x - 10, y - 84);
  ctx.quadraticCurveTo(x + 4, y - 90, x + 12, y - 80);
  ctx.quadraticCurveTo(x + 18, y - 56, x + 14, y - 36);
  ctx.lineTo(x + 32, y - 34);
  ctx.quadraticCurveTo(x + 40, y - 20, x + 34, y);
  ctx.lineTo(x + 18, y);
  ctx.quadraticCurveTo(x + 18, y - 16, x + 6, y - 22);
  ctx.quadraticCurveTo(x - 10, y - 18, x - 20, y - 30);
  ctx.closePath();
  fillInk(ctx, C.habit, 1.4);
  ctx.strokeStyle = C.habitLight;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 76);
  ctx.quadraticCurveTo(x - 16, y - 54, x - 12, y - 34);
  ctx.moveTo(x + 4, y - 78);
  ctx.quadraticCurveTo(x + 6, y - 58, x + 4, y - 40);
  ctx.moveTo(x + 22, y - 32);
  ctx.quadraticCurveTo(x + 30, y - 18, x + 26, y - 2);
  ctx.stroke();
  // shoe
  ctx.fillStyle = C.black;
  ctx.beginPath();
  ctx.ellipse(x + 34, y - 2, 6, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // hood folded on the shoulders
  ctx.beginPath();
  ctx.ellipse(x - 4, y - 84, 14, 6, -0.2, 0, Math.PI * 2);
  fillInk(ctx, C.habitLight, 1.1);
  // head: tonsure, turned up toward the bird when it passes
  const hx = x + 2;
  const hy = y - 98 - look * 2;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-look * 0.5 * (gaze < 0 ? -0.6 : 1));
  circle(ctx, 0, 0, 10);
  fillInk(ctx, C.skin, 1.2);
  // tonsure fringe
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, Math.PI * 0.95, Math.PI * 2.05);
  ctx.strokeStyle = '#6a4228';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.restore();
  const dir = look > 0.5 && gaze < -0.2 ? -1 : 1;
  headProfile(ctx, hx + 0.5, hy + 1, 9, dir, {
    lookY: -look * 2.2,
    lookX: look * gaze * 1.2,
    brow: look * 1.6,
    mouthO: look > 0.6 ? 0.9 : 0,
  });
  ctx.beginPath();
  ctx.arc(hx, hy, 10.5, Math.PI * 1.08, Math.PI * 1.92);
  ctx.strokeStyle = '#6a4228';
  ctx.lineWidth = 3;
  ctx.stroke();
  // writing arm + quill (lifted while gaping)
  const shx = x + 6;
  const shy = y - 76;
  const wob = Math.sin(at * 9) * 1.6 * writing;
  const hand = { x: lerp(x + 46, x + 34, look) + wob, y: lerp(y - 72, y - 96, look) + Math.cos(at * 9) * 1.1 * writing };
  limb(
    ctx,
    [
      [shx, shy],
      [lerp(x + 26, x + 20, look), lerp(y - 60, y - 70, look)],
      [hand.x, hand.y],
    ],
    5.5,
    C.habit,
  );
  circle(ctx, hand.x, hand.y, 3);
  fillInk(ctx, C.skin, 0.9);
  // quill
  ctx.beginPath();
  ctx.moveTo(hand.x + 2, hand.y + 3);
  ctx.quadraticCurveTo(hand.x - 6, hand.y - 12, hand.x - 14 + look * 4, hand.y - 22);
  ctx.quadraticCurveTo(hand.x - 4, hand.y - 12, hand.x + 2, hand.y + 3);
  fillInk(ctx, C.white, 0.9);
  // the ink drop that falls while he gapes
  if (lt > 1.1 && lt < 2.6) {
    const u = (lt - 1.1) / 1.5;
    const dy = u * u * 52;
    circle(ctx, hand.x + 2, hand.y + 6 + dy, 1.8);
    ctx.fillStyle = C.black;
    ctx.fill();
  }
  if (lt >= 2.6 && lt < 16) {
    // the blot on his page
    ctx.beginPath();
    ctx.ellipse(MONK.x + 50, MONK.y - 76, 2.8, 1.6, -0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(23,18,14,0.85)';
    ctx.fill();
  }
}

function drawKnight(ctx, lt, at, riderX, thumb) {
  const { x, y } = KNIGHT;
  // 0 = duelling the snail, 1 = gaping at the spoonbill
  const look = thumb ? 0 : K.envelope(lt, 1.9, 2.5, 6.3, 7.0);
  const beat = Math.max(0, Math.sin(at * Math.PI * 2)) ** 3; // sword bobs on the beat
  ctx.save();
  // legs in mail chausses
  const lean = -look * 3;
  limb(
    ctx,
    [
      [x - 4, y - 52],
      [x - 10, y - 28],
      [x - 15, y - 2],
    ],
    7.5,
    C.mail,
  );
  limb(
    ctx,
    [
      [x + 4, y - 52],
      [x + 12, y - 28],
      [x + 17, y - 2],
    ],
    7.5,
    C.mailLight,
  );
  // mail ring texture
  ctx.strokeStyle = 'rgba(60,64,72,0.55)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    for (const [ax, bx] of [
      [-6, -14],
      [6, 16],
    ]) {
      const u = k / 7;
      const px = x + lerp(ax, bx, u);
      const py = y - 48 + u * 44;
      ctx.moveTo(px - 2.4, py);
      ctx.arc(px, py, 2.4, Math.PI, 0, true);
    }
  }
  ctx.stroke();
  // pointed sabatons + gilt spurs
  ctx.fillStyle = C.mailDark;
  for (const [fx, d] of [
    [x - 15, -1],
    [x + 17, 1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(fx - 5, y - 4);
    ctx.lineTo(fx + d * 12, y);
    ctx.lineTo(fx - 5, y + 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(fx - 5, y - 3);
    ctx.lineTo(fx - 10, y - 4);
    ctx.stroke();
  }
  // surcoat
  ctx.beginPath();
  ctx.moveTo(x - 13 + lean, y - 98);
  ctx.lineTo(x + 13 + lean, y - 98);
  ctx.quadraticCurveTo(x + 18, y - 70, x + 26, y - 36);
  ctx.quadraticCurveTo(x + 2, y - 30, x - 24, y - 36);
  ctx.quadraticCurveTo(x - 18, y - 70, x - 13 + lean, y - 98);
  ctx.closePath();
  fillInk(ctx, C.verm, 1.4);
  ctx.strokeStyle = 'rgba(110,20,18,0.8)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x - 6, y - 62);
  ctx.quadraticCurveTo(x - 10, y - 48, x - 14, y - 36);
  ctx.moveTo(x + 6, y - 62);
  ctx.quadraticCurveTo(x + 10, y - 48, x + 15, y - 35);
  ctx.moveTo(x, y - 60);
  ctx.lineTo(x + 1, y - 33);
  ctx.stroke();
  // gold hem + belt
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 23, y - 37);
  ctx.quadraticCurveTo(x + 2, y - 31, x + 25, y - 37);
  ctx.moveTo(x - 15, y - 64);
  ctx.lineTo(x + 15, y - 64);
  ctx.stroke();
  // charge on the chest: three small gold roundels (no real arms)
  for (const [dx, dy] of [
    [-5, -86],
    [5, -86],
    [0, -77],
  ]) {
    circle(ctx, x + dx + lean, y + dy, 2.6);
    ctx.fillStyle = goldGrad(ctx, x + dx - 3, y + dy - 3, x + dx + 3, y + dy + 3);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  // shield arm (toward the snail), heater shield
  const shY = y - 74 + look * 6;
  ctx.beginPath();
  ctx.moveTo(x + 10, shY - 18);
  ctx.lineTo(x + 36, shY - 18);
  ctx.quadraticCurveTo(x + 36, shY + 6, x + 23, shY + 18);
  ctx.quadraticCurveTo(x + 10, shY + 6, x + 10, shY - 18);
  ctx.closePath();
  fillInk(ctx, C.lapis, 1.4);
  ctx.beginPath();
  ctx.moveTo(x + 11, shY + 2);
  ctx.lineTo(x + 23, shY - 10);
  ctx.lineTo(x + 35, shY + 2);
  ctx.lineTo(x + 34, shY + 7);
  ctx.lineTo(x + 23, shY - 4);
  ctx.lineTo(x + 12, shY + 7);
  ctx.closePath();
  ctx.fillStyle = goldGrad(ctx, x + 10, shY - 10, x + 36, shY + 8);
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // sword arm: raised over the head (duel) -> lowered (gaping)
  const sh = { x: x - 8 + lean, y: y - 92 };
  const raise = 1 - look;
  const handF = { x: x - 6, y: y - 120 + beat * 3 };
  const handL = { x: x - 22, y: y - 66 };
  const hand = { x: lerp(handL.x, handF.x, raise), y: lerp(handL.y, handF.y, raise) };
  const elbow = { x: lerp(x - 22, x - 20, raise), y: lerp(y - 80, y - 112, raise) };
  limb(
    ctx,
    [
      [sh.x, sh.y],
      [elbow.x, elbow.y],
      [hand.x, hand.y],
    ],
    6,
    C.mail,
  );
  const swA = lerp(1.95, -0.55 + beat * 0.12, raise);
  const bl = 58;
  const tip = { x: hand.x + Math.cos(swA) * bl, y: hand.y + Math.sin(swA) * bl };
  ctx.lineCap = 'butt';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(hand.x + Math.cos(swA) * 6, hand.y + Math.sin(swA) * 6);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = '#dfe3e8';
  ctx.lineWidth = 2.8;
  ctx.stroke();
  // crossguard + pommel (gold)
  const gx = hand.x + Math.cos(swA) * 6;
  const gy = hand.y + Math.sin(swA) * 6;
  const nx = -Math.sin(swA);
  const ny = Math.cos(swA);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(gx - nx * 9, gy - ny * 9);
  ctx.lineTo(gx + nx * 9, gy + ny * 9);
  ctx.stroke();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  circle(ctx, hand.x - Math.cos(swA) * 7, hand.y - Math.sin(swA) * 7, 3);
  ctx.fillStyle = C.gold;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.lineCap = 'round';
  pushDyn(gx, gy, 5);
  // head: mail coif with an open face; tips back to gape at the bird
  const hx = x + 2 + lean;
  const hy = y - 110;
  const tilt = -look * 0.55;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  circle(ctx, 0, 0, 13);
  fillInk(ctx, C.mail, 1.3);
  ctx.strokeStyle = 'rgba(60,64,72,0.6)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let k = -2; k <= 2; k++) {
    ctx.moveTo(-11, k * 4.5);
    for (let q = -11; q <= 11; q += 3.5) ctx.arc(q + 1.75, k * 4.5, 1.75, Math.PI, 0, true);
  }
  ctx.stroke();
  // nasal helm (kettle-ish cap)
  ctx.beginPath();
  ctx.arc(0, -2, 13.5, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  fillInk(ctx, C.mailDark, 1.2);
  ctx.restore();
  // face opening
  const fx = hx + Math.cos(tilt) * 5;
  const fy = hy + Math.sin(tilt) * 5 + 1;
  const gazeX = clamp((riderX - x) / 120, -1, 1);
  ctx.beginPath();
  ctx.ellipse(fx, fy, 7.5, 8.5, tilt, 0, Math.PI * 2);
  fillInk(ctx, C.skin, 1);
  const eye = { x: fx + 2 + gazeX * 1.5 * look, y: fy - 2 - look * 2 };
  circle(ctx, eye.x, eye.y, 1.5);
  ctx.fillStyle = C.black;
  ctx.fill();
  circle(ctx, fx + 3, fy + 3.5, 1 + look * 1.4);
  ctx.fillStyle = look > 0.4 ? '#7a2a22' : 'rgba(138,58,48,0.8)';
  ctx.fill();
  ctx.restore();
  return { mouth: { x: fx + 6, y: fy + 2 }, look };
}

const GOLD_SPOTS_DYN = [];
let CUR_S = null; // origin/scale of the drollery currently being drawn

function pushDyn(x, y, r) {
  if (CUR_S) GOLD_SPOTS_DYN.push([CUR_S.x + (x - CUR_S.x) * CUR_S.s, CUR_S.y + (y - CUR_S.y) * CUR_S.s, r * CUR_S.s]);
  else GOLD_SPOTS_DYN.push([x, y, r]);
}

/** Draw `fn` scaled about the figure's foot point o = {x, y, s}. */
function scaled(ctx, o, fn) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(o.s, o.s);
  ctx.translate(-o.x, -o.y);
  CUR_S = o;
  const r = fn();
  CUR_S = null;
  ctx.restore();
  return r;
}

const sp = (o, p) => ({ x: o.x + (p.x - o.x) * o.s, y: o.y + (p.y - o.y) * o.s });

function drawSnail(ctx, lt, at, riderX, look, thumb) {
  const { x, y } = SNAIL;
  const sx = x + 26;
  const sy = y - 44;
  // body (foot) along the turf, head raised toward the knight
  const stretch = Math.sin(at * Math.PI) * 2;
  ctx.beginPath();
  ctx.moveTo(x + 70, y - 2);
  ctx.quadraticCurveTo(x + 40, y + 2, x - 10 - stretch, y - 2);
  ctx.quadraticCurveTo(x - 30 - stretch, y - 4, x - 34 - stretch, y - 22);
  ctx.quadraticCurveTo(x - 30 - stretch, y - 36, x - 18, y - 34);
  ctx.quadraticCurveTo(x, y - 24, x + 10, y - 18);
  ctx.lineTo(x + 66, y - 16);
  ctx.closePath();
  fillInk(ctx, '#c7cba3', 1.4);
  ctx.strokeStyle = 'rgba(90,96,60,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const px = x - 20 + k * 11;
    ctx.moveTo(px, y - 3);
    ctx.lineTo(px + 4, y - 9);
  }
  ctx.stroke();
  // horns: toward the knight (duel) -> up toward the spoonbill (look)
  const hx = x - 28 - stretch;
  const hy = y - 30;
  const toRider = Math.atan2(560 - hy, riderX - hx); // rider's body height in panel space
  const baseA = -2.5 + Math.sin(at * 2.3) * 0.08;
  const lookA = clamp(toRider, -2.9, -0.3);
  const ang = lerp(baseA, lookA, thumb ? 0 : look);
  for (const [off, len, w] of [
    [-0.18, 30, 2.6],
    [0.18, 26, 2.2],
  ]) {
    const a = ang + off;
    const tx = hx + Math.cos(a) * len;
    const ty = hy + Math.sin(a) * len;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(hx + Math.cos(a - 0.3) * len * 0.5, hy + Math.sin(a - 0.3) * len * 0.5, tx, ty);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = w + 2;
    ctx.stroke();
    ctx.strokeStyle = '#c7cba3';
    ctx.lineWidth = w;
    ctx.stroke();
    circle(ctx, tx, ty, 2.8);
    ctx.fillStyle = C.black;
    ctx.fill();
  }
  // shell: vermilion-rose spiral with gold bands
  ctx.beginPath();
  ctx.ellipse(sx, sy, 40, 37, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.rose;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(140,40,34,0.35)';
  ctx.beginPath();
  ctx.ellipse(sx + 10, sy + 14, 40, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(sx, sy, 40, 37, 0, 0, Math.PI * 2);
  inkStroke(ctx, 1.6);
  ctx.beginPath();
  for (let k = 0; k <= 70; k++) {
    const a = -Math.PI / 2 + k * 0.17;
    const r = 37 - k * 0.48;
    const px = sx + Math.cos(a) * r * 1.03;
    const py = sy + 2 + Math.sin(a) * r;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(251,247,236,0.8)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(sx - 6, sy - 6, 24, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
}

/** Speech scroll unrolling from the knight: "ecce alia bestia". */
function drawBanderole(ctx, lt, from, look) {
  const open = sstep(2.5, 3.5, lt) * (1 - sstep(6.4, 7.0, lt));
  if (open <= 0.01) return;
  const p0 = { x: from.x + 6, y: from.y - 4 };
  const p1 = { x: from.x + 70, y: from.y - 62 };
  const p2 = { x: from.x + 160, y: from.y + 6 };
  const p3 = { x: from.x + 262, y: from.y - 44 };
  const pts = K.sampleCubic(p0, p1, p2, p3, 48);
  // arclength
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = acc[acc.length - 1];
  const reveal = total * open;
  const W = 13.5;
  const top = [];
  const bot = [];
  let endI = 0;
  for (let i = 0; i < pts.length; i++) {
    if (acc[i] > reveal) break;
    endI = i;
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tg = Math.atan2(b.y - a.y, b.x - a.x);
    const w = W * (i < 3 ? 0.4 + i * 0.2 : 1);
    top.push({ x: pts[i].x - Math.sin(tg) * w, y: pts[i].y + Math.cos(tg) * w, tg });
    bot.push({ x: pts[i].x + Math.sin(tg) * w, y: pts[i].y - Math.cos(tg) * w });
  }
  if (top.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(top[0].x, top[0].y);
  for (const p of top) ctx.lineTo(p.x, p.y);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i].x, bot[i].y);
  ctx.closePath();
  ctx.fillStyle = '#faf3df';
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // shading on the twists
  ctx.strokeStyle = 'rgba(160,130,80,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 4; i < top.length; i += 6) {
    ctx.moveTo(top[i].x, top[i].y);
    ctx.lineTo(bot[i].x, bot[i].y);
  }
  ctx.stroke();
  // text along the scroll
  ctx.beginPath();
  ctx.moveTo(top[0].x, top[0].y);
  for (const p of top) ctx.lineTo(p.x, p.y);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i].x, bot[i].y);
  ctx.closePath();
  ctx.clip();
  ctx.font = blackletter(21);
  ctx.fillStyle = C.ink;
  const text = 'ecce alia bestia';
  const tw = ctx.measureText(text).width;
  let s = (total - tw) / 2 + 4;
  for (const ch of text) {
    const cw = ctx.measureText(ch).width;
    const sm = s + cw / 2;
    let i = 0;
    while (i < acc.length - 1 && acc[i + 1] < sm) i++;
    const u = (sm - acc[i]) / Math.max(1e-6, acc[i + 1] - acc[i]);
    const a = pts[i];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const px = lerp(a.x, b.x, u);
    const py = lerp(a.y, b.y, u);
    const tg = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(tg);
    ctx.fillStyle = ch === 'e' && s < (total - tw) / 2 + 10 ? C.verm : C.ink;
    ctx.fillText(ch, -cw / 2, 6);
    ctx.restore();
    s += cw;
  }
  ctx.restore();
  // the still-rolled end
  const e = pts[endI];
  const tg = top[top.length - 1].tg;
  const rr = 6 + (1 - open) * 5;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(tg);
  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 0.7, W + 1, 0, 0, Math.PI * 2);
  fillInk(ctx, '#efe2c2', 1.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 0.35, W * 0.5, 0, 0, Math.PI * 2);
  inkStroke(ctx, 0.9);
  ctx.restore();
  void look;
}

/** Marginal hybrid: hooded human head on a winged beast body, tail curling to a leaf. */
function drawHybrid(ctx, lt, at) {
  const { x, y } = HYBRID;
  // blows on the beats of bar 3 (the mill-turning fanfare)
  const inBar3 = lt >= 3.95 && lt < 6.05;
  const beatPh = (((lt - 4) / 0.5) % 1 + 1) % 1;
  const blow = inBar3 ? Math.exp(-beatPh * 5) : 0;
  const bob = inBar3 ? -blow * 2 : Math.sin(at * 2) * 1;
  // tail curling down into the vine
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 6);
  ctx.bezierCurveTo(x + 50, y + 20, x + 46, y + 56, x + 18, y + 60);
  ctx.bezierCurveTo(x - 2, y + 62, x - 6, y + 44, x + 8, y + 40);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 4.4;
  ctx.stroke();
  ivyPath(ctx, x + 8, y + 40, 15, -2.2);
  ctx.fillStyle = goldGrad(ctx, x - 8, y + 26, x + 12, y + 44);
  ctx.fill();
  inkStroke(ctx, 1);
  // bird legs perched on the vine
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 2, y + 14);
  ctx.lineTo(x - 6, y + 34);
  ctx.lineTo(x - 12, y + 36);
  ctx.moveTo(x + 8, y + 14);
  ctx.lineTo(x + 8, y + 34);
  ctx.lineTo(x + 2, y + 36);
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.ellipse(x + 4, y + bob, 22, 16, -0.25, 0, Math.PI * 2);
  fillInk(ctx, C.green, 1.4);
  // wing (vermilion, scalloped)
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 8 + bob);
  ctx.quadraticCurveTo(x + 22, y - 30 + bob, x + 40, y - 18 + bob);
  ctx.quadraticCurveTo(x + 34, y - 12 + bob, x + 36, y - 6 + bob);
  ctx.quadraticCurveTo(x + 26, y - 6 + bob, x + 26, y + 2 + bob);
  ctx.quadraticCurveTo(x + 14, y - 2 + bob, x + 6, y + 6 + bob);
  ctx.closePath();
  fillInk(ctx, C.verm, 1.2);
  ctx.strokeStyle = 'rgba(251,247,236,0.8)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 6 + bob);
  ctx.quadraticCurveTo(x + 20, y - 16 + bob, x + 34, y - 14 + bob);
  ctx.stroke();
  // neck + head in a lapis hood, facing up-left
  const hx = x - 18;
  const hy = y - 22 + bob;
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 6 + bob);
  ctx.quadraticCurveTo(x - 18, y - 12 + bob, hx + 2, hy + 8);
  ctx.lineTo(hx + 10, hy + 6);
  ctx.quadraticCurveTo(x - 4, y - 8 + bob, x, y - 10 + bob);
  ctx.closePath();
  fillInk(ctx, C.green, 1.1);
  circle(ctx, hx + 2, hy - 1, 10);
  fillInk(ctx, C.lapis, 1.2);
  headProfile(ctx, hx - 1, hy + 1, 6.5, -1, { mouthO: blow * 0.8, lookY: -1 });
  // puffed cheek
  circle(ctx, hx - 4, hy + 3, 2.6 + blow * 2.4);
  ctx.fillStyle = 'rgba(226,140,124,0.8)';
  ctx.fill();
  // long gold trumpet (busine) pointing up-left at the mill, with a pennon
  const mx = hx - 7;
  const my = hy + 4;
  const ta = -2.62 + (inBar3 ? -0.05 * blow : 0);
  const L = 84;
  const ex = mx + Math.cos(ta) * L;
  const ey = my + Math.sin(ta) * L;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.strokeStyle = goldGrad(ctx, mx, my, ex, ey);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineCap = 'round';
  // bell
  const nx = -Math.sin(ta);
  const ny = Math.cos(ta);
  ctx.beginPath();
  ctx.moveTo(ex + nx * 2.5, ey + ny * 2.5);
  ctx.lineTo(ex + Math.cos(ta) * 12 + nx * 8, ey + Math.sin(ta) * 12 + ny * 8);
  ctx.lineTo(ex + Math.cos(ta) * 12 - nx * 8, ey + Math.sin(ta) * 12 - ny * 8);
  ctx.lineTo(ex - nx * 2.5, ey - ny * 2.5);
  ctx.closePath();
  ctx.fillStyle = goldGrad(ctx, ex - 10, ey - 10, ex + 10, ey + 10);
  ctx.fill();
  inkStroke(ctx, 1.1);
  pushDyn(ex + Math.cos(ta) * 8, ey + Math.sin(ta) * 8, 6);
  // pennon hanging from the trumpet
  const pa = { x: mx + Math.cos(ta) * 34, y: my + Math.sin(ta) * 34 };
  const pb = { x: mx + Math.cos(ta) * 60, y: my + Math.sin(ta) * 60 };
  const flap = Math.sin(at * 5) * 3;
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.lineTo(pb.x + 2, pb.y + 22 + flap);
  ctx.lineTo((pa.x + pb.x) / 2 + 2, (pa.y + pb.y) / 2 + 16 + flap * 0.5);
  ctx.lineTo(pa.x + 2, pa.y + 22 + flap * 0.3);
  ctx.closePath();
  fillInk(ctx, C.lapis, 1.1);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo((pa.x + pb.x) / 2 + 1, (pa.y + pb.y) / 2 + 2);
  ctx.lineTo((pa.x + pb.x) / 2 + 1, (pa.y + pb.y) / 2 + 13 + flap * 0.4);
  ctx.moveTo((pa.x + pb.x) / 2 - 4, (pa.y + pb.y) / 2 + 7);
  ctx.lineTo((pa.x + pb.x) / 2 + 6, (pa.y + pb.y) / 2 + 7);
  ctx.stroke();
  // sound: little ink arcs from the bell
  if (blow > 0.05) {
    ctx.strokeStyle = `rgba(42,28,18,${0.85 * blow})`;
    ctx.lineWidth = 1.4;
    for (let k = 1; k <= 3; k++) {
      const r = 6 + k * 7 + (1 - blow) * 6;
      ctx.beginPath();
      ctx.arc(ex + Math.cos(ta) * 12, ey + Math.sin(ta) * 12, r, ta - 0.5, ta + 0.5);
      ctx.stroke();
    }
  }
}

function drawSparkles(ctx, at, spots) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < spots.length; i++) {
    const [x, y, r] = spots[i];
    const ph = K.hash11(i * 7.13 + 0.5) * 20;
    const sp = 0.6 + K.hash11(i * 3.7) * 0.9;
    const v = Math.max(0, Math.sin(at * sp * 2.2 + ph)) ** 14;
    if (v < 0.04) continue;
    const s = (3 + r * 0.6) * v;
    const ox = (K.hash11(i * 1.9) - 0.5) * r * 0.8;
    const oy = (K.hash11(i * 2.3) - 0.5) * r * 0.8;
    const cx = x + ox;
    const cy = y + oy;
    ctx.fillStyle = `rgba(255,246,200,${0.9 * v})`;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 1.8);
    ctx.lineTo(cx + s * 0.28, cy - s * 0.28);
    ctx.lineTo(cx + s * 1.8, cy);
    ctx.lineTo(cx + s * 0.28, cy + s * 0.28);
    ctx.lineTo(cx, cy + s * 1.8);
    ctx.lineTo(cx - s * 0.28, cy + s * 0.28);
    ctx.lineTo(cx - s * 1.8, cy);
    ctx.lineTo(cx - s * 0.28, cy - s * 0.28);
    ctx.closePath();
    ctx.fill();
    circle(ctx, cx, cy, s * 0.5);
    ctx.fill();
  }
  ctx.restore();
}

// ----- the rider: flat manuscript colours with gold hairlines -------------------------
const RIDER_STYLE = {
  plumage: '#fbf7ec',
  plumageShade: '#e6dcc3',
  mask: '#17120e',
  bill: '#17120e',
  eyeRing: '#e2b84a',
  legs: '#2a1c12',
  crest: '#d9a93a',
  breast: '#e9bb4c',
  frame: '#b32d2a',
  frameShade: '#8f2220',
  metal: '#3a2d22',
  tire: '#2a1c12',
  rim: '#c99a2e',
  saddle: '#6b3f1f',
  outline: '#2a1c12',
  outlineWidth: 1.8,
  shading: false,
  spokes: 10,
  pinwheel: { type: 'post', colors: ['#f5edd8'], stroke: '#2a1c12', lineWidth: 1.3 },
};

function drawRiderIlluminated(ctx, rig) {
  K.drawRider(ctx, rig, RIDER_STYLE);
  // gold hairlines down the frame tubes
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f3d77e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.lineTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  ctx.lineTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.moveTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.headTop.x, rig.headTop.y);
  ctx.moveTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  ctx.stroke();
  // gold hairline feathering on the folded wing + white-lead highlights on the body
  const sh = rig.wingShoulder;
  ctx.strokeStyle = 'rgba(201,154,46,0.95)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const fx = sh.x - 14 - k * 8;
    ctx.moveTo(fx, sh.y + 2 + k * 1.4);
    ctx.quadraticCurveTo(fx - 6, sh.y + 6 + k, fx - 12, sh.y + 12 + k * 1.2);
  }
  ctx.stroke();
  const b = rig.body;
  ctx.strokeStyle = 'rgba(201,154,46,0.9)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.rx - 3, b.ry - 3, b.tilt, Math.PI * 0.95, Math.PI * 1.55);
  ctx.stroke();
  // gold hairline round the head and down the neck
  ctx.beginPath();
  ctx.arc(rig.head.x, rig.head.y, rig.head.r - 2.2, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();
  // gold hub dots on the wheels
  for (const w of [rig.rearWheel, rig.frontWheel]) {
    circle(ctx, w.x, w.y, 4);
    ctx.fillStyle = goldGrad(ctx, w.x - 4, w.y - 4, w.x + 4, w.y + 4);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
  ctx.restore();
}

// =============================================================================
// timing
// =============================================================================
function yawAt(lt) {
  return lerp(YAW0, YAW1, sstep5(TURN0, TURN1, lt));
}

function sailAngle(lt) {
  const base = 0.38;
  const w = 2.3; // rad/s at full speed (~22 rpm)
  const ramp = 1.5;
  const u = lt - SPIN0;
  if (u <= 0) return base;
  if (u < ramp) return base - (w * u * u) / (2 * ramp);
  return base - (w * ramp) / 2 - w * (u - ramp);
}

// =============================================================================
// render
// =============================================================================
export function render(kit, slot, scene, params) {
  K = kit;
  const { ctx } = slot;
  const { t, rawLocalT, isThumbnail } = params;
  const lt = isThumbnail ? 7.3 : rawLocalT;
  const at = isThumbnail ? 3.1 : t;
  const riderX = params.riderLocalX;
  ctx.save();

  const page = kit.bake('postmill_page', P, P, (g, rng) => paintPage(g, rng));
  ctx.drawImage(page, 0, 0);
  const statics = GOLD_SPOTS.slice();
  GOLD_SPOTS_DYN.length = 0;

  // --- inside the miniature --------------------------------------------------
  ctx.save();
  ctx.beginPath();
  ctx.rect(PIC.x0, 0, PIC.x1 - PIC.x0, PIC.y1); // sails may break out above the frame
  ctx.clip();

  scaled(ctx, WINDHEAD, () => drawWindHead(ctx, lt, at));
  drawDonkeyTrain(ctx, lt, at);

  const phi = isThumbnail ? YAW1 : yawAt(lt);
  const M = millFrame(phi);
  const theta = isThumbnail ? 0.5 : sailAngle(lt);
  const sailsFront = M.fz > 0;

  // tailpole end and the miller's push
  const push = isThumbnail ? 0 : K.envelope(lt, 3.3, 4.0, TURN1 - 0.1, TURN1 + 0.5);
  const dirMove = Math.cos(phi) < 0 ? -1 : -1; // he walks the pole round leftward
  const tailZ = -(BUCK.D + TAIL.reach - BUCK.D) * M.fz;
  const items = [];
  items.push({ z: (BUCK.D + 17) * M.fz - (sailsFront ? 0 : 400), draw: () => drawSails(ctx, M, theta, sailsFront) });
  items.push({ z: -60, draw: () => drawTrestle(ctx, M, 'back') });
  items.push({ z: -1, draw: () => drawPost(ctx) });
  items.push({ z: 0, draw: () => drawBuck(ctx, M) });
  items.push({ z: 60, draw: () => drawTrestle(ctx, M, 'front') });
  items.push({ z: -(BUCK.D + 40) * M.fz + 0.5, draw: () => drawLadder(ctx, M) });
  items.push({
    z: tailZ + 1,
    draw: () => {
      const end = drawTailpole(ctx, M);
      // walking phase from the swept angle
      const step = (YAW0 - phi) * 9 + at * 0.4 * push;
      const p = isThumbnail ? 0.15 : 0.2 + 0.8 * push;
      const hand = { x: end.x + 2 * dirMove, y: end.y };
      scaled(ctx, { x: hand.x, y: hand.y, s: 1.2 }, () => drawMiller(ctx, hand, dirMove, step, p, at));
    },
  });
  items.sort((a, b) => a.z - b.z);
  for (const it of items) it.draw();
  ctx.restore();

  // --- the bas-de-page --------------------------------------------------------
  scaled(ctx, MONK, () => drawMonk(ctx, isThumbnail ? -5 : lt, at, riderX));
  const kn = scaled(ctx, KNIGHT, () => drawKnight(ctx, lt, at, riderX, isThumbnail));
  scaled(ctx, SNAIL, () => drawSnail(ctx, lt, at, riderX, kn.look, isThumbnail));
  if (!isThumbnail) drawBanderole(ctx, lt, sp(KNIGHT, kn.mouth), kn.look);
  scaled(ctx, HYBRID, () => drawHybrid(ctx, isThumbnail ? -5 : lt, at));

  drawSparkles(ctx, at, statics.concat(GOLD_SPOTS_DYN));

  // --- the rider on the bar-border --------------------------------------------
  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params);
    drawRiderIlluminated(ctx, rig);
  }

  ctx.restore();
}
