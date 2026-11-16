// src/scenes/hywind.js
// 《乘風騎行》 #17 浮動式離岸風場 · 2017 — Hywind Scotland, the first floating wind farm.
//
// Medium: a clean flat infographic — flat vector shapes, a mint/teal/navy base with a
// coral accent for the hero part (the floating spar), thin leader lines ending in dots,
// bold numbers, little icons, dimension lines, and a true-scale cross-section from the
// blade tip down to the seabed (1 m = 2.2 px everywhere in the section).
//
// Machine (off Peterhead, Scotland, 2017): five 6 MW turbines = 30 MW. Each three-bladed
// UPWIND rotor (Ø 154 m, hub ~98 m above the sea) sits on a SPAR BUOY: a ballasted steel
// cylinder 91 m long, Ø 14.4 m, 78 m of it under water (13 m freeboard), held by THREE
// catenary mooring chains (~900 m each) to suction anchors in 95–120 m of water; power
// leaves through a dynamic cable hung in a lazy wave. The spar is drawn pitching and
// heaving gently with the swell — it floats.
//
// The rider's road is a stylised coastal promenade deck at y = 700, just above sea level.
// Story (4 bars): bar 1–2 the infographic assembles itself on the beat (each callout
// draws its leader line and pops its label); bar 3 a callout pops onto the spoonbill:
// "黑面琵鷺 · 0 MW · 100% 人力"; bar 4 a second one notes that its pinwheel has three
// blades, just like the 6 MW machine.
//
// Numbers drawn (all from the verified notes): 5 × 6 MW = 30 MW, opened 2017, ~25 km off
// Peterhead; rotor Ø 154 m; hub ≈ 98–101 m above the sea (labelled 「約 100 m」); spar
// 91 m long, Ø 14.4 m, 78 m draft; water depth 95–120 m; 3 mooring chains of ~900 m with
// suction anchors; capacity factor ~54 % averaged over the first five years (operator-
// reported figure).

const P = 1000;
const TAU = Math.PI * 2;

const BG = '#eaf4f4';
const NAVY = '#0b3954';
const TEAL = '#087e8b';
const CORAL = '#ff5a5f';
const CRIMSON = '#c81d25';
const WHITE = '#ffffff';
const MIST = '#d3e6e8';
const TEAL_L = '#9fd0d3';
const TEAL_LL = '#c7e3e5';
const GREY = '#dbe5e7';
const SAND = '#e8dcc0';
const SAND_D = '#d3c29c';

// true-scale section: 1 m = S px
const S = 2.2;
const SL = 736; // sea level
const TX = 400; // tower axis
const HUB = { x: TX - 14, y: SL - 98 * S };
const R = 77 * S;
const KXR = 0.72; // rotor disc seen at 3/4 (faces the wind, upwind of the tower)
const SPAR_TOP = SL - 13 * S;
const SPAR_BOT = SL + 78 * S;
const SEABED = SL + 100 * S;
const PIVOT = { x: TX, y: SL + 50 * S };
const FAIR_Y = SL + 35 * S;
const DECK = { top: 700, bot: 714 };

// ghost row of the other four machines (smaller = farther)
const GHOSTS = [
  { x: 650, s: 0.5, ph: 1.3 },
  { x: 748, s: 0.41, ph: 2.6 },
  { x: 832, s: 0.34, ph: 0.4 },
  { x: 904, s: 0.29, ph: 3.5 },
];

// every CJK / full-width character drawn by this scene (baked or per frame)
const TEXTS =
  '海平面輪轂高約轉子直徑吃水水深單柱式浮筒長壓艙低重心錨鏈條各未按比例吸力錨動態海纜岸上' +
  '浮動式風場總容量部啟用固定式立在海床上用繫泊蘇格蘭外海北單機隨浪微幅擺動它浮著！' +
  '因數運轉頭年平均營商公布高度與深度依實際繪製除（）黑面琵鷺人力迷你三葉片跟一樣＋';
const LATIN = 'Peterhead0123456789 MWkmNØ·×~–−%→';
if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
  try {
    for (const w of ['500', '700']) document.fonts.load(`${w} 16px "Noto Sans TC"`, TEXTS + LATIN).catch(() => {});
    document.fonts.load('400 40px "Bebas Neue"', '0123456789MW%').catch(() => {});
  } catch (e) {
    /* offline: system fallback */
  }
}
let _fontsOk = false;
function fontsReady() {
  if (_fontsOk) return true;
  try {
    _fontsOk =
      document.fonts.check('500 16px "Noto Sans TC"', TEXTS) &&
      document.fonts.check('700 16px "Noto Sans TC"', TEXTS) &&
      document.fonts.check('400 40px "Bebas Neue"', '0123456789MW%');
    return _fontsOk;
  } catch (e) {
    return true;
  }
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const fract = (x) => x - Math.floor(x);
function backOut(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

let F_SANS = '"Noto Sans TC", sans-serif';
let F_NUM = '"Bebas Neue", Impact, sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** label pill: bold value + small caption; returns its box */
function pill(ctx, x, y, main, sub, opts = {}) {
  const { align = 'left', fill = WHITE, color = NAVY, subColor = TEAL, size = 16, alpha = 1, border = true } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `700 ${size}px ${F_SANS}`;
  const w1 = ctx.measureText(main).width;
  const subSize = Math.max(13, Math.round(size * 0.8));
  ctx.font = `500 ${subSize}px ${F_SANS}`;
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const padX = 9;
  const gap = sub ? 7 : 0;
  const W = w1 + w2 + gap + padX * 2;
  const H = size + 12;
  const x0 = align === 'left' ? x : align === 'right' ? x - W : x - W / 2;
  const y0 = y - H / 2;
  rr(ctx, x0, y0, W, H, H / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (border) {
    ctx.strokeStyle = 'rgba(11,57,84,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${F_SANS}`;
  ctx.fillText(main, x0 + padX, y + 0.5);
  if (sub) {
    ctx.fillStyle = subColor;
    ctx.font = `500 ${subSize}px ${F_SANS}`;
    ctx.fillText(sub, x0 + padX + w1 + gap, y + 1);
  }
  ctx.restore();
  return { x0, y0, W, H };
}

/** callout: dot at the anchor, elbow leader, label; prog 0..1 animates it in */
function callout(ctx, a, elbow, end, main, sub, prog, align = 'left', opts = {}) {
  if (prog <= 0) return;
  const p1 = sstep(0, 0.45, prog);
  const p2 = sstep(0.35, 1, prog);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // leader grows from the anchor
  const L1 = Math.hypot(elbow.x - a.x, elbow.y - a.y);
  const L2 = Math.hypot(end.x - elbow.x, end.y - elbow.y);
  const Lt = (L1 + L2) * p1;
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  if (Lt <= L1) {
    const u = L1 ? Lt / L1 : 1;
    ctx.lineTo(lerp(a.x, elbow.x, u), lerp(a.y, elbow.y, u));
  } else {
    ctx.lineTo(elbow.x, elbow.y);
    const u = L2 ? (Lt - L1) / L2 : 1;
    ctx.lineTo(lerp(elbow.x, end.x, u), lerp(elbow.y, end.y, u));
  }
  ctx.stroke();
  // anchor dot
  const pop = backOut(clamp(prog / 0.3, 0, 1));
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(a.x, a.y, 5 * pop, 0, TAU);
  ctx.fill();
  ctx.fillStyle = opts.dot || CORAL;
  ctx.beginPath();
  ctx.arc(a.x, a.y, 3.2 * pop, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (p2 > 0) {
    ctx.save();
    const sc = 0.85 + 0.15 * backOut(p2);
    ctx.translate(end.x, end.y);
    ctx.scale(sc, sc);
    pill(ctx, 0, 0, main, sub, { align, alpha: p2, ...opts });
    ctx.restore();
  }
}

function arrowHead(ctx, x, y, dx, dy, s = 6) {
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - ux * s - uy * s * 0.55, y - uy * s + ux * s * 0.55);
  ctx.lineTo(x - ux * s + uy * s * 0.55, y - uy * s - ux * s * 0.55);
  ctx.closePath();
  ctx.fill();
}

/** vertical dimension line with arrowheads and end ticks */
function dimV(g, x, y0, y1, color = NAVY) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(x, y0 + 5);
  g.lineTo(x, y1 - 5);
  g.moveTo(x - 7, y0);
  g.lineTo(x + 7, y0);
  g.moveTo(x - 7, y1);
  g.lineTo(x + 7, y1);
  g.stroke();
  arrowHead(g, x, y0, 0, -1, 7);
  arrowHead(g, x, y1, 0, 1, 7);
  g.restore();
}
function dashH(g, x0, x1, y, color = NAVY) {
  g.save();
  g.strokeStyle = color;
  g.globalAlpha = 0.5;
  g.lineWidth = 1;
  g.setLineDash([3, 4]);
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(x1, y);
  g.stroke();
  g.restore();
}

// -----------------------------------------------------------------------------
// icons
// -----------------------------------------------------------------------------
function iconTurbine(g, x, y, s, color = NAVY, ang = -0.3, spar = true) {
  // y = water line
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineCap = 'round';
  g.lineWidth = 2.2 * s;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - 30 * s);
  g.stroke();
  for (let i = 0; i < 3; i++) {
    const a = ang + (i * TAU) / 3;
    g.beginPath();
    g.moveTo(x, y - 30 * s);
    g.quadraticCurveTo(x + Math.cos(a + 0.25) * 8 * s, y - 30 * s + Math.sin(a + 0.25) * 8 * s, x + Math.cos(a) * 17 * s, y - 30 * s + Math.sin(a) * 17 * s);
    g.lineWidth = 2.6 * s;
    g.stroke();
  }
  g.beginPath();
  g.arc(x, y - 30 * s, 2.4 * s, 0, TAU);
  g.fill();
  if (spar) {
    g.fillStyle = CORAL;
    rr(g, x - 2.6 * s, y - 2 * s, 5.2 * s, 18 * s, 2 * s);
    g.fill();
  }
  g.restore();
}

function fish(ctx, x, y, s, dir, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.quadraticCurveTo(4, -7, -6, -1);
  ctx.lineTo(-13, -6);
  ctx.lineTo(-11, 0);
  ctx.lineTo(-13, 6);
  ctx.lineTo(-6, 1);
  ctx.quadraticCurveTo(4, 7, 12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(6.5, -1.2, 1.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// -----------------------------------------------------------------------------
// static background bake
// -----------------------------------------------------------------------------
function bakeBack(kit) {
  // keyed on font readiness so a bake made before the web fonts arrived is redone
  return kit.bake(`hywind_back_v2_${fontsReady() ? 'f' : 'n'}`, P, P, (g) => {
    g.fillStyle = BG;
    g.fillRect(0, 0, P, P);
    // faint infographic dot grid in the sky
    g.fillStyle = 'rgba(8,126,139,0.10)';
    for (let y = 40; y < SL - 10; y += 24) for (let x = 36; x < P - 30; x += 24) g.fillRect(x, y, 1.6, 1.6);

    // ---- header cards
    // left: 30 MW
    g.fillStyle = WHITE;
    rr(g, 44, 44, 280, 196, 14);
    g.fill();
    g.fillStyle = NAVY;
    g.font = `400 112px ${F_NUM}`;
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillText('30', 64, 156);
    const w30 = g.measureText('30').width;
    g.font = `400 46px ${F_NUM}`;
    g.fillStyle = TEAL;
    g.fillText('MW', 72 + w30, 156);
    g.font = `700 16px ${F_SANS}`;
    g.fillStyle = NAVY;
    g.fillText('浮動式風場總容量', 66, 184);
    g.font = `500 13px ${F_SANS}`;
    g.fillStyle = TEAL;
    g.fillText('5 部 × 6 MW · 2017 啟用', 66, 206);
    for (let i = 0; i < 5; i++) iconTurbine(g, 234 + (i % 3) * 30 + (i > 2 ? 15 : 0), i > 2 ? 150 : 104, 0.6, NAVY, -0.3 + i * 0.5);

    // middle: fixed vs floating
    g.fillStyle = WHITE;
    rr(g, 340, 44, 300, 196, 14);
    g.fill();
    g.font = `700 15px ${F_SANS}`;
    g.fillStyle = NAVY;
    g.textAlign = 'center';
    g.fillText('固定式', 420, 72);
    g.fillText('浮動式', 562, 72);
    g.font = `500 13px ${F_SANS}`;
    g.fillStyle = TEAL;
    g.fillText('立在海床上', 420, 228);
    g.fillText('用錨鏈繫泊', 562, 228);
    g.textAlign = 'left';
    // fixed: shallow water, monopile into seabed
    {
      const wy = 128;
      const sb = 172;
      g.fillStyle = TEAL_LL;
      g.fillRect(372, wy, 96, sb - wy);
      g.fillStyle = SAND;
      g.fillRect(372, sb, 96, 26);
      g.fillStyle = NAVY;
      g.fillRect(417, wy - 30, 6, sb - wy + 46);
      g.strokeStyle = NAVY;
      g.lineWidth = 2;
      iconTurbine(g, 420, wy - 6, 1.0, NAVY, -0.2, false);
      g.strokeStyle = TEAL;
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = 372; x <= 468; x += 2) g.lineTo(x, wy + Math.sin(x * 0.25) * 1.4);
      g.stroke();
    }
    // floating: deep water, spar + chains
    {
      const wy = 128;
      const sb = 206;
      g.fillStyle = TEAL_LL;
      g.fillRect(512, wy, 100, sb - wy);
      g.fillStyle = SAND;
      g.fillRect(512, sb, 100, 8);
      iconTurbine(g, 562, wy - 6, 1.0, NAVY, 0.4, false);
      g.fillStyle = CORAL;
      rr(g, 558, wy - 6, 8, 52, 3);
      g.fill();
      g.strokeStyle = NAVY;
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(560, wy + 22);
      g.quadraticCurveTo(530, sb - 4, 516, sb);
      g.moveTo(564, wy + 22);
      g.quadraticCurveTo(596, sb - 4, 610, sb);
      g.stroke();
      g.strokeStyle = TEAL;
      g.lineWidth = 1.5;
      g.beginPath();
      for (let x = 512; x <= 612; x += 2) g.lineTo(x, wy + Math.sin(x * 0.25) * 1.4);
      g.stroke();
    }
    g.fillStyle = TEAL_L;
    g.fillRect(490, 70, 1.5, 150);

    // right: locator
    g.fillStyle = WHITE;
    rr(g, 656, 44, 300, 196, 14);
    g.fill();
    {
      g.save();
      rr(g, 656, 44, 300, 196, 14);
      g.clip();
      g.fillStyle = TEAL_LL;
      g.fillRect(656, 44, 300, 196);
      // schematic coastline: land on the west (left), the North Sea to the east
      g.fillStyle = WHITE;
      g.beginPath();
      g.moveTo(656, 44);
      g.lineTo(752, 44);
      g.bezierCurveTo(770, 70, 760, 92, 776, 112);
      g.bezierCurveTo(790, 128, 786, 140, 780, 152);
      g.bezierCurveTo(772, 170, 760, 186, 752, 240);
      g.lineTo(656, 240);
      g.closePath();
      g.fill();
      g.strokeStyle = TEAL;
      g.lineWidth = 1.5;
      g.stroke();
      g.restore();
      // Peterhead pin
      const px = 782;
      const py = 132;
      g.fillStyle = CORAL;
      g.beginPath();
      g.arc(px, py - 12, 7, Math.PI * 0.85, Math.PI * 2.15);
      g.lineTo(px, py);
      g.closePath();
      g.fill();
      g.fillStyle = WHITE;
      g.beginPath();
      g.arc(px, py - 12, 2.6, 0, TAU);
      g.fill();
      g.fillStyle = NAVY;
      g.font = `700 14px ${F_SANS}`;
      g.textAlign = 'right';
      g.fillText('Peterhead', px - 10, py - 18);
      g.font = `500 13px ${F_SANS}`;
      g.fillStyle = TEAL;
      g.fillText('蘇格蘭', px - 10, py - 2);
      // dashed distance to the farm
      g.strokeStyle = NAVY;
      g.lineWidth = 1.2;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(px + 6, py - 10);
      g.lineTo(880, py - 10);
      g.stroke();
      g.setLineDash([]);
      g.textAlign = 'center';
      g.font = `700 13px ${F_SANS}`;
      g.fillStyle = NAVY;
      g.fillText('外海 ~25 km', 832, py - 18);
      // the five turbines (plan view dots)
      for (const [dx, dy] of [
        [0, -26],
        [12, -14],
        [2, 0],
        [14, 12],
        [4, 26],
      ]) {
        g.fillStyle = NAVY;
        g.beginPath();
        g.arc(894 + dx, py - 10 + dy, 4.2, 0, TAU);
        g.fill();
      }
      // compass
      g.fillStyle = NAVY;
      g.beginPath();
      g.moveTo(930, 66);
      g.lineTo(936, 84);
      g.lineTo(930, 80);
      g.lineTo(924, 84);
      g.closePath();
      g.fill();
      g.font = `700 13px ${F_SANS}`;
      g.fillText('N', 930, 99);
      g.font = `500 13px ${F_SANS}`;
      g.fillStyle = TEAL;
      g.fillText('北海', 900, 220);
      g.textAlign = 'left';
    }

    // ---- donut: capacity factor
    {
      const cx = 124;
      const cy = 394;
      const r = 40;
      g.lineWidth = 13;
      g.strokeStyle = TEAL_LL;
      g.beginPath();
      g.arc(cx, cy, r, 0, TAU);
      g.stroke();
      g.strokeStyle = TEAL;
      g.lineCap = 'butt';
      g.beginPath();
      g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * 0.54);
      g.stroke();
      g.fillStyle = NAVY;
      g.textAlign = 'center';
      g.font = `400 34px ${F_NUM}`;
      g.fillText('54%', cx, cy + 12);
      g.font = `700 14px ${F_SANS}`;
      g.fillText('容量因數', cx, cy + 72);
      g.font = `500 13px ${F_SANS}`;
      g.fillStyle = TEAL;
      g.fillText('運轉頭 5 年平均', cx, cy + 91);
      g.fillText('（營運商公布）', cx, cy + 108);
      g.textAlign = 'left';
    }

    // ---- sea: depth bands (flat steps) and seabed
    const bands = [
      [SL, SL + 20 * S, '#bfe0e2'],
      [SL + 20 * S, SL + 40 * S, '#acd6d9'],
      [SL + 40 * S, SL + 60 * S, '#98cbd0'],
      [SL + 60 * S, SL + 80 * S, '#84bfc5'],
      [SL + 80 * S, P, '#72b3ba'],
    ];
    for (const [y0, y1, c] of bands) {
      g.fillStyle = c;
      g.fillRect(0, y0, P, y1 - y0);
    }
    // seabed with a hint of depth (near edge lower)
    g.fillStyle = SAND;
    g.beginPath();
    g.moveTo(0, SEABED - 6);
    g.lineTo(P, SEABED - 10);
    g.lineTo(P, P);
    g.lineTo(0, P);
    g.closePath();
    g.fill();
    g.fillStyle = SAND_D;
    for (let i = 0; i < 70; i++) {
      const x = (i * 97.3) % P;
      const y = SEABED + ((i * 37) % 18);
      g.beginPath();
      g.ellipse(x, y, 3 + (i % 3), 1.6, 0, 0, TAU);
      g.fill();
    }
    g.strokeStyle = SAND_D;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(0, SEABED - 6);
    g.lineTo(P, SEABED - 10);
    g.stroke();

    // ---- depth ruler (left)
    g.strokeStyle = NAVY;
    g.fillStyle = NAVY;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(44, SL);
    g.lineTo(44, SEABED);
    g.stroke();
    g.font = `500 12px ${F_SANS}`;
    g.textBaseline = 'middle';
    for (let d = 0; d <= 100; d += 20) {
      const y = SL + d * S;
      g.beginPath();
      g.moveTo(44, y);
      g.lineTo(d % 40 === 0 ? 56 : 52, y);
      g.stroke();
      g.fillText(d === 0 ? '0 m' : `−${d}`, 60, y);
    }
    g.textBaseline = 'alphabetic';

    // scale note
    g.font = `500 13px ${F_SANS}`;
    g.fillStyle = TEAL;
    g.textAlign = 'right';
    g.fillText('高度與深度依實際比例繪製（錨鏈長度除外）', 956, 268);
    g.textAlign = 'left';

    // ---- static dimension lines (true scale)
    // hub height
    dashH(g, 224, HUB.x - 8, HUB.y);
    dimV(g, 232, HUB.y, SL);
    // draft along the spar
    dimV(g, TX + 46, SL, SPAR_BOT);
    dashH(g, TX + 18, TX + 52, SPAR_BOT);
    // water depth (right)
    dimV(g, 944, SL, SEABED - 9);
    // rotor diameter (vertical diameter is true length in this view)
    dashH(g, HUB.x, 590, HUB.y - R);
    dashH(g, HUB.x, 590, HUB.y + R);
    dimV(g, 584, HUB.y - R, HUB.y + R);
  });
}

function bakeDeck(kit) {
  // the promenade (breakwater crest) the rider uses, with a railing behind
  return kit.bake('hywind_deck_v1', P, 120, (g) => {
    const y0 = 0; // maps to y = 640
    const top = DECK.top - 640;
    const bot = DECK.bot - 640;
    // railing (behind the rider)
    g.strokeStyle = 'rgba(11,57,84,0.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, top - 30);
    g.lineTo(P, top - 30);
    g.moveTo(0, top - 16);
    g.lineTo(P, top - 16);
    for (let x = 18; x < P; x += 64) {
      g.moveTo(x, top - 30);
      g.lineTo(x, top);
    }
    g.stroke();
    void y0;
    // deck slab
    g.fillStyle = GREY;
    g.fillRect(0, top, P, 6);
    g.fillStyle = NAVY;
    g.fillRect(0, top + 6, P, bot - top - 6);
    g.fillStyle = TEAL;
    for (let x = 0; x < P; x += 40) g.fillRect(x + 8, top + 2, 18, 2);
    // breakwater armour blocks under the deck (flat, stylised)
    for (let i = 0; i < 26; i++) {
      const x = i * 40 + (i % 2) * 10 - 10;
      g.fillStyle = i % 3 === 0 ? '#5f8fa3' : '#6f9db0';
      rr(g, x, bot, 36, 12, 5);
      g.fill();
    }
  });
}

// -----------------------------------------------------------------------------
// floating machine
// -----------------------------------------------------------------------------
function pitchState(T, ph = 0, amp = 1) {
  // gentle pitch (rad) and heave (px) of the floating body in the swell
  const th = amp * ((1.25 * Math.sin((TAU * T) / 4 + ph) + 0.35 * Math.sin((TAU * T) / 1.7 + ph * 2)) * Math.PI) / 180;
  const hv = amp * 1.8 * Math.sin((TAU * T) / 4 + ph + 1.1);
  return { th, hv };
}
function xform(p, st, pivot) {
  const c = Math.cos(st.th);
  const s = Math.sin(st.th);
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c + st.hv };
}

function drawRotor(ctx, hub, Rr, ang, kx, colors = {}) {
  const fill = colors.fill || WHITE;
  const shade = colors.shade || GREY;
  const line = colors.line || NAVY;
  const lw = colors.lw || 1.2;
  for (let i = 0; i < 3; i++) {
    const a = ang + (i * TAU) / 3;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const pt = (u, v) => ({ x: hub.x + (ca * u - sa * v) * kx, y: hub.y + (sa * u + ca * v) });
    const shape = [
      pt(Rr * 0.06, -Rr * 0.03),
      pt(Rr * 0.2, -Rr * 0.045),
      pt(Rr * 0.6, -Rr * 0.03),
      pt(Rr, -Rr * 0.006),
      pt(Rr, Rr * 0.006),
      pt(Rr * 0.6, Rr * 0.022),
      pt(Rr * 0.24, Rr * 0.075),
      pt(Rr * 0.1, Rr * 0.05),
      pt(Rr * 0.06, Rr * 0.03),
    ];
    ctx.beginPath();
    ctx.moveTo(shape[0].x, shape[0].y);
    for (let k = 1; k < 3; k++) ctx.lineTo(shape[k].x, shape[k].y);
    ctx.quadraticCurveTo(shape[3].x, shape[3].y, shape[4].x, shape[4].y);
    for (let k = 5; k < shape.length; k++) ctx.lineTo(shape[k].x, shape[k].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    // flat two-tone: trailing half shaded
    ctx.beginPath();
    const m0 = pt(Rr * 0.08, 0);
    const m1 = pt(Rr * 0.98, 0.002 * Rr);
    ctx.moveTo(m0.x, m0.y);
    ctx.lineTo(m1.x, m1.y);
    for (let k = 4; k < shape.length; k++) ctx.lineTo(shape[k].x, shape[k].y);
    ctx.closePath();
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(shape[0].x, shape[0].y);
    for (let k = 1; k < 3; k++) ctx.lineTo(shape[k].x, shape[k].y);
    ctx.quadraticCurveTo(shape[3].x, shape[3].y, shape[4].x, shape[4].y);
    for (let k = 5; k < shape.length; k++) ctx.lineTo(shape[k].x, shape[k].y);
    ctx.closePath();
    ctx.strokeStyle = line;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** spar + tower + nacelle + rotor, in body coordinates (pitch applied by caller) */
function drawFloater(ctx, sc, rotAng, opts = {}) {
  const ghost = !!opts.ghost;
  const cx = opts.x;
  const sl = SL;
  const m = (v) => v * S * sc;
  const ink = ghost ? 'rgba(11,57,84,0.35)' : NAVY;
  const lw = ghost ? 1 : 1.3;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // --- spar (under water from the deck down)
  const topY = sl - m(13);
  const botY = sl + m(78);
  const wHalfTop = m(4.75);
  const wHalfBot = m(7.2);
  const tap0 = sl + m(10);
  const tap1 = sl + m(22);
  const spar = new Path2D();
  spar.moveTo(cx - wHalfTop, topY);
  spar.lineTo(cx + wHalfTop, topY);
  spar.lineTo(cx + wHalfTop, tap0);
  spar.lineTo(cx + wHalfBot, tap1);
  spar.lineTo(cx + wHalfBot, botY - m(3));
  spar.quadraticCurveTo(cx + wHalfBot, botY, cx, botY + m(0.5));
  spar.quadraticCurveTo(cx - wHalfBot, botY, cx - wHalfBot, botY - m(3));
  spar.lineTo(cx - wHalfBot, tap1);
  spar.lineTo(cx - wHalfTop, tap0);
  spar.closePath();
  ctx.fillStyle = ghost ? 'rgba(255,90,95,0.28)' : CORAL;
  ctx.fill(spar);
  if (!ghost) {
    // flat shade on the right half
    ctx.save();
    ctx.clip(spar);
    ctx.fillStyle = 'rgba(200,29,37,0.28)';
    ctx.fillRect(cx + m(1.2), topY, wHalfBot * 2, botY - topY + 4);
    // ballast zone (rock + sea water) at the bottom
    ctx.fillStyle = CRIMSON;
    ctx.fillRect(cx - wHalfBot - 2, botY - m(22), wHalfBot * 2 + 4, m(23));
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = -8; k < 12; k++) {
      ctx.moveTo(cx - wHalfBot + k * 6, botY + 2);
      ctx.lineTo(cx - wHalfBot + k * 6 + 22, botY - m(22));
    }
    ctx.stroke();
    // ring stiffener bands
    ctx.fillStyle = 'rgba(11,57,84,0.18)';
    for (const d of [30, 45, 60]) ctx.fillRect(cx - wHalfBot, sl + m(d), wHalfBot * 2, 2);
    ctx.restore();
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.stroke(spar);
    // fairlead brackets
    ctx.fillStyle = NAVY;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sx * (wHalfBot + 1.5), FAIR_Y, 2.8, 0, TAU);
      ctx.fill();
    }
  }
  // --- tower (white, flat two-tone)
  const tBot = topY;
  const tTop = sl - m(95);
  const tw0 = m(3.9);
  const tw1 = m(2.3);
  const tower = new Path2D();
  tower.moveTo(cx - tw0, tBot);
  tower.lineTo(cx - tw1, tTop);
  tower.lineTo(cx + tw1, tTop);
  tower.lineTo(cx + tw0, tBot);
  tower.closePath();
  ctx.fillStyle = ghost ? 'rgba(255,255,255,0.75)' : WHITE;
  ctx.fill(tower);
  if (!ghost) {
    ctx.fillStyle = GREY;
    ctx.beginPath();
    ctx.moveTo(cx + tw0 * 0.15, tBot);
    ctx.lineTo(cx + tw1 * 0.15, tTop);
    ctx.lineTo(cx + tw1, tTop);
    ctx.lineTo(cx + tw0, tBot);
    ctx.closePath();
    ctx.fill();
    // access platform / flange at the top of the spar (flat navy band)
    ctx.fillStyle = NAVY;
    ctx.fillRect(cx - tw0 - 3, tBot - 4, tw0 * 2 + 6, 4);
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.stroke(tower);
  // --- nacelle (direct-drive: big generator ring right behind the hub)
  const hub = { x: cx - m(6.4), y: sl - m(98) };
  const nac = new Path2D();
  rrPath(nac, hub.x + m(3), hub.y - m(4.2), m(17), m(8.6), m(2.5));
  ctx.fillStyle = ghost ? 'rgba(255,255,255,0.8)' : WHITE;
  ctx.fill(nac);
  if (!ghost) {
    ctx.fillStyle = GREY;
    ctx.fillRect(hub.x + m(3), hub.y + m(0.6), m(16.5), m(3.4));
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.stroke(nac);
  // generator ring
  ctx.beginPath();
  ctx.ellipse(hub.x + m(3.2), hub.y, m(1.8), m(4.6), 0, 0, TAU);
  ctx.fillStyle = ghost ? 'rgba(219,229,231,0.8)' : GREY;
  ctx.fill();
  ctx.stroke();
  // rotor (upwind: in front of the tower) + spinner
  drawRotor(ctx, hub, m(77), rotAng, KXR, ghost ? { fill: 'rgba(255,255,255,0.78)', shade: 'rgba(219,229,231,0.7)', line: ink, lw: 1 } : {});
  ctx.beginPath();
  ctx.ellipse(hub.x - m(1.2), hub.y, m(2.6), m(3), 0, 0, TAU);
  ctx.fillStyle = ghost ? 'rgba(255,255,255,0.9)' : WHITE;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.restore();
  return hub;
}
function rrPath(p, x, y, w, h, r) {
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.arcTo(x + w, y, x + w, y + r, r);
  p.lineTo(x + w, y + h - r);
  p.arcTo(x + w, y + h, x + w - r, y + h, r);
  p.lineTo(x + r, y + h);
  p.arcTo(x, y + h, x, y + h - r, r);
  p.lineTo(x, y + r);
  p.arcTo(x, y, x + r, y, r);
  p.closePath();
}

/** catenary-ish mooring line: fairlead -> touchdown (tangent to seabed) -> anchor */
function chain(ctx, f, td, anchor, color, w, breakMark) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(f.x, f.y);
  const c = { x: f.x + (td.x - f.x) * 0.38, y: td.y };
  ctx.quadraticCurveTo(c.x, c.y, td.x, td.y);
  ctx.lineTo(anchor.x, anchor.y);
  ctx.stroke();
  // chain links
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = w * 0.45;
  ctx.beginPath();
  ctx.moveTo(f.x, f.y);
  ctx.quadraticCurveTo(c.x, c.y, td.x, td.y);
  ctx.lineTo(anchor.x, anchor.y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (breakMark) {
    // "not to scale" break on the long seabed run
    const bx = lerp(td.x, anchor.x, 0.5);
    const by = lerp(td.y, anchor.y, 0.5);
    ctx.fillStyle = SAND;
    ctx.fillRect(bx - 5, by - 7, 10, 14);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx - 7, by + 6);
    ctx.lineTo(bx - 1, by - 6);
    ctx.moveTo(bx + 1, by + 6);
    ctx.lineTo(bx + 7, by - 6);
    ctx.stroke();
  }
  ctx.restore();
}

function anchorIcon(ctx, x, y, s = 1, alpha = 1) {
  // suction anchor: an upturned steel bucket sucked into the seabed
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = CRIMSON;
  rr(ctx, x - 9 * s, y - 4 * s, 18 * s, 20 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillRect(x - 10 * s, y - 6 * s, 20 * s, 3.5 * s);
  ctx.fillStyle = 'rgba(232,220,192,0.75)';
  ctx.fillRect(x - 10 * s, y + 4 * s, 20 * s, 14 * s);
  ctx.restore();
}

// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------
const RIDER_STYLE = {
  plumage: WHITE,
  plumageShade: '#d7e8ea',
  mask: '#0a1822',
  bill: '#0a1822',
  eyeRing: '#f2b134',
  legs: NAVY,
  crest: '#f2c14e',
  breast: '#f6d77e',
  frame: TEAL,
  frameShade: '#066a74',
  metal: NAVY,
  tire: NAVY,
  rim: TEAL_L,
  saddle: NAVY,
  outline: NAVY,
  outlineWidth: 1.2,
  shading: false,
  spokes: 10,
};

export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const thumb = !!params.isThumbnail;
  const T = thumb ? 4 : params.rawLocalT;
  F_SANS = kit.FONT.sans;
  F_NUM = kit.FONT.poster;

  const back = bakeBack(kit);
  const deck = bakeDeck(kit);

  ctx.save();
  ctx.drawImage(back, 0, 0);

  // ---- sky life: flat clouds and wind streamlines from the west
  {
    ctx.save();
    for (const [cx0, cy, w, sp] of [
      [120, 300, 110, 5],
      [640, 286, 90, 4],
      [860, 520, 80, 6],
    ]) {
      const x = ((cx0 + (thumb ? 0 : T) * sp) % 1060) - 30;
      ctx.fillStyle = WHITE;
      rr(ctx, x, cy, w, 22, 11);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + w * 0.38, cy + 2, 16, Math.PI, TAU);
      ctx.arc(x + w * 0.62, cy + 4, 12, Math.PI, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = TEAL;
    ctx.fillStyle = TEAL;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (const [y, ph, len, x0, span] of [
      [292, 0.0, 90, 40, 230],
      [520, 0.45, 70, 40, 150],
      [600, 0.2, 60, 40, 150],
      [318, 0.7, 64, 620, 260],
      [578, 0.3, 60, 560, 300],
    ]) {
      const u = fract((thumb ? 0.5 : T * 0.32) + ph);
      const x = x0 + u * span;
      ctx.globalAlpha = Math.sin(Math.PI * u) * 0.9;
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const xx = x + (k / 12) * len;
        const yy = y + Math.sin(xx * 0.06) * 3;
        if (k === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      arrowHead(ctx, x + len + 2, y + Math.sin((x + len) * 0.06) * 3, 1, 0, 7);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---- the other four machines, farther away (ghosted)
  const rotW = TAU / 6; // 10 rpm, clockwise seen from upwind
  for (const gh of GHOSTS) {
    const st = pitchState(thumb ? 1 : T, gh.ph, 0.8);
    const piv = { x: gh.x, y: SL + 50 * S * gh.s };
    ctx.save();
    ctx.translate(0, st.hv * gh.s);
    ctx.translate(piv.x, piv.y);
    ctx.rotate(st.th);
    ctx.translate(-piv.x, -piv.y);
    drawFloater(ctx, gh.s, (thumb ? 0.6 : T) * rotW + gh.ph, { x: gh.x, ghost: true });
    ctx.restore();
  }

  // ---- the hero machine
  const st = thumb ? { th: 0.004, hv: 0 } : pitchState(T, 0, 1);
  const rotAng = (thumb ? 0.35 : T * rotW) + 0.2;
  const fairL = xform({ x: TX - 7.2 * S - 1.5, y: FAIR_Y }, st, PIVOT);
  const fairR = xform({ x: TX + 7.2 * S + 1.5, y: FAIR_Y }, st, PIVOT);
  const fairC = xform({ x: TX, y: FAIR_Y + 3 }, st, PIVOT);
  // far mooring line (behind the spar, toward the back-left)
  chain(ctx, fairL, { x: TX - 120, y: SEABED - 12 }, { x: 196, y: SEABED - 12 }, 'rgba(11,57,84,0.45)', 3, false);
  anchorIcon(ctx, 188, SEABED - 12, 0.75, 0.55);
  ctx.save();
  ctx.translate(0, st.hv);
  ctx.translate(PIVOT.x, PIVOT.y);
  ctx.rotate(st.th);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  drawFloater(ctx, 1, rotAng, { x: TX });
  ctx.restore();
  // dynamic export cable: lazy wave off the spar, then along the seabed toward shore (west)
  {
    const c0 = xform({ x: TX - 10, y: SL + 52 * S }, st, PIVOT);
    const hump = { x: TX - 86, y: SL + 66 * S };
    const td = { x: TX - 150, y: SEABED - 3 };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f2b134';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(c0.x, c0.y);
    ctx.bezierCurveTo(c0.x - 10, c0.y + 70, hump.x + 30, hump.y + 30, hump.x, hump.y);
    ctx.bezierCurveTo(hump.x - 26, hump.y - 22, td.x + 30, td.y - 10, td.x, td.y);
    ctx.lineTo(26, td.y);
    ctx.stroke();
    // buoyancy modules on the hump
    ctx.fillStyle = '#f2b134';
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.ellipse(hump.x + k * 8 + 2, hump.y - 2 - (2 - Math.abs(k)) * 2.5, 4, 5.5, 0, 0, TAU);
      ctx.fill();
    }
    // power pulses flowing to shore
    ctx.fillStyle = CORAL;
    for (let k = 0; k < 6; k++) {
      const u = fract((thumb ? 0.3 : T * 0.18) + k / 6);
      const x = td.x - u * (td.x - 40);
      ctx.beginPath();
      ctx.arc(x, td.y, 2.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // near and right mooring lines (in front)
  chain(ctx, fairC, { x: TX - 150, y: SEABED + 8 }, { x: 122, y: SEABED + 8 }, NAVY, 3.4, true);
  anchorIcon(ctx, 112, SEABED + 8, 1, 1);
  chain(ctx, fairR, { x: TX + 210, y: SEABED - 4 }, { x: 760, y: SEABED - 4 }, NAVY, 3.4, true);
  anchorIcon(ctx, 768, SEABED - 4, 0.95, 1);

  // fish
  {
    const tt = thumb ? 2 : T;
    fish(ctx, ((900 - tt * 14) % 1000 + 1000) % 1000, 784, 1, -1, '#5ea9b1');
    fish(ctx, ((220 + tt * 10) % 1000 + 1000) % 1000, 868, 0.8, 1, '#5ea9b1');
    fish(ctx, ((620 + tt * 18) % 1000 + 1000) % 1000, 908, 0.7, 1, '#4f9aa3');
  }

  // sea surface (waves cross the spar at the waterline)
  {
    const tt = thumb ? 0 : T;
    ctx.save();
    ctx.fillStyle = 'rgba(234,244,244,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, SL - 6);
    for (let x = 0; x <= P; x += 10) ctx.lineTo(x, SL + Math.sin(x * 0.045 - tt * 2.4) * 3 + Math.sin(x * 0.11 + tt * 1.3) * 1.2);
    ctx.lineTo(P, SL - 12);
    ctx.lineTo(0, SL - 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = TEAL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= P; x += 6) {
      const y = SL + Math.sin(x * 0.045 - tt * 2.4) * 3 + Math.sin(x * 0.11 + tt * 1.3) * 1.2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---- callouts assemble on the beat (bar 1–2); all shown in the thumbnail
  const rev = (t0) => (thumb ? 1 : clamp((T - t0) / 0.45, 0, 1));
  const hub = xform({ x: HUB.x, y: HUB.y }, st, PIVOT);
  const nacA = xform({ x: TX + 10, y: HUB.y - 9 }, st, PIVOT);
  const sparA = xform({ x: TX + 15.8, y: SL + 30 * S }, st, PIVOT);
  const ballA = xform({ x: TX + 15.8, y: SPAR_BOT - 22 }, st, PIVOT);
  // static dimension labels
  pill(ctx, 232, (HUB.y + SL) / 2, '約 100 m', '輪轂高', { align: 'center', alpha: rev(0.0) });
  // at the top end of the rotor dimension line: clear of the rider's head (y ≈ 470–520)
  pill(ctx, 596, HUB.y - R, 'Ø 154 m', '轉子直徑', { align: 'left', alpha: rev(0.5) });
  callout(ctx, nacA, { x: 498, y: 296 }, { x: 510, y: 296 }, '6 MW', '單機容量', rev(1.0));
  pill(ctx, 72, SL + 22, '海平面', null, { align: 'left', alpha: rev(1.5), size: 13 });
  pill(ctx, TX + 46, SL + 40 * S, '78 m', '吃水', { align: 'center', alpha: rev(2.0) });
  pill(ctx, 944, SL + 44 * S, '95–120 m', '水深', { align: 'right', alpha: rev(2.5) });
  callout(ctx, sparA, { x: TX + 92, y: SL + 22 * S }, { x: TX + 104, y: SL + 22 * S }, '單柱式浮筒', '長 91 m · Ø 14.4 m', rev(2.75));
  callout(ctx, ballA, { x: TX + 92, y: SPAR_BOT - 8 }, { x: TX + 104, y: SPAR_BOT - 8 }, '壓艙', '壓低重心', rev(3.0));
  callout(ctx, { x: TX + 160, y: SEABED - 9 }, { x: 640, y: 876 }, { x: 652, y: 876 }, '3 條錨鏈', '各約 900 m（未按比例）', rev(3.25));
  callout(ctx, { x: 768, y: SEABED - 10 }, { x: 800, y: 922 }, { x: 812, y: 922 }, '吸力錨', null, rev(3.5));
  callout(ctx, { x: TX - 86, y: SL + 66 * S - 8 }, { x: TX - 140, y: SL + 46 * S }, { x: TX - 152, y: SL + 46 * S }, '動態海纜', '→ 岸上', rev(3.75), 'right');
  // "it floats!" pitch indicator at the nacelle
  {
    const a = rev(1.25);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = CORAL;
      ctx.fillStyle = CORAL;
      ctx.lineWidth = 2;
      const cx = TX;
      const cy = 318;
      ctx.beginPath();
      ctx.arc(TX, PIVOT.y, PIVOT.y - cy, -Math.PI / 2 - 0.07, -Math.PI / 2 + 0.07);
      ctx.stroke();
      const r0 = PIVOT.y - cy;
      arrowHead(ctx, TX + Math.cos(-Math.PI / 2 + 0.075) * r0, PIVOT.y + Math.sin(-Math.PI / 2 + 0.075) * r0, 1, 0.08, 7);
      arrowHead(ctx, TX + Math.cos(-Math.PI / 2 - 0.075) * r0, PIVOT.y + Math.sin(-Math.PI / 2 - 0.075) * r0, -1, 0.08, 7);
      ctx.restore();
      pill(ctx, cx - 40, cy, '隨浪微幅擺動', '它浮著！', { align: 'right', alpha: a, size: 13, color: CRIMSON, subColor: NAVY });
    }
  }

  // ---- promenade deck
  ctx.drawImage(deck, 0, 640);

  // ---- the rider + the gag callouts
  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params);
    ctx.save();
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rig.poleBase.x, rig.poleBase.y);
    ctx.lineTo(rig.poleTop.x, rig.poleTop.y);
    ctx.stroke();
    ctx.restore();
    // teal blades + white hub (the era's two pinwheel colours) so the mini rotor reads
    // even when it passes in front of the white 6 MW rotor
    kit.drawPinwheel(ctx, rig.pinHub, rig.pinwheelAngle, { type: 'three', colors: [TEAL, WHITE], stroke: NAVY, lineWidth: 1.3, time: rig.time });
    kit.drawRider(ctx, rig, { ...RIDER_STYLE, showPinwheel: false });

    const out = thumb ? 1 : 1 - sstep(8.3, 8.9, T);
    const g1 = thumb ? 1 : clamp((T - 4.0) / 0.5, 0, 1) * out;
    if (g1 > 0) {
      const a = { x: rig.head.x + 2, y: rig.head.y - rig.head.r - 2 };
      const lx = clamp(a.x + 46, 150, 830);
      const ly = 440;
      callout(ctx, a, { x: lx, y: ly + 8 }, { x: lx, y: ly }, '黑面琵鷺', '0 MW · 100% 人力', g1, 'center', { dot: TEAL });
    }
    const g2 = thumb ? 0 : clamp((T - 6.0) / 0.5, 0, 1) * out;
    if (g2 > 0) {
      const a = { x: rig.pinHub.x, y: rig.pinHub.y - rig.pinHub.r - 3 };
      const lx = clamp(a.x - 10, 120, 860);
      const ly = 400;
      callout(ctx, a, { x: lx, y: ly + 8 }, { x: lx, y: ly }, '迷你轉子', '三葉片 · 跟 6 MW 一樣', g2, 'center', { dot: TEAL });
    }
  }
  ctx.restore();
}
