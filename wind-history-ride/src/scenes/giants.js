// src/scenes/giants.js
// #19 · 2019–2026 · 巨型風機時代 — the 26 MW-class prototype as a live digital twin.
//
// Medium: engineering visualisation / digital-twin HUD — dark navy field, cyan & teal
// wireframes with glow, glowing sensor nodes, grid floor, section view, mono data labels,
// HUD corner brackets, scanlines.
//
// Content (one consistent scale, 1.5 px = 1 m, test-site ground at y = 600):
//   1888 Brush (Ø17 m, 144-blade rotor, 18 m tower, 12 kW)
//   1941 Smith–Putnam (Ø53.3 m, two steel blades, lattice tower, 1,250 kW)
//   1957 Gedser (Ø24 m, three stayed blades, concrete tower, 200 kW)
//   2002 2 MW class (Ø80 m, tubular tower, hub ~70 m)
//   2025 26 MW-class prototype (rotor > 310 m, three 153 m blades, upwind, tubular tower,
//        hub "higher than a 50-storey building" — drawn at ~185 m, an estimate, so the hub
//        height and tip height are NOT printed as numbers), standing ON LAND at a coastal test
//        base with the sea beyond; a bus and two people at its foot for scale.
//   Dashed rings on its rotor disc: 2019 Ø220 m (12 MW class) and 2022 Ø236 m (15 MW class).
//   Scale cues: a single 153 m blade beside a 105 m football pitch; Taipei 101 (508 m, off-scale).
//   Odometer: global cumulative wind capacity — passed 1 TW in 2023, 1,299 GW at end-2025 (GWEC).
//   Brand-neutral: no manufacturer names on the 2020s machines.
//
// Gag (bar 3): the scan box locks onto the tiny true-scale cyclist at the foot of the
// giants — "黑面琵鷺 · 1 鳥力" — just as the giant's readout tops out at "26,000 kW".
// Bar 4: the global odometer rolls from "1,000+ GW (2023)" to "1,299 GW (2025)".

const P = 1000;
const ROAD_Y = 700;
const TAU = Math.PI * 2;

const COL = {
  bg0: '#05121f',
  bg1: '#0a2236',
  navy: '#1f4287',
  cyan: '#21e6c1',
  teal: '#278ea5',
  pale: '#e6f7ff',
  dim: '#16465c',
  amber: '#ffc95a',
  ink: '#021019',
};

// ---- scale ---------------------------------------------------------------------
const K = 1.5; // px per metre
const GY = 600; // test-site ground level
const SHORE_X = 884; // the sea starts beyond the coastal test base
const SEA_Y = GY + 4.5; // mean sea level ~3 m below the ground
const SEABED_Y = GY + 18 * K;
const my = (m) => GY - m * K; // metres above ground -> y
const k2 = K / 2; // size factor vs. the 2 px/m originals of the small machines

const TURBINES = [
  { id: 'brush', x: 72, hub: 18, R: 8.5, rpm: 10, phase: 0.3 },
  { id: 'putnam', x: 152, hub: 37, R: 26.65, rpm: 28, phase: 1.1 },
  { id: 'gedser', x: 236, hub: 25, R: 12, rpm: 30, phase: 2.0 },
  { id: 'mw2', x: 346, hub: 70, R: 40, rpm: 16.7, phase: 0.6 },
];
// hub ~185 m is our estimate of "higher than 50 storeys"; R = 3.5 m hub + 153 m blade
const GIANT = { x: 712, hub: 185, R: 156.5, hubR: 3.5 };
const RATED_KW = 26000;
// earlier 2020s rotor sizes shown as dashed rings on the giant's disc
const RINGS = [
  { yr: '2019', d: 220 },
  { yr: '2022', d: 236 },
];
const AXIS_X = 452;

// HUD panels below the road
const PANELS = {
  A: { x: 40, y: 740, w: 252, h: 194 },
  B: { x: 304, y: 740, w: 284, h: 194 },
  C: { x: 600, y: 740, w: 176, h: 194 },
  D: { x: 788, y: 740, w: 172, h: 194 },
};
const READOUT = { x: 40, y: 40, w: 290, h: 150 };
const ODO = { x: 40, y: 204, w: 290, h: 84 };
const LABEL = { x: 732, y: 412, w: 222, h: 108 };

// every CJK glyph this panel draws (kept in sync by hand; used to preload / check the fonts)
const HUD_TEXT =
  '轉子直徑功率曲線側視迎風式掃描中目標鎖定黑面琵鷺鳥力身高含單車巨機級風速轉速槳距葉尖額定' +
  '原型機海岸測試基地已併網輪轂逾層樓虛線單支葉片標準足球場台北超出畫面巴士地下電纜全球累計裝置容量破' +
  '面積比對照人';
const MONO_TEXT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:·%/°Øø-+–▸◉●▲×≈…()=';

if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
  try {
    document.fonts.load('400 13px "Noto Sans TC"', HUD_TEXT).catch(() => {});
    document.fonts.load('700 13px "Noto Sans TC"', HUD_TEXT).catch(() => {});
    document.fonts.load('400 13px "JetBrains Mono"', MONO_TEXT).catch(() => {});
    document.fonts.load('700 13px "JetBrains Mono"', MONO_TEXT).catch(() => {});
  } catch (e) {
    /* offline */
  }
}
let _fontsOk = false;
function fontsReady() {
  if (_fontsOk) return true;
  try {
    _fontsOk =
      document.fonts.check('400 13px "Noto Sans TC"', HUD_TEXT) &&
      document.fonts.check('700 13px "Noto Sans TC"', HUD_TEXT) &&
      document.fonts.check('400 13px "JetBrains Mono"', 'A0') &&
      document.fonts.check('700 13px "JetBrains Mono"', 'A0');
    return _fontsOk;
  } catch (e) {
    return true;
  }
}

// =============================================================================
// helpers
// =============================================================================
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
const _rc = new Map();
function rgba(hex, a) {
  const k = hex + '|' + a.toFixed(3);
  let v = _rc.get(k);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
    _rc.set(k, v);
  }
  return v;
}
function fmtInt(n) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** stroke the current path three times: wide halo, mid halo, crisp core ('lighter') */
function glow(ctx, color, w, a = 1) {
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(color, 0.07 * a);
  ctx.lineWidth = w * 6;
  ctx.stroke();
  ctx.strokeStyle = rgba(color, 0.16 * a);
  ctx.lineWidth = w * 2.6;
  ctx.stroke();
  ctx.strokeStyle = rgba(color, 0.95 * a);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.globalCompositeOperation = op;
}
function node(ctx, x, y, r, color, a = 1) {
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(color, 0.12 * a);
  ctx.beginPath();
  ctx.arc(x, y, r * 3.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(color, 0.3 * a);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba('#ffffff', 0.9 * a);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = op;
}
function brackets(ctx, x, y, w, h, len, color, lw = 1.5, a = 1) {
  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  ctx.moveTo(x + w, y + h - len);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - len, y + h);
  ctx.moveTo(x + len, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - len);
  glow(ctx, color, lw, a);
}
function dimLine(g, x0, y0, x1, y1, label, color, font, side = -1) {
  g.strokeStyle = rgba(color, 0.8);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  for (const [px, py, s] of [
    [x0, y0, 1],
    [x1, y1, -1],
  ]) {
    g.beginPath();
    g.moveTo(px + Math.cos(ang) * 7 * s + Math.cos(ang + Math.PI / 2) * 3.5, py + Math.sin(ang) * 7 * s + Math.sin(ang + Math.PI / 2) * 3.5);
    g.lineTo(px, py);
    g.lineTo(px + Math.cos(ang) * 7 * s - Math.cos(ang + Math.PI / 2) * 3.5, py + Math.sin(ang) * 7 * s - Math.sin(ang + Math.PI / 2) * 3.5);
    g.stroke();
    // end ticks
    g.beginPath();
    g.moveTo(px + Math.cos(ang + Math.PI / 2) * 6, py + Math.sin(ang + Math.PI / 2) * 6);
    g.lineTo(px - Math.cos(ang + Math.PI / 2) * 6, py - Math.sin(ang + Math.PI / 2) * 6);
    g.stroke();
  }
  if (label) {
    g.save();
    g.translate((x0 + x1) / 2, (y0 + y1) / 2);
    let a = ang;
    if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;
    g.rotate(a);
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = side < 0 ? 'bottom' : 'top';
    g.fillStyle = rgba(color, 0.95);
    g.fillText(label, 0, side * 4);
    g.restore();
  }
}

// =============================================================================
// live telemetry (pure functions of time)
// =============================================================================
function telemetry(t, lt, gag) {
  const ramp = gag ? sstep(0.5, 4.0, lt) : 0.6;
  const gust = (vnoise(t * 0.9 + 3.1) - 0.5) * 0.7 + (vnoise(t * 2.3) - 0.5) * 0.25;
  const ws = 9.25 + 1.95 * ramp + gust; // m/s at hub height
  const rated = 10.6;
  const pw = ws < 3 ? 0 : ws < rated ? (RATED_KW * (ws * ws * ws - 27)) / (rated * rated * rated - 27) : RATED_KW;
  // a 310 m+ rotor turns slowly: ~5.4 rpm keeps the tip near 90 m/s
  const rpm = Math.min(5.4, 3.9 + 0.3 * (ws - 5));
  const pitch = ws > rated ? (ws - rated) * 2.6 : 0.4 + 0.3 * Math.sin(t * 0.7);
  const tip = (rpm * TAU * GIANT.R) / 60;
  const yaw = 268 + 2.5 * Math.sin(t * 0.21);
  return { ws, pw: Math.min(RATED_KW, pw), rpm, pitch, tip, yaw };
}

/** global cumulative wind capacity shown on the odometer (GW) */
function odometer(lt, thumb) {
  if (thumb) return { v: 1299, stage: 2 };
  const u = sstep(6.0, 7.2, lt);
  if (u <= 0) return { v: 1000, stage: 0 };
  if (u >= 1) return { v: 1299, stage: 2 };
  return { v: 1000 + 299 * u, stage: 1 };
}

// =============================================================================
// static background (baked)
// =============================================================================
function paintBackground(kit, g, rng) {
  const mono = (w, s) => `${w} ${s}px ${kit.FONT.mono}`;
  // navy field
  const bg = g.createLinearGradient(0, 0, 0, P);
  bg.addColorStop(0, '#04101c');
  bg.addColorStop(0.55, '#082035');
  bg.addColorStop(0.7, '#061827');
  bg.addColorStop(1, '#030c15');
  g.fillStyle = bg;
  g.fillRect(0, 0, P, P);
  const rad = g.createRadialGradient(GIANT.x, my(GIANT.hub), 40, GIANT.x, my(GIANT.hub), 520);
  rad.addColorStop(0, 'rgba(39,142,165,0.16)');
  rad.addColorStop(1, 'rgba(39,142,165,0)');
  g.fillStyle = rad;
  g.fillRect(0, 0, P, P);

  // fine measurement grid in the "sky" (10 m minor, 50 m major)
  g.lineWidth = 1;
  for (let m = 0; m <= 400; m += 10) {
    const y = my(m) + 0.5;
    if (y < 0) break;
    g.strokeStyle = m % 50 === 0 ? 'rgba(39,142,165,0.16)' : 'rgba(39,142,165,0.06)';
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(P, y);
    g.stroke();
  }
  for (let m = 0; m * K <= P; m += 10) {
    const x = Math.round(m * K) + 0.5;
    g.strokeStyle = m % 50 === 0 ? 'rgba(39,142,165,0.1)' : 'rgba(39,142,165,0.045)';
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, GY);
    g.stroke();
  }

  // ---- section below ground: the coastal test base (soil) and the sea beyond the shore
  g.save();
  g.beginPath();
  g.moveTo(0, GY);
  g.lineTo(SHORE_X, GY);
  g.lineTo(SHORE_X + 36, SEABED_Y);
  g.lineTo(P, SEABED_Y);
  g.lineTo(P, ROAD_Y);
  g.lineTo(0, ROAD_Y);
  g.closePath();
  g.clip();
  g.fillStyle = 'rgba(31,66,135,0.2)';
  g.fillRect(0, GY, P, ROAD_Y - GY);
  g.strokeStyle = 'rgba(39,142,165,0.2)';
  g.lineWidth = 1;
  for (let x = -120; x < P + 20; x += 9) {
    g.beginPath();
    g.moveTo(x, ROAD_Y);
    g.lineTo(x + 100, GY);
    g.stroke();
  }
  // strata lines
  g.strokeStyle = 'rgba(33,230,193,0.16)';
  for (const yy of [636, 668]) {
    g.beginPath();
    for (let x = 0; x <= P; x += 10) {
      const y = yy + 4 * Math.sin(x * 0.02 + yy);
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // seabed sediment beyond the shore (dotted)
  for (let i = 0; i < 70; i++) {
    const x = SHORE_X + 30 + rng() * (P - SHORE_X - 30);
    const y = SEABED_Y + 3 + rng() * (ROAD_Y - SEABED_Y - 6);
    g.fillStyle = `rgba(39,142,165,${0.15 + rng() * 0.3})`;
    g.fillRect(x, y, 1.5, 1.5);
  }
  g.restore();
  // water column
  const wg = g.createLinearGradient(0, SEA_Y, 0, SEABED_Y);
  wg.addColorStop(0, 'rgba(33,230,193,0.14)');
  wg.addColorStop(1, 'rgba(39,142,165,0.05)');
  g.fillStyle = wg;
  g.beginPath();
  g.moveTo(SHORE_X + 4, SEA_Y);
  g.lineTo(P, SEA_Y);
  g.lineTo(P, SEABED_Y);
  g.lineTo(SHORE_X + 36, SEABED_Y);
  g.closePath();
  g.fill();
  // ground / shore / seabed line
  g.strokeStyle = 'rgba(33,230,193,0.55)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, GY + 0.5);
  g.lineTo(SHORE_X, GY + 0.5);
  g.lineTo(SHORE_X + 36, SEABED_Y + 0.5);
  g.lineTo(P, SEABED_Y + 0.5);
  g.stroke();
  g.font = mono(400, 10);
  g.fillStyle = 'rgba(230,247,255,0.55)';
  g.textAlign = 'left';
  g.fillText('GROUND ±0 m', 470, GY + 14);
  g.fillText('MSL', SHORE_X + 30, SEA_Y + 13);

  // ---- buried export cable from the giant to the grid (left)
  g.strokeStyle = 'rgba(255,201,90,0.25)';
  g.setLineDash([3, 4]);
  g.beginPath();
  g.moveTo(GIANT.x, GY + 20);
  g.lineTo(30, GY + 20);
  g.stroke();
  g.setLineDash([]);
  g.font = mono(400, 10);
  g.fillStyle = 'rgba(255,201,90,0.6)';
  g.fillText('◂ 地下電纜 · 已併網', 470, GY + 36);

  // ---- perspective grid floor below the road (HUD deck)
  const vpx = 500;
  const vpy = 470;
  g.save();
  g.beginPath();
  g.rect(0, ROAD_Y + 2, P, P - ROAD_Y);
  g.clip();
  const fl = g.createLinearGradient(0, ROAD_Y, 0, P);
  fl.addColorStop(0, 'rgba(10,40,60,0.9)');
  fl.addColorStop(1, 'rgba(3,12,21,1)');
  g.fillStyle = fl;
  g.fillRect(0, ROAD_Y, P, P - ROAD_Y);
  g.strokeStyle = 'rgba(33,230,193,0.13)';
  g.lineWidth = 1;
  for (let k = -30; k <= 30; k++) {
    const x0 = vpx + k * 70;
    const t0 = (ROAD_Y - vpy) / (P - vpy);
    g.beginPath();
    g.moveTo(vpx + (x0 - vpx) * t0, ROAD_Y);
    g.lineTo(x0, P);
    g.stroke();
  }
  for (let k = 0; k < 14; k++) {
    const y = ROAD_Y + Math.pow(k / 13, 1.7) * (P - ROAD_Y);
    g.strokeStyle = `rgba(33,230,193,${0.06 + 0.1 * (k / 13)})`;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(P, y);
    g.stroke();
  }
  g.restore();

  // ---- road = baseline ruler (glowing rail with metre ticks: 10 m minor, 50 m major)
  g.beginPath();
  g.moveTo(0, ROAD_Y);
  g.lineTo(P, ROAD_Y);
  glow(g, COL.cyan, 2.2, 1);
  g.strokeStyle = 'rgba(33,230,193,0.55)';
  g.lineWidth = 1;
  g.beginPath();
  for (let m = 0; m * K <= P; m += 10) {
    const x = Math.round(m * K) + 0.5;
    g.moveTo(x, ROAD_Y + 3);
    g.lineTo(x, ROAD_Y + (m % 100 === 0 ? 13 : m % 50 === 0 ? 9 : 6));
  }
  g.stroke();
  g.font = mono(400, 9);
  g.fillStyle = 'rgba(230,247,255,0.5)';
  g.textAlign = 'center';
  for (let m = 100; m * K < P - 40; m += 100) g.fillText(`${m} m`, m * K, ROAD_Y + 24);

  // ---- static parts of the lineup (towers, foundations), labels, dimensions
  for (const tb of TURBINES) paintTower(g, tb);
  paintGiantStatic(g, kit);
  paintLabels(g, kit);
  paintBladeVsPitch(g, kit);
  paintHeightAxis(g, kit);
}

function paintTower(g, tb) {
  const x = tb.x;
  const hubY = my(tb.hub);
  g.save();
  if (tb.id === 'brush') {
    // 18 m four-sided timber tower, tapering, with cross bracing; tail vane edge-on behind
    const b = 9 * k2;
    const tp = 4 * k2;
    g.beginPath();
    g.moveTo(x - b, GY);
    g.lineTo(x - tp, hubY + 3);
    g.lineTo(x + tp, hubY + 3);
    g.lineTo(x + b, GY);
    for (let k = 0; k < 4; k++) {
      const y0 = lerp(GY, hubY + 3, k / 4);
      const y1 = lerp(GY, hubY + 3, (k + 1) / 4);
      const w0 = lerp(b, tp, k / 4);
      const w1 = lerp(b, tp, (k + 1) / 4);
      g.moveTo(x - w0, y0);
      g.lineTo(x + w1, y1);
      g.moveTo(x + w0, y0);
      g.lineTo(x - w1, y1);
    }
    glow(g, COL.teal, 1, 0.9);
    // the great tail vane, seen edge-on above the rotor
    g.beginPath();
    g.moveTo(x, hubY - 2);
    g.lineTo(x, hubY - 18);
    glow(g, COL.teal, 1, 0.7);
    // foundation
    g.strokeStyle = rgba(COL.cyan, 0.5);
    g.strokeRect(x - 9, GY + 1, 18, 5);
  } else if (tb.id === 'putnam') {
    // steel lattice tower (truss), 120 ft
    const b = 15 * k2;
    const tp = 4 * k2;
    const top = hubY + 7;
    g.beginPath();
    g.moveTo(x - b, GY);
    g.lineTo(x - tp, top);
    g.moveTo(x + b, GY);
    g.lineTo(x + tp, top);
    const n = 5;
    for (let k = 0; k < n; k++) {
      const y0 = lerp(GY, top, k / n);
      const y1 = lerp(GY, top, (k + 1) / n);
      const w0 = lerp(b, tp, k / n);
      const w1 = lerp(b, tp, (k + 1) / n);
      g.moveTo(x - w0, y0);
      g.lineTo(x + w1, y1);
      g.moveTo(x + w0, y0);
      g.lineTo(x - w1, y1);
      g.moveTo(x - w1, y1);
      g.lineTo(x + w1, y1);
    }
    glow(g, COL.teal, 1, 0.9);
    // nacelle housing (downwind rotor sits behind it in reality)
    g.beginPath();
    g.rect(x - 5, hubY - 3, 10, 9);
    glow(g, COL.teal, 1, 0.9);
    g.strokeStyle = rgba(COL.cyan, 0.5);
    for (const fx of [x - b, x + b]) g.strokeRect(fx - 3, GY + 1, 6, 6);
  } else if (tb.id === 'gedser') {
    // tapered concrete tower
    const b = 5 * k2;
    const tp = 3 * k2;
    g.beginPath();
    g.moveTo(x - b, GY);
    g.lineTo(x - tp, hubY + 3);
    g.lineTo(x + tp, hubY + 3);
    g.lineTo(x + b, GY);
    glow(g, COL.teal, 1, 0.9);
    g.strokeStyle = rgba(COL.teal, 0.35);
    for (let k = 1; k < 5; k++) {
      const y = lerp(GY, hubY + 3, k / 5);
      const w = lerp(b, tp, k / 5);
      g.beginPath();
      g.moveTo(x - w, y);
      g.lineTo(x + w, y);
      g.stroke();
    }
    g.beginPath();
    g.rect(x - 4, hubY - 2.5, 8, 5);
    glow(g, COL.teal, 1, 0.9);
    g.strokeStyle = rgba(COL.cyan, 0.5);
    g.strokeRect(x - 8, GY + 1, 16, 6);
  } else if (tb.id === 'mw2') {
    // tubular steel tower, 70 m hub (2 MW class)
    const b = 4.2 * k2 + 0.6;
    const tp = 2.3 * k2 + 0.4;
    g.beginPath();
    g.moveTo(x - b, GY);
    g.lineTo(x - tp, hubY + 3);
    g.moveTo(x + b, GY);
    g.lineTo(x + tp, hubY + 3);
    glow(g, COL.teal, 1.1, 0.95);
    g.strokeStyle = rgba(COL.teal, 0.4);
    for (let k = 1; k < 4; k++) {
      const y = lerp(GY, hubY + 3, k / 4);
      const w = lerp(b, tp, k / 4);
      g.beginPath();
      g.ellipse(x, y, w, 1, 0, 0, TAU);
      g.stroke();
    }
    g.beginPath();
    g.rect(x - 4.5, hubY - 2.6, 9, 5.2);
    glow(g, COL.teal, 1, 0.95);
    // spread footing below ground
    g.strokeStyle = rgba(COL.cyan, 0.5);
    g.beginPath();
    g.moveTo(x - 12, GY + 1);
    g.lineTo(x - 12, GY + 5);
    g.lineTo(x + 12, GY + 5);
    g.lineTo(x + 12, GY + 1);
    g.stroke();
  }
  g.restore();
}

function paintGiantStatic(g, kit) {
  const x = GIANT.x;
  const hubY = my(GIANT.hub);
  // onshore foundation: wide reinforced-concrete pile cap on bored piles (section view)
  const capW = 16 * K;
  const capB = GY + 5 * K;
  g.beginPath();
  g.moveTo(x - capW, GY + 1);
  g.lineTo(x + capW, GY + 1);
  g.lineTo(x + capW, capB);
  g.lineTo(x - capW, capB);
  g.closePath();
  g.moveTo(x - 9 * K, GY + 1);
  g.lineTo(x - 7 * K, GY - 2);
  g.lineTo(x + 7 * K, GY - 2);
  g.lineTo(x + 9 * K, GY + 1);
  glow(g, COL.cyan, 1.1, 0.85);
  g.save();
  g.beginPath();
  g.rect(x - capW, GY + 1, capW * 2, capB - GY - 1);
  g.clip();
  g.strokeStyle = 'rgba(33,230,193,0.28)';
  g.lineWidth = 1;
  for (let k = -40; k < 50; k += 5) {
    g.beginPath();
    g.moveTo(x - capW + k, capB);
    g.lineTo(x - capW + k + 9, GY);
    g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(33,230,193,0.45)';
  g.beginPath();
  for (const px of [-13, -7.5, -2.5, 2.5, 7.5, 13]) {
    g.moveTo(x + px * K, capB);
    g.lineTo(x + px * K, capB + 24 * K);
  }
  g.stroke();
  // tubular steel tower: Ø ~10 m at the base → ~6.5 m at the top, flanged sections
  const tb = GY - 2;
  const tt = hubY + 7 * K;
  const bw = 5 * K;
  const tw = 3.3 * K;
  g.beginPath();
  g.moveTo(x - bw, tb);
  g.lineTo(x - tw, tt);
  g.moveTo(x + bw, tb);
  g.lineTo(x + tw, tt);
  glow(g, COL.cyan, 1.3, 1);
  g.strokeStyle = 'rgba(33,230,193,0.35)';
  g.lineWidth = 1;
  for (let k = 1; k < 10; k++) {
    const y = lerp(tb, tt, k / 10);
    const w = lerp(bw, tw, k / 10);
    g.beginPath();
    g.ellipse(x, y, w, 1.4, 0, 0, TAU);
    g.stroke();
  }
  // tower door
  g.strokeStyle = 'rgba(255,201,90,0.55)';
  g.strokeRect(x - 1.5, GY - 6, 3, 4);
  // internal ladder/cable (dashed)
  g.strokeStyle = 'rgba(255,201,90,0.3)';
  g.setLineDash([2, 3]);
  g.beginPath();
  g.moveTo(x + 2, tt);
  g.lineTo(x + 2, GY + 20);
  g.stroke();
  g.setLineDash([]);

  // same-scale people and a 12 m bus at the tower foot
  const bx = x - 66;
  g.beginPath();
  g.rect(bx, GY - 3.2 * K, 12 * K, 3.2 * K - 1.2);
  g.moveTo(bx + 4.5, GY - 0.6);
  g.arc(bx + 3.5, GY - 0.6, 1, 0, TAU);
  g.moveTo(bx + 15.5, GY - 0.6);
  g.arc(bx + 14.5, GY - 0.6, 1, 0, TAU);
  for (const hx of [x - 42, x - 38]) {
    g.moveTo(hx, GY - 0.3);
    g.lineTo(hx, GY - 2.6);
  }
  glow(g, COL.pale, 0.7, 0.75);
  g.strokeStyle = 'rgba(230,247,255,0.45)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(bx + 9, GY - 6);
  g.lineTo(bx + 4, GY - 22);
  g.lineTo(bx - 30, GY - 22);
  g.stroke();
  g.font = `400 10px ${kit.FONT.mono}`;
  g.fillStyle = 'rgba(230,247,255,0.75)';
  g.textAlign = 'right';
  g.fillText('巴士 12 m · 人 1.7 m', bx - 34, GY - 19);

  // swept-area comparison rings: earlier 2020s rotors on the same hub
  g.setLineDash([5, 5]);
  g.lineWidth = 1;
  g.font = `700 11px ${kit.FONT.mono}`;
  g.textAlign = 'center';
  for (const r of RINGS) {
    const rr = (r.d / 2) * K;
    g.strokeStyle = 'rgba(230,247,255,0.28)';
    g.beginPath();
    g.arc(x, hubY, rr, 0, TAU);
    g.stroke();
  }
  g.setLineDash([]);
  // year tags where each ring crosses the upper-left diagonal
  for (const [i, r] of RINGS.entries()) {
    const rr = (r.d / 2) * K;
    const a = -Math.PI * (i === 0 ? 0.78 : 0.72);
    const px = x + Math.cos(a) * rr;
    const py = hubY + Math.sin(a) * rr;
    g.fillStyle = 'rgba(4,16,28,0.85)';
    g.fillRect(px - 17, py - 8, 34, 15);
    g.fillStyle = 'rgba(230,247,255,0.85)';
    g.fillText(r.yr, px, py + 4);
  }
}

function paintLabels(g, kit) {
  const mono = (w, s) => `${w} ${s}px ${kit.FONT.mono}`;
  const L = [
    { x: 72, y: 512, top: my(18) - 8.5 * K - 2, a: '1888 · Brush', b: 'Ø17 m · 12 kW' },
    { x: 152, y: 470, top: my(37) - 26.65 * K - 2, a: '1941 · Smith–Putnam', b: 'Ø53 m · 1,250 kW' },
    { x: 238, y: 522, top: my(25) - 12 * K - 2, a: '1957 · Gedser', b: 'Ø24 m · 200 kW' },
    { x: 346, y: 412, top: my(70) - 40 * K - 2, a: '2002 · 2 MW 級', b: 'Ø80 m · 2,000 kW' },
  ];
  for (const l of L) {
    g.strokeStyle = 'rgba(33,230,193,0.45)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(l.x, l.y + 4);
    g.lineTo(l.x, l.top);
    g.stroke();
    g.fillStyle = 'rgba(33,230,193,0.9)';
    g.beginPath();
    g.arc(l.x, l.top, 1.8, 0, TAU);
    g.fill();
    g.textAlign = 'center';
    g.font = mono(700, 12);
    g.fillStyle = COL.pale;
    g.fillText(l.a, l.x, l.y - 13);
    g.font = mono(400, 10.5);
    g.fillStyle = 'rgba(33,230,193,0.95)';
    g.fillText(l.b, l.x, l.y);
  }
  // giant: leader from the tower to its label card (the card itself is drawn above the rotor)
  g.strokeStyle = 'rgba(33,230,193,0.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(GIANT.x + 6, my(70));
  g.lineTo(LABEL.x + 2, LABEL.y + 30);
  g.stroke();
  // giant: hub-height dimension (left of the tower, no number: only "> 50 storeys" is reported)
  dimLine(g, GIANT.x - 24, GY, GIANT.x - 24, my(GIANT.hub), '輪轂 > 50 層樓', COL.cyan, mono(400, 10), -1);
  // rotor diameter on top
  const dy = 62;
  dimLine(g, GIANT.x - GIANT.R * K, dy, GIANT.x + GIANT.R * K, dy, 'Ø > 310 m', COL.cyan, mono(700, 11.5), -1);
  g.setLineDash([2, 4]);
  g.strokeStyle = 'rgba(33,230,193,0.25)';
  g.beginPath();
  g.moveTo(GIANT.x - GIANT.R * K, dy);
  g.lineTo(GIANT.x - GIANT.R * K, my(GIANT.hub));
  g.moveTo(GIANT.x + GIANT.R * K, dy);
  g.lineTo(GIANT.x + GIANT.R * K, my(GIANT.hub));
  g.stroke();
  g.setLineDash([]);
}

/** the giant's label card (baked small; drawn over the rotor so the blades never hide it) */
function paintGiantLabel(g, kit) {
  const mono = (w, s) => `${w} ${s}px ${kit.FONT.mono}`;
  const w = LABEL.w;
  const h = LABEL.h;
  g.fillStyle = 'rgba(4,18,30,0.62)';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(33,230,193,0.35)';
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, w - 1, h - 1);
  g.strokeStyle = 'rgba(33,230,193,0.7)';
  g.beginPath();
  g.moveTo(8, 30.5);
  g.lineTo(w - 8, 30.5);
  g.stroke();
  g.textAlign = 'left';
  g.font = mono(700, 14);
  g.fillStyle = COL.pale;
  g.fillText('2025 · 26 MW 原型機', 8, 22);
  g.font = mono(400, 12);
  g.fillStyle = 'rgba(33,230,193,0.95)';
  g.fillText('Ø 310 m+ · 葉片 153 m', 8, 48);
  g.fillText('輪轂高逾 50 層樓 · 迎風 3 葉', 8, 65);
  g.fillText('海岸測試基地 · 已併網', 8, 82);
  g.font = mono(400, 10.5);
  g.fillStyle = 'rgba(230,247,255,0.62)';
  g.fillText('虛線 2019 Ø220 · 2022 Ø236', 8, 99);
}

/** scale cue: one 153 m blade beside a standard 105 m football pitch (pitch seen lying flat) */
function paintBladeVsPitch(g, kit) {
  const mono = (w, s) => `${w} ${s}px ${kit.FONT.mono}`;
  const x0 = 58;
  // the blade, root at the left, at the same scale
  const by = 338;
  const L = 153 * K;
  g.beginPath();
  bladePath(g, x0, by, 0, 0, L, 6.5 * K, true);
  glow(g, COL.cyan, 1, 0.9);
  // root flange
  g.beginPath();
  g.ellipse(x0, by, 1.5, 4.2, 0, 0, TAU);
  glow(g, COL.cyan, 1, 0.9);
  dimLine(g, x0, by - 16, x0 + L, by - 16, '單支葉片 153 m', COL.cyan, mono(700, 12.5), -1);
  // the football pitch (105 m × 68 m) lying on the ground, seen obliquely
  const py = 374;
  const pw = 105 * K;
  const ph = 22;
  const sk = 14;
  g.beginPath();
  g.moveTo(x0 + sk, py - ph);
  g.lineTo(x0 + sk + pw, py - ph);
  g.lineTo(x0 + pw, py);
  g.lineTo(x0, py);
  g.closePath();
  // halfway line and centre circle (Ø 18.3 m)
  g.moveTo(x0 + sk + pw / 2, py - ph);
  g.lineTo(x0 + pw / 2, py);
  const ccx = x0 + sk / 2 + pw / 2;
  g.moveTo(ccx + 9.15 * K, py - ph / 2);
  g.ellipse(ccx, py - ph / 2, 9.15 * K, 9.15 * (ph / 68), 0, 0, TAU);
  // penalty areas (16.5 m deep, 40.3 m wide)
  for (const side of [0, 1]) {
    const gx = side === 0 ? x0 + sk : x0 + sk + pw;
    const depth = 16.5 * K * (side === 0 ? 1 : -1);
    const pts = [0.204, 0.796].map((u) => [gx - sk * u, py - ph + ph * u]);
    g.moveTo(pts[0][0], pts[0][1]);
    g.lineTo(pts[0][0] + depth, pts[0][1]);
    g.lineTo(pts[1][0] + depth, pts[1][1]);
    g.lineTo(pts[1][0], pts[1][1]);
  }
  glow(g, COL.teal, 1, 0.9);
  dimLine(g, x0, py + 12, x0 + pw, py + 12, '足球場 105 m', COL.teal, mono(700, 11.5), 1);
}

function paintHeightAxis(g, kit) {
  const x = AXIS_X;
  g.strokeStyle = 'rgba(33,230,193,0.6)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x + 0.5, GY);
  g.lineTo(x + 0.5, 72);
  g.stroke();
  g.font = `400 9px ${kit.FONT.mono}`;
  g.fillStyle = 'rgba(230,247,255,0.6)';
  g.textAlign = 'right';
  for (let m = 0; m <= 350; m += 10) {
    const y = my(m) + 0.5;
    const major = m % 50 === 0;
    g.beginPath();
    g.moveTo(x - (major ? 8 : 4), y);
    g.lineTo(x, y);
    g.stroke();
    if (major && m > 0) g.fillText(`${m}`, x - 10, y + 3);
  }
  g.textAlign = 'left';
  g.fillText('m', x + 4, 76);
  // blade-tip height marker (no number: the hub height behind it is an estimate)
  const ty = my(GIANT.hub + GIANT.R);
  g.strokeStyle = 'rgba(255,201,90,0.6)';
  g.setLineDash([3, 3]);
  g.beginPath();
  g.moveTo(x - 10, ty);
  g.lineTo(GIANT.x, ty);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,201,90,0.95)';
  g.textAlign = 'left';
  g.font = `700 10.5px ${kit.FONT.mono}`;
  g.fillText('葉尖', x + 6, ty + 14);
  // off-scale reference: Taipei 101 (beyond the top of the viewport)
  g.fillStyle = 'rgba(230,247,255,0.75)';
  g.textAlign = 'right';
  g.font = `400 10.5px ${kit.FONT.mono}`;
  g.fillText('▲ 台北101 508 m', x - 4, 50);
  g.fillStyle = 'rgba(230,247,255,0.5)';
  g.font = `400 9.5px ${kit.FONT.mono}`;
  g.fillText('(超出畫面)', x - 4, 63);
}

// =============================================================================
// HUD panels (static frames & text baked)
// =============================================================================
function panelFrame(g, p, title, kit) {
  g.fillStyle = 'rgba(4,20,32,0.82)';
  g.fillRect(p.x, p.y, p.w, p.h);
  g.strokeStyle = 'rgba(39,142,165,0.55)';
  g.lineWidth = 1;
  g.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  g.fillStyle = 'rgba(33,230,193,0.14)';
  g.fillRect(p.x, p.y, p.w, 20);
  g.font = `700 10.5px ${kit.FONT.mono}`;
  g.fillStyle = COL.cyan;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(title, p.x + 8, p.y + 10.5);
  g.textBaseline = 'alphabetic';
  // corner notches
  g.strokeStyle = 'rgba(33,230,193,0.9)';
  g.lineWidth = 1.5;
  g.beginPath();
  const l = 8;
  g.moveTo(p.x, p.y + l);
  g.lineTo(p.x, p.y);
  g.lineTo(p.x + l, p.y);
  g.moveTo(p.x + p.w - l, p.y + p.h);
  g.lineTo(p.x + p.w, p.y + p.h);
  g.lineTo(p.x + p.w, p.y + p.h - l);
  g.stroke();
}

function paintHud(kit, g, rng) {
  const mono = (w, s) => `${w} ${s}px ${kit.FONT.mono}`;
  // ---- A: rotor diameter bars
  const A = PANELS.A;
  panelFrame(g, A, 'ROTOR Ø · 轉子直徑 (m)', kit);
  const rows = [
    ['1888', 17, 'Brush', '17'],
    ['1941', 53.3, 'Smith–Putnam', '53.3'],
    ['1957', 24, 'Gedser', '24'],
    ['2002', 80, '2 MW 級', '80'],
    ['2019', 220, '12 MW 級', '220'],
    ['2025', 310, '26 MW 級', '310+'],
  ];
  rows.forEach(([yr, d, nm, lab], i) => {
    const y = A.y + 37 + i * 24;
    g.font = mono(700, 10);
    g.fillStyle = COL.pale;
    g.textAlign = 'left';
    g.fillText(yr, A.x + 8, y);
    g.font = mono(400, 9);
    g.fillStyle = 'rgba(230,247,255,0.6)';
    g.fillText(nm, A.x + 44, y);
    const bw = d * 0.7;
    const inside = i >= 4;
    const isG = i === 5;
    g.fillStyle = isG ? 'rgba(33,230,193,0.85)' : inside ? 'rgba(39,142,165,0.85)' : 'rgba(39,142,165,0.75)';
    g.fillRect(A.x + 8, y + 3, Math.max(2, bw), 8);
    g.fillStyle = inside ? COL.ink : 'rgba(33,230,193,0.85)';
    g.font = mono(700, 9.5);
    g.textAlign = inside ? 'right' : 'left';
    g.fillText(lab, inside ? A.x + 8 + bw - 4 : A.x + 14 + bw, y + 10.5);
  });
  g.fillStyle = 'rgba(230,247,255,0.55)';
  g.font = mono(400, 9);
  g.textAlign = 'left';
  g.fillText('2025 vs 1888 · Ø ×18 · 面積 ×330', A.x + 8, A.y + A.h - 8);

  // ---- B: scan / zoom box
  const B = PANELS.B;
  panelFrame(g, B, 'OPTICAL ZOOM · 目標掃描', kit);
  g.strokeStyle = 'rgba(39,142,165,0.25)';
  g.lineWidth = 1;
  for (let x = B.x + 10; x < B.x + B.w - 6; x += 20) {
    g.beginPath();
    g.moveTo(x, B.y + 26);
    g.lineTo(x, B.y + B.h - 30);
    g.stroke();
  }
  for (let y = B.y + 30; y < B.y + B.h - 30; y += 20) {
    g.beginPath();
    g.moveTo(B.x + 6, y);
    g.lineTo(B.x + B.w - 6, y);
    g.stroke();
  }

  // ---- C: power curve
  const C = PANELS.C;
  panelFrame(g, C, 'POWER CURVE · 功率曲線', kit);
  const cx0 = C.x + 26;
  const cy0 = C.y + C.h - 30;
  const cw = C.w - 38;
  const ch = C.h - 66;
  g.strokeStyle = 'rgba(39,142,165,0.3)';
  g.lineWidth = 1;
  const MW_TOP = RATED_KW / 1000;
  for (const v of [0, 10, 20, MW_TOP]) {
    const y = cy0 - (ch * v) / MW_TOP;
    g.beginPath();
    g.moveTo(cx0, y);
    g.lineTo(cx0 + cw, y);
    g.stroke();
  }
  for (let v = 0; v <= 25; v += 5) {
    const x = cx0 + (cw * v) / 25;
    g.beginPath();
    g.moveTo(x, cy0);
    g.lineTo(x, cy0 - ch);
    g.stroke();
  }
  g.strokeStyle = 'rgba(33,230,193,0.7)';
  g.beginPath();
  g.moveTo(cx0, cy0 - ch);
  g.lineTo(cx0, cy0);
  g.lineTo(cx0 + cw, cy0);
  g.stroke();
  g.beginPath();
  for (let i = 0; i <= 125; i++) {
    const v = (i / 125) * 25;
    const pw = v < 3 ? 0 : v < 10.6 ? (v * v * v - 27) / (10.6 * 10.6 * 10.6 - 27) : v <= 25 ? 1 : 0;
    const x = cx0 + (cw * v) / 25;
    const y = cy0 - ch * pw;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.lineTo(cx0 + cw, cy0);
  glow(g, COL.cyan, 1.4, 1);
  g.font = mono(400, 8.5);
  g.fillStyle = 'rgba(230,247,255,0.6)';
  g.textAlign = 'center';
  for (const v of [0, 5, 10, 15, 20, 25]) g.fillText(`${v}`, cx0 + (cw * v) / 25, cy0 + 11);
  g.fillText('m/s', cx0 + cw - 8, cy0 + 22);
  g.textAlign = 'right';
  for (const v of [0, 10, 20, MW_TOP]) g.fillText(`${v}`, cx0 - 4, cy0 - (ch * v) / MW_TOP + 3);
  g.save();
  g.translate(C.x + 9, cy0 - ch / 2);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'center';
  g.fillText('MW', 0, 0);
  g.restore();

  // ---- D: side view (upwind configuration)
  const D = PANELS.D;
  panelFrame(g, D, 'SIDE · 側視 迎風式', kit);
  const sx = D.x + 104;
  const sb = D.y + D.h - 18;
  const s = 0.42; // px per metre in this inset
  const hy = sb - GIANT.hub * s;
  // sea line
  g.strokeStyle = 'rgba(33,230,193,0.4)';
  g.beginPath();
  g.moveTo(D.x + 6, sb);
  g.lineTo(D.x + D.w - 6, sb);
  g.stroke();
  // tower
  g.beginPath();
  g.moveTo(sx - 3, sb);
  g.lineTo(sx - 2, hy + 4);
  g.moveTo(sx + 3, sb);
  g.lineTo(sx + 2, hy + 4);
  glow(g, COL.cyan, 1, 0.9);
  // nacelle (downwind of the rotor) and hub/spinner (upwind)
  g.beginPath();
  g.rect(sx - 6, hy - 4, 22, 8);
  glow(g, COL.cyan, 1, 0.9);
  g.beginPath();
  g.ellipse(sx - 9, hy, 4, 4, 0, 0, TAU);
  glow(g, COL.cyan, 1, 0.9);
  // rotor plane, upwind of the tower: 6° shaft tilt (nose up) tips the plane back at the top,
  // ~4° cone bends the blades upwind -> top tip almost vertical, bottom tip well clear of the tower
  const bl = 153 * s;
  const tilt = (6 * Math.PI) / 180;
  const cone = (4 * Math.PI) / 180;
  const rx = sx - 10;
  g.beginPath();
  g.moveTo(rx, hy);
  g.lineTo(rx + Math.sin(tilt - cone) * bl, hy - Math.cos(tilt) * bl);
  g.moveTo(rx, hy);
  g.lineTo(rx - Math.sin(tilt + cone) * bl * 0.5, hy + Math.cos(tilt) * bl * 0.5);
  glow(g, COL.cyan, 1.2, 1);
  // wind arrows hitting the rotor first
  g.strokeStyle = rgba(COL.amber, 0.9);
  g.lineWidth = 1.3;
  for (const yy of [hy - 30, hy, hy + 26]) {
    g.beginPath();
    g.moveTo(D.x + 10, yy);
    g.lineTo(D.x + 42, yy);
    g.lineTo(D.x + 37, yy - 3.5);
    g.moveTo(D.x + 42, yy);
    g.lineTo(D.x + 37, yy + 3.5);
    g.stroke();
  }
  g.font = mono(700, 9);
  g.fillStyle = COL.amber;
  g.textAlign = 'left';
  g.fillText('WIND', D.x + 10, hy - 38);
  g.fillStyle = 'rgba(230,247,255,0.75)';
  g.font = mono(400, 9);
  g.fillText('TILT 6°', sx + 22, hy - 8);
  g.fillText('UPWIND', sx + 22, hy + 5);
  g.fillText('ROTOR', sx + 22, hy + 16);

  // ---- top-left readout panel frame
  const R = READOUT;
  panelFrame(g, R, 'DIGITAL TWIN ▸ WTG-26MW', kit);
  const labels = [
    ['風速', 'WIND'],
    ['轉速', 'ROTOR'],
    ['槳距', 'PITCH'],
    ['功率', 'POWER'],
    ['葉尖', 'TIP'],
  ];
  labels.forEach(([zh, en], i) => {
    const y = R.y + 40 + i * 21;
    g.font = mono(700, 11);
    g.fillStyle = COL.pale;
    g.textAlign = 'left';
    g.fillText(zh, R.x + 10, y);
    g.font = mono(400, 9);
    g.fillStyle = 'rgba(33,230,193,0.75)';
    g.fillText(en, R.x + 40, y);
  });

  // ---- global capacity odometer (frame + static captions; digits are live)
  panelFrame(g, ODO, 'GLOBAL · 全球風電累計裝置容量', kit);
  g.fillStyle = 'rgba(39,142,165,0.3)';
  g.fillRect(ODO.x + 10, ODO.y + 72, ODO.w - 20, 4);
  const fx = ODO.x + 10 + (ODO.w - 20) * (1000 / 1400);
  g.strokeStyle = COL.amber;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(fx, ODO.y + 77);
  g.lineTo(fx, ODO.y + 53);
  g.stroke();
  g.fillStyle = COL.amber;
  g.beginPath();
  g.moveTo(fx, ODO.y + 53);
  g.lineTo(fx + 9, ODO.y + 56.5);
  g.lineTo(fx, ODO.y + 60);
  g.closePath();
  g.fill();
  g.font = mono(700, 12.5);
  g.textAlign = 'right';
  g.fillText('2023 破 1 TW', fx - 5, ODO.y + 66);

  // ---- status bar
  g.font = mono(400, 9.5);
  g.fillStyle = 'rgba(33,230,193,0.65)';
  g.textAlign = 'left';
  g.fillText('DT-SYNC 10 Hz ▸ SENSORS 64/64 OK ▸ SCALE 1.5 px = 1 m ▸ SECTION A–A', 40, 958);
}

// =============================================================================
// overlay: scanlines + vignette + screen glare
// =============================================================================
function paintOverlay(kit, g) {
  g.fillStyle = 'rgba(0,0,0,0.13)';
  for (let y = 0; y < P; y += 3) g.fillRect(0, y, P, 1);
  const v = g.createRadialGradient(P / 2, P / 2, 300, P / 2, P / 2, 740);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = v;
  g.fillRect(0, 0, P, P);
  // HUD corner brackets of the whole viewport
  g.strokeStyle = 'rgba(33,230,193,0.8)';
  g.lineWidth = 2;
  const m = 34;
  const l = 26;
  g.beginPath();
  g.moveTo(m, m + l);
  g.lineTo(m, m);
  g.lineTo(m + l, m);
  g.moveTo(P - m - l, m);
  g.lineTo(P - m, m);
  g.lineTo(P - m, m + l);
  g.moveTo(P - m, P - m - l);
  g.lineTo(P - m, P - m);
  g.lineTo(P - m - l, P - m);
  g.moveTo(m + l, P - m);
  g.lineTo(m, P - m);
  g.lineTo(m, P - m - l);
  g.stroke();
}

// =============================================================================
// rotors (per frame)
// =============================================================================
function bladePath(ctx, cx, cy, ang, r0, R, cmax, ribs) {
  // planform: max chord ~22 % span, tapering to the tip; leading edge straighter
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const nx = -sa;
  const ny = ca;
  const N = 12;
  const le = [];
  const te = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    let c;
    if (u < 0.22) c = cmax * (0.62 + 0.38 * Math.sin((u / 0.22) * (Math.PI / 2)));
    else c = cmax * (1 - 0.82 * Math.pow((u - 0.22) / 0.78, 0.85));
    if (u > 0.97) c *= 0.5;
    const r = r0 + u * (R - r0);
    const px = cx + ca * r;
    const py = cy + sa * r;
    le.push([px + nx * c * 0.32, py + ny * c * 0.32]);
    te.push([px - nx * c * 0.68, py - ny * c * 0.68]);
  }
  ctx.moveTo(le[0][0], le[0][1]);
  for (let i = 1; i <= N; i++) ctx.lineTo(le[i][0], le[i][1]);
  for (let i = N; i >= 0; i--) ctx.lineTo(te[i][0], te[i][1]);
  ctx.closePath();
  if (ribs) {
    for (let i = 2; i < N; i += 2) {
      ctx.moveTo(le[i][0], le[i][1]);
      ctx.lineTo(te[i][0], te[i][1]);
    }
    // spar cap line
    ctx.moveTo(cx + ca * r0, cy + sa * r0);
    ctx.lineTo(cx + ca * R * 0.96, cy + sa * R * 0.96);
  }
}

function drawSmallRotor(ctx, tb, t) {
  const cx = tb.x;
  const cy = my(tb.hub);
  const R = tb.R * K;
  const ang = (t * tb.rpm * TAU) / 60 + tb.phase;
  ctx.beginPath();
  if (tb.id === 'brush') {
    // 144 cedar blades (drawn as 36 radial slats at this scale), two rims
    for (let i = 0; i < 36; i++) {
      const a = ang + (i * TAU) / 36;
      ctx.moveTo(cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3);
      ctx.lineTo(cx + Math.cos(a + 0.05) * R, cy + Math.sin(a + 0.05) * R);
    }
    ctx.moveTo(cx + R, cy);
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.moveTo(cx + R * 0.3, cy);
    ctx.arc(cx, cy, R * 0.3, 0, TAU);
    glow(ctx, COL.cyan, 0.7, 0.75);
  } else if (tb.id === 'putnam') {
    // two broad stainless-steel blades
    for (let i = 0; i < 2; i++) {
      const a = ang + i * Math.PI;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const nx = -sa;
      const ny = ca;
      const r0 = R * 0.2;
      const c0 = 3.6 * K;
      const c1 = 2.6 * K;
      ctx.moveTo(cx + ca * r0 + nx * c0 * 0.4, cy + sa * r0 + ny * c0 * 0.4);
      ctx.lineTo(cx + ca * R + nx * c1 * 0.4, cy + sa * R + ny * c1 * 0.4);
      ctx.lineTo(cx + ca * R - nx * c1 * 0.6, cy + sa * R - ny * c1 * 0.6);
      ctx.lineTo(cx + ca * r0 - nx * c0 * 0.6, cy + sa * r0 - ny * c0 * 0.6);
      ctx.closePath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ca * r0, cy + sa * r0);
    }
    ctx.moveTo(cx + 3, cy);
    ctx.arc(cx, cy, 3, 0, TAU);
    glow(ctx, COL.cyan, 0.9, 0.95);
  } else if (tb.id === 'gedser') {
    // three blades held by stays (front strut + blade-to-blade ties)
    const tips = [];
    for (let i = 0; i < 3; i++) {
      const a = ang + (i * TAU) / 3;
      bladePath(ctx, cx, cy, a, 2, R, 2.2 * K, false);
      tips.push([cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62]);
    }
    glow(ctx, COL.cyan, 0.9, 0.95);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(tips[i][0], tips[i][1]);
      ctx.moveTo(tips[i][0], tips[i][1]);
      ctx.lineTo(tips[(i + 1) % 3][0], tips[(i + 1) % 3][1]);
    }
    glow(ctx, COL.teal, 0.6, 0.8);
    return;
  } else {
    for (let i = 0; i < 3; i++) bladePath(ctx, cx, cy, ang + (i * TAU) / 3, 2, R, 3.3 * K, true);
    ctx.moveTo(cx + 2.4, cy);
    ctx.arc(cx, cy, 2.4, 0, TAU);
    glow(ctx, COL.cyan, 0.9, 0.95);
  }
}

function drawGiantRotor(ctx, t, ang, tel) {
  const cx = GIANT.x;
  const cy = my(GIANT.hub);
  const R = GIANT.R * K;
  // swept-area disc (faint), rotor plane
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(33,230,193,0.025)';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.strokeStyle = 'rgba(33,230,193,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
  // house-sized nacelle box behind the hub (front view, ~12 m)
  ctx.beginPath();
  ctx.rect(cx - 6 * K, cy - 6.5 * K, 12 * K, 12 * K);
  glow(ctx, COL.teal, 1.1, 0.9);
  // blades
  ctx.beginPath();
  for (let i = 0; i < 3; i++) bladePath(ctx, cx, cy, ang + (i * TAU) / 3, GIANT.hubR * K, R, 6.5 * K, true);
  glow(ctx, COL.cyan, 1.25, 1);
  // pitch indicator ticks at the blade roots (rotate with pitch)
  // spinner
  ctx.beginPath();
  ctx.arc(cx, cy, GIANT.hubR * K, 0, TAU);
  glow(ctx, COL.pale, 1.2, 1);
  return [0, 1, 2].map((i) => {
    const a = ang + (i * TAU) / 3;
    return { x: cx + Math.cos(a) * R * 0.985, y: cy + Math.sin(a) * R * 0.985 };
  });
}

// =============================================================================
// rider in cyan wireframe with glow (keeps white body, black face & spoon bill)
// =============================================================================
function maskPath(ctx, rig) {
  const h = rig.head;
  const s = rig.root.scale;
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
  ctx.moveTo(m0.x, m0.y);
  ctx.quadraticCurveTo(q1.x, q1.y, m1.x, m1.y);
  ctx.lineTo(m2.x, m2.y);
  ctx.quadraticCurveTo(q2.x, q2.y, m3.x, m3.y);
  ctx.quadraticCurveTo(m4.x - 2 * s, m4.y + 4 * s, m4.x, m4.y);
  ctx.quadraticCurveTo(m4.x - 1 * s, m4.y - 6 * s, m0.x, m0.y);
  ctx.closePath();
}
function billPath(ctx, rig) {
  const s = rig.root.scale;
  const bb0 = rig.billBase;
  const bt = rig.billTip;
  const d = rig.billDir;
  const nx = -Math.sin(d);
  const ny = Math.cos(d);
  const L = Math.hypot(bt.x - bb0.x, bt.y - bb0.y);
  const ux = (bt.x - bb0.x) / L;
  const uy = (bt.y - bb0.y) / L;
  const spoonC = { x: bt.x - ux * 8 * s, y: bt.y - uy * 8 * s };
  ctx.moveTo(bb0.x + nx * -4.6 * s, bb0.y + ny * -4.6 * s);
  ctx.lineTo(spoonC.x - ux * 6 * s + nx * -2.2 * s, spoonC.y - uy * 6 * s + ny * -2.2 * s);
  ctx.quadraticCurveTo(bt.x + nx * -6.5 * s, bt.y + ny * -6.5 * s, bt.x + ux * 1.5 * s, bt.y + uy * 1.5 * s);
  ctx.quadraticCurveTo(bt.x + nx * 7.5 * s + ux * -1 * s, bt.y + ny * 7.5 * s + uy * -1 * s, spoonC.x - ux * 6 * s + nx * 2.4 * s, spoonC.y - uy * 6 * s + ny * 2.4 * s);
  ctx.lineTo(bb0.x + nx * 4.4 * s, bb0.y + ny * 4.4 * s);
  ctx.closePath();
}

function drawWireRider(ctx, kit, rig, scene, t, glowA = 1) {
  const pin = { ...(scene.pinwheel || { type: 'three' }), type: 'three' };
  // "white" plumage: a dark screen behind (so the busy plot does not show through), then a
  // pale light fill under the wireframe
  ctx.save();
  const b = rig.body;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.rx, b.ry, b.tilt, 0, TAU);
  ctx.moveTo(rig.head.x + rig.head.r, rig.head.y);
  ctx.arc(rig.head.x, rig.head.y, rig.head.r, 0, TAU);
  ctx.fillStyle = 'rgba(4,16,28,0.6)';
  ctx.fill();
  ctx.fillStyle = 'rgba(230,247,255,0.22)';
  ctx.fill();
  ctx.restore();
  // glow pass + crisp pass
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  kit.drawRider(ctx, rig, { wire: rgba(COL.cyan, 0.18 * glowA), lineScale: 3.4, spokes: 12, pinwheel: pin });
  ctx.restore();
  kit.drawRider(ctx, rig, { wire: '#9ff8e8', lineScale: 1.05, spokes: 12, pinwheel: pin });
  // black face mask & spoon bill: dark fills with bright edges
  ctx.save();
  ctx.beginPath();
  maskPath(ctx, rig);
  billPath(ctx, rig);
  ctx.fillStyle = 'rgba(1,8,14,0.96)';
  ctx.fill();
  ctx.strokeStyle = '#bffcf0';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // eye
  ctx.fillStyle = COL.amber;
  ctx.beginPath();
  ctx.arc(rig.eye.x, rig.eye.y, 2.4, 0, TAU);
  ctx.fill();
  ctx.restore();
  // joint nodes
  for (const p of [rig.nearKnee, rig.nearFoot, rig.wingHand, rig.head, rig.pinHub, rig.bb]) node(ctx, p.x, p.y, 1.6, COL.cyan, 0.8 * glowA);
}

// =============================================================================
// render
// =============================================================================
export function render(kit, slot, scene, params) {
  const { ctx } = slot;
  const { t, rawLocalT, isThumbnail } = params;
  const lt = rawLocalT;
  const gag = !isThumbnail;
  ctx.save();
  const fr = fontsReady() ? 'ok' : 'fb';
  const bg = kit.bake(`giants_bg_${fr}_v5`, P, P, (g, rng) => paintBackground(kit, g, rng));
  const hud = kit.bake(`giants_hud_${fr}_v6`, P, P, (g, rng) => paintHud(kit, g, rng));
  const overlay = kit.bake('giants_overlay_v1', P, P, (g) => paintOverlay(kit, g));
  const card = kit.bake(`giants_card_${fr}_v1`, LABEL.w, LABEL.h, (g) => paintGiantLabel(g, kit));
  ctx.drawImage(bg, 0, 0);

  const tel = telemetry(t, lt, gag);
  const mono = (w, s) => `${w} ${s}px ${kit.FONT.mono}`;
  const qt = Math.floor(t * 10) / 10; // data refresh 10 Hz

  // ---- sea surface beyond the shore: animated wave wireframe (two layers)
  ctx.save();
  ctx.beginPath();
  for (let x = SHORE_X + 4; x <= P; x += 8) {
    const y = SEA_Y + 1.6 * Math.sin(x * 0.045 - t * 1.6) + 0.9 * Math.sin(x * 0.11 + t * 2.3);
    if (x === SHORE_X + 4) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  glow(ctx, COL.cyan, 1, 0.8);
  ctx.beginPath();
  for (let x = SHORE_X + 12; x <= P; x += 8) {
    const y = SEA_Y + 6 + 1.2 * Math.sin(x * 0.06 - t * 1.2 + 1);
    if (x === SHORE_X + 12) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(33,230,193,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // ---- power flowing down the tower and along the buried cable to the grid (speed ∝ power)
  {
    const pts = [
      [GIANT.x + 2, my(130)],
      [GIANT.x + 2, GY + 20],
      [30, GY + 20],
    ];
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push(l);
      total += l;
    }
    const speed = 30 + 60 * (tel.pw / RATED_KW);
    const off = (t * speed) % 34;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,201,90,0.85)';
    for (let d = off; d < total; d += 34) {
      let rem = d;
      let i = 0;
      while (i < segs.length && rem > segs[i]) rem -= segs[i++];
      if (i >= segs.length) break;
      const u = rem / segs[i];
      const x = lerp(pts[i][0], pts[i + 1][0], u);
      const y = lerp(pts[i][1], pts[i + 1][1], u);
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    ctx.restore();
  }

  // ---- earlier turbines (same scale)
  for (const tb of TURBINES) {
    ctx.beginPath();
    drawSmallRotor(ctx, tb, t);
  }

  // ---- the giant: slow rotor (~5 rpm)
  const ang = t * 0.55 + 0.05 * Math.max(0, Math.min(lt, 8) - 4) - Math.PI / 2;
  const tips = drawGiantRotor(ctx, t, ang, tel);

  // nacelle LiDAR scan pattern (rotating ring of measurement points)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,201,90,0.8)';
  const hx = GIANT.x;
  const hyy = my(GIANT.hub);
  for (let k = 0; k < 10; k++) {
    const a = t * 1.4 + (k * TAU) / 10;
    const r = 30 + 4 * Math.sin(t * 2 + k);
    ctx.globalAlpha = 0.3 + 0.7 * ((k + Math.floor(t * 10)) % 10 === 0 ? 1 : 0.3);
    ctx.fillRect(hx + Math.cos(a) * r - 1, hyy + Math.sin(a) * r * 0.9 - 1, 2, 2);
  }
  ctx.restore();

  // ---- sensor nodes + pings (on the beat)
  const beat = Math.floor((t + 0.0001) / 0.5);
  const beatFrac = (t / 0.5) % 1;
  const sensors = [
    { x: GIANT.x, y: hyy, id: 'NAC' },
    ...tips.map((p, i) => ({ x: p.x, y: p.y, id: `B${i + 1}` })),
    { x: GIANT.x, y: GY - 12, id: 'TB' },
    { x: GIANT.x, y: GY + 5 * K + 6, id: 'FD' },
    { x: TURBINES[3].x, y: my(70), id: '' },
  ];
  sensors.forEach((sn, i) => {
    node(ctx, sn.x, sn.y, 2.2, i >= 1 && i <= 3 ? COL.pale : COL.cyan, 0.9);
    if (beat % sensors.length === i) {
      const r = 6 + beatFrac * 26;
      ctx.beginPath();
      ctx.arc(sn.x, sn.y, r, 0, TAU);
      glow(ctx, COL.cyan, 1, 1 - beatFrac);
    }
  });
  // tip-speed tag following blade 1
  {
    const p = tips[0];
    const right = p.x > GIANT.x;
    const tx = p.x + (right ? -14 : 14);
    const ty = p.y + 18;
    // only in the upper-right quadrant: elsewhere it would collide with the ring tags / label block
    if (right && p.x > GIANT.x + 40 && p.y > 100 && p.y < my(GIANT.hub) - 30) {
      ctx.font = mono(400, 10);
      ctx.textAlign = right ? 'right' : 'left';
      ctx.fillStyle = 'rgba(230,247,255,0.85)';
      ctx.fillText(`B1 TIP ${tel.tip.toFixed(0)} m/s`, tx, ty);
    }
  }

  // ---- target brackets around the giant (breathing)
  {
    const br = 4 * Math.sin(t * 2.4);
    const R = GIANT.R * K + 10 + br;
    brackets(ctx, GIANT.x - R, my(GIANT.hub) - R, R * 2, R * 2, 22, COL.cyan, 1.4, 0.75);
  }

  // ---- the giant's label card, above its rotor
  ctx.drawImage(card, LABEL.x, LABEL.y);

  // ---- tiny true-scale spoonbill cyclist (2 m tall → 3 px) among the old machines
  const tinyX = 270 + 3 * clamp(lt, -8, 8.5);
  const tinyY = GY - 0.5;
  {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(tinyX, tinyY);
    ctx.scale(k2, k2);
    ctx.translate(-tinyX, -tinyY);
    ctx.strokeStyle = '#e6f7ff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(tinyX - 1.6, tinyY - 1, 1, 0, TAU);
    ctx.moveTo(tinyX + 2.6, tinyY - 1);
    ctx.arc(tinyX + 1.6, tinyY - 1, 1, 0, TAU);
    ctx.moveTo(tinyX - 0.5, tinyY - 3.2);
    ctx.lineTo(tinyX + 0.6, tinyY - 4.6);
    ctx.lineTo(tinyX + 2.2, tinyY - 4.2);
    ctx.stroke();
    ctx.fillStyle = '#e6f7ff';
    ctx.fillRect(tinyX - 0.8, tinyY - 4.3, 1.6, 1.4);
    ctx.restore();
  }

  // ---- HUD deck
  ctx.drawImage(hud, 0, 0);

  // readouts (10 Hz refresh)
  {
    const tq = telemetry(qt, lt - (t - qt), gag);
    const R = READOUT;
    const vals = [
      [`${tq.ws.toFixed(1)}`, 'm/s', tq.ws / 14],
      [`${tq.rpm.toFixed(1)}`, 'rpm', tq.rpm / 8],
      [`${tq.pitch.toFixed(1)}`, '°', tq.pitch / 6],
      [`${fmtInt(tq.pw)}`, 'kW', tq.pw / RATED_KW],
      [`${tq.tip.toFixed(0)}`, 'm/s', tq.tip / 100],
    ];
    const rated = tq.pw >= RATED_KW - 1;
    vals.forEach(([v, u, f], i) => {
      const y = R.y + 40 + i * 21;
      const hi = i === 3 && rated;
      ctx.font = mono(700, i === 3 ? 15 : 12);
      ctx.textAlign = 'right';
      ctx.fillStyle = hi ? COL.amber : COL.pale;
      ctx.fillText(v, R.x + 168, y + (i === 3 ? 1.5 : 0));
      ctx.font = mono(400, 9);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(33,230,193,0.85)';
      ctx.fillText(u, R.x + 172, y);
      // bar
      ctx.fillStyle = 'rgba(39,142,165,0.3)';
      ctx.fillRect(R.x + 200, y - 7, 78, 6);
      ctx.fillStyle = hi ? COL.amber : rgba(COL.cyan, 0.85);
      ctx.fillRect(R.x + 200, y - 7, 78 * clamp(f, 0, 1), 6);
    });
    if (rated) {
      const fl = 0.6 + 0.4 * Math.sin(t * 9);
      ctx.font = mono(700, 9);
      ctx.fillStyle = rgba(COL.amber, fl);
      ctx.textAlign = 'right';
      ctx.fillText('● RATED 額定', R.x + R.w - 8, R.y + 10.5 + 3);
    } else {
      ctx.font = mono(700, 9);
      ctx.fillStyle = rgba(COL.cyan, 0.6 + 0.4 * (Math.floor(t * 2) % 2));
      ctx.textAlign = 'right';
      ctx.fillText('● LIVE', R.x + R.w - 8, R.y + 10.5 + 3);
    }
    // power sparkline (last 6 s)
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const tt = t - 6 + (k / 40) * 6;
      const tl = telemetry(tt, lt - (t - tt), gag);
      const x = R.x + 10 + k * 6.8;
      const y = R.y + 146 - 16 * (tl.pw / RATED_KW);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    glow(ctx, COL.cyan, 1, 0.8);
  }

  // power curve operating point
  {
    const C = PANELS.C;
    const cx0 = C.x + 26;
    const cy0 = C.y + C.h - 30;
    const cw = C.w - 38;
    const ch = C.h - 66;
    const x = cx0 + (cw * clamp(tel.ws, 0, 25)) / 25;
    const y = cy0 - ch * (tel.pw / RATED_KW);
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(255,201,90,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, cy0);
    ctx.lineTo(x, y);
    ctx.lineTo(cx0, y);
    ctx.stroke();
    ctx.setLineDash([]);
    node(ctx, x, y, 2.6, COL.amber, 1);
    // readout in the empty lower-right of the plot (clear of the rated plateau)
    ctx.font = mono(700, 12);
    ctx.fillStyle = tel.pw >= RATED_KW - 1 ? COL.amber : COL.pale;
    ctx.textAlign = 'right';
    ctx.fillText(`${fmtInt(tel.pw)} kW`, cx0 + cw - 4, cy0 - ch * 0.42);
    ctx.font = mono(400, 9);
    ctx.fillStyle = 'rgba(230,247,255,0.7)';
    ctx.fillText(`@ ${tel.ws.toFixed(1)} m/s`, cx0 + cw - 4, cy0 - ch * 0.42 + 12);
  }

  // ---- scan box / gag: lock onto the true-scale cyclist
  let lens = null;
  {
    const B = PANELS.B;
    const lock = gag ? sstep(4.0, 4.35, lt) * (1 - sstep(7.7, 8.2, lt)) : 0;
    const bx = B.x + 78;
    const by = B.y + 150;
    if (lock < 0.02) {
      // scanning sweep
      const sweep = (t * 0.6) % 1;
      const sx = B.x + 8 + sweep * (B.w - 16);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(sx - 40, 0, sx, 0);
      gr.addColorStop(0, 'rgba(33,230,193,0)');
      gr.addColorStop(1, 'rgba(33,230,193,0.25)');
      ctx.fillStyle = gr;
      ctx.fillRect(sx - 40, B.y + 24, 40, B.h - 52);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(sx, B.y + 24);
      ctx.lineTo(sx, B.y + B.h - 28);
      glow(ctx, COL.cyan, 1, 0.9);
      ctx.font = mono(700, 11);
      ctx.fillStyle = rgba(COL.pale, 0.6 + 0.4 * (Math.floor(t * 3) % 2));
      ctx.textAlign = 'left';
      ctx.fillText('SCANNING… 掃描中', B.x + 10, B.y + B.h - 12);
    } else {
      lens = { lock, ringR: 16 - 5 * lock + 2 * Math.sin(t * 6) };
      // magnified wireframe cyclist inside the box
      ctx.save();
      ctx.beginPath();
      ctx.rect(B.x + 4, B.y + 22, B.w - 8, B.h - 26);
      ctx.clip();
      ctx.globalAlpha = lock;
      const rig = kit.computeRiderRig({ x: bx, y: by, pedalAngle: params.pedalAngle, scale: 0.5, time: t, worldX: params.riderWorldX, pinwheelAngle: params.pinwheelAngle });
      drawWireRider(ctx, kit, rig, scene, t, 0.8);
      ctx.restore();
      // reticle around the magnified bird
      ctx.globalAlpha = lock;
      brackets(ctx, bx - 66, by - 122, 132, 128, 12, COL.amber, 1.2, lock);
      ctx.font = mono(700, 10);
      ctx.fillStyle = COL.amber;
      ctx.textAlign = 'left';
      ctx.fillText('TARGET LOCK ×38', B.x + 150, B.y + 40);
      ctx.font = `700 19px ${kit.FONT.sans}`;
      ctx.fillStyle = COL.pale;
      ctx.fillText('黑面琵鷺', B.x + 150, B.y + 66);
      ctx.fillStyle = COL.amber;
      ctx.font = `700 20px ${kit.FONT.sans}`;
      ctx.fillText('· 1 鳥力', B.x + 150, B.y + 90);
      ctx.font = mono(400, 9);
      ctx.fillStyle = 'rgba(230,247,255,0.8)';
      ctx.fillText('身高 ≈ 2 m (含單車)', B.x + 150, B.y + 112);
      ctx.fillText(`巨機 ${fmtInt(RATED_KW)} kW`, B.x + 150, B.y + 128);
      ctx.fillStyle = 'rgba(33,230,193,0.95)';
      ctx.fillText(`= ${fmtInt(RATED_KW * 10)} 鳥力`, B.x + 150, B.y + 142);
      ctx.fillStyle = 'rgba(230,247,255,0.55)';
      ctx.fillText('(1 鳥力 ≈ 0.1 kW)', B.x + 150, B.y + 156);
      ctx.globalAlpha = 1;
      // lock-on flash
      const fl = 1 - sstep(4.0, 4.45, lt);
      if (fl > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(COL.amber, 0.35 * fl);
        ctx.fillRect(B.x + 2, B.y + 21, B.w - 4, B.h - 23);
        ctx.restore();
      }
    }
  }

  // ---- the rider (cyan wireframe with glow) on the baseline rail
  if (kit.riderVisible(params)) {
    const rig = kit.riderRig(params);
    // projected footprint glow on the rail
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createRadialGradient(params.riderLocalX, ROAD_Y, 4, params.riderLocalX, ROAD_Y, 120);
    fg.addColorStop(0, 'rgba(33,230,193,0.25)');
    fg.addColorStop(1, 'rgba(33,230,193,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(params.riderLocalX - 120, ROAD_Y - 30, 240, 60);
    ctx.restore();
    drawWireRider(ctx, kit, rig, scene, t, 1);
  }

  // ---- lens ring on the tiny cyclist + leader line to the zoom box (HUD, above the rider)
  if (lens) {
    const { lock, ringR } = lens;
    ctx.beginPath();
    ctx.arc(tinyX, tinyY - 3, ringR, 0, TAU);
    glow(ctx, COL.amber, 1.3, lock);
    // crosshair ticks
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      ctx.moveTo(tinyX + Math.cos(a) * (ringR + 2), tinyY - 3 + Math.sin(a) * (ringR + 2));
      ctx.lineTo(tinyX + Math.cos(a) * (ringR + 7), tinyY - 3 + Math.sin(a) * (ringR + 7));
    }
    glow(ctx, COL.amber, 1, lock);
    const B = PANELS.B;
    const grow = sstep(4.0, 4.45, lt);
    const ly = lerp(tinyY + ringR, B.y, grow);
    ctx.beginPath();
    ctx.moveTo(tinyX, tinyY - 3 + ringR);
    ctx.lineTo(lerp(tinyX, B.x + 26, grow), ly);
    glow(ctx, COL.amber, 1, lock);
    ctx.font = mono(700, 9.5);
    ctx.fillStyle = rgba(COL.amber, lock);
    ctx.textAlign = 'left';
    ctx.fillText('2 m', tinyX + ringR + 6, tinyY - 8);
  }

  // ---- global capacity odometer (bar 4: 1,000+ GW in 2023 → 1,299 GW in 2025)
  {
    const od = odometer(lt, isThumbnail);
    const txt = od.stage === 0 ? '1,000+' : fmtInt(od.v);
    const hi = od.stage === 2;
    ctx.font = mono(700, 24);
    ctx.textAlign = 'left';
    ctx.fillStyle = hi ? COL.amber : COL.pale;
    ctx.fillText(txt, ODO.x + 10, ODO.y + 46);
    const w = ctx.measureText(txt).width;
    ctx.font = mono(700, 13);
    ctx.fillStyle = 'rgba(33,230,193,0.9)';
    ctx.fillText('GW', ODO.x + 14 + w, ODO.y + 46);
    if (hi) {
      ctx.font = mono(700, 14);
      ctx.fillStyle = COL.amber;
      ctx.textAlign = 'right';
      ctx.fillText('2025', ODO.x + ODO.w - 10, ODO.y + 44);
    }
    // fill bar on a 0–1,400 GW scale
    const f = Math.min(1, od.v / 1400);
    ctx.fillStyle = hi ? COL.amber : rgba(COL.cyan, 0.85);
    ctx.fillRect(ODO.x + 10, ODO.y + 72, (ODO.w - 20) * f, 4);
    if (od.stage === 1) {
      // rolling tick
      ctx.fillStyle = rgba(COL.pale, 0.9);
      ctx.fillRect(ODO.x + 10 + (ODO.w - 20) * f - 1, ODO.y + 69, 2, 10);
    }
  }

  // ---- overlay: scanlines, vignette, viewport brackets
  ctx.drawImage(overlay, 0, 0);
  ctx.restore();
}
